import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight, Info, Zap } from 'lucide-react-native';
import Colors from '../constants/colors';
import PlanDefinitionSheet from '../components/ui/PlanDefinitionSheet';
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

const TOTAL_STEPS = 5;

export default function OnboardingScreen() {
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
  const [dietModifiers, setDietModifiers] = useState<DietaryModifier[]>([]);
  const [dietNotes, setDietNotes] = useState('');
  const [definitionSheetVisible, setDefinitionSheetVisible] = useState(false);
  const [definitionSheetTitle, setDefinitionSheetTitle] = useState('');
  const [definitionSheetSections, setDefinitionSheetSections] = useState<LearnMoreSection[]>([]);

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
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    if (step < TOTAL_STEPS - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      animateProgress(nextStep);
    }
  }, [animateProgress, step]);

  const goBack = useCallback(() => {
    if (step === 0) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    const nextStep = step - 1;
    setStep(nextStep);
    animateProgress(nextStep);
  }, [animateProgress, step]);

  const toggleDietModifier = useCallback((modifier: DietaryModifier) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
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
    const finalWeightLb =
      measurementSystem === 'us'
        ? parseFloat(weightLb) || 180
        : kgToLb(parseFloat(weightKg) || 82);
    const parsedBodyFat = parseFloat(bodyFatPercent);

    return {
      age: parseInt(age, 10) || 28,
      sex,
      heightCm: finalHeightCm,
      weightLb: finalWeightLb,
      bodyFatPercent: Number.isFinite(parsedBodyFat) ? parsedBodyFat : undefined,
      goal,
      activityLevel,
      eatingStyle,
      dietModifiers,
      dietNotes: dietNotes.trim(),
      measurementSystem,
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
    sex,
    weightKg,
    weightLb,
  ]);

  const previewMacros = useMemo(() => calculateMacros({ ...draftProfile, onboardingComplete: true }), [draftProfile]);

  const handleComplete = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    completeOnboarding(draftProfile);
    router.replace('/(tabs)' as never);
  }, [completeOnboarding, draftProfile]);

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
      <TouchableOpacity
        key={value}
        style={[styles.choiceCard, selected && styles.choiceCardSelected]}
        onPress={() => onSelect(value)}
        activeOpacity={0.8}
      >
        <View style={styles.choiceCopy}>
          <Text style={[styles.choiceTitle, selected && styles.choiceTitleSelected]}>{label}</Text>
          {description ? (
            <Text style={[styles.choiceDescription, selected && styles.choiceDescriptionSelected]}>
              {description}
            </Text>
          ) : null}
        </View>
        {selected ? <View style={styles.choiceDot} /> : null}
      </TouchableOpacity>
    );
  };

  const openDefinitionSheet = useCallback((title: string, sections: LearnMoreSection[]) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setDefinitionSheetTitle(title);
    setDefinitionSheetSections(sections);
    setDefinitionSheetVisible(true);
  }, []);

  const renderStepHeader = (title: string, subtitle: string, onLearnMore?: () => void) => (
    <>
      <View style={styles.stepHeaderRow}>
        <Text style={styles.stepTitle}>{title}</Text>
        {onLearnMore ? (
          <TouchableOpacity
            style={styles.learnMoreButton}
            onPress={onLearnMore}
            activeOpacity={0.8}
          >
            <Info size={14} color={Colors.primary} />
            <Text style={styles.learnMoreText}>Learn More</Text>
          </TouchableOpacity>
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
            placeholderTextColor={Colors.textTertiary}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Sex</Text>
          <View style={styles.segmentRow}>
            <TouchableOpacity
              style={[styles.segment, sex === 'male' && styles.segmentActive]}
              onPress={() => setSex('male')}
            >
              <Text style={[styles.segmentText, sex === 'male' && styles.segmentTextActive]}>Male</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segment, sex === 'female' && styles.segmentActive]}
              onPress={() => setSex('female')}
            >
              <Text style={[styles.segmentText, sex === 'female' && styles.segmentTextActive]}>Female</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <Text style={styles.label}>Units</Text>
      <View style={styles.segmentRow}>
        <TouchableOpacity
          style={[styles.segment, measurementSystem === 'us' && styles.segmentActive]}
          onPress={() => setMeasurementSystem('us')}
        >
          <Text style={[styles.segmentText, measurementSystem === 'us' && styles.segmentTextActive]}>US</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, measurementSystem === 'metric' && styles.segmentActive]}
          onPress={() => setMeasurementSystem('metric')}
        >
          <Text style={[styles.segmentText, measurementSystem === 'metric' && styles.segmentTextActive]}>Metric</Text>
        </TouchableOpacity>
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
                placeholderTextColor={Colors.textTertiary}
              />
              <TextInput
                style={[styles.input, styles.dualInput]}
                value={heightIn}
                onChangeText={setHeightIn}
                keyboardType="number-pad"
                placeholder="9"
                placeholderTextColor={Colors.textTertiary}
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
              placeholderTextColor={Colors.textTertiary}
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
              placeholderTextColor={Colors.textTertiary}
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
              placeholderTextColor={Colors.textTertiary}
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
          placeholderTextColor={Colors.textTertiary}
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

  const renderEatingStyleStep = () => (
    <View style={styles.stepContainer}>
      {renderStepHeader(
        'Eating Style',
        'Eating style affects the foods used in your meal plan.',
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
        {(Object.keys(EATING_STYLE_LABELS) as EatingStyle[]).map((value) =>
          renderChoice(value, eatingStyle, setEatingStyle, EATING_STYLE_LABELS[value], EATING_STYLE_DESCRIPTIONS[value])
        )}
      </View>
    </View>
  );

  const renderRestrictionStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Dietary Restrictions</Text>
      <Text style={styles.stepSubtitle}>Select any restrictions or preferences that should shape your meal plan.</Text>
      <View style={styles.chipWrap}>
        {(Object.keys(DIETARY_MODIFIER_LABELS) as DietaryModifier[]).map((modifier) => {
          const active = dietModifiers.includes(modifier);
          return (
            <TouchableOpacity
              key={modifier}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => toggleDietModifier(modifier)}
              activeOpacity={0.8}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {DIETARY_MODIFIER_LABELS[modifier]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>Other dietary notes (optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          multiline
          value={dietNotes}
          onChangeText={setDietNotes}
          placeholder="Add any extra food preferences, dislikes, or notes."
          placeholderTextColor={Colors.textTertiary}
        />
      </View>

      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <Zap size={16} color={Colors.primary} />
          <Text style={styles.previewTitle}>Estimated Daily Targets</Text>
        </View>
        <View style={styles.previewRow}>
          <PreviewMetric label="Calories" value={String(previewMacros.calories)} color={Colors.calories} />
          <PreviewMetric label="Protein" value={`${previewMacros.protein_g}g`} color={Colors.protein} />
          <PreviewMetric label="Carbs" value={`${previewMacros.carbs_g}g`} color={Colors.carbs} />
          <PreviewMetric label="Fat" value={`${previewMacros.fat_g}g`} color={Colors.fat} />
        </View>
      </View>
    </View>
  );

  const steps = [
    renderProfileStep,
    renderGoalStep,
    renderActivityStep,
    renderEatingStyleStep,
    renderRestrictionStep,
  ];

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {steps[step]()}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={[styles.footerButton, step === 0 && styles.footerButtonGhost]}
          onPress={goBack}
          disabled={step === 0}
          activeOpacity={0.8}
        >
          {step > 0 ? <ChevronLeft size={18} color={Colors.textSecondary} /> : null}
          <Text style={[styles.footerButtonText, step === 0 && styles.footerButtonTextGhost]}>Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.footerButton, styles.primaryButton]}
          onPress={isLastStep ? handleComplete : goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>{isLastStep ? 'Finish' : 'Continue'}</Text>
          <ChevronRight size={18} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <PlanDefinitionSheet
        visible={definitionSheetVisible}
        title={definitionSheetTitle}
        sections={definitionSheetSections}
        onClose={() => setDefinitionSheetVisible(false)}
      />
    </View>
  );
}

function PreviewMetric({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.previewMetric}>
      <Text style={[styles.previewValue, { color }]}>{value}</Text>
      <Text style={styles.previewLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 999,
  },
  stepIndicator: {
    color: Colors.textSecondary,
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
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  stepTitle: {
    color: Colors.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.5,
    flex: 1,
  },
  stepSubtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  learnMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  learnMoreText: {
    color: Colors.primary,
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
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
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
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  segmentActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  segmentText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: Colors.primary,
  },
  choiceList: {
    gap: 12,
  },
  choiceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 18,
  },
  choiceCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  choiceCopy: {
    flex: 1,
  },
  choiceTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  choiceTitleSelected: {
    color: Colors.primary,
  },
  choiceDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  choiceDescriptionSelected: {
    color: Colors.primary,
  },
  choiceDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
    backgroundColor: Colors.primary,
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
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: Colors.primary,
  },
  previewCard: {
    marginTop: 8,
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    gap: 14,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewTitle: {
    color: Colors.text,
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
    fontSize: 18,
    fontWeight: '800',
  },
  previewLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 12,
  },
  footerButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  footerButtonGhost: {
    opacity: 0.45,
  },
  footerButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  footerButtonTextGhost: {
    color: Colors.textTertiary,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
  },
  primaryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
