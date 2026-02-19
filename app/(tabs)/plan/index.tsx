import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform,
  Pressable,
  TextInput,
  Alert,
} from 'react-native';
import { Sunrise, Sun, Moon, Cookie, ArrowLeftRight, X, Check, Save, Bookmark, ShoppingCart, Copy, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Colors from '../../../constants/colors';
import { useUser } from '../../../providers/UserProvider';
import { getMealPlanForStrategy } from '../../../mocks/mealTemplates';
import {
  MACRO_STRATEGY_LABELS,
  DIETARY_MODIFIER_LABELS,
  MealSlot,
  MealSuggestion,
  MacroTargets,
  DietaryModifier,
  DayPlan,
  SavedMealPlan,
} from '../../../types';
import { getSubstitutes, applySubstitution } from '../../../utils/substitutions/substituteEngine';
import { SubstituteResult } from '../../../utils/substitutions/types';
import { mealNameToType } from '../../../constants/mealSwapCatalog';
import {
  getAllSavedMealPlans,
  saveMealPlan,
  getActiveMealPlan,
  setActiveMealPlan,
  clearActivePlan,
} from '../../../storage/mealPlanRepo';
import { generateGroceryList, formatGroceryListAsText } from '../../../utils/grocery/groceryListEngine';
import { loadChecklist, saveChecklist } from '../../../storage/groceryRepo';
import { GroceryList, GroceryChecklist, GroceryCategoryGroup } from '../../../utils/grocery/types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = 420;

const MEAL_ICONS: Record<string, React.ReactNode> = {
  sunrise: <Sunrise size={18} color={Colors.primary} />,
  sun: <Sun size={18} color={Colors.warning} />,
  moon: <Moon size={18} color={Colors.carbs} />,
  cookie: <Cookie size={18} color={Colors.fat} />,
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function FoodItemRow({
  food,
  onSwapPress,
}: {
  food: MealSuggestion;
  onSwapPress: () => void;
}) {
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
          <Text style={styles.suggestionName} numberOfLines={1}>
            {food.name}
          </Text>
          {food.isSwapped && (
            <View style={styles.swappedBadge}>
              <Text style={styles.swappedBadgeText}>swapped</Text>
            </View>
          )}
        </View>
        <Text style={styles.suggestionPortion}>{food.portion}</Text>
        <Text style={styles.suggestionMacros}>
          {food.calories} cal · {food.protein_g}p · {food.carbs_g}c · {food.fat_g}f
        </Text>
      </View>
      {food.isSubstitutable && (
        <TouchableOpacity
          style={styles.swapButton}
          onPress={onSwapPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          testID={`swap-btn-${food.id}`}
        >
          <ArrowLeftRight size={14} color={Colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function MealCard({
  meal,
  macros,
  mealIndex,
  onSwapPress,
}: {
  meal: MealSlot;
  macros: MacroTargets;
  mealIndex: number;
  onSwapPress: (mealIndex: number, foodIndex: number, food: MealSuggestion) => void;
}) {
  const slotCalories = Math.round(macros.calories * meal.percentage);
  const slotProtein = Math.round(macros.protein_g * meal.percentage);
  const slotCarbs = Math.round(macros.carbs_g * meal.percentage);
  const slotFat = Math.round(macros.fat_g * meal.percentage);

  return (
    <View style={styles.mealCard}>
      <View style={styles.mealHeader}>
        <View style={styles.mealIconContainer}>
          {MEAL_ICONS[meal.icon] ?? <Sun size={18} color={Colors.primary} />}
        </View>
        <View style={styles.mealHeaderInfo}>
          <Text style={styles.mealName}>{meal.name}</Text>
          <Text style={styles.mealPercent}>{Math.round(meal.percentage * 100)}% of daily</Text>
        </View>
        <View style={styles.mealTargetBadge}>
          <Text style={styles.mealTargetText}>{slotCalories} cal</Text>
        </View>
      </View>

      <View style={styles.mealMacroRow}>
        <View style={[styles.mealMacroPill, { backgroundColor: Colors.proteinMuted }]}>
          <Text style={[styles.mealMacroText, { color: Colors.protein }]}>{slotProtein}g P</Text>
        </View>
        <View style={[styles.mealMacroPill, { backgroundColor: Colors.carbsMuted }]}>
          <Text style={[styles.mealMacroText, { color: Colors.carbs }]}>{slotCarbs}g C</Text>
        </View>
        <View style={[styles.mealMacroPill, { backgroundColor: Colors.fatMuted }]}>
          <Text style={[styles.mealMacroText, { color: Colors.fat }]}>{slotFat}g F</Text>
        </View>
      </View>

      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsLabel}>Ideas</Text>
        {meal.suggestions.map((food, idx) => (
          <FoodItemRow
            key={food.id}
            food={food}
            onSwapPress={() => onSwapPress(mealIndex, idx, food)}
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
  return (
    <TouchableOpacity
      style={styles.substituteCard}
      onPress={onSelect}
      activeOpacity={0.7}
      testID={`sub-option-${result.catalogItem.id}`}
    >
      <View style={styles.substituteInfo}>
        <Text style={styles.substituteName}>{result.catalogItem.name}</Text>
        <Text style={styles.substitutePortion}>{result.adjustedPortion}</Text>
        <View style={styles.substituteMacroRow}>
          <Text style={styles.substituteCalories}>{result.adjustedMacros.calories} cal</Text>
          <View style={styles.substituteMacroDot} />
          <Text style={[styles.substituteMacroChip, { color: Colors.protein }]}>
            {Math.round(result.adjustedMacros.protein_g)}p
          </Text>
          <View style={styles.substituteMacroDot} />
          <Text style={[styles.substituteMacroChip, { color: Colors.carbs }]}>
            {Math.round(result.adjustedMacros.carbs_g)}c
          </Text>
          <View style={styles.substituteMacroDot} />
          <Text style={[styles.substituteMacroChip, { color: Colors.fat }]}>
            {Math.round(result.adjustedMacros.fat_g)}f
          </Text>
        </View>
      </View>
      <View style={styles.selectButton}>
        <Check size={16} color={Colors.primary} />
      </View>
    </TouchableOpacity>
  );
}

const GROCERY_SHEET_HEIGHT = 520;

function GrocerySection({
  meals,
  planId,
  showToast,
}: {
  meals: MealSlot[];
  planId: string;
  showToast: (msg: string) => void;
}) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [checklist, setChecklist] = useState<GroceryChecklist>({});
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const slideAnim = useRef(new Animated.Value(GROCERY_SHEET_HEIGHT)).current;

  const groceryList = useMemo(() => {
    return generateGroceryList(meals, planId);
  }, [meals, planId]);

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
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    showToast('Copied to clipboard');
  }, [groceryList, checklist, showToast]);

  const handleReset = useCallback(() => {
    setChecklist({});
    saveChecklist(planId, {});
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
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
            <Text style={groceryStyles.sectionSubtitle}>Based on today's plan</Text>
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
          <TouchableOpacity
            style={groceryStyles.viewListBtn}
            onPress={openSheet}
            activeOpacity={0.7}
            testID="grocery-view-btn"
          >
            <ShoppingCart size={14} color={Colors.white} />
            <Text style={groceryStyles.viewListBtnText}>View List</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={groceryStyles.copyBtn}
            onPress={handleCopy}
            activeOpacity={0.7}
            testID="grocery-copy-btn"
          >
            <Copy size={14} color={Colors.primary} />
            <Text style={groceryStyles.copyBtnText}>Copy</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={sheetVisible}
        transparent
        animationType="none"
        onRequestClose={closeSheet}
        statusBarTranslucent
      >
        <Pressable style={groceryStyles.overlay} onPress={closeSheet}>
          <Pressable onPress={() => {}}>
            <Animated.View
              style={[
                groceryStyles.sheetContainer,
                { transform: [{ translateY: slideAnim }] },
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
                <TouchableOpacity onPress={closeSheet} style={groceryStyles.closeBtn}>
                  <X size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={groceryStyles.sheetScroll}
                contentContainerStyle={groceryStyles.sheetScrollContent}
                showsVerticalScrollIndicator={false}
              >
                {groceryList.categories.map((category) => {
                  const isCollapsed = !!collapsedCategories[category.name];
                  const catChecked = category.items.filter((i) => checklist[i.key]).length;
                  return (
                    <View key={category.name} style={groceryStyles.categoryBlock}>
                      <TouchableOpacity
                        style={groceryStyles.categoryHeader}
                        onPress={() => toggleCategory(category.name)}
                        activeOpacity={0.7}
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
                      </TouchableOpacity>
                      {!isCollapsed && category.items.map((item) => {
                        const isChecked = !!checklist[item.key];
                        return (
                          <TouchableOpacity
                            key={item.key}
                            style={groceryStyles.itemRow}
                            onPress={() => toggleItem(item.key)}
                            activeOpacity={0.7}
                            testID={`grocery-item-${item.key}`}
                          >
                            <View style={[
                              groceryStyles.checkbox,
                              isChecked && groceryStyles.checkboxChecked,
                            ]}>
                              {isChecked && <Check size={12} color={Colors.white} />}
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
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  );
                })}
              </ScrollView>

              <View style={groceryStyles.sheetFooter}>
                <TouchableOpacity
                  style={groceryStyles.resetBtn}
                  onPress={handleReset}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={14} color={Colors.textSecondary} />
                  <Text style={groceryStyles.resetBtnText}>Reset</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={groceryStyles.footerCopyBtn}
                  onPress={handleCopy}
                  activeOpacity={0.7}
                >
                  <Copy size={14} color={Colors.primary} />
                  <Text style={groceryStyles.footerCopyBtnText}>Copy List</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
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
    maxHeight: SCREEN_HEIGHT * 0.75,
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
    maxHeight: SCREEN_HEIGHT * 0.5,
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

export default function PlanScreen() {
  const { profile, macros } = useUser();
  const queryClient = useQueryClient();
  const router = useRouter();

  const activePlanQuery = useQuery({
    queryKey: ['active_meal_plan'],
    queryFn: getActiveMealPlan,
  });

  const savedPlansQuery = useQuery({
    queryKey: ['saved_meal_plans'],
    queryFn: getAllSavedMealPlans,
  });

  const basePlan = useMemo(() => {
    return getMealPlanForStrategy(
      profile.macro_strategy ?? 'balanced',
      profile.dietary_modifiers ?? [],
      macros,
      profile.measurement_system ?? 'us'
    );
  }, [profile.macro_strategy, profile.dietary_modifiers, macros, profile.measurement_system]);

  const [substitutionMap, setSubstitutionMap] = useState<
    Record<string, MealSuggestion>
  >({});

  const [activePlanLoaded, setActivePlanLoaded] = useState(false);

  useEffect(() => {
    if (activePlanQuery.data && !activePlanLoaded) {
      const saved = activePlanQuery.data;
      console.log('[PlanScreen] Loading active plan:', saved.name);
      setSubstitutionMap(saved.substitutionMap ?? {});
      setActivePlanLoaded(true);
    }
  }, [activePlanQuery.data, activePlanLoaded]);

  const activePlanMeals = activePlanQuery.data?.meals;
  const isUsingActivePlan = !!activePlanQuery.data && activePlanLoaded;

  const plan: DayPlan = useMemo(() => {
    if (isUsingActivePlan && activePlanMeals) {
      const meals = activePlanMeals.map((meal) => ({
        ...meal,
        suggestions: meal.suggestions.map((food) => {
          return substitutionMap[food.id] ?? food;
        }),
      }));
      return {
        preference: basePlan.preference,
        strategy: basePlan.strategy,
        tags: basePlan.tags,
        meals,
      };
    }

    const meals = basePlan.meals.map((meal) => ({
      ...meal,
      suggestions: meal.suggestions.map((food) => {
        return substitutionMap[food.id] ?? food;
      }),
    }));
    return { ...basePlan, meals };
  }, [basePlan, substitutionMap, isUsingActivePlan, activePlanMeals]);

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

  const savePlanMutation = useMutation({
    mutationFn: async (name: string) => {
      const strategy = profile.macro_strategy ?? 'balanced';
      const now = new Date().toISOString();
      const autoName = name.trim() || `${MACRO_STRATEGY_LABELS[strategy]} Plan – ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      const mealsDeepCopy: MealSlot[] = plan.meals.map((meal) => ({
        ...meal,
        suggestions: meal.suggestions.map((s) => ({ ...s })),
      }));

      const savedPlan: SavedMealPlan = {
        id: generateId(),
        name: autoName,
        macroStrategy: strategy,
        dietaryModifiers: [...(profile.dietary_modifiers ?? [])],
        createdAt: now,
        updatedAt: now,
        meals: mealsDeepCopy,
        substitutionMap: { ...substitutionMap },
        macroTargets: { ...macros },
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      strategy: profile.macro_strategy ?? 'balanced',
      modifiers: profile.dietary_modifiers ?? [],
      measurementSystem: profile.measurement_system ?? 'us',
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

  const handleSelectSubstitute = useCallback((result: SubstituteResult) => {
    if (!selectedFood) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const newItem = applySubstitution(selectedFood, result, selectedMealIdx, selectedFoodIdx);
    const key = selectedFood.id;

    setSubstitutionMap((prev) => ({
      ...prev,
      [key]: newItem,
    }));

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
    const strategy = profile.macro_strategy ?? 'balanced';
    setPlanName('');
    setSaveModalVisible(true);
    saveSlideAnim.setValue(SHEET_HEIGHT);
    Animated.spring(saveSlideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [profile.macro_strategy, saveSlideAnim]);

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
  const activePlanName = activePlanQuery.data?.name;

  if (!profile.onboarding_complete) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Complete onboarding first</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTitleArea}>
              <Text style={styles.headerTitle}>
                {MACRO_STRATEGY_LABELS[profile.macro_strategy ?? 'balanced']} Plan
              </Text>
              <Text style={styles.headerSubtitle}>
                A typical day hitting your {macros.calories} cal target
              </Text>
            </View>
            <View style={styles.headerActions}>
              {savedPlans.length > 0 && (
                <TouchableOpacity
                  style={styles.headerActionBtn}
                  onPress={() => router.push('/plan/saved-plans' as any)}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  testID="saved-plans-btn"
                >
                  <Bookmark size={16} color={Colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.saveHeaderBtn}
                onPress={openSaveModal}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                testID="save-plan-btn"
              >
                <Save size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          {activePlanName && (
            <View style={styles.activePlanTag}>
              <Bookmark size={10} color={Colors.success} />
              <Text style={styles.activePlanTagText}>{activePlanName}</Text>
              <TouchableOpacity
                onPress={() => clearActiveMutation.mutate()}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <X size={12} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
          )}

          {(profile.dietary_modifiers ?? []).length > 0 && (
            <View style={styles.modifierRow}>
              {(profile.dietary_modifiers ?? []).map((mod: DietaryModifier) => (
                <View key={mod} style={styles.modifierPill}>
                  <Text style={styles.modifierPillText}>{DIETARY_MODIFIER_LABELS[mod]}</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.headerMacros}>
            <View style={styles.headerMacroItem}>
              <Text style={[styles.headerMacroValue, { color: Colors.protein }]}>{macros.protein_g}g</Text>
              <Text style={styles.headerMacroLabel}>Protein</Text>
            </View>
            <View style={styles.headerDivider} />
            <View style={styles.headerMacroItem}>
              <Text style={[styles.headerMacroValue, { color: Colors.carbs }]}>{macros.carbs_g}g</Text>
              <Text style={styles.headerMacroLabel}>Carbs</Text>
            </View>
            <View style={styles.headerDivider} />
            <View style={styles.headerMacroItem}>
              <Text style={[styles.headerMacroValue, { color: Colors.fat }]}>{macros.fat_g}g</Text>
              <Text style={styles.headerMacroLabel}>Fat</Text>
            </View>
          </View>
        </View>

        {plan.meals.map((meal, idx) => (
          <MealCard
            key={idx}
            meal={meal}
            macros={macros}
            mealIndex={idx}
            onSwapPress={openSheet}
          />
        ))}

        <GrocerySection
          meals={plan.meals}
          planId={activePlanQuery.data?.id ?? 'generated'}
          showToast={showToast}
        />

        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            For general fitness guidance only. Portions are approximate. Adjust based on your needs and preferences.
          </Text>
        </View>
      </ScrollView>

      {/* Swap Sheet */}
      <Modal
        visible={sheetVisible}
        transparent
        animationType="none"
        onRequestClose={closeSheet}
        statusBarTranslucent
      >
        <Pressable style={styles.sheetOverlay} onPress={closeSheet}>
          <Pressable onPress={() => {}}>
            <Animated.View
              style={[
                styles.sheetContainer,
                { transform: [{ translateY: slideAnim }] },
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
                <TouchableOpacity onPress={closeSheet} style={styles.sheetCloseBtn}>
                  <X size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.sheetScroll}
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
                  <TouchableOpacity
                    style={[
                      styles.pagingButton,
                      swapPageIndex === 0 && styles.pagingButtonDisabled,
                    ]}
                    onPress={() => setSwapPageIndex((p) => Math.max(0, p - 1))}
                    disabled={swapPageIndex === 0}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.pagingButtonText,
                        swapPageIndex === 0 && styles.pagingButtonTextDisabled,
                      ]}
                    >
                      Previous
                    </Text>
                  </TouchableOpacity>

                  <Text style={styles.pagingLabel}>
                    {swapRangeStart}–{swapRangeEnd} of {substitutes.length}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.pagingButton,
                      swapPageIndex >= totalSwapPages - 1 && styles.pagingButtonDisabled,
                    ]}
                    onPress={() => setSwapPageIndex((p) => Math.min(totalSwapPages - 1, p + 1))}
                    disabled={swapPageIndex >= totalSwapPages - 1}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.pagingButtonText,
                        swapPageIndex >= totalSwapPages - 1 && styles.pagingButtonTextDisabled,
                      ]}
                    >
                      Next
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Save Plan Sheet */}
      <Modal
        visible={saveModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeSaveModal}
        statusBarTranslucent
      >
        <Pressable style={styles.sheetOverlay} onPress={closeSaveModal}>
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
                <TouchableOpacity onPress={closeSaveModal} style={styles.sheetCloseBtn}>
                  <X size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
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
                  Leave blank for auto: "{MACRO_STRATEGY_LABELS[profile.macro_strategy ?? 'balanced']} Plan – {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}"
                </Text>
              </View>

              <View style={styles.saveFooter}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeSaveModal}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.savePlanButton}
                  onPress={handleSavePlan}
                  activeOpacity={0.7}
                  testID="confirm-save-btn"
                >
                  <Save size={16} color={Colors.white} />
                  <Text style={styles.savePlanButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </Pressable>
        </Pressable>
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
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
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
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
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
  suggestionsLabel: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
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
  suggestionPortion: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  suggestionMacros: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 2,
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
  disclaimer: {
    marginTop: 8,
    padding: 14,
  },
  disclaimerText: {
    color: Colors.textTertiary,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
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
    maxHeight: SCREEN_HEIGHT * 0.6,
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
    maxHeight: SCREEN_HEIGHT * 0.35,
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
