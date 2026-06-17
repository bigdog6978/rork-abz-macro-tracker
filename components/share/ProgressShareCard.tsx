import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Colors from '../../constants/colors';
import { Gradients, Radius, Spacing } from '../../theme/tokens';
import DashBrandSvg from '../ui/DashBrandSvg';
import { ProgressTrend, GoalScore } from '../../features/progress/types';
import { ProgressPhoto } from '../../features/progress/photoTypes';
import { GoalTarget } from '../../features/progress/goalTargetTypes';
import { buildShareHeadline } from '../../utils/share/shareCaption';

export interface ProgressShareCardProps {
  primaryColor: string;
  firstName?: string;
  goalScore: GoalScore;
  trends: ProgressTrend[];
  targetScore?: number | null;
  targetStatusText?: string | null;
  target?: GoalTarget | null;
  streak?: number;
  includePhotos?: boolean;
  baselinePhoto?: ProgressPhoto | null;
  latestPhoto?: ProgressPhoto | null;
}

export default function ProgressShareCard({
  primaryColor,
  firstName,
  goalScore,
  trends,
  targetScore,
  targetStatusText,
  target,
  streak,
  includePhotos = false,
  baselinePhoto,
  latestPhoto,
}: ProgressShareCardProps) {
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
  const metricLines = trends.slice(0, 3);

  return (
    <View style={styles.root} collapsable={false}>
      <LinearGradient colors={Gradients.screen} style={StyleSheet.absoluteFill} />
      <View style={styles.inner}>
        <DashBrandSvg width={140} height={28} color={primaryColor} />
        <Text style={styles.headline}>{headline}</Text>

        {includePhotos && (baselinePhoto || latestPhoto) ? (
          <View style={styles.photoRow}>
            {baselinePhoto && (
              <View style={styles.photoCol}>
                <Text style={styles.photoLabel}>Baseline</Text>
                <Image source={{ uri: baselinePhoto.fileUri }} style={styles.photo} contentFit="cover" />
              </View>
            )}
            {latestPhoto && latestPhoto.id !== baselinePhoto?.id && (
              <View style={styles.photoCol}>
                <Text style={styles.photoLabel}>Latest</Text>
                <Image source={{ uri: latestPhoto.fileUri }} style={styles.photo} contentFit="cover" />
              </View>
            )}
          </View>
        ) : null}

        <View style={styles.scoreBlock}>
          <Text style={styles.scoreValue}>{targetScore ?? goalScore.overall}</Text>
          <Text style={styles.scoreLabel}>/100 goal score</Text>
        </View>

        {metricLines.length > 0 && (
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
        )}

        {streak != null && streak > 1 && (
          <Text style={styles.streak}>{streak}-day logging streak</Text>
        )}

        <Text style={styles.footer}>Physiq Macro Tracker</Text>
      </View>
    </View>
  );
}

const createStyles = (primary: string) =>
  StyleSheet.create({
    root: {
      width: 360,
      minHeight: 480,
      borderRadius: Radius.lg,
      overflow: 'hidden',
      backgroundColor: Colors.background,
    },
    inner: {
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    headline: {
      color: Colors.text,
      fontSize: 20,
      fontWeight: '800',
      lineHeight: 26,
      marginTop: Spacing.sm,
    },
    photoRow: { flexDirection: 'row', gap: Spacing.sm },
    photoCol: { flex: 1, gap: 4 },
    photoLabel: { color: Colors.textSecondary, fontSize: 11, fontWeight: '700' },
    photo: { width: '100%', aspectRatio: 3 / 4, borderRadius: Radius.md, backgroundColor: Colors.cardElevated },
    scoreBlock: { alignItems: 'center', paddingVertical: Spacing.sm },
    scoreValue: { color: primary, fontSize: 48, fontWeight: '900' },
    scoreLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
    metrics: { gap: 8 },
    metricRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: Colors.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: Colors.cardBorder,
    },
    metricLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
    metricValue: { fontSize: 15, fontWeight: '800' },
    positive: { color: Colors.success },
    neutral: { color: Colors.text },
    streak: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center' },
    footer: { color: Colors.textTertiary, fontSize: 11, textAlign: 'center', marginTop: Spacing.sm },
  });
