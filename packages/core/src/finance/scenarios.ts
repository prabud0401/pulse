import {
  FinancialTransaction,
  IncomeSummary,
  ScenarioProjection,
} from '../types/finance';

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

export interface ScenarioInput {
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyFees?: number;
}

export function calculateScenarioProjections(input: ScenarioInput): ScenarioProjection[] {
  const baseIncome = input.monthlyIncome > 0 ? input.monthlyIncome : 4500;
  const baseExpenses = input.monthlyExpenses > 0 ? input.monthlyExpenses : baseIncome * 0.6;
  const baseFees = typeof input.monthlyFees === 'number' && input.monthlyFees >= 0 ? input.monthlyFees : 35;

  // 1. Base Case: Trailing run-rate
  const baseNet = round2(baseIncome - baseExpenses - baseFees);
  const baseCase: ScenarioProjection = {
    scenario: 'base',
    label: 'Base Case — Current Run-Rate',
    assumptions: {
      incomeMultiplier: 1.0,
      expenseMultiplier: 1.0,
      feeMultiplier: 1.0,
      unexpectedCost: 0,
    },
    projectedIncome: round2(baseIncome),
    projectedExpenses: round2(baseExpenses),
    projectedFees: round2(baseFees),
    projectedNetSavings: baseNet,
    notes: [
      'Reflects current trailing monthly run-rate across all accounts.',
      `Savings rate currently at ${round2((baseNet / (baseIncome || 1)) * 100)}%.`,
    ],
  };

  // 2. Happy Case: 10% lower expenses, optimized savings
  const happyIncome = round2(baseIncome * 1.05);
  const happyExpenses = round2(baseExpenses * 0.90);
  const happyFees = round2(baseFees * 0.80);
  const happyNet = round2(happyIncome - happyExpenses - happyFees);
  const happyCase: ScenarioProjection = {
    scenario: 'happy',
    label: 'Happy Case — Optimized Lifestyle',
    assumptions: {
      incomeMultiplier: 1.05,
      expenseMultiplier: 0.90,
      feeMultiplier: 0.80,
      unexpectedCost: 0,
    },
    projectedIncome: happyIncome,
    projectedExpenses: happyExpenses,
    projectedFees: happyFees,
    projectedNetSavings: happyNet,
    notes: [
      '10% disciplined reduction in dining, subscriptions, and discretionary spend.',
      'Includes modest 5% freelance or investment yield upside.',
      `Boosts net savings by +$${round2(happyNet - baseNet).toLocaleString()} / month.`,
    ],
  };

  // 3. Worst Case: 15% lower income, +15% higher expenses, unexpected cost shock
  const emergencyShock = round2(Math.max(500, baseIncome * 0.1));
  const worstIncome = round2(baseIncome * 0.85);
  const worstExpenses = round2(baseExpenses * 1.15 + emergencyShock);
  const worstFees = round2(baseFees * 1.30);
  const worstNet = round2(worstIncome - worstExpenses - worstFees);
  const worstCase: ScenarioProjection = {
    scenario: 'worst',
    label: 'Worst Case — Stress Shock',
    assumptions: {
      incomeMultiplier: 0.85,
      expenseMultiplier: 1.15,
      feeMultiplier: 1.30,
      unexpectedCost: emergencyShock,
    },
    projectedIncome: worstIncome,
    projectedExpenses: worstExpenses,
    projectedFees: worstFees,
    projectedNetSavings: worstNet,
    notes: [
      'Models 15% delayed/reduced income from clients or payroll.',
      `Accounts for unexpected emergency shock of $${emergencyShock.toLocaleString()}.`,
      worstNet < 0
        ? 'Deficit warning: Requires emergency liquid buffer to cover shortfalls.'
        : 'Emergency liquidity holds up despite macro and cost shocks.',
    ],
  };

  return [baseCase, happyCase, worstCase];
}

export function projectFromTransactions(
  transactions: FinancialTransaction[]
): ScenarioProjection[] {
  let totalIncome = 0;
  let totalExpense = 0;
  let totalFees = 0;

  for (const tx of transactions) {
    const amount = Number(tx.amount || 0);
    if (tx.direction === 'credit') {
      if (
        tx.type === 'SALARY_INCOME' ||
        tx.type === 'FREELANCE_INCOME' ||
        tx.type === 'INVESTMENT_INCOME'
      ) {
        totalIncome += amount;
      }
    } else if (tx.direction === 'debit') {
      if (tx.type === 'BANKING_FEE') {
        totalFees += amount;
      } else if (
        tx.type === 'PERSONAL_LIVING_EXPENSE' ||
        tx.type === 'CARD_POS_SPEND' ||
        tx.type === 'UTILITY_BILL' ||
        tx.type === 'TRANSPORT' ||
        tx.type === 'SUBSCRIPTION' ||
        tx.type === 'ATM_WITHDRAWAL'
      ) {
        totalExpense += amount;
      }
    }
  }

  return calculateScenarioProjections({
    monthlyIncome: totalIncome || 5000,
    monthlyExpenses: totalExpense || 3000,
    monthlyFees: totalFees || 40,
  });
}
