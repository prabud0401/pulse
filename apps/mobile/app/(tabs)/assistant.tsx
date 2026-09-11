import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

export default function AssistantScreen() {
  return (
    <ScreenContainer scroll>
      <View style={styles.emptyState}>
        <Text style={styles.title}>AI Assistant</Text>
        <Text style={styles.description}>Your personal financial and task management assistant.</Text>
        
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Set up your AI</Text>
          <Text style={styles.cardDescription}>Configure your API keys to enable the AI assistant.</Text>
          <Button title="Configure AI" />
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
