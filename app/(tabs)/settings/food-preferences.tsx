import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Colors from '../../../constants/colors';
import { FOODS } from '../../../constants/foodDatabase';
import { Radius, Spacing } from '../../../theme/tokens';
import {
  getDislikedFoods,
  addDislikedFood,
  removeDislikedFood,
} from '../../../storage/dislikedFoodsRepo';
import { useThemeColors, type AppColors } from '../../../providers/ThemeProvider';

const PROTEIN_FOOD_IDS = [
  'bacon', 'beef_jerky', 'beef_liver', 'chicken_breast', 'cod', 'cottage_cheese',
  'eggs', 'ground_beef_80', 'ground_beef_90', 'greek_yogurt', 'hard_boiled_eggs',
  'lamb_chop', 'lentils', 'pork_loin', 'pork_rinds', 'ribeye', 'salmon', 'sea_bass',
  'shrimp', 'tempeh', 'tofu', 'tuna_canned', 'turkey_breast', 'whey_protein', 'plant_protein',
].sort((a, b) => FOODS[a].name.localeCompare(FOODS[b].name));

const CARB_FOOD_IDS = [
  'apple', 'banana', 'berries', 'brown_rice', 'corn_tortilla', 'couscous',
  'dates', 'oats_dry', 'pita', 'potato', 'quinoa', 'rice_cake',
  'sweet_potato', 'tabbouleh', 'tortilla', 'white_rice', 'ww_bread', 'ww_pasta',
].sort((a, b) => FOODS[a].name.localeCompare(FOODS[b].name));

const VEGGIE_FOOD_IDS = [
  'asparagus', 'bell_pepper', 'broccoli', 'cauliflower', 'cucumber',
  'green_beans', 'mixed_greens', 'roasted_veggies', 'sauerkraut',
  'spinach_cooked', 'tomato', 'zucchini',
].sort((a, b) => FOODS[a].name.localeCompare(FOODS[b].name));

export default function FoodPreferencesScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const queryClient = useQueryClient();

  const { data: dislikedFoods = [] } = useQuery({
    queryKey: ['disliked_foods'],
    queryFn: getDislikedFoods,
  });

  const dislikedIds = useMemo(
    () => new Set(dislikedFoods.map((f) => f.foodId)),
    [dislikedFoods]
  );

  const handleToggle = async (foodId: string) => {
    if (Platform.OS !== 'web') Haptics.selectionAsync();
    if (dislikedIds.has(foodId)) {
      await removeDislikedFood(foodId);
    } else {
      await addDislikedFood(foodId, FOODS[foodId].name);
    }
    queryClient.invalidateQueries({ queryKey: ['disliked_foods'] });
  };

  const renderSection = (title: string, foodIds: string[]) => (
    <View style={styles.card} key={title}>
      <Text style={styles.sectionLabel}>{title}</Text>
      <View style={styles.grid}>
        {foodIds.map((foodId) => {
          const food = FOODS[foodId];
          const active = dislikedIds.has(foodId);
          return (
            <TouchableOpacity
              key={foodId}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => handleToggle(foodId)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {food.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.intro}>
        Tap any foods you'd rather avoid. They'll be left out of your meal plan and swap suggestions.
      </Text>

      {renderSection('Proteins', PROTEIN_FOOD_IDS)}
      {renderSection('Carbs & Fruits', CARB_FOOD_IDS)}
      {renderSection('Vegetables', VEGGIE_FOOD_IDS)}

      {dislikedFoods.length > 0 && (
        <Text style={styles.note}>
          {dislikedFoods.length} food{dislikedFoods.length !== 1 ? 's' : ''} excluded from your plan.
        </Text>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: Spacing.lg,
  },
  intro: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    gap: 12,
  },
  sectionLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    width: '47%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
  },
  chipActive: {
    borderColor: '#ef4444',
    backgroundColor: '#fef2f2',
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  chipTextActive: {
    color: '#ef4444',
    fontWeight: '700' as const,
  },
  note: {
    color: Colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
