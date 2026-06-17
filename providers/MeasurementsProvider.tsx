import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from './UserProvider';
import {
  MeasurementRecord,
  MeasurementPromptSettings,
  PromptCadence,
  GoalScore,
  ProgressTrend,
} from '../features/progress/types';
import {
  upsertMeasurement as repoUpsert,
  getMeasurements as repoGetAll,
  getMeasurementByDateKey as repoGetByDateKey,
  deleteMeasurement as repoDelete,
  getBaselineMeasurement as repoGetBaseline,
  getLatestMeasurement as repoGetLatest,
  getPromptSettings as repoGetPromptSettings,
  setPromptSettings as repoSetPromptSettings,
} from '../storage/measurementsRepo';
import { computeTrends, computeGoalScore, shouldShowPrompt } from '../features/progress/progressScoring';

const USER_ID = 'local_user';

export const [MeasurementsProvider, useMeasurements] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { profile } = useUser();

  const measurementsQuery = useQuery({
    queryKey: ['measurements', USER_ID],
    queryFn: () => repoGetAll(USER_ID),
  });

  const promptSettingsQuery = useQuery({
    queryKey: ['measurement_prompt_settings', USER_ID],
    queryFn: () => repoGetPromptSettings(USER_ID),
  });

  const records = measurementsQuery.data ?? [];
  const promptSettings = promptSettingsQuery.data ?? null;

  const baseline = useMemo(() => {
    const b = records.find((r) => r.isBaseline);
    return b ?? (records.length > 0 ? records[0] : null);
  }, [records]);

  const latest = useMemo(() => {
    return records.length > 0 ? records[records.length - 1] : null;
  }, [records]);

  const hasBaseline = baseline !== null;

  const trends: ProgressTrend[] = useMemo(() => {
    return computeTrends(baseline, latest, profile.goal, profile.sex);
  }, [baseline, latest, profile.goal, profile.sex]);

  const goalScore: GoalScore = useMemo(() => {
    return computeGoalScore(baseline, latest, profile.goal, profile.sex, records.length);
  }, [baseline, latest, profile.goal, profile.sex, records.length]);

  const showPrompt = useMemo(() => {
    return shouldShowPrompt(promptSettings, hasBaseline);
  }, [promptSettings, hasBaseline]);

  const addMeasurementMutation = useMutation({
    mutationFn: async (record: MeasurementRecord) => {
      const existing = await repoGetAll(USER_ID);
      const hasBaseline = existing.some((r) => r.isBaseline);
      const enriched: MeasurementRecord =
        !hasBaseline && existing.length === 0 && !record.isBaseline
          ? { ...record, isBaseline: true }
          : record;
      await repoUpsert(enriched);
      const settings = await repoGetPromptSettings(USER_ID);
      if (settings) {
        await repoSetPromptSettings(USER_ID, {
          ...settings,
          lastRecordedAt: enriched.recordedAt,
          dismissCount: 0,
        });
      }
      return enriched;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements', USER_ID] });
      queryClient.invalidateQueries({ queryKey: ['measurement_prompt_settings', USER_ID] });
      queryClient.refetchQueries({ queryKey: ['measurements', USER_ID] });
    },
  });

  const initPromptSettings = useCallback(async () => {
    const existing = await repoGetPromptSettings(USER_ID);
    if (!existing) {
      const defaults: MeasurementPromptSettings = {
        cadence: 'biweekly',
        dismissCount: 0,
      };
      await repoSetPromptSettings(USER_ID, defaults);
      queryClient.invalidateQueries({ queryKey: ['measurement_prompt_settings', USER_ID] });
    }
  }, [queryClient]);

  const updateCadence = useMutation({
    mutationFn: async (cadence: PromptCadence) => {
      const current = await repoGetPromptSettings(USER_ID);
      const updated: MeasurementPromptSettings = {
        ...(current ?? { dismissCount: 0 }),
        cadence,
      };
      await repoSetPromptSettings(USER_ID, updated);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurement_prompt_settings', USER_ID] });
    },
  });

  const dismissPrompt = useMutation({
    mutationFn: async () => {
      const current = await repoGetPromptSettings(USER_ID);
      if (!current) return;
      const newDismissCount = current.dismissCount + 1;
      let newCadence = current.cadence;
      if (newDismissCount >= 2 && current.cadence === 'biweekly') {
        newCadence = 'monthly';
      }
      const updated: MeasurementPromptSettings = {
        ...current,
        cadence: newCadence,
        lastPromptedAt: new Date().toISOString(),
        dismissCount: newDismissCount,
      };
      await repoSetPromptSettings(USER_ID, updated);
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurement_prompt_settings', USER_ID] });
    },
  });

  const getMeasurementByDateKey = useCallback(
    (dateKey: string) => repoGetByDateKey(USER_ID, dateKey),
    []
  );

  const deleteMeasurementMutation = useMutation({
    mutationFn: (measurementId: string) => repoDelete(measurementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurements', USER_ID] });
      queryClient.refetchQueries({ queryKey: ['measurements', USER_ID] });
    },
  });

  return {
    records,
    baseline,
    latest,
    hasBaseline,
    trends,
    goalScore,
    showPrompt,
    promptSettings,
    isLoading: measurementsQuery.isLoading,
    addMeasurement: addMeasurementMutation.mutate,
    deleteMeasurement: deleteMeasurementMutation.mutate,
    deleteMeasurementAsync: deleteMeasurementMutation.mutateAsync,
    getMeasurementByDateKey,
    isAdding: addMeasurementMutation.isPending,
    initPromptSettings,
    updateCadence: updateCadence.mutate,
    dismissPrompt: dismissPrompt.mutate,
    userId: USER_ID,
  };
});
