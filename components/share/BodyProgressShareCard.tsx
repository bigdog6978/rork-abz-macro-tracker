import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import { Radius } from '../../theme/tokens';
import { GoalScore, ProgressTrend } from '../../features/progress/types';
import { GoalTarget } from '../../features/progress/goalTargetTypes';
import { buildShareHeadline } from '../../utils/share/shareCaption';
import ShareCardFrame from './ShareCardFrame';

interface BodyProgressShareCardProps {
  primaryColor: string;
  firstName?: string;
  goalScore: GoalScore;
  trends: ProgressTrend[];
  targetScore?: number | null;
  targetStatusText?: string | null;
  target?: GoalTarget | null;
  streak?: number;
}

export default function BodyProgressShareCard({
  primaryColor,
  firstName,
  goalScore,
  trends,
  targetScore,
  targetStatusText,
  target,
  streak,
}: BodyProgressShareCardProps) {
  const styles = useMemo(() => createStyles(primaryColor), [primaryColor]);
  const headline = buildShareHeadline({
    firstName,
    goalScore,
    trends,
    targetScore,
    targetStatusText,
    target,
    streak,
  });
  const metricLines = trends.slice(0, 4);

  return (
    <ShareCardFrame primaryColor={primaryColor}>
      <View style={styles.body}>
        <Text style={styles.headline}>{headline}</Text>

        <View style={styles.scoreBlock}>
          <Text style={styles.scoreValue}>{targetScore ?? goalScore.overall}</Text>
          <Text style={styles.scoreLabel}>/100 goal score</Text>
        </View>

        {metricLines.length > 0 ? (
          <View style={styles.metrics}>
            {metricLines.map((t) => (
              <View key={t.field} style={styles.metricRow}>
                <Text style={styles.metricLabel}>{t.label}</Text>
                <Text style={[styles.metricValue, t.isPositive ? styles.positive : styles.neutral]}>
                  {t.displayValue}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyMetrics}>Add baseline measurements to unlock progress stats.</Text>
        )}

        {streak != null && streak > 1 ? (
          <Text style={styles.streak}>{streak}-day logging streak</Text>
        ) : null}

        <Text style={styles.footer}>Physiq Macro Tracker</Text>
      </View>
    </ShareCardFrame>
  );
}

const createStyles = (primary: string) =>
  StyleSheet.create({
    body: { flex: 1, gap: 28 },
    headline: {
      color: Colors.text,
      fontSize: 40,
      fontWeight: '800',
      lineHeight: 48,
      textAlign: 'center',
    },
    scoreBlock: { alignItems: 'center', paddingVertical: 20 },
    scoreValue: { color: primary, fontSize: 120, fontWeight: '900', lineHeight: 120 },
    scoreLabel: { color: Colors.textSecondary, fontSize: 28, fontWeight: '600', marginTop: 8 },
    metrics: { gap: 16, flex: 1 },
    metricRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: Colors.card,
      paddingHorizontal: 28,
      paddingVertical: 22,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: Colors.cardBorder,
    },
    metricLabel: { color: Colors.textSecondary, fontSize: 26, fontWeight: '600' },
    metricValue: { fontSize: 30, fontWeight: '800' },
    positive: { color: Colors.success },
    neutral: { color: Colors.text },
    emptyMetrics: {
      color: Colors.textSecondary,
      fontSize: 24,
      textAlign: 'center',
      lineHeight: 32,
      flex: 1,
      textAlignVertical: 'center',
    },
    streak: {
      color: Colors.textSecondary,
      fontSize: 24,
      textAlign: 'center',
      marginTop: 'auto',
    },
    footer: {
      color: Colors.textTertiary,
      fontSize: 20,
      textAlign: 'center',
      marginTop: 8,
    },
  });
