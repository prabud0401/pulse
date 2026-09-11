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

export type AccountType = 'savings' | 'checking' | 'credit_card' | 'wallet' | 'investment' | 'loan';
export type TransactionDirection = 'credit' | 'debit';
export type TransactionSource = 'sms' | 'email' | 'pdf' | 'manual' | 'api' | 'csv';
export type ClassifiedBy = 'auto' | 'user' | 'ai';
export type BudgetPeriod = 'monthly' | 'weekly' | 'yearly';

export type SupportedCurrency = 'USD' | 'LKR' | 'EUR' | 'GBP' | 'INR' | 'SGD' | 'AED' | 'CAD';

export interface NetWorthAccountInput {
  id?: string;
  bankName?: string;
  label?: string;
  accountType: AccountType | string;
  currency: string;
  balance?: number | string | null;
}

export interface NetWorthBreakdown {
  cash: number;
  wallets: number;
  investments: number;
  liabilities: number;
  byType: Record<string, number>;
}

export interface CurrencyDistributionItem {
  currency: string;
  rawAmount: number;
  convertedAmount: number;
  percentage: number;
}

export interface AccountNetWorthItem {
  id?: string;
  bankName: string;
  label: string;
  accountType: string;
  currency: string;
  originalBalance: number;
  convertedBalance: number;
  isLiability: boolean;
}

export interface NetWorthResult {
  baseCurrency: string;
  totalNetWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  breakdown: NetWorthBreakdown;
  currencyDistribution: Record<string, CurrencyDistributionItem>;
  accounts: AccountNetWorthItem[];
}

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
  createdAt: Date | string;
  updatedAt: Date | string;
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
  classifiedBy?: ClassifiedBy | null;
  transactionDate: Date | string;
  createdAt: Date | string;
}

export interface ClassificationCondition {
  field: 'description' | 'counterparty' | 'amount' | 'direction' | 'source' | 'bankName';
  operator: 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'gt' | 'lt' | 'regex';
  value: string | number;
}

export interface ClassificationRule {
  id: string;
  workspaceId: string;
  name: string;
  priority: number;
  conditions: ClassificationCondition[] | Record<string, unknown>;
  resultType: TransactionType;
  resultCategory?: string | null;
  isActive: boolean;
  createdAt: Date | string;
}

export interface Budget {
  id: string;
  workspaceId: string;
  category: string;
  amount: number | string;
  currency: string;
  period: BudgetPeriod;
  startDate?: string | Date | null;
  isActive: boolean;
  createdAt: Date | string;
  currentSpend?: number;
  remaining?: number;
}

export interface MonthlyBreakdown {
  month: string; // 'YYYY-MM'
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
  savingsRate: number; // percentage
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

export interface ReconciliationReport {
  generatedAt: string;
  summary: {
    totalIncome: number;
    totalExpense: number;
    bankingFees: number;
    internalTransfers: number;
    cardRepayments: number;
    brokerInward: number;
    brokerOutward: number;
    netPersonalSavings: number;
    transactionCount: number;
  };
  scenarios: ScenarioProjection[];
  transactions?: FinancialTransaction[];
  markdown?: string;
}

export interface SmsParserTemplate {
  id: string;
  workspaceId?: string | null;
  bankName: string;
  senderIds: string[];
  patterns: Record<string, unknown>;
  currency: string;
  country?: string | null;
  isActive: boolean;
  createdAt: Date | string;
}
