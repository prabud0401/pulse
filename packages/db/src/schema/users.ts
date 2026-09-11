import { pgTable, uuid, varchar, text, timestamp, boolean } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { sessions } from './sessions';
import { oauthAccounts } from './oauth-accounts';
import { workspaces, workspaceMembers } from './workspaces';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }),
  avatarUrl: text('avatar_url'),
  passwordHash: text('password_hash'),
  emailVerified: boolean('email_verified').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  oauthAccounts: many(oauthAccounts),
  workspaces: many(workspaces),
  workspaceMembers: many(workspaceMembers),
}));
