import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DismissKeyboard from '../components/ui/DismissKeyboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, ChevronRight, Info, Zap } from 'lucide-react-native';
import Colors from '../constants/colors';
import { FOODS } from '../constants/foodDatabase';
import { setDislikedFoods } from '../storage/dislikedFoodsRepo';
import PlanDefinitionSheet from '../components/ui/PlanDefinitionSheet';
import { useUser } from '../providers/UserProvider';
import { usePro } from '../providers/ProProvider';
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
import { useThemeColors, type AppColors } from '../providers/ThemeProvider';
import ResponsiveContainer from '../components/ui/ResponsiveContainer';
import ProInfoModal from '../components/ui/ProInfoModal';
import { PRO_COPY } from '../src/content/proMicrocopy';

const TOTAL_STEPS = 9;

const PROTEIN_FOOD_IDS = [
  'bacon', 'beef_jerky', 'beef_liver', 'black_beans', 'bone_broth',
  'chicken_breast', 'chickpeas', 'cod', 'cottage_cheese', 'edamame',
  'eggs', 'greek_yogurt', 'ground_beef_80', 'ground_beef_90',
  'hard_boiled_eggs', 'lamb_chop', 'lentils', 'plant_protein',
  'pork_loin', 'pork_rinds', 'ribeye', 'salmon', 'sea_bass',
  'shrimp', 'tempeh', 'tofu', 'tuna_canned', 'turkey_breast',
  'whey_protein',
].sort((a, b) => FOODS[a].name.localeCompare(FOODS[b].name));

const CARB_FOOD_IDS = [
  'apple', 'asparagus', 'banana', 'bell_pepper', 'berries',
  'broccoli', 'brown_rice', 'cauliflower', 'corn_tortilla',
  'couscous', 'cucumber', 'dates', 'green_beans', 'mixed_greens',
  'oats_dry', 'pita', 'potato', 'quinoa', 'rice_cake',
  'roasted_veggies', 'sauerkraut', 'spinach_cooked', 'sweet_potato',
  'tabbouleh', 'tomato', 'tortilla', 'white_rice', 'ww_bread',
  'ww_pasta', 'zucchini',
].sort((a, b) => FOODS[a].name.localeCompare(FOODS[b].name));

const FAT_FOOD_IDS = [
  'almond_butter', 'almonds', 'avocado', 'butter', 'cheddar',
  'coconut_oil', 'cream_cheese', 'dark_chocolate', 'feta',
  'hummus', 'macadamia', 'mixed_nuts', 'mozzarella', 'olive_oil',
  'olives', 'peanut_butter', 'string_cheese', 'tahini',
  'trail_mix', 'walnuts',
].sort((a, b) => FOODS[a].name.localeCompare(FOODS[b].name));

export default function OnboardingScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const { completeOnboarding } = useUser();
  const { setEntitlement } = usePro();
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
  const [dislikedFoodIds, setDislikedFoodIds] = useState<string[]>([]);
  const [definitionSheetVisible, setDefinitionSheetVisible] = useState(false);
  const [definitionSheetTitle, setDefinitionSheetTitle] = useState('');
  const [definitionSheetSections, setDefinitionSheetSections] = useState<LearnMoreSection[]>([]);
  const [proInfoVisible, setProInfoVisible] = useState(false);

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

  const toggleDislikedFood = useCallback((foodId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
    setDislikedFoodIds((prev) =>
      prev.includes(foodId)
        ? prev.filter((id) => id !== foodId)
        : [...prev, foodId]
    );
  }, []);

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

  const handleComplete = useCallback(async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (dislikedFoodIds.length > 0) {
      await setDislikedFoods(
        dislikedFoodIds.map((foodId) => ({
          id: `dislike_${foodId}`,
          foodId,
          name: FOODS[foodId].name,
          createdAt: Date.now(),
        }))
      );
    }
    completeOnboarding(draftProfile);
    router.replace('/(tabs)' as never);
  }, [completeOnboarding, draftProfile, dislikedFoodIds]);

  const confirmProAction = useCallback((title: string, message: string, onConfirm: () => void) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: onConfirm },
    ]);
  }, []);

  const completeWithProEntitlement = useCallback(
    (entitlement: 'core_active' | 'pro_trial_active' | 'pro_subscriber_active') => {
      if (entitlement === 'core_active') {
        setEntitlement('core_active');
        void handleComplete();
        return;
      }
      const title = entitlement === 'pro_trial_active' ? 'Start Pro trial?' : 'Confirm Pro subscription?';
      const message =
        entitlement === 'pro_trial_active'
          ? PRO_COPY.renewalDisclosure
          : 'You are choosing Pro monthly access at $4.99/month. You can manage or cancel in Apple ID Subscriptions.';
      confirmProAction(title, message, () => {
        setEntitlement(entitlement);
        void handleComplete();
      });
    },
    [confirmProAction, handleComplete, setEntitlement]
  );

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
            <Info size={14} color={colors.primary} />
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
        'Eating style shapes your meal plan foods and, for keto/carnivore, the carb-fat split of your macros.',
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

  const renderFoodDislikeGrid = (title: string, subtitle: string, foodIds: string[]) => (
    <View style={styles.stepContainer}>
      {renderStepHeader(title, subtitle)}
      <View style={styles.foodGrid}>
        {foodIds.map((foodId) => {
          const food = FOODS[foodId];
          const active = dislikedFoodIds.includes(foodId);
          return (
            <TouchableOpacity
              key={foodId}
              style={[styles.foodChip, active && styles.foodChipActive]}
              onPress={() => toggleDislikedFood(foodId)}
              activeOpacity={0.8}
            >
              <Text style={[styles.foodChipText, active && styles.foodChipTextActive]}>
                {food.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.foodDislikeNote}>Tap to mark foods you'd rather avoid.</Text>
    </View>
  );

  const renderProteinDislikesStep = () =>
    renderFoodDislikeGrid(
      'Proteins You Dislike',
      "We'll avoid these when building your protein sources.",
      PROTEIN_FOOD_IDS
    );

  const renderCarbDislikesStep = () =>
    renderFoodDislikeGrid(
      'Carbs You Dislike',
      "We'll avoid these when building your carb sources.",
      CARB_FOOD_IDS
    );

  const renderFatDislikesStep = () =>
    renderFoodDislikeGrid(
      'Fats You Dislike',
      "We'll avoid these when building your fat sources.",
      FAT_FOOD_IDS
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
          <Zap size={16} color={colors.primary} />
          <Text style={styles.previewTitle}>Estimated Daily Targets</Text>
        </View>
        <View style={styles.previewRow}>
          <PreviewMetric label="Calories" value={String(previewMacros.calories)} color={Colors.calories} styles={styles} />
          <PreviewMetric label="Protein" value={`${previewMacros.protein_g}g`} color={Colors.protein} styles={styles} />
          <PreviewMetric label="Carbs" value={`${previewMacros.carbs_g}g`} color={Colors.carbs} styles={styles} />
          <PreviewMetric label="Fat" value={`${previewMacros.fat_g}g`} color={Colors.fat} styles={styles} />
        </View>
      </View>
    </View>
  );

  const renderProUpsellStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepHeaderRow}>
        <Text style={styles.stepTitle}>{PRO_COPY.headline}</Text>
        <TouchableOpacity style={styles.learnMoreButton} onPress={() => setProInfoVisible(true)}>
          <Info size={14} color={colors.primary} />
          <Text style={styles.learnMoreText}>Info</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.stepSubtitle}>{PRO_COPY.subheadline}</Text>
      <View style={styles.choiceList}>
        {PRO_COPY.featureBullets.map((line) => (
          <View key={line} style={styles.proFeatureRow}>
            <View style={styles.choiceDot} />
            <Text style={styles.proFeatureText}>{line}</Text>
          </View>
        ))}
      </View>
      <View style={styles.proTrialCard}>
        <Text style={styles.proTrialTitle}>{PRO_COPY.trialTitle}</Text>
        <Text style={styles.proTrialSubtitle}>{PRO_COPY.trialDetail}</Text>
        <Text style={styles.proDisclosure}>{PRO_COPY.renewalDisclosure}</Text>
      </View>
      <View style={styles.proCtaRow}>
        <TouchableOpacity style={styles.proOutlinedCta} onPress={() => completeWithProEntitlement('pro_trial_active')}>
          <Text style={styles.proOutlinedCtaText}>{PRO_COPY.ctaTrial}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.proOutlinedCta, styles.proOutlinedCtaActive]} onPress={() => completeWithProEntitlement('pro_subscriber_active')}>
          <Text style={[styles.proOutlinedCtaText, styles.proOutlinedCtaTextActive]}>{PRO_COPY.ctaSubscribe}</Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={() => completeWithProEntitlement('core_active')}>
        <Text style={styles.proSkipText}>{PRO_COPY.ctaNotNow}</Text>
      </TouchableOpacity>
    </View>
  );

  const steps = [
    renderProfileStep,
    renderGoalStep,
    renderActivityStep,
    renderEatingStyleStep,
    renderProteinDislikesStep,
    renderCarbDislikesStep,
    renderFatDislikesStep,
    renderRestrictionStep,
    renderProUpsellStep,
  ];

  const isLastStep = step === TOTAL_STEPS - 1;

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
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <ResponsiveContainer>
          {steps[step]()}
          </ResponsiveContainer>
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
          onPress={isLastStep ? () => completeWithProEntitlement('core_active') : goNext}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryButtonText}>{isLastStep ? 'Finish' : 'Continue'}</Text>
          <ChevronRight size={18} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>

      <PlanDefinitionSheet
        visible={definitionSheetVisible}
        title={definitionSheetTitle}
        sections={definitionSheetSections}
        onClose={() => setDefinitionSheetVisible(false)}
      />
      <ProInfoModal visible={proInfoVisible} onClose={() => setProInfoVisible(false)} />
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
    backgroundColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
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
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  segmentText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: colors.primary,
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
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
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
    color: colors.primary,
  },
  choiceDescription: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  choiceDescriptionSelected: {
    color: colors.primary,
  },
  choiceDot: {
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
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  chipTextActive: {
    color: colors.primary,
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
    backgroundColor: colors.primary,
  },
  primaryButtonText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '800',
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
    borderColor: Colors.cardBorder,
    backgroundColor: Colors.card,
    alignItems: 'center',
  },
  foodChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  foodChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  foodChipTextActive: {
    color: colors.primary,
  },
  foodDislikeNote: {
    color: Colors.textTertiary,
    fontSize: 12,
    marginTop: 4,
  },
  proFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  proFeatureText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  proTrialCard: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: 16,
    padding: 14,
    gap: 6,
  },
  proTrialTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  proTrialSubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  proDisclosure: {
    color: Colors.textTertiary,
    fontSize: 12,
    lineHeight: 17,
  },
  proCtaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  proOutlinedCta: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.cardBorder,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  proOutlinedCtaActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  proOutlinedCtaText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  proOutlinedCtaTextActive: {
    color: colors.primary,
  },
  proSkipText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
});
