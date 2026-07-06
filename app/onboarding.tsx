import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import DismissKeyboard from '../components/ui/DismissKeyboard';
import PhysiqPressable from '../components/ui/PhysiqPressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight, Info, Zap } from 'lucide-react-native';
import PlanDefinitionSheet from '../components/ui/PlanDefinitionSheet';
import PsmfAcknowledgmentModal from '../components/ui/PsmfAcknowledgmentModal';
import { useUser } from '../providers/UserProvider';
import {
  ACTIVITY_DESCRIPTIONS,
  ACTIVITY_LABELS,
  ActivityLevel,
  DietaryModifier,
  DIETARY_MODIFIER_LABELS,
  EatingStyle,
  EATING_STYLE_DESCRIPTIONS,
  EATING_STYLE_LABELS,
  ftInToCm,
  Goal,
  GOAL_DESCRIPTIONS,
  GOAL_LABELS,
  kgToLb,
  MeasurementSystem,
  Sex,
} from '../types';
import {
  getActivityLevelDefinition,
  getEatingStyleDefinition,
  getGoalDefinition,
  LearnMoreSection,
} from '../src/content/planDefinitions';
import { calculateMacros } from '../utils/macroEngine';
import {
  ACTIVITY_TYPES,
  ActivityType,
  ATHLETE_SPORTS,
  AthleteCompetitionLevel,
  AthleteSeasonPhase,
  COMPETITION_LEVEL_LABELS,
  deriveAthleteUserType,
  TrainingPersona,
} from '../features/pro/types';
import { saveAthleteProfile } from '../storage/proRepo';
import { useThemeColors, type AppColors } from '../providers/ThemeProvider';
import ResponsiveContainer from '../components/ui/ResponsiveContainer';
import { upsertMeasurement } from '../storage/measurementsRepo';
import { getTodayDateKey } from '../utils/dateKey';
import { buildPsmfProfileUpdates } from '../utils/psmfHelpers';
import { Radius, Spacing, Type } from '../theme/tokens';
import { track } from '../services/analytics';

const TOTAL_STEPS = 6;
const FOOTER_BUTTON_HEIGHT = 52;

export default function OnboardingScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();

  const { completeOnboarding } = useUser();
  const progressAnim = useRef(new Animated.Value(1 / TOTAL_STEPS)).current;

  const [step, setStep] = useState(0);
  const [age, setAge] = useState('28');
  const [sex, setSex] = useState<Sex>('male');
  const [measurementSystem, setMeasurementSystem] = useState<MeasurementSystem>('us');
  const [heightCm, setHeightCm] = useState('175');
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('9');
  const [weightLb, setWeightLb] = useState('180');
  const [weightKg, setWeightKg] = useState('82');
  const [bodyFatPercent, setBodyFatPercent] = useState('');
  const [goal, setGoal] = useState<Goal>('cut');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate_training');
  const [eatingStyle, setEatingStyle] = useState<EatingStyle>('standard');
  const [trainingPersona, setTrainingPersona] = useState<TrainingPersona>('general');
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [competitionLevel, setCompetitionLevel] = useState<AthleteCompetitionLevel | undefined>(undefined);
  const [seasonPhase, setSeasonPhase] = useState<AthleteSeasonPhase>('in_season');
  const [selectedActivities, setSelectedActivities] = useState<ActivityType[]>([]);
  const [sessionsPerWeek, setSessionsPerWeek] = useState('');
  const [dietModifiers, setDietModifiers] = useState<DietaryModifier[]>([]);
  const [dietNotes] = useState(''); // collected in Settings now
  const [definitionSheetVisible, setDefinitionSheetVisible] = useState(false);
  const [definitionSheetTitle, setDefinitionSheetTitle] = useState('');
  const [definitionSheetSections, setDefinitionSheetSections] = useState<LearnMoreSection[]>([]);
  const [psmfModalVisible, setPsmfModalVisible] = useState(false);
  const [psmfAcknowledgedAt, setPsmfAcknowledgedAt] = useState<string | undefined>(undefined);

  const animateProgress = useCallback(
    (nextStep: number) => {
      Animated.spring(progressAnim, {
        toValue: (nextStep + 1) / TOTAL_STEPS,
        useNativeDriver: false,
        tension: 60,
        friction: 12,
      }).start();
    },
    [progressAnim]
  );

  const goNext = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      animateProgress(nextStep);
      track('onboarding_step_viewed', { step: nextStep + 1, totalSteps: TOTAL_STEPS });
    }
  }, [animateProgress, step]);

  const goBack = useCallback(() => {
    if (step === 0) return;
    const nextStep = step - 1;
    setStep(nextStep);
    animateProgress(nextStep);
  }, [animateProgress, step]);

  const toggleSport = useCallback((sport: string) => {
    setSelectedSports((prev) =>
      prev.includes(sport) ? prev.filter((s) => s !== sport) : [...prev, sport]
    );
  }, []);

  const toggleActivity = useCallback((activity: ActivityType) => {
    setSelectedActivities((prev) =>
      prev.includes(activity) ? prev.filter((a) => a !== activity) : [...prev, activity]
    );
  }, []);

  const toggleDietModifier = useCallback((modifier: DietaryModifier) => {
    setDietModifiers((current) =>
      current.includes(modifier)
        ? current.filter((item) => item !== modifier)
        : [...current, modifier]
    );
  }, []);

  const draftProfile = useMemo(() => {
    const finalHeightCm =
      measurementSystem === 'us'
        ? ftInToCm(parseInt(heightFt, 10) || 5, parseInt(heightIn, 10) || 9)
        : parseFloat(heightCm) || 175;
    const parsedWeightLb =
      measurementSystem === 'us'
        ? parseFloat(weightLb) || 180
        : kgToLb(parseFloat(weightKg) || 82);
    const parsedBodyFat = parseFloat(bodyFatPercent);
    const finalWeightLb = Number.isFinite(parsedWeightLb) && parsedWeightLb > 0 ? parsedWeightLb : 180;
    const normalizedBodyFat =
      Number.isFinite(parsedBodyFat) && parsedBodyFat >= 3 && parsedBodyFat <= 70
        ? parsedBodyFat
        : undefined;

    return {
      age: parseInt(age, 10) || 28,
      sex,
      heightCm: finalHeightCm,
      weightLb: finalWeightLb,
      bodyFatPercent: normalizedBodyFat,
      goal,
      activityLevel,
      eatingStyle,
      dietModifiers,
      dietNotes: dietNotes.trim(),
      measurementSystem,
      psmfAcknowledgedAt: eatingStyle === 'psmf' ? psmfAcknowledgedAt : undefined,
    };
  }, [
    activityLevel,
    age,
    bodyFatPercent,
    dietModifiers,
    dietNotes,
    eatingStyle,
    goal,
    heightCm,
    heightFt,
    heightIn,
    measurementSystem,
    psmfAcknowledgedAt,
    sex,
    weightKg,
    weightLb,
  ]);

  const previewMacros = useMemo(() => calculateMacros({ ...draftProfile, onboardingComplete: true }), [draftProfile]);

  const handleComplete = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // Food dislikes/allergies are collected at first plan generation (Plan
    // tab gate); the baseline photo is prompted contextually after a 3-day
    // logging streak (DashboardBanner) — not during onboarding.
    await upsertMeasurement({
      id: `m_baseline_${Date.now()}`,
      userId: 'local_user',
      recordedAt: new Date().toISOString(),
      dateKey: getTodayDateKey(),
      weightLb: draftProfile.weightLb,
      bodyFatPercent: draftProfile.bodyFatPercent,
      isBaseline: true,
    });
    if (trainingPersona !== 'general') {
      const parsedSessions = parseInt(sessionsPerWeek, 10);
      await saveAthleteProfile({
        enabled: true,
        persona: trainingPersona,
        userType: deriveAthleteUserType(competitionLevel),
        sport: selectedSports[0] ?? '',
        sports: selectedSports,
        competitionLevel: trainingPersona === 'athlete' ? competitionLevel : undefined,
        activities: trainingPersona === 'fitness' ? selectedActivities : [],
        sessionsPerWeek: Number.isFinite(parsedSessions) && parsedSessions > 0 ? parsedSessions : undefined,
        season: { phase: seasonPhase },
        schedule: [],
      });
    }
    completeOnboarding({
      ...draftProfile,
      ...buildPsmfProfileUpdates(
        { ...draftProfile, eatingStyle: 'standard', onboardingComplete: false },
        draftProfile.eatingStyle,
        draftProfile.eatingStyle === 'psmf' ? psmfAcknowledgedAt ?? new Date().toISOString() : undefined
      ),
    });
    track('onboarding_completed', { totalSteps: TOTAL_STEPS });
    router.replace('/(tabs)' as never);
  }, [
    completeOnboarding,
    draftProfile,
    psmfAcknowledgedAt,
    trainingPersona,
    selectedSports,
    competitionLevel,
    selectedActivities,
    seasonPhase,
    sessionsPerWeek,
  ]);

  const handleEatingStyleSelect = useCallback((value: EatingStyle) => {
    if (value === 'psmf') {
      setPsmfModalVisible(true);
      return;
    }
    setEatingStyle(value);
    setPsmfAcknowledgedAt(undefined);
  }, []);

  const confirmPsmfSelection = useCallback(() => {
    const acknowledgedAt = new Date().toISOString();
    setPsmfAcknowledgedAt(acknowledgedAt);
    setEatingStyle('psmf');
    setPsmfModalVisible(false);
  }, []);

  const finishOnboarding = useCallback(() => {
    void handleComplete();
  }, [handleComplete]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const renderChoice = <T extends string>(
    value: T,
    selectedValue: T,
    onSelect: (next: T) => void,
    label: string,
    description?: string
  ) => {
    const selected = value === selectedValue;
    return (
      <PhysiqPressable
        key={value}
        feedback="select"
        style={[styles.choiceCard, selected && styles.choiceCardSelected]}
        onPress={() => onSelect(value)}
      >
        <View style={styles.choiceCopy}>
          <Text style={[styles.choiceTitle, selected && styles.choiceTitleSelected]}>{label}</Text>
          {description ? (
            <Text style={[styles.choiceDescription, selected && styles.choiceDescriptionSelected]}>
              {description}
            </Text>
          ) : null}
        </View>
      </PhysiqPressable>
    );
  };

  const openDefinitionSheet = useCallback((title: string, sections: LearnMoreSection[]) => {
    setDefinitionSheetTitle(title);
    setDefinitionSheetSections(sections);
    setDefinitionSheetVisible(true);
  }, []);

  const renderStepHeader = (title: string, subtitle: string, onLearnMore?: () => void) => (
    <>
      <View style={styles.stepHeaderRow}>
        <Text style={styles.stepTitle}>{title}</Text>
        {onLearnMore ? (
          <PhysiqPressable
            feedback="tap"
            style={styles.learnMoreButton}
            onPress={onLearnMore}
          >
            <Info size={14} color={colors.primary} />
            <Text style={styles.learnMoreText}>Learn More</Text>
          </PhysiqPressable>
        ) : null}
      </View>
      <Text style={styles.stepSubtitle}>{subtitle}</Text>
    </>
  );

  const renderProfileStep = () => (
    <View style={styles.stepContainer}>
      {renderStepHeader('Profile', 'Tell us the basics so we can calculate your targets.')}

      <View style={styles.row}>
        <View style={styles.field}>
          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            placeholder="28"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Sex</Text>
          <View style={styles.segmentRow}>
            <PhysiqPressable
              feedback="select"
              style={[styles.segment, sex === 'male' && styles.segmentActive]}
              onPress={() => setSex('male')}
            >
              <Text style={[styles.segmentText, sex === 'male' && styles.segmentTextActive]}>Male</Text>
            </PhysiqPressable>
            <PhysiqPressable
              feedback="select"
              style={[styles.segment, sex === 'female' && styles.segmentActive]}
              onPress={() => setSex('female')}
            >
              <Text style={[styles.segmentText, sex === 'female' && styles.segmentTextActive]}>Female</Text>
            </PhysiqPressable>
          </View>
        </View>
      </View>

      <Text style={styles.label}>Units</Text>
      <View style={styles.segmentRow}>
        <PhysiqPressable
          feedback="select"
          style={[styles.segment, measurementSystem === 'us' && styles.segmentActive]}
          onPress={() => setMeasurementSystem('us')}
        >
          <Text style={[styles.segmentText, measurementSystem === 'us' && styles.segmentTextActive]}>US</Text>
        </PhysiqPressable>
        <PhysiqPressable
          feedback="select"
          style={[styles.segment, measurementSystem === 'metric' && styles.segmentActive]}
          onPress={() => setMeasurementSystem('metric')}
        >
          <Text style={[styles.segmentText, measurementSystem === 'metric' && styles.segmentTextActive]}>Metric</Text>
        </PhysiqPressable>
      </View>

      {measurementSystem === 'us' ? (
        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>Height</Text>
            <View style={styles.dualRow}>
              <TextInput
                style={[styles.input, styles.dualInput]}
                value={heightFt}
                onChangeText={setHeightFt}
                keyboardType="number-pad"
                placeholder="5"
                placeholderTextColor={colors.textTertiary}
              />
              <TextInput
                style={[styles.input, styles.dualInput]}
                value={heightIn}
                onChangeText={setHeightIn}
                keyboardType="number-pad"
                placeholder="9"
                placeholderTextColor={colors.textTertiary}
              />
            </View>
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Weight (lb)</Text>
            <TextInput
              style={styles.input}
              value={weightLb}
              onChangeText={setWeightLb}
              keyboardType="decimal-pad"
              placeholder="180"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>
      ) : (
        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.label}>Height (cm)</Text>
            <TextInput
              style={styles.input}
              value={heightCm}
              onChangeText={setHeightCm}
              keyboardType="decimal-pad"
              placeholder="175"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Weight (kg)</Text>
            <TextInput
              style={styles.input}
              value={weightKg}
              onChangeText={setWeightKg}
              keyboardType="decimal-pad"
              placeholder="82"
              placeholderTextColor={colors.textTertiary}
            />
          </View>
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>Body Fat % (optional)</Text>
        <TextInput
          style={styles.input}
          value={bodyFatPercent}
          onChangeText={setBodyFatPercent}
          keyboardType="decimal-pad"
          placeholder="If you know it, we can calculate more accurate macros."
          placeholderTextColor={colors.textTertiary}
        />
      </View>
    </View>
  );

  const renderGoalStep = () => (
    <View style={styles.stepContainer}>
      {renderStepHeader(
        'Goal',
        'Choose the outcome you want your nutrition to support.',
        () =>
          openDefinitionSheet('Goal Definitions', (Object.keys(GOAL_LABELS) as Goal[]).map((value) => {
            const definition = getGoalDefinition(value);
            return {
              heading: definition.title,
              body: definition.learnMore.map((section) => section.body).join('\n'),
            };
          }))
      )}
      <View style={styles.choiceList}>
        {(Object.keys(GOAL_LABELS) as Goal[]).map((value) =>
          renderChoice(value, goal, setGoal, GOAL_LABELS[value], GOAL_DESCRIPTIONS[value])
        )}
      </View>
    </View>
  );

  const renderActivityStep = () => (
    <View style={styles.stepContainer}>
      {renderStepHeader(
        'Activity Level',
        'This helps us estimate calorie, protein, and carb needs.',
        () =>
          openDefinitionSheet(
            'Activity Level Definitions',
            (Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((value) => {
              const definition = getActivityLevelDefinition(value);
              return {
                heading: definition.title,
                body: definition.learnMore.map((section) => section.body).join('\n'),
              };
            })
          )
      )}
      <View style={styles.choiceList}>
        {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((value) =>
          renderChoice(value, activityLevel, setActivityLevel, ACTIVITY_LABELS[value], ACTIVITY_DESCRIPTIONS[value])
        )}
      </View>
    </View>
  );

  const renderTrainingStep = () => (
    <View style={styles.stepContainer}>
      {renderStepHeader(
        'How you train',
        'This personalizes your fueling. You can change any of this later in Settings.'
      )}
      <View style={styles.choiceList}>
        {renderChoice(
          'athlete' as TrainingPersona,
          trainingPersona,
          setTrainingPersona,
          'I train or compete for a sport',
          'Get sport, season, and schedule-aware fueling.'
        )}
        {renderChoice(
          'fitness' as TrainingPersona,
          trainingPersona,
          setTrainingPersona,
          'I work out for fitness / health',
          'Tune fueling to the activities you do.'
        )}
        {renderChoice(
          'general' as TrainingPersona,
          trainingPersona,
          setTrainingPersona,
          'Just tracking nutrition for now',
          'Skip training setup — enable it anytime.'
        )}
      </View>

      {trainingPersona === 'athlete' ? (
        <>
          <Text style={styles.label}>Your sport(s)</Text>
          <View style={styles.chipWrap}>
            {ATHLETE_SPORTS.map((sport) => {
              const active = selectedSports.includes(sport);
              return (
                <PhysiqPressable
                  key={sport}
                  feedback="select"
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleSport(sport)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{sport}</Text>
                </PhysiqPressable>
              );
            })}
          </View>

          <Text style={styles.label}>Competition level</Text>
          <View style={styles.chipWrap}>
            {(Object.keys(COMPETITION_LEVEL_LABELS) as AthleteCompetitionLevel[]).map((level) => {
              const active = competitionLevel === level;
              return (
                <PhysiqPressable
                  key={level}
                  feedback="select"
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCompetitionLevel(level)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {COMPETITION_LEVEL_LABELS[level]}
                  </Text>
                </PhysiqPressable>
              );
            })}
          </View>

          <Text style={styles.label}>Current season</Text>
          <View style={styles.segmentRow}>
            {(['preseason', 'in_season', 'off_season'] as AthleteSeasonPhase[]).map((phase) => (
              <PhysiqPressable
                key={phase}
                feedback="select"
                style={[styles.segment, seasonPhase === phase && styles.segmentActive]}
                onPress={() => setSeasonPhase(phase)}
              >
                <Text style={[styles.segmentText, seasonPhase === phase && styles.segmentTextActive]}>
                  {phase === 'in_season' ? 'In-season' : phase === 'off_season' ? 'Off-season' : 'Preseason'}
                </Text>
              </PhysiqPressable>
            ))}
          </View>
        </>
      ) : null}

      {trainingPersona === 'fitness' ? (
        <>
          <Text style={styles.label}>Your activities</Text>
          <View style={styles.chipWrap}>
            {ACTIVITY_TYPES.map((activity) => {
              const active = selectedActivities.includes(activity.id);
              return (
                <PhysiqPressable
                  key={activity.id}
                  feedback="select"
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleActivity(activity.id)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{activity.label}</Text>
                </PhysiqPressable>
              );
            })}
          </View>
        </>
      ) : null}

      {trainingPersona !== 'general' ? (
        <View style={styles.field}>
          <Text style={styles.label}>Typical sessions per week (optional)</Text>
          <TextInput
            style={styles.input}
            value={sessionsPerWeek}
            onChangeText={setSessionsPerWeek}
            keyboardType="number-pad"
            placeholder="e.g. 4"
            placeholderTextColor={colors.textTertiary}
          />
        </View>
      ) : null}
    </View>
  );

  const renderEatingStyleStep = () => (
    <View style={styles.stepContainer}>
      {renderStepHeader(
        'Eating Style',
        'Eating style shapes your meal plan foods and, for keto/carnivore/psmf, the macro split of your targets.',
        () =>
          openDefinitionSheet(
            'Eating Style Definitions',
            (Object.keys(EATING_STYLE_LABELS) as EatingStyle[]).map((value) => {
              const definition = getEatingStyleDefinition(value);
              return {
                heading: definition.title,
                body: definition.learnMore.map((section) => section.body).join('\n'),
              };
            })
          )
      )}
      <View style={styles.choiceList}>
        {(Object.keys(EATING_STYLE_LABELS) as EatingStyle[]).map((value) => {
          const selected = value === eatingStyle;
          const isPsmf = value === 'psmf';
          return (
            <PhysiqPressable
              key={value}
              feedback="select"
              style={[styles.choiceCard, selected && styles.choiceCardSelected]}
              onPress={() => handleEatingStyleSelect(value)}
            >
              <View style={styles.choiceCopy}>
                <View style={styles.choiceTitleRow}>
                  <Text style={[styles.choiceTitle, selected && styles.choiceTitleSelected]}>
                    {EATING_STYLE_LABELS[value]}
                  </Text>
                  {isPsmf ? (
                    <View style={styles.psmfBadge}>
                      <Text style={styles.psmfBadgeText}>Advanced / Short-term</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[styles.choiceDescription, selected && styles.choiceDescriptionSelected]}>
                  {EATING_STYLE_DESCRIPTIONS[value]}
                </Text>
              </View>
            </PhysiqPressable>
          );
        })}
      </View>
      <Text style={styles.label}>Any dietary modifiers? (optional)</Text>
      <View style={styles.chipWrap}>
        {(Object.keys(DIETARY_MODIFIER_LABELS) as DietaryModifier[]).map((modifier) => {
          const active = dietModifiers.includes(modifier);
          return (
            <PhysiqPressable
              key={modifier}
              feedback="select"
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleDietModifier(modifier)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {DIETARY_MODIFIER_LABELS[modifier]}
              </Text>
            </PhysiqPressable>
          );
        })}
      </View>
    </View>
  );

  /** Final step: the personalized plan, revealed — first value before the dashboard. */
  const renderPlanRevealStep = () => (
    <View style={styles.stepContainer}>
      {renderStepHeader(
        'Your plan is ready',
        'Daily targets built from your stats, goal, and activity. They adapt as you train — and you can adjust them anytime.'
      )}
      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <Zap size={16} color={colors.primary} />
          <Text style={styles.previewTitle}>Daily Targets</Text>
        </View>
        <View style={styles.previewRow}>
          <PreviewMetric label="Calories" value={String(previewMacros.calories)} color={colors.calories} styles={styles} />
          <PreviewMetric label="Protein" value={`${previewMacros.protein_g}g`} color={colors.protein} styles={styles} />
          <PreviewMetric label="Carbs" value={`${previewMacros.carbs_g}g`} color={colors.carbs} styles={styles} />
          <PreviewMetric label="Fat" value={`${previewMacros.fat_g}g`} color={colors.fat} styles={styles} />
        </View>
      </View>
      <Text style={styles.planRevealNote}>
        Log your first meal in seconds — type it, speak it, or scan a barcode. The full methodology
        lives in Settings → Nutrition Science.
      </Text>
    </View>
  );

  const steps = [
    renderProfileStep,
    renderGoalStep,
    renderActivityStep,
    renderTrainingStep,
    renderEatingStyleStep,
    renderPlanRevealStep,
  ];

  const isLastStep = step === TOTAL_STEPS - 1;
  const footerBottomInset = Math.max(insets.bottom, Spacing.md);
  const footerBarHeight = FOOTER_BUTTON_HEIGHT + Spacing.md + footerBottomInset + Spacing.md;

  return (
    <DismissKeyboard>
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.stepIndicator}>{step + 1} / {TOTAL_STEPS}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: footerBarHeight + Spacing.lg },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ResponsiveContainer>
          {steps[step]()}
          </ResponsiveContainer>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footerBar, { paddingBottom: footerBottomInset }]}>
        <View style={styles.footerRow}>
          <PhysiqPressable
            feedback="tap"
            style={[styles.footerBackButton, step === 0 && styles.footerBackButtonDisabled]}
            onPress={goBack}
            disabled={step === 0}
          >
            {step > 0 ? <ChevronLeft size={16} color={colors.textSecondary} /> : null}
            <Text style={[styles.footerBackText, step === 0 && styles.footerBackTextDisabled]}>Back</Text>
          </PhysiqPressable>

          {!isLastStep ? (
            <PhysiqPressable feedback="confirm" style={styles.footerContinueButton} onPress={goNext}>
              <Text style={styles.footerContinueText}>Continue</Text>
              <ChevronRight size={16} color={colors.onPrimary} />
            </PhysiqPressable>
          ) : (
            <PhysiqPressable feedback="confirm" style={styles.footerContinueButton} onPress={finishOnboarding}>
              <Text style={styles.footerContinueText}>Start logging</Text>
              <ChevronRight size={16} color={colors.onPrimary} />
            </PhysiqPressable>
          )}
        </View>
      </View>

      <PlanDefinitionSheet
        visible={definitionSheetVisible}
        title={definitionSheetTitle}
        sections={definitionSheetSections}
        onClose={() => setDefinitionSheetVisible(false)}
      />
      <PsmfAcknowledgmentModal
        visible={psmfModalVisible}
        profile={draftProfile}
        onClose={() => setPsmfModalVisible(false)}
        onAcknowledge={confirmPsmfSelection}
      />
    </View>
    </DismissKeyboard>
  );
}

function PreviewMetric({
  label,
  value,
  color,
  styles,
}: {
  label: string;
  value: string;
  color: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.previewMetric}>
      <Text style={[styles.previewValue, { color }]}>{value}</Text>
      <Text style={styles.previewLabel}>{label}</Text>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  flex: {
    flex: 1,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.cardBorder,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 999,
  },
  stepIndicator: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    textAlign: 'right',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  stepContainer: {
    gap: 16,
  },
  paywallPrimaryCta: {
    width: '100%',
    minHeight: 56,
    marginTop: 8,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 4,
  },
  paywallPrimaryCtaDisabled: {
    opacity: 0.65,
  },
  paywallPrimaryCtaTitle: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  paywallPrimaryCtaSub: {
    color: colors.onPrimary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.92,
  },
  paywallSecondaryCta: {
    width: '100%',
    minHeight: 48,
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  paywallSecondaryCtaText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  paywallLegalText: {
    color: colors.textTertiary,
    fontSize: 12,
    lineHeight: 17,
  },
  paywallLegalTextCompact: {
    fontSize: 11,
    lineHeight: 15,
  },
  scrollContentPaywall: {
    padding: 20,
    paddingBottom: 24,
  },
  paywallTrustLineInCard: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stepTitle: {
    color: colors.text,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    flex: 1,
  },
  stepSubtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  paywallStepContainer: {
    gap: 12,
  },
  paywallStepContainerCompact: {
    gap: 10,
  },
  paywallStepContainerVeryCompact: {
    gap: 8,
  },
  paywallStepTitle: {
    fontSize: 56,
    lineHeight: 60,
  },
  paywallStepTitleCompact: {
    fontSize: 50,
    lineHeight: 54,
  },
  paywallStepTitleVeryCompact: {
    fontSize: 44,
    lineHeight: 48,
  },
  paywallSubtitle: {
    fontSize: 16,
    lineHeight: 24,
  },
  paywallSubtitleCompact: {
    fontSize: 15,
    lineHeight: 21,
  },
  paywallSubtitleVeryCompact: {
    fontSize: 14,
    lineHeight: 19,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  learnMoreText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    flex: 1,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  notesInput: {
    minHeight: 108,
    textAlignVertical: 'top',
  },
  dualRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dualInput: {
    flex: 1,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  segmentActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  segmentText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: colors.primary,
  },
  choiceList: {
    gap: 12,
  },
  choiceListCompact: {
    gap: 8,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 18,
  },
  choiceCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  choiceCopy: {
    flex: 1,
  },
  choiceTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  psmfBadge: {
    backgroundColor: colors.warningMuted,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  psmfBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.warning,
    textTransform: 'uppercase',
  },
  choiceTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  choiceTitleSelected: {
    color: colors.primary,
  },
  choiceDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  choiceDescriptionSelected: {
    color: colors.primary,
  },
  featureBullet: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.primary,
  },
  previewCard: {
    marginTop: 8,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    gap: 14,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  previewMetric: {
    flex: 1,
    alignItems: 'center',
  },
  previewValue: {
    ...Type.statSm,
    fontSize: 20,
    lineHeight: 24,
  },
  previewLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  footerBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.cardBorder,
    backgroundColor: colors.background,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  footerBackButton: {
    height: FOOTER_BUTTON_HEIGHT,
    minWidth: 96,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  footerBackButtonDisabled: {
    opacity: 0.4,
  },
  footerBackText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  footerBackTextDisabled: {
    color: colors.textTertiary,
  },
  footerContinueButton: {
    flex: 1,
    height: FOOTER_BUTTON_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: Radius.md,
    backgroundColor: colors.primary,
  },
  footerContinueText: {
    color: colors.onPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  footerSkipButton: {
    flex: 1,
    height: FOOTER_BUTTON_HEIGHT,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerSkipText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  baselinePrimaryBtn: {
    width: '100%',
    minHeight: 48,
    borderRadius: Radius.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  baselinePrimaryBtnText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  baselineSecondaryBtn: {
    width: '100%',
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  baselineSecondaryBtnText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  baselinePreview: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    marginBottom: 12,
  },
  baselinePlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  baselinePlaceholderText: {
    color: colors.textTertiary,
    fontSize: 14,
  },
  baselineActions: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  planRevealNote: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginTop: Spacing.lg,
  },
  skipLinkText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  foodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  foodChip: {
    width: '47%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
    alignItems: 'center',
  },
  foodChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  foodChipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  foodChipTextActive: {
    color: colors.primary,
  },
  foodDislikeNote: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: 4,
  },
  proFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proFeatureText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  proFeatureTextCompact: {
    fontSize: 13,
    lineHeight: 18,
  },
  proFeatureTextVeryCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  proTrialCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  proTrialCardCompact: {
    padding: 12,
    gap: 4,
  },
  proTrialTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  proTrialLine: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  proTrialCardCta: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
    minHeight: 56,
  },
  tierToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
    alignItems: 'flex-start',
  },
  tierColumnTop: {
    flex: 1,
    gap: 8,
  },
  tierSegmentPaywall: {
    width: '100%',
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 0,
    borderWidth: 2,
  },
  tierSegmentPaywallIdle: {
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  tierSegmentPaywallActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  tierBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.45,
    textTransform: 'uppercase',
    lineHeight: 14,
    minHeight: 14,
  },
  proTrialSubtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  proDisclosure: {
    color: colors.textTertiary,
    fontSize: 12,
    lineHeight: 17,
  },
  proDisclosureCompact: {
    fontSize: 11,
    lineHeight: 15,
  },
  inlineLegalLink: {
    color: colors.primary,
    fontWeight: '700',
  },
  proCtaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  legalCopyWrap: {
    marginTop: 10,
  },
  legalCopyWrapCompact: {
    marginTop: 6,
  },
  proOutlinedCta: {
    minHeight: 58,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  proCtaRowButton: {
    flex: 1,
  },
  proOutlinedCtaSecondary: {
    backgroundColor: colors.card,
  },
  proOutlinedCtaPrimary: {
    shadowColor: colors.primary,
    shadowOpacity: 0.24,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  ctaCopy: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  ctaTitlePrimary: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  ctaTitleSecondary: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  ctaSubtleText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  proOutlinedCtaActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  proOutlinedCtaText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  proOutlinedCtaTextActive: {
    color: colors.primary,
  },
  proSkipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  proTertiaryRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
  },
  proSkipButton: {
    width: '100%',
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  legalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  legalSheet: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 16,
    width: '100%',
    maxHeight: '78%',
    overflow: 'hidden',
  },
  legalScroll: {
    width: '100%',
  },
  legalScrollContent: {
    padding: 16,
    gap: 12,
  },
  legalTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  legalBody: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  legalActionStack: {
    width: '100%',
    gap: 10,
    marginTop: 4,
  },
  legalSecondaryCta: {
    width: '100%',
    backgroundColor: colors.cardElevated,
  },
  legalPrimaryCta: {
    width: '100%',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
});
