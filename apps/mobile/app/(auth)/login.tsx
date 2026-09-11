import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Link, useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { ScreenContainer } from '../../src/components/ui/ScreenContainer';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { authApi } from '../../src/api/auth';
import { useAuthStore } from '../../src/store/auth';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    try {
      setLoading(true);
      const data = await authApi.login(email, password);
      await SecureStore.setItemAsync('pulse_token', data.token);
      setUser(data.user, data.token);
      router.replace('/(tabs)');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>P</Text>
        </View>
        <Text style={styles.title}>Pulse</Text>
      </View>
      
      <View style={styles.form}>
        <Text style={styles.subtitle}>Welcome back</Text>
        <Input 
          label="Email" 
          placeholder="you@example.com" 
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Input 
          label="Password" 
          placeholder="••••••••" 
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <Button title="Sign In" onPress={handleLogin} isLoading={loading} style={styles.button} />
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <Text style={styles.link}>Sign up</Text>
          </Link>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  logoContainer: {
    width: 48,
    height: 48,
    backgroundColor: colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  logoText: {
    color: '#151B23',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.huge,
    fontWeight: typography.weights.bold as any,
  },
  subtitle: {
    color: colors.text,
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold as any,
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    flex: 1,
    justifyContent: 'center',
  },
  button: {
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: colors.textMuted,
  },
  link: {
    color: colors.primary,
    fontWeight: typography.weights.semibold as any,
  },
});
