import React, { useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
} from 'react-native';
import { router, Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Trash2 } from 'lucide-react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import Colors from '../constants/colors';
import { useMeasurements } from '../providers/MeasurementsProvider';
import { MeasurementRecord } from '../features/progress/types';
import { fromDateKey, toDateKey } from '../utils/dateKey';
import { useThemeColors, type AppColors } from '../providers/ThemeProvider';

function formatDateLabel(dateKey: string): string {
  return fromDateKey(dateKey).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatEntrySummary(r: MeasurementRecord): string {
  const parts: string[] = [];
  if (r.weightLb != null) parts.push(`${r.weightLb} lb`);
  if (r.bodyFatPercent != null) parts.push(`${r.bodyFatPercent}% bf`);
  if (r.waistIn != null) parts.push(`${r.waistIn}" waist`);
  if (r.chestIn != null) parts.push(`${r.chestIn}" chest`);
  if (r.dressSize != null) parts.push(`size ${r.dressSize}`);
  return parts.join(' · ') || '—';
}

export default function MeasurementHistoryScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { records, deleteMeasurement } = useMeasurements();
  const sorted = [...records].reverse();
  const swipeableRefs = useRef<Record<string, Swipeable | null>>({});

  const handleRowPress = useCallback((dateKey: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push({
      pathname: '/add-measurement',
      params: { dateKey },
    } as never);
  }, []);

  const handleDelete = useCallback(
    (r: MeasurementRecord) => {
      const dk = r.dateKey ?? toDateKey(new Date(r.recordedAt));
      const label = formatDateLabel(dk);
      const isBaseline = r.isBaseline;

      Alert.alert(
        'Delete',
        isBaseline
          ? `Delete baseline measurement from ${label}? This will remove it from your progress tracking.`
          : `Delete measurement from ${label}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              deleteMeasurement(r.id);
              swipeableRefs.current[r.id]?.close();
              if (Platform.OS !== 'web') {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              }
            },
          },
        ]
      );
    },
    [deleteMeasurement]
  );

  const renderRightActions = useCallback(
    (r: MeasurementRecord) => (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => handleDelete(r)}
        activeOpacity={0.8}
      >
        <Trash2 size={20} color={Colors.white} />
        <Text style={styles.deleteActionText}>Delete</Text>
      </TouchableOpacity>
    ),
    [handleDelete]
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Measurement History',
          headerStyle: { backgroundColor: Colors.background },
          headerTintColor: Colors.text,
        }}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sorted.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No measurements yet</Text>
            <Text style={styles.emptySubtext}>
              Add your first measurement from the Progress tab
            </Text>
          </View>
        ) : (
          sorted.map((r) => {
            const dk = r.dateKey ?? toDateKey(new Date(r.recordedAt));
            return (
              <Swipeable
                key={r.id}
                ref={(ref) => { swipeableRefs.current[r.id] = ref; }}
                renderRightActions={() => renderRightActions(r)}
                friction={2}
                rightThreshold={40}
              >
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => handleRowPress(dk)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowMain}>
                    <Text style={styles.rowDate}>{formatDateLabel(dk)}</Text>
                    <Text style={styles.rowSummary}>{formatEntrySummary(r)}</Text>
                    {r.isBaseline && (
                      <Text style={styles.baselineTag}>Baseline</Text>
                    )}
                  </View>
                  <ChevronRight size={18} color={Colors.textTertiary} />
                </TouchableOpacity>
              </Swipeable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  rowMain: {
    flex: 1,
  },
  rowDate: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  rowSummary: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  baselineTag: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700' as const,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  emptySubtext: {
    color: Colors.textTertiary,
    fontSize: 13,
    marginTop: 8,
  },
  deleteAction: {
    backgroundColor: Colors.danger,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  deleteActionText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '700' as const,
    marginTop: 4,
  },
});
