import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/store/auth';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

export default function MoreScreen() {
  const { user, logout } = useAuthStore();

  return (
    <ScreenContainer scroll>
      <Text style={styles.title}>Settings</Text>
      
      <Card title="Profile">
        <View style={styles.row}>
          <Text style={styles.label}>Name</Text>
          <Text style={styles.value}>{user?.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email}</Text>
        </View>
      </Card>

      <Card title="App Info">
        <View style={styles.row}>
          <Text style={styles.label}>Version</Text>
          <Text style={styles.value}>1.0.0</Text>
        </View>
      </Card>

      <Card>
        <Button title="Sign Out" variant="secondary" onPress={() => logout()} />
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold as any,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
  },
  value: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.medium as any,
  },
});
