import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Dimensions,
} from 'react-native';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Flame, Trash2, Ruler, X, ChevronRight } from 'lucide-react-native';
import Colors from '../../../constants/colors';
import { Radius, Spacing } from '../../../theme/tokens';
import { formatNumber } from '../../../utils/formatNumber';
import { getGreeting, getProgressLevel } from '../../../utils/greeting';
import { useStaggerFadeIn } from '../../../utils/motion';
import { useUser } from '../../../providers/UserProvider';
import { useDailyLog } from '../../../providers/DailyLogProvider';
import { useMeasurements } from '../../../providers/MeasurementsProvider';
import { EATING_STYLE_LABELS, DIETARY_MODIFIER_LABELS, DietaryModifier } from '../../../types';
import PremiumCard from '../../../components/ui/PremiumCard';
import GreetingHeader from '../../../components/ui/GreetingHeader';
import DashboardBrandHeader from '../../../components/ui/DashboardBrandHeader';
import EmptyState from '../../../components/ui/EmptyState';
import CalorieGauge from '../../../components/ui/CalorieGauge';
import { MacroDial } from '../../../components/ui/MacroRing';
import Fab from '../../../components/ui/Fab';
import WhyTheseMacrosCard from '../../../components/ui/WhyTheseMacrosCard';

const { width: screenWidth } = Dimensions.get('window');
const CARD_HORIZONTAL_PADDING = 18;
const GAP = 20;
const STATS_MIN_WIDTH = 165;
const IS_NARROW = screenWidth < 380;

function getDialSize(cardWidth: number): number {
  const effectiveWidth = cardWidth > 0 ? cardWidth : Math.floor(screenWidth * 0.85);
  const dialMax = effectiveWidth - STATS_MIN_WIDTH - GAP;
  return Math.min(230, Math.max(120, Math.floor(dialMax)));
}

export default function DashboardScreen() {
  const { profile, macros, isLoading: userLoading } = useUser();
  const [cardWidth, setCardWidth] = useState(0);

  const dialSize = useMemo(() => getDialSize(cardWidth), [cardWidth]);
  const dialStrokeWidth = useMemo(() => Math.round(dialSize * 0.078), [dialSize]);
  const dialNumberSize = useMemo(() => Math.round(dialSize * 0.255), [dialSize]);
  const dialNumberLine = useMemo(() => Math.round(dialNumberSize * 1.02), [dialNumberSize]);
  const dialSubSize = useMemo(() => Math.max(13, Math.round(dialSize * 0.065)), [dialSize]);
  const dialSubGap = useMemo(() => Math.round(dialSize * 0.035), [dialSize]);
  // Shift block down so the number's vertical center aligns with dial center (block center is below number center due to "cal left")
  const dialCenterOffsetY = useMemo(
    () => Math.round((dialSubGap + dialSubSize) / 2),
    [dialSubGap, dialSubSize]
  );
  const { todayEntries, todayTotals, removeEntry, getStreak } = useDailyLog();
  const { showPrompt, hasBaseline, dismissPrompt } = useMeasurements();
  const streak = getStreak();
  const stagger = useStaggerFadeIn(5);

  useEffect(() => {
    if (userLoading) return;
    if (!profile.firstName) {
      router.replace('/welcome' as never);
    } else if (!profile.onboardingComplete) {
      router.replace('/onboarding' as never);
    }
  }, [userLoading, profile.firstName, profile.onboardingComplete]);

  const handleAddFood = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/add-food' as never);
  }, []);

  const handleEditEntry = useCallback(
    (id: string) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      router.push({ pathname: '/edit-log-entry', params: { entryId: id } } as never);
    },
    []
  );

  const handleRemoveEntry = useCallback(
    (id: string) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      removeEntry(id);
    },
    [removeEntry]
  );

  if (userLoading || !profile.firstName || !profile.onboardingComplete) {
    return <View style={styles.container} />;
  }

  const caloriesRemaining = Math.max(macros.calories - todayTotals.calories, 0);
  const greeting = getGreeting(profile.firstName);
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
            firstName={profile.firstName}
            progress={progress}
            statusText={statusText}
          />
          <View style={styles.strategyRow}>
            <View style={styles.strategyTag}>
              <Text style={styles.strategyTagText}>
                {EATING_STYLE_LABELS[profile.eatingStyle]}
              </Text>
            </View>
            {(profile.dietModifiers ?? []).map((mod: DietaryModifier) => (
              <View key={mod} style={styles.modifierTag}>
                <Text style={styles.modifierTagText}>{DIETARY_MODIFIER_LABELS[mod]}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Calorie Hero */}
        <Animated.View style={{ opacity: stagger[1], transform: [{ translateY: stagger[1].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          <PremiumCard style={styles.calorieCard} variant="hero">
            <View
              style={[styles.calorieCardInner, IS_NARROW && styles.calorieCardInnerNarrow]}
              onLayout={(e) => setCardWidth(e.nativeEvent.layout.width - 2 * CARD_HORIZONTAL_PADDING)}
            >
              <View style={[styles.dialCol, { width: dialSize, height: dialSize, marginRight: GAP }]}>
                <View style={{ width: dialSize, height: dialSize }}>
                  <CalorieGauge
                    consumed={todayTotals.calories}
                    target={macros.calories}
                    color={Colors.primary}
                    size={dialSize}
                    strokeWidth={dialStrokeWidth}
                  />
                  <View style={[styles.dialCenterOverlay, { transform: [{ translateY: dialCenterOffsetY }] }]}>
                    <Text
                      style={[
                        styles.dialNumber,
                        {
                          fontSize: dialNumberSize,
                          lineHeight: dialNumberLine,
                          fontVariant: ['tabular-nums'],
                        },
                      ]}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1}
                    >
                      {formatNumber(caloriesRemaining)}
                    </Text>
                    <Text
                      style={[styles.dialSub, { fontSize: dialSubSize, marginTop: dialSubGap }]}
                      numberOfLines={1}
                      maxFontSizeMultiplier={1}
                    >
                      cal left
                    </Text>
                  </View>
                </View>
              </View>
              <View style={[styles.statsCol, IS_NARROW && styles.statsColNarrow]}>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel} numberOfLines={1}>Target</Text>
                  <Text
                    style={styles.statValue}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    maxFontSizeMultiplier={1}
                  >
                    {formatNumber(macros.calories)}
                  </Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statLabel} numberOfLines={1}>Consumed</Text>
                  <Text
                    style={styles.statValueAccent}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                    maxFontSizeMultiplier={1}
                  >
                    {formatNumber(todayTotals.calories)}
                  </Text>
                </View>
                {streak > 0 && (
                  <View style={styles.streakWrap}>
                    <View style={styles.streakBadge}>
                      <Flame size={14} color={Colors.primary} />
                      <Text style={styles.streakText}>{streak} day streak</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </PremiumCard>
        </Animated.View>

        {/* Macro Dials */}
        <Animated.View style={{ opacity: stagger[2], transform: [{ translateY: stagger[2].interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}>
          <PremiumCard style={styles.macroDialCard}>
            <View style={styles.macroDialRow}>
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
            </View>
            <WhyTheseMacrosCard
              macros={macros}
              onViewMethodology={() => router.push('/settings/nutrition-science' as never)}
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
                  <TouchableOpacity
                    style={styles.entryTapArea}
                    onPress={() => handleEditEntry(entry.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryName}>{entry.name}</Text>
                      <Text style={styles.entryMacros}>
                        {formatNumber(entry.calories)} cal · {formatNumber(entry.protein_g)}p · {formatNumber(entry.carbs_g)}c · {formatNumber(entry.fat_g)}f
                      </Text>
                    </View>
                    <ChevronRight size={18} color={Colors.textTertiary} style={styles.entryChevron} />
                  </TouchableOpacity>
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
    backgroundColor: 'transparent',
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
    width: '100%',
    overflow: 'hidden',
  },
  calorieCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: CARD_HORIZONTAL_PADDING,
    paddingVertical: 22,
  },
  calorieCardInnerNarrow: {
    flexDirection: 'column',
  },
  dialCol: {
    flexShrink: 1,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialCenterOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialNumber: {
    fontWeight: '800' as const,
    color: Colors.text,
    textAlign: 'center' as const,
  },
  dialSub: {
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  statsCol: {
    flex: 1,
    minWidth: STATS_MIN_WIDTH,
    flexShrink: 0,
    justifyContent: 'center',
  },
  statsColNarrow: {
    width: '100%',
    alignItems: 'center',
    marginTop: 14,
  },
  statRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  statLabel: {
    flexShrink: 0,
    width: 82,
    fontSize: 16,
    color: Colors.textSecondary,
  },
  statValue: {
    flex: 1,
    fontSize: 30,
    fontWeight: '800' as const,
    color: Colors.text,
    minWidth: 56,
    textAlign: 'right' as const,
  },
  statValueAccent: {
    flex: 1,
    fontSize: 30,
    fontWeight: '800' as const,
    color: Colors.primary,
    minWidth: 56,
    textAlign: 'right' as const,
  },
  streakWrap: {
    marginTop: 6,
    alignItems: 'flex-end',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  streakText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  macroDialCard: {
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  macroDialRow: {
    flexDirection: 'row',
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
