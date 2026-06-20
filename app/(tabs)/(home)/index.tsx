import React, { useEffect, useCallback, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
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
import { formatHydrationProgress, hydrationQuickAdds } from '../../../utils/hydration';
import type { ProDayType } from '../../../features/pro/types';
import { EATING_STYLE_LABELS, DIETARY_MODIFIER_LABELS, DietaryModifier, MacroTargets } from '../../../types';
import PremiumCard from '../../../components/ui/PremiumCard';
import GreetingHeader from '../../../components/ui/GreetingHeader';
import DashboardBrandHeader from '../../../components/ui/DashboardBrandHeader';
import EmptyState from '../../../components/ui/EmptyState';
import CalorieGauge from '../../../components/ui/CalorieGauge';
import { MacroDial } from '../../../components/ui/MacroRing';
import Fab from '../../../components/ui/Fab';
import WhyTheseMacrosCard from '../../../components/ui/WhyTheseMacrosCard';
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
      <Pressable
        style={styles.backdrop}
        onPress={() => {
          if (Keyboard.isVisible()) {
            Keyboard.dismiss();
          } else {
            onClose();
          }
        }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheet}
      >
        <View style={styles.sheetHeader}>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={Keyboard.dismiss}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <ChevronDown size={20} color={colors.textTertiary} />
          </TouchableOpacity>
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
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={handleSave}
          accessibilityRole="button"
          accessibilityLabel="Save custom targets"
        >
          <Text style={[styles.btnText, { color: colors.onPrimary ?? colors.white }]}>
            Save Targets
          </Text>
        </TouchableOpacity>
        {isCustom && (
          <TouchableOpacity
            style={styles.resetBtn}
            onPress={onReset}
            accessibilityRole="button"
            accessibilityLabel="Reset to calculated targets"
          >
            <Text style={styles.resetBtnText}>Reset to Calculated</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── DashboardScreen ─────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { profile, macros, customMacros, setCustomMacros, isLoading: userLoading } = useUser();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [cardWidth, setCardWidth] = useState(0);
  const [editMacrosVisible, setEditMacrosVisible] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const isTablet = useIsTablet();
  const IS_NARROW = screenWidth < 380;
  const insets = useSafeAreaInsets();

  const dialSize = useMemo(() => getDialSize(cardWidth, screenWidth, isTablet), [cardWidth, screenWidth, isTablet]);
  const dialStrokeWidth = useMemo(() => Math.round(dialSize * 0.078), [dialSize]);
  const dialNumberSize = useMemo(() => Math.round(dialSize * 0.255), [dialSize]);
  const dialNumberLine = useMemo(() => Math.round(dialNumberSize * 1.02), [dialNumberSize]);
  const dialSubSize = useMemo(() => Math.max(13, Math.round(dialSize * 0.065)), [dialSize]);
  const dialSubGap = useMemo(() => Math.round(dialSize * 0.035), [dialSize]);
  const dialCenterOffsetY = useMemo(
    () => Math.round((dialSubGap + dialSubSize) / 2),
    [dialSubGap, dialSubSize]
  );
  const { todayEntries, todayTotals, removeEntry, getStreak } = useDailyLog();
  const { showPrompt, hasBaseline, dismissPrompt } = useMeasurements();
  const {
    settings: proSettings,
    dynamicTargets,
    inferredDayType,
    hydration,
    hydrationUnit,
    addHydration,
    athleteProfile,
  } = usePro();
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

  const handleEditEntry = useCallback((id: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({ pathname: '/edit-log-entry', params: { entryId: id } } as never);
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
            {customMacros && (
              <View style={styles.customBadge}>
                <Text style={styles.customBadgeText}>Custom</Text>
              </View>
            )}
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
                      target={macros.calories}
                      color={colors.primary}
                      size={dialSize}
                      strokeWidth={dialStrokeWidth}
                    />
                    <View
                      style={[
                        styles.dialCenterOverlay,
                        { transform: [{ translateY: dialCenterOffsetY }] },
                      ]}
                    >
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
                      {formatNumber(macros.calories)}
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
            <TouchableOpacity
              style={styles.editMacrosBtn}
              onPress={() => setEditMacrosVisible(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Pencil size={14} color={customMacros ? colors.primary : colors.textTertiary} />
            </TouchableOpacity>
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

        {/* Adaptive Today */}
        {(proSettings.dynamicMacrosEnabled || proSettings.hydrationEnabled) && (
          <Animated.View style={{ opacity: stagger[3] }}>
            <PremiumCard style={styles.adaptiveCard}>
              {proSettings.dynamicMacrosEnabled ? (
                <View style={styles.adaptiveHeaderRow}>
                  <View style={styles.dayTypePill}>
                    {(() => {
                      const meta = dayTypeMeta(inferredDayType);
                      const Icon = meta.icon;
                      return (
                        <>
                          <Icon size={14} color={colors.primary} />
                          <Text style={styles.dayTypePillText}>{meta.label}</Text>
                        </>
                      );
                    })()}
                  </View>
                  <View style={styles.adaptiveCalCol}>
                    <Text style={styles.adaptiveCalValue}>{formatNumber(dynamicTargets.calories)}</Text>
                    <Text style={styles.adaptiveCalLabel}>adaptive cal</Text>
                  </View>
                </View>
              ) : null}

              {proSettings.hydrationEnabled ? (
                <View style={styles.hydrationBlock}>
                  <View style={styles.hydrationTop}>
                    <View style={styles.hydrationLabelRow}>
                      <Droplet size={16} color={Colors.carbs} />
                      <Text style={styles.hydrationTitle}>Hydration</Text>
                    </View>
                    <Text style={styles.hydrationValue}>
                      {formatHydrationProgress(hydration.consumedMl, hydration.targetMl, hydrationUnit)}
                    </Text>
                  </View>
                  <View style={styles.hydrationBarTrack}>
                    <View
                      style={[
                        styles.hydrationBarFill,
                        {
                          width: `${Math.min(
                            100,
                            hydration.targetMl > 0 ? (hydration.consumedMl / hydration.targetMl) * 100 : 0
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.hydrationChipsRow}>
                    {hydrationQuickAdds(hydrationUnit).map((preset) => (
                      <TouchableOpacity
                        key={preset.label}
                        style={styles.hydrationChip}
                        onPress={() => {
                          if (Platform.OS !== 'web') Haptics.selectionAsync();
                          addHydration(preset.ml);
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.hydrationChipText}>{preset.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : null}
              {!athleteProfile.enabled ? (
                <TouchableOpacity
                  style={styles.trainingNudge}
                  onPress={() => router.push('/training-mode' as never)}
                  activeOpacity={0.85}
                >
                  <Dumbbell size={16} color={colors.primary} />
                  <Text style={styles.trainingNudgeText}>
                    Set up Training Mode for sport & schedule-aware fueling
                  </Text>
                  <ChevronRight size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              ) : null}
            </PremiumCard>
          </Animated.View>
        )}

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
                  <X size={14} color={colors.textTertiary} />
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
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.entryDelete}
                    onPress={() => handleRemoveEntry(entry.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${entry.name}`}
                  >
                    <Trash2 size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
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
          if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }}
        onReset={async () => {
          await setCustomMacros(null);
          setEditMacrosVisible(false);
          if (Platform.OS !== 'web') {
            Haptics.selectionAsync();
          }
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
    adaptiveCard: {
      padding: Spacing.lg,
      marginTop: Spacing.lg,
      gap: Spacing.md,
    },
    adaptiveHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    dayTypePill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.primaryMuted,
    },
    dayTypePillText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700' as const,
    },
    adaptiveCalCol: {
      alignItems: 'flex-end',
    },
    adaptiveCalValue: {
      color: colors.text,
      fontSize: 22,
      fontWeight: '800' as const,
    },
    adaptiveCalLabel: {
      color: colors.textSecondary,
      fontSize: 11,
      fontWeight: '600' as const,
    },
    hydrationBlock: {
      gap: Spacing.sm,
    },
    hydrationTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    hydrationLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    hydrationTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '700' as const,
    },
    hydrationValue: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '700' as const,
    },
    hydrationBarTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.cardBorder,
      overflow: 'hidden',
    },
    hydrationBarFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: Colors.carbs,
    },
    hydrationChipsRow: {
      flexDirection: 'row',
      gap: 8,
    },
    hydrationChip: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 9,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.cardElevated,
    },
    hydrationChipText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700' as const,
    },
    trainingNudge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingTop: Spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.cardBorder,
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
