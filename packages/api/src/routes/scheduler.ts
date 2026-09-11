import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  db,
  cronJobs,
  cronLogs,
  workspaceMembers,
  eq,
  desc,
} from '@pulse/db';
import { NotFoundError, ValidationError } from '@pulse/core';
import {
  runJobNow,
  getNextCronRun,
  matchCron,
  seedDefaultCronJobs,
} from '../services/scheduler';

export const schedulerRouter: Router = Router();

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

// GET /api/scheduler/jobs — list scheduled jobs with last run stats
schedulerRouter.get('/jobs', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId: reqWorkspaceId } = req.query;
    const workspaceId = await resolveWorkspaceId(userId, reqWorkspaceId as string);

    // Auto-seed default scheduled jobs if none exist
    await seedDefaultCronJobs(workspaceId);

    const jobs = await db
      .select()
      .from(cronJobs)
      .where(eq(cronJobs.workspaceId, workspaceId))
      .orderBy(desc(cronJobs.createdAt));

    res.json({ success: true, data: jobs });
  } catch (error) {
    next(error);
  }
});

// GET /api/scheduler/jobs/:id — get a single job
schedulerRouter.get('/jobs/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [job] = await db
      .select()
      .from(cronJobs)
      .where(eq(cronJobs.id, id))
      .limit(1);

    if (!job) {
      throw new NotFoundError(`Cron job with id '${id}' not found`);
    }

    res.json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
});

// POST /api/scheduler/jobs — create a new scheduled cron job
schedulerRouter.post('/jobs', requireAuth, async (req, res, next) => {
  try {
    const userId = req.user!.userId;
    const {
      workspaceId: reqWorkspaceId,
      name,
      description,
      schedule,
      jobType,
      config = {},
      isEnabled = true,
    } = req.body;

    if (!name || !schedule || !jobType) {
      throw new ValidationError('name, schedule, and jobType are required fields');
    }

    const validTypes = ['mcp_health_check', 'daily_finance_digest', 'daily_task_standup', 'email_bank_sync'];
    if (!validTypes.includes(jobType)) {
      throw new ValidationError(`jobType must be one of: ${validTypes.join(', ')}`);
    }

    const parts = schedule.trim().split(/\s+/);
    if (parts.length !== 5) {
      throw new ValidationError('schedule must be a valid 5-part cron expression (e.g. "0 9 * * *")');
    }

    const workspaceId = await resolveWorkspaceId(userId, reqWorkspaceId);
    const nextRunAt = isEnabled ? getNextCronRun(schedule) : null;

    const [job] = await db
      .insert(cronJobs)
      .values({
        workspaceId,
        name: name.trim(),
        description: description ? description.trim() : null,
        schedule: schedule.trim(),
        jobType,
        config,
        isEnabled,
        nextRunAt,
      })
      .returning();

    res.status(201).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/scheduler/jobs/:id — update schedule, enable/disable toggle
schedulerRouter.patch('/jobs/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, schedule, jobType, config, isEnabled } = req.body;

    const [existing] = await db
      .select()
      .from(cronJobs)
      .where(eq(cronJobs.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError(`Cron job with id '${id}' not found`);
    }

    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description ? description.trim() : null;
    if (config !== undefined) updateData.config = config;

    if (jobType !== undefined) {
      const validTypes = ['mcp_health_check', 'daily_finance_digest', 'daily_task_standup', 'email_bank_sync'];
      if (!validTypes.includes(jobType)) {
        throw new ValidationError(`jobType must be one of: ${validTypes.join(', ')}`);
      }
      updateData.jobType = jobType;
    }

    const effectiveSchedule = schedule !== undefined ? schedule.trim() : existing.schedule;
    if (schedule !== undefined) {
      const parts = effectiveSchedule.split(/\s+/);
      if (parts.length !== 5) {
        throw new ValidationError('schedule must be a valid 5-part cron expression');
      }
      updateData.schedule = effectiveSchedule;
    }

    const effectiveEnabled = isEnabled !== undefined ? Boolean(isEnabled) : existing.isEnabled;
    if (isEnabled !== undefined) {
      updateData.isEnabled = effectiveEnabled;
    }

    if (schedule !== undefined || isEnabled !== undefined) {
      updateData.nextRunAt = effectiveEnabled ? getNextCronRun(effectiveSchedule) : null;
    }

    const [updated] = await db
      .update(cronJobs)
      .set(updateData)
      .where(eq(cronJobs.id, id))
      .returning();

    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/scheduler/jobs/:id — delete job
schedulerRouter.delete('/jobs/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(cronJobs)
      .where(eq(cronJobs.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError(`Cron job with id '${id}' not found`);
    }

    await db.delete(cronJobs).where(eq(cronJobs.id, id));

    res.json({ success: true, message: 'Cron job deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// POST /api/scheduler/jobs/:id/run — trigger immediate manual execution
schedulerRouter.post('/jobs/:id/run', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(cronJobs)
      .where(eq(cronJobs.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError(`Cron job with id '${id}' not found`);
    }

    const result = await runJobNow(id);

    res.json({
      success: true,
      data: {
        job: result.job,
        log: result.log,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/scheduler/jobs/:id/logs — view execution history
schedulerRouter.get('/jobs/:id/logs', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;

    const [existing] = await db
      .select()
      .from(cronJobs)
      .where(eq(cronJobs.id, id))
      .limit(1);

    if (!existing) {
      throw new NotFoundError(`Cron job with id '${id}' not found`);
    }

    const logs = await db
      .select()
      .from(cronLogs)
      .where(eq(cronLogs.jobId, id))
      .orderBy(desc(cronLogs.createdAt))
      .limit(50);

    res.json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
});
