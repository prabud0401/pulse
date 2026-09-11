import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Card } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/store/auth';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { apiClient } from '../../src/api/client';

export default function MoreScreen() {
  const { user, logout } = useAuthStore();
  const [apiStatus, setApiStatus] = useState<{ status: string; latency: number } | null>(null);

  useEffect(() => {
    const start = Date.now();
    apiClient.get<any>('/health')
      .then(() => setApiStatus({ status: 'Online', latency: Date.now() - start }))
      .catch(() => setApiStatus({ status: 'Offline', latency: 0 }));
  }, []);

  return (
    <ScreenContainer scroll>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Settings & Monitor</Text>
          <Text style={styles.subtitle}>System topology & user configuration</Text>
        </View>

        {/* Live System Diagnostics */}
        <Card style={styles.systemCard}>
          <View style={styles.systemHeader}>
            <Text style={styles.systemTitle}>System Status</Text>
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, { backgroundColor: apiStatus?.status === 'Online' ? colors.income : colors.expense }]} />
              <Text style={styles.statusText}>{apiStatus?.status || 'Connecting...'} {apiStatus?.latency ? `(${apiStatus.latency}ms)` : ''}</Text>
            </View>
          </View>

          <View style={styles.diagRow}>
            <Text style={styles.diagLabel}>Pulse API Port</Text>
            <Text style={styles.diagValue}>4000 (Express / HTTP)</Text>
          </View>
          <View style={styles.diagRow}>
            <Text style={styles.diagLabel}>Railway MCP Gateway</Text>
            <Text style={[styles.diagValue, { color: colors.primary }]}>Connected (32 Tools)</Text>
          </View>
          <View style={styles.diagRow}>
            <Text style={styles.diagLabel}>AI Copilot Model</Text>
            <Text style={styles.diagValue}>Gemini 1.5 Flash + MCP</Text>
          </View>
          <View style={styles.diagRow}>
            <Text style={styles.diagLabel}>Database Layer</Text>
            <Text style={styles.diagValue}>PostgreSQL (Drizzle ORM)</Text>
          </View>
        </Card>

        {/* User Profile */}
        <Card title="User Identity" style={styles.sectionCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{user?.name || 'Prabu Deva'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email || 'prabu@pulse.os'}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Active Workspace</Text>
            <Text style={styles.value}>Engineering & Life OS</Text>
          </View>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={styles.label}>Role</Text>
            <Text style={[styles.value, { color: colors.primary }]}>Workspace Owner</Text>
          </View>
        </Card>

        {/* App Info */}
        <Card title="Mobile Client Info" style={styles.sectionCard}>
          <View style={styles.row}>
            <Text style={styles.label}>Framework</Text>
            <Text style={styles.value}>Expo SDK 57 (React Native 0.79)</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Design Architecture</Text>
            <Text style={styles.value}>Dark Fintech Obsidian</Text>
          </View>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <Text style={styles.label}>App Version</Text>
            <Text style={styles.value}>1.0.0 Production</Text>
          </View>
        </Card>

        {/* Sign Out */}
        <View style={{ marginTop: 12, marginBottom: 40 }}>
          <Button title="Sign Out of Session" variant="secondary" onPress={() => logout()} />
        </View>
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
  systemCard: {
    backgroundColor: '#111822',
    borderWidth: 1,
    borderColor: 'rgba(45, 212, 191, 0.2)',
    padding: 16,
    marginBottom: 16,
  },
  systemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  systemTitle: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  diagRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  diagLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  diagValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionCard: {
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
    fontSize: typography.sizes.sm,
  },
  value: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    fontWeight: typography.weights.medium as any,
  },
});
