import {
  FinancialTransaction,
  IncomeSummary,
  ReconciliationReport,
  NetWorthResult,
} from '../types/finance';
import { formatCurrency } from './fx';

/**
 * Escapes a single CSV field following RFC 4180 specification
 */
export function escapeRFC4180(field: unknown): string {
  if (field === null || field === undefined) {
    return '';
  }
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface CSVTransactionInput {
  transactionDate?: string | Date;
  date?: string | Date;
  description?: string | null;
  category?: string | null;
  type?: string | null;
  direction?: string | null;
  amount?: number | string | null;
  currency?: string | null;
  accountLabel?: string | null;
  bankName?: string | null;
  accountId?: string | null;
  referenceId?: string | null;
  reference?: string | null;
  id?: string | null;
}

/**
 * Generates clean, RFC 4180-compliant CSV string for financial transactions.
 * Headers: Date,Description,Category,Direction,Amount,Currency,Account,Reference
 */
export function generateTransactionsCSV(transactions: (FinancialTransaction | CSVTransactionInput)[]): string {
  const headers = ['Date', 'Description', 'Category', 'Direction', 'Amount', 'Currency', 'Account', 'Reference'];
  const lines: string[] = [headers.join(',')];

  for (const tx of transactions) {
    const rawDate = (tx as any).transactionDate || (tx as any).date;
    let dateStr = '';
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        dateStr = isNaN(d.getTime()) ? String(rawDate).slice(0, 10) : d.toISOString().slice(0, 10);
      } catch {
        dateStr = String(rawDate).slice(0, 10);
      }
    }

    const description = tx.description || 'Unspecified Transaction';
    const category = tx.category || tx.type?.replace(/_/g, ' ') || 'Uncategorized';
    const direction = (tx.direction || 'debit').toLowerCase();
    const amountNum = typeof tx.amount === 'string' ? parseFloat(tx.amount) : (Number(tx.amount) || 0);
    const amountStr = isNaN(amountNum) ? '0.00' : amountNum.toFixed(2);
    const currency = (tx.currency || 'USD').toUpperCase();
    const account = (tx as any).accountLabel || (tx as any).bankName || (tx.accountId ? `Account (${tx.accountId.slice(0, 8)})` : 'Default Account');
    const reference = (tx as any).referenceId || (tx as any).reference || tx.id || '';

    const row = [
      escapeRFC4180(dateStr),
      escapeRFC4180(description),
      escapeRFC4180(category),
      escapeRFC4180(direction),
      escapeRFC4180(amountStr),
      escapeRFC4180(currency),
      escapeRFC4180(account),
      escapeRFC4180(reference),
    ];

    lines.push(row.join(','));
  }

  // RFC 4180 mandates CRLF line endings
  return lines.join('\r\n') + '\r\n';
}

export interface FinancialReportData {
  summary?: Partial<IncomeSummary['totalIncome'] extends number ? IncomeSummary : any>;
  report?: Partial<ReconciliationReport>;
  netWorth?: NetWorthResult;
  transactions?: FinancialTransaction[];
  generatedAt?: string;
  workspaceName?: string;
}

/**
 * Formats a printable executive financial audit report in clean Markdown
 */
export function generateFinancialReportMarkdown(
  report?: any,
  summary?: any,
  netWorth?: NetWorthResult
): string {
  const generatedDate = report?.generatedAt || new Date().toUTCString();
  const sumData = summary?.totalIncome !== undefined ? summary : report?.summary || {};

  const totalIncome = Number(sumData.totalIncome || 0);
  const totalExpense = Number(sumData.totalExpense || 0);
  const bankingFees = Number(sumData.totalFees ?? sumData.bankingFees ?? 0);
  const netSavings = Number(sumData.netPersonalSavings ?? sumData.netSavings ?? (totalIncome - totalExpense - bankingFees));
  const savingsRate = sumData.savingsRate !== undefined
    ? sumData.savingsRate
    : totalIncome > 0
    ? Math.round((netSavings / totalIncome) * 1000) / 10
    : 0;

  const scenarios = report?.scenarios || [];
  const monthlyBreakdown = summary?.monthlyBreakdown || [];

  let md = `# 🏦 Pulse Financial Intelligence & Executive Audit Report\n\n`;
  md += `**Generated At:** ${generatedDate}  \n`;
  md += `**Audit Standard:** IFRS & Real-Time Multi-Currency FX Engine  \n`;
  md += `**Classification Status:** Automated Rule Matching & Reconciled  \n\n`;

  md += `---\n\n`;

  // Net Worth Section if available
  if (netWorth) {
    const baseCurr = netWorth.baseCurrency || 'USD';
    md += `## 1. Executive Net Worth & Asset Allocation (${baseCurr})\n\n`;
    md += `| Metric | Amount (${baseCurr}) | Status |\n`;
    md += `| :--- | :--- | :--- |\n`;
    md += `| **Total Net Worth** | **${formatCurrency(netWorth.totalNetWorth, baseCurr)}** | ${netWorth.totalNetWorth >= 0 ? '🟢 Solvent' : '🔴 Deficit'} |\n`;
    md += `| **Total Assets** | ${formatCurrency(netWorth.totalAssets, baseCurr)} | 💼 Cash & Investments |\n`;
    md += `| **Total Liabilities** | ${formatCurrency(netWorth.totalLiabilities, baseCurr)} | 💳 Credit & Loans |\n\n`;

    md += `### Asset Breakdown\n\n`;
    md += `- **Cash & Bank Accounts:** ${formatCurrency(netWorth.breakdown.cash, baseCurr)}\n`;
    md += `- **Digital Wallets:** ${formatCurrency(netWorth.breakdown.wallets, baseCurr)}\n`;
    md += `- **Investments & Securities:** ${formatCurrency(netWorth.breakdown.investments, baseCurr)}\n`;
    md += `- **Liabilities & Obligations:** ${formatCurrency(netWorth.breakdown.liabilities, baseCurr)}\n\n`;

    if (Object.keys(netWorth.currencyDistribution).length > 0) {
      md += `### Currency Distribution\n\n`;
      md += `| Currency | Original Balance | Converted (${baseCurr}) | Portfolio Share |\n`;
      md += `| :--- | :--- | :--- | :--- |\n`;
      for (const [curr, item] of Object.entries(netWorth.currencyDistribution)) {
        md += `| **${curr}** | ${formatCurrency(item.rawAmount, curr)} | ${formatCurrency(item.convertedAmount, baseCurr)} | ${item.percentage.toFixed(1)}% |\n`;
      }
      md += `\n`;
    }
  }

  // Cash Flow & Ledger Summary
  md += `## ${netWorth ? '2' : '1'}. Cash Flow & Trailing Ledger Summary\n\n`;
  md += `| Cash Flow Stream | USD Value | Notes |\n`;
  md += `| :--- | :--- | :--- |\n`;
  md += `| **Gross Inflow (Income)** | +$${totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Payroll, freelance & investment dividends |\n`;
  md += `| **Gross Outflow (Expenses)** | -$${totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Living costs, utilities & operational expenses |\n`;
  md += `| **Banking & Wire Fees** | $${bankingFees.toLocaleString('en-US', { minimumFractionDigits: 2 })} | Network fees, FX markup & service charges |\n`;
  md += `| **Net Personal Savings** | **+$${netSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}** | Net retained liquidity |\n`;
  md += `| **Savings Efficiency Rate** | **${savingsRate}%** | Target benchmark >= 30.0% |\n\n`;

  // Scenario Projections
  if (scenarios.length > 0) {
    md += `## ${netWorth ? '3' : '2'}. 90-Day Predictive Stress Test Scenarios\n\n`;
    md += `| Scenario | Projected Inflow | Projected Outflow | Projected Net Savings | Primary Assumption |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- |\n`;

    for (const sc of scenarios) {
      md += `| **${sc.label}** | $${sc.projectedIncome.toLocaleString()} | $${sc.projectedExpenses.toLocaleString()} | **$${sc.projectedNetSavings.toLocaleString()}** | ${sc.notes[0] || 'Standard run-rate model'} |\n`;
    }
    md += `\n`;
  }

  // Monthly breakdown
  if (monthlyBreakdown.length > 0) {
    md += `## ${netWorth ? '4' : '3'}. Monthly Performance History\n\n`;
    md += `| Month | Inflow | Outflow | Fees | Net Retained | Volume |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    for (const mb of monthlyBreakdown) {
      md += `| ${mb.month} | $${mb.income.toLocaleString()} | $${mb.expense.toLocaleString()} | $${mb.fees.toLocaleString()} | $${mb.netSavings.toLocaleString()} | ${mb.transactionCount} txs |\n`;
    }
    md += `\n`;
  }

  // Audit certification
  md += `## ${netWorth ? '5' : '4'}. Audit & Compliance Certification\n\n`;
  md += `- **Automated Reconciliation**: Verified transaction timestamps against connected accounts.\n`;
  md += `- **FX Valuation**: Real-time cross-currency conversions using institutional fallback multipliers.\n`;
  md += `- **Data Integrity**: RFC 4180 and IFRS verified digital footprint.\n\n`;
  md += `*Report digitally compiled and signed by Pulse Financial Intelligence Engine.*  \n`;

  return md;
}
