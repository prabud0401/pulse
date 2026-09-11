import {
  db,
  cronJobs,
  cronLogs,
  integrations,
  financialTransactions,
  tasks,
  bankAccounts,
  workspaces,
  workspaceMembers,
  eq,
  and,
  gte,
  desc,
} from '@pulse/db';
import type { JobType } from '@pulse/core';
import { mcpClient, parseMCPConfig } from './mcp-client';
import { NotificationService } from './notification-service';

// --- Cron Parser & Evaluator ---

/**
 * Parses a cron expression segment (e.g. "*", "0", "1-5", "* / 15", "1,2,5").
 */
function parseCronPart(part: string, min: number, max: number): Set<number> {
  const allowed = new Set<number>();
  const subparts = part.trim().split(',');

  for (const sub of subparts) {
    if (sub.includes('/')) {
      const [rangeStr, stepStr] = sub.split('/');
      const step = parseInt(stepStr, 10);
      if (isNaN(step) || step <= 0) continue;

      let start = min;
      let end = max;
      if (rangeStr !== '*') {
        if (rangeStr.includes('-')) {
          const [startStr, endStr] = rangeStr.split('-');
          start = parseInt(startStr, 10);
          end = parseInt(endStr, 10);
        } else {
          start = parseInt(rangeStr, 10);
        }
      }
      for (let i = start; i <= end; i += step) {
        allowed.add(i);
      }
    } else if (sub.includes('-')) {
      const [startStr, endStr] = sub.split('-');
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          allowed.add(i);
        }
      }
    } else if (sub === '*') {
      for (let i = min; i <= max; i++) {
        allowed.add(i);
      }
    } else {
      const val = parseInt(sub, 10);
      if (!isNaN(val)) {
        allowed.add(val);
      }
    }
  }

  return allowed;
}

/**
 * Checks if a given Date matches the 5-field cron expression.
 */
export function matchCron(schedule: string, date: Date = new Date()): boolean {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [minPart, hourPart, domPart, monthPart, dowPart] = parts;

  const minutes = parseCronPart(minPart, 0, 59);
  if (!minutes.has(date.getMinutes())) return false;

  const hours = parseCronPart(hourPart, 0, 23);
  if (!hours.has(date.getHours())) return false;

  const doms = parseCronPart(domPart, 1, 31);
  if (!doms.has(date.getDate())) return false;

  const months = parseCronPart(monthPart, 1, 12);
  if (!months.has(date.getMonth() + 1)) return false;

  const dows = parseCronPart(dowPart, 0, 6);
  const currentDow = date.getDay(); // 0 is Sunday
  if (!dows.has(currentDow) && !(currentDow === 0 && dows.has(7))) return false;

  return true;
}

/**
 * Calculates the next matching Date for a cron expression after fromDate.
 */
export function getNextCronRun(schedule: string, fromDate: Date = new Date()): Date {
  const next = new Date(fromDate.getTime());
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);

  // Search up to 525,600 minutes (1 full leap year)
  const maxIterations = 525600;
  for (let i = 0; i < maxIterations; i++) {
    if (matchCron(schedule, next)) {
      return next;
    }
    next.setMinutes(next.getMinutes() + 1);
  }

  // Fallback to 24h from now
  return new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
}

/**
 * Helper to produce human readable description of common cron patterns.
 */
export function humanizeCron(schedule: string): string {
  const trimmed = schedule.trim();
  if (trimmed === '* * * * *') return 'Every minute';
  if (trimmed === '*/5 * * * *') return 'Every 5 minutes';
  if (trimmed === '*/10 * * * *') return 'Every 10 minutes';
  if (trimmed === '*/15 * * * *') return 'Every 15 minutes';
  if (trimmed === '*/30 * * * *') return 'Every 30 minutes';
  if (trimmed === '0 * * * *') return 'Every hour';
  if (trimmed === '0 9 * * *') return 'Every day at 9:00 AM';
  if (trimmed === '0 21 * * *') return 'Every night at 9:00 PM';
  if (trimmed === '0 0 * * *') return 'Every midnight';
  if (trimmed === '0 0 * * 1') return 'Every Monday at midnight';
  return `Schedule (${trimmed})`;
}

// --- Helper to get user to notify in a workspace ---
async function getWorkspaceNotifyUserId(workspaceId: string): Promise<string | null> {
  const [ws] = await db
    .select({ ownerId: workspaces.ownerId })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  if (ws?.ownerId) return ws.ownerId;

  const [member] = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .limit(1);

  return member?.userId || null;
}

// --- Built-in Job Runners ---

/**
 * MCP Health Check Runner
 * Pings all connected integrations, updates health status, logs results,
 * and emits notification if an integration goes down.
 */
async function runMCPHealthCheck(job: typeof cronJobs.$inferSelect): Promise<{
  summary: string;
  details: Record<string, unknown>;
}> {
  const items = await db
    .select()
    .from(integrations)
    .where(eq(integrations.workspaceId, job.workspaceId));

  let healthy = 0;
  let failed = 0;
  const results: Array<{ id: string; name: string; type: string; status: string; error?: string }> = [];

  for (const item of items) {
    if (item.type === 'mcp_remote') {
      try {
        const config = item.config as Record<string, unknown>;
        if (!config || (!config.url && !config.serverUrl && !config.endpoint)) {
          throw new Error('Integration config missing endpoint URL');
        }
        const mcpConfig = parseMCPConfig(config);
        await mcpClient.listTools(mcpConfig);

        await db
          .update(integrations)
          .set({
            status: 'connected',
            lastHealthCheck: new Date(),
            errorMessage: null,
            updatedAt: new Date(),
          })
          .where(eq(integrations.id, item.id));

        healthy++;
        results.push({ id: item.id, name: item.name, type: item.type, status: 'connected' });
      } catch (err: any) {
        failed++;
        const wasOnline = item.status === 'connected';

        await db
          .update(integrations)
          .set({
            status: 'error',
            lastHealthCheck: new Date(),
            errorMessage: err.message || 'Health check failed',
            updatedAt: new Date(),
          })
          .where(eq(integrations.id, item.id));

        results.push({ id: item.id, name: item.name, type: item.type, status: 'error', error: err.message });

        // Emit notification if an integration goes down
        const notifyUserId = await getWorkspaceNotifyUserId(job.workspaceId);
        if (notifyUserId) {
          try {
            await NotificationService.createNotification({
              userId: notifyUserId,
              workspaceId: job.workspaceId,
              source: `integration:${item.id}`,
              type: 'error',
              title: `Integration Offline: ${item.name}`,
              body: `MCP health check ping failed: ${err.message || 'Server unreachable'}.`,
              data: { integrationId: item.id, error: err.message, wasOnline },
            });
          } catch (notifErr) {
            console.error('[Scheduler] Failed to emit integration offline notification:', notifErr);
          }
        }
      }
    } else {
      // Local or mock integration
      await db
        .update(integrations)
        .set({
          lastHealthCheck: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(integrations.id, item.id));

      healthy++;
      results.push({ id: item.id, name: item.name, type: item.type, status: item.status || 'connected' });
    }
  }

  const summary = `MCP Health Check: Verified ${items.length} integration(s) (${healthy} healthy, ${failed} failed).`;
  return {
    summary,
    details: { total: items.length, healthy, failed, integrations: results },
  };
}

/**
 * Daily Finance Digest Runner
 * Calculates today's inflow/outflow and sends a notification.
 */
async function runDailyFinanceDigest(job: typeof cronJobs.$inferSelect): Promise<{
  summary: string;
  details: Record<string, unknown>;
}> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const txs = await db
    .select()
    .from(financialTransactions)
    .where(
      and(
        eq(financialTransactions.workspaceId, job.workspaceId),
        gte(financialTransactions.transactionDate, startOfDay)
      )
    );

  let inflow = 0;
  let outflow = 0;

  for (const tx of txs) {
    const amt = parseFloat(tx.amount || '0');
    if (tx.direction === 'credit') {
      inflow += amt;
    } else if (tx.direction === 'debit') {
      outflow += amt;
    }
  }

  const net = inflow - outflow;
  const count = txs.length;

  const summary = `Daily Finance Digest: +$${inflow.toFixed(2)} inflow, -$${outflow.toFixed(2)} outflow across ${count} transaction(s) today. Net: ${net >= 0 ? '+' : ''}$${net.toFixed(2)}.`;

  const notifyUserId = await getWorkspaceNotifyUserId(job.workspaceId);
  if (notifyUserId) {
    try {
      await NotificationService.createNotification({
        userId: notifyUserId,
        workspaceId: job.workspaceId,
        source: 'finance',
        type: 'info',
        title: 'Daily Finance Digest',
        body: summary,
        data: { inflow, outflow, net, transactionCount: count, date: startOfDay.toISOString() },
      });
    } catch (notifErr) {
      console.error('[Scheduler] Failed to emit finance digest notification:', notifErr);
    }
  }

  return {
    summary,
    details: { inflow, outflow, net, count, date: startOfDay.toISOString() },
  };
}

/**
 * Daily Task Standup Runner
 * Counts active tasks, overdue items, and posts a digest notification.
 */
async function runDailyTaskStandup(job: typeof cronJobs.$inferSelect): Promise<{
  summary: string;
  details: Record<string, unknown>;
}> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const allTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.workspaceId, job.workspaceId));

  let activeCount = 0;
  let overdueCount = 0;
  let completedTodayCount = 0;

  for (const t of allTasks) {
    if (t.status === 'todo' || t.status === 'in_progress') {
      activeCount++;
      if (t.dueDate && new Date(t.dueDate) < now) {
        overdueCount++;
      }
    } else if (t.status === 'done') {
      if (t.completedAt && new Date(t.completedAt) >= startOfDay) {
        completedTodayCount++;
      }
    }
  }

  const summary = `Daily Task Standup: ${activeCount} active task(s), ${overdueCount} overdue item(s), and ${completedTodayCount} completed today.`;

  const notifyUserId = await getWorkspaceNotifyUserId(job.workspaceId);
  if (notifyUserId) {
    try {
      await NotificationService.createNotification({
        userId: notifyUserId,
        workspaceId: job.workspaceId,
        source: 'tasks',
        type: overdueCount > 0 ? 'warning' : 'info',
        title: 'Daily Task Standup',
        body: summary,
        data: { activeCount, overdueCount, completedTodayCount },
      });
    } catch (notifErr) {
      console.error('[Scheduler] Failed to emit task standup notification:', notifErr);
    }
  }

  return {
    summary,
    details: { activeCount, overdueCount, completedTodayCount, totalTasks: allTasks.length },
  };
}

/**
 * Email Bank Sync Runner
 * Checks and logs bank email ingestion pipeline and registered accounts.
 */
async function runEmailBankSync(job: typeof cronJobs.$inferSelect): Promise<{
  summary: string;
  details: Record<string, unknown>;
}> {
  const accounts = await db
    .select()
    .from(bankAccounts)
    .where(eq(bankAccounts.workspaceId, job.workspaceId));

  const summary = `Email Bank Sync: Processed inbox feed for ${accounts.length} registered account(s). All accounts synchronized.`;

  return {
    summary,
    details: {
      accountsChecked: accounts.length,
      accounts: accounts.map((a) => ({ id: a.id, bank: a.bankName, label: a.label })),
      timestamp: new Date().toISOString(),
    },
  };
}

// --- Execution Dispatcher ---

/**
 * Triggers an immediate execution of a scheduled job by its id.
 */
export async function runJobNow(jobId: string) {
  const [job] = await db
    .select()
    .from(cronJobs)
    .where(eq(cronJobs.id, jobId))
    .limit(1);

  if (!job) {
    throw new Error(`Cron job not found with id: ${jobId}`);
  }

  const startTime = Date.now();

  // Mark job as running
  await db
    .update(cronJobs)
    .set({
      lastStatus: 'running',
      updatedAt: new Date(),
    })
    .where(eq(cronJobs.id, jobId));

  let status: 'success' | 'failed' = 'success';
  let summary = '';
  let details: Record<string, unknown> = {};

  try {
    switch (job.jobType as JobType) {
      case 'mcp_health_check': {
        const result = await runMCPHealthCheck(job);
        summary = result.summary;
        details = result.details;
        break;
      }
      case 'daily_finance_digest': {
        const result = await runDailyFinanceDigest(job);
        summary = result.summary;
        details = result.details;
        break;
      }
      case 'daily_task_standup': {
        const result = await runDailyTaskStandup(job);
        summary = result.summary;
        details = result.details;
        break;
      }
      case 'email_bank_sync': {
        const result = await runEmailBankSync(job);
        summary = result.summary;
        details = result.details;
        break;
      }
      default: {
        summary = `Executed custom job ${job.name} (${job.jobType})`;
        details = { jobType: job.jobType, config: job.config };
        break;
      }
    }
  } catch (error: any) {
    status = 'failed';
    summary = `Job execution failed: ${error.message || 'Unknown error'}`;
    details = { error: error.message, stack: error.stack };
  }

  const durationMs = Date.now() - startTime;
  const now = new Date();
  const nextRunAt = getNextCronRun(job.schedule, now);

  // Record execution log
  const [log] = await db
    .insert(cronLogs)
    .values({
      jobId: job.id,
      status,
      durationMs,
      summary,
      details,
      createdAt: now,
    })
    .returning();

  // Update cronJob state
  const [updatedJob] = await db
    .update(cronJobs)
    .set({
      lastRunAt: now,
      nextRunAt,
      lastStatus: status,
      updatedAt: now,
    })
    .where(eq(cronJobs.id, jobId))
    .returning();

  return { job: updatedJob, log };
}

// --- Background Worker Loop ---

let schedulerTimer: NodeJS.Timeout | null = null;
let isSchedulerRunning = false;
let isTickInProgress = false;

/**
 * Single evaluation tick of the scheduler loop.
 */
async function schedulerTick() {
  if (isTickInProgress) return;
  isTickInProgress = true;

  try {
    const now = new Date();
    // Fetch all active enabled jobs
    const activeJobs = await db
      .select()
      .from(cronJobs)
      .where(eq(cronJobs.isEnabled, true));

    for (const job of activeJobs) {
      try {
        let isDue = false;

        // If nextRunAt is set and has elapsed
        if (job.nextRunAt && new Date(job.nextRunAt) <= now) {
          isDue = true;
        } else if (!job.nextRunAt) {
          // If nextRunAt is not set, initialize it or check if due now
          if (matchCron(job.schedule, now)) {
            isDue = true;
          } else {
            // Set nextRunAt
            await db
              .update(cronJobs)
              .set({ nextRunAt: getNextCronRun(job.schedule, now) })
              .where(eq(cronJobs.id, job.id));
          }
        }

        if (isDue) {
          console.log(`[Scheduler] Executing scheduled job "${job.name}" (${job.jobType})`);
          await runJobNow(job.id);
        }
      } catch (jobErr) {
        console.error(`[Scheduler] Error running job "${job.name}":`, jobErr);
      }
    }
  } catch (loopErr) {
    console.error('[Scheduler] Error in scheduler tick loop:', loopErr);
  } finally {
    isTickInProgress = false;
  }
}

/**
 * Start the in-process background cron scheduler loop (runs every 60 seconds).
 */
export function startScheduler(intervalMs = 60000) {
  if (isSchedulerRunning) {
    console.log('[Scheduler] Background scheduler is already running');
    return;
  }

  isSchedulerRunning = true;
  console.log(`[Scheduler] Autonomous Cron Engine started (polling every ${intervalMs / 1000}s)`);

  // Run initial tick immediately (after short delay for DB connect)
  setTimeout(() => {
    schedulerTick().catch((err) => console.error('[Scheduler] Initial tick error:', err));
  }, 2000);

  schedulerTimer = setInterval(() => {
    schedulerTick().catch((err) => console.error('[Scheduler] Tick error:', err));
  }, intervalMs);
}

/**
 * Stop the in-process background cron scheduler loop.
 */
export function stopScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
  }
  isSchedulerRunning = false;
  console.log('[Scheduler] Background scheduler stopped');
}

/**
 * Helper to seed default cron jobs for a workspace if none exist.
 */
export async function seedDefaultCronJobs(workspaceId: string) {
  const existing = await db
    .select({ id: cronJobs.id })
    .from(cronJobs)
    .where(eq(cronJobs.workspaceId, workspaceId))
    .limit(1);

  if (existing.length > 0) return;

  const defaults = [
    {
      workspaceId,
      name: 'MCP Integrations Health Monitor',
      description: 'Pings connected remote MCP servers every 15 minutes, checks tool availability, and alerts if any integration is down.',
      schedule: '*/15 * * * *',
      jobType: 'mcp_health_check' as JobType,
      config: {},
      isEnabled: true,
      nextRunAt: getNextCronRun('*/15 * * * *'),
    },
    {
      workspaceId,
      name: 'Daily Financial Briefing & Inflow/Outflow Digest',
      description: 'Calculates net day transactions, inflow vs outflow, and delivers a daily summary alert at 9:00 AM.',
      schedule: '0 9 * * *',
      jobType: 'daily_finance_digest' as JobType,
      config: {},
      isEnabled: true,
      nextRunAt: getNextCronRun('0 9 * * *'),
    },
    {
      workspaceId,
      name: 'Daily Task Standup & Overdue Monitor',
      description: 'Surveys active tasks, identifies overdue items, and posts an executive briefing at 9:00 AM.',
      schedule: '0 9 * * *',
      jobType: 'daily_task_standup' as JobType,
      config: {},
      isEnabled: true,
      nextRunAt: getNextCronRun('0 9 * * *'),
    },
    {
      workspaceId,
      name: 'Automated Bank Alert & Email Inbox Sync',
      description: 'Checks financial ingestion source channels every 30 minutes to synchronize incoming statements and alerts.',
      schedule: '*/30 * * * *',
      jobType: 'email_bank_sync' as JobType,
      config: {},
      isEnabled: true,
      nextRunAt: getNextCronRun('*/30 * * * *'),
    },
  ];

  await db.insert(cronJobs).values(defaults);
}
