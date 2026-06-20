import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/colors';
import { Radius, Spacing } from '../theme/tokens';
import { useThemeColors, type AppColors } from '../providers/ThemeProvider';
import ResponsiveContainer from '../components/ui/ResponsiveContainer';
import { usePro } from '../providers/ProProvider';
import { useUser } from '../providers/UserProvider';
import {
  MenstrualBleedingLevel,
  MenstrualPhaseTag,
  MenstrualSymptom,
} from '../features/pro/types';
import { getTodayDateKey } from '../utils/dateKey';

const CONSENT_VERSION = 'v1';

const BLEEDING_LEVELS: { id: MenstrualBleedingLevel; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'spotting', label: 'Spotting' },
  { id: 'light', label: 'Light' },
  { id: 'medium', label: 'Medium' },
  { id: 'heavy', label: 'Heavy' },
];

const SYMPTOMS: { id: MenstrualSymptom; label: string }[] = [
  { id: 'cramps', label: 'Cramps' },
  { id: 'fatigue', label: 'Fatigue' },
  { id: 'bloating', label: 'Bloating' },
  { id: 'headache', label: 'Headache' },
  { id: 'low_appetite', label: 'Low appetite' },
  { id: 'high_appetite', label: 'High appetite' },
  { id: 'sleep_disturbance', label: 'Poor sleep' },
];

const PHASE_LABELS: Record<MenstrualPhaseTag, string> = {
  menstrual: 'Menstrual',
  follicular: 'Follicular',
  ovulatory: 'Ovulatory',
  luteal: 'Luteal',
  unknown: 'Not enough data',
};

const PHASE_GUIDANCE: Record<MenstrualPhaseTag, string> = {
  menstrual: 'Hydration is nudged up and iron-rich foods help. Keep protein steady.',
  follicular: 'Energy tends to rise — a good window for harder training and steady carbs.',
  ovulatory: 'Peak energy. Fuel performance and stay hydrated.',
  luteal: 'A small calorie bump and extra hydration help with cravings and fatigue.',
  unknown: 'Log your period start and a few days to unlock phase-aware guidance.',
};

function haptic() {
  if (Platform.OS !== 'web') Haptics.selectionAsync();
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export default function CycleSyncScreen() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { profile } = useUser();
  const { cycleProfile, cycleDerived, cycleLogs, updateCycleProfile, addCycleLog, clearCycleData } = usePro();

  const [bleeding, setBleeding] = useState<MenstrualBleedingLevel | undefined>(undefined);
  const [symptoms, setSymptoms] = useState<MenstrualSymptom[]>([]);

  if (profile.sex !== 'female') {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.intro}>Cycle Sync is available for users who track a menstrual cycle.</Text>
      </View>
    );
  }

  const enabled = cycleProfile.enabled;
  const cycleLength = cycleProfile.cycleLengthDays ?? 28;
  const periodLength = cycleProfile.periodLengthDays ?? 5;

  const enable = () => {
    haptic();
    void updateCycleProfile({
      enabled: true,
      cycleDataConsentGivenAt: new Date().toISOString(),
      cycleDataConsentVersion: CONSENT_VERSION,
    });
  };

  const disable = () => {
    haptic();
    void updateCycleProfile({ enabled: false });
  };

  const toggleSymptom = (s: MenstrualSymptom) => {
    haptic();
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  };

  const saveLog = () => {
    haptic();
    void addCycleLog({
      date: getTodayDateKey(),
      bleedingLevel: bleeding,
      symptoms: symptoms.length ? symptoms : undefined,
      hydrationFlag: bleeding && bleeding !== 'none' ? 'elevated' : 'normal',
    });
    setBleeding(undefined);
    setSymptoms([]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + Spacing.xxl }}
    >
      <ResponsiveContainer>
        {!enabled ? (
          <View style={styles.consentCard}>
            <Text style={styles.sectionTitle}>Cycle-aware fueling</Text>
            <Text style={styles.intro}>
              Cycle Sync adjusts calories and hydration across your cycle phases. Your cycle data is
              stored only on this device, is never uploaded, and is never used for ads. You can turn it
              off and delete all data anytime.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={enable} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Enable Cycle Sync</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.phaseCard}>
              <Text style={styles.phaseLabel}>Current phase</Text>
              <Text style={styles.phaseValue}>{PHASE_LABELS[cycleDerived.currentPhase]}</Text>
              <Text style={styles.phaseConfidence}>
                Confidence: {cycleDerived.phaseConfidence} · {cycleDerived.dataQuality}
              </Text>
              <Text style={styles.guidance}>{PHASE_GUIDANCE[cycleDerived.currentPhase]}</Text>
              {cycleDerived.predictedNextPhaseDate ? (
                <Text style={styles.help}>Next period estimate: {cycleDerived.predictedNextPhaseDate}</Text>
              ) : null}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cycle details</Text>
              <Stepper
                label="Last period started"
                value={cycleProfile.lastPeriodStartDate ?? 'Not set'}
                onDecrement={() =>
                  updateCycleProfile({
                    lastPeriodStartDate: addDaysIso(cycleProfile.lastPeriodStartDate ?? getTodayDateKey(), -1),
                  })
                }
                onIncrement={() =>
                  updateCycleProfile({
                    lastPeriodStartDate: addDaysIso(cycleProfile.lastPeriodStartDate ?? getTodayDateKey(), 1),
                  })
                }
                styles={styles}
              />
              <TouchableOpacity
                style={styles.linkBtn}
                onPress={() => updateCycleProfile({ lastPeriodStartDate: getTodayDateKey() })}
              >
                <Text style={styles.linkBtnText}>Set to today</Text>
              </TouchableOpacity>
              <Stepper
                label="Average cycle length"
                value={`${cycleLength} days`}
                onDecrement={() => updateCycleProfile({ cycleLengthDays: Math.max(21, cycleLength - 1) })}
                onIncrement={() => updateCycleProfile({ cycleLengthDays: Math.min(40, cycleLength + 1) })}
                styles={styles}
              />
              <Stepper
                label="Average period length"
                value={`${periodLength} days`}
                onDecrement={() => updateCycleProfile({ periodLengthDays: Math.max(2, periodLength - 1) })}
                onIncrement={() => updateCycleProfile({ periodLengthDays: Math.min(10, periodLength + 1) })}
                styles={styles}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Log today</Text>
              <Text style={styles.help}>Bleeding</Text>
              <View style={styles.chipWrap}>
                {BLEEDING_LEVELS.map((b) => (
                  <Chip
                    key={b.id}
                    label={b.label}
                    active={bleeding === b.id}
                    onPress={() => {
                      haptic();
                      setBleeding(b.id);
                    }}
                    styles={styles}
                  />
                ))}
              </View>
              <Text style={styles.help}>Symptoms</Text>
              <View style={styles.chipWrap}>
                {SYMPTOMS.map((s) => (
                  <Chip
                    key={s.id}
                    label={s.label}
                    active={symptoms.includes(s.id)}
                    onPress={() => toggleSymptom(s.id)}
                    styles={styles}
                  />
                ))}
              </View>
              <TouchableOpacity style={styles.primaryBtn} onPress={saveLog} activeOpacity={0.85}>
                <Text style={styles.primaryBtnText}>Save today's log</Text>
              </TouchableOpacity>
            </View>

            {cycleLogs.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent logs</Text>
                {cycleLogs.slice(0, 7).map((log) => (
                  <View key={log.date} style={styles.logRow}>
                    <Text style={styles.logDate}>{log.date}</Text>
                    <Text style={styles.logMeta}>
                      {[log.bleedingLevel, log.symptoms?.length ? `${log.symptoms.length} symptom(s)` : null]
                        .filter(Boolean)
                        .join(' · ') || '—'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={styles.section}>
              <TouchableOpacity style={styles.dangerBtn} onPress={disable} activeOpacity={0.85}>
                <Text style={styles.dangerBtnText}>Disable Cycle Sync</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={() => {
                  haptic();
                  void clearCycleData();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.dangerBtnText}>Delete all cycle data</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ResponsiveContainer>
    </ScrollView>
  );
}

function Chip({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.85}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Stepper({
  label,
  value,
  onIncrement,
  onDecrement,
  styles,
}: {
  label: string;
  value: string;
  onIncrement: () => void;
  onDecrement: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.stepperRow}>
      <View style={styles.stepperCopy}>
        <Text style={styles.stepperLabel}>{label}</Text>
        <Text style={styles.stepperValue}>{value}</Text>
      </View>
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.stepBtn} onPress={onDecrement}>
          <Text style={styles.stepBtnText}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.stepBtn} onPress={onIncrement}>
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
    intro: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
    section: { marginTop: Spacing.xl, gap: Spacing.sm },
    sectionTitle: { color: Colors.text, fontSize: 16, fontWeight: '800' },
    help: { color: Colors.textTertiary, fontSize: 13, fontWeight: '700', marginTop: 4 },
    consentCard: {
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      backgroundColor: Colors.card,
      borderRadius: Radius.md,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    phaseCard: {
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
      borderRadius: Radius.md,
      padding: Spacing.lg,
      gap: 4,
    },
    phaseLabel: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    phaseValue: { color: colors.primary, fontSize: 26, fontWeight: '900' },
    phaseConfidence: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
    guidance: { color: Colors.text, fontSize: 14, lineHeight: 20, marginTop: 6 },
    chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 9,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      backgroundColor: Colors.card,
    },
    chipActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
    chipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700' },
    chipTextActive: { color: colors.primary },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: Radius.md,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: Spacing.sm,
    },
    primaryBtnText: { color: colors.onPrimary, fontSize: 15, fontWeight: '800' },
    linkBtn: { alignSelf: 'flex-start', paddingVertical: 4 },
    linkBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
    stepperRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      backgroundColor: Colors.card,
      borderRadius: Radius.md,
      padding: Spacing.md,
    },
    stepperCopy: { flex: 1 },
    stepperLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
    stepperValue: { color: Colors.text, fontSize: 15, fontWeight: '800', marginTop: 2 },
    stepper: { flexDirection: 'row', gap: 8 },
    stepBtn: {
      width: 36,
      height: 36,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepBtnText: { color: Colors.text, fontSize: 18, fontWeight: '700' },
    logRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Colors.cardBorder,
    },
    logDate: { color: Colors.text, fontSize: 13, fontWeight: '700' },
    logMeta: { color: Colors.textSecondary, fontSize: 13 },
    dangerBtn: {
      borderWidth: 1,
      borderColor: Colors.danger,
      borderRadius: Radius.md,
      paddingVertical: 12,
      alignItems: 'center',
    },
    dangerBtnText: { color: Colors.danger, fontSize: 14, fontWeight: '700' },
  });
