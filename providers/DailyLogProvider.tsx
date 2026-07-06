import { createSafeContextHook } from '../utils/createSafeContextHook';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
import { FoodEntry, MacroTargets } from '../types';
import { getTodayDateKey } from '../utils/dateKey';
import * as dailyLogRepo from '../storage/dailyLogRepo';
import {
  StoredLogs,
  computeStreak,
  ensureEntryMacros,
} from '../storage/dailyLogMigration';

const LOGS_QUERY_KEY = ['food_logs'] as const;
const EMPTY_LOGS: StoredLogs = {};
const EMPTY_ENTRIES: FoodEntry[] = [];

function sumTotals(entries: FoodEntry[]): MacroTargets {
  return entries.reduce(
    (acc, entry) => ({
      calories: acc.calories + entry.calories,
      protein_g: acc.protein_g + entry.protein_g,
      carbs_g: acc.carbs_g + entry.carbs_g,
      fat_g: acc.fat_g + entry.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

/**
 * Daily food log state.
 *
 * The React Query cache (['food_logs']) is the single source of truth for UI
 * state; storage/dailyLogRepo.ts owns persistence (SQLite, row-per-entry).
 * Mutations apply a synchronous functional cache update (instant UI, no stale
 * closures) and then persist the same row-level change fire-and-forget —
 * matching the previous AsyncStorage behavior where persistence errors were
 * logged, not surfaced.
 */
export const [DailyLogProvider, useDailyLog] = createSafeContextHook(() => {
  const queryClient = useQueryClient();
  const [today, setToday] = useState(getTodayDateKey());

  const logsQuery = useQuery({
    queryKey: LOGS_QUERY_KEY,
    queryFn: dailyLogRepo.loadAllLogs,
  });
  const logs = logsQuery.data ?? EMPTY_LOGS;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setToday(getTodayDateKey());
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime() + 100;
    const timer = setTimeout(() => {
      setToday(getTodayDateKey());
    }, msUntilMidnight);
    return () => clearTimeout(timer);
  }, [today]);

  /** Synchronous functional cache update; returns the next map. */
  const setLogsCache = useCallback(
    (updater: (prev: StoredLogs) => StoredLogs): StoredLogs => {
      const next = updater(queryClient.getQueryData<StoredLogs>(LOGS_QUERY_KEY) ?? {});
      queryClient.setQueryData<StoredLogs>(LOGS_QUERY_KEY, next);
      return next;
    },
    [queryClient]
  );

  const addEntries = useCallback(
    (entries: FoodEntry[], dateKey?: string) => {
      if (entries.length === 0) return;
      const targetDate = dateKey ?? today;
      setLogsCache((prev) => ({
        ...prev,
        [targetDate]: [...(prev[targetDate] ?? []), ...entries],
      }));
      void dailyLogRepo.insertEntries(targetDate, entries);
    },
    [setLogsCache, today]
  );

  const addEntry = useCallback(
    (entry: FoodEntry, dateKey?: string) => {
      addEntries([entry], dateKey);
    },
    [addEntries]
  );

  const removeEntry = useCallback(
    (entryId: string, dateKey?: string) => {
      const targetDate = dateKey ?? today;
      setLogsCache((prev) => {
        if (!prev[targetDate]) return prev;
        return {
          ...prev,
          [targetDate]: prev[targetDate].filter((e) => e.id !== entryId),
        };
      });
      void dailyLogRepo.deleteEntry(entryId);
    },
    [setLogsCache, today]
  );

  const updateEntry = useCallback(
    (entryId: string, updates: Partial<FoodEntry>, dateKey?: string) => {
      const targetDate = dateKey ?? today;
      const current = queryClient.getQueryData<StoredLogs>(LOGS_QUERY_KEY) ?? {};
      const existing = current[targetDate]?.find((e) => e.id === entryId);
      if (!existing) return;
      let merged: FoodEntry = { ...existing, ...updates };
      if (!merged.isCustomMacros && merged.nutrientsPer100g) {
        merged = ensureEntryMacros(merged);
      }
      const nextEntry = merged;
      setLogsCache((prev) => ({
        ...prev,
        [targetDate]: (prev[targetDate] ?? []).map((e) => (e.id === entryId ? nextEntry : e)),
      }));
      void dailyLogRepo.updateEntry(targetDate, nextEntry);
    },
    [queryClient, setLogsCache, today]
  );

  const clearToday = useCallback(() => {
    setLogsCache((prev) => {
      const { [today]: _removed, ...rest } = prev;
      return rest;
    });
    void dailyLogRepo.deleteDay(today);
  }, [setLogsCache, today]);

  const clearAll = useCallback(async () => {
    queryClient.setQueryData<StoredLogs>(LOGS_QUERY_KEY, {});
    await dailyLogRepo.clearAll();
  }, [queryClient]);

  const todayEntries = useMemo(() => {
    return logs[today] ?? EMPTY_ENTRIES;
  }, [logs, today]);

  const todayTotals: MacroTargets = useMemo(() => sumTotals(todayEntries), [todayEntries]);

  const getEntriesForDate = useCallback(
    (date: string): FoodEntry[] => {
      return logs[date] ?? EMPTY_ENTRIES;
    },
    [logs]
  );

  const getTotalsForDate = useCallback(
    (date: string): MacroTargets => {
      return sumTotals(logs[date] ?? EMPTY_ENTRIES);
    },
    [logs]
  );

  const getDatesWithEntries = useCallback((): string[] => {
    return Object.keys(logs)
      .filter((date) => logs[date].length > 0)
      .sort()
      .reverse();
  }, [logs]);

  /**
   * Empty-day keys are cache-only: they never render anywhere
   * (getDatesWithEntries filters them, getEntriesForDate returns [] for
   * missing dates) so persisting them had no user-visible effect.
   */
  const ensureDayExists = useCallback(
    (dateKey: string): StoredLogs => {
      return setLogsCache((prev) => (prev[dateKey] ? prev : { ...prev, [dateKey]: [] }));
    },
    [setLogsCache]
  );

  const clearDay = useCallback(
    (dateKey: string) => {
      const current = queryClient.getQueryData<StoredLogs>(LOGS_QUERY_KEY) ?? {};
      if ((current[dateKey] ?? []).length > 0) {
        if (__DEV__) {
          console.warn('[DailyLog] clearDay: day has entries, refusing to clear');
        }
        return;
      }
      setLogsCache((prev) => {
        const { [dateKey]: _removed, ...rest } = prev;
        return rest;
      });
      void dailyLogRepo.deleteDay(dateKey);
    },
    [queryClient, setLogsCache]
  );

  // O(365) walk runs once per logs change instead of on every render /
  // watch-sync payload rebuild. `today` keeps it fresh across midnight.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const streak = useMemo(() => computeStreak(logs), [logs, today]);
  const getStreak = useCallback((): number => streak, [streak]);

  const isLoading = logsQuery.isLoading;

  return useMemo(
    () => ({
      todayEntries,
      todayTotals,
      addEntry,
      addEntries,
      removeEntry,
      updateEntry,
      clearToday,
      clearAll,
      clearDay,
      ensureDayExists,
      getEntriesForDate,
      getTotalsForDate,
      getDatesWithEntries,
      getStreak,
      logs,
      isLoading,
    }),
    [
      todayEntries,
      todayTotals,
      addEntry,
      addEntries,
      removeEntry,
      updateEntry,
      clearToday,
      clearAll,
      clearDay,
      ensureDayExists,
      getEntriesForDate,
      getTotalsForDate,
      getDatesWithEntries,
      getStreak,
      logs,
      isLoading,
    ]
  );
}, 'useDailyLog', 'DailyLogProvider');
