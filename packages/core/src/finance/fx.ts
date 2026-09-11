import {
  SupportedCurrency,
  NetWorthAccountInput,
  NetWorthResult,
  NetWorthBreakdown,
  CurrencyDistributionItem,
  AccountNetWorthItem,
} from '../types/finance';

export const SUPPORTED_CURRENCIES = [
  'USD',
  'LKR',
  'EUR',
  'GBP',
  'INR',
  'SGD',
  'AED',
  'CAD',
] as const;

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  LKR: 'Rs.',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  SGD: 'S$',
  AED: 'AED ',
  CAD: 'CA$',
};

// Fallback rates relative to 1 USD base
export const FALLBACK_RATES: Record<SupportedCurrency, number> = {
  USD: 1.0,
  LKR: 312.0, // 1 USD = ~312 LKR
  EUR: 0.92, // 1 EUR = ~1.087 USD (1 USD = 0.92 EUR)
  GBP: 0.79, // 1 GBP = ~1.266 USD (1 USD = 0.79 GBP)
  INR: 83.5, // 1 USD = ~83.5 INR
  SGD: 1.35, // 1 USD = ~1.35 SGD
  AED: 3.67, // 1 USD = ~3.67 AED
  CAD: 1.36, // 1 USD = ~1.36 CAD
};

interface CacheStore {
  rates: Record<string, number>;
  lastFetchedAt: number;
}

const memoryCache: CacheStore = {
  rates: { ...FALLBACK_RATES },
  lastFetchedAt: Date.now(),
};

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

/**
 * Returns current exchange rates with fallback multipliers
 */
export function getExchangeRates(): Record<string, number> {
  return { ...memoryCache.rates };
}

/**
 * Update cached exchange rates
 */
export function updateExchangeRates(newRates: Record<string, number>): void {
  memoryCache.rates = { ...memoryCache.rates, ...newRates };
  memoryCache.lastFetchedAt = Date.now();
}

/**
 * Convert any amount from one currency to another using real-time or cached rates
 */
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  customRates?: Record<string, number>
): number {
  if (!amount || isNaN(amount)) return 0;

  const from = (fromCurrency || 'USD').toUpperCase().trim();
  const to = (toCurrency || 'USD').toUpperCase().trim();

  if (from === to) return round2(amount);

  const rates = customRates || memoryCache.rates;
  const fromRate = rates[from] ?? (FALLBACK_RATES as Record<string, number>)[from] ?? 1.0;
  const toRate = rates[to] ?? (FALLBACK_RATES as Record<string, number>)[to] ?? 1.0;

  if (fromRate <= 0) return round2(amount);

  // Amount in USD base, then converted to target
  const inUSD = amount / fromRate;
  const converted = inUSD * toRate;

  return round2(converted);
}

/**
 * Determines whether an account type represents a liability/debt
 */
export function isLiabilityAccount(accountType: string): boolean {
  if (!accountType) return false;
  const norm = accountType.toLowerCase().replace(/[\s_-]/g, '');
  return (
    norm.includes('credit') ||
    norm.includes('loan') ||
    norm.includes('debt') ||
    norm.includes('liability') ||
    norm.includes('mortgage')
  );
}

/**
 * Formats a currency value with its appropriate symbol and standard digit grouping
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  const curr = currency.toUpperCase().trim();
  const symbol = CURRENCY_SYMBOLS[curr] || `${curr} `;
  const formattedNumber = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const sign = amount < 0 ? '-' : '';
  return `${sign}${symbol}${formattedNumber}`;
}

/**
 * Aggregates assets minus liabilities and computes net worth breakdown and currency distribution
 */
export function calculateNetWorth(
  accounts: NetWorthAccountInput[],
  baseCurrency: string = 'USD',
  customRates?: Record<string, number>
): NetWorthResult {
  const targetCurrency = (baseCurrency || 'USD').toUpperCase().trim();

  let totalAssets = 0;
  let totalLiabilities = 0;

  let cash = 0;
  let wallets = 0;
  let investments = 0;
  let liabilities = 0;

  const byType: Record<string, number> = {};
  const currencyTotals: Record<string, { rawAmount: number; convertedAmount: number }> = {};
  const accountItems: AccountNetWorthItem[] = [];

  for (const acc of accounts) {
    const rawVal = typeof acc.balance === 'string' ? parseFloat(acc.balance) : (acc.balance || 0);
    const balance = isNaN(rawVal) ? 0 : rawVal;
    const accCurrency = (acc.currency || 'USD').toUpperCase().trim();
    const isLiability = isLiabilityAccount(acc.accountType);

    // Track original currency
    if (!currencyTotals[accCurrency]) {
      currencyTotals[accCurrency] = { rawAmount: 0, convertedAmount: 0 };
    }

    const converted = convertCurrency(balance, accCurrency, targetCurrency, customRates);

    if (isLiability) {
      const liabilityAmount = Math.abs(balance);
      const convertedLiability = convertCurrency(liabilityAmount, accCurrency, targetCurrency, customRates);

      totalLiabilities += convertedLiability;
      liabilities += convertedLiability;

      const typeKey = acc.accountType || 'credit_card';
      byType[typeKey] = round2((byType[typeKey] || 0) + convertedLiability);

      currencyTotals[accCurrency].rawAmount -= liabilityAmount;
      currencyTotals[accCurrency].convertedAmount -= convertedLiability;

      accountItems.push({
        id: acc.id,
        bankName: acc.bankName || 'Unknown Bank',
        label: acc.label || 'Liability Account',
        accountType: acc.accountType,
        currency: accCurrency,
        originalBalance: -liabilityAmount,
        convertedBalance: -convertedLiability,
        isLiability: true,
      });
    } else {
      const assetAmount = balance;
      const convertedAsset = converted;

      totalAssets += convertedAsset;

      const normType = (acc.accountType || 'savings').toLowerCase().replace(/[\s_-]/g, '');
      if (normType.includes('wallet')) {
        wallets += convertedAsset;
      } else if (normType.includes('invest') || normType.includes('broker') || normType.includes('stock')) {
        investments += convertedAsset;
      } else {
        cash += convertedAsset;
      }

      const typeKey = acc.accountType || 'savings';
      byType[typeKey] = round2((byType[typeKey] || 0) + convertedAsset);

      currencyTotals[accCurrency].rawAmount += assetAmount;
      currencyTotals[accCurrency].convertedAmount += convertedAsset;

      accountItems.push({
        id: acc.id,
        bankName: acc.bankName || 'Unknown Bank',
        label: acc.label || 'Asset Account',
        accountType: acc.accountType,
        currency: accCurrency,
        originalBalance: assetAmount,
        convertedBalance: convertedAsset,
        isLiability: false,
      });
    }
  }

  totalAssets = round2(totalAssets);
  totalLiabilities = round2(totalLiabilities);
  const totalNetWorth = round2(totalAssets - totalLiabilities);

  const positiveHoldingsTotal = Math.max(0.01, totalAssets);
  const currencyDistribution: Record<string, CurrencyDistributionItem> = {};

  for (const [curr, data] of Object.entries(currencyTotals)) {
    const rawAmount = round2(data.rawAmount);
    const convertedAmount = round2(data.convertedAmount);
    const pct = totalAssets > 0
      ? round2((Math.max(0, convertedAmount) / positiveHoldingsTotal) * 100)
      : 0;

    currencyDistribution[curr] = {
      currency: curr,
      rawAmount,
      convertedAmount,
      percentage: Math.min(100, Math.max(0, pct)),
    };
  }

  const breakdown: NetWorthBreakdown = {
    cash: round2(cash),
    wallets: round2(wallets),
    investments: round2(investments),
    liabilities: round2(liabilities),
    byType,
  };

  return {
    baseCurrency: targetCurrency,
    totalNetWorth,
    totalAssets,
    totalLiabilities,
    breakdown,
    currencyDistribution,
    accounts: accountItems,
  };
}
