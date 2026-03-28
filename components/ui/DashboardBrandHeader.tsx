import React, { useMemo } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Colors from '../../constants/colors';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import { Spacing } from '../../theme/tokens';
import { useIsTablet } from './ResponsiveContainer';
import DashBrandSvg from './DashBrandSvg';

/** On tablets, brand SVG is scaled to 60% of the computed width (~40% smaller). */
const TABLET_BRAND_SCALE = 0.6;

const ASPECT = 26.14 / 506.66;

export type DashboardBrandHeaderProps = {
  /**
   * `default` — tuned for the home tab (no stack header, matches status bar spacing).
   * `belowNav` — tab stacks with a visible navigation bar; avoids negative overlap with the title area.
   */
  variant?: 'default' | 'belowNav';
};

export default function DashboardBrandHeader({ variant = 'default' }: DashboardBrandHeaderProps) {
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = useIsTablet();
  const styles = useMemo(() => createStyles(colors, variant, isTablet), [colors, variant, isTablet]);

  const contentWidth = Math.max(0, screenWidth - 2 * Spacing.lg);
  const baseSvgWidth = contentWidth * 0.7;
  const svgWidth = isTablet ? baseSvgWidth * TABLET_BRAND_SCALE : baseSvgWidth;
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

const createStyles = (colors: AppColors, variant: 'default' | 'belowNav', isTablet: boolean) =>
  StyleSheet.create({
    container: {
      marginTop: variant === 'belowNav' ? 0 : -7,
      marginBottom: variant === 'belowNav' ? Spacing.md : 0,
      paddingBottom: isTablet ? 4 : 6,
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
      marginTop: isTablet ? 4 : 6,
    },
  });
