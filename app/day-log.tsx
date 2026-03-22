/**
 * Day Detail screen - view and add foods for a specific date.
 * Used for retroactive logging from Daily Breakdown.
 */
import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Trash2, Plus } from 'lucide-react-native';
import Colors from '../constants/colors';
import { formatNumber } from '../utils/formatNumber';
import { useDailyLog } from '../providers/DailyLogProvider';
import { useUser } from '../providers/UserProvider';
import { getAdherencePercent } from '../utils/macroEngine';
import { fromDateKey } from '../utils/dateKey';
import { Radius, Spacing } from '../theme/tokens';
import PremiumCard from '../components/ui/PremiumCard';
import { useThemeColors, type AppColors } from '../providers/ThemeProvider';

export default function DayLogScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{ dateKey?: string }>();
  const dateKey = typeof params.dateKey === 'string' ? params.dateKey : undefined;

  const { getEntriesForDate, getTotalsForDate, removeEntry } = useDailyLog();
  const { macros } = useUser();

  const entries = getEntriesForDate(dateKey ?? '');
  const totals = getTotalsForDate(dateKey ?? '');
  const adherence = getAdherencePercent(totals, macros);

  const handleAddFood = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push({ pathname: '/add-food', params: { dateKey: dateKey ?? '' } } as never);
  }, [dateKey]);

  const handleEditEntry = useCallback(
    (entryId: string) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      router.push({
        pathname: '/edit-log-entry',
        params: { entryId, dateKey: dateKey ?? '' },
      } as never);
    },
    [dateKey]
  );

  const handleRemoveEntry = useCallback(
    (id: string) => {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      removeEntry(id, dateKey ?? undefined);
    },
    [dateKey, removeEntry]
  );

  if (!dateKey) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Day', headerShown: true }} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Invalid date</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const d = fromDateKey(dateKey);
  const dateLabel = d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const adherenceColor =
    adherence >= 80 ? Colors.success : adherence >= 50 ? Colors.warning : Colors.danger;

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: dateLabel, headerShown: true }} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.totalsCard}>
          <Text style={styles.totalsTitle}>{dateLabel}</Text>
          <View style={styles.totalsRow}>
            <View style={styles.totalsItem}>
              <Text style={styles.totalsValue}>{formatNumber(totals.calories)}</Text>
              <Text style={styles.totalsLabel}>cal</Text>
            </View>
            <View style={[styles.adherenceBadge, { backgroundColor: adherenceColor + '20' }]}>
              <Text style={[styles.adherenceText, { color: adherenceColor }]}>{adherence}%</Text>
            </View>
          </View>
          <View style={styles.macroRow}>
            <Text style={styles.macroItem}>
              P: {formatNumber(totals.protein_g)}g
            </Text>
            <Text style={styles.macroItem}>
              C: {formatNumber(totals.carbs_g)}g
            </Text>
            <Text style={styles.macroItem}>
              F: {formatNumber(totals.fat_g)}g
            </Text>
          </View>
        </View>

        {entries.length > 0 ? (
          <View style={styles.entriesSection}>
            <Text style={styles.sectionTitle}>Foods</Text>
            {entries.map((entry) => (
              <PremiumCard key={entry.id} style={styles.entryCard}>
                <TouchableOpacity
                  style={styles.entryTapArea}
                  onPress={() => handleEditEntry(entry.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryName}>{entry.name}</Text>
                    <Text style={styles.entryMacros}>
                      {formatNumber(entry.calories)} cal · {formatNumber(entry.protein_g)}p ·{' '}
                      {formatNumber(entry.carbs_g)}c · {formatNumber(entry.fat_g)}f
                    </Text>
                  </View>
                  <ChevronRight size={18} color={Colors.textTertiary} style={styles.entryChevron} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.entryDelete}
                  onPress={() => handleRemoveEntry(entry.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Trash2 size={16} color={Colors.textTertiary} />
                </TouchableOpacity>
              </PremiumCard>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No foods logged</Text>
            <Text style={styles.emptySubtext}>
              Add foods to this day to track your macros.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.addFoodCta}
          onPress={handleAddFood}
          activeOpacity={0.85}
        >
          <Plus size={20} color={colors.onPrimary} />
          <Text style={styles.addFoodCtaText}>
            {entries.length > 0 ? 'Add Food' : 'Add Food to this Day'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  totalsCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  totalsTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  totalsItem: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  totalsValue: {
    color: colors.primary,
    fontSize: 28,
    fontWeight: '800' as const,
  },
  totalsLabel: {
    color: Colors.textTertiary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  adherenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  adherenceText: {
    fontSize: 14,
    fontWeight: '700' as const,
  },
  macroRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  macroItem: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  entriesSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
    marginBottom: Spacing.md,
  },
  entryCard: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  entryTapArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  entryInfo: {
    flex: 1,
  },
  entryChevron: {
    marginLeft: 8,
  },
  entryName: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  entryMacros: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 3,
    fontWeight: '500' as const,
  },
  entryDelete: {
    padding: 8,
  },
  addFoodCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: Radius.lg,
  },
  addFoodCtaText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    marginBottom: Spacing.lg,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginBottom: 16,
  },
  emptyTitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  emptySubtext: {
    color: Colors.textTertiary,
    fontSize: 14,
    textAlign: 'center' as const,
  },
  backBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: colors.onPrimary,
    fontSize: 14,
    fontWeight: '700' as const,
  },
});
