import React from 'react';
import { Text, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import { Spacing } from '../../theme/tokens';

/**
 * Left-aligned screen title for tab roots — sits below `DashboardBrandHeader` and above the first card.
 */
export default function TabScreenTitle({ title }: { title: string }) {
  return (
    <Text style={styles.title} accessibilityRole="header">
      {title}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'left',
    alignSelf: 'stretch',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
});
