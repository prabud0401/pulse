import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  db,
  aiConversations,
  aiMessages,
  aiProviders,
  tasks,
  projects,
  financialTransactions,
  bankAccounts,
  integrations,
  integrationTools,
  workspaceMembers,
  eq,
  and,
  desc,
  ne,
} from '@pulse/db';
import {
  NotFoundError,
  ValidationError,
  buildAIContext,
  formatContextPrompt,
  generateContextualMockResponse,
  AIContext,
} from '@pulse/core';

export const aiRouter: Router = Router();

/**
 * Helper to resolve workspace ID for authenticated requests
 */
async function resolveWorkspaceId(userId: string, requestedWorkspaceId?: string): Promise<string> {
  if (requestedWorkspaceId) return requestedWorkspaceId;

  const [membership] = await db
    .select({ workspaceId: workspaceMembers.workspaceId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.userId, userId))
    .limit(1);

  if (!membership) {
    throw new ValidationError('Workspace required or user must belong to a workspace');
  }

  return membership.workspaceId;
}

/**
 * Gather dynamic AI context from database
 */
async function gatherAIContext(workspaceId: string, userId: string): Promise<AIContext> {
  // 1. Fetch active tasks
  const activeTasksList = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      status: tasks.status,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      projectName: projects.name,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(eq(tasks.workspaceId, workspaceId), ne(tasks.status, 'done'), ne(tasks.status, 'cancelled')))
    .limit(10);

  // 2. Fetch financial summary
  let financialSummary = null;
  try {
    const txs = await db
      .select({
        direction: financialTransactions.direction,
        amount: financialTransactions.amount,
      })
      .from(financialTransactions)
      .where(eq(financialTransactions.workspaceId, workspaceId))
      .limit(100);

    const accounts = await db
      .select({ id: bankAccounts.id })
      .from(bankAccounts)
      .where(eq(bankAccounts.workspaceId, workspaceId));

    if (txs.length > 0 || accounts.length > 0) {
      let totalIncome = 0;
      let totalExpenses = 0;

      for (const tx of txs) {
        const amt = Number(tx.amount) || 0;
        if (tx.direction === 'credit') {
          totalIncome += amt;
        } else if (tx.direction === 'debit') {
          totalExpenses += amt;
        }
      }

      financialSummary = {
        totalIncome,
        totalExpenses,
        monthlyIncome: totalIncome,
        monthlyExpenses: totalExpenses,
        netSavings: totalIncome - totalExpenses,
        accountsCount: accounts.length,
        currency: 'USD',
      };
    }
  } catch (err) {
    // If finance tables are unpopulated or error occurs, financialSummary remains null
  }

  // 3. Fetch connected tools
  let connectedTools: Array<{ name: string; description?: string | null; category?: string | null }> = [];
  try {
    const tools = await db
      .select({
        name: integrationTools.name,
        description: integrationTools.description,
        category: integrations.category,
      })
      .from(integrationTools)
      .innerJoin(integrations, eq(integrationTools.integrationId, integrations.id))
      .where(and(eq(integrations.workspaceId, workspaceId), eq(integrationTools.enabled, true)))
      .limit(20);

    connectedTools = tools;
  } catch (err) {
    // Fallback if no integration tools
  }

  return buildAIContext({
    activeTasks: activeTasksList,
    financialSummary,
    connectedTools,
  });
}

// POST /api/ai/chat — send message, executes Gemini/OpenAI/Mock completion with context injection
aiRouter.post('/chat', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const {
      conversationId: requestedConvId,
      workspaceId: reqWorkspaceId,
      message,
      model = 'gemini-2.5-flash',
      provider = 'gemini',
    } = req.body;

    if (!message || typeof message !== 'string') {
      throw new ValidationError('Message is required');
    }

    const workspaceId = await resolveWorkspaceId(userId, reqWorkspaceId);

    // 1. Gather live context
    const aiContext = await gatherAIContext(workspaceId, userId);
    const systemPrompt = formatContextPrompt(aiContext);

    // 2. Resolve or create conversation
    let convId = requestedConvId;
    if (convId) {
      const [existingConv] = await db
        .select()
        .from(aiConversations)
        .where(eq(aiConversations.id, convId))
        .limit(1);

      if (!existingConv) {
        convId = null; // Create new if not found
      }
    }

    if (!convId) {
      const title = message.length > 40 ? `${message.substring(0, 40)}...` : message;
      const [newConv] = await db
        .insert(aiConversations)
        .values({
          workspaceId,
          userId,
          title,
          model,
          systemPrompt,
        })
        .returning();
      convId = newConv.id;
    }

    // 3. Save User Message
    const [userMsg] = await db
      .insert(aiMessages)
      .values({
        conversationId: convId,
        role: 'user',
        content: message,
        model,
      })
      .returning();

    // 4. Check for provider API key
    const [savedProvider] = await db
      .select()
      .from(aiProviders)
      .where(and(eq(aiProviders.workspaceId, workspaceId), eq(aiProviders.provider, provider)))
      .limit(1);

    const apiKey = savedProvider?.apiKeyEncrypted || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    let assistantReply = '';
    let tokensUsed = 0;

    // Try Gemini completion if key available
    if (provider === 'gemini' && apiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const resp = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Question: ${message}` }] },
            ],
          }),
        });

        if (resp.ok) {
          const data: any = await resp.json();
          assistantReply = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          tokensUsed = data?.usageMetadata?.totalTokenCount || 0;
        }
      } catch (geminiErr) {
        // Fallback to contextual generator on error
      }
    } else if (provider === 'openai' && apiKey) {
      try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: model.includes('gpt') ? model : 'gpt-4o',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: message },
            ],
          }),
        });

        if (resp.ok) {
          const data: any = await resp.json();
          assistantReply = data?.choices?.[0]?.message?.content || '';
          tokensUsed = data?.usage?.total_tokens || 0;
        }
      } catch (openaiErr) {
        // Fallback on error
      }
    }

    // Fallback if no reply generated
    if (!assistantReply) {
      assistantReply = generateContextualMockResponse(message, aiContext);
      tokensUsed = Math.round((message.length + assistantReply.length) / 4);
    }

    // 5. Save Assistant Message
    const [assistantMsg] = await db
      .insert(aiMessages)
      .values({
        conversationId: convId,
        role: 'assistant',
        content: assistantReply,
        model,
        tokensUsed,
      })
      .returning();

    // Update conversation updatedAt
    await db
      .update(aiConversations)
      .set({ updatedAt: new Date() })
      .where(eq(aiConversations.id, convId));

    res.json({
      success: true,
      data: {
        conversationId: convId,
        userMessage: userMsg,
        message: assistantMsg,
        contextSummary: {
          tasksCount: aiContext.activeTasks.length,
          toolsCount: aiContext.connectedTools?.length || 0,
          hasFinanceContext: !!aiContext.financialSummary,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/ai/conversations — list conversations
aiRouter.get('/conversations', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId: reqWorkspaceId } = req.query;
    const workspaceId = await resolveWorkspaceId(userId, reqWorkspaceId as string);

    const list = await db
      .select()
      .from(aiConversations)
      .where(and(eq(aiConversations.workspaceId, workspaceId), eq(aiConversations.userId, userId)))
      .orderBy(desc(aiConversations.updatedAt));

    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/conversations — create conversation
aiRouter.post('/conversations', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId: reqWorkspaceId, title = 'New Chat', model = 'gemini-2.5-flash', systemPrompt } = req.body;
    const workspaceId = await resolveWorkspaceId(userId, reqWorkspaceId);

    const [conv] = await db
      .insert(aiConversations)
      .values({
        workspaceId,
        userId,
        title,
        model,
        systemPrompt,
      })
      .returning();

    res.status(201).json({ success: true, data: conv });
  } catch (error) {
    next(error);
  }
});

// GET /api/ai/conversations/:id — get conversation with messages
aiRouter.get('/conversations/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [conv] = await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.id, id))
      .limit(1);

    if (!conv) {
      throw new NotFoundError('Conversation not found');
    }

    const messages = await db
      .select()
      .from(aiMessages)
      .where(eq(aiMessages.conversationId, id))
      .orderBy(aiMessages.createdAt);

    res.json({
      success: true,
      data: {
        ...conv,
        messages,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/ai/conversations/:id — delete conversation
aiRouter.delete('/conversations/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .delete(aiConversations)
      .where(eq(aiConversations.id, id))
      .returning();

    if (!deleted) {
      throw new NotFoundError('Conversation not found');
    }

    res.json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// GET /api/ai/providers — list configured providers
aiRouter.get('/providers', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId: reqWorkspaceId } = req.query;
    const workspaceId = await resolveWorkspaceId(userId, reqWorkspaceId as string);

    const providers = await db
      .select({
        id: aiProviders.id,
        workspaceId: aiProviders.workspaceId,
        provider: aiProviders.provider,
        baseUrl: aiProviders.baseUrl,
        defaultModel: aiProviders.defaultModel,
        isDefault: aiProviders.isDefault,
        hasKey: aiProviders.apiKeyEncrypted,
        createdAt: aiProviders.createdAt,
      })
      .from(aiProviders)
      .where(eq(aiProviders.workspaceId, workspaceId));

    const maskedProviders = providers.map((p) => ({
      ...p,
      hasKey: !!p.hasKey,
    }));

    res.json({ success: true, data: maskedProviders });
  } catch (error) {
    next(error);
  }
});

// POST /api/ai/providers — configure provider
aiRouter.post('/providers', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId: reqWorkspaceId, provider, apiKey, baseUrl, defaultModel, isDefault = false } = req.body;

    if (!provider) {
      throw new ValidationError('Provider name is required');
    }

    const workspaceId = await resolveWorkspaceId(userId, reqWorkspaceId);

    // If setting as default, clear others
    if (isDefault) {
      await db
        .update(aiProviders)
        .set({ isDefault: false })
        .where(eq(aiProviders.workspaceId, workspaceId));
    }

    // Check if provider exists for workspace
    const [existing] = await db
      .select()
      .from(aiProviders)
      .where(and(eq(aiProviders.workspaceId, workspaceId), eq(aiProviders.provider, provider)))
      .limit(1);

    let saved;
    if (existing) {
      const [updated] = await db
        .update(aiProviders)
        .set({
          apiKeyEncrypted: apiKey || existing.apiKeyEncrypted,
          baseUrl: baseUrl !== undefined ? baseUrl : existing.baseUrl,
          defaultModel: defaultModel || existing.defaultModel,
          isDefault,
        })
        .where(eq(aiProviders.id, existing.id))
        .returning();
      saved = updated;
    } else {
      const [created] = await db
        .insert(aiProviders)
        .values({
          workspaceId,
          provider,
          apiKeyEncrypted: apiKey,
          baseUrl,
          defaultModel,
          isDefault,
        })
        .returning();
      saved = created;
    }

    res.status(201).json({
      success: true,
      data: {
        id: saved.id,
        workspaceId: saved.workspaceId,
        provider: saved.provider,
        baseUrl: saved.baseUrl,
        defaultModel: saved.defaultModel,
        isDefault: saved.isDefault,
      },
    });
  } catch (error) {
    next(error);
  }
});
