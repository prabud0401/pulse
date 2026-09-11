import React from 'react';
import { View, Text, StyleSheet, ViewProps } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

interface CardProps extends ViewProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
}

export const Card = ({ title, description, children, style, ...props }: CardProps) => {
  return (
    <View style={[styles.card, style]} {...props}>
      {(title || description) && (
        <View style={styles.header}>
          {title && <Text style={styles.title}>{title}</Text>}
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
      )}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 16,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold as any,
  },
  description: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    marginTop: 4,
  },
  content: {
    padding: 16,
  },
});
