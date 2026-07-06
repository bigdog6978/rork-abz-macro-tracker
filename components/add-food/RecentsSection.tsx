/**
 * Recent + Saved Foods lists shown when the Add Food search is empty.
 * Extracted verbatim from app/add-food.tsx and memoized.
 */

import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Clock, Scan } from 'lucide-react-native';
import Colors from '../../constants/colors';
import { formatNumber } from '../../utils/formatNumber';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import PhysiqPressable from '../ui/PhysiqPressable';
import type { NormalizedFood } from '../../features/food/types';

export type RecentFoodItem = { food: NormalizedFood; lastServingGrams: number };

type Props = {
  recentFoods: RecentFoodItem[];
  savedFoods: NormalizedFood[];
  onSelectRecent: (food: NormalizedFood, lastGrams: number) => void;
  onSelectSaved: (food: NormalizedFood) => void;
};

function RecentsSection({ recentFoods, savedFoods, onSelectRecent, onSelectSaved }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.recentsSection}>
      {recentFoods.length > 0 && (
        <>
          <View style={styles.recentHeader}>
            <Clock size={14} color={Colors.textSecondary} />
            <Text style={styles.recentTitle}>Recent</Text>
          </View>
          {recentFoods.slice(0, 10).map((item) => (
            <PhysiqPressable
              key={item.food.id}
              feedback="select"
              style={styles.recentCard}
              onPress={() => onSelectRecent(item.food, item.lastServingGrams)}
            >
              <View style={styles.recentInfo}>
                <Text style={styles.recentName} numberOfLines={1}>
                  {item.food.name}
                </Text>
                <Text style={styles.recentMeta}>
                  {item.lastServingGrams}g ·{' '}
                  {formatNumber(
                    (item.food.per100g.calories * item.lastServingGrams) /
                      100
                  )}{' '}
                  cal
                </Text>
              </View>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </PhysiqPressable>
          ))}
        </>
      )}
      {savedFoods.length > 0 && (
        <>
          <View style={[styles.recentHeader, { marginTop: recentFoods.length > 0 ? 20 : 0 }]}>
            <Scan size={14} color={Colors.textSecondary} />
            <Text style={styles.recentTitle}>Saved Foods</Text>
          </View>
          {savedFoods.slice(0, 10).map((food) => (
            <PhysiqPressable
              key={food.id}
              feedback="select"
              style={styles.recentCard}
              onPress={() => onSelectSaved(food)}
            >
              <View style={styles.recentInfo}>
                <Text style={styles.recentName} numberOfLines={1}>
                  {food.name}
                </Text>
                <Text style={styles.recentMeta}>
                  {formatNumber(food.per100g.calories)} cal ·{' '}
                  {formatNumber(food.per100g.protein_g)}p ·{' '}
                  {formatNumber(food.per100g.carbs_g)}c ·{' '}
                  {formatNumber(food.per100g.fat_g)}f per 100g
                </Text>
              </View>
              <ChevronRight size={16} color={Colors.textTertiary} />
            </PhysiqPressable>
          ))}
        </>
      )}
    </View>
  );
}

const createStyles = (_colors: AppColors) => StyleSheet.create({
  recentsSection: {
    marginTop: 12,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  recentTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  recentMeta: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 2,
  },
});

export default memo(RecentsSection);
