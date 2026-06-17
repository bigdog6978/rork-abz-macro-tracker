import { createSafeContextHook } from '../utils/createSafeContextHook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppState } from 'react-native';
import { FoodEntry, MacroTargets } from '../types';
import { getTodayDateKey, toDateKey } from '../utils/dateKey';
import { loadData, saveData, removeData, STORAGE_KEYS } from '../services/storage';
import * as foodService from '../features/food/foodService';

interface StoredLogs {
  [date: string]: FoodEntry[];
}

/** Migrate legacy entries: measureMode 'units' -> 'qty' */
function migrateEntry(entry: FoodEntry): FoodEntry {
  if (entry.measureMode === 'units') {
    return { ...entry, measureMode: 'qty' };
  }
  return entry;
}

function migrateLogs(logs: StoredLogs): StoredLogs {
  const out: StoredLogs = {};
  for (const [date, entries] of Object.entries(logs)) {
    out[date] = entries.map(migrateEntry);
  }
  return out;
}

/** Recompute entry macros from nutrientsPer100g when not custom */
function ensureEntryMacros(entry: FoodEntry): FoodEntry {
  if (entry.isCustomMacros || !entry.nutrientsPer100g) return entry;
  const mode = (entry.measureMode === 'units' ? 'qty' : entry.measureMode) ?? 'grams';
  const qty = entry.quantity ?? entry.servingGrams ?? 100;
  const totalGrams = foodService.computeTotalGrams(mode, qty, entry.servingWeightG);
  const macros = foodService.computeMacrosFromNutrients(entry.nutrientsPer100g, totalGrams);
  return {
    ...entry,
    servingGrams: totalGrams,
    protein_g: macros.protein_g,
    carbs_g: macros.carbs_g,
    fat_g: macros.fat_g,
    calories: macros.calories,
  };
}

export const [DailyLogProvider, useDailyLog] = createSafeContextHook(() => {
  const queryClient = useQueryClient();
  const [logs, setLogs] = useState<StoredLogs>({});
  const [today, setToday] = useState(getTodayDateKey());

  const logsQuery = useQuery({
    queryKey: ['food_logs'],
    queryFn: async () => {
      let stored = await loadData<StoredLogs>(STORAGE_KEYS.DAILY_LOGS);
      if (!stored) {
        const legacy = await loadData<StoredLogs>('abz_food_logs');
        if (legacy) {
          stored = legacy;
          await saveData(STORAGE_KEYS.DAILY_LOGS, stored);
          await removeData('abz_food_logs');
        }
      }
      const migrated = migrateLogs(stored ?? {});
      const normalized: StoredLogs = {};
      for (const [date, entries] of Object.entries(migrated)) {
        normalized[date] = entries.map(ensureEntryMacros);
      }
      return normalized;
    },
  });

  useEffect(() => {
    if (logsQuery.data) {
      setLogs(logsQuery.data);
    }
  }, [logsQuery.data]);

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

  const saveMutation = useMutation({
    mutationFn: async (updated: StoredLogs) => {
      await saveData(STORAGE_KEYS.DAILY_LOGS, updated);
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['food_logs'], data);
    },
  });

  const addEntries = useCallback(
    (entries: FoodEntry[], dateKey?: string) => {
      if (entries.length === 0) return;
      const targetDate = dateKey ?? today;
      setLogs((current) => {
        const updated = { ...current };
        if (!updated[targetDate]) {
          updated[targetDate] = [];
        }
        updated[targetDate] = [...updated[targetDate], ...entries];
        saveMutation.mutate(updated);
        return updated;
      });
    },
    [today, saveMutation]
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
      const updated = { ...logs };
      if (updated[targetDate]) {
        updated[targetDate] = updated[targetDate].filter((e) => e.id !== entryId);
        setLogs(updated);
        saveMutation.mutate(updated);
      }
    },
    [logs, today, saveMutation]
  );

  const updateEntry = useCallback(
    (entryId: string, updates: Partial<FoodEntry>, dateKey?: string) => {
      const targetDate = dateKey ?? today;
      const updated = { ...logs };
      if (updated[targetDate]) {
        const idx = updated[targetDate].findIndex((e) => e.id === entryId);
        if (idx !== -1) {
          updated[targetDate] = [...updated[targetDate]];
          let merged = { ...updated[targetDate][idx], ...updates };
          if (!merged.isCustomMacros && merged.nutrientsPer100g) {
            merged = ensureEntryMacros(merged);
          }
          updated[targetDate][idx] = merged;
          setLogs(updated);
          saveMutation.mutate(updated);
        }
      }
    },
    [logs, today, saveMutation]
  );

  const clearToday = useCallback(() => {
    const updated = { ...logs };
    delete updated[today];
    setLogs(updated);
    saveMutation.mutate(updated);
  }, [logs, today, saveMutation]);

  const clearAll = useCallback(async () => {
    await removeData(STORAGE_KEYS.DAILY_LOGS);
    setLogs({});
    queryClient.setQueryData(['food_logs'], {});
  }, [queryClient]);

  const todayEntries = useMemo(() => {
    return logs[today] ?? [];
  }, [logs, today]);

  const todayTotals: MacroTargets = useMemo(() => {
    return todayEntries.reduce(
      (acc, entry) => ({
        calories: acc.calories + entry.calories,
        protein_g: acc.protein_g + entry.protein_g,
        carbs_g: acc.carbs_g + entry.carbs_g,
        fat_g: acc.fat_g + entry.fat_g,
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );
  }, [todayEntries]);

  const getEntriesForDate = useCallback(
    (date: string): FoodEntry[] => {
      return logs[date] ?? [];
    },
    [logs]
  );

  const getTotalsForDate = useCallback(
    (date: string): MacroTargets => {
      const entries = logs[date] ?? [];
      return entries.reduce(
        (acc, entry) => ({
          calories: acc.calories + entry.calories,
          protein_g: acc.protein_g + entry.protein_g,
          carbs_g: acc.carbs_g + entry.carbs_g,
          fat_g: acc.fat_g + entry.fat_g,
        }),
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
      );
    },
    [logs]
  );

  const getDatesWithEntries = useCallback((): string[] => {
    return Object.keys(logs).filter((date) => logs[date].length > 0).sort().reverse();
  }, [logs]);

  const ensureDayExists = useCallback(
    (dateKey: string): StoredLogs => {
      const updated = { ...logs };
      if (!updated[dateKey]) {
        updated[dateKey] = [];
        setLogs(updated);
        saveMutation.mutate(updated);
      }
      return updated;
    },
    [logs, saveMutation]
  );

  const clearDay = useCallback(
    (dateKey: string) => {
      const updated = { ...logs };
      const entries = updated[dateKey] ?? [];
      if (entries.length > 0) {
        if (__DEV__) {
          console.warn('[DailyLog] clearDay: day has entries, refusing to clear');
        }
        return;
      }
      delete updated[dateKey];
      setLogs(updated);
      saveMutation.mutate(updated);
    },
    [logs, saveMutation]
  );

  const getStreak = useCallback((): number => {
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = toDateKey(d);
      const entries = logs[dateStr] ?? [];
      if (entries.length > 0) {
        streak++;
      } else if (i > 0) {
        break;
      }
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }, [logs]);

  return {
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
    isLoading: logsQuery.isLoading,
  };
}, 'useDailyLog', 'DailyLogProvider');
