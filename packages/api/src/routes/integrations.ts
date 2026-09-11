import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { db, integrations, integrationTools, toolInvocations, workspaceMembers } from '@pulse/db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { NotFoundError, ValidationError } from '@pulse/core';

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

// POST /api/integrations/:id/connect — test connection (placeholder that sets status to 'connected')
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

    const [updated] = await db
      .update(integrations)
      .set({
        status: 'connected',
        lastHealthCheck: new Date(),
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(integrations.id, id))
      .returning();

    res.json({
      success: true,
      data: {
        ...updated,
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

// POST /api/integrations/:id/tools/:toolName/invoke — invoke tool (placeholder)
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

    const startTime = Date.now();
    const mockOutput = {
      message: `Placeholder execution for tool '${toolName}'`,
      input,
      executedAt: new Date().toISOString(),
    };
    const durationMs = Date.now() - startTime + 10;

    const [invocation] = await db
      .insert(toolInvocations)
      .values({
        integrationId: id,
        toolName,
        userId,
        input,
        output: mockOutput,
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
      .where(and(eq(integrationTools.integrationId, id), eq(integrationTools.name, toolName)));

    res.json({
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
