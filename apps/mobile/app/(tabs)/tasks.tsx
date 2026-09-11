import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

export default function TasksScreen() {
  return (
    <ScreenContainer scroll>
      <View style={styles.emptyState}>
        <Text style={styles.title}>Tasks</Text>
        <Text style={styles.description}>Manage your daily to-dos and projects.</Text>
        
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>No tasks yet</Text>
          <Text style={styles.cardDescription}>Create your first task to stay organized.</Text>
          <Button title="Create Task" />
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
