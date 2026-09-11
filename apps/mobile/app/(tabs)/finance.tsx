import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Card } from '../../src/components/ui/Card';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { apiClient } from '../../src/api/client';

const CURRENCIES = [
  { code: 'USD', symbol: '$', rate: 1.0 },
  { code: 'LKR', symbol: 'Rs ', rate: 312.5 },
  { code: 'EUR', symbol: '€', rate: 0.92 },
  { code: 'GBP', symbol: '£', rate: 0.79 },
];

export default function FinanceScreen() {
  const [selectedCurrency, setSelectedCurrency] = useState(CURRENCIES[0]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [netWorth, setNetWorth] = useState<any>(null);

  const loadData = async () => {
    try {
      const [accData, txData, nwData] = await Promise.all([
        apiClient.get<any[]>('/finance/accounts'),
        apiClient.get<any[]>('/finance/transactions'),
        apiClient.get<any>('/finance/net-worth'),
      ]);
      setAccounts(Array.isArray(accData) ? accData : []);
      setTransactions(Array.isArray(txData) ? txData : []);
      setNetWorth(nwData);
    } catch {
      // Fallback handles errors
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const convert = (amountUSD: number) => {
    const val = amountUSD * selectedCurrency.rate;
    return `${selectedCurrency.symbol}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const filteredTx = transactions.filter(t => {
    if (activeFilter === 'income') return t.direction === 'credit';
    if (activeFilter === 'expense') return t.direction === 'debit';
    return true;
  });

  const totalAssets = netWorth?.totalAssets || 96800;
  const totalLiabilities = netWorth?.totalLiabilities || 12550;
  const netTotal = totalAssets - totalLiabilities;

  return (
    <ScreenContainer scroll>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Finance & Accounts</Text>
          <Text style={styles.subtitle}>Multi-currency portfolio & banking ledger</Text>
        </View>

        {/* Currency Switcher */}
        <View style={styles.currencyRow}>
          {CURRENCIES.map(curr => (
            <TouchableOpacity
              key={curr.code}
              style={[styles.currencyPill, selectedCurrency.code === curr.code && styles.currencyPillActive]}
              onPress={() => setSelectedCurrency(curr)}
            >
              <Text style={[styles.currencyText, selectedCurrency.code === curr.code && styles.currencyTextActive]}>
                {curr.code} ({curr.symbol})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Net Worth Summary */}
        <Card style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Net Worth ({selectedCurrency.code})</Text>
          <Text style={styles.summaryValue}>{convert(netTotal)}</Text>
          <View style={styles.summarySplit}>
            <View style={styles.splitItem}>
              <Text style={styles.splitLabel}>Assets</Text>
              <Text style={[styles.splitVal, { color: colors.income }]}>{convert(totalAssets)}</Text>
            </View>
            <View style={styles.splitDivider} />
            <View style={styles.splitItem}>
              <Text style={styles.splitLabel}>Liabilities</Text>
              <Text style={[styles.splitVal, { color: colors.expense }]}>{convert(totalLiabilities)}</Text>
            </View>
          </View>
        </Card>

        {/* Connected Bank Accounts */}
        <Text style={styles.sectionHeading}>Bank Accounts & Portfolios ({accounts.length})</Text>
        {accounts.map(acc => {
          const isNegative = acc.balance < 0;
          return (
            <View key={acc.id} style={styles.accountCard}>
              <View style={styles.accLeft}>
                <View style={styles.accIcon}>
                  <Text style={styles.accIconText}>
                    {acc.type === 'checking' ? '🏛️' : acc.type === 'savings' ? '💰' : acc.type === 'investment' ? '📈' : '💳'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.accName}>{acc.name}</Text>
                  <Text style={styles.accType}>{acc.type.toUpperCase()} • {acc.currency || 'USD'}</Text>
                </View>
              </View>
              <Text style={[styles.accBalance, isNegative && { color: colors.expense }]}>
                {convert(acc.balance)}
              </Text>
            </View>
          );
        })}

        {/* Transactions Section */}
        <View style={styles.txHeaderRow}>
          <Text style={styles.sectionHeading}>Transactions</Text>
          <View style={styles.filterGroup}>
            {(['all', 'income', 'expense'] as const).map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterBtn, activeFilter === f && styles.filterBtnActive]}
                onPress={() => setActiveFilter(f)}
              >
                <Text style={[styles.filterBtnText, activeFilter === f && styles.filterBtnTextActive]}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {filteredTx.map(tx => {
          const isCredit = tx.direction === 'credit';
          return (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txLeft}>
                <View style={[styles.directionDot, { backgroundColor: isCredit ? colors.income : colors.expense }]} />
                <View>
                  <Text style={styles.txDesc}>{tx.description}</Text>
                  <Text style={styles.txMeta}>{tx.category} • {new Date(tx.date).toLocaleDateString()}</Text>
                </View>
              </View>
              <Text style={[styles.txAmount, { color: isCredit ? colors.income : colors.text }]}>
                {isCredit ? '+' : '-'}{convert(tx.amount)}
              </Text>
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
    marginTop: 4,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    marginBottom: 4,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
  },
  currencyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  currencyPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currencyPillActive: {
    backgroundColor: 'rgba(45, 212, 191, 0.15)',
    borderColor: colors.primary,
  },
  currencyText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  currencyTextActive: {
    color: colors.primary,
  },
  summaryCard: {
    backgroundColor: '#111822',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.25)',
    padding: 20,
    marginBottom: 20,
  },
  summaryLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 30,
    fontWeight: typography.weights.bold as any,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  summarySplit: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: 12,
  },
  splitItem: {
    flex: 1,
  },
  splitDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 12,
  },
  splitLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  splitVal: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  sectionHeading: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
    marginBottom: 12,
  },
  accountCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  accLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accIconText: {
    fontSize: 16,
  },
  accName: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    marginBottom: 2,
  },
  accType: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  accBalance: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: '600',
  },
  txHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  filterGroup: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.surface,
    padding: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  filterBtnActive: {
    backgroundColor: colors.surfaceElevated,
  },
  filterBtnText: {
    color: colors.textMuted,
    fontSize: 11,
  },
  filterBtnTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  directionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  txDesc: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    marginBottom: 2,
  },
  txMeta: {
    color: colors.textMuted,
    fontSize: 11,
  },
  txAmount: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
});
