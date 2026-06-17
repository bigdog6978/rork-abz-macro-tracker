import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import Colors from '../../constants/colors';
import { Radius, Spacing } from '../../theme/tokens';
import { isPsmfDurationExceeded, getPsmfDaysElapsed } from '../../utils/psmfHelpers';

interface PsmfDurationBannerProps {
  psmfStartDate?: string;
  variant?: 'warning' | 'info';
}

export default function PsmfDurationBanner({ psmfStartDate, variant = 'warning' }: PsmfDurationBannerProps) {
  const styles = useMemo(() => createStyles(variant), [variant]);
  const days = getPsmfDaysElapsed(psmfStartDate);
  const exceeded = isPsmfDurationExceeded(psmfStartDate);

  if (!psmfStartDate) {
    return (
      <View style={styles.banner}>
        <AlertTriangle size={16} color={Colors.warning} />
        <Text style={styles.text}>Short-term protocol — max ~2 weeks recommended</Text>
      </View>
    );
  }

  if (exceeded) {
    return (
      <View style={[styles.banner, styles.bannerDanger]}>
        <AlertTriangle size={16} color={Colors.danger} />
        <Text style={[styles.text, styles.textDanger]}>
          PSMF duration exceeded ({days} days) — consider transitioning off
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.banner}>
      <AlertTriangle size={16} color={Colors.warning} />
      <Text style={styles.text}>PSMF day {days} — max ~14 days recommended</Text>
    </View>
  );
}

function createStyles(variant: 'warning' | 'info') {
  return StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
      backgroundColor: variant === 'warning' ? Colors.warningMuted : Colors.cardElevated,
      borderRadius: Radius.md,
      paddingHorizontal: Spacing.md,
      paddingVertical: Spacing.sm,
      marginBottom: Spacing.sm,
    },
    bannerDanger: { backgroundColor: Colors.dangerMuted },
    text: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.warning, lineHeight: 18 },
    textDanger: { color: Colors.danger },
  });
}
