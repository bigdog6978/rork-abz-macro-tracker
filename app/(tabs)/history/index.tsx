import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  Flame, TrendingUp, TrendingDown, Calendar, ChevronDown, ChevronUp,
  Target, Plus, ArrowUpRight, ArrowDownRight, Minus, Ruler,
} from 'lucide-react-native';
import Colors from '../../../constants/colors';
import { formatNumber } from '../../../utils/formatNumber';
import { useUser } from '../../../providers/UserProvider';
import { useDailyLog } from '../../../providers/DailyLogProvider';
import { useMeasurements } from '../../../providers/MeasurementsProvider';
import { getAdherencePercent } from '../../../utils/macroEngine';
import { MacroTargets, GOAL_LABELS } from '../../../types';
import { ProgressTrend } from '../../../features/progress/types';

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

function TrendItem({ trend }: { trend: ProgressTrend }) {
  const icon = trend.direction === 'up'
    ? <ArrowUpRight size={16} color={trend.isPositive ? Colors.success : Colors.danger} />
    : trend.direction === 'down'
    ? <ArrowDownRight size={16} color={trend.isPositive ? Colors.success : Colors.danger} />
    : <Minus size={16} color={Colors.textSecondary} />;

  const valueColor = trend.isPositive ? Colors.success : trend.direction === 'stable' ? Colors.textSecondary : Colors.danger;

  return (
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
}: {
  date: string;
  totals: MacroTargets;
  targets: MacroTargets;
}) {
  const [expanded, setExpanded] = useState(false);
  const adherence = getAdherencePercent(totals, targets);
  const d = new Date(date + 'T12:00:00');
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
  const dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const adherenceColor =
    adherence >= 80 ? Colors.success : adherence >= 50 ? Colors.warning : Colors.danger;

  return (
    <TouchableOpacity
      style={styles.dayRow}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
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
        {expanded ? (
          <ChevronUp size={16} color={Colors.textTertiary} />
        ) : (
          <ChevronDown size={16} color={Colors.textTertiary} />
        )}
      </View>
      {expanded && (
        <View style={styles.dayExpanded}>
          <View style={styles.dayMacroRow}>
            <View style={styles.dayMacroItem}>
              <View style={[styles.dayMacroDot, { backgroundColor: Colors.protein }]} />
              <Text style={styles.dayMacroLabel}>Protein</Text>
              <Text style={styles.dayMacroValue}>
                {formatNumber(totals.protein_g)}
                <Text style={styles.dayMacroTarget}>/{formatNumber(targets.protein_g)}g</Text>
              </Text>
            </View>
            <View style={styles.dayMacroItem}>
              <View style={[styles.dayMacroDot, { backgroundColor: Colors.carbs }]} />
              <Text style={styles.dayMacroLabel}>Carbs</Text>
              <Text style={styles.dayMacroValue}>
                {formatNumber(totals.carbs_g)}
                <Text style={styles.dayMacroTarget}>/{formatNumber(targets.carbs_g)}g</Text>
              </Text>
            </View>
            <View style={styles.dayMacroItem}>
              <View style={[styles.dayMacroDot, { backgroundColor: Colors.fat }]} />
              <Text style={styles.dayMacroLabel}>Fat</Text>
              <Text style={styles.dayMacroValue}>
                {formatNumber(totals.fat_g)}
                <Text style={styles.dayMacroTarget}>/{formatNumber(targets.fat_g)}g</Text>
              </Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const { profile, macros } = useUser();
  const { getTotalsForDate, getDatesWithEntries, getStreak } = useDailyLog();
  const { records, trends, goalScore, hasBaseline, baseline, latest } = useMeasurements();
  const [viewMode, setViewMode] = useState<ViewMode>('progress');
  const [range, setRange] = useState<TimeRange>(7);
  const streak = getStreak();

  const datesInRange = useMemo(() => {
    const dates: string[] = [];
    const d = new Date();
    for (let i = 0; i < range; i++) {
      dates.push(d.toISOString().split('T')[0]);
      d.setDate(d.getDate() - 1);
    }
    return dates;
  }, [range]);

  const datesWithData = useMemo(() => {
    const allDates = getDatesWithEntries();
    return datesInRange.filter((date) => allDates.includes(date));
  }, [datesInRange, getDatesWithEntries]);

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

  if (!profile.onboarding_complete) {
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
                  <Text style={styles.scoreGoal}>{GOAL_LABELS[profile.goal]}</Text>
                </View>
                <TouchableOpacity
                  style={styles.addMeasurementBtn}
                  onPress={handleAddMeasurement}
                  activeOpacity={0.7}
                >
                  <Plus size={16} color={Colors.primary} />
                  <Text style={styles.addMeasurementText}>Add</Text>
                </TouchableOpacity>
              </View>

              {records.length >= 2 ? (
                <ScoreGauge score={goalScore.overall} />
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
                  <TrendItem key={trend.field} trend={trend} />
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
              <View style={styles.timelineCard}>
                <Text style={styles.timelineTitle}>Measurement History</Text>
                <MeasurementTimeline records={records} />
              </View>
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
              <Text style={styles.daysListTitle}>Daily Breakdown</Text>
              {datesInRange.map((date) => {
                const totals = getTotalsForDate(date);
                if (totals.calories === 0) return null;
                return (
                  <DayRow
                    key={date}
                    date={date}
                    totals={totals}
                    targets={macros}
                  />
                );
              })}
              {datesWithData.length === 0 && (
                <View style={styles.noDataState}>
                  <Text style={styles.noDataText}>No logged days in this range</Text>
                  <Text style={styles.noDataSubtext}>Start tracking to see your history</Text>
                </View>
              )}
            </View>
          </>
        )}
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
    borderRadius: 18,
    padding: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
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
  addMeasurementBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primaryMuted,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
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
  insightsCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
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
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
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
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
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
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  timelineTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
    marginBottom: 8,
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
  daysListTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 12,
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
