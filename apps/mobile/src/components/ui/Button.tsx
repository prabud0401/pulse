import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  isLoading?: boolean;
}

export const Button = ({ title, variant = 'primary', isLoading, style, ...props }: ButtonProps) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'primary': return styles.primary;
      case 'secondary': return styles.secondary;
      case 'ghost': return styles.ghost;
      case 'outline': return styles.outline;
      default: return styles.primary;
    }
  };

  const getTextStyle = () => {
    switch (variant) {
      case 'primary': return styles.textPrimary;
      case 'secondary': return styles.textSecondary;
      case 'ghost': return styles.textGhost;
      case 'outline': return styles.textOutline;
      default: return styles.textPrimary;
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.base, getVariantStyle(), props.disabled && styles.disabled, style]} 
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.primary} />
      ) : (
        <Text style={[styles.text, getTextStyle()]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceElevated,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: typography.sizes.md,
    fontWeight: typography.weights.semibold as any,
  },
  textPrimary: {
    color: '#151B23', // Dark text on primary button
  },
  textSecondary: {
    color: colors.text,
  },
  textGhost: {
    color: colors.primary,
  },
  textOutline: {
    color: colors.text,
  },
});
