import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Animated,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bookmark,
  Trash2,
  Play,
  ChevronDown,
  ChevronUp,
  Sunrise,
  Sun,
  Moon,
  Cookie,
  Check,
  Clock,
  Zap,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Colors from '../../../constants/colors';
import { formatNumber } from '../../../utils/formatNumber';
import {
  EATING_STYLE_LABELS,
  DIETARY_MODIFIER_LABELS,
  SavedMealPlan,
  MealSlot,
  DietaryModifier,
} from '../../../types';
import {
  getAllSavedMealPlans,
  getActiveMealPlan,
  setActiveMealPlan,
  deleteMealPlan,
} from '../../../storage/mealPlanRepo';

const MEAL_ICONS: Record<string, React.ReactNode> = {
  sunrise: <Sunrise size={14} color={Colors.primary} />,
  sun: <Sun size={14} color={Colors.warning} />,
  moon: <Moon size={14} color={Colors.carbs} />,
  cookie: <Cookie size={14} color={Colors.fat} />,
};

function MealPreview({ meal }: { meal: MealSlot }) {
  return (
    <View style={styles.mealPreview}>
      <View style={styles.mealPreviewHeader}>
        <View style={styles.mealPreviewIcon}>
          {MEAL_ICONS[meal.icon] ?? <Sun size={14} color={Colors.primary} />}
        </View>
        <Text style={styles.mealPreviewName}>{meal.name}</Text>
        <Text style={styles.mealPreviewPercent}>{Math.round(meal.percentage * 100)}%</Text>
      </View>
      {meal.suggestions.map((food) => (
        <View key={food.id} style={styles.foodPreviewRow}>
          <View style={styles.foodPreviewDot}>
            {food.isSwapped ? (
              <View style={styles.swappedDot} />
            ) : (
              <View style={styles.normalDot} />
            )}
          </View>
          <Text style={styles.foodPreviewName} numberOfLines={1}>{food.name}</Text>
          <Text style={styles.foodPreviewCal}>{formatNumber(food.calories)} cal</Text>
        </View>
      ))}
    </View>
  );
}

function SavedPlanCard({
  plan,
  isActive,
  onLoad,
  onDelete,
}: {
  plan: SavedMealPlan;
  isActive: boolean;
  onLoad: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;

  const toggleExpand = useCallback(() => {
    const toValue = expanded ? 0 : 1;
    setExpanded(!expanded);
    Animated.spring(expandAnim, {
      toValue,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [expanded, expandAnim]);

  const totalCalories = plan.macroTargets.calories;
  const totalSwaps = Object.keys(plan.substitutionMap ?? {}).length;
  const createdDate = new Date(plan.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const modifiers = plan.dietaryModifiers ?? [];

  return (
    <View style={[styles.planCard, isActive && styles.planCardActive]}>
      <TouchableOpacity
        style={styles.planCardHeader}
        onPress={toggleExpand}
        activeOpacity={0.7}
        testID={`plan-card-${plan.id}`}
      >
        <View style={styles.planCardLeft}>
          <View style={styles.planNameRow}>
            <Text style={styles.planName} numberOfLines={1}>{plan.name}</Text>
            {isActive && (
              <View style={styles.activeBadge}>
                <Zap size={8} color={Colors.success} />
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>

          <View style={styles.planMetaRow}>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>
                {EATING_STYLE_LABELS[plan.eatingStyle]}
              </Text>
            </View>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.planCalories}>{formatNumber(totalCalories)} cal</Text>
            {totalSwaps > 0 && (
              <>
                <Text style={styles.metaDot}>·</Text>
                <Text style={styles.planSwaps}>{totalSwaps} swap{totalSwaps !== 1 ? 's' : ''}</Text>
              </>
            )}
          </View>

          <View style={styles.planDateRow}>
            <Clock size={10} color={Colors.textTertiary} />
            <Text style={styles.planDate}>{createdDate}</Text>
          </View>
        </View>

        <View style={styles.planCardRight}>
          {expanded ? (
            <ChevronUp size={18} color={Colors.textSecondary} />
          ) : (
            <ChevronDown size={18} color={Colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.planExpandedContent}>
          {modifiers.length > 0 && (
            <View style={styles.modifierRow}>
              {modifiers.map((mod: DietaryModifier) => (
                <View key={mod} style={styles.modifierPill}>
                  <Text style={styles.modifierPillText}>
                    {DIETARY_MODIFIER_LABELS[mod]}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.macroSummary}>
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: Colors.protein }]}>
                {formatNumber(plan.macroTargets.protein_g)}g
              </Text>
              <Text style={styles.macroLabel}>Protein</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: Colors.carbs }]}>
                {formatNumber(plan.macroTargets.carbs_g)}g
              </Text>
              <Text style={styles.macroLabel}>Carbs</Text>
            </View>
            <View style={styles.macroDivider} />
            <View style={styles.macroItem}>
              <Text style={[styles.macroValue, { color: Colors.fat }]}>
                {formatNumber(plan.macroTargets.fat_g)}g
              </Text>
              <Text style={styles.macroLabel}>Fat</Text>
            </View>
          </View>

          <View style={styles.mealsSection}>
            {plan.meals.map((meal, idx) => (
              <MealPreview key={idx} meal={meal} />
            ))}
          </View>

          <View style={styles.planActions}>
            {!isActive && (
              <TouchableOpacity
                style={styles.loadButton}
                onPress={onLoad}
                activeOpacity={0.7}
                testID={`load-plan-${plan.id}`}
              >
                <Play size={14} color={Colors.white} />
                <Text style={styles.loadButtonText}>Load Plan</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={onDelete}
              activeOpacity={0.7}
              testID={`delete-plan-${plan.id}`}
            >
              <Trash2 size={14} color={Colors.danger} />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default function SavedPlansScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

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

  const savedPlansQuery = useQuery({
    queryKey: ['saved_meal_plans'],
    queryFn: getAllSavedMealPlans,
  });

  const activePlanQuery = useQuery({
    queryKey: ['active_meal_plan'],
    queryFn: getActiveMealPlan,
  });

  const loadPlanMutation = useMutation({
    mutationFn: async (plan: SavedMealPlan) => {
      await setActiveMealPlan(plan.id);
      return plan;
    },
    onSuccess: (plan) => {
      queryClient.invalidateQueries({ queryKey: ['active_meal_plan'] });
      queryClient.invalidateQueries({ queryKey: ['saved_meal_plans'] });
      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      showToast(`"${plan.name}" is now active`);
      console.log('[SavedPlans] Loaded plan:', plan.name);
    },
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      await deleteMealPlan(planId);
      return planId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved_meal_plans'] });
      queryClient.invalidateQueries({ queryKey: ['active_meal_plan'] });
      showToast('Plan deleted');
    },
  });

  const handleDelete = useCallback((planId: string, planName: string) => {
    Alert.alert(
      'Delete Plan',
      `Delete "${planName}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deletePlanMutation.mutate(planId),
        },
      ]
    );
  }, [deletePlanMutation]);

  const plans = savedPlansQuery.data ?? [];
  const activePlanId = activePlanQuery.data?.id ?? null;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {plans.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconContainer}>
              <Bookmark size={36} color={Colors.textTertiary} />
            </View>
            <Text style={styles.emptyTitle}>No Saved Plans</Text>
            <Text style={styles.emptySubtitle}>
              Save a meal plan from the Meal Plan screen to access it here anytime.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <Text style={styles.emptyButtonText}>Go to Meal Plan</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.summaryBar}>
              <Text style={styles.summaryText}>
                {plans.length} saved plan{plans.length !== 1 ? 's' : ''}
              </Text>
            </View>
            {plans.map((plan) => (
              <SavedPlanCard
                key={plan.id}
                plan={plan}
                isActive={plan.id === activePlanId}
                onLoad={() => loadPlanMutation.mutate(plan)}
                onDelete={() => handleDelete(plan.id, plan.name)}
              />
            ))}
          </>
        )}
      </ScrollView>

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
    flexGrow: 1,
  },
  summaryBar: {
    marginBottom: 16,
  },
  summaryText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  planCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  planCardActive: {
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  planCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  planCardLeft: {
    flex: 1,
  },
  planNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planName: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
    flexShrink: 1,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.successMuted,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  activeBadgeText: {
    color: Colors.success,
    fontSize: 10,
    fontWeight: '700' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  planMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  metaChip: {
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
  },
  metaChipText: {
    color: Colors.primary,
    fontSize: 11,
    fontWeight: '700' as const,
  },
  metaDot: {
    color: Colors.textTertiary,
    fontSize: 12,
  },
  planCalories: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  planSwaps: {
    color: Colors.success,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  planDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 5,
  },
  planDate: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '500' as const,
  },
  planCardRight: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  planExpandedContent: {
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  modifierRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
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
  macroSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardElevated,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroValue: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  macroLabel: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600' as const,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  macroDivider: {
    width: 1,
    height: 24,
    backgroundColor: Colors.cardBorder,
  },
  mealsSection: {
    gap: 8,
    marginBottom: 14,
  },
  mealPreview: {
    backgroundColor: Colors.cardElevated,
    borderRadius: 10,
    padding: 12,
  },
  mealPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  mealPreviewIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealPreviewName: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700' as const,
    flex: 1,
  },
  mealPreviewPercent: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  foodPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 3,
    paddingLeft: 4,
  },
  foodPreviewDot: {
    width: 14,
    alignItems: 'center',
  },
  normalDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
  },
  swappedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.success,
  },
  foodPreviewName: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
    flex: 1,
  },
  foodPreviewCal: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  planActions: {
    flexDirection: 'row',
    gap: 10,
  },
  loadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  loadButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.dangerMuted,
  },
  deleteButtonText: {
    color: Colors.danger,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  emptyTitle: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500' as const,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
  },
  emptyButtonText: {
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
