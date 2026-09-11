import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { db, integrations, integrationTools, toolInvocations, workspaceMembers } from '@pulse/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { NotFoundError, ValidationError, AppError } from '@pulse/core';
import { mcpClient, parseMCPConfig } from '../services/mcp-client';

export const integrationsRouter: Router = Router();

// POST /api/integrations — create integration (name, type, category, config)
integrationsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId, name, type, category, config = {}, icon } = req.body;

    if (!name || !type || !category) {
      throw new ValidationError('name, type, and category are required');
    }

    let targetWorkspaceId = workspaceId;

    if (!targetWorkspaceId) {
      const [userMembership] = await db
        .select({ workspaceId: workspaceMembers.workspaceId })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, userId))
        .limit(1);

      if (!userMembership) {
        throw new ValidationError('workspaceId is required or user must belong to a workspace');
      }
      targetWorkspaceId = userMembership.workspaceId;
    }

    const [integration] = await db
      .insert(integrations)
      .values({
        workspaceId: targetWorkspaceId,
        name,
        type,
        category,
        icon: icon || null,
        config,
        status: 'disconnected',
      })
      .returning();

    res.status(201).json({ success: true, data: integration });
  } catch (error) {
    next(error);
  }
});

// GET /api/integrations — list workspace integrations
integrationsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId } = req.query;

    if (workspaceId && typeof workspaceId === 'string') {
      const items = await db
        .select()
        .from(integrations)
        .where(eq(integrations.workspaceId, workspaceId));
      return res.json({ success: true, data: items });
    }

    const items = await db
      .select({
        integration: integrations,
      })
      .from(integrations)
      .innerJoin(workspaceMembers, eq(integrations.workspaceId, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, userId));

    const result = items.map((row) => row.integration);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/integrations/:id — get single with tools
integrationsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const [integration] = await db
      .select()
      .from(integrations)
      .where(eq(integrations.id, id))
      .limit(1);

    if (!integration) {
      throw new NotFoundError('Integration not found');
    }

    const tools = await db
      .select()
      .from(integrationTools)
      .where(eq(integrationTools.integrationId, id));

    res.json({
      success: true,
      data: {
        ...integration,
        tools,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/integrations/:id — update config
integrationsRouter.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, config, category, icon, status } = req.body;

    const [existing] = await db
      .select()
      .from(integrations)
      .where(eq(integrations.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Integration not found');
    }

    const updateValues: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    if (name !== undefined) updateValues.name = name;
    if (config !== undefined) updateValues.config = config;
    if (category !== undefined) updateValues.category = category;
    if (icon !== undefined) updateValues.icon = icon;
    if (status !== undefined) updateValues.status = status;

    const [updated] = await db
      .update(integrations)
      .set(updateValues)
      .where(eq(integrations.id, id))
      .returning();

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/integrations/:id — remove
integrationsRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(integrations)
      .where(eq(integrations.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Integration not found');
    }

    await db.delete(integrations).where(eq(integrations.id, id));

    res.json({ success: true, data: { message: 'Integration deleted successfully' } });
  } catch (error) {
    next(error);
  }
});

// POST /api/integrations/:id/connect — connect and discover tools via MCP
integrationsRouter.post('/:id/connect', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(integrations)
      .where(eq(integrations.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Integration not found');
    }

    // If mcp_remote, connect via real MCP client and discover tools
    if (existing.type === 'mcp_remote') {
      const config = existing.config as Record<string, unknown>;
      if (!config || (!config.url && !config.serverUrl && !config.endpoint)) {
        throw new ValidationError('Integration config must contain a "url" for MCP remote integration');
      }

      let discoveredTools;
      try {
        const mcpConfig = parseMCPConfig(config);
        discoveredTools = await mcpClient.listTools(mcpConfig);
      } catch (err: any) {
        const now = new Date();
        await db
          .update(integrations)
          .set({
            status: 'error',
            errorMessage: err.message || 'Failed to connect to remote MCP server',
            lastHealthCheck: now,
            updatedAt: now,
          })
          .where(eq(integrations.id, id));

        throw new AppError(
          `Failed to connect to MCP server: ${err.message}`,
          502,
          'MCP_CONNECTION_FAILED'
        );
      }

      // Upsert discovered tools into integrationTools table
      const currentTools = await db
        .select()
        .from(integrationTools)
        .where(eq(integrationTools.integrationId, id));

      const currentToolMap = new Map(currentTools.map((t) => [t.name, t]));

      for (const tool of discoveredTools) {
        const current = currentToolMap.get(tool.name);
        if (current) {
          await db
            .update(integrationTools)
            .set({
              description: tool.description,
              inputSchema: tool.inputSchema,
            })
            .where(eq(integrationTools.id, current.id));
        } else {
          await db.insert(integrationTools).values({
            integrationId: id,
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            enabled: true,
          });
        }
      }

      // Update integration status to connected
      const now = new Date();
      const [updated] = await db
        .update(integrations)
        .set({
          status: 'connected',
          lastHealthCheck: now,
          errorMessage: null,
          updatedAt: now,
        })
        .where(eq(integrations.id, id))
        .returning();

      const allTools = await db
        .select()
        .from(integrationTools)
        .where(eq(integrationTools.integrationId, id));

      return res.json({
        success: true,
        toolsCount: allTools.length,
        tools: allTools,
        data: {
          ...updated,
          toolsCount: allTools.length,
          tools: allTools,
          message: 'Integration connected successfully',
        },
      });
    }

    // Default/fallback for non-mcp integrations
    const now = new Date();
    const [updated] = await db
      .update(integrations)
      .set({
        status: 'connected',
        lastHealthCheck: now,
        errorMessage: null,
        updatedAt: now,
      })
      .where(eq(integrations.id, id))
      .returning();

    const tools = await db
      .select()
      .from(integrationTools)
      .where(eq(integrationTools.integrationId, id));

    return res.json({
      success: true,
      toolsCount: tools.length,
      tools,
      data: {
        ...updated,
        toolsCount: tools.length,
        tools,
        message: 'Integration connected successfully',
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/integrations/:id/disconnect — set status to 'disconnected'
integrationsRouter.post('/:id/disconnect', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(integrations)
      .where(eq(integrations.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Integration not found');
    }

    const [updated] = await db
      .update(integrations)
      .set({
        status: 'disconnected',
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, id))
      .returning();

    res.json({
      success: true,
      data: {
        ...updated,
        message: 'Integration disconnected successfully',
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/integrations/:id/tools — list tools
integrationsRouter.get('/:id/tools', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(integrations)
      .where(eq(integrations.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Integration not found');
    }

    const tools = await db
      .select()
      .from(integrationTools)
      .where(eq(integrationTools.integrationId, id));

    res.json({ success: true, data: tools });
  } catch (error) {
    next(error);
  }
});

// POST /api/integrations/:id/tools/:toolName/invoke — invoke tool
integrationsRouter.post('/:id/tools/:toolName/invoke', requireAuth, async (req, res, next) => {
  try {
    const { id, toolName } = req.params;
    const userId = req.user!.userId;
    const input = req.body.input !== undefined ? req.body.input : req.body;

    const [existing] = await db
      .select()
      .from(integrations)
      .where(eq(integrations.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Integration not found');
    }

    // Fetch tool from integrationTools
    const [tool] = await db
      .select()
      .from(integrationTools)
      .where(and(eq(integrationTools.integrationId, id), eq(integrationTools.name, toolName)))
      .limit(1);

    if (existing.type === 'mcp_remote') {
      if (existing.status === 'disconnected') {
        throw new ValidationError(
          `Cannot invoke tool '${toolName}': integration '${existing.name}' is disconnected. Please connect first.`
        );
      }

      if (!tool) {
        throw new NotFoundError(
          `Tool '${toolName}' not found for integration '${existing.name}'. Please connect the integration first.`
        );
      }

      if (!tool.enabled) {
        throw new ValidationError(`Tool '${toolName}' is currently disabled`);
      }

      const config = existing.config as Record<string, unknown>;
      if (!config || (!config.url && !config.serverUrl && !config.endpoint)) {
        throw new ValidationError('Integration config must contain a "url" for MCP remote integration');
      }

      const mcpConfig = parseMCPConfig(config);
      const startTime = Date.now();
      let toolOutput: unknown = null;
      let invocationStatus: 'success' | 'error' = 'success';
      let errorMessage: string | null = null;

      try {
        const args = (input && typeof input === 'object' && !Array.isArray(input))
          ? (input as Record<string, unknown>)
          : { input };

        const result = await mcpClient.callTool(mcpConfig, toolName, args);
        toolOutput = result;

        if (
          result &&
          typeof result === 'object' &&
          'isError' in result &&
          Boolean((result as Record<string, unknown>).isError)
        ) {
          invocationStatus = 'error';
          errorMessage = 'MCP tool execution returned an error';
        }
      } catch (err: any) {
        invocationStatus = 'error';
        errorMessage = err.message || `Failed to execute tool '${toolName}'`;
        toolOutput = { error: errorMessage };
      }

      const durationMs = Date.now() - startTime;

      const [invocation] = await db
        .insert(toolInvocations)
        .values({
          integrationId: id,
          toolName,
          userId,
          input: (input as any) ?? null,
          output: (toolOutput as any) ?? null,
          status: invocationStatus,
          durationMs,
          errorMessage,
        })
        .returning();

      // Increment usageCount and update lastUsedAt on the tool
      await db
        .update(integrationTools)
        .set({
          usageCount: sql`${integrationTools.usageCount} + 1`,
          lastUsedAt: new Date(),
        })
        .where(eq(integrationTools.id, tool.id));

      return res.json({
        success: invocationStatus === 'success',
        data: {
          invocationId: invocation.id,
          tool: toolName,
          status: invocation.status,
          durationMs: invocation.durationMs,
          output: invocation.output,
          error: errorMessage || undefined,
        },
      });
    }

    // Graceful fallback for simulated or non-mcp services
    let targetTool = tool;
    if (!targetTool) {
      const [createdTool] = await db
        .insert(integrationTools)
        .values({
          integrationId: id,
          name: toolName,
          description: `Simulated tool for ${existing.name}`,
          inputSchema: { type: 'object' },
          enabled: true,
        })
        .returning();
      targetTool = createdTool;
    }

    if (!targetTool.enabled) {
      throw new ValidationError(`Tool '${toolName}' is currently disabled`);
    }

    const startTime = Date.now();
    const simulatedOutput = {
      simulated: true,
      message: `Simulated execution for tool '${toolName}' on '${existing.name}' (${existing.type})`,
      input,
      executedAt: new Date().toISOString(),
    };
    const durationMs = Date.now() - startTime + 5;

    const [invocation] = await db
      .insert(toolInvocations)
      .values({
        integrationId: id,
        toolName,
        userId,
        input: (input as any) ?? null,
        output: simulatedOutput,
        status: 'success',
        durationMs,
      })
      .returning();

    await db
      .update(integrationTools)
      .set({
        usageCount: sql`${integrationTools.usageCount} + 1`,
        lastUsedAt: new Date(),
      })
      .where(eq(integrationTools.id, targetTool.id));

    return res.json({
      success: true,
      data: {
        invocationId: invocation.id,
        tool: toolName,
        status: invocation.status,
        durationMs: invocation.durationMs,
        output: invocation.output,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/integrations/:id/logs — list invocation logs
integrationsRouter.get('/:id/logs', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(integrations)
      .where(eq(integrations.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Integration not found');
    }

    const logs = await db
      .select()
      .from(toolInvocations)
      .where(eq(toolInvocations.integrationId, id))
      .orderBy(desc(toolInvocations.createdAt))
      .limit(100);

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});
