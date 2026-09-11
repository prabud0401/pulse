import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { workspaces } from './workspaces';
import { users } from './users';

export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  icon: varchar('icon', { length: 255 }),
  config: jsonb('config').$type<Record<string, unknown>>().default({}).notNull(),
  status: varchar('status', { length: 20 }).default('disconnected').notNull(),
  lastHealthCheck: timestamp('last_health_check'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const integrationTools = pgTable('integration_tools', {
  id: uuid('id').primaryKey().defaultRandom(),
  integrationId: uuid('integration_id').references(() => integrations.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  inputSchema: jsonb('input_schema'),
  enabled: boolean('enabled').default(true).notNull(),
  usageCount: integer('usage_count').default(0).notNull(),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const toolInvocations = pgTable('tool_invocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  integrationId: uuid('integration_id').references(() => integrations.id, { onDelete: 'cascade' }).notNull(),
  toolName: varchar('tool_name', { length: 255 }).notNull(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  input: jsonb('input'),
  output: jsonb('output'),
  status: varchar('status', { length: 20 }).notNull(),
  durationMs: integer('duration_ms'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const integrationsRelations = relations(integrations, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [integrations.workspaceId],
    references: [workspaces.id],
  }),
  tools: many(integrationTools),
  invocations: many(toolInvocations),
}));

export const integrationToolsRelations = relations(integrationTools, ({ one }) => ({
  integration: one(integrations, {
    fields: [integrationTools.integrationId],
    references: [integrations.id],
  }),
}));

export const toolInvocationsRelations = relations(toolInvocations, ({ one }) => ({
  integration: one(integrations, {
    fields: [toolInvocations.integrationId],
    references: [integrations.id],
  }),
  user: one(users, {
    fields: [toolInvocations.userId],
    references: [users.id],
  }),
}));
