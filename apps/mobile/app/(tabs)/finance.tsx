import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

export default function FinanceScreen() {
  return (
    <ScreenContainer scroll>
      <View style={styles.emptyState}>
        <Text style={styles.title}>Finance</Text>
        <Text style={styles.description}>Track your net worth, expenses, and budgets all in one place.</Text>
        
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>No accounts connected</Text>
          <Text style={styles.cardDescription}>Connect your first bank account to get started.</Text>
          <Button title="Connect Bank" />
        </Card>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    marginBottom: 8,
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
    marginBottom: 24,
  },
  card: {
    alignItems: 'center',
    padding: 24,
  },
  cardTitle: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold as any,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardDescription: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
});
