/**
 * The dashboard's single prompt slot. Gathers eligibility itself and renders
 * at most one banner (measurement cadence → baseline photo → training-mode
 * nudge). Photo-prompt dismissal persists in AsyncStorage.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Camera, Dumbbell, ChevronRight, Ruler, X } from 'lucide-react-native';
import Colors from '../../constants/colors';
import { Radius, Spacing } from '../../theme/tokens';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import PhysiqPressable from '../ui/PhysiqPressable';
import { useMeasurements } from '../../providers/MeasurementsProvider';
import { usePhotos } from '../../providers/PhotosProvider';
import { usePro } from '../../providers/ProProvider';
import { useDailyLog } from '../../providers/DailyLogProvider';
import { selectDashboardBanner } from '../../features/home/dashboardBanner';

const PHOTO_PROMPT_DISMISSED_KEY = 'physiq_photo_prompt_dismissed_v1';

function DashboardBanner() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { showPrompt, hasBaseline, dismissPrompt } = useMeasurements();
  const { baseline: baselinePhoto } = usePhotos();
  const { athleteProfile, settings: proSettings } = usePro();
  const { getStreak } = useDailyLog();

  const [photoPromptDismissed, setPhotoPromptDismissed] = useState(true);
  useEffect(() => {
    AsyncStorage.getItem(PHOTO_PROMPT_DISMISSED_KEY)
      .then((v) => setPhotoPromptDismissed(v === '1'))
      .catch(() => {});
  }, []);

  const dismissPhotoPrompt = useCallback(() => {
    setPhotoPromptDismissed(true);
    void AsyncStorage.setItem(PHOTO_PROMPT_DISMISSED_KEY, '1').catch(() => {});
  }, []);

  const kind = selectDashboardBanner({
    measurementPromptVisible: showPrompt,
    streak: getStreak(),
    hasBaselinePhoto: baselinePhoto != null,
    photoPromptDismissed,
    trainingNudgeEligible:
      !athleteProfile.enabled &&
      (proSettings.dynamicMacrosEnabled || proSettings.hydrationEnabled),
  });

  if (kind === 'measurement') {
    return (
      <View style={styles.banner}>
        <View style={styles.left}>
          <View style={[styles.iconBadge, { backgroundColor: 'rgba(52, 211, 153, 0.2)' }]}>
            <Ruler size={16} color={Colors.success} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.title}>
              {hasBaseline ? 'Update Measurements' : 'Add Baseline Measurements'}
            </Text>
            <Text style={styles.subtitle}>
              {hasBaseline
                ? 'Track your progress beyond the scale'
                : 'Start tracking progress beyond weight'}
            </Text>
          </View>
        </View>
        <View style={styles.actions}>
          <PhysiqPressable
            feedback="confirm"
            style={[styles.cta, { backgroundColor: Colors.success }]}
            onPress={() => router.push('/add-measurement' as never)}
          >
            <Text style={styles.ctaText}>Go</Text>
          </PhysiqPressable>
          <PhysiqPressable
            feedback="tap"
            style={styles.dismiss}
            onPress={() => dismissPrompt()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Dismiss measurement prompt"
          >
            <X size={14} color={Colors.textTertiary} />
          </PhysiqPressable>
        </View>
      </View>
    );
  }

  if (kind === 'photo') {
    return (
      <View style={styles.banner}>
        <View style={styles.left}>
          <View style={[styles.iconBadge, { backgroundColor: colors.primaryMuted }]}>
            <Camera size={16} color={colors.primary} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.title}>Add a baseline photo</Text>
            <Text style={styles.subtitle}>3-day streak! Future you will thank you.</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <PhysiqPressable
            feedback="confirm"
            style={[styles.cta, { backgroundColor: colors.primary }]}
            onPress={() => {
              dismissPhotoPrompt();
              router.push('/progress-photos' as never);
            }}
          >
            <Text style={[styles.ctaText, { color: colors.onPrimary }]}>Go</Text>
          </PhysiqPressable>
          <PhysiqPressable
            feedback="tap"
            style={styles.dismiss}
            onPress={dismissPhotoPrompt}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Dismiss photo prompt"
          >
            <X size={14} color={Colors.textTertiary} />
          </PhysiqPressable>
        </View>
      </View>
    );
  }

  if (kind === 'training') {
    return (
      <PhysiqPressable
        feedback="tap"
        style={styles.trainingNudge}
        onPress={() => router.push('/training-mode' as never)}
      >
        <Dumbbell size={16} color={colors.primary} />
        <Text style={styles.trainingNudgeText}>
          Set up Training Mode for sport & schedule-aware fueling
        </Text>
        <ChevronRight size={16} color={Colors.textTertiary} />
      </PhysiqPressable>
    );
  }

  return null;
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderRadius: Radius.lg,
      padding: 14,
      marginTop: Spacing.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    iconBadge: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textCol: {
      flex: 1,
    },
    title: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700' as const,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '500' as const,
      marginTop: 1,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    cta: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: Radius.sm,
    },
    ctaText: {
      color: Colors.white,
      fontSize: 13,
      fontWeight: '700' as const,
    },
    dismiss: {
      padding: 4,
    },
    trainingNudge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: Spacing.lg,
      padding: Spacing.md,
      borderRadius: Radius.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    trainingNudgeText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600' as const,
    },
  });

export default memo(DashboardBanner);
