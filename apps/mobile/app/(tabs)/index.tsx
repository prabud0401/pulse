import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/store/auth';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

export default function HomeScreen() {
  const { user } = useAuthStore();

  return (
    <ScreenContainer scroll>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.name}>{user?.name?.split(' ')[0]}</Text>
      </View>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Net Worth</Text>
          <Text style={styles.statValue}>$0.00</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statLabel}>Tasks Due</Text>
          <Text style={styles.statValue}>0</Text>
        </Card>
      </View>

      <Card title="Connect an Integration" description="Link your banks, tools, or apps">
        <Button title="Setup Integration" variant="outline" />
      </Card>

      <Card title="Set up Finance Tracking" description="Create budgets and track expenses">
        <Button title="Go to Finance" variant="outline" />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 24,
  },
  greeting: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
  },
  name: {
    color: colors.text,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as any,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    marginBottom: 0,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    marginBottom: 4,
  },
  statValue: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
  },
});
