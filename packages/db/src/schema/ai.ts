import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { workspaces } from './workspaces';
import { users } from './users';

export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  title: varchar('title', { length: 255 }),
  model: varchar('model', { length: 100 }).default('gemini-2.5-flash').notNull(),
  systemPrompt: text('system_prompt'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const aiMessages = pgTable('ai_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').references(() => aiConversations.id, { onDelete: 'cascade' }).notNull(),
  role: varchar('role', { length: 20 }).notNull(), // 'user' | 'assistant' | 'system' | 'tool'
  content: text('content').notNull(),
  toolCalls: jsonb('tool_calls').$type<Record<string, unknown> | Array<unknown>>(),
  toolResults: jsonb('tool_results').$type<Record<string, unknown> | Array<unknown>>(),
  tokensUsed: integer('tokens_used'),
  model: varchar('model', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const aiProviders = pgTable('ai_providers', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  provider: varchar('provider', { length: 50 }).notNull(), // 'gemini' | 'openai' | 'anthropic' | 'ollama'
  apiKeyEncrypted: text('api_key_encrypted'),
  baseUrl: varchar('base_url', { length: 255 }),
  defaultModel: varchar('default_model', { length: 100 }),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [aiConversations.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [aiConversations.userId],
    references: [users.id],
  }),
  messages: many(aiMessages),
}));

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, {
    fields: [aiMessages.conversationId],
    references: [aiConversations.id],
  }),
}));

export const aiProvidersRelations = relations(aiProviders, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [aiProviders.workspaceId],
    references: [workspaces.id],
  }),
}));
