import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { colors } from '../../theme/colors';

interface ScreenContainerProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
}

export const ScreenContainer = ({ children, scroll = true, style }: ScreenContainerProps) => {
  const Container = scroll ? ScrollView : SafeAreaView;
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <Container 
        style={[styles.container, style]}
        contentContainerStyle={scroll ? styles.scrollContent : undefined}
      >
        {children}
      </Container>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollContent: {
    padding: 16,
    flexGrow: 1,
  },
});
