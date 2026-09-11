import { pgTable, uuid, varchar, timestamp, boolean, jsonb, integer, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { workspaces } from './workspaces';

export const dashboardLayouts = pgTable('dashboard_layouts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).default('Default').notNull(),
  layout: jsonb('layout').$type<Record<string, unknown>[] | unknown[]>().default([]).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userWorkspaceNameUnique: unique().on(table.userId, table.workspaceId, table.name),
}));

export const dashboardWidgets = pgTable('dashboard_widgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  layoutId: uuid('layout_id').references(() => dashboardLayouts.id, { onDelete: 'cascade' }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'stat' | 'chart' | 'list' | 'calendar' | 'feed' | 'custom'
  title: varchar('title', { length: 255 }).notNull(),
  dataSource: varchar('data_source', { length: 255 }),
  config: jsonb('config').$type<Record<string, unknown>>().default({}).notNull(),
  position: jsonb('position').$type<{ x: number; y: number; w: number; h: number }>().notNull(),
  refreshInterval: integer('refresh_interval'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const dashboardLayoutsRelations = relations(dashboardLayouts, ({ one, many }) => ({
  user: one(users, {
    fields: [dashboardLayouts.userId],
    references: [users.id],
  }),
  workspace: one(workspaces, {
    fields: [dashboardLayouts.workspaceId],
    references: [workspaces.id],
  }),
  widgets: many(dashboardWidgets),
}));

export const dashboardWidgetsRelations = relations(dashboardWidgets, ({ one }) => ({
  layout: one(dashboardLayouts, {
    fields: [dashboardWidgets.layoutId],
    references: [dashboardLayouts.id],
  }),
}));
