import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  db,
  automationRules,
  automationLogs,
  workspaceMembers,
  eq,
  and,
  desc,
} from '@pulse/db';
import {
  NotFoundError,
  ValidationError,
  executeAutomationActions,
  BUILTIN_AUTOMATION_TEMPLATES,
  AutomationActionConfig,
} from '@pulse/core';

export const automationsRouter: Router = Router();

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

// GET /api/automations/templates — get built-in starter templates
automationsRouter.get('/templates', requireAuth, async (req, res) => {
  res.json({ success: true, data: BUILTIN_AUTOMATION_TEMPLATES });
});

// GET /api/automations — list rules for workspace
automationsRouter.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId: reqWorkspaceId } = req.query;
    const workspaceId = await resolveWorkspaceId(userId, reqWorkspaceId as string);

    const rules = await db
      .select()
      .from(automationRules)
      .where(eq(automationRules.workspaceId, workspaceId))
      .orderBy(desc(automationRules.createdAt));

    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
});

// POST /api/automations — create automation rule
automationsRouter.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const {
      workspaceId: reqWorkspaceId,
      name,
      description,
      triggerType,
      triggerConfig = {},
      actions = [],
      isEnabled = true,
    } = req.body;

    if (!name || !triggerType || !actions) {
      throw new ValidationError('Name, triggerType, and actions are required');
    }

    const workspaceId = await resolveWorkspaceId(userId, reqWorkspaceId);

    const [rule] = await db
      .insert(automationRules)
      .values({
        workspaceId,
        name: name.trim(),
        description: description || null,
        triggerType,
        triggerConfig,
        actions,
        isEnabled,
        createdBy: userId,
      })
      .returning();

    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
});

// GET /api/automations/:id — get rule details
automationsRouter.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [rule] = await db
      .select()
      .from(automationRules)
      .where(eq(automationRules.id, id))
      .limit(1);

    if (!rule) {
      throw new NotFoundError('Automation rule not found');
    }

    const recentLogs = await db
      .select()
      .from(automationLogs)
      .where(eq(automationLogs.ruleId, id))
      .orderBy(desc(automationLogs.createdAt))
      .limit(10);

    res.json({
      success: true,
      data: {
        ...rule,
        recentLogs,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/automations/:id — update rule
automationsRouter.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, triggerType, triggerConfig, actions, isEnabled } = req.body;

    const [existing] = await db
      .select()
      .from(automationRules)
      .where(eq(automationRules.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError('Automation rule not found');
    }

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description;
    if (triggerType !== undefined) updates.triggerType = triggerType;
    if (triggerConfig !== undefined) updates.triggerConfig = triggerConfig;
    if (actions !== undefined) updates.actions = actions;
    if (isEnabled !== undefined) updates.isEnabled = isEnabled;

    const [updated] = await db
      .update(automationRules)
      .set(updates)
      .where(eq(automationRules.id, id))
      .returning();

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/automations/:id — delete rule
automationsRouter.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [deleted] = await db
      .delete(automationRules)
      .where(eq(automationRules.id, id))
      .returning();

    if (!deleted) {
      throw new NotFoundError('Automation rule not found');
    }

    res.json({ success: true, data: { id } });
  } catch (error) {
    next(error);
  }
});

// POST /api/automations/:id/trigger — manually trigger rule
automationsRouter.post('/:id/trigger', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { payload = {} } = req.body;

    const [rule] = await db
      .select()
      .from(automationRules)
      .where(eq(automationRules.id, id))
      .limit(1);

    if (!rule) {
      throw new NotFoundError('Automation rule not found');
    }

    // Execute actions
    const outcome = await executeAutomationActions(rule.actions as AutomationActionConfig[], payload);

    // Record log
    const [log] = await db
      .insert(automationLogs)
      .values({
        ruleId: id,
        status: outcome.status,
        triggerData: payload,
        actionResults: outcome.actionResults as any,
        durationMs: outcome.durationMs,
        errorMessage: outcome.errorMessage || null,
      })
      .returning();

    // Update rule trigger stats
    await db
      .update(automationRules)
      .set({
        lastTriggeredAt: new Date(),
        triggerCount: rule.triggerCount + 1,
        updatedAt: new Date(),
      })
      .where(eq(automationRules.id, id));

    res.json({
      success: true,
      data: {
        ruleId: id,
        outcome,
        log,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/automations/:id/logs — list logs for rule
automationsRouter.get('/:id/logs', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const logs = await db
      .select()
      .from(automationLogs)
      .where(eq(automationLogs.ruleId, id))
      .orderBy(desc(automationLogs.createdAt))
      .limit(50);

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});
