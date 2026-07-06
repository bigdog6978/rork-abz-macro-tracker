import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { playFeedback } from '../../../utils/interactionFeedback';
import { track } from '../../../services/analytics';
import { Flame, Trash2, Ruler, X, ChevronRight, Pencil, ChevronDown, Droplet, Activity, Dumbbell, Moon } from 'lucide-react-native';
import Colors from '../../../constants/colors';
import { Radius, Spacing } from '../../../theme/tokens';
import { formatNumber } from '../../../utils/formatNumber';
import { getGreeting, getProgressLevel } from '../../../utils/greeting';
import { useStaggerFadeIn } from '../../../utils/motion';
import { useUser } from '../../../providers/UserProvider';
import { useDailyLog } from '../../../providers/DailyLogProvider';
import { useMeasurements } from '../../../providers/MeasurementsProvider';
import { usePro } from '../../../providers/ProProvider';
import { useDashboardTargets } from '../../../hooks/useDashboardTargets';
import { formatHydrationProgress } from '../../../utils/hydration';
import { DAY_TYPE_TILE_GAP } from '../../../components/ui/DayTypeTileGrid';
import HydrationActionTileGrid from '../../../components/ui/HydrationActionTileGrid';
import type { ProDayType } from '../../../features/pro/types';
import { DAY_TYPE_PICKER_SHORT_LABELS } from '../../../features/pro/constants';
import { EATING_STYLE_LABELS, DIETARY_MODIFIER_LABELS, DietaryModifier, MacroTargets } from '../../../types';
import PremiumCard from '../../../components/ui/PremiumCard';
import GreetingHeader from '../../../components/ui/GreetingHeader';
import DashboardBrandHeader from '../../../components/ui/DashboardBrandHeader';
import EmptyState from '../../../components/ui/EmptyState';
import CalorieGauge from '../../../components/ui/CalorieGauge';
import { MacroDial } from '../../../components/ui/MacroRing';
import Fab from '../../../components/ui/Fab';
import PhysiqPressable from '../../../components/ui/PhysiqPressable';
import WhyTheseMacrosCard from '../../../components/ui/WhyTheseMacrosCard';
import DayTypePickerModal from '../../../components/ui/DayTypePickerModal';
import { useThemeColors, type AppColors } from '../../../providers/ThemeProvider';
import ResponsiveContainer, { useIsTablet } from '../../../components/ui/ResponsiveContainer';

const CARD_HORIZONTAL_PADDING = 18;
const GAP = 20;
const STATS_MIN_WIDTH = 165;

function getDialSize(cardWidth: number, screenWidth: number, isTablet: boolean): number {
  const effectiveWidth = cardWidth > 0 ? cardWidth : Math.floor(screenWidth * 0.85);
  const dialMax = effectiveWidth - STATS_MIN_WIDTH - GAP;
  const maxCap = isTablet ? 320 : 230;
  return Math.min(maxCap, Math.max(120, Math.floor(dialMax)));
}

function getHydrationTileSide(cardWidth: number, screenWidth: number, dialSize: number): number {
  const effectiveWidth = cardWidth > 0 ? cardWidth : Math.floor(screenWidth * 0.85);
  const innerWidth = effectiveWidth - CARD_HORIZONTAL_PADDING * 2;
  const colWidth = Math.max(STATS_MIN_WIDTH, innerWidth - dialSize - GAP);
  return Math.max(44, Math.min(80, Math.floor((colWidth - DAY_TYPE_TILE_GAP) / 2)));
}

function dayTypeMeta(dayType: ProDayType): { label: string; icon: typeof Activity } {
  switch (dayType) {
    case 'workout_day':
      return { label: 'Training day', icon: Dumbbell };
    case 'high_activity_day':
      return { label: 'Active day', icon: Activity };
    case 'rest_day':
    default:
      return { label: 'Rest day', icon: Moon };
  }
}

// ─── CustomMacrosModal ───────────────────────────────────────────────────────

type MacroFieldKey = 'calories' | 'protein' | 'carbs' | 'fat';

function CustomMacrosModal({
  visible,
  currentMacros,
  isCustom,
  onSave,
  onReset,
  onClose,
}: {
  visible: boolean;
  currentMacros: MacroTargets;
  isCustom: boolean;
  onSave: (m: MacroTargets) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createModalStyles(colors), [colors]);
  const [calories, setCalories] = useState(String(currentMacros.calories));
  const [protein, setProtein] = useState(String(currentMacros.protein_g));
  const [carbs, setCarbs] = useState(String(currentMacros.carbs_g));
  const [fat, setFat] = useState(String(currentMacros.fat_g));
  const [errors, setErrors] = useState<Partial<Record<MacroFieldKey, string>>>({});

  const ref0 = useRef<TextInput>(null);
  const ref1 = useRef<TextInput>(null);
  const ref2 = useRef<TextInput>(null);
  const ref3 = useRef<TextInput>(null);
  const inputRefs = [ref0, ref1, ref2, ref3];

  useEffect(() => {
    if (visible) {
      setCalories(String(currentMacros.calories));
      setProtein(String(currentMacros.protein_g));
      setCarbs(String(currentMacros.carbs_g));
      setFat(String(currentMacros.fat_g));
      setErrors({});
    }
  }, [visible, currentMacros]);

  const handleSave = () => {
    Keyboard.dismiss();
    const parsed: Record<MacroFieldKey, number> = {
      calories: parseInt(calories, 10),
      protein: parseInt(protein, 10),
      carbs: parseInt(carbs, 10),
      fat: parseInt(fat, 10),
    };
    const nextErrors: Partial<Record<MacroFieldKey, string>> = {};
    (['calories', 'protein', 'fat'] as MacroFieldKey[]).forEach((key) => {
      if (!Number.isFinite(parsed[key]) || parsed[key] <= 0) {
        nextErrors[key] = 'Enter a number greater than 0.';
      }
    });
    if (!Number.isFinite(parsed.carbs) || parsed.carbs < 0) {
      nextErrors.carbs = 'Enter 0 or a positive number.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSave({ calories: parsed.calories, protein_g: parsed.protein, carbs_g: parsed.carbs, fat_g: parsed.fat });
  };

  const fields: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    color: string;
    errorKey: MacroFieldKey;
  }[] = [
    { label: 'Calories', value: calories, onChange: setCalories, color: Colors.calories, errorKey: 'calories' },
    { label: 'Protein (g)', value: protein, onChange: setProtein, color: Colors.protein, errorKey: 'protein' },
    { label: 'Carbs (g)', value: carbs, onChange: setCarbs, color: Colors.carbs, errorKey: 'carbs' },
    { label: 'Fat (g)', value: fat, onChange: setFat, color: Colors.fat, errorKey: 'fat' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <PhysiqPressable
        feedback="tap"
        style={styles.backdrop}
        onPress={() => {
          if (Keyboard.isVisible()) {
            Keyboard.dismiss();
          } else {
            onClose();
          }
        }}
      >
        <View style={StyleSheet.absoluteFill} />
      </PhysiqPressable>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheet}
      >
        <View style={styles.sheetHeader}>
          <View style={{ flex: 1 }} />
          <PhysiqPressable
            feedback="tap"
            onPress={Keyboard.dismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronDown size={20} color={colors.textTertiary} />
          </PhysiqPressable>
        </View>
        <Text style={styles.title}>Set Custom Targets</Text>
        <Text style={styles.subtitle}>Override your calculated daily targets.</Text>
        {fields.map(({ label, value, onChange, color, errorKey }, index) => {
          const fieldError = errors[errorKey];
          return (
            <View key={label} style={styles.fieldRowWrap}>
              <View style={styles.fieldRow}>
                <Text style={[styles.fieldLabel, { color }]}>{label}</Text>
                <TextInput
                  ref={inputRefs[index]}
                  style={[styles.fieldInput, { borderColor: fieldError ? Colors.danger : color }]}
                  value={value}
                  onChangeText={onChange}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={colors.textTertiary}
                  returnKeyType={index < 3 ? 'next' : 'done'}
                  blurOnSubmit={false}
                  accessibilityLabel={label}
                  onSubmitEditing={() => {
                    if (index < 3) {
                      inputRefs[index + 1].current?.focus();
                    } else {
                      Keyboard.dismiss();
                    }
                  }}
                />
              </View>
              {fieldError ? <Text style={styles.fieldError}>{fieldError}</Text> : null}
            </View>
          );
        })}
        <PhysiqPressable
          feedback="confirm"
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Save custom targets"
        >
          <Text style={[styles.btnText, { color: colors.onPrimary ?? colors.white }]}>
            Save Targets
          </Text>
        </PhysiqPressable>
        {isCustom && (
          <PhysiqPressable
            feedback="tap"
            style={styles.resetBtn}
            onPress={onReset}
            accessibilityRole="button"
            accessibilityLabel="Reset to calculated targets"
          >
            <Text style={styles.resetBtnText}>Reset to Calculated</Text>
          </PhysiqPressable>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── DashboardScreen ─────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { profile, macros, customMacros, setCustomMacros, isLoading: userLoading } = useUser();
  const { targets: dashboardTargets } = useDashboardTargets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [cardWidth, setCardWidth] = useState(0);
  const [editMacrosVisible, setEditMacrosVisible] = useState(false);
  const [dayTypeModalVisible, setDayTypeModalVisible] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = useIsTablet();
  const IS_NARROW = screenWidth < 380;
  const insets = useSafeAreaInsets();

  const dialSize = useMemo(() => getDialSize(cardWidth, screenWidth, isTablet), [cardWidth, screenWidth, isTablet]);
  const dialStrokeWidth = useMemo(() => Math.round(dialSize * 0.078), [dialSize]);
  const dialNumberSize = useMemo(() => Math.round(dialSize * 0.255), [dialSize]);
  const dialNumberLine = useMemo(() => Math.round(dialNumberSize * 1.02), [dialNumberSize]);
  const dialSubSize = useMemo(() => Math.max(13, Math.round(dialSize * 0.065)), [dialSize]);
  const calorieIconSize = useMemo(() => Math.max(14, Math.round(dialSize * 0.12)), [dialSize]);
  const calorieDialIconGap = useMemo(() => Math.max(2, Math.round(dialSize * 0.015)), [dialSize]);
  const calorieTextGap = useMemo(() => Math.max(4, Math.round(dialSize * 0.018)), [dialSize]);
  const { todayEntries, todayTotals, removeEntry, getStreak } = useDailyLog();
  const { showPrompt, hasBaseline, dismissPrompt } = useMeasurements();
  const {
    settings: proSettings,
    inferredDayType,
    hydration,
    hydrationUnit,
    addHydration,
    athleteProfile,
    updateSettings,
  } = usePro();
  const streak = getStreak();
  const stagger = useStaggerFadeIn(5);

  const dayTypeOverride = proSettings.dayTypeOverride ?? 'auto';
  const showDayTypeTag =
    proSettings.dynamicMacrosEnabled || athleteProfile.persona !== 'general';
  const dayTypeTagLabel =
    dayTypeOverride === 'auto'
      ? `Auto · ${dayTypeMeta(inferredDayType).label}`
      : DAY_TYPE_PICKER_SHORT_LABELS[dayTypeOverride];
  const hydrationDialFontSize = useMemo(
    () => Math.max(11, Math.round(dialNumberSize * 0.38)),
    [dialNumberSize]
  );
  const hydrationIconSize = useMemo(() => Math.max(14, Math.round(dialSize * 0.11)), [dialSize]);
  const hydrationDialGap = useMemo(() => Math.max(2, Math.round(dialSize * 0.02)), [dialSize]);
  const hydrationTextGap = useMemo(() => Math.max(4, Math.round(dialSize * 0.018)), [dialSize]);
  const hydrationTileSide = useMemo(
    () => getHydrationTileSide(cardWidth, screenWidth, dialSize),
    [cardWidth, screenWidth, dialSize]
  );

  useEffect(() => {
    if (userLoading) return;
    if (!profile.firstName) {
      router.replace('/welcome' as never);
    } else if (!profile.onboardingComplete) {
      router.replace('/onboarding' as never);
    }
  }, [userLoading, profile.firstName, profile.onboardingComplete]);

  const handleAddFood = useCallback(() => {
    router.push('/add-food' as never);
  }, []);

  const handleEditEntry = useCallback((id: string) => {
    router.push({ pathname: '/edit-log-entry', params: { entryId: id } } as never);
  }, []);

  const handleRemoveEntry = useCallback(
    (id: string) => {
      removeEntry(id);
    },
    [removeEntry]
  );

  if (userLoading || !profile.firstName || !profile.onboardingComplete) {
    return <View style={styles.container} />;
  }

  const caloriesRemaining = Math.max(dashboardTargets.calories - todayTotals.calories, 0);
  const greeting = getGreeting(profile.firstName);
  const progress = getProgressLevel(todayTotals.calories, dashboardTargets.calories);

  const statusText = (() => {
    if (streak > 1) return `Day ${streak} streak`;
    if (todayEntries.length > 0) return 'On track today';
    return undefined;
  })();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ title: greeting, headerShown: false }} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <ResponsiveContainer>
        <DashboardBrandHeader />

        {/* Greeting */}
        <Animated.View
          style={[
            styles.greetingBlock,
            {
              opacity: stagger[0],
              transform: [
                {
                  translateY: stagger[0].interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <GreetingHeader firstName={profile.firstName} progress={progress} statusText={statusText} />
          <View style={styles.chipBar}>
            <View style={styles.chipBarPreferences}>
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
              {customMacros && (
                <View style={styles.customBadge}>
                  <Text style={styles.customBadgeText}>Custom</Text>
                </View>
              )}
            </View>
            {showDayTypeTag ? (
              <PhysiqPressable
                feedback="select"
                style={styles.dayTypeChip}
                onPress={() => setDayTypeModalVisible(true)}
                accessibilityRole="button"
                accessibilityLabel={`Day type: ${dayTypeTagLabel}. Tap to change.`}
              >
                <Text style={styles.dayTypeChipText} numberOfLines={1} ellipsizeMode="tail">
                  {dayTypeTagLabel}
                </Text>
              </PhysiqPressable>
            ) : null}
          </View>
        </Animated.View>

        {/* Calorie Hero */}
        <Animated.View
          style={{
            opacity: stagger[1],
            transform: [
              {
                translateY: stagger[1].interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          }}
        >
          <View style={styles.calorieCardWrap}>
            <PremiumCard style={styles.calorieCard} variant="hero">
              <View
                style={[styles.calorieCardInner, IS_NARROW && styles.calorieCardInnerNarrow]}
                onLayout={(e) =>
                  setCardWidth(e.nativeEvent.layout.width - 2 * CARD_HORIZONTAL_PADDING)
                }
              >
                <View style={[styles.dialCol, { width: dialSize, height: dialSize, marginRight: GAP }]}>
                  <View style={{ width: dialSize, height: dialSize }}>
                    <CalorieGauge
                      consumed={todayTotals.calories}
                      target={dashboardTargets.calories}
                      color={colors.primary}
                      size={dialSize}
                      strokeWidth={dialStrokeWidth}
                    />
                    <View style={styles.dialCenterOverlay}>
                      <View style={styles.calorieDialOverlay}>
                        <View
                          style={[
                            styles.calorieDialAbove,
                            { gap: calorieDialIconGap, marginBottom: calorieTextGap },
                          ]}
                        >
                          <Flame size={calorieIconSize} color={colors.primary} />
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
                            accessibilityLabel={`${formatNumber(caloriesRemaining)} calories remaining`}
                          >
                            {formatNumber(caloriesRemaining)}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.dialSub,
                            { fontSize: dialSubSize, marginTop: calorieTextGap },
                          ]}
                          numberOfLines={1}
                          maxFontSizeMultiplier={1}
                        >
                          cal left
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={[styles.statsCol, IS_NARROW && styles.statsColNarrow]}>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel} numberOfLines={1}>
                      Target
                    </Text>
                    <Text
                      style={styles.statValue}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.7}
                      maxFontSizeMultiplier={1}
                    >
                      {formatNumber(dashboardTargets.calories)}
                    </Text>
                  </View>
                  <View style={styles.statRow}>
                    <Text style={styles.statLabel} numberOfLines={1}>
                      Consumed
                    </Text>
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
                        <Flame size={14} color={colors.primary} />
                        <Text style={styles.streakText}>{streak} day streak</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </PremiumCard>

            {/* Edit icon */}
            <PhysiqPressable
              feedback="tap"
              style={styles.editMacrosBtn}
              onPress={() => setEditMacrosVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Pencil size={14} color={customMacros ? colors.primary : colors.textTertiary} />
            </PhysiqPressable>
          </View>
        </Animated.View>

        {/* Macro Dials */}
        <Animated.View
          style={{
            opacity: stagger[2],
            transform: [
              {
                translateY: stagger[2].interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          }}
        >
          <PremiumCard style={styles.macroDialCard}>
            <View style={styles.macroDialRow}>
              <MacroDial
                label="Protein"
                consumed={todayTotals.protein_g}
                target={dashboardTargets.protein_g}
                color={Colors.protein}
              />
              <MacroDial
                label="Carbs"
                consumed={todayTotals.carbs_g}
                target={dashboardTargets.carbs_g}
                color={Colors.carbs}
              />
              <MacroDial
                label="Fat"
                consumed={todayTotals.fat_g}
                target={dashboardTargets.fat_g}
                color={Colors.fat}
              />
            </View>
            <WhyTheseMacrosCard
              macros={macros}
              onViewMethodology={() => router.push('/settings/nutrition-science' as never)}
            />
          </PremiumCard>
        </Animated.View>

        {/* Hydration */}
        {proSettings.hydrationEnabled ? (
          <Animated.View style={{ opacity: stagger[3], marginTop: Spacing.lg }}>
            <PremiumCard style={styles.hydrationCard}>
              <View style={[styles.calorieCardInner, IS_NARROW && styles.calorieCardInnerNarrow]}>
                <View style={[styles.dialCol, { width: dialSize, height: dialSize, marginRight: GAP }]}>
                  <View style={{ width: dialSize, height: dialSize }}>
                    <CalorieGauge
                      consumed={hydration.consumedMl}
                      target={hydration.targetMl}
                      color={Colors.hydration}
                      size={dialSize}
                      strokeWidth={dialStrokeWidth}
                    />
                    <View style={styles.dialCenterOverlay}>
                      <View style={styles.hydrationDialOverlay}>
                        <View
                          style={[
                            styles.hydrationDialAbove,
                            { gap: hydrationDialGap, marginBottom: hydrationTextGap },
                          ]}
                        >
                          <Droplet size={hydrationIconSize} color={Colors.hydration} />
                          <Text style={styles.hydrationDialLabel}>Hydration</Text>
                        </View>
                        <Text
                          style={[
                            styles.hydrationDialProgress,
                            {
                              fontSize: hydrationDialFontSize,
                              lineHeight: Math.round(hydrationDialFontSize * 1.15),
                              marginTop: hydrationTextGap,
                            },
                          ]}
                          numberOfLines={2}
                          adjustsFontSizeToFit
                          minimumFontScale={0.65}
                          maxFontSizeMultiplier={1}
                          accessibilityLabel={formatHydrationProgress(
                            hydration.consumedMl,
                            hydration.targetMl,
                            hydrationUnit
                          )}
                        >
                          {formatHydrationProgress(
                            hydration.consumedMl,
                            hydration.targetMl,
                            hydrationUnit
                          )}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
                <View style={[styles.statsCol, styles.hydrationActionsCol, IS_NARROW && styles.statsColNarrow]}>
                  <HydrationActionTileGrid
                    unit={hydrationUnit}
                    consumedMl={hydration.consumedMl}
                    tileSide={hydrationTileSide}
                    onAction={addHydration}
                  />
                </View>
              </View>
            </PremiumCard>
          </Animated.View>
        ) : null}

        {/* Training Mode nudge */}
        {!athleteProfile.enabled &&
        (proSettings.dynamicMacrosEnabled || proSettings.hydrationEnabled) ? (
          <Animated.View style={{ opacity: stagger[3] }}>
            <PhysiqPressable
              feedback="tap"
              style={styles.trainingNudgeCard}
              onPress={() => router.push('/training-mode' as never)}
            >
              <Dumbbell size={16} color={colors.primary} />
              <Text style={styles.trainingNudgeText}>
                Set up Training Mode for sport & schedule-aware fueling
              </Text>
              <ChevronRight size={16} color={colors.textTertiary} />
            </PhysiqPressable>
          </Animated.View>
        ) : null}

        <DayTypePickerModal
          visible={dayTypeModalVisible}
          selectedId={dayTypeOverride}
          onSelect={(id) => {
            updateSettings({ dayTypeOverride: id });
            track('day_type_changed', { dayType: id });
          }}
          onClose={() => setDayTypeModalVisible(false)}
        />

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
                    {hasBaseline
                      ? 'Track your progress beyond the scale'
                      : 'Start tracking progress beyond weight'}
                  </Text>
                </View>
              </View>
              <View style={styles.promptActions}>
                <PhysiqPressable
                  feedback="confirm"
                  style={styles.promptCta}
                  onPress={() => router.push('/add-measurement' as never)}
                >
                  <Text style={styles.promptCtaText}>Go</Text>
                </PhysiqPressable>
                <PhysiqPressable
                  feedback="tap"
                  style={styles.promptDismiss}
                  onPress={() => dismissPrompt()}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={14} color={colors.textTertiary} />
                </PhysiqPressable>
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
                  <PhysiqPressable
                    feedback="tap"
                    style={styles.entryTapArea}
                    onPress={() => handleEditEntry(entry.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit ${entry.name}, ${formatNumber(entry.calories)} calories`}
                    accessibilityHint="Opens this log entry for editing"
                  >
                    <View style={styles.entryInfo}>
                      <Text style={styles.entryName}>{entry.name}</Text>
                      <Text style={styles.entryMacros}>
                        {formatNumber(entry.calories)} cal · {formatNumber(entry.protein_g)}p ·{' '}
                        {formatNumber(entry.carbs_g)}c · {formatNumber(entry.fat_g)}f
                      </Text>
                    </View>
                    <ChevronRight size={18} color={colors.textTertiary} style={styles.entryChevron} />
                  </PhysiqPressable>
                  <PhysiqPressable
                    feedback="destructive"
                    style={styles.entryDelete}
                    onPress={() => handleRemoveEntry(entry.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${entry.name}`}
                  >
                    <Trash2 size={16} color={colors.textTertiary} />
                  </PhysiqPressable>
                </PremiumCard>
              ))}
            </View>
          ) : (
            <EmptyState />
          )}
        </Animated.View>
        </ResponsiveContainer>
      </ScrollView>

      <Fab onPress={handleAddFood} testID="add-food-button" />

      <CustomMacrosModal
        visible={editMacrosVisible}
        currentMacros={macros}
        isCustom={!!customMacros}
        onSave={async (m) => {
          await setCustomMacros(m);
          setEditMacrosVisible(false);
          playFeedback('success');
        }}
        onReset={async () => {
          await setCustomMacros(null);
          setEditMacrosVisible(false);
          playFeedback('select');
        }}
        onClose={() => setEditMacrosVisible(false)}
      />
    </View>
  );
}

// ─── Modal styles ────────────────────────────────────────────────────────────

const createModalStyles = (colors: AppColors) => StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 14,
  },
  sheetHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800' as const,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: -6,
  },
  fieldRowWrap: {
    gap: 4,
  },
  fieldRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: 12,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '700' as const,
    width: 110,
  },
  fieldInput: {
    flex: 1,
    backgroundColor: colors.cardElevated,
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    textAlign: 'right' as const,
  },
  fieldError: {
    color: Colors.danger,
    fontSize: 12,
    fontWeight: '600' as const,
    textAlign: 'right' as const,
  },
  btn: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginTop: 4,
  },
  btnText: {
    fontSize: 16,
    fontWeight: '800' as const,
  },
  resetBtn: {
    alignItems: 'center' as const,
    paddingVertical: 10,
  },
  resetBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scrollContent: {
      padding: Spacing.lg,
      paddingBottom: 100,
    },
    greetingBlock: {
      marginTop: 10,
    },
    chipBar: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    chipBarPreferences: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      alignItems: 'center',
    },
    strategyTag: {
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: colors.primary,
    },
    strategyTagText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '600' as const,
    },
    modifierTag: {
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: Radius.sm,
      backgroundColor: colors.cardElevated,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    modifierTagText: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600' as const,
    },
    calorieCardWrap: {
      position: 'relative',
    },
    calorieCard: {
      width: '100%',
      overflow: 'hidden',
    },
    editMacrosBtn: {
      position: 'absolute',
      top: 12,
      right: 12,
      zIndex: 10,
      padding: 6,
    },
    customBadge: {
      marginLeft: 'auto',
      alignSelf: 'center',
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
    },
    customBadgeText: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '700' as const,
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
      color: colors.text,
      textAlign: 'center' as const,
    },
    dialSub: {
      color: colors.textSecondary,
      textAlign: 'center' as const,
    },
    calorieDialOverlay: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    calorieDialAbove: {
      alignItems: 'center',
      justifyContent: 'center',
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
      color: colors.textSecondary,
    },
    statValue: {
      flex: 1,
      fontSize: 30,
      fontWeight: '800' as const,
      color: colors.text,
      minWidth: 56,
      textAlign: 'right' as const,
    },
    statValueAccent: {
      flex: 1,
      fontSize: 30,
      fontWeight: '800' as const,
      color: colors.primary,
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
      backgroundColor: colors.primaryMuted,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: Radius.sm,
    },
    streakText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '600' as const,
    },
    macroDialCard: {
      padding: Spacing.lg,
      marginTop: Spacing.lg,
      gap: Spacing.md,
    },
    dayTypeChip: {
      flexShrink: 0,
      paddingHorizontal: 16,
      paddingVertical: 7,
      borderRadius: Radius.md,
      borderWidth: 1.5,
      borderColor: colors.primary,
      backgroundColor: colors.primary,
    },
    dayTypeChipText: {
      color: colors.onPrimary ?? '#000000',
      fontSize: 13,
      fontWeight: '600' as const,
    },
    hydrationCard: {
      width: '100%',
      overflow: 'hidden',
    },
    hydrationDialOverlay: {
      flex: 1,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    hydrationDialAbove: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    hydrationDialLabel: {
      fontSize: 13,
      lineHeight: 16,
      fontWeight: '600' as const,
      color: Colors.text,
      textAlign: 'center' as const,
    },
    hydrationDialProgress: {
      fontWeight: '800' as const,
      color: colors.text,
      textAlign: 'center' as const,
      paddingHorizontal: 4,
    },
    hydrationActionsCol: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    trainingNudgeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: Spacing.lg,
      padding: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    trainingNudgeText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600' as const,
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
      color: colors.text,
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
      color: colors.text,
      fontSize: 15,
      fontWeight: '600' as const,
    },
    entryMacros: {
      color: colors.textSecondary,
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
      color: colors.text,
      fontSize: 14,
      fontWeight: '700' as const,
    },
    promptSubtitle: {
      color: colors.textSecondary,
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
