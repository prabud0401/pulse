export type TransactionType =
  | 'SALARY_INCOME'
  | 'FREELANCE_INCOME'
  | 'INVESTMENT_INCOME'
  | 'PERSONAL_LIVING_EXPENSE'
  | 'INTERNAL_TRANSFER'
  | 'CARD_REPAYMENT'
  | 'CARD_POS_SPEND'
  | 'BANKING_FEE'
  | 'BROKER_INWARD'
  | 'BROKER_OUTWARD'
  | 'LOAN_GIVEN'
  | 'LOAN_RECEIVED'
  | 'LOAN_REPAYMENT'
  | 'ATM_WITHDRAWAL'
  | 'SUBSCRIPTION'
  | 'UTILITY_BILL'
  | 'TRANSPORT'
  | 'UNCATEGORIZED';

export type AccountType = 'savings' | 'checking' | 'credit_card' | 'wallet' | 'investment';
export type TransactionDirection = 'credit' | 'debit';
export type TransactionSource = 'sms' | 'email' | 'pdf' | 'manual' | 'api' | 'csv';

export interface BankAccount {
  id: string;
  workspaceId: string;
  accountNumber?: string | null;
  bankName: string;
  label: string;
  accountType: AccountType;
  currency: string;
  holderName?: string | null;
  ingestionSource?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FinancialTransaction {
  id: string;
  workspaceId: string;
  accountId?: string | null;
  type: TransactionType;
  category?: string | null;
  direction: TransactionDirection;
  amount: number | string;
  currency: string;
  description?: string | null;
  counterparty?: string | null;
  referenceId?: string | null;
  source: TransactionSource;
  rawData?: Record<string, unknown> | null;
  classifiedBy?: 'auto' | 'user' | 'ai' | null;
  transactionDate: string;
  createdAt: string;
  bankName?: string | null;
  accountLabel?: string | null;
}

export interface MonthlyBreakdown {
  month: string;
  income: number;
  expense: number;
  fees: number;
  netSavings: number;
  transactionCount: number;
}

export interface IncomeSummary {
  totalIncome: number;
  totalExpense: number;
  totalFees: number;
  netSavings: number;
  savingsRate: number;
  transactionCount: number;
  monthlyBreakdown: MonthlyBreakdown[];
  period?: {
    fromDate?: string;
    toDate?: string;
  };
}

export interface ScenarioProjection {
  scenario: 'base' | 'happy' | 'worst';
  label: string;
  assumptions: {
    incomeMultiplier: number;
    expenseMultiplier: number;
    feeMultiplier: number;
    unexpectedCost?: number;
    notes?: string;
  };
  projectedIncome: number;
  projectedExpenses: number;
  projectedFees: number;
  projectedNetSavings: number;
  notes: string[];
}

export interface Budget {
  id: string;
  workspaceId: string;
  category: string;
  amount: number | string;
  currency: string;
  period: 'monthly' | 'weekly' | 'yearly';
  startDate?: string | null;
  isActive: boolean;
  createdAt: string;
  currentSpend?: number;
  remaining?: number;
}
