/**
 * One-time coach mark anchored above the FAB: teaches the first log and the
 * long-press voice shortcut. Dismissed by ×, or automatically once the user
 * has logged anything; persisted so it never reappears.
 */

import React, { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { X } from 'lucide-react-native';
import Colors from '../../constants/colors';
import { Radius, Shadows } from '../../theme/tokens';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import PhysiqPressable from '../ui/PhysiqPressable';

const COACHMARK_KEY = 'physiq_coachmark_log_v1';

type Props = {
  /** Number of entries logged today — any log dismisses the mark for good. */
  entryCount: number;
};

function LogCoachMark({ entryCount }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(COACHMARK_KEY)
      .then((v) => setDismissed(v === '1'))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!dismissed && entryCount > 0) {
      setDismissed(true);
      void AsyncStorage.setItem(COACHMARK_KEY, '1').catch(() => {});
    }
  }, [dismissed, entryCount]);

  if (dismissed || entryCount > 0) return null;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <View style={styles.bubble}>
        <Text style={styles.text}>
          Log your first meal — tap <Text style={styles.bold}>+</Text>, or hold it to speak.
        </Text>
        <PhysiqPressable
          feedback="tap"
          onPress={() => {
            setDismissed(true);
            void AsyncStorage.setItem(COACHMARK_KEY, '1').catch(() => {});
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Dismiss tip"
        >
          <X size={14} color={Colors.textTertiary} />
        </PhysiqPressable>
      </View>
      <View style={styles.arrow} />
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    wrap: {
      position: 'absolute',
      bottom: 92,
      right: 20,
      alignItems: 'flex-end',
    },
    bubble: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      maxWidth: 260,
      backgroundColor: Colors.cardElevated,
      borderColor: colors.primary,
      borderWidth: 1,
      borderRadius: Radius.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
      ...(Shadows.card as Record<string, unknown>),
    },
    text: {
      flexShrink: 1,
      color: Colors.text,
      fontSize: 13,
      fontWeight: '600' as const,
      lineHeight: 18,
    },
    bold: {
      color: colors.primary,
      fontWeight: '800' as const,
    },
    arrow: {
      width: 0,
      height: 0,
      marginRight: 22,
      borderLeftWidth: 7,
      borderRightWidth: 7,
      borderTopWidth: 8,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
      borderTopColor: colors.primary,
    },
  });

export default memo(LogCoachMark);
