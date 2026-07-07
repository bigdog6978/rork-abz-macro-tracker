import React, { useMemo } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import Colors from '../../constants/colors';
import { getGreeting, getMotivationHook, ProgressLevel } from '../../utils/greeting';
import { useFadeIn } from '../../utils/motion';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';

interface GreetingHeaderProps {
  firstName?: string | null;
  showHook?: boolean;
  progress?: ProgressLevel;
  statusText?: string;
  variant?: 'default' | 'compact' | 'inline';
}

export default function GreetingHeader({
  firstName,
  showHook = true,
  progress = 'none',
  statusText,
  variant = 'default',
}: GreetingHeaderProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const fadeAnim = useFadeIn();
  const greeting = getGreeting(firstName);
  const hook = getMotivationHook(progress);
  const isCompact = variant === 'compact';

  // Single-line header: greeting + status share one row (dashboard).
  if (variant === 'inline') {
    return (
      <Animated.View style={[styles.inlineRow, { opacity: fadeAnim }]}>
        <Text style={styles.greetingCompactInline} numberOfLines={1}>
          {greeting}
        </Text>
        {statusText ? (
          <Text style={styles.statusInline} numberOfLines={1}>
            {statusText}
          </Text>
        ) : null}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }, isCompact && styles.compact]}>
      <Text style={[styles.greeting, isCompact && styles.greetingCompact]}>{greeting}</Text>
      {showHook && (
        <Text style={styles.hook}>{hook}</Text>
      )}
      {statusText ? (
        <Text style={styles.status}>{statusText}</Text>
      ) : null}
    </Animated.View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    paddingBottom: 2,
  },
  compact: {
    paddingBottom: 2,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  greetingCompact: {
    fontSize: 20,
  },
  hook: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  status: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.primary,
    marginTop: 2,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingBottom: 2,
    flexShrink: 1,
  },
  greetingCompactInline: {
    fontSize: 20,
    fontWeight: '800' as const,
    color: Colors.text,
    flexShrink: 1,
  },
  statusInline: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: colors.primary,
    flexShrink: 0,
  },
});
