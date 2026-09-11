import React from 'react';
import { View, TextInput, Text, StyleSheet, TextInputProps } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export const Input = ({ label, error, style, ...props }: InputProps) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          error ? styles.inputError : null,
          style
        ]}
        placeholderTextColor={colors.textMuted}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    color: colors.text,
    fontSize: typography.sizes.sm,
    marginBottom: 8,
    fontWeight: typography.weights.medium as any,
  },
  input: {
    height: 48,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    color: colors.text,
    fontSize: typography.sizes.md,
  },
  inputError: {
    borderColor: colors.expense,
  },
  error: {
    color: colors.expense,
    fontSize: typography.sizes.xs,
    marginTop: 4,
  },
});
