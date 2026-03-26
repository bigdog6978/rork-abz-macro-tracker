import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Colors from '../../constants/colors';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import { Spacing } from '../../theme/tokens';
import DashBrandSvg from './DashBrandSvg';

const ASPECT = 26.14 / 506.66;

export default function DashboardBrandHeader() {
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const contentWidth = Math.max(0, screenWidth - 2 * Spacing.lg);
  const svgWidth = contentWidth * 0.7;
  const svgHeight = svgWidth * ASPECT;

  return (
    <View style={styles.container}>
      <View style={styles.brandRow}>
        <DashBrandSvg width={svgWidth} height={svgHeight} color={colors.primary} />
      </View>
      <View style={styles.divider} />
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      marginTop: -7,
      paddingBottom: 6,
      backgroundColor: 'transparent',
    },
    brandRow: {
      alignSelf: 'stretch',
      alignItems: 'flex-start',
    },
    divider: {
      height: 1,
      backgroundColor: Colors.textTertiary,
      opacity: 0.16,
      marginTop: 6,
    },
  });
