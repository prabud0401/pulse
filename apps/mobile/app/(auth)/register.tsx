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

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();
  const router = useRouter();

  const handleRegister = async () => {
    try {
      setLoading(true);
      const data = await authApi.register(name, email, password);
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
      <View style={styles.form}>
        <Text style={styles.title}>Create an account</Text>
        <Text style={styles.subtitle}>Start managing your life with Pulse</Text>
        
        <Input 
          label="Name" 
          placeholder="John Doe" 
          value={name}
          onChangeText={setName}
        />
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
        <Button title="Sign Up" onPress={handleRegister} isLoading={loading} style={styles.button} />
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Text style={styles.link}>Sign in</Text>
          </Link>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: typography.sizes.xxl,
    fontWeight: typography.weights.bold as any,
    textAlign: 'center',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: typography.sizes.md,
    marginBottom: 32,
    textAlign: 'center',
    marginTop: 8,
  },
  form: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 60,
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
