import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import DismissKeyboard from '../components/ui/DismissKeyboard';
import * as Haptics from 'expo-haptics';
import { ChevronDown } from 'lucide-react-native';
import Colors from '../constants/colors';
import { useUser } from '../providers/UserProvider';
import { useMeasurements } from '../providers/MeasurementsProvider';
import { useGoalSettings } from '../providers/GoalSettingsProvider';
import {
  GoalTarget,
  GoalTargetMetric,
  GoalTargetDirection,
  GOAL_TARGET_METRIC_LABELS,
  GOAL_TARGET_DIRECTION_LABELS,
} from '../features/progress/goalTargetTypes';
import { Goal } from '../types';
import { toDateKey, fromDateKey, getTodayDateKey } from '../utils/dateKey';
import { useThemeColors, type AppColors } from '../providers/ThemeProvider';

const METRICS: GoalTargetMetric[] = ['weight_lb', 'bodyfat_pct', 'waist_in', 'lean_mass_lb'];
const DIRECTIONS: GoalTargetDirection[] = ['lose', 'gain', 'maintain'];

function formatDateLabel(dateKey: string): string {
  return fromDateKey(dateKey).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getMetricUnit(metric: GoalTargetMetric): string {
  if (metric === 'weight_lb' || metric === 'lean_mass_lb') return 'lb';
  if (metric === 'bodyfat_pct') return '%';
  return 'in';
}

function getMetricValueFromLatest(
  latest: { weightLb?: number; bodyFatPercent?: number; waistIn?: number } | null,
  metric: GoalTargetMetric
): number | undefined {
  if (!latest) return undefined;
  if (metric === 'weight_lb') return latest.weightLb;
  if (metric === 'bodyfat_pct') return latest.bodyFatPercent;
  if (metric === 'waist_in') return latest.waistIn;
  if (metric === 'lean_mass_lb' && latest.weightLb != null && latest.bodyFatPercent != null) {
    return latest.weightLb * (1 - latest.bodyFatPercent / 100);
  }
  return undefined;
}

function getDefaultDeadline(): string {
  const d = new Date();
  d.setDate(d.getDate() + 56);
  return toDateKey(d);
}

export default function SetTargetScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { profile } = useUser();
  const { latest } = useMeasurements();
  const { goalType, target, setTarget } = useGoalSettings();
  const params = useLocalSearchParams<{ fromOnboarding?: string }>();
  const fromOnboarding = params.fromOnboarding === 'true';

  const [metric, setMetric] = useState<GoalTargetMetric>(target?.metric ?? 'weight_lb');
  const [direction, setDirection] = useState<GoalTargetDirection>(
    target?.direction ?? (goalType === 'maintain' ? 'maintain' : goalType === 'gain' ? 'gain' : 'lose')
  );
  const [amount, setAmount] = useState(target?.amount?.toString() ?? (goalType === 'maintain' ? '0' : '5'));
  const [baselineManual, setBaselineManual] = useState(target?.baselineValue?.toString() ?? '');
  const [deadlineDateKey, setDeadlineDateKey] = useState<string | null>(
    target?.deadlineDateKey ?? getDefaultDeadline()
  );
  const [noDeadline, setNoDeadline] = useState(target?.deadlineDateKey == null && !target);
  const [showMetricPicker, setShowMetricPicker] = useState(false);
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false);

  const baselineFromMeasurement = getMetricValueFromLatest(latest, metric);
  const baselineValue = baselineFromMeasurement ?? (baselineManual ? parseFloat(baselineManual) : undefined);
  const canComputeLeanMass = latest?.weightLb != null && latest?.bodyFatPercent != null;
  const metricsToShow = canComputeLeanMass ? METRICS : METRICS.filter((m) => m !== 'lean_mass_lb');

  useEffect(() => {
    if (target) {
      setMetric(target.metric);
      setDirection(target.direction);
      setAmount(String(target.amount));
      setBaselineManual(target.baselineValue?.toString() ?? '');
      setDeadlineDateKey(target.deadlineDateKey ?? getDefaultDeadline());
      setNoDeadline(target.deadlineDateKey == null);
    }
  }, [target?.metric, target?.direction, target?.amount, target?.baselineValue, target?.deadlineDateKey]);

  const handleMetricChange = useCallback(
    (m: GoalTargetMetric) => {
      if (target && target.metric !== m) {
        Alert.alert(
          'Switch Target Type?',
          'Switching target type will reset progress calculation. Continue?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Continue', onPress: () => setMetric(m) },
          ]
        );
      } else {
        setMetric(m);
      }
      setShowMetricPicker(false);
      if (Platform.OS !== 'web') Haptics.selectionAsync();
    },
    [target]
  );

  const handleSave = useCallback(() => {
    const amt = direction === 'maintain' ? 0 : parseFloat(amount);
    if (direction !== 'maintain' && (isNaN(amt) || amt <= 0)) {
      Alert.alert('Invalid Amount', 'Please enter a valid target amount.');
      return;
    }
    if (baselineValue == null && direction !== 'maintain') {
      Alert.alert(
        'Baseline Required',
        'Add a measurement first, or enter your current baseline value.',
        [{ text: 'OK' }]
      );
      return;
    }

    const t: GoalTarget = {
      metric,
      direction,
      amount: direction === 'maintain' ? 0 : amt,
      baselineValue,
      startDateKey: target?.startDateKey ?? getTodayDateKey(),
      deadlineDateKey: noDeadline ? null : (deadlineDateKey ?? undefined),
    };

    setTarget(t);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    if (fromOnboarding) {
      router.back();
    } else {
      Alert.alert('Saved', 'Your target has been updated.', [{ text: 'OK', onPress: () => router.back() }]);
    }
  }, [
    metric,
    direction,
    amount,
    baselineValue,
    deadlineDateKey,
    noDeadline,
    target?.startDateKey,
    setTarget,
    fromOnboarding,
  ]);

  const deadlineOptions = React.useMemo(() => {
    const opts: { dateKey: string; label: string }[] = [];
    const d = new Date();
    for (let i = 0; i < 120; i++) {
      d.setDate(d.getDate() + 1);
      const dk = toDateKey(d);
      opts.push({ dateKey: dk, label: formatDateLabel(dk) });
    }
    return opts;
  }, []);

  return (
    <DismissKeyboard>
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: fromOnboarding ? 'Set Your Target' : 'Edit Target',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {fromOnboarding && (
          <>
            <Text style={styles.title}>Set Your Target</Text>
            <Text style={styles.subtitle}>Make your goal measurable.</Text>
            <Text style={styles.helper}>You can edit this anytime in Settings.</Text>
          </>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Target Metric</Text>
          <TouchableOpacity
            style={styles.pickerField}
            onPress={() => setShowMetricPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.pickerFieldText}>{GOAL_TARGET_METRIC_LABELS[metric]}</Text>
            <ChevronDown size={18} color={Colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {metric !== 'lean_mass_lb' && (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Direction</Text>
            <View style={styles.segmentRow}>
              {DIRECTIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.segment, direction === d && styles.segmentActive]}
                  onPress={() => {
                    setDirection(d);
                    if (d === 'maintain') setAmount('0');
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                  }}
                >
                  <Text style={[styles.segmentText, direction === d && styles.segmentTextActive]}>
                    {GOAL_TARGET_DIRECTION_LABELS[d]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {direction !== 'maintain' && (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>
              Target Amount ({getMetricUnit(metric)})
            </Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholderTextColor={Colors.textTertiary}
              placeholder={metric === 'waist_in' ? 'e.g. 2' : 'e.g. 5'}
              maxLength={6}
            />
          </View>
        )}

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Current Baseline</Text>
          {baselineFromMeasurement != null ? (
            <Text style={styles.baselineText}>
              {baselineFromMeasurement.toFixed(1)} {getMetricUnit(metric)} (from latest measurement)
            </Text>
          ) : (
            <TextInput
              style={styles.input}
              value={baselineManual}
              onChangeText={setBaselineManual}
              keyboardType="decimal-pad"
              placeholderTextColor={Colors.textTertiary}
              placeholder="Enter baseline or add measurement first"
              maxLength={6}
            />
          )}
        </View>

        <View style={styles.fieldGroup}>
          <View style={styles.deadlineRow}>
            <Text style={styles.fieldLabel}>Deadline</Text>
            <TouchableOpacity
              style={styles.noDeadlineChip}
              onPress={() => {
                setNoDeadline(!noDeadline);
                if (Platform.OS !== 'web') Haptics.selectionAsync();
              }}
            >
              <Text style={[styles.noDeadlineText, noDeadline && styles.noDeadlineTextActive]}>
                No deadline
              </Text>
            </TouchableOpacity>
          </View>
          {!noDeadline && (
            <TouchableOpacity
              style={styles.pickerField}
              onPress={() => setShowDeadlinePicker(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.pickerFieldText}>
                {deadlineDateKey ? formatDateLabel(deadlineDateKey) : 'Select date'}
              </Text>
              <ChevronDown size={18} color={Colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.8}>
          <Text style={styles.saveBtnText}>Save Target</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showMetricPicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowMetricPicker(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Select metric</Text>
            {metricsToShow.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.modalOption, metric === m && styles.modalOptionActive]}
                onPress={() => handleMetricChange(m)}
              >
                <Text style={[styles.modalOptionText, metric === m && styles.modalOptionTextActive]}>
                  {GOAL_TARGET_METRIC_LABELS[m]}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowMetricPicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={showDeadlinePicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowDeadlinePicker(false)}>
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Select deadline</Text>
            <ScrollView style={styles.deadlineList} showsVerticalScrollIndicator={false}>
              {deadlineOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.dateKey}
                  style={[styles.modalOption, deadlineDateKey === opt.dateKey && styles.modalOptionActive]}
                  onPress={() => {
                    setDeadlineDateKey(opt.dateKey);
                    setShowDeadlinePicker(false);
                    if (Platform.OS !== 'web') Haptics.selectionAsync();
                  }}
                >
                  <Text
                    style={[
                      styles.modalOptionText,
                      deadlineDateKey === opt.dateKey && styles.modalOptionTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setShowDeadlinePicker(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
    </DismissKeyboard>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  title: {
    color: Colors.text,
    fontSize: 24,
    fontWeight: '800' as const,
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  helper: {
    color: Colors.textTertiary,
    fontSize: 13,
    marginBottom: 24,
  },
  fieldGroup: { marginBottom: 20 },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  pickerFieldText: { color: Colors.text, fontSize: 17, fontWeight: '600' as const },
  segmentRow: { flexDirection: 'row', gap: 8 },
  segment: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  segmentActive: { backgroundColor: colors.primaryMuted, borderColor: colors.primary },
  segmentText: { color: Colors.textSecondary, fontSize: 14, fontWeight: '600' as const },
  segmentTextActive: { color: colors.primary },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 17,
    fontWeight: '600' as const,
  },
  baselineText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500' as const,
  },
  deadlineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  noDeadlineChip: { paddingHorizontal: 12, paddingVertical: 6 },
  noDeadlineText: { color: Colors.textTertiary, fontSize: 13, fontWeight: '600' as const },
  noDeadlineTextActive: { color: colors.primary },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: colors.onPrimary, fontSize: 16, fontWeight: '700' as const },
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' as const, marginBottom: 16 },
  modalOption: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  modalOptionActive: { backgroundColor: colors.primaryMuted },
  modalOptionText: { color: Colors.text, fontSize: 15, fontWeight: '600' as const },
  modalOptionTextActive: { color: colors.primary },
  modalCancel: { alignItems: 'center', paddingVertical: 12, marginTop: 8 },
  modalCancelText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '600' as const },
  deadlineList: { maxHeight: 280 },
});
