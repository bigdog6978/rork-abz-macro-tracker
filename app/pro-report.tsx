import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import Colors from '../constants/colors';
import { useDailyLog } from '../providers/DailyLogProvider';
import { useMeasurements } from '../providers/MeasurementsProvider';
import { usePro } from '../providers/ProProvider';
import { getAdherencePercent } from '../utils/macroEngine';
import { computePhysiqScore } from '../features/pro/proScoring';
import { useUser } from '../providers/UserProvider';

export default function ProReportScreen() {
  const styles = useMemo(() => createStyles(), []);
  const { todayTotals } = useDailyLog();
  const { macros } = useUser();
  const { records } = useMeasurements();
  const { hydration, healthSignals, dynamicTargets, inferredDayType } = usePro();

  const nutritionAdherence = getAdherencePercent(todayTotals, dynamicTargets);
  const hydrationAdherence = Math.round(
    Math.min(100, (hydration.consumedMl / Math.max(hydration.targetMl, 1)) * 100)
  );
  const activityAlignment = healthSignals
    ? Math.max(0, Math.min(100, 100 - Math.abs((healthSignals.activeEnergyKcal - 500) / 7)))
    : 60;
  const consistency = Math.max(40, Math.min(100, nutritionAdherence - 8));
  const physiqScore = computePhysiqScore({
    nutritionAdherence,
    activityAlignment,
    hydrationAdherence,
    consistency,
  });
  const latestWeight = records.length > 0 ? records[records.length - 1].weightLb : null;
  const latestRecord = records.length > 0 ? records[records.length - 1] : null;
  const firstRecord = records.length > 0 ? records[0] : null;
  const weightTrend = latestRecord && firstRecord
    ? ((latestRecord.weightLb ?? 0) - (firstRecord.weightLb ?? 0)).toFixed(1)
    : '0.0';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Pro Report' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Weekly Pro Snapshot</Text>
        <Text style={styles.subtitle}>Day type: {inferredDayType.replace('_', ' ')}</Text>

        <Card label="Physiq Score" value={`${physiqScore}`} styles={styles} />
        <Card label="Nutrition Adherence" value={`${nutritionAdherence}%`} styles={styles} />
        <Card label="Activity Alignment" value={`${Math.round(activityAlignment)}%`} styles={styles} />
        <Card label="Hydration Adherence" value={`${hydrationAdherence}%`} styles={styles} />
        <Card label="Weight Trend" value={`${weightTrend} lb`} styles={styles} />
        <Card label="Latest Weight" value={latestWeight ? `${latestWeight} lb` : 'N/A'} styles={styles} />
        <Card label="Current Core Calories" value={`${macros.calories} cal`} styles={styles} />
        <Card label="Pro Dynamic Calories" value={`${dynamicTargets.calories} cal`} styles={styles} />
      </ScrollView>
    </View>
  );
}

function Card({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    content: { padding: 16, gap: 10 },
    title: { color: Colors.text, fontSize: 22, fontWeight: '800' },
    subtitle: { color: Colors.textSecondary, fontSize: 13, marginBottom: 8 },
    card: {
      backgroundColor: Colors.card,
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      borderRadius: 12,
      padding: 14,
    },
    cardLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
    cardValue: { color: Colors.text, fontSize: 22, fontWeight: '800', marginTop: 4 },
  });
}

