/**
 * Grouped daily log: Breakfast / Lunch / Dinner / Snacks sections with
 * per-meal subtotals. Entry cards keep the existing edit/delete
 * interactions. Memoized so unrelated dashboard state doesn't re-render
 * the list.
 */

import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Trash2 } from 'lucide-react-native';
import Colors from '../../constants/colors';
import { Radius, Spacing } from '../../theme/tokens';
import { formatNumber } from '../../utils/formatNumber';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import PhysiqPressable from '../ui/PhysiqPressable';
import PremiumCard from '../ui/PremiumCard';
import { FoodEntry, MEAL_TYPE_LABELS, MealType } from '../../types';
import { groupEntriesByMeal } from '../../features/food/mealType';

type Props = {
  title?: string;
  entries: FoodEntry[];
  onEditEntry: (id: string) => void;
  onRemoveEntry: (id: string) => void;
  /** Optional per-meal header action (e.g. "copy yesterday's breakfast"). */
  renderMealAction?: (mealType: MealType) => React.ReactNode;
};

function TodayLogSection({ title = "Today's Log", entries, onEditEntry, onRemoveEntry, renderMealAction }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const sections = useMemo(() => groupEntriesByMeal(entries), [entries]);

  return (
    <View style={styles.entriesSection}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {sections.map((section) => (
        <View key={section.mealType} style={styles.mealSection}>
          <View style={styles.mealHeader}>
            <Text style={styles.mealTitle}>{MEAL_TYPE_LABELS[section.mealType]}</Text>
            <Text style={styles.mealTotals}>
              {formatNumber(section.totals.calories)} cal · {formatNumber(section.totals.protein_g)}p ·{' '}
              {formatNumber(section.totals.carbs_g)}c · {formatNumber(section.totals.fat_g)}f
            </Text>
          </View>
          {renderMealAction?.(section.mealType)}
          {section.entries.map((entry) => (
            <PremiumCard key={entry.id} style={styles.entryCard}>
              <PhysiqPressable
                feedback="tap"
                style={styles.entryTapArea}
                onPress={() => onEditEntry(entry.id)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${entry.name}, ${formatNumber(entry.calories)} calories`}
                accessibilityHint="Opens this log entry for editing"
              >
                <View style={styles.entryInfo}>
                  <Text style={styles.entryName}>{entry.name}</Text>
                  <Text style={styles.entryMacros}>
                    {formatNumber(entry.calories)} cal · {formatNumber(entry.protein_g)}p ·{' '}
                    {formatNumber(entry.carbs_g)}c · {formatNumber(entry.fat_g)}f
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textTertiary} style={styles.entryChevron} />
              </PhysiqPressable>
              <PhysiqPressable
                feedback="destructive"
                style={styles.entryDelete}
                onPress={() => onRemoveEntry(entry.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${entry.name}`}
              >
                <Trash2 size={16} color={colors.textTertiary} />
              </PhysiqPressable>
            </PremiumCard>
          ))}
        </View>
      ))}
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    entriesSection: {
      marginTop: Spacing.xxl,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '700' as const,
      marginBottom: Spacing.md,
    },
    mealSection: {
      marginBottom: Spacing.md,
    },
    mealHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: 8,
      marginBottom: 6,
      paddingHorizontal: 2,
    },
    mealTitle: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700' as const,
      textTransform: 'uppercase' as const,
      letterSpacing: 0.5,
    },
    mealTotals: {
      color: Colors.textTertiary,
      fontSize: 12,
      fontWeight: '500' as const,
      flexShrink: 1,
    },
    entryCard: {
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.sm,
      borderRadius: Radius.md,
    },
    entryTapArea: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    entryInfo: {
      flex: 1,
    },
    entryChevron: {
      marginLeft: 8,
    },
    entryName: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600' as const,
    },
    entryMacros: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: 3,
      fontWeight: '500' as const,
    },
    entryDelete: {
      padding: 8,
    },
  });

export default memo(TodayLogSection);
