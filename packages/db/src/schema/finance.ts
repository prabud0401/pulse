import { pgTable, uuid, varchar, text, timestamp, boolean, jsonb, integer, decimal, date, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { workspaces } from './workspaces';

export const bankAccounts = pgTable('bank_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  accountNumber: varchar('account_number', { length: 255 }),
  bankName: varchar('bank_name', { length: 255 }).notNull(),
  label: varchar('label', { length: 255 }).notNull(),
  accountType: varchar('account_type', { length: 50 }).notNull(), // 'savings' | 'checking' | 'credit_card' | 'wallet' | 'investment'
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  holderName: varchar('holder_name', { length: 255 }),
  ingestionSource: varchar('ingestion_source', { length: 255 }), // 'SMS' | 'Email' | 'PDF' | 'API' | 'Manual'
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const financialTransactions = pgTable('financial_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  accountId: uuid('account_id').references(() => bankAccounts.id, { onDelete: 'set null' }),
  type: varchar('type', { length: 50 }).notNull(), // SALARY_INCOME, PERSONAL_LIVING_EXPENSE, etc.
  category: varchar('category', { length: 100 }),
  direction: varchar('direction', { length: 10 }).notNull(), // 'credit' | 'debit'
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  description: text('description'),
  counterparty: varchar('counterparty', { length: 255 }),
  referenceId: varchar('reference_id', { length: 255 }),
  source: varchar('source', { length: 50 }).notNull(), // 'sms' | 'email' | 'pdf' | 'manual' | 'api' | 'csv'
  rawData: jsonb('raw_data').$type<Record<string, unknown>>(),
  classifiedBy: varchar('classified_by', { length: 20 }), // 'auto' | 'user' | 'ai'
  transactionDate: timestamp('transaction_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  refUnique: unique().on(table.workspaceId, table.referenceId),
}));

export const classificationRules = pgTable('classification_rules', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  priority: integer('priority').default(0).notNull(),
  conditions: jsonb('conditions').$type<Record<string, unknown> | Array<Record<string, unknown>>>().notNull(),
  resultType: varchar('result_type', { length: 50 }).notNull(),
  resultCategory: varchar('result_category', { length: 100 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const budgets = pgTable('budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }).notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  amount: decimal('amount', { precision: 15, scale: 2 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  period: varchar('period', { length: 20 }).default('monthly').notNull(), // 'monthly' | 'weekly' | 'yearly'
  startDate: date('start_date'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  budgetUnique: unique().on(table.workspaceId, table.category, table.period),
}));

export const smsParserTemplates = pgTable('sms_parser_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  bankName: varchar('bank_name', { length: 255 }).notNull(),
  senderIds: text('sender_ids').array().notNull(),
  patterns: jsonb('patterns').$type<Record<string, unknown>>().notNull(),
  currency: varchar('currency', { length: 3 }).default('USD').notNull(),
  country: varchar('country', { length: 10 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bankAccountsRelations = relations(bankAccounts, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [bankAccounts.workspaceId],
    references: [workspaces.id],
  }),
  transactions: many(financialTransactions),
}));

export const financialTransactionsRelations = relations(financialTransactions, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [financialTransactions.workspaceId],
    references: [workspaces.id],
  }),
  account: one(bankAccounts, {
    fields: [financialTransactions.accountId],
    references: [bankAccounts.id],
  }),
}));

export const classificationRulesRelations = relations(classificationRules, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [classificationRules.workspaceId],
    references: [workspaces.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [budgets.workspaceId],
    references: [workspaces.id],
  }),
}));

export const smsParserTemplatesRelations = relations(smsParserTemplates, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [smsParserTemplates.workspaceId],
    references: [workspaces.id],
  }),
}));
