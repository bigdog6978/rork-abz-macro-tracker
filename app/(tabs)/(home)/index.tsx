import React, { useEffect, useCallback } from 'react';
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
import { Flame, Trash2, Ruler, X } from 'lucide-react-native';
import Colors from '../../../constants/colors';
import { Radius, Spacing } from '../../../theme/tokens';
import { formatNumber } from '../../../utils/formatNumber';
import { getGreeting, getProgressLevel } from '../../../utils/greeting';
import { useStaggerFadeIn } from '../../../utils/motion';
import { useUser } from '../../../providers/UserProvider';
import { useDailyLog } from '../../../providers/DailyLogProvider';
import { useMeasurements } from '../../../providers/MeasurementsProvider';
import { MACRO_STRATEGY_LABELS, DIETARY_MODIFIER_LABELS, DietaryModifier } from '../../../types';
import PremiumCard from '../../../components/ui/PremiumCard';
import GreetingHeader from '../../../components/ui/GreetingHeader';
import DashboardBrandHeader from '../../../components/ui/DashboardBrandHeader';
import EmptyState from '../../../components/ui/EmptyState';
import MacroRingComponent, { MacroDial } from '../../../components/ui/MacroRing';
import Fab from '../../../components/ui/Fab';

export default function DashboardScreen() {
  const { profile, macros, isLoading: userLoading } = useUser();
  const { todayEntries, todayTotals, removeEntry, getStreak } = useDailyLog();
  const { showPrompt, hasBaseline, dismissPrompt } = useMeasurements();
  const streak = getStreak();
  const stagger = useStaggerFadeIn(5);

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

  const caloriesRemaining = Math.max(macros.calories - todayTotals.calories, 0);
  const greeting = getGreeting(profile.first_name);
  const progress = getProgressLevel(todayTotals.calories, macros.calories);

  const statusText = (() => {
    if (streak > 1) return `Day ${streak} streak`;
    if (todayEntries.length > 0) return 'On track today';
    return undefined;
  })();

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: greeting, headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <DashboardBrandHeader />
        {/* Greeting */}
        <Animated.View style={[styles.greetingBlock, { opacity: stagger[0], transform: [{ translateY: stagger[0].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
          <GreetingHeader
            firstName={profile.first_name}
            progress={progress}
            statusText={statusText}
          />
          <View style={styles.strategyRow}>
            <View style={styles.strategyTag}>
              <Text style={styles.strategyTagText}>
                {MACRO_STRATEGY_LABELS[profile.macro_strategy ?? 'balanced']} Protocol
              </Text>
            </View>
            {(profile.dietary_modifiers ?? []).map((mod: DietaryModifier) => (
              <View key={mod} style={styles.modifierTag}>
                <Text style={styles.modifierTagText}>{DIETARY_MODIFIER_LABELS[mod]}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Calorie Hero */}
        <Animated.View style={{ opacity: stagger[1], transform: [{ translateY: stagger[1].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          <PremiumCard style={styles.calorieCard} variant="hero">
            <View style={styles.calorieRingSection}>
              <MacroRingComponent
                consumed={todayTotals.calories}
                target={macros.calories}
                color={Colors.primary}
                size={128}
                strokeWidth={10}
                showLabel
              />
              <View style={styles.calorieCenter}>
                <Text style={styles.calorieNumber}>{formatNumber(caloriesRemaining)}</Text>
                <Text style={styles.calorieLabel}>cal left</Text>
              </View>
            </View>
            <View style={styles.calorieInfo}>
              <View style={styles.calorieStatRow}>
                <Text style={styles.calorieStatLabel}>Target</Text>
                <Text style={styles.calorieStatValue}>{formatNumber(macros.calories)}</Text>
              </View>
              <View style={styles.calorieStatRow}>
                <Text style={styles.calorieStatLabel}>Consumed</Text>
                <Text style={[styles.calorieStatValue, { color: Colors.primary }]}>
                  {formatNumber(todayTotals.calories)}
                </Text>
              </View>
              {streak > 0 && (
                <View style={styles.streakBadge}>
                  <Flame size={14} color={Colors.primary} />
                  <Text style={styles.streakText}>{streak} day streak</Text>
                </View>
              )}
            </View>
          </PremiumCard>
        </Animated.View>

        {/* Macro Dials */}
        <Animated.View style={{ opacity: stagger[2], transform: [{ translateY: stagger[2].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          <PremiumCard style={styles.macroDialCard}>
            <MacroDial
              label="Protein"
              consumed={todayTotals.protein_g}
              target={macros.protein_g}
              color={Colors.protein}
            />
            <MacroDial
              label="Carbs"
              consumed={todayTotals.carbs_g}
              target={macros.carbs_g}
              color={Colors.carbs}
            />
            <MacroDial
              label="Fat"
              consumed={todayTotals.fat_g}
              target={macros.fat_g}
              color={Colors.fat}
            />
          </PremiumCard>
        </Animated.View>

        {/* Measurement Prompt */}
        {showPrompt && (
          <Animated.View style={{ opacity: stagger[3] }}>
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
          </Animated.View>
        )}

        {/* Today's Log */}
        <Animated.View style={{ opacity: stagger[4] }}>
          {todayEntries.length > 0 ? (
            <View style={styles.entriesSection}>
              <Text style={styles.sectionTitle}>Today's Log</Text>
              {todayEntries.map((entry) => (
                <PremiumCard key={entry.id} style={styles.entryCard}>
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryName}>{entry.name}</Text>
                    <Text style={styles.entryMacros}>
                      {formatNumber(entry.calories)} cal · {formatNumber(entry.protein_g)}p · {formatNumber(entry.carbs_g)}c · {formatNumber(entry.fat_g)}f
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.entryDelete}
                    onPress={() => handleRemoveEntry(entry.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Trash2 size={16} color={Colors.textTertiary} />
                  </TouchableOpacity>
                </PremiumCard>
              ))}
            </View>
          ) : (
            <EmptyState />
          )}
        </Animated.View>
      </ScrollView>

      <Fab onPress={handleAddFood} testID="add-food-button" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  greetingBlock: {
    marginTop: 10,
  },
  strategyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  strategyTag: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  strategyTagText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  modifierTag: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.sm,
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
    padding: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
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
    fontSize: 28,
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
    gap: 10,
  },
  calorieStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calorieStatValue: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  calorieStatLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  streakText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  macroDialCard: {
    flexDirection: 'row',
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  entriesSection: {
    marginTop: Spacing.xxl,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: Spacing.md,
  },
  entryCard: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
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
  promptBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.successMuted,
    borderRadius: Radius.lg,
    padding: 14,
    marginTop: Spacing.lg,
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
    borderRadius: Radius.sm,
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
