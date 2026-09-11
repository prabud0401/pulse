import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { workspaces } from './workspaces';

export const cronJobs = pgTable('cron_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  schedule: varchar('schedule', { length: 100 }).notNull(), // e.g. '0 9 * * *', '*/15 * * * *', '0 21 * * *'
  jobType: varchar('job_type', { length: 50 }).notNull(), // 'mcp_health_check' | 'daily_finance_digest' | 'daily_task_standup' | 'email_bank_sync'
  config: jsonb('config').$type<Record<string, unknown>>().default({}).notNull(),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  lastRunAt: timestamp('last_run_at'),
  nextRunAt: timestamp('next_run_at'),
  lastStatus: varchar('last_status', { length: 20 }), // 'success' | 'failed' | 'running'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const cronLogs = pgTable('cron_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  jobId: uuid('job_id').references(() => cronJobs.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'success' | 'failed'
  durationMs: integer('duration_ms'),
  summary: text('summary'),
  details: jsonb('details').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cronJobsRelations = relations(cronJobs, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [cronJobs.workspaceId],
    references: [workspaces.id],
  }),
  logs: many(cronLogs),
}));

export const cronLogsRelations = relations(cronLogs, ({ one }) => ({
  job: one(cronJobs, {
    fields: [cronLogs.jobId],
    references: [cronJobs.id],
  }),
}));
