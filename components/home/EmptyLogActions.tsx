/**
 * Empty-log state with one-tap starts: copy yesterday's whole day, quick-log
 * a recent food at its last portion, or open Add Food. Turns the dead empty
 * state into the fastest logging surface in the app.
 */

import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CopyPlus, Plus } from 'lucide-react-native';
import { Radius, Spacing, Type } from '../../theme/tokens';
import { formatNumber } from '../../utils/formatNumber';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import PhysiqPressable from '../ui/PhysiqPressable';
import EmptyState from '../ui/EmptyState';
import { FoodEntry } from '../../types';
import { RecentChip, sumCalories } from '../../features/food/repeatLogging';

type Props = {
  yesterdayEntries: FoodEntry[];
  recentChips: RecentChip[];
  onCopyYesterday: () => void;
  onLogChip: (chip: RecentChip) => void;
  onOpenAddFood: () => void;
};

function EmptyLogActions({
  yesterdayEntries,
  recentChips,
  onCopyYesterday,
  onLogChip,
  onOpenAddFood,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hasQuickStarts = yesterdayEntries.length > 0 || recentChips.length > 0;

  return (
    <View>
      <EmptyState
        subtitle={hasQuickStarts ? 'Start in one tap — or press + below.' : 'Tap + to log your first meal.'}
      />
      {yesterdayEntries.length > 0 && (
        <PhysiqPressable
          feedback="confirm"
          style={styles.copyYesterdayBtn}
          onPress={onCopyYesterday}
          accessibilityRole="button"
          accessibilityLabel={`Copy yesterday's ${yesterdayEntries.length} items`}
        >
          <CopyPlus size={16} color={colors.primary} />
          <Text style={styles.copyYesterdayText}>
            Copy yesterday · {yesterdayEntries.length} item{yesterdayEntries.length !== 1 ? 's' : ''} ·{' '}
            {formatNumber(sumCalories(yesterdayEntries))} cal
          </Text>
        </PhysiqPressable>
      )}
      {recentChips.length > 0 && (
        <View style={styles.chipWrap}>
          {recentChips.map((chip) => (
            <PhysiqPressable
              key={chip.food.id}
              feedback="select"
              style={styles.chip}
              onPress={() => onLogChip(chip)}
              accessibilityRole="button"
              accessibilityLabel={`Log ${chip.food.name}, ${chip.calories} calories`}
            >
              <Text style={styles.chipText} numberOfLines={1}>
                {chip.food.name} · {formatNumber(chip.calories)} cal
              </Text>
            </PhysiqPressable>
          ))}
          <PhysiqPressable
            feedback="tap"
            style={[styles.chip, styles.moreChip]}
            onPress={onOpenAddFood}
            accessibilityRole="button"
            accessibilityLabel="Open Add Food"
          >
            <Plus size={12} color={colors.textSecondary} />
            <Text style={styles.moreChipText}>More</Text>
          </PhysiqPressable>
        </View>
      )}
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    copyYesterdayBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: -Spacing.md,
      marginBottom: Spacing.md,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignSelf: 'center',
    },
    copyYesterdayText: {
      ...Type.numeric,
      fontSize: 14,
      lineHeight: 18,
      color: colors.primary,
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      maxWidth: '80%',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: Radius.lg,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    chipText: {
      ...Type.bodySm,
      fontWeight: '600' as const,
      color: colors.text,
    },
    moreChip: {
      backgroundColor: 'transparent',
    },
    moreChipText: {
      ...Type.bodySm,
      fontWeight: '600' as const,
      color: colors.textSecondary,
    },
  });

export default memo(EmptyLogActions);
