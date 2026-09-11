import { apiClient } from './api-client';
import {
  BankAccount,
  FinancialTransaction,
  IncomeSummary,
  ScenarioProjection,
  Budget,
} from '@/types/finance';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface TransactionFilterParams {
  type?: string;
  category?: string;
  accountId?: string;
  direction?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const financeApi = {
  // Accounts
  getAccounts: async () => {
    const res = await apiClient.get<ApiResponse<BankAccount[]>>('/finance/accounts');
    return res.data;
  },

  createAccount: async (data: {
    bankName: string;
    label: string;
    accountType: string;
    accountNumber?: string;
    currency?: string;
    holderName?: string;
  }) => {
    const res = await apiClient.post<ApiResponse<BankAccount>>('/finance/accounts', data);
    return res.data;
  },

  deleteAccount: async (id: string) => {
    return apiClient.delete<ApiResponse<void>>(`/finance/accounts/${id}`);
  },

  // Transactions
  getTransactions: async (params: TransactionFilterParams = {}) => {
    const query = new URLSearchParams();
    if (params.type) query.set('type', params.type);
    if (params.category) query.set('category', params.category);
    if (params.accountId) query.set('accountId', params.accountId);
    if (params.direction) query.set('direction', params.direction);
    if (params.fromDate) query.set('fromDate', params.fromDate);
    if (params.toDate) query.set('toDate', params.toDate);
    if (params.search) query.set('search', params.search);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const qs = query.toString();
    const endpoint = qs ? `/finance/transactions?${qs}` : '/finance/transactions';
    return apiClient.get<ApiResponse<FinancialTransaction[]>>(endpoint);
  },

  createTransaction: async (data: {
    accountId?: string;
    amount: number | string;
    direction: 'credit' | 'debit';
    description: string;
    type?: string;
    category?: string;
    counterparty?: string;
    transactionDate?: string;
  }) => {
    const res = await apiClient.post<ApiResponse<FinancialTransaction>>('/finance/transactions', data);
    return res.data;
  },

  deleteTransaction: async (id: string) => {
    return apiClient.delete<ApiResponse<void>>(`/finance/transactions/${id}`);
  },

  // Summaries & Scenarios
  getSummary: async (params?: { fromDate?: string; toDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.fromDate) query.set('fromDate', params.fromDate);
    if (params?.toDate) query.set('toDate', params.toDate);
    const qs = query.toString();
    const endpoint = qs ? `/finance/summary?${qs}` : '/finance/summary';
    const res = await apiClient.get<ApiResponse<IncomeSummary>>(endpoint);
    return res.data;
  },

  getReport: async () => {
    const res = await apiClient.get<ApiResponse<{
      summary: any;
      scenarios: ScenarioProjection[];
      markdown: string;
    }>>('/finance/report');
    return res.data;
  },

  // Budgets
  getBudgets: async () => {
    const res = await apiClient.get<ApiResponse<Budget[]>>('/finance/budgets');
    return res.data;
  },

  createBudget: async (data: {
    category: string;
    amount: number | string;
    period?: 'monthly' | 'weekly' | 'yearly';
  }) => {
    const res = await apiClient.post<ApiResponse<Budget>>('/finance/budgets', data);
    return res.data;
  },

  // Ingest
  ingestSms: async (data: { sender: string; text: string; receivedAt?: string }) => {
    const res = await apiClient.post<ApiResponse<any>>('/finance/ingest/sms', data);
    return res.data;
  },
};
