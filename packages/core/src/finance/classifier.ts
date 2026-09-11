import {
  ClassificationRule,
  ClassificationCondition,
  FinancialTransaction,
  TransactionType,
} from '../types/finance';

export interface ClassifyInput {
  description: string;
  amount?: number;
  direction?: 'credit' | 'debit';
  counterparty?: string;
  source?: string;
  bankName?: string;
  rules?: ClassificationRule[];
}

export interface ClassificationResult {
  type: TransactionType;
  category: string;
  confidence: number;
  matchedRuleId?: string;
}

const UTILITY_KEYWORDS = [
  'ceb', 'electricity', 'nwsdb', 'water board', 'utility', 'dialog broadband',
  'dialog mobile', 'dialog postpaid', 'mobitel', 'slt', 'telecom', 'internet bill',
  'power bill', 'gas bill', 'electric', 'water bill', 'utilities'
];

const TRANSPORT_KEYWORDS = [
  'uber', 'pickme', 'pick me', 'lyft', 'grab', 'taxi', 'fuel', 'petrol',
  'gasoline', 'diesel', 'parking', 'toll', 'metro', 'subway', 'transit', 'bus fare'
];

const FOOD_KEYWORDS = [
  'restaurant', 'cafe', 'coffee', 'food', 'dining', 'ubereats', 'uber eats',
  'doordash', 'swiggy', 'zomato', 'groceries', 'supermarket', 'keells', 'cargills',
  'spar', 'walmart', 'trader joe', 'whole foods', 'bakery', 'market', 'bistro'
];

const SUBSCRIPTION_KEYWORDS = [
  'netflix', 'spotify', 'google *', 'google play', 'youtube', 'apple.com',
  'icloud', 'amazon prime', 'github', 'chatgpt', 'openai', 'notion', 'adobe'
];

const ATM_KEYWORDS = [
  'atm withdrawal', 'atm wdl', 'atm cash', 'cash withdrawal', 'atm dr', 'cash out'
];

const CARD_MERCHANT_KEYWORDS = [
  'pos ', 'card purchase', 'merchant', 'visa purchase', 'mastercard', 'contactless'
];

const BANKING_FEE_KEYWORDS = [
  'fee', 'charge', 'cefts fee', 'cefts charge', 'service fee', 'maintenance fee',
  'atm fee', 'overdraft', 'tax', 'stamp duty', 'commission'
];

const BROKER_KEYWORDS = [
  'broker', 'cdm', 'cash dep', 'trading', 'securities', 'investments ltd',
  'capital partners', 'forex', 'binance', 'coinbase', 'disbursement'
];

function evaluateCondition(cond: ClassificationCondition, input: ClassifyInput): boolean {
  let targetValue = '';
  if (cond.field === 'description') targetValue = input.description || '';
  else if (cond.field === 'counterparty') targetValue = input.counterparty || '';
  else if (cond.field === 'bankName') targetValue = input.bankName || '';
  else if (cond.field === 'source') targetValue = input.source || '';
  else if (cond.field === 'direction') targetValue = input.direction || '';
  else if (cond.field === 'amount') targetValue = String(input.amount || 0);

  const strTarget = String(targetValue).toLowerCase();
  const strVal = String(cond.value).toLowerCase();

  switch (cond.operator) {
    case 'contains':
      return strTarget.includes(strVal);
    case 'equals':
      return strTarget === strVal;
    case 'startsWith':
      return strTarget.startsWith(strVal);
    case 'endsWith':
      return strTarget.endsWith(strVal);
    case 'gt':
      return Number(input.amount || 0) > Number(cond.value);
    case 'lt':
      return Number(input.amount || 0) < Number(cond.value);
    case 'regex':
      try {
        return new RegExp(String(cond.value), 'i').test(String(targetValue));
      } catch {
        return false;
      }
    default:
      return false;
  }
}

export function classifyTransaction(input: ClassifyInput): ClassificationResult {
  const text = `${input.description || ''} ${input.counterparty || ''}`.toLowerCase();
  const direction = input.direction || 'debit';
  const amount = input.amount || 0;

  // 1. Evaluate user-defined / workspace classification rules (sorted by priority descending)
  if (input.rules && input.rules.length > 0) {
    const sortedRules = [...input.rules]
      .filter(r => r.isActive)
      .sort((a, b) => (b.priority || 0) - (a.priority || 0));

    for (const rule of sortedRules) {
      if (Array.isArray(rule.conditions)) {
        const matchesAll = rule.conditions.every(cond => evaluateCondition(cond as ClassificationCondition, input));
        if (matchesAll) {
          return {
            type: rule.resultType,
            category: rule.resultCategory || rule.name,
            confidence: 0.95,
            matchedRuleId: rule.id,
          };
        }
      }
    }
  }

  // 2. Built-in Heuristics & Keywords
  // Salary / Remittance
  if (
    direction === 'credit' &&
    (text.includes('salary') ||
      text.includes('payroll') ||
      text.includes('wise') ||
      text.includes('wage') ||
      text.includes('stipend') ||
      text.includes('direct dep') ||
      text.includes('remittance'))
  ) {
    return { type: 'SALARY_INCOME', category: 'Salary', confidence: 0.92 };
  }

  // Banking Fees
  if (direction === 'debit' && BANKING_FEE_KEYWORDS.some(k => text.includes(k))) {
    return { type: 'BANKING_FEE', category: 'Bank Fees', confidence: 0.9 };
  }

  // Credit Card Repayments
  if (
    text.includes('card payment') ||
    text.includes('credit card settle') ||
    text.includes('cc payment') ||
    text.includes('card top-up')
  ) {
    return { type: 'CARD_REPAYMENT', category: 'Card Settlement', confidence: 0.88 };
  }

  // Broker Inward / Pass-through
  if (direction === 'credit' && BROKER_KEYWORDS.some(k => text.includes(k))) {
    return { type: 'BROKER_INWARD', category: 'Broker Inflow', confidence: 0.85 };
  }

  // Broker Outward
  if (direction === 'debit' && BROKER_KEYWORDS.some(k => text.includes(k))) {
    return { type: 'BROKER_OUTWARD', category: 'Broker Disbursement', confidence: 0.85 };
  }

  // Self / Internal Transfers
  if (
    text.includes('self transfer') ||
    text.includes('internal transfer') ||
    text.includes('own account') ||
    text.includes('funds transfer') ||
    text.includes('ft to') ||
    text.includes('trsf to')
  ) {
    return { type: 'INTERNAL_TRANSFER', category: 'Internal Transfer', confidence: 0.85 };
  }

  // ATM Cash Withdrawal
  if (direction === 'debit' && ATM_KEYWORDS.some(k => text.includes(k))) {
    return { type: 'ATM_WITHDRAWAL', category: 'Cash Withdrawal', confidence: 0.9 };
  }

  // Utilities & Bills
  if (UTILITY_KEYWORDS.some(k => text.includes(k))) {
    return { type: 'UTILITY_BILL', category: 'Utilities', confidence: 0.85 };
  }

  // Transport & Commute
  if (TRANSPORT_KEYWORDS.some(k => text.includes(k))) {
    return { type: 'TRANSPORT', category: 'Transport', confidence: 0.88 };
  }

  // Food & Dining
  if (FOOD_KEYWORDS.some(k => text.includes(k))) {
    return { type: 'PERSONAL_LIVING_EXPENSE', category: 'Food & Dining', confidence: 0.85 };
  }

  // Subscriptions
  if (SUBSCRIPTION_KEYWORDS.some(k => text.includes(k))) {
    return { type: 'SUBSCRIPTION', category: 'Subscriptions', confidence: 0.9 };
  }

  // Card POS Merchant Spends
  if (direction === 'debit' && CARD_MERCHANT_KEYWORDS.some(k => text.includes(k))) {
    return { type: 'CARD_POS_SPEND', category: 'Point of Sale', confidence: 0.8 };
  }

  // General Income vs Living Expense fallback
  if (direction === 'credit') {
    if (amount >= 500) {
      return { type: 'SALARY_INCOME', category: 'Income', confidence: 0.65 };
    }
    return { type: 'FREELANCE_INCOME', category: 'Other Income', confidence: 0.6 };
  }

  return {
    type: 'PERSONAL_LIVING_EXPENSE',
    category: 'General Spend',
    confidence: 0.5,
  };
}

export function autoClassifyTransactionObject<T extends Partial<FinancialTransaction>>(
  tx: T,
  rules?: ClassificationRule[]
): T & { type: TransactionType; category: string; classifiedBy: 'auto' } {
  const classified = classifyTransaction({
    description: tx.description || '',
    amount: Number(tx.amount || 0),
    direction: tx.direction || 'debit',
    counterparty: tx.counterparty || undefined,
    rules,
  });

  return {
    ...tx,
    type: tx.type && tx.type !== 'UNCATEGORIZED' ? tx.type : classified.type,
    category: tx.category || classified.category,
    classifiedBy: 'auto',
  };
}
