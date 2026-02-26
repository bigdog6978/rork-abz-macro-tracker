import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { User, Calculator, Trash2, ChevronRight, Shield, RefreshCw, FileText, ScrollText, Mail, Ruler, Bell } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Colors from '../../../constants/colors';
import { Radius, Spacing, Shadows } from '../../../theme/tokens';
import { formatNumber } from '../../../utils/formatNumber';
import { useUser } from '../../../providers/UserProvider';
import { useDailyLog } from '../../../providers/DailyLogProvider';
import { useMeasurements } from '../../../providers/MeasurementsProvider';
import { PromptCadence, CADENCE_LABELS } from '../../../features/progress/types';
import * as foodService from '../../../features/food/foodService';
import {
  ACTIVITY_LABELS,
  GOAL_LABELS,
  GOAL_RATE_LABELS,
  MACRO_STRATEGY_LABELS,
  MACRO_STRATEGY_DESCRIPTIONS,
  DIETARY_MODIFIER_LABELS,
  ActivityLevel,
  Goal,
  GoalRate,
  MacroStrategy,
  DietaryModifier,
  Sex,
  MeasurementSystem,
  strategyToPreference,
  lbToKg,
  kgToLb,
  cmToFtIn,
  ftInToCm,
} from '../../../types';

type EditMode = 'none' | 'profile' | 'goal' | 'strategy';

export default function SettingsScreen() {
  const { profile, macros, updateProfile, resetProfile } = useUser();
  const { clearAll } = useDailyLog();
  const { promptSettings, updateCadence, records } = useMeasurements();
  const router = useRouter();
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [usdaHealth, setUsdaHealth] = useState<{
    ok: boolean;
    error?: string;
    status?: number;
    keySuffix?: string;
  } | null>(null);

  const [age, setAge] = useState(profile.age.toString());
  const [sex, setSex] = useState<Sex>(profile.sex);
  const [measurementSystem, setMeasurementSystem] = useState<MeasurementSystem>(profile.measurement_system ?? 'us');
  const initFtIn = cmToFtIn(profile.height_cm);
  const [heightCm, setHeightCm] = useState(profile.height_cm.toString());
  const [heightFt, setHeightFt] = useState(initFtIn.ft.toString());
  const [heightIn, setHeightIn] = useState(initFtIn.inches.toString());
  const [weightLb, setWeightLb] = useState(profile.weight_lb.toString());
  const [weightKg, setWeightKg] = useState(lbToKg(profile.weight_lb).toString());
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>(profile.activity_level);
  const [goal, setGoal] = useState<Goal>(profile.goal);
  const [goalRate, setGoalRate] = useState<GoalRate>(profile.goal_rate);
  const [macroStrategy, setMacroStrategy] = useState<MacroStrategy>(profile.macro_strategy ?? 'balanced');
  const [dietaryModifiers, setDietaryModifiers] = useState<DietaryModifier[]>(profile.dietary_modifiers ?? []);

  const handleSaveProfile = useCallback(() => {
    const finalHeightCm = measurementSystem === 'us'
      ? ftInToCm(parseInt(heightFt, 10) || 5, parseInt(heightIn, 10) || 9)
      : parseFloat(heightCm) || profile.height_cm;
    const finalWeightLb = measurementSystem === 'us'
      ? parseFloat(weightLb) || profile.weight_lb
      : kgToLb(parseFloat(weightKg) || 82);
    updateProfile({
      age: parseInt(age, 10) || profile.age,
      sex,
      height_cm: finalHeightCm,
      weight_lb: finalWeightLb,
      activity_level: activityLevel,
      measurement_system: measurementSystem,
    });
    setEditMode('none');
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [age, sex, heightCm, heightFt, heightIn, weightLb, weightKg, measurementSystem, activityLevel, updateProfile, profile]);

  const handleSaveGoal = useCallback(() => {
    updateProfile({
      goal,
      goal_rate: goalRate,
    });
    setEditMode('none');
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [goal, goalRate, updateProfile]);

  const toggleModifier = useCallback((mod: DietaryModifier) => {
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

  const handleSaveStrategy = useCallback(() => {
    updateProfile({
      macro_strategy: macroStrategy,
      preference: strategyToPreference(macroStrategy),
      dietary_modifiers: dietaryModifiers,
    });
    setEditMode('none');
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [macroStrategy, dietaryModifiers, updateProfile]);

  const handleUsdaHealthCheck = useCallback(async () => {
    setUsdaHealth(null);
    const result = await foodService.usdaHealthCheck();
    setUsdaHealth(result);
  }, []);

  const handleResetData = useCallback(() => {
    Alert.alert(
      'Reset All Data',
      'This will clear your food logs. Your profile will be kept. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            clearAll();
            if (Platform.OS !== 'web') {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            }
          },
        },
      ]
    );
  }, [clearAll]);

  const handleResetProfile = useCallback(() => {
    Alert.alert(
      'Reset Profile',
      'This will clear your profile and food logs. You will need to complete onboarding again. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            await clearAll();
            await resetProfile();
          },
        },
      ]
    );
  }, [clearAll, resetProfile]);

  if (!profile.onboarding_complete) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Complete onboarding first</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.macroSummary}>
          <Text style={styles.macroSummaryTitle}>Current Targets</Text>
          <View style={styles.macroSummaryRow}>
            <View style={styles.macroSummaryItem}>
              <Text style={[styles.macroSummaryValue, { color: Colors.calories }]}>{formatNumber(macros.calories)}</Text>
              <Text style={styles.macroSummaryLabel}>Calories</Text>
            </View>
            <View style={styles.macroSummaryDivider} />
            <View style={styles.macroSummaryItem}>
              <Text style={[styles.macroSummaryValue, { color: Colors.protein }]}>{formatNumber(macros.protein_g)}g</Text>
              <Text style={styles.macroSummaryLabel}>Protein</Text>
            </View>
            <View style={styles.macroSummaryDivider} />
            <View style={styles.macroSummaryItem}>
              <Text style={[styles.macroSummaryValue, { color: Colors.carbs }]}>{formatNumber(macros.carbs_g)}g</Text>
              <Text style={styles.macroSummaryLabel}>Carbs</Text>
            </View>
            <View style={styles.macroSummaryDivider} />
            <View style={styles.macroSummaryItem}>
              <Text style={[styles.macroSummaryValue, { color: Colors.fat }]}>{formatNumber(macros.fat_g)}g</Text>
              <Text style={styles.macroSummaryLabel}>Fat</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => setEditMode(editMode === 'profile' ? 'none' : 'profile')}
          >
            <View style={[styles.settingsIcon, { backgroundColor: Colors.primaryMuted }]}>
              <User size={16} color={Colors.primary} />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsLabel}>Profile</Text>
              <Text style={styles.settingsValue}>
                {profile.age}y · {profile.sex} · {(profile.measurement_system ?? 'us') === 'us' ? `${profile.weight_lb}lb` : `${lbToKg(profile.weight_lb)}kg`}
              </Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </TouchableOpacity>

          {editMode === 'profile' && (
            <View style={styles.editPanel}>
              <View style={styles.editRow}>
                <View style={styles.editField}>
                  <Text style={styles.editFieldLabel}>Age</Text>
                  <TextInput
                    style={styles.editInput}
                    value={age}
                    onChangeText={setAge}
                    keyboardType="number-pad"
                    placeholderTextColor={Colors.textTertiary}
                  />
                </View>
                <View style={styles.editField}>
                  <Text style={styles.editFieldLabel}>Sex</Text>
                  <View style={styles.editSegments}>
                    <TouchableOpacity
                      style={[styles.editSegment, sex === 'male' && styles.editSegmentActive]}
                      onPress={() => setSex('male')}
                    >
                      <Text style={[styles.editSegmentText, sex === 'male' && styles.editSegmentTextActive]}>M</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.editSegment, sex === 'female' && styles.editSegmentActive]}
                      onPress={() => setSex('female')}
                    >
                      <Text style={[styles.editSegmentText, sex === 'female' && styles.editSegmentTextActive]}>F</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <View style={styles.editField}>
                <Text style={styles.editFieldLabel}>Units</Text>
                <View style={styles.editSegments}>
                  <TouchableOpacity
                    style={[styles.editSegment, measurementSystem === 'us' && styles.editSegmentActive]}
                    onPress={() => setMeasurementSystem('us')}
                  >
                    <Text style={[styles.editSegmentText, measurementSystem === 'us' && styles.editSegmentTextActive]}>US</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.editSegment, measurementSystem === 'metric' && styles.editSegmentActive]}
                    onPress={() => setMeasurementSystem('metric')}
                  >
                    <Text style={[styles.editSegmentText, measurementSystem === 'metric' && styles.editSegmentTextActive]}>Metric</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {measurementSystem === 'us' ? (
                <View style={styles.editRow}>
                  <View style={styles.editField}>
                    <Text style={styles.editFieldLabel}>Height (ft)</Text>
                    <TextInput
                      style={styles.editInput}
                      value={heightFt}
                      onChangeText={setHeightFt}
                      keyboardType="number-pad"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                  <View style={styles.editField}>
                    <Text style={styles.editFieldLabel}>Height (in)</Text>
                    <TextInput
                      style={styles.editInput}
                      value={heightIn}
                      onChangeText={setHeightIn}
                      keyboardType="number-pad"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                  <View style={styles.editField}>
                    <Text style={styles.editFieldLabel}>Weight (lb)</Text>
                    <TextInput
                      style={styles.editInput}
                      value={weightLb}
                      onChangeText={setWeightLb}
                      keyboardType="decimal-pad"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                </View>
              ) : (
                <View style={styles.editRow}>
                  <View style={styles.editField}>
                    <Text style={styles.editFieldLabel}>Height (cm)</Text>
                    <TextInput
                      style={styles.editInput}
                      value={heightCm}
                      onChangeText={setHeightCm}
                      keyboardType="decimal-pad"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                  <View style={styles.editField}>
                    <Text style={styles.editFieldLabel}>Weight (kg)</Text>
                    <TextInput
                      style={styles.editInput}
                      value={weightKg}
                      onChangeText={setWeightKg}
                      keyboardType="decimal-pad"
                      placeholderTextColor={Colors.textTertiary}
                    />
                  </View>
                </View>
              )}
              <View style={styles.editField}>
                <Text style={styles.editFieldLabel}>Activity</Text>
                <View style={styles.editChips}>
                  {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((level) => (
                    <TouchableOpacity
                      key={level}
                      style={[styles.editChip, activityLevel === level && styles.editChipActive]}
                      onPress={() => setActivityLevel(level)}
                    >
                      <Text style={[styles.editChipText, activityLevel === level && styles.editChipTextActive]}>
                        {ACTIVITY_LABELS[level]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                <Text style={styles.saveButtonText}>Save Profile</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.settingsDivider} />

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => setEditMode(editMode === 'goal' ? 'none' : 'goal')}
          >
            <View style={[styles.settingsIcon, { backgroundColor: Colors.successMuted }]}>
              <Calculator size={16} color={Colors.success} />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsLabel}>Goal</Text>
              <Text style={styles.settingsValue}>
                {GOAL_LABELS[profile.goal]} · {GOAL_RATE_LABELS[profile.goal_rate]}
              </Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </TouchableOpacity>

          {editMode === 'goal' && (
            <View style={styles.editPanel}>
              <View style={styles.editChips}>
                {(Object.keys(GOAL_LABELS) as Goal[]).map((g) => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.editChip, goal === g && styles.editChipActive]}
                    onPress={() => setGoal(g)}
                  >
                    <Text style={[styles.editChipText, goal === g && styles.editChipTextActive]}>
                      {GOAL_LABELS[g]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {goal !== 'maintain' && goal !== 'recompose' && (
                <View style={styles.editChips}>
                  {(Object.keys(GOAL_RATE_LABELS) as GoalRate[]).map((rate) => (
                    <TouchableOpacity
                      key={rate}
                      style={[styles.editChip, goalRate === rate && styles.editChipActive]}
                      onPress={() => setGoalRate(rate)}
                    >
                      <Text style={[styles.editChipText, goalRate === rate && styles.editChipTextActive]}>
                        {GOAL_RATE_LABELS[rate]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveGoal}>
                <Text style={styles.saveButtonText}>Save Goal</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.settingsDivider} />

          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => setEditMode(editMode === 'strategy' ? 'none' : 'strategy')}
          >
            <View style={[styles.settingsIcon, { backgroundColor: Colors.fatMuted }]}>
              <RefreshCw size={16} color={Colors.fat} />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsLabel}>Macro Strategy</Text>
              <Text style={styles.settingsValue}>
                {MACRO_STRATEGY_LABELS[profile.macro_strategy ?? 'balanced']}
                {(profile.dietary_modifiers ?? []).length > 0
                  ? ` · ${(profile.dietary_modifiers ?? []).map((m: DietaryModifier) => DIETARY_MODIFIER_LABELS[m]).join(', ')}`
                  : ''}
              </Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </TouchableOpacity>

          {editMode === 'strategy' && (
            <View style={styles.editPanel}>
              <Text style={styles.editFieldLabel}>Strategy</Text>
              <View style={styles.editChips}>
                {(Object.keys(MACRO_STRATEGY_LABELS) as MacroStrategy[]).map((strat) => (
                  <TouchableOpacity
                    key={strat}
                    style={[styles.editChip, macroStrategy === strat && styles.editChipActive]}
                    onPress={() => setMacroStrategy(strat)}
                  >
                    <Text style={[styles.editChipText, macroStrategy === strat && styles.editChipTextActive]}>
                      {MACRO_STRATEGY_LABELS[strat]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={[styles.editFieldLabel, { marginTop: 12 }]}>Modifiers</Text>
              <View style={styles.editChips}>
                {(Object.keys(DIETARY_MODIFIER_LABELS) as DietaryModifier[]).map((mod) => (
                  <TouchableOpacity
                    key={mod}
                    style={[styles.editChip, dietaryModifiers.includes(mod) && styles.editChipActive]}
                    onPress={() => toggleModifier(mod)}
                  >
                    <Text style={[styles.editChipText, dietaryModifiers.includes(mod) && styles.editChipTextActive]}>
                      {DIETARY_MODIFIER_LABELS[mod]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveStrategy}>
                <Text style={styles.saveButtonText}>Save Strategy</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.legalSectionTitle}>Measurements</Text>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => router.push('/add-measurement' as any)}
          >
            <View style={[styles.settingsIcon, { backgroundColor: Colors.successMuted }]}>
              <Ruler size={16} color={Colors.success} />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsLabel}>Add Measurement</Text>
              <Text style={styles.settingsValue}>{records.length} recorded</Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.settingsDivider} />
          <View style={styles.settingsRow}>
            <View style={[styles.settingsIcon, { backgroundColor: Colors.warningMuted }]}>
              <Bell size={16} color={Colors.warning} />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsLabel}>Reminder Cadence</Text>
            </View>
          </View>
          <View style={styles.cadenceChips}>
            {(['weekly', 'biweekly', 'monthly', 'off'] as PromptCadence[]).map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.cadenceChip, promptSettings?.cadence === c && styles.cadenceChipActive]}
                onPress={() => {
                  updateCadence(c);
                  if (Platform.OS !== 'web') {
                    Haptics.selectionAsync();
                  }
                }}
              >
                <Text style={[styles.cadenceChipText, promptSettings?.cadence === c && styles.cadenceChipTextActive]}>
                  {CADENCE_LABELS[c]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.legalSectionTitle}>Legal</Text>
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => router.push({ pathname: '/legal-document' as any, params: { type: 'privacy' } })}
          >
            <View style={[styles.settingsIcon, { backgroundColor: Colors.carbsMuted }]}>
              <Shield size={16} color={Colors.carbs} />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsLabel}>Privacy Policy</Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.settingsDivider} />
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => router.push({ pathname: '/legal-document' as any, params: { type: 'terms' } })}
          >
            <View style={[styles.settingsIcon, { backgroundColor: Colors.warningMuted }]}>
              <FileText size={16} color={Colors.warning} />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsLabel}>Terms of Use</Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
          <View style={styles.settingsDivider} />
          <TouchableOpacity
            style={styles.settingsRow}
            onPress={() => router.push({ pathname: '/legal-document' as any, params: { type: 'contact' } })}
          >
            <View style={[styles.settingsIcon, { backgroundColor: Colors.successMuted }]}>
              <Mail size={16} color={Colors.success} />
            </View>
            <View style={styles.settingsInfo}>
              <Text style={styles.settingsLabel}>Contact & Support</Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        <View style={styles.dangerSection}>
          <TouchableOpacity style={styles.dangerRow} onPress={handleResetData}>
            <View style={[styles.settingsIcon, { backgroundColor: Colors.dangerMuted }]}>
              <Trash2 size={16} color={Colors.danger} />
            </View>
            <Text style={styles.dangerText}>Clear Food Logs</Text>
          </TouchableOpacity>
          <View style={styles.settingsDivider} />
          <TouchableOpacity style={styles.dangerRow} onPress={handleResetProfile}>
            <View style={[styles.settingsIcon, { backgroundColor: Colors.dangerMuted }]}>
              <Trash2 size={16} color={Colors.danger} />
            </View>
            <Text style={styles.dangerText}>Reset Everything</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.devSection}>
          <Text style={styles.devSectionTitle}>Food Search</Text>
          <TouchableOpacity
            style={styles.devRow}
            onPress={handleUsdaHealthCheck}
            activeOpacity={0.7}
          >
            <RefreshCw size={16} color={Colors.primary} />
            <Text style={styles.devRowText}>Verify USDA API</Text>
          </TouchableOpacity>
          {usdaHealth && (
            <View style={styles.devResult}>
              <Text style={styles.devResultText}>
                {usdaHealth.ok
                  ? `OK (status ${usdaHealth.status})`
                  : `Error: ${usdaHealth.error ?? usdaHealth.status ?? 'unknown'}`}
              </Text>
              {usdaHealth.keySuffix && (
                <Text style={styles.devResultText}>Key ends with: {usdaHealth.keySuffix}</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Shield size={14} color={Colors.textTertiary} />
            <Text style={styles.footerText}>For general fitness guidance only</Text>
          </View>
          <Text style={styles.footerVersion}>Physiq v1.0.6</Text>
        </View>
      </ScrollView>
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
  },
  macroSummary: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...(Shadows.card as Record<string, unknown>),
  },
  macroSummaryTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: 14,
  },
  macroSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroSummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroSummaryValue: {
    fontSize: 18,
    fontWeight: '800' as const,
  },
  macroSummaryLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 2,
  },
  macroSummaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: Colors.cardBorder,
  },
  sectionCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    ...(Shadows.card as Record<string, unknown>),
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  settingsIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsInfo: {
    flex: 1,
  },
  settingsLabel: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  settingsValue: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  settingsDivider: {
    height: 1,
    backgroundColor: Colors.cardBorder,
    marginLeft: 60,
  },
  editPanel: {
    padding: 16,
    paddingTop: 4,
    gap: 12,
  },
  editRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editField: {
    flex: 1,
  },
  editFieldLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  editInput: {
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  editSegments: {
    flexDirection: 'row',
    gap: 6,
  },
  editSegment: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    alignItems: 'center',
  },
  editSegmentActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  editSegmentText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  editSegmentTextActive: {
    color: Colors.primary,
  },
  editChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  editChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  editChipActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  editChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  editChipTextActive: {
    color: Colors.primary,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  dangerSection: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
    marginBottom: Spacing.xxl,
    ...(Shadows.card as Record<string, unknown>),
  },
  dangerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  dangerText: {
    color: Colors.danger,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  devSection: {
    marginBottom: Spacing.xl,
  },
  devSectionTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  devRowText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  devResult: {
    marginTop: 8,
    padding: 12,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  devResultText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  footer: {
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  footerText: {
    color: Colors.textTertiary,
    fontSize: 12,
  },
  footerVersion: {
    color: Colors.textTertiary,
    fontSize: 11,
  },
  legalSectionTitle: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  cadenceChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  cadenceChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  cadenceChipActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  cadenceChipText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  cadenceChipTextActive: {
    color: Colors.primary,
  },
});
