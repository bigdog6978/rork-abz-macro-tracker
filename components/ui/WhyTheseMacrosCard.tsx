import React, { useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import Colors from '../../constants/colors';
import { Radius } from '../../theme/tokens';
import { MacroTargets } from '../../types';
import { formatNumber } from '../../utils/formatNumber';
import { MACRO_SOURCE_BLURB } from '../../src/content/nutritionScience';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';

interface WhyTheseMacrosCardProps {
  macros: MacroTargets;
  onViewMethodology: () => void;
}

export default function WhyTheseMacrosCard({
  macros,
  onViewMethodology,
}: WhyTheseMacrosCardProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);
  const expandAnim = useRef(new Animated.Value(0)).current;
  const { height: windowHeight } = useWindowDimensions();
  const expandMaxHeight = Math.min(440, windowHeight * 0.5);
  const details = macros.calculationDetails;

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    Animated.timing(expandAnim, {
      toValue: next ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  };

  const contentStyle = useMemo(
    () => ({
      maxHeight: expandAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, expandMaxHeight],
      }),
      opacity: expandAnim,
      transform: [
        {
          translateY: expandAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [-8, 0],
          }),
        },
      ],
    }),
    [expandAnim, expandMaxHeight]
  );

  const iconStyle = useMemo(
    () => ({
      transform: [
        {
          rotate: expandAnim.interpolate({
            inputRange: [0, 1],
            outputRange: ['0deg', '180deg'],
          }),
        },
      ],
    }),
    [expandAnim]
  );

  if (!details) {
    return <Text style={styles.sourceText}>{MACRO_SOURCE_BLURB}</Text>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sourceText}>{MACRO_SOURCE_BLURB}</Text>

      <TouchableOpacity
        style={styles.toggle}
        onPress={toggleExpanded}
        activeOpacity={0.85}
      >
        <Text style={styles.toggleTitle}>Why These Macros?</Text>
        <Animated.View style={iconStyle}>
          <ChevronDown size={18} color={Colors.textSecondary} />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View style={[styles.expandWrap, contentStyle]}>
        <View style={styles.expandInner}>
          <Text style={styles.sectionHeading}>How your macro targets were calculated</Text>

          <DetailRow label="BMR Formula" value={details.bmrFormula} styles={styles} />
          <DetailRow label="Estimated BMR" value={`${formatNumber(details.estimatedBmr)} calories/day`} styles={styles} />
          <DetailRow label="Activity Level" value={details.activityLevelLabel} styles={styles} />
          <DetailRow label="Activity Multiplier" value={details.activityMultiplier.toFixed(2)} styles={styles} />
          <DetailRow label="Estimated Maintenance Calories" value={`${formatNumber(details.estimatedTdee)}`} styles={styles} />
          <DetailRow label="Goal Adjustment" value={details.calorieAdjustmentLabel} styles={styles} />
          <DetailRow label="Eating Style" value={details.eatingStyleLabel} styles={styles} />
          <DetailRow label="Protein Rule" value={details.proteinRuleLabel} styles={styles} />

          <View style={styles.finalBlock}>
            <Text style={styles.finalTitle}>Final Daily Targets</Text>
            <View style={styles.finalGrid}>
              <TargetPill label="Calories" value={formatNumber(macros.calories)} styles={styles} />
              <TargetPill label="Protein" value={`${formatNumber(macros.protein_g)}g`} styles={styles} />
              <TargetPill label="Carbohydrates" value={`${formatNumber(macros.carbs_g)}g`} styles={styles} />
              <TargetPill label="Fat" value={`${formatNumber(macros.fat_g)}g`} styles={styles} />
            </View>
          </View>

          <TouchableOpacity
            style={styles.methodologyButton}
            onPress={onViewMethodology}
            activeOpacity={0.85}
          >
            <Text style={styles.methodologyButtonText}>View Full Methodology</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

function DetailRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function TargetPill({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.targetPill}>
      <Text style={styles.targetLabel}>{label}</Text>
      <Text style={styles.targetValue}>{value}</Text>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    marginTop: 14,
  },
  sourceText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  toggle: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  toggleTitle: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  expandWrap: {
    overflow: 'hidden',
  },
  expandInner: {
    borderTopWidth: 1,
    borderTopColor: Colors.cardBorder,
    paddingTop: 14,
    gap: 10,
  },
  sectionHeading: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  detailValue: {
    flex: 1,
    color: Colors.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'right',
  },
  finalBlock: {
    marginTop: 4,
    gap: 10,
  },
  finalTitle: {
    color: Colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  finalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  targetPill: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: Colors.cardElevated,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  targetLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  targetValue: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 6,
  },
  methodologyButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryMuted,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  methodologyButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
});
