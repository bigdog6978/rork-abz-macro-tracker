import React, { useMemo } from 'react';
import { Text, StyleSheet } from 'react-native';
import { Spacing, Type } from '../../theme/tokens';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';

/**
 * Left-aligned screen title for tab roots — sits below `DashboardBrandHeader` and above the first card.
 */
export default function TabScreenTitle({ title }: { title: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Text style={styles.title} accessibilityRole="header">
      {title}
    </Text>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  title: {
    ...Type.title,
    fontSize: 22,
    lineHeight: 28,
    color: colors.text,
    textAlign: 'left',
    alignSelf: 'stretch',
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
});
