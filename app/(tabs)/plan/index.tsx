import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Animated,
  Platform,
  Pressable,
  TextInput,
  Alert,
  useWindowDimensions,
} from 'react-native';
import PhysiqPressable from '../../../components/ui/PhysiqPressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sunrise, Sun, Moon, Cookie, ArrowLeftRight, X, Check, Save, Bookmark, ShoppingCart, Copy, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { playFeedback } from '../../../utils/interactionFeedback';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Colors from '../../../constants/colors';
import { Radius, Spacing, Shadows } from '../../../theme/tokens';
import { formatNumber } from '../../../utils/formatNumber';
import { useUser } from '../../../providers/UserProvider';
import { useDailyLog } from '../../../providers/DailyLogProvider';
import { getMealPlanForEatingStyle, getWeekPlanForEatingStyle } from '../../../mocks/mealTemplates';
import { normalizeMacroTargetsForPlanning } from '../../../utils/mealPlanGenerator';
import { getAllergies } from '../../../storage/allergiesRepo';
import { getDislikedFoods } from '../../../storage/dislikedFoodsRepo';
import {
  EATING_STYLE_LABELS,
  DIETARY_MODIFIER_LABELS,
  MealSlot,
  MealSuggestion,
  MacroTargets,
  DietaryModifier,
  DayPlan,
  SavedMealPlan,
  FoodEntry,
  getWeekDayLabel,
} from '../../../types';
import { getMealsForDay } from '../../../utils/weekPlanHelpers';

function computePlanTotals(meals: MealSlot[]): MacroTargets {
  let calories = 0;
  let protein_g = 0;
  let carbs_g = 0;
  let fat_g = 0;
  for (const meal of meals) {
    for (const s of meal.suggestions ?? []) {
      calories += s.calories ?? 0;
      protein_g += s.protein_g ?? 0;
      carbs_g += s.carbs_g ?? 0;
      fat_g += s.fat_g ?? 0;
    }
  }
  return { calories, protein_g, carbs_g, fat_g };
}

function areMacroTargetsEqual(a: MacroTargets | undefined, b: MacroTargets | undefined): boolean {
  if (!a || !b) return false;
  return (
    a.calories === b.calories &&
    a.protein_g === b.protein_g &&
    a.carbs_g === b.carbs_g &&
    a.fat_g === b.fat_g
  );
}

function areStringListsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

function buildGeneratedPlanKey(input: {
  goal: string;
  activityLevel: string;
  eatingStyle: string;
  measurementSystem: string;
  modifiers: string[];
  allergies: string[];
  macros: MacroTargets;
  generationSeed: number;
}): string {
  return [
    'generated',
    input.goal,
    input.activityLevel,
    input.eatingStyle,
    input.measurementSystem,
    [...input.modifiers].sort().join(','),
    [...input.allergies].sort().join(','),
    input.macros.calories,
    input.macros.protein_g,
    input.macros.carbs_g,
    input.macros.fat_g,
    input.generationSeed,
  ].join('|');
}
import { getSubstitutes, applySubstitution } from '../../../utils/substitutions/substituteEngine';
import { SubstituteResult } from '../../../utils/substitutions/types';
import { mealNameToType } from '../../../constants/mealSwapCatalog';
import {
  getAllSavedMealPlans,
  saveMealPlan,
  getActiveMealPlan,
  setActiveMealPlan,
  clearActivePlan,
  saveMealTemplate,
} from '../../../storage/mealPlanRepo';
import { generateGroceryListFromDays, formatGroceryListAsText } from '../../../utils/grocery/groceryListEngine';
import type { GroceryDayMeals } from '../../../utils/grocery/groceryListEngine';
import { loadChecklist, saveChecklist } from '../../../storage/groceryRepo';
import { GroceryList, GroceryChecklist, GroceryCategoryGroup } from '../../../utils/grocery/types';
import { loadData, saveData, STORAGE_KEYS } from '../../../services/storage';
import { getQuantityInfo, scaleMacros, formatQuantityDisplay } from '../../../utils/quantityUtils';
import EditQuantitySheet from '../../../components/ui/EditQuantitySheet';
import DashboardBrandHeader from '../../../components/ui/DashboardBrandHeader';
import TabScreenTitle from '../../../components/ui/TabScreenTitle';
import PlanPreferencesGate from '../../../components/plan/PlanPreferencesGate';
import PsmfDurationBanner from '../../../components/ui/PsmfDurationBanner';
import ResponsiveContainer from '../../../components/ui/ResponsiveContainer';
import MealPlanMethodologyCard from '../../../components/ui/MealPlanMethodologyCard';
import { useThemeColors, type AppColors } from '../../../providers/ThemeProvider';

const SHEET_HEIGHT = 420;

function getMealIcon(icon: string, colors: AppColors): React.ReactNode {
  if (icon === 'sunrise') return <Sunrise size={18} color={colors.primary} />;
  if (icon === 'sun') return <Sun size={18} color={Colors.warning} />;
  if (icon === 'moon') return <Moon size={18} color={Colors.carbs} />;
  return <Cookie size={18} color={Colors.fat} />;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function FoodItemRow({
  food,
  mealName,
  isLogged,
  onLogPress,
  onSwapPress,
  onEditQuantityPress,
}: {
  food: MealSuggestion;
  mealName: string;
  isLogged: boolean;
  onLogPress: () => void;
  onSwapPress: () => void;
  onEditQuantityPress?: () => void;
}) {
  const colors = useThemeColors();

  return (
    <View style={styles.suggestionRow}>
      <View style={styles.suggestionDot}>
        {food.isSwapped && (
          <View style={styles.swappedIndicator} />
        )}
        {!food.isSwapped && (
          <View style={styles.dotInner} />
        )}
      </View>
      <View style={styles.suggestionInfo}>
        <View style={styles.suggestionNameRow}>
          <Text style={[styles.suggestionName, isLogged && styles.suggestionNameLogged]} numberOfLines={1}>
            {food.name}
          </Text>
          {food.isSwapped && (
            <View style={styles.swappedBadge}>
              <Text style={styles.swappedBadgeText}>swapped</Text>
            </View>
          )}
        </View>
        <PhysiqPressable
          feedback="tap"
          onPress={onEditQuantityPress}
          style={styles.suggestionPortionWrap}
          disabled={!onEditQuantityPress}
        >
          <Text style={styles.suggestionPortion}>{food.portion}</Text>
        </PhysiqPressable>
        <Text style={styles.suggestionMacros}>
          {formatNumber(food.calories)} cal · {formatNumber(food.protein_g)}p · {formatNumber(food.carbs_g)}c · {formatNumber(food.fat_g)}f
        </Text>
      </View>
      <PhysiqPressable
        feedback="select"
        style={styles.logToggleTouchTarget}
        onPress={onLogPress}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel={isLogged ? `Remove ${food.name} from today` : `Log ${food.name} to today`}
        accessibilityRole="button"
        accessibilityHint="Adds this food to your daily total"
        testID={`log-btn-${food.id}`}
      >
        <View
          style={[
            styles.logToggleOuter,
            isLogged && [styles.logToggleOuterActive, { borderColor: colors.primary }],
          ]}
        >
          <View style={[styles.logToggleInner, isLogged && [styles.logToggleInnerActive, { backgroundColor: colors.primary }]]} />
        </View>
      </PhysiqPressable>
      {food.isSubstitutable && (
        <PhysiqPressable
          style={styles.swapButton}
          feedback="tap"
          onPress={onSwapPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID={`swap-btn-${food.id}`}
        >
          <ArrowLeftRight size={14} color={Colors.textSecondary} />
        </PhysiqPressable>
      )}
    </View>
  );
}

function MealCard({
  meal,
  macros,
  mealIndex,
  onSwapPress,
  onLogPress,
  onMealLogPress,
  onMealRegeneratePress,
  onMealSavePress,
  isMealLogged,
  onEditQuantityPress,
  isLogged,
}: {
  meal: MealSlot;
  macros: MacroTargets;
  mealIndex: number;
  onSwapPress: (mealIndex: number, foodIndex: number, food: MealSuggestion) => void;
  onLogPress: (food: MealSuggestion) => void;
  onMealLogPress: (mealIndex: number, meal: MealSlot) => void;
  onMealRegeneratePress: (mealIndex: number) => void;
  onMealSavePress: (mealIndex: number, meal: MealSlot) => void;
  isMealLogged: (mealIndex: number, meal: MealSlot) => boolean;
  onEditQuantityPress?: (mealIndex: number, foodIndex: number, food: MealSuggestion) => void;
  isLogged: (planItemId: string) => boolean;
}) {
  const colors = useThemeColors();
  const slotCalories = Math.round(macros.calories * meal.percentage);
  const slotProtein = Math.round(macros.protein_g * meal.percentage);
  const slotCarbs = Math.round(macros.carbs_g * meal.percentage);
  const slotFat = Math.round(macros.fat_g * meal.percentage);

  const mealLogged = isMealLogged(mealIndex, meal);

  return (
    <View style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <View style={styles.mealIconContainer}>
          {getMealIcon(meal.icon, colors) ?? <Sun size={18} color={colors.primary} />}
        </View>
        <View style={styles.mealHeaderInfo}>
          <Text style={styles.mealName}>{meal.name}</Text>
          <Text style={styles.mealPercent}>{Math.round(meal.percentage * 100)}% of daily</Text>
        </View>
        <View style={styles.mealHeaderActions}>
          <PhysiqPressable
            feedback="select"
            style={[
              styles.mealActionBtn,
              mealLogged ? [styles.mealActionBtnActive, { borderColor: colors.primary }] : null,
            ]}
            onPress={() => onMealLogPress(mealIndex, meal)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID={`log-meal-btn-${mealIndex}`}
          >
            <View
              style={[
                styles.mealActionDot,
                mealLogged ? [styles.mealActionDotActive, { backgroundColor: colors.primary }] : null,
              ]}
            />
          </PhysiqPressable>
          <PhysiqPressable
            feedback="tap"
            style={[styles.mealActionBtn, { backgroundColor: Colors.cardElevated }]}
            onPress={() => onMealRegeneratePress(mealIndex)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID={`regen-meal-btn-${mealIndex}`}
          >
            <RotateCcw size={14} color={Colors.textSecondary} />
          </PhysiqPressable>
          <PhysiqPressable
            feedback="tap"
            style={[styles.mealActionBtn, { backgroundColor: Colors.cardElevated }]}
            onPress={() => onMealSavePress(mealIndex, meal)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            testID={`save-meal-btn-${mealIndex}`}
          >
            <Save size={14} color={Colors.textSecondary} />
          </PhysiqPressable>
        </View>
      </View>

      <View style={styles.mealMacroRow}>
        <View style={[styles.mealMacroPill, { backgroundColor: Colors.proteinMuted }]}>
          <Text style={[styles.mealMacroText, { color: Colors.protein }]}>{formatNumber(slotProtein)}g P</Text>
        </View>
        <View style={[styles.mealMacroPill, { backgroundColor: Colors.carbsMuted }]}>
          <Text style={[styles.mealMacroText, { color: Colors.carbs }]}>{formatNumber(slotCarbs)}g C</Text>
        </View>
        <View style={[styles.mealMacroPill, { backgroundColor: Colors.fatMuted }]}>
          <Text style={[styles.mealMacroText, { color: Colors.fat }]}>{formatNumber(slotFat)}g F</Text>
        </View>
        <View style={[styles.mealMacroPill, { backgroundColor: colors.primaryMuted }]}>
          <Text style={[styles.mealMacroText, { color: colors.primary }]}>{formatNumber(slotCalories)} cal</Text>
        </View>
      </View>

      <View style={styles.suggestionsContainer}>
        <View style={styles.suggestionsHeaderRow}>
          <View style={styles.headerDotSpacer} />
          <Text style={[styles.suggestionsLabel, styles.suggestionsLabelFlex]}>Ideas</Text>
          <View style={styles.logColumnHeader}>
            <Text style={styles.logColumnLabel}>Log</Text>
          </View>
          <View style={styles.swapButtonSpacer} />
        </View>
        {meal.suggestions.map((food, idx) => (
          <FoodItemRow
            key={food.id}
            food={food}
            mealName={meal.name}
            isLogged={isLogged(food.id)}
            onLogPress={() => onLogPress(food)}
            onSwapPress={() => onSwapPress(mealIndex, idx, food)}
            onEditQuantityPress={onEditQuantityPress ? () => onEditQuantityPress(mealIndex, idx, food) : undefined}
          />
        ))}
      </View>
    </View>
  );
}

function SubstituteOption({
  result,
  onSelect,
}: {
  result: SubstituteResult;
  onSelect: () => void;
}) {
  const colors = useThemeColors();
  return (
    <PhysiqPressable
      feedback="select"
      style={styles.substituteCard}
      onPress={onSelect}
      testID={`sub-option-${result.catalogItem.id}`}
    >
      <View style={styles.substituteInfo}>
        <Text style={styles.substituteName}>{result.catalogItem.name}</Text>
        <Text style={styles.substitutePortion}>{result.adjustedPortion}</Text>
        <View style={styles.substituteMacroRow}>
          <Text style={styles.substituteCalories}>{formatNumber(result.adjustedMacros.calories)} cal</Text>
          <View style={styles.substituteMacroDot} />
          <Text style={[styles.substituteMacroChip, { color: Colors.protein }]}>
            {formatNumber(result.adjustedMacros.protein_g)}p
          </Text>
          <View style={styles.substituteMacroDot} />
          <Text style={[styles.substituteMacroChip, { color: Colors.carbs }]}>
            {formatNumber(result.adjustedMacros.carbs_g)}c
          </Text>
          <View style={styles.substituteMacroDot} />
          <Text style={[styles.substituteMacroChip, { color: Colors.fat }]}>
            {formatNumber(result.adjustedMacros.fat_g)}f
          </Text>
        </View>
      </View>
      <View style={[styles.selectButton, { backgroundColor: colors.primaryMuted }]}>
        <Check size={16} color={colors.primary} />
      </View>
    </PhysiqPressable>
  );
}

const GROCERY_SHEET_HEIGHT = 520;

function GrocerySection({
  dayMeals,
  planId,
  subtitle,
  showToast,
}: {
  dayMeals: GroceryDayMeals[];
  planId: string;
  subtitle: string;
  showToast: (msg: string) => void;
}) {
  const colors = useThemeColors();
  const { height: windowHeight } = useWindowDimensions();
  const [sheetVisible, setSheetVisible] = useState(false);
  const [checklist, setChecklist] = useState<GroceryChecklist>({});
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const slideAnim = useRef(new Animated.Value(GROCERY_SHEET_HEIGHT)).current;

  const groceryList = useMemo(() => {
    return generateGroceryListFromDays(dayMeals, planId);
  }, [dayMeals, planId]);

  const totalItems = useMemo(() => {
    return groceryList.categories.reduce((sum, cat) => sum + cat.items.length, 0);
  }, [groceryList]);

  const checkedCount = useMemo(() => {
    return Object.values(checklist).filter(Boolean).length;
  }, [checklist]);

  const checklistQuery = useQuery({
    queryKey: ['grocery_checklist', planId],
    queryFn: () => loadChecklist(planId),
  });

  useEffect(() => {
    if (checklistQuery.data) {
      setChecklist(checklistQuery.data);
    }
  }, [checklistQuery.data]);

  const openSheet = useCallback(() => {
    setSheetVisible(true);
    slideAnim.setValue(GROCERY_SHEET_HEIGHT);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [slideAnim]);

  const closeSheet = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: GROCERY_SHEET_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSheetVisible(false));
  }, [slideAnim]);

  const toggleItem = useCallback((itemKey: string) => {
    setChecklist((prev) => {
      const updated = { ...prev, [itemKey]: !prev[itemKey] };
      saveChecklist(planId, updated);
      return updated;
    });
  }, [planId]);

  const toggleCategory = useCallback((catName: string) => {
    setCollapsedCategories((prev) => ({
      ...prev,
      [catName]: !prev[catName],
    }));
  }, []);

  const handleCopy = useCallback(async () => {
    const listWithChecks: GroceryList = {
      ...groceryList,
      categories: groceryList.categories.map((cat) => ({
        ...cat,
        items: cat.items.map((item) => ({
          ...item,
          checked: !!checklist[item.key],
        })),
      })),
    };
    const text = formatGroceryListAsText(listWithChecks);
    await Clipboard.setStringAsync(text);
    if (Platform.OS !== 'web') {
      playFeedback('success');
    }
    showToast('Copied to clipboard');
  }, [groceryList, checklist, showToast]);

  const handleReset = useCallback(() => {
    setChecklist({});
    saveChecklist(planId, {});
    showToast('Checklist reset');
  }, [planId, showToast]);

  const formatDisplayAmount = (amount: number): string => {
    if (amount === Math.floor(amount)) return String(amount);
    return amount.toFixed(1);
  };

  return (
    <>
      <View style={groceryStyles.sectionCard}>
        <View style={groceryStyles.sectionHeader}>
          <View style={groceryStyles.sectionIconWrap}>
            <ShoppingCart size={18} color={Colors.success} />
          </View>
          <View style={groceryStyles.sectionHeaderText}>
            <Text style={groceryStyles.sectionTitle}>Grocery List</Text>
            <Text style={groceryStyles.sectionSubtitle}>{subtitle}</Text>
          </View>
          {checkedCount > 0 && (
            <View style={groceryStyles.badge}>
              <Text style={groceryStyles.badgeText}>
                {checkedCount}/{totalItems}
              </Text>
            </View>
          )}
        </View>

        <View style={groceryStyles.sectionActions}>
          <PhysiqPressable
            feedback="confirm"
            style={[groceryStyles.viewListBtn, { backgroundColor: colors.primary }]}
            onPress={openSheet}
            testID="grocery-view-btn"
          >
            <ShoppingCart size={14} color={colors.onPrimary} />
            <Text style={[groceryStyles.viewListBtnText, { color: colors.onPrimary }]}>View List</Text>
          </PhysiqPressable>
          <PhysiqPressable
            feedback="tap"
            style={[groceryStyles.copyBtn, { backgroundColor: colors.primaryMuted }]}
            onPress={handleCopy}
            testID="grocery-copy-btn"
          >
            <Copy size={14} color={colors.primary} />
            <Text style={[groceryStyles.copyBtnText, { color: colors.primary }]}>Copy</Text>
          </PhysiqPressable>
        </View>
      </View>

      <Modal
        visible={sheetVisible}
        transparent
        animationType="none"
        onRequestClose={closeSheet}
        statusBarTranslucent
      >
        <PhysiqPressable feedback="tap" style={groceryStyles.overlay} onPress={closeSheet}>
          <Pressable onPress={() => {}}>
            <Animated.View
              style={[
                groceryStyles.sheetContainer,
                { transform: [{ translateY: slideAnim }], maxHeight: windowHeight * 0.75 },
              ]}
            >
              <View style={groceryStyles.sheetHandle} />

              <View style={groceryStyles.sheetHeader}>
                <View style={groceryStyles.sheetTitleArea}>
                  <Text style={groceryStyles.sheetTitle}>Grocery List</Text>
                  <Text style={groceryStyles.sheetSubtitle}>
                    {checkedCount} of {totalItems} items checked
                  </Text>
                </View>
                <PhysiqPressable feedback="tap" onPress={closeSheet} style={groceryStyles.closeBtn}>
                  <X size={20} color={Colors.textSecondary} />
                </PhysiqPressable>
              </View>

              <ScrollView
                style={[groceryStyles.sheetScroll, { maxHeight: windowHeight * 0.5 }]}
                contentContainerStyle={groceryStyles.sheetScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {groceryList.categories.map((category) => {
                  const isCollapsed = !!collapsedCategories[category.name];
                  const catChecked = category.items.filter((i) => checklist[i.key]).length;
                  return (
                    <View key={category.name} style={groceryStyles.categoryBlock}>
                      <PhysiqPressable
                        feedback="tap"
                        style={groceryStyles.categoryHeader}
                        onPress={() => toggleCategory(category.name)}
                      >
                        <Text style={groceryStyles.categoryName}>{category.name}</Text>
                        <View style={groceryStyles.categoryRight}>
                          <Text style={groceryStyles.categoryCount}>
                            {catChecked}/{category.items.length}
                          </Text>
                          {isCollapsed ? (
                            <ChevronDown size={16} color={Colors.textTertiary} />
                          ) : (
                            <ChevronUp size={16} color={Colors.textTertiary} />
                          )}
                        </View>
                      </PhysiqPressable>
                      {!isCollapsed && category.items.map((item) => {
                        const isChecked = !!checklist[item.key];
                        return (
                          <PhysiqPressable
                            feedback="select"
                            key={item.key}
                            style={groceryStyles.itemRow}
                            onPress={() => toggleItem(item.key)}
                            testID={`grocery-item-${item.key}`}
                          >
                            <View style={[
                              groceryStyles.checkbox,
                              isChecked && groceryStyles.checkboxChecked,
                            ]}>
                              {isChecked && <Check size={12} color={colors.onPrimary} />}
                            </View>
                            <View style={groceryStyles.itemInfo}>
                              <Text style={[
                                groceryStyles.itemName,
                                isChecked && groceryStyles.itemNameChecked,
                              ]}>
                                {item.name}
                              </Text>
                              <Text style={groceryStyles.itemSources}>
                                {item.sources.join(', ')}
                              </Text>
                            </View>
                            <Text style={[
                              groceryStyles.itemAmount,
                              isChecked && groceryStyles.itemAmountChecked,
                            ]}>
                              {formatDisplayAmount(item.totalAmount)} {item.unit}
                            </Text>
                          </PhysiqPressable>
                        );
                      })}
                    </View>
                  );
                })}
              </ScrollView>

              <View style={groceryStyles.sheetFooter}>
                <PhysiqPressable
                  feedback="tap"
                  style={groceryStyles.resetBtn}
                  onPress={handleReset}
                >
                  <RotateCcw size={14} color={Colors.textSecondary} />
                  <Text style={groceryStyles.resetBtnText}>Reset</Text>
                </PhysiqPressable>
                <PhysiqPressable
                  feedback="tap"
                  style={[groceryStyles.footerCopyBtn, { backgroundColor: colors.primaryMuted }]}
                  onPress={handleCopy}
                >
                  <Copy size={14} color={colors.primary} />
                  <Text style={[groceryStyles.footerCopyBtnText, { color: colors.primary }]}>Copy List</Text>
                </PhysiqPressable>
              </View>
            </Animated.View>
          </Pressable>
        </PhysiqPressable>
      </Modal>
    </>
  );
}

const groceryStyles = StyleSheet.create({
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.successMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  sectionSubtitle: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  badge: {
    backgroundColor: Colors.successMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
  },
  badgeText: {
    color: Colors.success,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  viewListBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.success,
    paddingVertical: 12,
    borderRadius: 12,
  },
  viewListBtnText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryMuted,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  copyBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.cardBorder,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  sheetTitleArea: {
    flex: 1,
  },
  sheetTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  sheetSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  sheetScroll: {
    maxHeight: 400,
  },
  sheetScrollContent: {
    padding: 16,
    paddingBottom: 8,
  },
  categoryBlock: {
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  categoryName: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryCount: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: Colors.cardElevated,
    borderRadius: 10,
    marginBottom: 6,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.textTertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  itemNameChecked: {
    color: Colors.textTertiary,
    textDecorationLine: 'line-through' as const,
  },
  itemSources: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  itemAmount: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    minWidth: 60,
    textAlign: 'right' as const,
  },
  itemAmountChecked: {
    color: Colors.textTertiary,
    textDecorationLine: 'line-through' as const,
  },
  sheetFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  resetBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  footerCopyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.primaryMuted,
  },
  footerCopyBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
});

function createFoodEntryFromPlanItem(food: MealSuggestion): FoodEntry {
  return {
    id: generateId(),
    name: food.name,
    protein_g: food.protein_g,
    carbs_g: food.carbs_g,
    fat_g: food.fat_g,
    calories: food.calories,
    timestamp: new Date().toISOString(),
    providerId: 'manual',
    servingGrams: food.portionGrams,
    source: 'mealPlan',
    sourceRefId: food.id,
  };
}

function mealSlotBaseId(dayIndex: number, mealIndex: number, foodIndex: number): string {
  return `plan-${dayIndex}-${mealIndex}-${foodIndex}`;
}

export default function PlanScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const { profile, macros } = useUser();
  const { todayEntries, addEntry, addEntries, removeEntry, updateEntry } = useDailyLog();
  const queryClient = useQueryClient();
  const router = useRouter();

  const planningTargetInfo = useMemo(
    () => normalizeMacroTargetsForPlanning(macros),
    [macros]
  );
  const planningTargets = planningTargetInfo.normalizedTargets;

  const activePlanQuery = useQuery({
    queryKey: ['active_meal_plan'],
    queryFn: getActiveMealPlan,
  });

  const savedPlansQuery = useQuery({
    queryKey: ['saved_meal_plans'],
    queryFn: getAllSavedMealPlans,
  });

  const allergiesQuery = useQuery({
    queryKey: ['user_allergies'],
    queryFn: getAllergies,
  });
  const allergies = allergiesQuery.data ?? [];

  const dislikedFoodsQuery = useQuery({
    queryKey: ['disliked_foods'],
    queryFn: getDislikedFoods,
  });
  const dislikedFoodIds = (dislikedFoodsQuery.data ?? []).map((f) => f.foodId);
  const measurementSystem = profile.measurementSystem ?? 'us';
  const activePlan = activePlanQuery.data;
  const [generationSeed, setGenerationSeed] = useState(0);
  const [numDays, setNumDays] = useState(1);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const generatedPlanKey = useMemo(
    () =>
      buildGeneratedPlanKey({
        goal: profile.goal,
        activityLevel: profile.activityLevel,
        eatingStyle: profile.eatingStyle,
        measurementSystem,
        modifiers: profile.dietModifiers ?? [],
        allergies: allergies.map((item) => item.normalized),
        macros: planningTargets,
        generationSeed,
      }),
    [
      allergies,
      generationSeed,
      planningTargets,
      measurementSystem,
      profile.activityLevel,
      profile.dietModifiers,
      profile.eatingStyle,
      profile.goal,
    ]
  );
  const activePlanMatchesCurrentTargets = useMemo(() => {
    if (!activePlan) return false;
    return (
      activePlan.eatingStyle === profile.eatingStyle &&
      areStringListsEqual(activePlan.dietaryModifiers ?? [], profile.dietModifiers ?? []) &&
      areMacroTargetsEqual(activePlan.macroTargets, planningTargets)
    );
  }, [activePlan, planningTargets, profile.dietModifiers, profile.eatingStyle]);

  const baseWeekPlan = useMemo(() => {
    return getWeekPlanForEatingStyle(
      profile.eatingStyle,
      profile.dietModifiers ?? [],
      numDays,
      planningTargets,
      profile.measurementSystem ?? 'us',
      allergies,
      generationSeed,
      dislikedFoodIds
    );
  }, [
    profile.eatingStyle,
    profile.dietModifiers,
    numDays,
    planningTargets,
    profile.measurementSystem,
    allergies,
    generationSeed,
    dislikedFoodIds,
  ]);

  const [substitutionMap, setSubstitutionMap] = useState<
    Record<string, MealSuggestion>
  >({});

  const [quantityMap, setQuantityMap] = useState<Record<string, number>>({});
  const [activePlanLoaded, setActivePlanLoaded] = useState(false);

  useEffect(() => {
    if (!activePlan || !activePlanMatchesCurrentTargets) {
      setSubstitutionMap({});
      setActivePlanLoaded(false);
      return;
    }

    console.log('[PlanScreen] Loading active plan:', activePlan.name);
    const dayMeals = getMealsForDay(activePlan, selectedDayIndex);
    const migrated: Record<string, MealSuggestion> = {};
    dayMeals.forEach((meal, mealIdx) => {
      (meal.suggestions ?? []).forEach((food, foodIdx) => {
        const slotKey = `plan-${selectedDayIndex}-${mealIdx}-${foodIdx}`;
        migrated[slotKey] = { ...food, id: slotKey };
      });
    });
    setSubstitutionMap(migrated);
    setActivePlanLoaded(true);
    if (activePlan.numDays && activePlan.numDays !== numDays) {
      setNumDays(activePlan.numDays);
    }
  }, [activePlan, activePlanMatchesCurrentTargets, selectedDayIndex]);

  const planKey = activePlanMatchesCurrentTargets && activePlan ? activePlan.id : generatedPlanKey;
  const quantityPlanKey = `${planKey}::d${selectedDayIndex}`;
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await loadData<Record<string, Record<string, number>>>(STORAGE_KEYS.MEAL_PLAN_QUANTITIES);
      if (cancelled) return;
      const map = stored?.[quantityPlanKey] ?? {};
      setQuantityMap(map);
    })();
    return () => { cancelled = true; };
  }, [quantityPlanKey]);

  const activePlanDayMeals = activePlanMatchesCurrentTargets && activePlan
    ? getMealsForDay(activePlan, selectedDayIndex)
    : undefined;
  const isUsingActivePlan = !!activePlanDayMeals && activePlanLoaded;

  const selectedDayMealsRaw = useMemo(() => {
    if (isUsingActivePlan && activePlanDayMeals) return activePlanDayMeals;
    return baseWeekPlan.days[selectedDayIndex]?.meals ?? baseWeekPlan.days[0]?.meals ?? [];
  }, [activePlanDayMeals, baseWeekPlan.days, isUsingActivePlan, selectedDayIndex]);

  const plan: DayPlan = useMemo(() => {
    const applySubstitutionsAndQuantity = (meals: MealSlot[]) =>
      meals.map((meal, mealIdx) => ({
        ...meal,
        suggestions: meal.suggestions.map((food, foodIdx) => {
          const slotKey = `plan-${selectedDayIndex}-${mealIdx}-${foodIdx}`;
          const item = substitutionMap[slotKey] ?? food;
          const baseItem = { ...item, id: slotKey };
          const qtyOverride = quantityMap[slotKey];
          if (qtyOverride == null) return baseItem;
          const qtyInfo = getQuantityInfo(item.foodId, item.portionGrams, measurementSystem);
          if (!qtyInfo) return baseItem;
          const { unit } = qtyInfo;
          const baseQty = qtyInfo.qty;
          const scale = baseQty > 0 ? qtyOverride / baseQty : 1;
          const { calories, protein_g, carbs_g, fat_g } = scaleMacros(
            item.calories,
            item.protein_g,
            item.carbs_g,
            item.fat_g,
            scale
          );
          return {
            ...baseItem,
            portion: formatQuantityDisplay(qtyOverride, unit),
            portionGrams: Math.round(item.portionGrams * scale),
            calories,
            protein_g,
            carbs_g,
            fat_g,
          };
        }),
      }));

    return {
      eatingStyle: baseWeekPlan.eatingStyle,
      tags: baseWeekPlan.tags,
      meals: applySubstitutionsAndQuantity(selectedDayMealsRaw),
      planUnavailable: baseWeekPlan.planUnavailable ?? false,
      targetUsed: baseWeekPlan.targetUsed,
      targetNormalization: baseWeekPlan.targetNormalization,
    };
  }, [
    baseWeekPlan,
    measurementSystem,
    quantityMap,
    selectedDayIndex,
    selectedDayMealsRaw,
    substitutionMap,
  ]);

  const groceryDayMeals: GroceryDayMeals[] = useMemo(() => {
    if (isUsingActivePlan && activePlan?.days && activePlan.days.length > 0) {
      return activePlan.days.map((d) => ({
        dayLabel: d.label,
        meals: getMealsForDay(activePlan, d.dayIndex),
      }));
    }
    return baseWeekPlan.days.map((d) => ({
      dayLabel: d.label,
      meals: d.meals,
    }));
  }, [activePlan, baseWeekPlan.days, isUsingActivePlan]);

  const planTotals = useMemo(() => computePlanTotals(plan.meals), [plan.meals]);
  const planTarget = plan.targetUsed ?? planningTargets;

  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedFood, setSelectedFood] = useState<MealSuggestion | null>(null);
  const [selectedMealIdx, setSelectedMealIdx] = useState(0);
  const [selectedFoodIdx, setSelectedFoodIdx] = useState(0);
  const [substitutes, setSubstitutes] = useState<SubstituteResult[]>([]);
  const [swapPageIndex, setSwapPageIndex] = useState(0);
  const slideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [planName, setPlanName] = useState('');
  const saveSlideAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

  const [editQtyVisible, setEditQtyVisible] = useState(false);
  const [editQtyFood, setEditQtyFood] = useState<MealSuggestion | null>(null);
  const [editQtySlotKey, setEditQtySlotKey] = useState<string | null>(null);

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  }, [toastOpacity]);

  const isLogged = useCallback(
    (planItemId: string) =>
      todayEntries.some((e) => e.source === 'mealPlan' && e.sourceRefId === planItemId),
    [todayEntries]
  );

  const handleLogToggle = useCallback(
    (food: MealSuggestion) => {
      const logged = todayEntries.find((e) => e.source === 'mealPlan' && e.sourceRefId === food.id);
      if (logged) {
        removeEntry(logged.id);
        showToast('Removed from Today');
      } else {
        const entry = createFoodEntryFromPlanItem(food);
        addEntry(entry);
        showToast('Added to Today');
      }
    },
    [todayEntries, addEntry, removeEntry, showToast]
  );

  const isMealLogged = useCallback(
    (mealIndex: number, meal: MealSlot) =>
      meal.suggestions.every((_, foodIndex) =>
        isLogged(mealSlotBaseId(selectedDayIndex, mealIndex, foodIndex))
      ),
    [isLogged, selectedDayIndex]
  );

  const handleLogMeal = useCallback(
    (mealIndex: number, meal: MealSlot) => {
      const missingEntries: FoodEntry[] = [];
      meal.suggestions.forEach((food, foodIndex) => {
        const slotId = mealSlotBaseId(selectedDayIndex, mealIndex, foodIndex);
        const exists = todayEntries.some(
          (e) => e.source === 'mealPlan' && e.sourceRefId === slotId
        );
        if (!exists) {
          missingEntries.push(
            createFoodEntryFromPlanItem({
              ...food,
              id: slotId,
            })
          );
        }
      });

      if (missingEntries.length === 0) {
        showToast('Meal already logged');
        return;
      }
      addEntries(missingEntries);
      showToast(`Added ${missingEntries.length} item${missingEntries.length === 1 ? '' : 's'} to Today`);
    },
    [addEntries, showToast, todayEntries, selectedDayIndex]
  );

  const handleSaveMealTemplate = useCallback(
    async (_mealIndex: number, meal: MealSlot) => {
      const items = meal.suggestions.map((s) => ({
        foodId: s.foodId,
        name: s.name,
        portion: s.portion,
        portionGrams: s.portionGrams,
        protein_g: s.protein_g,
        carbs_g: s.carbs_g,
        fat_g: s.fat_g,
        calories: s.calories,
        category: s.category,
      }));
      const total = items.reduce(
        (acc, item) => ({
          calories: acc.calories + item.calories,
          protein_g: acc.protein_g + item.protein_g,
          carbs_g: acc.carbs_g + item.carbs_g,
          fat_g: acc.fat_g + item.fat_g,
        }),
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
      );

      await saveMealTemplate({
        name: meal.name,
        icon: meal.icon,
        eatingStyle: profile.eatingStyle,
        dietaryModifiers: [...(profile.dietModifiers ?? [])],
        items,
        total,
      });
      showToast(`Saved meal: ${meal.name}`);
    },
    [profile.dietModifiers, profile.eatingStyle, showToast]
  );

  const handleRegenerateMeal = useCallback(
    (mealIndex: number) => {
      const nextSeed = generationSeed + mealIndex + 1;
      const nextPlan = getMealPlanForEatingStyle(
        profile.eatingStyle,
        profile.dietModifiers ?? [],
        planningTargets,
        profile.measurementSystem ?? 'us',
        allergies,
        nextSeed,
        dislikedFoodIds
      );
      const replacement = nextPlan.meals[mealIndex];
      if (!replacement) return;

      const entries = replacement.suggestions.map((food, foodIndex) => {
        const slotId = mealSlotBaseId(selectedDayIndex, mealIndex, foodIndex);
        return {
          ...food,
          id: slotId,
        };
      });

      setSubstitutionMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`plan-${selectedDayIndex}-${mealIndex}-`)) delete next[k];
        });
        entries.forEach((item) => {
          next[item.id] = item;
        });
        return next;
      });
      setQuantityMap((prev) => {
        const next = { ...prev };
        Object.keys(next).forEach((k) => {
          if (k.startsWith(`plan-${selectedDayIndex}-${mealIndex}-`)) delete next[k];
        });
        loadData<Record<string, Record<string, number>>>(STORAGE_KEYS.MEAL_PLAN_QUANTITIES).then((existing) => {
          const merged = { ...(existing ?? {}), [quantityPlanKey]: next };
          saveData(STORAGE_KEYS.MEAL_PLAN_QUANTITIES, merged);
        });
        return next;
      });

      showToast('Meal regenerated');
    },
    [
      allergies,
      dislikedFoodIds,
      generationSeed,
      quantityPlanKey,
      selectedDayIndex,
      planningTargets,
      profile.dietModifiers,
      profile.eatingStyle,
      profile.measurementSystem,
      showToast,
    ]
  );

  const savePlanMutation = useMutation({
    mutationFn: async (name: string) => {
      const eatingStyle = profile.eatingStyle;
      const now = new Date().toISOString();
      const autoName = name.trim() || `${EATING_STYLE_LABELS[eatingStyle]} Plan – ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      const mealsDeepCopy: MealSlot[] = plan.meals.map((meal) => ({
        ...meal,
        suggestions: meal.suggestions.map((s) => ({ ...s })),
      }));

      const daysDeepCopy = baseWeekPlan.days.map((d, idx) => ({
        dayIndex: d.dayIndex,
        label: d.label,
        meals:
          idx === selectedDayIndex
            ? mealsDeepCopy
            : d.meals.map((meal) => ({
                ...meal,
                suggestions: meal.suggestions.map((s) => ({ ...s })),
              })),
      }));

      const savedPlan: SavedMealPlan = {
        id: generateId(),
        name: autoName,
        eatingStyle,
        dietaryModifiers: [...(profile.dietModifiers ?? [])],
        createdAt: now,
        updatedAt: now,
        meals: daysDeepCopy[0]?.meals ?? mealsDeepCopy,
        days: daysDeepCopy,
        numDays,
        substitutionMap: { ...substitutionMap },
        macroTargets: { ...planTarget },
        isActive: true,
      };

      await saveMealPlan(savedPlan);
      await setActiveMealPlan(savedPlan.id);
      return savedPlan;
    },
    onSuccess: (savedPlan) => {
      queryClient.invalidateQueries({ queryKey: ['saved_meal_plans'] });
      queryClient.invalidateQueries({ queryKey: ['active_meal_plan'] });
      if (Platform.OS !== 'web') {
        playFeedback('success');
      }
      showToast(`Saved "${savedPlan.name}"`);
      console.log('[PlanScreen] Plan saved:', savedPlan.name);
    },
  });

  const clearActiveMutation = useMutation({
    mutationFn: async () => {
      await clearActivePlan();
    },
    onSuccess: () => {
      setSubstitutionMap({});
      setActivePlanLoaded(false);
      queryClient.invalidateQueries({ queryKey: ['active_meal_plan'] });
      showToast('Generating fresh plan');
    },
  });

  const openSheet = useCallback((mealIndex: number, foodIndex: number, food: MealSuggestion) => {
    console.log('[PlanScreen] Opening swap sheet for:', food.name);
    setSelectedFood(food);
    setSelectedMealIdx(mealIndex);
    setSelectedFoodIdx(foodIndex);
    setSwapPageIndex(0);

    const mealType = mealNameToType(plan.meals[mealIndex].name);
    const results = getSubstitutes(food, {
      eatingStyle: profile.eatingStyle,
      modifiers: profile.dietModifiers ?? [],
      measurementSystem: profile.measurementSystem ?? 'us',
      excludeFoodIds: plan.meals[mealIndex].suggestions
        .filter((_, i) => i !== foodIndex)
        .map((s) => s.foodId),
      mealType,
    });
    setSubstitutes(results);
    setSheetVisible(true);

    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [profile, plan, slideAnim]);

  const closeSheet = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: SHEET_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSheetVisible(false);
      setSelectedFood(null);
      setSubstitutes([]);
      setSwapPageIndex(0);
    });
  }, [slideAnim]);

  const openEditQuantity = useCallback((mealIndex: number, foodIndex: number, _food: MealSuggestion) => {
    const slotKey = mealSlotBaseId(selectedDayIndex, mealIndex, foodIndex);
    const rawMeals = selectedDayMealsRaw;
    const rawFood = rawMeals[mealIndex].suggestions[foodIndex];
    const baseItem = substitutionMap[slotKey] ?? { ...rawFood, id: slotKey };
    const qtyInfo = getQuantityInfo(baseItem.foodId, baseItem.portionGrams, measurementSystem);
    if (!qtyInfo) return;
    setEditQtyFood(baseItem);
    setEditQtySlotKey(slotKey);
    setEditQtyVisible(true);
  }, [substitutionMap, selectedDayMealsRaw, selectedDayIndex, measurementSystem]);

  const handleQuantitySave = useCallback((slotKey: string, newQty: number) => {
    const baseItem = editQtyFood;
    if (!baseItem) return;
    const qtyInfo = getQuantityInfo(baseItem.foodId, baseItem.portionGrams, measurementSystem);
    if (!qtyInfo) return;
    const baseQty = qtyInfo.qty;
    const scale = baseQty > 0 ? newQty / baseQty : 1;
    const { calories, protein_g, carbs_g, fat_g } = scaleMacros(
      baseItem.calories,
      baseItem.protein_g,
      baseItem.carbs_g,
      baseItem.fat_g,
      scale
    );
    const scaledItem: MealSuggestion = {
      ...baseItem,
      portion: formatQuantityDisplay(newQty, qtyInfo.unit),
      portionGrams: Math.round(baseItem.portionGrams * scale),
      calories,
      protein_g,
      carbs_g,
      fat_g,
    };
    setQuantityMap((prev) => {
      const next = { ...prev, [slotKey]: newQty };
      loadData<Record<string, Record<string, number>>>(STORAGE_KEYS.MEAL_PLAN_QUANTITIES).then((existing) => {
        const merged = { ...(existing ?? {}), [quantityPlanKey]: next };
        saveData(STORAGE_KEYS.MEAL_PLAN_QUANTITIES, merged);
      });
      return next;
    });
    const logged = todayEntries.find((e) => e.source === 'mealPlan' && e.sourceRefId === slotKey);
    if (logged) {
      updateEntry(logged.id, {
        calories,
        protein_g,
        carbs_g,
        fat_g,
        servingGrams: scaledItem.portionGrams,
      });
    }
  }, [editQtyFood, measurementSystem, quantityPlanKey, todayEntries, updateEntry]);

  const handleSelectSubstitute = useCallback((result: SubstituteResult) => {
    if (!selectedFood) return;

    const newItem = applySubstitution(selectedFood, result, selectedMealIdx, selectedFoodIdx);
    const slotKey = mealSlotBaseId(selectedDayIndex, selectedMealIdx, selectedFoodIdx);

    setSubstitutionMap((prev) => ({
      ...prev,
      [slotKey]: newItem,
    }));
    setQuantityMap((prev) => {
      const next = { ...prev };
      delete next[slotKey];
      loadData<Record<string, Record<string, number>>>(STORAGE_KEYS.MEAL_PLAN_QUANTITIES).then((existing) => {
        const merged = { ...(existing ?? {}), [quantityPlanKey]: next };
        saveData(STORAGE_KEYS.MEAL_PLAN_QUANTITIES, merged);
      });
      return next;
    });

    console.log('[PlanScreen] Swapped', selectedFood.name, '->', result.catalogItem.name);
    closeSheet();
  }, [selectedFood, selectedMealIdx, selectedFoodIdx, closeSheet]);

  const SWAP_PAGE_SIZE = 3;
  const totalSwapPages = Math.ceil(substitutes.length / SWAP_PAGE_SIZE);
  const visibleSubstitutes = substitutes.slice(
    swapPageIndex * SWAP_PAGE_SIZE,
    swapPageIndex * SWAP_PAGE_SIZE + SWAP_PAGE_SIZE
  );
  const swapRangeStart = swapPageIndex * SWAP_PAGE_SIZE + 1;
  const swapRangeEnd = Math.min(
    swapPageIndex * SWAP_PAGE_SIZE + SWAP_PAGE_SIZE,
    substitutes.length
  );

  const openSaveModal = useCallback(() => {
    setPlanName('');
    setSaveModalVisible(true);
    saveSlideAnim.setValue(SHEET_HEIGHT);
    Animated.spring(saveSlideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [saveSlideAnim]);

  const closeSaveModal = useCallback(() => {
    Animated.timing(saveSlideAnim, {
      toValue: SHEET_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setSaveModalVisible(false);
      setPlanName('');
    });
  }, [saveSlideAnim]);

  const handleSavePlan = useCallback(() => {
    savePlanMutation.mutate(planName);
    closeSaveModal();
  }, [planName, savePlanMutation, closeSaveModal]);

  const savedPlans = savedPlansQuery.data ?? [];
  const activePlanName = activePlanMatchesCurrentTargets ? activePlan?.name : undefined;

  if (!profile.onboardingComplete) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Complete onboarding first</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <PlanPreferencesGate />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
        <DashboardBrandHeader />
        <TabScreenTitle title="Meal Plan" />
        {profile.eatingStyle === 'psmf' ? (
          <PsmfDurationBanner psmfStartDate={profile.psmfStartDate} />
        ) : null}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTitleArea}>
              <Text style={styles.headerTitle}>
                {EATING_STYLE_LABELS[profile.eatingStyle]} Plan
              </Text>
              <Text style={styles.headerSubtitle}>
                Plan totals: {formatNumber(planTotals.calories)} cal (target {formatNumber(planTarget.calories)})
              </Text>
              {(plan.targetNormalization?.wasNormalized || planningTargetInfo.wasNormalized) && (
                <Text style={styles.headerNormalizationNote}>
                  Targets normalized to macro-equivalent calories for plan accuracy.
                </Text>
              )}
            </View>
            <View style={styles.headerActions}>
              <PhysiqPressable
                feedback="tap"
                style={[styles.headerActionBtn, { backgroundColor: colors.primaryMuted }]}
                onPress={() => {
                  const keyToClear = planKey;
                  const resetState = () => {
                    setSubstitutionMap({});
                    setQuantityMap({});
                    setActivePlanLoaded(false);
                    setGenerationSeed((current) => current + 1);
                    loadData<Record<string, Record<string, number>>>(STORAGE_KEYS.MEAL_PLAN_QUANTITIES).then((existing) => {
                      if (existing && keyToClear in existing) {
                        const next = { ...existing };
                        delete next[keyToClear];
                        saveData(STORAGE_KEYS.MEAL_PLAN_QUANTITIES, next);
                      }
                    });
                    showToast('Plan regenerated');
                  };
                  if (activePlanQuery.data) {
                    clearActiveMutation.mutate(undefined, { onSuccess: resetState });
                  } else {
                    resetState();
                  }
                }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                testID="regenerate-plan-btn"
              >
                <RotateCcw size={16} color={colors.primary} />
              </PhysiqPressable>
              {savedPlans.length > 0 && (
                <PhysiqPressable
                  feedback="tap"
                  style={[styles.headerActionBtn, { backgroundColor: colors.primaryMuted }]}
                  onPress={() => router.push('/plan/saved-plans' as any)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  testID="saved-plans-btn"
                >
                  <Bookmark size={16} color={colors.primary} />
                </PhysiqPressable>
              )}
              <PhysiqPressable
                feedback="tap"
                style={[styles.saveHeaderBtn, { backgroundColor: colors.primaryMuted }]}
                onPress={openSaveModal}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                testID="save-plan-btn"
              >
                <Save size={16} color={colors.primary} />
              </PhysiqPressable>
            </View>
          </View>

          {activePlanName && (
            <View style={styles.activePlanTag}>
              <Bookmark size={10} color={Colors.success} />
              <Text style={styles.activePlanTagText}>{activePlanName}</Text>
              <PhysiqPressable
                feedback="tap"
                onPress={() => clearActiveMutation.mutate()}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <X size={12} color={Colors.textTertiary} />
              </PhysiqPressable>
            </View>
          )}

          {(profile.dietModifiers ?? []).length > 0 && (
            <View style={styles.modifierRow}>
              {(profile.dietModifiers ?? []).map((mod: DietaryModifier) => (
                <View key={mod} style={styles.modifierPill}>
                  <Text style={styles.modifierPillText}>{DIETARY_MODIFIER_LABELS[mod]}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.planLengthRow}>
            <Text style={styles.planLengthLabel}>Plan length</Text>
            <View style={styles.dayChipRow}>
              {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                <PhysiqPressable
                  feedback="select"
                  key={n}
                  style={[
                    styles.dayChip,
                    numDays === n && { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
                  ]}
                  onPress={() => {
                    setNumDays(n);
                    setSelectedDayIndex((i) => Math.min(i, n - 1));
                    setActivePlanLoaded(false);
                  }}
                >
                  <Text style={[styles.dayChipText, numDays === n && { color: colors.primary }]}>{n}d</Text>
                </PhysiqPressable>
              ))}
            </View>
          </View>

          {numDays > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelectorScroll}>
              {Array.from({ length: numDays }, (_, i) => (
                <PhysiqPressable
                  feedback="select"
                  key={i}
                  style={[
                    styles.daySelectorChip,
                    selectedDayIndex === i && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => {
                    setSelectedDayIndex(i);
                    setActivePlanLoaded(false);
                  }}
                >
                  <Text
                    style={[
                      styles.daySelectorText,
                      selectedDayIndex === i && { color: colors.onPrimary ?? Colors.white },
                    ]}
                  >
                    {getWeekDayLabel(i)}
                  </Text>
                </PhysiqPressable>
              ))}
            </ScrollView>
          )}
          <View style={styles.headerMacros}>
            <View style={styles.headerMacroItem}>
              <Text style={[styles.headerMacroValue, { color: Colors.protein }]}>{formatNumber(Math.round(planTotals.protein_g))}g</Text>
              <Text style={styles.headerMacroLabel}>Protein</Text>
            </View>
            <View style={styles.headerDivider} />
            <View style={styles.headerMacroItem}>
              <Text style={[styles.headerMacroValue, { color: Colors.carbs }]}>{formatNumber(Math.round(planTotals.carbs_g))}g</Text>
              <Text style={styles.headerMacroLabel}>Carbs</Text>
            </View>
            <View style={styles.headerDivider} />
            <View style={styles.headerMacroItem}>
              <Text style={[styles.headerMacroValue, { color: Colors.fat }]}>{formatNumber(Math.round(planTotals.fat_g))}g</Text>
              <Text style={styles.headerMacroLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {plan.planUnavailable ? (
          <View style={styles.planUnavailableCard}>
            <Text style={styles.planUnavailableTitle}>Plan unavailable</Text>
            <Text style={styles.planUnavailableText}>
              We couldn{"'"}t generate a plan with your current allergies and dietary setup. Try removing an allergy or adjusting your eating style or restrictions.
            </Text>
            <PhysiqPressable
              feedback="confirm"
              style={[styles.editAllergiesBtn, { backgroundColor: colors.primary }]}
              onPress={() => router.push('/settings/allergies' as never)}
            >
              <Text style={[styles.editAllergiesBtnText, { color: colors.onPrimary }]}>Edit Allergies</Text>
            </PhysiqPressable>
          </View>
        ) : (
          <>
            {plan.meals.map((meal, idx) => (
              <MealCard
                key={idx}
                meal={meal}
                macros={planTarget}
                mealIndex={idx}
                onSwapPress={openSheet}
                onLogPress={handleLogToggle}
                onMealLogPress={handleLogMeal}
                onMealRegeneratePress={handleRegenerateMeal}
                onMealSavePress={handleSaveMealTemplate}
                isMealLogged={isMealLogged}
                onEditQuantityPress={openEditQuantity}
                isLogged={isLogged}
              />
            ))}

                <GrocerySection
              dayMeals={groceryDayMeals}
              planId={activePlanQuery.data?.id ?? generatedPlanKey}
              subtitle={`Based on your ${numDays}-day plan`}
              showToast={showToast}
            />
          </>
        )}

        <MealPlanMethodologyCard
          eatingStyle={profile.eatingStyle}
          dietModifiers={profile.dietModifiers ?? []}
          onViewMethodology={() => router.push('/settings/nutrition-science' as never)}
        />
        </ResponsiveContainer>
      </ScrollView>

      {/* Edit Quantity Sheet */}
      {editQtyFood && editQtySlotKey && (() => {
        const qtyInfo = getQuantityInfo(editQtyFood.foodId, editQtyFood.portionGrams, measurementSystem);
        if (!qtyInfo) return null;
        const baseQty = quantityMap[editQtySlotKey] ?? qtyInfo.qty;
        return (
          <EditQuantitySheet
            visible={editQtyVisible}
            foodName={editQtyFood.name}
            baseQty={baseQty}
            baseCalories={editQtyFood.calories}
            baseProtein={editQtyFood.protein_g}
            baseCarbs={editQtyFood.carbs_g}
            baseFat={editQtyFood.fat_g}
            quantityInfo={qtyInfo}
            onSave={(newQty) => handleQuantitySave(editQtySlotKey, newQty)}
            onCancel={() => {
              setEditQtyVisible(false);
              setEditQtyFood(null);
              setEditQtySlotKey(null);
            }}
          />
        );
      })()}

      {/* Swap Sheet */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="none"
        onRequestClose={closeSheet}
        statusBarTranslucent
      >
        <PhysiqPressable feedback="tap" style={styles.sheetOverlay} onPress={closeSheet}>
          <Pressable onPress={() => {}}>
            <Animated.View
              style={[
                styles.sheetContainer,
                { transform: [{ translateY: slideAnim }], maxHeight: SCREEN_HEIGHT * 0.6 },
              ]}
            >
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeader}>
                <View style={styles.sheetTitleArea}>
                  <Text style={styles.sheetTitle}>Swap Food</Text>
                  <Text style={styles.sheetSubtitle}>
                    Alternatives similar to {selectedFood?.name ?? 'this item'}
                  </Text>
                </View>
                <PhysiqPressable feedback="tap" onPress={closeSheet} style={styles.sheetCloseBtn}>
                  <X size={20} color={Colors.textSecondary} />
                </PhysiqPressable>
              </View>

              <ScrollView
                style={[styles.sheetScroll, { maxHeight: SCREEN_HEIGHT * 0.35 }]}
                contentContainerStyle={styles.sheetScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {visibleSubstitutes.map((result) => (
                  <SubstituteOption
                    key={result.catalogItem.id}
                    result={result}
                    onSelect={() => handleSelectSubstitute(result)}
                  />
                ))}

                {substitutes.length === 0 && (
                  <View style={styles.noSubstitutes}>
                    <Text style={styles.noSubstitutesText}>
                      No alternatives found for your diet preferences.
                    </Text>
                  </View>
                )}
              </ScrollView>

              {substitutes.length > SWAP_PAGE_SIZE && (
                <View style={styles.pagingContainer}>
                  <PhysiqPressable
                    feedback="tap"
                    style={[
                      styles.pagingButton,
                      { backgroundColor: colors.primaryMuted },
                      swapPageIndex === 0 && styles.pagingButtonDisabled,
                    ]}
                    onPress={() => setSwapPageIndex((p) => Math.max(0, p - 1))}
                    disabled={swapPageIndex === 0}
                  >
                    <Text
                      style={[
                        styles.pagingButtonText,
                        { color: colors.primary },
                        swapPageIndex === 0 && styles.pagingButtonTextDisabled,
                      ]}
                    >
                      Previous
                    </Text>
                  </PhysiqPressable>

                  <Text style={styles.pagingLabel}>
                    {swapRangeStart}–{swapRangeEnd} of {substitutes.length}
                  </Text>

                  <PhysiqPressable
                    feedback="tap"
                    style={[
                      styles.pagingButton,
                      { backgroundColor: colors.primaryMuted },
                      swapPageIndex >= totalSwapPages - 1 && styles.pagingButtonDisabled,
                    ]}
                    onPress={() => setSwapPageIndex((p) => Math.min(totalSwapPages - 1, p + 1))}
                    disabled={swapPageIndex >= totalSwapPages - 1}
                  >
                    <Text
                      style={[
                        styles.pagingButtonText,
                        { color: colors.primary },
                        swapPageIndex >= totalSwapPages - 1 && styles.pagingButtonTextDisabled,
                      ]}
                    >
                      Next
                    </Text>
                  </PhysiqPressable>
                </View>
              )}
            </Animated.View>
          </Pressable>
        </PhysiqPressable>
      </Modal>

      {/* Save Plan Sheet */}
      <Modal
        visible={saveModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeSaveModal}
        statusBarTranslucent
      >
        <PhysiqPressable feedback="tap" style={styles.sheetOverlay} onPress={closeSaveModal}>
          <Pressable onPress={() => {}}>
            <Animated.View
              style={[
                styles.saveSheetContainer,
                { transform: [{ translateY: saveSlideAnim }] },
              ]}
            >
              <View style={styles.sheetHandle} />

              <View style={styles.sheetHeader}>
                <View style={styles.sheetTitleArea}>
                  <Text style={styles.sheetTitle}>Save Meal Plan</Text>
                  <Text style={styles.sheetSubtitle}>
                    Save your current plan with substitutions
                  </Text>
                </View>
                <PhysiqPressable feedback="tap" onPress={closeSaveModal} style={styles.sheetCloseBtn}>
                  <X size={20} color={Colors.textSecondary} />
                </PhysiqPressable>
              </View>

              <View style={styles.saveFormArea}>
                <Text style={styles.saveFieldLabel}>Plan Name (optional)</Text>
                <TextInput
                  style={styles.saveInput}
                  placeholder={`e.g. Cutting Phase Week 1`}
                  placeholderTextColor={Colors.textTertiary}
                  value={planName}
                  onChangeText={setPlanName}
                  returnKeyType="done"
                  onSubmitEditing={handleSavePlan}
                  testID="plan-name-input"
                />
                <Text style={styles.saveHint}>
                  Leave blank for auto: &ldquo;{EATING_STYLE_LABELS[profile.eatingStyle]} Plan – {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}&rdquo;
                </Text>
              </View>

              <View style={styles.saveFooter}>
                <PhysiqPressable
                  feedback="tap"
                  style={styles.cancelButton}
                  onPress={closeSaveModal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </PhysiqPressable>
                <PhysiqPressable
                  feedback="confirm"
                  style={[styles.savePlanButton, { backgroundColor: colors.primary }]}
                  onPress={handleSavePlan}
                  testID="confirm-save-btn"
                >
                  <Save size={16} color={colors.onPrimary} />
                  <Text style={[styles.savePlanButtonText, { color: colors.onPrimary }]}>Save</Text>
                </PhysiqPressable>
              </View>
            </Animated.View>
          </Pressable>
        </PhysiqPressable>
      </Modal>

      {/* Toast */}
      {toastVisible && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]} pointerEvents="none">
          <Check size={14} color={Colors.success} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...(Shadows.cardElevated as Record<string, unknown>),
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitleArea: {
    flex: 1,
    marginRight: 12,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveHeaderBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800' as const,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    marginTop: 4,
    fontWeight: '500' as const,
  },
  headerNormalizationNote: {
    color: Colors.textTertiary,
    fontSize: 11,
    marginTop: 6,
    fontWeight: '500' as const,
  },
  activePlanTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    backgroundColor: 'rgba(52, 211, 153, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
  },
  activePlanTagText: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  modifierRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  modifierPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  modifierPillText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  planLengthRow: {
    marginTop: 12,
    gap: 8,
  },
  planLengthLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  dayChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardElevated,
  },
  dayChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  daySelectorScroll: {
    marginTop: 10,
    maxHeight: 44,
  },
  daySelectorChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.cardElevated,
    marginRight: 8,
  },
  daySelectorText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  headerMacros: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    backgroundColor: Colors.cardElevated,
    borderRadius: 12,
    padding: 14,
  },
  headerMacroItem: {
    flex: 1,
    alignItems: 'center',
  },
  headerMacroValue: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  headerMacroLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.cardBorder,
  },
  mealCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg + 2,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...(Shadows.card as Record<string, unknown>),
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mealIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealHeaderInfo: {
    flex: 1,
  },
  mealName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  mealPercent: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  mealHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealActionBtnActive: {
    backgroundColor: Colors.primaryMuted,
  },
  mealActionDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.textSecondary,
  },
  mealActionDotActive: {
    borderColor: 'transparent',
  },
  mealTargetBadge: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  mealTargetText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  mealMacroRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 14,
  },
  mealMacroPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  mealMacroText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
  suggestionsContainer: {},
  suggestionsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  suggestionsLabel: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerDotSpacer: {
    width: 18,
  },
  suggestionsLabelFlex: {
    flex: 1,
  },
  logColumnHeader: {
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapButtonSpacer: {
    width: 32,
  },
  logColumnLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    opacity: 0.6,
    letterSpacing: 0.5,
    fontWeight: '500' as const,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  suggestionDot: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  dotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textTertiary,
  },
  swappedIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  suggestionName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
    flexShrink: 1,
  },
  suggestionNameLogged: {
    opacity: 0.65,
  },
  swappedBadge: {
    backgroundColor: Colors.successMuted,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  swappedBadgeText: {
    color: Colors.success,
    fontSize: 9,
    fontWeight: '700' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  suggestionPortionWrap: {
    alignSelf: 'flex-start',
    marginTop: 1,
  },
  suggestionPortionPressed: {
    opacity: 0.7,
  },
  suggestionPortion: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  suggestionMacros: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  logToggleTouchTarget: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logToggleOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logToggleOuterActive: {
    borderColor: Colors.primary,
  },
  logToggleInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(115, 115, 115, 0.45)',
  },
  logToggleInnerActive: {
    backgroundColor: Colors.primary,
  },
  swapButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
  },
  planUnavailableCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 24,
    marginTop: 16,
    alignItems: 'center',
  },
  planUnavailableTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  planUnavailableText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  editAllergiesBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  editAllergiesBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.cardBorder,
  },
  saveSheetContainer: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.cardBorder,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  sheetTitleArea: {
    flex: 1,
  },
  sheetTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  sheetSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  sheetScroll: {
    maxHeight: 280,
  },
  sheetScrollContent: {
    padding: 16,
    gap: 10,
  },
  substituteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardElevated,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  substituteInfo: {
    flex: 1,
  },
  substituteName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  substitutePortion: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  substituteMacroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  substituteCalories: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  substituteMacroDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: Colors.textTertiary,
  },
  substituteMacroChip: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  selectButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  noSubstitutes: {
    padding: 20,
    alignItems: 'center',
  },
  noSubstitutesText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
  sheetFooter: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  pagingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  pagingButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.primaryMuted,
  },
  pagingButtonDisabled: {
    backgroundColor: Colors.cardElevated,
  },
  pagingButtonText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  pagingButtonTextDisabled: {
    color: Colors.textTertiary,
  },
  pagingLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  saveFormArea: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  saveFieldLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  saveInput: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  saveHint: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 8,
    lineHeight: 16,
  },
  saveFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  savePlanButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  savePlanButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  toast: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.card,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});
