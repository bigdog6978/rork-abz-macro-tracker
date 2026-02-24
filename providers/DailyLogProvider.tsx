import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { FoodEntry, MacroTargets } from '../types';
import { getTodayDateString } from '../utils/macroEngine';
import { loadData, saveData, removeData, STORAGE_KEYS } from '../services/storage';

interface StoredLogs {
  [date: string]: FoodEntry[];
}

export const [DailyLogProvider, useDailyLog] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [logs, setLogs] = useState<StoredLogs>({});
  const today = getTodayDateString();

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
      return stored ?? {};
    },
  });

  useEffect(() => {
    if (logsQuery.data) {
      setLogs(logsQuery.data);
    }
  }, [logsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (updated: StoredLogs) => {
      await saveData(STORAGE_KEYS.DAILY_LOGS, updated);
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['food_logs'], data);
    },
  });

  const addEntry = useCallback(
    (entry: FoodEntry) => {
      const updated = { ...logs };
      if (!updated[today]) {
        updated[today] = [];
      }
      updated[today] = [...updated[today], entry];
      setLogs(updated);
      saveMutation.mutate(updated);
    },
    [logs, today, saveMutation]
  );

  const removeEntry = useCallback(
    (entryId: string) => {
      const updated = { ...logs };
      if (updated[today]) {
        updated[today] = updated[today].filter((e) => e.id !== entryId);
        setLogs(updated);
        saveMutation.mutate(updated);
      }
    },
    [logs, today, saveMutation]
  );

  const updateEntry = useCallback(
    (entryId: string, updates: Partial<FoodEntry>) => {
      const updated = { ...logs };
      if (updated[today]) {
        const idx = updated[today].findIndex((e) => e.id === entryId);
        if (idx !== -1) {
          updated[today] = [...updated[today]];
          updated[today][idx] = { ...updated[today][idx], ...updates };
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

  const getStreak = useCallback((): number => {
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 365; i++) {
      const dateStr = d.toISOString().split('T')[0];
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
    removeEntry,
    updateEntry,
    clearToday,
    clearAll,
    getEntriesForDate,
    getTotalsForDate,
    getDatesWithEntries,
    getStreak,
    isLoading: logsQuery.isLoading,
  };
});
