import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import { Radius } from '../../theme/tokens';
import CalorieGauge from '../ui/CalorieGauge';
import { MacroDial } from '../ui/MacroRing';
import { formatNumber } from '../../utils/formatNumber';
import ShareCardFrame from './ShareCardFrame';

interface DailyMacrosShareCardProps {
  primaryColor: string;
  firstName?: string;
  caloriesConsumed: number;
  caloriesTarget: number;
  proteinConsumed: number;
  proteinTarget: number;
  carbsConsumed: number;
  carbsTarget: number;
  fatConsumed: number;
  fatTarget: number;
  streak?: number;
}

export default function DailyMacrosShareCard({
  primaryColor,
  firstName,
  caloriesConsumed,
  caloriesTarget,
  proteinConsumed,
  proteinTarget,
  carbsConsumed,
  carbsTarget,
  fatConsumed,
  fatTarget,
  streak,
}: DailyMacrosShareCardProps) {
  const styles = useMemo(() => createStyles(primaryColor), [primaryColor]);
  const remaining = Math.max(caloriesTarget - caloriesConsumed, 0);
  const hitTarget = caloriesTarget > 0 && caloriesConsumed >= caloriesTarget * 0.95;
  const name = firstName?.trim();
  const headline = hitTarget
    ? name
      ? `${name} hit today's targets`
      : "Today's targets hit"
    : name
      ? `${name}'s day`
      : 'My macros today';

  return (
    <ShareCardFrame primaryColor={primaryColor}>
      <View style={styles.body}>
        <Text style={styles.headline}>{headline}</Text>
        <View style={styles.gaugeWrap}>
          <CalorieGauge
            consumed={caloriesConsumed}
            target={caloriesTarget}
            color={primaryColor}
            size={400}
            strokeWidth={28}
          />
          <View style={styles.gaugeCenter}>
            <Text style={styles.calValue}>{formatNumber(hitTarget ? caloriesConsumed : remaining)}</Text>
            <Text style={styles.calLabel}>{hitTarget ? 'cal logged' : 'cal left'}</Text>
            <Text style={styles.calSub}>
              {formatNumber(caloriesConsumed)} / {formatNumber(caloriesTarget)}
            </Text>
          </View>
        </View>

        <View style={styles.macroRow}>
          <MacroDial
            label="Protein"
            consumed={proteinConsumed}
            target={proteinTarget}
            color={Colors.protein}
            size={200}
            strokeWidth={14}
          />
          <MacroDial
            label="Carbs"
            consumed={carbsConsumed}
            target={carbsTarget}
            color={Colors.carbs}
            size={200}
            strokeWidth={14}
          />
        </View>
        <View style={styles.macroRowCenter}>
          <MacroDial
            label="Fat"
            consumed={fatConsumed}
            target={fatTarget}
            color={Colors.fat}
            size={200}
            strokeWidth={14}
          />
        </View>

        {streak != null && streak > 1 ? (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>{streak}-day streak</Text>
          </View>
        ) : null}
      </View>
    </ShareCardFrame>
  );
}

const createStyles = (primary: string) =>
  StyleSheet.create({
    body: { flex: 1, alignItems: 'center', gap: 28 },
    headline: {
      color: Colors.text,
      fontSize: 44,
      fontWeight: '800',
      textAlign: 'center',
      lineHeight: 52,
    },
    gaugeWrap: {
      width: 400,
      height: 400,
      alignItems: 'center',
      justifyContent: 'center',
    },
    gaugeCenter: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    calValue: { color: Colors.text, fontSize: 72, fontWeight: '900' },
    calLabel: { color: Colors.textSecondary, fontSize: 24, fontWeight: '700', marginTop: 4 },
    calSub: { color: primary, fontSize: 22, fontWeight: '700', marginTop: 8 },
    macroRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 36,
      width: '100%',
    },
    macroRowCenter: { alignItems: 'center', width: '100%' },
    streakBadge: {
      marginTop: 'auto',
      paddingHorizontal: 28,
      paddingVertical: 14,
      borderRadius: Radius.xl,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
    },
    streakText: { color: Colors.text, fontSize: 26, fontWeight: '700' },
  });
