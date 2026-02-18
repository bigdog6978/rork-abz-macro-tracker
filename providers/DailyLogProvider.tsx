import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { FoodEntry, MacroTargets } from '../types';
import { getTodayDateString } from '../utils/macroEngine';

const LOGS_KEY = 'abz_food_logs';
const STREAK_KEY = 'abz_streak';

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
      const stored = await AsyncStorage.getItem(LOGS_KEY);
      if (stored) {
        return JSON.parse(stored) as StoredLogs;
      }
      return {} as StoredLogs;
    },
  });

  useEffect(() => {
    if (logsQuery.data) {
      setLogs(logsQuery.data);
    }
  }, [logsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (updated: StoredLogs) => {
      await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(updated));
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

  const clearToday = useCallback(() => {
    const updated = { ...logs };
    delete updated[today];
    setLogs(updated);
    saveMutation.mutate(updated);
  }, [logs, today, saveMutation]);

  const clearAll = useCallback(async () => {
    await AsyncStorage.removeItem(LOGS_KEY);
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
    clearToday,
    clearAll,
    getEntriesForDate,
    getTotalsForDate,
    getDatesWithEntries,
    getStreak,
    isLoading: logsQuery.isLoading,
  };
});
