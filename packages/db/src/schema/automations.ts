import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { workspaces } from './workspaces';
import { users } from './users';

export const automationRules = pgTable('automation_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  triggerType: varchar('trigger_type', { length: 50 }).notNull(), // 'event' | 'schedule' | 'webhook'
  triggerConfig: jsonb('trigger_config').$type<Record<string, unknown>>().default({}).notNull(),
  actions: jsonb('actions').$type<Array<Record<string, unknown>>>().default([]).notNull(),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  lastTriggeredAt: timestamp('last_triggered_at'),
  triggerCount: integer('trigger_count').default(0).notNull(),
  createdBy: uuid('created_by').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const automationLogs = pgTable('automation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  ruleId: uuid('rule_id').references(() => automationRules.id, { onDelete: 'cascade' }).notNull(),
  status: varchar('status', { length: 20 }).notNull(), // 'success' | 'partial' | 'error'
  triggerData: jsonb('trigger_data').$type<Record<string, unknown>>(),
  actionResults: jsonb('action_results').$type<Array<Record<string, unknown>>>(),
  durationMs: integer('duration_ms'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const automationRulesRelations = relations(automationRules, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [automationRules.workspaceId],
    references: [workspaces.id],
  }),
  creator: one(users, {
    fields: [automationRules.createdBy],
    references: [users.id],
  }),
  logs: many(automationLogs),
}));

export const automationLogsRelations = relations(automationLogs, ({ one }) => ({
  rule: one(automationRules, {
    fields: [automationLogs.ruleId],
    references: [automationRules.id],
  }),
}));
