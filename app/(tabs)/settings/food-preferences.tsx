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
  'bacon', 'beef_jerky', 'beef_liver', 'black_beans', 'bone_broth',
  'chicken_breast', 'chickpeas', 'cod', 'cottage_cheese', 'edamame',
  'eggs', 'greek_yogurt', 'ground_beef_80', 'ground_beef_90',
  'hard_boiled_eggs', 'lamb_chop', 'lentils', 'plant_protein',
  'pork_loin', 'pork_rinds', 'ribeye', 'salmon', 'sea_bass',
  'shrimp', 'tempeh', 'tofu', 'tuna_canned', 'turkey_breast',
  'whey_protein',
].sort((a, b) => FOODS[a].name.localeCompare(FOODS[b].name));

const CARB_FOOD_IDS = [
  'apple', 'asparagus', 'banana', 'bell_pepper', 'berries',
  'broccoli', 'brown_rice', 'cauliflower', 'corn_tortilla',
  'couscous', 'cucumber', 'dates', 'green_beans', 'mixed_greens',
  'oats_dry', 'pita', 'potato', 'quinoa', 'rice_cake',
  'roasted_veggies', 'sauerkraut', 'spinach_cooked', 'sweet_potato',
  'tabbouleh', 'tomato', 'tortilla', 'white_rice', 'ww_bread',
  'ww_pasta', 'zucchini',
].sort((a, b) => FOODS[a].name.localeCompare(FOODS[b].name));

const FAT_FOOD_IDS = [
  'almond_butter', 'almonds', 'avocado', 'butter', 'cheddar',
  'coconut_oil', 'cream_cheese', 'dark_chocolate', 'feta',
  'hummus', 'macadamia', 'mixed_nuts', 'mozzarella', 'olive_oil',
  'olives', 'peanut_butter', 'string_cheese', 'tahini',
  'trail_mix', 'walnuts',
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
      {renderSection('Carbohydrates', CARB_FOOD_IDS)}
      {renderSection('Fats', FAT_FOOD_IDS)}

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
    color: colors.primary,
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
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '700' as const,
  },
  note: {
    color: Colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
});
