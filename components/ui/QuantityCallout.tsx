import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import PhysiqPressable from './PhysiqPressable';
import Colors from '../../constants/colors';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';

export type CalloutReason = 'NEEDS_DENSITY' | 'UNSUPPORTED_SERVING' | 'NEEDS_SERVING_INFO';

interface QuantityCalloutProps {
  reason: CalloutReason;
  onPrimary: () => void;
  onSecondary?: () => void;
}

const CONTENT: Record<
  CalloutReason,
  { title: string; body: string; primary: string; secondary?: string }
> = {
  NEEDS_DENSITY: {
    title: 'Add density to use volume',
    body: 'This food is tracked per 100g. To log it in ml or fl oz, Physiq needs a density (g/ml) to convert volume → grams.',
    primary: 'Add density',
    secondary: 'Switch to grams',
  },
  UNSUPPORTED_SERVING: {
    title: 'Serving size not available',
    body: "This food doesn't include a reliable serving conversion. Switch to grams/ml or add serving details.",
    primary: 'Switch units',
  },
  NEEDS_SERVING_INFO: {
    title: 'Serving info needed',
    body: 'To calculate macros accurately, Physiq needs the serving size details for this item.',
    primary: 'Add serving info',
    secondary: 'Use grams instead',
  },
};

export default function QuantityCallout({ reason, onPrimary, onSecondary }: QuantityCalloutProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const c = CONTENT[reason];
  return (
    <View style={styles.container}>
      <View style={styles.accent} />
      <View style={styles.content}>
        <Text style={styles.title}>{c.title}</Text>
        <Text style={styles.body}>{c.body}</Text>
        <View style={styles.actions}>
          <PhysiqPressable feedback="confirm" style={styles.primaryBtn} onPress={onPrimary}>
            <Text style={styles.primaryText}>{c.primary}</Text>
          </PhysiqPressable>
          {c.secondary && onSecondary && (
            <PhysiqPressable feedback="tap" style={styles.secondaryBtn} onPress={onSecondary}>
              <Text style={styles.secondaryText}>{c.secondary}</Text>
            </PhysiqPressable>
          )}
        </View>
      </View>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
    marginTop: 8,
  },
  accent: {
    width: 4,
    backgroundColor: colors.primary,
  },
  content: {
    flex: 1,
    padding: 12,
    paddingLeft: 14,
  },
  title: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  body: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  primaryText: {
    color: colors.onPrimary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  secondaryBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  secondaryText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
});
