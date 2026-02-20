import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Plus, Flame, Beef, Wheat, Droplets, Trash2, Ruler, X } from 'lucide-react-native';
import Colors from '../../../constants/colors';
import { useUser } from '../../../providers/UserProvider';
import { useDailyLog } from '../../../providers/DailyLogProvider';
import { useMeasurements } from '../../../providers/MeasurementsProvider';
import { MACRO_STRATEGY_LABELS, DIETARY_MODIFIER_LABELS, DietaryModifier } from '../../../types';

function MacroRing({
  consumed,
  target,
  color,
  size,
  strokeWidth,
}: {
  consumed: number;
  target: number;
  color: string;
  size: number;
  strokeWidth: number;
}) {
  const progress = target > 0 ? Math.min(consumed / target, 1) : 0;
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: progress,
      useNativeDriver: false,
      tension: 40,
      friction: 12,
    }).start();
  }, [progress, animValue]);

  const circumference = 2 * Math.PI * ((size - strokeWidth) / 2);

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: Colors.cardElevated,
          position: 'absolute',
        }}
      />
      <Animated.View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderLeftColor: 'transparent',
          borderBottomColor: 'transparent',
          position: 'absolute',
          transform: [
            {
              rotate: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['-45deg', '315deg'],
              }),
            },
          ],
        }}
      />
    </View>
  );
}

function MacroBar({
  label,
  consumed,
  target,
  color,
  mutedColor,
  icon,
  unit,
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
  mutedColor: string;
  icon: React.ReactNode;
  unit: string;
}) {
  const progress = target > 0 ? Math.min(consumed / target, 1) : 0;
  const animWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animWidth, {
      toValue: progress,
      useNativeDriver: false,
      tension: 40,
      friction: 12,
    }).start();
  }, [progress, animWidth]);

  const remaining = Math.max(target - consumed, 0);

  return (
    <View style={styles.macroBarContainer}>
      <View style={styles.macroBarHeader}>
        <View style={styles.macroBarLeft}>
          <View style={[styles.macroIcon, { backgroundColor: mutedColor }]}>{icon}</View>
          <Text style={styles.macroBarLabel}>{label}</Text>
        </View>
        <View style={styles.macroBarRight}>
          <Text style={[styles.macroBarConsumed, { color }]}>{consumed}{unit}</Text>
          <Text style={styles.macroBarTarget}> / {target}{unit}</Text>
        </View>
      </View>
      <View style={styles.macroBarTrack}>
        <Animated.View
          style={[
            styles.macroBarFill,
            {
              backgroundColor: color,
              width: animWidth.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <Text style={styles.macroBarRemaining}>{remaining}{unit} remaining</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const { profile, macros, isLoading: userLoading } = useUser();
  const { todayEntries, todayTotals, removeEntry, getStreak } = useDailyLog();
  const { showPrompt, hasBaseline, dismissPrompt } = useMeasurements();
  const streak = getStreak();

  useEffect(() => {
    if (userLoading) return;
    if (!profile.first_name) {
      router.replace('/welcome' as never);
    } else if (!profile.onboarding_complete) {
      router.replace('/onboarding' as never);
    }
  }, [userLoading, profile.first_name, profile.onboarding_complete]);

  const handleAddFood = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/add-food' as never);
  }, []);

  const handleRemoveEntry = useCallback(
    (id: string) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      removeEntry(id);
    },
    [removeEntry]
  );

  if (userLoading || !profile.first_name || !profile.onboarding_complete) {
    return <View style={styles.container} />;
  }

  const caloriePercent = macros.calories > 0
    ? Math.round((todayTotals.calories / macros.calories) * 100)
    : 0;
  const caloriesRemaining = Math.max(macros.calories - todayTotals.calories, 0);
  const greeting = (() => {
    const name = profile.first_name?.trim();
    if (!name) return 'Welcome to Physiq!';
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return `Good morning, ${name}!`;
    if (hour >= 12 && hour < 17) return `Good afternoon, ${name}!`;
    return `Good evening, ${name}!`;
  })();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: greeting }} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.strategyRow}>
          <View style={styles.strategyTag}>
            <Text style={styles.strategyTagText}>
              {MACRO_STRATEGY_LABELS[profile.macro_strategy ?? 'balanced']}
            </Text>
          </View>
          {(profile.dietary_modifiers ?? []).map((mod: DietaryModifier) => (
            <View key={mod} style={styles.modifierTag}>
              <Text style={styles.modifierTagText}>{DIETARY_MODIFIER_LABELS[mod]}</Text>
            </View>
          ))}
        </View>

        <View style={styles.calorieCard}>
          <View style={styles.calorieRingSection}>
            <MacroRing
              consumed={todayTotals.calories}
              target={macros.calories}
              color={Colors.primary}
              size={120}
              strokeWidth={8}
            />
            <View style={styles.calorieCenter}>
              <Text style={styles.calorieNumber}>{caloriesRemaining}</Text>
              <Text style={styles.calorieLabel}>cal left</Text>
            </View>
          </View>
          <View style={styles.calorieInfo}>
            <View style={styles.calorieRow}>
              <View style={styles.calorieStat}>
                <Text style={styles.calorieStatValue}>{macros.calories}</Text>
                <Text style={styles.calorieStatLabel}>Target</Text>
              </View>
              <View style={styles.calorieStat}>
                <Text style={[styles.calorieStatValue, { color: Colors.primary }]}>
                  {todayTotals.calories}
                </Text>
                <Text style={styles.calorieStatLabel}>Consumed</Text>
              </View>
            </View>
            {streak > 0 && (
              <View style={styles.streakBadge}>
                <Flame size={14} color={Colors.primary} />
                <Text style={styles.streakText}>{streak} day streak</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.macrosSection}>
          <MacroBar
            label="Protein"
            consumed={todayTotals.protein_g}
            target={macros.protein_g}
            color={Colors.protein}
            mutedColor={Colors.proteinMuted}
            icon={<Beef size={14} color={Colors.protein} />}
            unit="g"
          />
          <MacroBar
            label="Carbs"
            consumed={todayTotals.carbs_g}
            target={macros.carbs_g}
            color={Colors.carbs}
            mutedColor={Colors.carbsMuted}
            icon={<Wheat size={14} color={Colors.carbs} />}
            unit="g"
          />
          <MacroBar
            label="Fat"
            consumed={todayTotals.fat_g}
            target={macros.fat_g}
            color={Colors.fat}
            mutedColor={Colors.fatMuted}
            icon={<Droplets size={14} color={Colors.fat} />}
            unit="g"
          />
        </View>

        {showPrompt && (
          <View style={styles.promptBanner}>
            <View style={styles.promptLeft}>
              <View style={styles.promptIcon}>
                <Ruler size={16} color={Colors.success} />
              </View>
              <View style={styles.promptTextCol}>
                <Text style={styles.promptTitle}>
                  {hasBaseline ? 'Update Measurements' : 'Add Baseline Measurements'}
                </Text>
                <Text style={styles.promptSubtitle}>
                  {hasBaseline ? 'Track your progress beyond the scale' : 'Start tracking progress beyond weight'}
                </Text>
              </View>
            </View>
            <View style={styles.promptActions}>
              <TouchableOpacity
                style={styles.promptCta}
                onPress={() => router.push('/add-measurement' as never)}
                activeOpacity={0.7}
              >
                <Text style={styles.promptCtaText}>Go</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.promptDismiss}
                onPress={() => dismissPrompt()}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={14} color={Colors.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {todayEntries.length > 0 && (
          <View style={styles.entriesSection}>
            <Text style={styles.sectionTitle}>Today's Log</Text>
            {todayEntries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryInfo}>
                  <Text style={styles.entryName}>{entry.name}</Text>
                  <Text style={styles.entryMacros}>
                    {entry.calories} cal · {entry.protein_g}p · {entry.carbs_g}c · {entry.fat_g}f
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.entryDelete}
                  onPress={() => handleRemoveEntry(entry.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Trash2 size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {todayEntries.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to log your first meal</Text>
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddFood}
        activeOpacity={0.85}
        testID="add-food-button"
      >
        <Plus size={26} color={Colors.white} />
      </TouchableOpacity>
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
    paddingBottom: 100,
  },
  strategyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  strategyTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.primaryMuted,
  },
  strategyTagText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700' as const,
  },
  modifierTag: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  modifierTagText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  calorieCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  calorieRingSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  calorieNumber: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  calorieLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  calorieInfo: {
    flex: 1,
    gap: 14,
  },
  calorieRow: {
    gap: 12,
  },
  calorieStat: {},
  calorieStatValue: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  calorieStatLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  streakText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  macrosSection: {
    marginTop: 16,
    gap: 12,
  },
  macroBarContainer: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  macroBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  macroBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  macroIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  macroBarLabel: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  macroBarRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  macroBarConsumed: {
    fontSize: 16,
    fontWeight: '700' as const,
  },
  macroBarTarget: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  macroBarTrack: {
    height: 6,
    backgroundColor: Colors.cardElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  macroBarRemaining: {
    color: Colors.textTertiary,
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500' as const,
  },
  entriesSection: {
    marginTop: 24,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  entryCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  entryInfo: {
    flex: 1,
  },
  entryName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  entryMacros: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 3,
    fontWeight: '500' as const,
  },
  entryDelete: {
    padding: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  emptySubtitle: {
    color: Colors.textTertiary,
    fontSize: 14,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  promptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.successMuted,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.25)',
  },
  promptLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  promptIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(52, 211, 153, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptTextCol: {
    flex: 1,
  },
  promptTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  promptSubtitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  promptActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promptCta: {
    backgroundColor: Colors.success,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  promptCtaText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  promptDismiss: {
    padding: 4,
  },
});
