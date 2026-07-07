/**
 * One-time "Any foods to avoid?" sheet shown on the first Plan tab visit —
 * food dislikes/allergies are asked exactly when they matter (plan
 * generation), not during onboarding. Links to the existing Settings
 * screens; skippable. Never shows again once answered/skipped, and never
 * shows for users who already configured preferences.
 */

import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { ChevronRight, ShieldAlert, Utensils } from 'lucide-react-native';
import Colors from '../../constants/colors';
import { Radius, Spacing } from '../../theme/tokens';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import PhysiqPressable from '../ui/PhysiqPressable';
import { getDislikedFoods } from '../../storage/dislikedFoodsRepo';
import { getAllergies } from '../../storage/allergiesRepo';

const GATE_KEY = 'physiq_plan_prefs_prompted_v1';

function PlanPreferencesGate() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const prompted = await AsyncStorage.getItem(GATE_KEY);
        if (prompted === '1') return;
        // Existing installs that already configured preferences skip the gate.
        const [dislikes, allergies] = await Promise.all([getDislikedFoods(), getAllergies()]);
        if (dislikes.length > 0 || allergies.length > 0) {
          await AsyncStorage.setItem(GATE_KEY, '1');
          return;
        }
        if (!cancelled) setVisible(true);
      } catch {
        // Never block the plan screen on the gate.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markPrompted = useCallback(() => {
    setVisible(false);
    void AsyncStorage.setItem(GATE_KEY, '1').catch(() => {});
  }, []);

  const openScreen = useCallback(
    (path: string) => {
      markPrompted();
      router.push(path as never);
    },
    [markPrompted]
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={markPrompted}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Any foods to avoid?</Text>
          <Text style={styles.subtitle}>
            Your meal plan skips foods you dislike and anything you&apos;re allergic to. Set them
            once — or skip and add them later in Settings.
          </Text>

          <PhysiqPressable
            feedback="tap"
            style={styles.linkRow}
            onPress={() => openScreen('/settings/food-preferences')}
            accessibilityRole="button"
            accessibilityLabel="Choose foods you dislike"
          >
            <Utensils size={18} color={colors.primary} />
            <View style={styles.linkCopy}>
              <Text style={styles.linkTitle}>Foods I&apos;d rather avoid</Text>
              <Text style={styles.linkSubtitle}>Proteins, carbs & fats you dislike</Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </PhysiqPressable>

          <PhysiqPressable
            feedback="tap"
            style={styles.linkRow}
            onPress={() => openScreen('/settings/allergies')}
            accessibilityRole="button"
            accessibilityLabel="Set allergies"
          >
            <ShieldAlert size={18} color={Colors.warning} />
            <View style={styles.linkCopy}>
              <Text style={styles.linkTitle}>Allergies & intolerances</Text>
              <Text style={styles.linkSubtitle}>Always excluded from plans</Text>
            </View>
            <ChevronRight size={16} color={Colors.textTertiary} />
          </PhysiqPressable>

          <PhysiqPressable
            feedback="confirm"
            style={styles.primaryBtn}
            onPress={markPrompted}
            accessibilityRole="button"
            accessibilityLabel="No restrictions, build my plan"
          >
            <Text style={styles.primaryBtnText}>No — build my plan</Text>
          </PhysiqPressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: Colors.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: Colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: Spacing.xl,
      paddingBottom: Spacing.xxxl,
      gap: Spacing.md,
    },
    title: {
      color: Colors.text,
      fontSize: 20,
      fontWeight: '800' as const,
    },
    subtitle: {
      color: Colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginTop: -6,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: Colors.cardElevated,
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      borderRadius: Radius.md,
      padding: 14,
    },
    linkCopy: {
      flex: 1,
    },
    linkTitle: {
      color: Colors.text,
      fontSize: 15,
      fontWeight: '700' as const,
    },
    linkSubtitle: {
      color: Colors.textSecondary,
      fontSize: 12,
      fontWeight: '500' as const,
      marginTop: 1,
    },
    primaryBtn: {
      backgroundColor: colors.primary,
      borderRadius: Radius.lg,
      paddingVertical: 15,
      alignItems: 'center',
      marginTop: Spacing.xs,
    },
    primaryBtnText: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: '800' as const,
    },
  });

export default memo(PlanPreferencesGate);
