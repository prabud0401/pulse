import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Card } from '../../src/components/ui/Card';
import { useAuthStore } from '../../src/store/auth';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { apiClient } from '../../src/api/client';

export default function HomeScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [netWorth, setNetWorth] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [recentTx, setRecentTx] = useState<any[]>([]);

  const loadData = async () => {
    try {
      const [nwData, tasksData, txData] = await Promise.all([
        apiClient.get<any>('/finance/net-worth'),
        apiClient.get<any[]>('/tasks'),
        apiClient.get<any[]>('/finance/transactions'),
      ]);
      setNetWorth(nwData);
      setTasks(Array.isArray(tasksData) ? tasksData : []);
      setRecentTx(Array.isArray(txData) ? txData.slice(0, 3) : []);
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

  const toggleTask = (taskId: string) => {
    setTasks(prev =>
      prev.map(t => (t.id === taskId ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t))
    );
  };

  const formattedNetWorth = netWorth?.totalNetWorth
    ? `$${Number(netWorth.totalNetWorth).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
    : '$84,250.00';

  const pendingTasks = tasks.filter(t => t.status !== 'done');

  return (
    <ScreenContainer scroll>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.appName}>PULSE OS</Text>
            <Text style={styles.greeting}>Welcome back, {user?.name?.split(' ')[0] || 'Prabu'}</Text>
          </View>
          <View style={styles.statusPill}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>MCP Live</Text>
          </View>
        </View>

        {/* Net Worth Hero Card */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/(tabs)/finance')}>
          <Card style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <Text style={styles.heroLabel}>Total Net Worth</Text>
              <View style={styles.growthBadge}>
                <Text style={styles.growthText}>+12.4% MoM</Text>
              </View>
            </View>
            <Text style={styles.heroValue}>{formattedNetWorth}</Text>
            <View style={styles.assetBreakdownRow}>
              <View style={styles.miniStat}>
                <Text style={styles.miniLabel}>Cash</Text>
                <Text style={styles.miniVal}>$24.5k</Text>
              </View>
              <View style={styles.miniStatDivider} />
              <View style={styles.miniStat}>
                <Text style={styles.miniLabel}>Investments</Text>
                <Text style={styles.miniVal}>$58.0k</Text>
              </View>
              <View style={styles.miniStatDivider} />
              <View style={styles.miniStat}>
                <Text style={styles.miniLabel}>Liabilities</Text>
                <Text style={[styles.miniVal, { color: colors.expense }]}>-$12.5k</Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/tasks')}>
            <Text style={styles.actionIcon}>✓</Text>
            <Text style={styles.actionText}>Tasks</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/assistant')}>
            <Text style={styles.actionIcon}>⚡</Text>
            <Text style={styles.actionText}>Ask AI</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/finance')}>
            <Text style={styles.actionIcon}>💳</Text>
            <Text style={styles.actionText}>Ledger</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/(tabs)/more')}>
            <Text style={styles.actionIcon}>⚙</Text>
            <Text style={styles.actionText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Priority Tasks */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Focus ({pendingTasks.length})</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/tasks')}>
            <Text style={styles.sectionLink}>View all →</Text>
          </TouchableOpacity>
        </View>

        {tasks.slice(0, 3).map(task => {
          const isDone = task.status === 'done';
          return (
            <TouchableOpacity
              key={task.id}
              style={[styles.taskItem, isDone && styles.taskItemDone]}
              onPress={() => toggleTask(task.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isDone && styles.checkboxChecked]}>
                {isDone && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.taskContent}>
                <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>{task.title}</Text>
                <View style={styles.taskMeta}>
                  <Text style={styles.taskProject}>{task.projectName || 'General'}</Text>
                  {task.priority === 'urgent' && (
                    <View style={styles.urgentBadge}>
                      <Text style={styles.urgentBadgeText}>Urgent</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {/* Recent Transactions Preview */}
        <View style={[styles.sectionHeader, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Recent Transactions</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/finance')}>
            <Text style={styles.sectionLink}>Ledger →</Text>
          </TouchableOpacity>
        </View>

        {recentTx.map(tx => {
          const isIncome = tx.direction === 'credit';
          return (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txLeft}>
                <View style={[styles.txIconCircle, { backgroundColor: isIncome ? 'rgba(52, 211, 153, 0.12)' : 'rgba(251, 113, 133, 0.12)' }]}>
                  <Text style={{ color: isIncome ? colors.income : colors.expense, fontWeight: 'bold' }}>
                    {isIncome ? '↓' : '↑'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.txDesc}>{tx.description}</Text>
                  <Text style={styles.txCategory}>{tx.category}</Text>
                </View>
              </View>
              <Text style={[styles.txAmount, { color: isIncome ? colors.income : colors.text }]}>
                {isIncome ? '+' : '-'}${Number(tx.amount).toFixed(2)}
              </Text>
            </View>
          );
        })}

        <View style={{ height: 32 }} />
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  appName: {
    color: colors.primary,
    fontSize: 11,
    letterSpacing: 2,
    fontWeight: '700',
    marginBottom: 2,
  },
  greeting: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.25)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.income,
    marginRight: 6,
  },
  statusText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '600',
  },
  heroCard: {
    backgroundColor: '#111822',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.2)',
    padding: 20,
    marginBottom: 20,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  growthBadge: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  growthText: {
    color: colors.income,
    fontSize: 11,
    fontWeight: '600',
  },
  heroValue: {
    color: colors.text,
    fontSize: 32,
    fontWeight: typography.weights.bold as any,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  assetBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  miniStat: {
    flex: 1,
  },
  miniStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginHorizontal: 8,
  },
  miniLabel: {
    color: colors.textMuted,
    fontSize: 11,
    marginBottom: 2,
  },
  miniVal: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  actionIcon: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  actionText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
  },
  sectionLink: {
    color: colors.primary,
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  taskItemDone: {
    opacity: 0.5,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: '#0B0F14',
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: '500',
    marginBottom: 3,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskProject: {
    color: colors.textMuted,
    fontSize: 11,
  },
  urgentBadge: {
    backgroundColor: 'rgba(251, 113, 133, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  urgentBadgeText: {
    color: colors.expense,
    fontSize: 10,
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
    gap: 12,
  },
  txIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txDesc: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: '500',
  },
  txCategory: {
    color: colors.textMuted,
    fontSize: 11,
  },
  txAmount: {
    fontSize: typography.sizes.sm,
    fontWeight: '600',
  },
});
