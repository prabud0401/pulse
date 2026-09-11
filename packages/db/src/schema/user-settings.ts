import { pgTable, uuid, varchar, jsonb, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

export const userSettings = pgTable('user_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  key: varchar('key', { length: 255 }).notNull(),
  value: jsonb('value'),
}, (table) => ({
  settingsUnique: unique().on(table.userId, table.key),
}));

export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));
