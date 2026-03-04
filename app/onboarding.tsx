import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronRight, ChevronLeft, Zap, Ruler, TrendingUp, X } from 'lucide-react-native';
import Colors from '../constants/colors';
import { formatNumber } from '../utils/formatNumber';
import { useUser } from '../providers/UserProvider';
import {
  Sex,
  ActivityLevel,
  Goal,
  GoalRate,
  MacroStrategy,
  DietaryModifier,
  MeasurementSystem,
  ACTIVITY_LABELS,
  ACTIVITY_DESCRIPTIONS,
  GOAL_LABELS,
  GOAL_RATE_LABELS,
  MACRO_STRATEGY_LABELS,
  DIETARY_MODIFIER_LABELS,
  strategyToPreference,
  kgToLb,
  ftInToCm,
} from '../types';
import { GOAL_DEFINITIONS, MACRO_STRATEGY_DEFINITIONS } from '../src/content/planDefinitions';
import PlanDefinitionSheet from '../components/ui/PlanDefinitionSheet';
import { calculateMacros } from '../utils/macroEngine';
import { addMeasurement } from '../storage/measurementsRepo';
import { setPromptSettings } from '../storage/measurementsRepo';
import { setAllergies } from '../storage/allergiesRepo';
import { MeasurementRecord, MeasurementPromptSettings } from '../features/progress/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_STEPS = 7;

const ALLERGY_QUICK_PICKS = [
  'Peanuts',
  'Tree nuts',
  'Milk/Dairy',
  'Eggs',
  'Wheat/Gluten',
  'Soy',
  'Fish',
  'Shellfish',
  'Sesame',
];

type StepProps = {
  onNext: () => void;
  onBack?: () => void;
};

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useUser();
  const navRouter = useRouter();
  const [step, setStep] = useState(0);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [age, setAge] = useState('28');
  const [sex, setSex] = useState<Sex>('male');
  const [measurementSystem, setMeasurementSystem] = useState<MeasurementSystem>('us');
  const [heightCm, setHeightCm] = useState('175');
  const [heightFt, setHeightFt] = useState('5');
  const [heightIn, setHeightIn] = useState('9');
  const [weightLb, setWeightLb] = useState('180');
  const [weightKg, setWeightKg] = useState('82');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderately_active');
  const [goal, setGoal] = useState<Goal>('cut');
  const [goalRate, setGoalRate] = useState<GoalRate>('moderate');
  const [macroStrategy, setMacroStrategy] = useState<MacroStrategy>('balanced');
  const [dietaryModifiers, setDietaryModifiers] = useState<DietaryModifier[]>([]);

  const [hasAllergies, setHasAllergies] = useState<'yes' | 'no'>('no');
  const [allergiesList, setAllergiesList] = useState<{ id: string; name: string }[]>([]);
  const [allergyInput, setAllergyInput] = useState('');

  const [baselineBodyFat, setBaselineBodyFat] = useState('');
  const [baselineWaist, setBaselineWaist] = useState('');
  const [baselineChest, setBaselineChest] = useState('');
  const [baselineDressSize, setBaselineDressSize] = useState('');

  const [definitionSheet, setDefinitionSheet] = useState<
    { type: 'goal'; id: Goal } | { type: 'strategy'; id: MacroStrategy } | null
  >(null);

  const animateProgress = useCallback((toStep: number) => {
    Animated.spring(progressAnim, {
      toValue: toStep / TOTAL_STEPS,
      useNativeDriver: false,
      tension: 50,
      friction: 10,
    }).start();
  }, [progressAnim]);

  const goNext = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (step < TOTAL_STEPS - 1) {
      const next = step + 1;
      setStep(next);
      animateProgress(next);
    }
  }, [step, animateProgress]);

  const goBack = useCallback(() => {
    if (step > 0) {
      const prev = step - 1;
      setStep(prev);
      animateProgress(prev);
    }
  }, [step, animateProgress]);

  const saveBaselineAndComplete = useCallback(async (skipBaseline: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    const finalHeightCm = measurementSystem === 'us'
      ? ftInToCm(parseInt(heightFt, 10) || 5, parseInt(heightIn, 10) || 9)
      : parseFloat(heightCm) || 175;
    const finalWeightLb = measurementSystem === 'us'
      ? parseFloat(weightLb) || 180
      : kgToLb(parseFloat(weightKg) || 82);

    const profile = {
      age: parseInt(age, 10) || 28,
      sex,
      height_cm: finalHeightCm,
      weight_lb: finalWeightLb,
      activity_level: activityLevel,
      goal,
      goal_rate: goalRate,
      preference: strategyToPreference(macroStrategy),
      macro_strategy: macroStrategy,
      dietary_modifiers: dietaryModifiers,
      measurement_system: measurementSystem,
    };

    if (!skipBaseline) {
      const bf = parseFloat(baselineBodyFat);
      const waist = parseFloat(baselineWaist);
      const chest = parseFloat(baselineChest);
      const hasAnyData = !isNaN(bf) || !isNaN(waist) || !isNaN(chest) || baselineDressSize.trim() !== '';

      if (hasAnyData) {
        const record: MeasurementRecord = {
          id: `baseline_${Date.now()}`,
          userId: 'local_user',
          recordedAt: new Date().toISOString(),
          weightLb: finalWeightLb,
          isBaseline: true,
        };
        if (!isNaN(bf) && bf >= 3 && bf <= 70) record.bodyFatPercent = bf;
        if (!isNaN(waist) && waist > 0) record.waistIn = waist;
        if (!isNaN(chest) && chest > 0) record.chestIn = chest;
        if (baselineDressSize.trim()) record.dressSize = baselineDressSize.trim();

        await addMeasurement(record);
        console.log('[onboarding] Saved baseline measurement:', record.id);
      }
    }

    const defaultSettings: MeasurementPromptSettings = {
      cadence: 'biweekly',
      dismissCount: 0,
      lastRecordedAt: skipBaseline ? undefined : new Date().toISOString(),
    };
    await setPromptSettings('local_user', defaultSettings);

    if (hasAllergies === 'yes' && allergiesList.length > 0) {
      const toSave = allergiesList.map((a) => ({
        id: a.id,
        name: a.name,
        normalized: a.name.trim().toLowerCase().replace(/\s+/g, ' '),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }));
      await setAllergies(toSave);
    } else {
      await setAllergies([]);
    }

    completeOnboarding(profile);
    router.replace('/(tabs)' as never);
  }, [age, sex, heightCm, heightFt, heightIn, weightLb, weightKg, measurementSystem, activityLevel, goal, goalRate, macroStrategy, dietaryModifiers, hasAllergies, allergiesList, completeOnboarding, baselineBodyFat, baselineWaist, baselineChest, baselineDressSize]);

  const handleComplete = useCallback(() => {
    saveBaselineAndComplete(false);
  }, [saveBaselineAndComplete]);

  const handleSkipBaseline = useCallback(() => {
    saveBaselineAndComplete(true);
  }, [saveBaselineAndComplete]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const renderOptionButton = <T extends string>(
    value: T,
    current: T,
    onSelect: (v: T) => void,
    label: string,
    description?: string
  ) => {
    const selected = value === current;
    return (
      <TouchableOpacity
        key={value}
        style={[styles.optionButton, selected && styles.optionButtonSelected]}
        onPress={() => {
          onSelect(value);
          if (Platform.OS !== 'web') {
            Haptics.selectionAsync();
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.optionContent}>
          <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
            {label}
          </Text>
          {description ? (
            <Text style={[styles.optionDescription, selected && styles.optionDescriptionSelected]}>
              {description}
            </Text>
          ) : null}
        </View>
        {selected && <View style={styles.optionDot} />}
      </TouchableOpacity>
    );
  };

  const handleToggleMeasurement = useCallback((system: MeasurementSystem) => {
    if (system === measurementSystem) return;
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setMeasurementSystem(system);
  }, [measurementSystem]);

  const renderStep0 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>About You</Text>
      <Text style={styles.stepSubtitle}>Let's personalize your targets</Text>

      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Age</Text>
          <TextInput
            style={styles.textInput}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            placeholderTextColor={Colors.textTertiary}
            placeholder="28"
            maxLength={3}
          />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Sex</Text>
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

      <View style={styles.measurementToggle}>
        <Text style={styles.inputLabel}>Units</Text>
        <View style={styles.measurementSegmentRow}>
          <TouchableOpacity
            style={[styles.measurementSegment, measurementSystem === 'us' && styles.measurementSegmentActive]}
            onPress={() => handleToggleMeasurement('us')}
          >
            <Text style={[styles.measurementSegmentText, measurementSystem === 'us' && styles.measurementSegmentTextActive]}>US</Text>
            <Text style={[styles.measurementSegmentSub, measurementSystem === 'us' && styles.measurementSegmentSubActive]}>ft/in · lb</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.measurementSegment, measurementSystem === 'metric' && styles.measurementSegmentActive]}
            onPress={() => handleToggleMeasurement('metric')}
          >
            <Text style={[styles.measurementSegmentText, measurementSystem === 'metric' && styles.measurementSegmentTextActive]}>Metric</Text>
            <Text style={[styles.measurementSegmentSub, measurementSystem === 'metric' && styles.measurementSegmentSubActive]}>cm · kg</Text>
          </TouchableOpacity>
        </View>
      </View>

      {measurementSystem === 'us' ? (
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Height</Text>
            <View style={styles.dualInputRow}>
              <View style={styles.dualInputField}>
                <TextInput
                  style={styles.textInput}
                  value={heightFt}
                  onChangeText={setHeightFt}
                  keyboardType="number-pad"
                  placeholderTextColor={Colors.textTertiary}
                  placeholder="5"
                  maxLength={2}
                />
                <Text style={styles.unitLabel}>ft</Text>
              </View>
              <View style={styles.dualInputField}>
                <TextInput
                  style={styles.textInput}
                  value={heightIn}
                  onChangeText={setHeightIn}
                  keyboardType="number-pad"
                  placeholderTextColor={Colors.textTertiary}
                  placeholder="9"
                  maxLength={2}
                />
                <Text style={styles.unitLabel}>in</Text>
              </View>
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Weight</Text>
            <View style={styles.dualInputField}>
              <TextInput
                style={styles.textInput}
                value={weightLb}
                onChangeText={setWeightLb}
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.textTertiary}
                placeholder="180"
                maxLength={5}
              />
              <Text style={styles.unitLabel}>lb</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.inputRow}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Height</Text>
            <View style={styles.dualInputField}>
              <TextInput
                style={styles.textInput}
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.textTertiary}
                placeholder="175"
                maxLength={5}
              />
              <Text style={styles.unitLabel}>cm</Text>
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Weight</Text>
            <View style={styles.dualInputField}>
              <TextInput
                style={styles.textInput}
                value={weightKg}
                onChangeText={setWeightKg}
                keyboardType="decimal-pad"
                placeholderTextColor={Colors.textTertiary}
                placeholder="82"
                maxLength={5}
              />
              <Text style={styles.unitLabel}>kg</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Activity Level</Text>
      <Text style={styles.stepSubtitle}>How active are you?</Text>
      <View style={styles.optionsList}>
        {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) =>
          renderOptionButton(level, activityLevel, setActivityLevel, ACTIVITY_LABELS[level], ACTIVITY_DESCRIPTIONS[level])
        )}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Your Goal</Text>
      <Text style={styles.stepSubtitle}>What are you working toward?</Text>
      <View style={styles.optionsList}>
        {(Object.keys(GOAL_DEFINITIONS) as Goal[]).map((g) => {
          const def = GOAL_DEFINITIONS[g];
          const selected = g === goal;
          return (
            <View key={g} style={styles.goalOptionWrap}>
              <TouchableOpacity
                style={[styles.optionButton, selected && styles.optionButtonSelected]}
                onPress={() => {
                  setGoal(g);
                  if (Platform.OS !== 'web') Haptics.selectionAsync();
                }}
                activeOpacity={0.7}
                accessibilityLabel={`${def.title}. ${def.shortDescription}`}
                accessibilityRole="button"
              >
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                    {def.title}
                  </Text>
                  <Text style={[styles.optionDescription, selected && styles.optionDescriptionSelected]}>
                    {def.shortDescription}
                  </Text>
                </View>
                {selected && <View style={styles.optionDot} />}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.learnMoreLink}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setDefinitionSheet({ type: 'goal', id: g });
                }}
                accessibilityLabel={`Learn more about ${def.title}`}
                accessibilityRole="button"
              >
                <Text style={styles.learnMoreText}>Learn more</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
      {goal !== 'maintain' && goal !== 'recompose' && (
        <View style={styles.rateSection}>
          <Text style={styles.rateSectionTitle}>Pace</Text>
          <View style={styles.rateRow}>
            {(Object.keys(GOAL_RATE_LABELS) as GoalRate[]).map((rate) => (
              <TouchableOpacity
                key={rate}
                style={[styles.rateChip, goalRate === rate && styles.rateChipActive]}
                onPress={() => setGoalRate(rate)}
              >
                <Text style={[styles.rateChipText, goalRate === rate && styles.rateChipTextActive]}>
                  {GOAL_RATE_LABELS[rate]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const toggleModifier = useCallback((mod: DietaryModifier) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setDietaryModifiers((prev) => {
      if (prev.includes(mod)) {
        let next = prev.filter((m) => m !== mod);
        if (mod === 'vegan') {
          next = next.filter((m) => m !== 'vegetarian');
        }
        return next;
      }
      let next = [...prev, mod];
      if (mod === 'vegan' && !next.includes('vegetarian')) {
        next.push('vegetarian');
      }
      return next;
    });
  }, []);

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Set Your Target</Text>
      <Text style={styles.stepSubtitle}>Make your goal measurable.</Text>
      <Text style={[styles.stepSubtitle, { marginBottom: 16, fontSize: 14 }]}>
        You can edit this anytime in Settings.
      </Text>
      <TouchableOpacity
        style={styles.optionButton}
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          navRouter.push({ pathname: '/set-target', params: { fromOnboarding: 'true' } } as never);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.optionContent}>
          <Text style={styles.optionLabel}>Set Target</Text>
          <Text style={styles.optionDescription}>
            Choose a metric (weight, body fat, waist) and target amount
          </Text>
        </View>
        <ChevronRight size={20} color={Colors.primary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.optionButton, { marginTop: 12, borderColor: Colors.cardBorder }]}
        onPress={() => {
          if (Platform.OS !== 'web') Haptics.selectionAsync();
          goNext();
        }}
        activeOpacity={0.7}
      >
        <View style={styles.optionContent}>
          <Text style={[styles.optionLabel, { color: Colors.textSecondary }]}>Skip for now</Text>
          <Text style={[styles.optionDescription, { color: Colors.textTertiary }]}>
            Set a target later in Settings
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderStep4 = () => {
    const previewHeightCm = measurementSystem === 'us'
      ? ftInToCm(parseInt(heightFt, 10) || 5, parseInt(heightIn, 10) || 9)
      : parseFloat(heightCm) || 175;
    const previewWeightLb = measurementSystem === 'us'
      ? parseFloat(weightLb) || 180
      : kgToLb(parseFloat(weightKg) || 82);
    const previewProfile = {
      age: parseInt(age, 10) || 28,
      sex,
      height_cm: previewHeightCm,
      weight_lb: previewWeightLb,
      activity_level: activityLevel,
      goal,
      goal_rate: goalRate,
      preference: strategyToPreference(macroStrategy),
      macro_strategy: macroStrategy,
      dietary_modifiers: dietaryModifiers,
      measurement_system: measurementSystem,
      onboarding_complete: true,
    };
    const macros = calculateMacros(previewProfile);

    const allModifiers: DietaryModifier[] = [
      'vegetarian', 'vegan', 'paleo', 'gluten_free', 'dairy_free', 'intermittent_fasting',
    ];

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Macro Strategy</Text>
        <Text style={styles.stepSubtitle}>Choose your macro approach</Text>
        <View style={styles.optionsList}>
          {(Object.keys(MACRO_STRATEGY_DEFINITIONS) as MacroStrategy[]).map((strat) => {
            const def = MACRO_STRATEGY_DEFINITIONS[strat];
            const selected = strat === macroStrategy;
            return (
              <View key={strat} style={styles.goalOptionWrap}>
                <TouchableOpacity
                  style={[styles.optionButton, selected && styles.optionButtonSelected]}
                  onPress={() => {
                    setMacroStrategy(strat);
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                  }}
                  activeOpacity={0.7}
                  accessibilityLabel={`${def.title}. ${def.shortDescription}`}
                  accessibilityRole="button"
                >
                  <View style={styles.optionContent}>
                    <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                      {def.title}
                    </Text>
                    <Text style={[styles.optionDescription, selected && styles.optionDescriptionSelected]}>
                      {def.shortDescription}
                    </Text>
                    <Text style={[styles.strategyPreview, selected && styles.strategyPreviewSelected]}>
                      {def.preview}
                    </Text>
                  </View>
                  {selected && <View style={styles.optionDot} />}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.learnMoreLink}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDefinitionSheet({ type: 'strategy', id: strat });
                  }}
                  accessibilityLabel={`Learn more about ${def.title}`}
                  accessibilityRole="button"
                >
                  <Text style={styles.learnMoreText}>Learn more</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        <View style={styles.modifierSection}>
          <Text style={styles.modifierSectionTitle}>Dietary Modifiers</Text>
          <Text style={styles.modifierSectionSubtitle}>Toggle any that apply</Text>
          <View style={styles.modifierChipsWrap}>
            {allModifiers.map((mod) => {
              const active = dietaryModifiers.includes(mod);
              const impliedByVegan = mod === 'vegetarian' && dietaryModifiers.includes('vegan');
              return (
                <TouchableOpacity
                  key={mod}
                  style={[styles.modifierChip, active && styles.modifierChipActive]}
                  onPress={() => toggleModifier(mod)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.modifierChipText, active && styles.modifierChipTextActive]}>
                    {DIETARY_MODIFIER_LABELS[mod]}
                  </Text>
                  {impliedByVegan && (
                    <View style={styles.modifierImpliedDot} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.previewCard}>
          <View style={styles.previewHeader}>
            <Zap size={16} color={Colors.primary} />
            <Text style={styles.previewTitle}>Your Daily Targets</Text>
          </View>
          <View style={styles.previewMacros}>
            <View style={styles.previewMacro}>
              <Text style={[styles.previewValue, { color: Colors.calories }]}>{formatNumber(macros.calories)}</Text>
              <Text style={styles.previewLabel}>cal</Text>
            </View>
            <View style={styles.previewDivider} />
            <View style={styles.previewMacro}>
              <Text style={[styles.previewValue, { color: Colors.protein }]}>{formatNumber(macros.protein_g)}g</Text>
              <Text style={styles.previewLabel}>protein</Text>
            </View>
            <View style={styles.previewDivider} />
            <View style={styles.previewMacro}>
              <Text style={[styles.previewValue, { color: Colors.carbs }]}>{formatNumber(macros.carbs_g)}g</Text>
              <Text style={styles.previewLabel}>carbs</Text>
            </View>
            <View style={styles.previewDivider} />
            <View style={styles.previewMacro}>
              <Text style={[styles.previewValue, { color: Colors.fat }]}>{formatNumber(macros.fat_g)}g</Text>
              <Text style={styles.previewLabel}>fat</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const addAllergyFromInput = useCallback(() => {
    const trimmed = allergyInput.trim();
    if (!trimmed) return;
    const norm = trimmed.toLowerCase();
    if (allergiesList.some((a) => a.name.toLowerCase() === norm)) return;
    setAllergiesList((prev) => [...prev, { id: `a_${Date.now()}`, name: trimmed }]);
    setAllergyInput('');
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  }, [allergyInput, allergiesList]);

  const removeAllergy = useCallback((id: string) => {
    setAllergiesList((prev) => prev.filter((a) => a.id !== id));
    if (Platform.OS !== 'web') Haptics.selectionAsync();
  }, []);

  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Food Allergies</Text>
      <Text style={styles.stepSubtitle}>We'll avoid these in your meal plan.</Text>
      <Text style={[styles.inputLabel, { marginBottom: 12 }]}>Do you have any food allergies?</Text>
      <View style={styles.segmentRow}>
        <TouchableOpacity
          style={[styles.segment, hasAllergies === 'no' && styles.segmentActive]}
          onPress={() => setHasAllergies('no')}
        >
          <Text style={[styles.segmentText, hasAllergies === 'no' && styles.segmentTextActive]}>No</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segment, hasAllergies === 'yes' && styles.segmentActive]}
          onPress={() => setHasAllergies('yes')}
        >
          <Text style={[styles.segmentText, hasAllergies === 'yes' && styles.segmentTextActive]}>Yes</Text>
        </TouchableOpacity>
      </View>

      {hasAllergies === 'no' && (
        <>
          <Text style={[styles.stepSubtitle, { marginTop: 12, fontSize: 13 }]}>
            You can update this anytime in Settings.
          </Text>
        </>
      )}

      {hasAllergies === 'yes' && (
        <>
          <View style={[styles.inputGroup, { marginTop: 20 }]}>
            <Text style={styles.inputLabel}>Add allergies</Text>
            <View style={styles.allergyInputRow}>
              <TextInput
                style={[styles.textInput, styles.textInputFlex]}
                value={allergyInput}
                onChangeText={setAllergyInput}
                placeholder="Search or type an allergy…"
                placeholderTextColor={Colors.textTertiary}
                onSubmitEditing={addAllergyFromInput}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={styles.addAllergyBtn}
                onPress={addAllergyFromInput}
                disabled={!allergyInput.trim()}
              >
                <Text style={styles.addAllergyBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.quickPickWrap}>
            {ALLERGY_QUICK_PICKS.map((label) => {
              const norm = label.toLowerCase();
              const added = allergiesList.some((a) => a.name.toLowerCase() === norm);
              return (
                <TouchableOpacity
                  key={label}
                  style={[styles.quickPickChip, added && styles.quickPickChipAdded]}
                  onPress={() => {
                    if (added) return;
                    setAllergiesList((prev) => [...prev, { id: `a_${Date.now()}_${label}`, name: label }]);
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                  }}
                  disabled={added}
                >
                  <Text style={[styles.quickPickChipText, added && styles.quickPickChipTextAdded]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {allergiesList.length > 0 && (
            <View style={styles.allergyPillsWrap}>
              {allergiesList.map((a) => (
                <View key={a.id} style={styles.allergyPill}>
                  <Text style={styles.allergyPillText}>{a.name}</Text>
                  <TouchableOpacity
                    onPress={() => removeAllergy(a.id)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={14} color={Colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <Text style={[styles.stepSubtitle, { marginTop: 16, fontSize: 12, color: Colors.textTertiary }]}>
            For severe allergies, always verify labels and ingredients.
          </Text>
        </>
      )}
    </View>
  );

  const renderStep6 = () => (
    <View style={styles.stepContainer}>
      <View style={styles.baselineTitleRow}>
        <Text style={[styles.stepTitle, { marginBottom: 0 }]}>Baseline{"\n"}Measurements</Text>
        <View style={styles.baselineIconBg}>
          <Ruler size={24} color={Colors.success} />
        </View>
      </View>
      <Text style={styles.stepSubtitle}>
        Track progress beyond the scale. These help us show meaningful results based on your {GOAL_LABELS[goal].toLowerCase()} goal.
      </Text>

      <View style={styles.baselineValueCard}>
        <TrendingUp size={16} color={Colors.primary} />
        <Text style={styles.baselineValueText}>
          Measurements like waist and body fat reveal real changes that weight alone can't show.
        </Text>
      </View>

      <View style={styles.baselineFields}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Body Fat % (optional)</Text>
          <View style={styles.dualInputField}>
            <TextInput
              style={styles.textInput}
              value={baselineBodyFat}
              onChangeText={setBaselineBodyFat}
              keyboardType="decimal-pad"
              placeholderTextColor={Colors.textTertiary}
              placeholder="e.g. 20"
              maxLength={4}
            />
            <Text style={styles.unitLabel}>%</Text>
          </View>
        </View>

        {sex === 'male' ? (
          <>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Waist (optional)</Text>
                <View style={styles.dualInputField}>
                  <TextInput
                    style={styles.textInput}
                    value={baselineWaist}
                    onChangeText={setBaselineWaist}
                    keyboardType="decimal-pad"
                    placeholderTextColor={Colors.textTertiary}
                    placeholder="e.g. 34"
                    maxLength={5}
                  />
                  <Text style={styles.unitLabel}>in</Text>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Chest (optional)</Text>
                <View style={styles.dualInputField}>
                  <TextInput
                    style={styles.textInput}
                    value={baselineChest}
                    onChangeText={setBaselineChest}
                    keyboardType="decimal-pad"
                    placeholderTextColor={Colors.textTertiary}
                    placeholder="e.g. 42"
                    maxLength={5}
                  />
                  <Text style={styles.unitLabel}>in</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Waist (optional)</Text>
                <View style={styles.dualInputField}>
                  <TextInput
                    style={styles.textInput}
                    value={baselineWaist}
                    onChangeText={setBaselineWaist}
                    keyboardType="decimal-pad"
                    placeholderTextColor={Colors.textTertiary}
                    placeholder="e.g. 28"
                    maxLength={5}
                  />
                  <Text style={styles.unitLabel}>in</Text>
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Dress Size (optional)</Text>
                <TextInput
                  style={styles.textInput}
                  value={baselineDressSize}
                  onChangeText={setBaselineDressSize}
                  keyboardType="default"
                  placeholderTextColor={Colors.textTertiary}
                  placeholder="e.g. 8"
                  maxLength={5}
                />
              </View>
            </View>
          </>
        )}
      </View>
    </View>
  );

  const steps = [renderStep0, renderStep1, renderStep2, renderStep3, renderStep4, renderStep5, renderStep6];
  const isLastStep = step === TOTAL_STEPS - 1;

  const canSaveAllergies = hasAllergies === 'yes' && allergiesList.length > 0;

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
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {steps[step]()}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.footerRow}>
          {step > 0 ? (
            <TouchableOpacity style={styles.backButton} onPress={goBack} activeOpacity={0.7}>
              <ChevronLeft size={20} color={Colors.textSecondary} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}

          {step === 5 && hasAllergies === 'yes' ? (
            <View style={styles.allergyFooterRow}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={goNext}
                activeOpacity={0.8}
              >
                <Text style={styles.skipButtonText}>Skip for now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.nextButton, styles.nextButtonHalf, !canSaveAllergies && styles.nextButtonDisabled]}
                onPress={goNext}
                activeOpacity={0.8}
                disabled={!canSaveAllergies}
              >
                <Text style={styles.nextButtonText}>Save & Continue</Text>
                <ChevronRight size={18} color={Colors.white} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={isLastStep ? handleComplete : goNext}
              activeOpacity={0.8}
            >
              <Text style={styles.nextButtonText}>{isLastStep ? 'Get Started' : 'Continue'}</Text>
              <ChevronRight size={18} color={Colors.white} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {definitionSheet && (
        <PlanDefinitionSheet
          visible={!!definitionSheet}
          title={
            definitionSheet.type === 'goal'
              ? GOAL_DEFINITIONS[definitionSheet.id].title
              : MACRO_STRATEGY_DEFINITIONS[definitionSheet.id].title
          }
          sections={
            definitionSheet.type === 'goal'
              ? GOAL_DEFINITIONS[definitionSheet.id].learnMore
              : MACRO_STRATEGY_DEFINITIONS[definitionSheet.id].learnMore
          }
          onClose={() => setDefinitionSheet(null)}
        />
      )}
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 12,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.cardElevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  stepIndicator: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  stepContainer: {
    paddingTop: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '800' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 28,
    lineHeight: 22,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 17,
    fontWeight: '600' as const,
  },
  textInputFlex: {
    flex: 1,
  },
  measurementToggle: {
    marginBottom: 16,
  },
  measurementSegmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  measurementSegment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    alignItems: 'center',
  },
  measurementSegmentActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  measurementSegmentText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  measurementSegmentTextActive: {
    color: Colors.primary,
  },
  measurementSegmentSub: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  measurementSegmentSubActive: {
    color: Colors.primary,
    opacity: 0.7,
  },
  dualInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dualInputField: {
    flex: 1,
  },
  unitLabel: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
    position: 'absolute' as const,
    right: 12,
    top: 15,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  segmentText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  segmentTextActive: {
    color: Colors.primary,
  },
  optionsList: {
    gap: 10,
  },
  goalOptionWrap: {
    gap: 4,
  },
  learnMoreLink: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingRight: 4,
  },
  learnMoreText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  strategyPreview: {
    color: Colors.textTertiary,
    fontSize: 12,
    marginTop: 4,
  },
  strategyPreviewSelected: {
    color: Colors.primary,
    opacity: 0.8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  optionButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  optionLabelSelected: {
    color: Colors.primary,
  },
  optionDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  optionDescriptionSelected: {
    color: Colors.primary,
    opacity: 0.8,
  },
  optionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  rateSection: {
    marginTop: 24,
  },
  rateSectionTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  rateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  rateChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    alignItems: 'center',
  },
  rateChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  rateChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    textAlign: 'center' as const,
  },
  rateChipTextActive: {
    color: Colors.primary,
  },
  previewCard: {
    marginTop: 28,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  previewTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  previewMacros: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewMacro: {
    flex: 1,
    alignItems: 'center',
  },
  previewValue: {
    fontSize: 20,
    fontWeight: '800' as const,
  },
  previewLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  previewDivider: {
    width: 1,
    height: 30,
    backgroundColor: Colors.cardBorder,
  },
  modifierSection: {
    marginTop: 28,
  },
  modifierSectionTitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  modifierSectionSubtitle: {
    color: Colors.textTertiary,
    fontSize: 13,
    marginBottom: 14,
  },
  modifierChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modifierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    gap: 6,
  },
  modifierChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  modifierChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  modifierChipTextActive: {
    color: Colors.primary,
  },
  modifierImpliedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: Colors.primary,
    opacity: 0.6,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 80,
  },
  backButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500' as const,
  },
  nextButton: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
  },
  nextButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextButtonHalf: {
    width: 'auto',
    flex: 1,
  },
  skipButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  skipButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  allergyFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  allergyInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  addAllergyBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 18,
    borderRadius: 12,
    justifyContent: 'center',
  },
  addAllergyBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  quickPickWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  quickPickChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
  },
  quickPickChipAdded: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
    opacity: 0.7,
  },
  quickPickChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  quickPickChipTextAdded: {
    color: Colors.primary,
  },
  allergyPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  allergyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  allergyPillText: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  baselineTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  baselineIconBg: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.successMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  baselineValueCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  baselineValueText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  baselineFields: {
    gap: 16,
  },
});
