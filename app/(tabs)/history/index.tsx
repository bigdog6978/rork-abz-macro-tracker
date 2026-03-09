import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Pressable,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Flame, TrendingUp, TrendingDown, Calendar, ChevronDown, ChevronUp,
  Target, Plus, ArrowUpRight, ArrowDownRight, Minus, Ruler, ChevronRight,
} from 'lucide-react-native';
import Colors from '../../../constants/colors';
import { Radius, Spacing, Shadows } from '../../../theme/tokens';
import { formatNumber } from '../../../utils/formatNumber';
import { useUser } from '../../../providers/UserProvider';
import { useDailyLog } from '../../../providers/DailyLogProvider';
import { useMeasurements } from '../../../providers/MeasurementsProvider';
import { useGoalSettings } from '../../../providers/GoalSettingsProvider';
import { getAdherencePercent } from '../../../utils/macroEngine';
import { toDateKey } from '../../../utils/dateKey';
import { MacroTargets, GOAL_LABELS } from '../../../types';
import { ProgressTrend } from '../../../features/progress/types';
import {
  computeGoalProgressScoreFromTarget,
  formatTargetSummary,
} from '../../../features/progress/progressScoring';
import { fromDateKey } from '../../../utils/dateKey';

type ViewMode = 'progress' | 'history';
type TimeRange = 7 | 14 | 30;

function ScoreGauge({ score }: { score: number }) {
  const animValue = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(animValue, {
      toValue: score / 100,
      useNativeDriver: false,
      tension: 30,
      friction: 12,
    }).start();
  }, [score, animValue]);

  const scoreColor = score >= 70 ? Colors.success : score >= 40 ? Colors.warning : Colors.danger;

  return (
    <View style={gaugeStyles.container}>
      <View style={gaugeStyles.track}>
        <Animated.View
          style={[
            gaugeStyles.fill,
            {
              backgroundColor: scoreColor,
              width: animValue.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
      <View style={gaugeStyles.labelRow}>
        <Text style={[gaugeStyles.scoreText, { color: scoreColor }]}>{score}</Text>
        <Text style={gaugeStyles.maxText}>/100</Text>
      </View>
    </View>
  );
}

const gaugeStyles = StyleSheet.create({
  container: {
    gap: 8,
  },
  track: {
    height: 8,
    backgroundColor: Colors.cardElevated,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreText: {
    fontSize: 32,
    fontWeight: '800' as const,
  },
  maxText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textTertiary,
    marginLeft: 2,
  },
});

function TrendItem({ trend, onPress }: { trend: ProgressTrend; onPress?: () => void }) {
  const icon = trend.direction === 'up'
    ? <ArrowUpRight size={16} color={trend.isPositive ? Colors.success : Colors.danger} />
    : trend.direction === 'down'
    ? <ArrowDownRight size={16} color={trend.isPositive ? Colors.success : Colors.danger} />
    : <Minus size={16} color={Colors.textSecondary} />;

  const valueColor = trend.isPositive ? Colors.success : trend.direction === 'stable' ? Colors.textSecondary : Colors.danger;

  const content = (
    <View style={trendStyles.item}>
      <View style={trendStyles.left}>
        {icon}
        <View>
          <Text style={trendStyles.label}>{trend.label}</Text>
          {trend.baselineValue != null && trend.latestValue != null && (
            <Text style={trendStyles.values}>
              {trend.baselineValue} → {trend.latestValue} {trend.field === 'bodyFat' ? '%' : trend.field === 'weight' ? 'lb' : trend.field === 'dressSize' ? '' : 'in'}
            </Text>
          )}
        </View>
      </View>
      <Text style={[trendStyles.change, { color: valueColor }]}>
        {trend.displayValue ?? 'N/A'}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const trendStyles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  label: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  values: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  change: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
});

function MeasurementTimeline({ records }: { records: Array<{ id: string; recordedAt: string; weightLb?: number; waistIn?: number; chestIn?: number; bodyFatPercent?: number; dressSize?: string; isBaseline?: boolean }> }) {
  if (records.length === 0) return null;

  const sorted = [...records].reverse().slice(0, 10);

  return (
    <View style={timelineStyles.container}>
      {sorted.map((r, idx) => {
        const date = new Date(r.recordedAt);
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const parts: string[] = [];
        if (r.weightLb != null) parts.push(`${r.weightLb} lb`);
        if (r.waistIn != null) parts.push(`${r.waistIn}" waist`);
        if (r.chestIn != null) parts.push(`${r.chestIn}" chest`);
        if (r.bodyFatPercent != null) parts.push(`${r.bodyFatPercent}% bf`);
        if (r.dressSize != null) parts.push(`size ${r.dressSize}`);

        return (
          <View key={r.id} style={timelineStyles.row}>
            <View style={timelineStyles.dateCol}>
              <Text style={timelineStyles.dateText}>{dateStr}</Text>
              {r.isBaseline && <Text style={timelineStyles.baselineTag}>Baseline</Text>}
            </View>
            <View style={timelineStyles.dotCol}>
              <View style={[timelineStyles.dot, r.isBaseline && timelineStyles.dotBaseline]} />
              {idx < sorted.length - 1 && <View style={timelineStyles.line} />}
            </View>
            <View style={timelineStyles.valueCol}>
              <Text style={timelineStyles.valueText}>{parts.join(' · ')}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const timelineStyles = StyleSheet.create({
  container: {
    marginTop: 4,
  },
  row: {
    flexDirection: 'row',
    minHeight: 48,
  },
  dateCol: {
    width: 70,
    alignItems: 'flex-end',
    paddingRight: 12,
    paddingTop: 2,
  },
  dateText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  baselineTag: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '700' as const,
    marginTop: 2,
  },
  dotCol: {
    alignItems: 'center',
    width: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.textTertiary,
    marginTop: 4,
  },
  dotBaseline: {
    backgroundColor: Colors.primary,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: Colors.cardBorder,
    marginTop: 4,
  },
  valueCol: {
    flex: 1,
    paddingLeft: 12,
    paddingTop: 2,
    paddingBottom: 12,
  },
  valueText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '500' as const,
    lineHeight: 18,
  },
});

function DayRow({
  date,
  totals,
  targets,
  onPress,
}: {
  date: string;
  totals: MacroTargets;
  targets: MacroTargets;
  onPress: () => void;
}) {
  const adherence = getAdherencePercent(totals, targets);
  const d = new Date(date + 'T12:00:00');
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
  const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const adherenceColor =
    adherence >= 80 ? Colors.success : adherence >= 50 ? Colors.warning : Colors.danger;

  return (
    <Pressable
      style={styles.dayRow}
      onPress={onPress}
      accessibilityLabel={`${dayName} ${dateLabel}, ${formatNumber(totals.calories)} calories`}
      accessibilityRole="button"
    >
      <View style={styles.dayRowMain}>
        <View style={styles.dayInfo}>
          <Text style={styles.dayName}>{dayName}</Text>
          <Text style={styles.dayDate}>{dateLabel}</Text>
        </View>
        <View style={styles.dayCalories}>
          <Text style={styles.dayCalValue}>{formatNumber(totals.calories)}</Text>
          <Text style={styles.dayCalLabel}>cal</Text>
        </View>
        <View style={[styles.adherenceBadge, { backgroundColor: adherenceColor + '20' }]}>
          <Text style={[styles.adherenceText, { color: adherenceColor }]}>{adherence}%</Text>
        </View>
        <ChevronRight size={16} color={Colors.textTertiary} />
      </View>
    </Pressable>
  );
}

export default function HistoryScreen() {
  const queryClient = useQueryClient();
  const { profile, macros } = useUser();
  const { getTotalsForDate, getDatesWithEntries, getStreak, ensureDayExists, logs } = useDailyLog();
  const { records, trends, goalScore, hasBaseline, baseline, latest } = useMeasurements();
  const { target } = useGoalSettings();

  useFocusEffect(
    useCallback(() => {
      queryClient.refetchQueries({ queryKey: ['measurements', 'local_user'] });
    }, [queryClient])
  );
  const [viewMode, setViewMode] = useState<ViewMode>('progress');
  const [range, setRange] = useState<TimeRange>(7);
  const [addDayModalVisible, setAddDayModalVisible] = useState(false);
  const [highlightDateKey, setHighlightDateKey] = useState<string | null>(null);
  const streak = getStreak();

  const datesInRange = useMemo(() => {
    const dates: string[] = [];
    const d = new Date();
    for (let i = 0; i < range; i++) {
      dates.push(toDateKey(d));
      d.setDate(d.getDate() - 1);
    }
    return dates;
  }, [range]);

  const datesToShow = useMemo(() => {
    const logDates = Object.keys(logs);
    const combined = new Set([...datesInRange, ...logDates]);
    return Array.from(combined).sort().reverse().slice(0, 60);
  }, [datesInRange, logs]);

  const datesWithData = useMemo(() => {
    return datesToShow.filter((date) => (logs[date]?.length ?? 0) > 0);
  }, [datesToShow, logs]);

  const avgAdherence = useMemo(() => {
    if (datesWithData.length === 0) return 0;
    const total = datesWithData.reduce((sum, date) => {
      const totals = getTotalsForDate(date);
      return sum + getAdherencePercent(totals, macros);
    }, 0);
    return Math.round(total / datesWithData.length);
  }, [datesWithData, getTotalsForDate, macros]);

  const handleAddMeasurement = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push('/add-measurement' as never);
  }, []);

  const handleOpenMeasurementHistory = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/measurement-history' as never);
  }, []);

  const handleOpenSetTarget = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/set-target' as never);
  }, []);

  const targetScoreResult = target && (baseline || latest)
    ? computeGoalProgressScoreFromTarget(baseline, latest, target)
    : null;
  const displayScore = target && targetScoreResult && !targetScoreResult.needsBaseline
    ? targetScoreResult.score
    : goalScore.overall;
  const targetStatusText = targetScoreResult?.statusText;
  const needsBaselineForTarget = targetScoreResult?.needsBaseline ?? false;
  const targetSummary = target
    ? formatTargetSummary(
        target,
        target.deadlineDateKey
          ? fromDateKey(target.deadlineDateKey).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })
          : undefined
      )
    : null;

  const handleDayPress = useCallback(
    (dateKey: string) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      router.push({ pathname: '/day-log', params: { dateKey } } as never);
    },
    []
  );

  const openAddDayModal = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setAddDayModalVisible(true);
  }, []);

  const addDayOptions = useMemo(() => {
    const opts: { label: string; dateKey: string }[] = [];
    const d = new Date();
    for (let i = 1; i <= 30; i++) {
      d.setDate(d.getDate() - 1);
      const dateKey = toDateKey(d);
      const dateLabel = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
      opts.push({ label: dateLabel, dateKey });
    }
    return opts;
  }, []);

  const handleAddDaySelect = useCallback(
    (dateKey: string) => {
      const exists = logs[dateKey] !== undefined;
      if (!exists) {
        ensureDayExists(dateKey);
      }
      setAddDayModalVisible(false);
      setHighlightDateKey(dateKey);
      setTimeout(() => setHighlightDateKey(null), 1500);
      if (!exists) {
        handleDayPress(dateKey);
      }
    },
    [logs, ensureDayExists, handleDayPress]
  );

  if (!profile.onboardingComplete) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Complete onboarding first</Text>
        </View>
      </View>
    );
  }

  const rangeOptions: TimeRange[] = [7, 14, 30];

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeTab, viewMode === 'progress' && styles.modeTabActive]}
            onPress={() => setViewMode('progress')}
          >
            <Text style={[styles.modeTabText, viewMode === 'progress' && styles.modeTabTextActive]}>Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, viewMode === 'history' && styles.modeTabActive]}
            onPress={() => setViewMode('history')}
          >
            <Text style={[styles.modeTabText, viewMode === 'history' && styles.modeTabTextActive]}>Food Log</Text>
          </TouchableOpacity>
        </View>

        {viewMode === 'progress' ? (
          <>
            <View style={styles.scoreCard}>
              <View style={styles.scoreHeader}>
                <View style={[styles.scoreIcon, { backgroundColor: Colors.successMuted }]}>
                  <Target size={18} color={Colors.success} />
                </View>
                <View style={styles.scoreHeaderText}>
                  <Text style={styles.scoreTitle}>Goal Progress</Text>
                  <Text style={styles.scoreGoal} numberOfLines={1}>
                    {GOAL_LABELS[profile.goal]}
                    {targetSummary ? ` · ${targetSummary}` : ''}
                  </Text>
                </View>
                <View style={styles.addEditRow}>
                  <TouchableOpacity
                    style={styles.addMeasurementBtn}
                    onPress={handleAddMeasurement}
                    activeOpacity={0.7}
                  >
                    <Plus size={16} color={Colors.primary} />
                    <Text style={styles.addMeasurementText}>Add</Text>
                  </TouchableOpacity>
                  {(records.length > 0 || target) && (
                    <>
                      {target && (
                        <TouchableOpacity
                          style={styles.editMeasurementBtn}
                          onPress={handleOpenSetTarget}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.editMeasurementText}>Edit Target</Text>
                        </TouchableOpacity>
                      )}
                      {records.length > 0 && (
                        <TouchableOpacity
                          style={styles.editMeasurementBtn}
                          onPress={handleOpenMeasurementHistory}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.editMeasurementText}>Edit</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </View>

              {needsBaselineForTarget ? (
                <View style={styles.scoreEmpty}>
                  <Ruler size={20} color={Colors.textTertiary} />
                  <Text style={styles.scoreEmptyText}>
                    Set a baseline measurement to start tracking progress toward your target.
                  </Text>
                  <TouchableOpacity style={styles.scoreEmptyCta} onPress={handleAddMeasurement}>
                    <Text style={styles.scoreEmptyCtaText}>Add Measurement</Text>
                  </TouchableOpacity>
                </View>
              ) : records.length >= 2 || (target && (baseline || latest)) ? (
                <>
                  <ScoreGauge score={displayScore} />
                  {targetStatusText && (
                    <Text style={styles.targetStatusText} numberOfLines={1}>
                      {targetStatusText}
                    </Text>
                  )}
                </>
              ) : (
                <View style={styles.scoreEmpty}>
                  <Ruler size={20} color={Colors.textTertiary} />
                  <Text style={styles.scoreEmptyText}>
                    {!hasBaseline
                      ? 'Add baseline measurements to start tracking progress.'
                      : 'Add a second measurement to see your score.'}
                  </Text>
                  <TouchableOpacity style={styles.scoreEmptyCta} onPress={handleAddMeasurement}>
                    <Text style={styles.scoreEmptyCtaText}>
                      {!hasBaseline ? 'Add Baseline' : 'Add Measurement'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {goalScore.insights.length > 0 && records.length >= 2 && (
              <View style={styles.insightsCard}>
                <Text style={styles.insightsTitle}>Insights</Text>
                {goalScore.insights.map((insight, idx) => (
                  <View key={idx} style={styles.insightRow}>
                    <View style={styles.insightDot} />
                    <Text style={styles.insightText}>{insight}</Text>
                  </View>
                ))}
              </View>
            )}

            {trends.length > 0 && (
              <View style={styles.trendsCard}>
                <Text style={styles.trendsTitle}>Measurement Trends</Text>
                <Text style={styles.trendsSubtitle}>Baseline vs Latest</Text>
                {trends.map((trend) => (
                  <TrendItem key={trend.field} trend={trend} onPress={handleOpenMeasurementHistory} />
                ))}
              </View>
            )}

            {goalScore.breakdown.length > 0 && records.length >= 2 && (
              <View style={styles.breakdownCard}>
                <Text style={styles.breakdownTitle}>Score Breakdown</Text>
                {goalScore.breakdown.map((b) => {
                  const barColor = b.score >= 70 ? Colors.success : b.score >= 40 ? Colors.warning : Colors.danger;
                  return (
                    <View key={b.metric} style={styles.breakdownRow}>
                      <View style={styles.breakdownLabel}>
                        <Text style={styles.breakdownLabelText}>{b.label}</Text>
                        <Text style={styles.breakdownWeight}>{Math.round(b.weight * 100)}%</Text>
                      </View>
                      <View style={styles.breakdownTrack}>
                        <View style={[styles.breakdownFill, { width: `${Math.min(b.score, 100)}%`, backgroundColor: barColor }]} />
                      </View>
                      <Text style={[styles.breakdownScore, { color: barColor }]}>{Math.round(b.score)}</Text>
                    </View>
                  );
                })}
              </View>
            )}

            {records.length > 0 && (
              <TouchableOpacity
                style={styles.timelineCard}
                onPress={handleOpenMeasurementHistory}
                activeOpacity={0.9}
              >
                <View style={styles.timelineHeader}>
                  <Text style={styles.timelineTitle}>Measurement History</Text>
                  <ChevronRight size={18} color={Colors.textTertiary} />
                </View>
                <MeasurementTimeline records={records} />
              </TouchableOpacity>
            )}
          </>
        ) : (
          <>
            <View style={styles.rangeSelector}>
              {rangeOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.rangeChip, range === opt && styles.rangeChipActive]}
                  onPress={() => setRange(opt)}
                >
                  <Text style={[styles.rangeChipText, range === opt && styles.rangeChipTextActive]}>
                    {opt}D
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.primaryMuted }]}>
                  <Flame size={18} color={Colors.primary} />
                </View>
                <Text style={styles.statValue}>{streak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.successMuted }]}>
                  <TrendingUp size={18} color={Colors.success} />
                </View>
                <Text style={styles.statValue}>{avgAdherence}%</Text>
                <Text style={styles.statLabel}>Avg Adherence</Text>
              </View>
              <View style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: Colors.carbsMuted }]}>
                  <Calendar size={18} color={Colors.carbs} />
                </View>
                <Text style={styles.statValue}>{datesWithData.length}</Text>
                <Text style={styles.statLabel}>Days Logged</Text>
              </View>
            </View>

            <View style={styles.daysList}>
              <View style={styles.daysListHeader}>
                <Text style={styles.daysListTitle}>Daily Breakdown</Text>
                <TouchableOpacity
                  style={styles.addDayBtn}
                  onPress={openAddDayModal}
                  accessibilityLabel="Add day"
                  accessibilityRole="button"
                >
                  <Plus size={16} color={Colors.primary} />
                  <Text style={styles.addDayBtnText}>Add Day</Text>
                </TouchableOpacity>
              </View>
              {datesToShow.map((date) => {
                const totals = getTotalsForDate(date);
                const isHighlighted = highlightDateKey === date;
                return (
                  <View style={isHighlighted ? styles.dayRowHighlighted : undefined} key={date}>
                    <DayRow
                      date={date}
                      totals={totals}
                      targets={macros}
                      onPress={() => handleDayPress(date)}
                    />
                  </View>
                );
              })}
              {datesToShow.length === 0 && (
                <View style={styles.noDataState}>
                  <Text style={styles.noDataText}>No days in this range</Text>
                  <Text style={styles.noDataSubtext}>
                    Tap "Add Day" to add a missing day, or start tracking today
                  </Text>
                </View>
              )}
            </View>

            <Modal
              visible={addDayModalVisible}
              transparent
              animationType="fade"
              onRequestClose={() => setAddDayModalVisible(false)}
            >
              <TouchableOpacity
                style={styles.addDayOverlay}
                activeOpacity={1}
                onPress={() => setAddDayModalVisible(false)}
              >
                <View style={styles.addDaySheet} onStartShouldSetResponder={() => true}>
                  <Text style={styles.addDayTitle}>Add missing day</Text>
                  <Text style={styles.addDaySubtitle}>Select a date to add to your log</Text>
                  <ScrollView style={styles.addDayList} showsVerticalScrollIndicator={false}>
                    {addDayOptions.map((opt) => (
                      <TouchableOpacity
                        key={opt.dateKey}
                        style={styles.addDayOption}
                        onPress={() => handleAddDaySelect(opt.dateKey)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.addDayOptionText}>{opt.label}</Text>
                        <ChevronRight size={16} color={Colors.textTertiary} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity
                    style={styles.addDayCancel}
                    onPress={() => setAddDayModalVisible(false)}
                  >
                    <Text style={styles.addDayCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </Modal>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modeTabActive: {
    backgroundColor: Colors.primaryMuted,
  },
  modeTabText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  modeTabTextActive: {
    color: Colors.primary,
  },
  scoreCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...(Shadows.cardElevated as Record<string, unknown>),
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  scoreIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreHeaderText: {
    flex: 1,
  },
  scoreTitle: {
    color: Colors.text,
    fontSize: 17,
    fontWeight: '700' as const,
  },
  scoreGoal: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  addEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addMeasurementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editMeasurementBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  editMeasurementText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  addMeasurementText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '700' as const,
  },
  scoreEmpty: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  scoreEmptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  scoreEmptyCta: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  scoreEmptyCtaText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  targetStatusText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 8,
  },
  insightsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...(Shadows.card as Record<string, unknown>),
  },
  insightsTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 10,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  insightDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    marginTop: 6,
  },
  insightText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  trendsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...(Shadows.card as Record<string, unknown>),
  },
  trendsTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  trendsSubtitle: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 2,
    marginBottom: 4,
  },
  breakdownCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...(Shadows.card as Record<string, unknown>),
  },
  breakdownTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 14,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  breakdownLabel: {
    width: 80,
  },
  breakdownLabelText: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  breakdownWeight: {
    color: Colors.textTertiary,
    fontSize: 10,
    fontWeight: '600' as const,
  },
  breakdownTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.cardElevated,
    borderRadius: 3,
    overflow: 'hidden',
  },
  breakdownFill: {
    height: '100%',
    borderRadius: 3,
  },
  breakdownScore: {
    width: 30,
    fontSize: 13,
    fontWeight: '700' as const,
    textAlign: 'right' as const,
  },
  timelineCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    ...(Shadows.card as Record<string, unknown>),
  },
  timelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timelineTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  rangeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 18,
  },
  rangeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: Colors.card,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  rangeChipActive: {
    backgroundColor: Colors.primaryMuted,
    borderColor: Colors.primary,
  },
  rangeChipText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  rangeChipTextActive: {
    color: Colors.primary,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '800' as const,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600' as const,
    marginTop: 2,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  daysList: {},
  daysListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  daysListTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  addDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addDayBtnText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  dayRowHighlighted: {
    backgroundColor: Colors.primaryMuted,
    borderRadius: 12,
    marginBottom: 8,
  },
  addDayOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  addDaySheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  addDayTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  addDaySubtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 16,
  },
  addDayList: {
    maxHeight: 320,
    marginBottom: 16,
  },
  addDayOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  addDayOptionText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  addDayCancel: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  addDayCancelText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  dayRow: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  dayRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayInfo: {
    minWidth: 60,
  },
  dayName: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700' as const,
  },
  dayDate: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  dayCalories: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  dayCalValue: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  dayCalLabel: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  adherenceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  adherenceText: {
    fontSize: 13,
    fontWeight: '700' as const,
  },
  dayExpanded: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
  },
  dayMacroRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dayMacroItem: {
    flex: 1,
    alignItems: 'center',
  },
  dayMacroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  dayMacroLabel: {
    color: Colors.textTertiary,
    fontSize: 11,
    fontWeight: '600' as const,
  },
  dayMacroValue: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700' as const,
    marginTop: 2,
  },
  dayMacroTarget: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontWeight: '500' as const,
  },
  noDataState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  noDataText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  noDataSubtext: {
    color: Colors.textTertiary,
    fontSize: 13,
    marginTop: 4,
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
});
