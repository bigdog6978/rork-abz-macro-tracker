import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useUser } from './UserProvider';
import { useMeasurements } from './MeasurementsProvider';
import {
  getGoalSettings as repoGet,
  saveGoalSettings as repoSave,
} from '../storage/goalSettingsRepo';
import {
  GoalSettings,
  GoalTarget,
  GoalTargetMetric,
  GoalTargetDirection,
} from '../features/progress/goalTargetTypes';
import { getTodayDateKey } from '../utils/dateKey';

const QUERY_KEY = ['goal_settings'];

export const [GoalSettingsProvider, useGoalSettings] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { profile } = useUser();
  const { latest } = useMeasurements();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: repoGet,
  });

  const settings: GoalSettings | null = query.data ?? null;
  const goalType = settings?.goalType ?? profile.goal;

  const saveMutation = useMutation({
    mutationFn: repoSave,
    onSuccess: (_, variables) => {
      queryClient.setQueryData(QUERY_KEY, variables);
    },
  });

  const saveGoalSettings = useCallback(
    (updates: Partial<GoalSettings>) => {
      const current = settings ?? {
        goalType: profile.goal,
        updatedAt: Date.now(),
      };
      const next: GoalSettings = {
        ...current,
        ...updates,
        goalType: updates.goalType ?? current.goalType,
      };
      saveMutation.mutate(next);
    },
    [settings, profile.goal, saveMutation]
  );

  const setTarget = useCallback(
    (target: GoalTarget) => {
      saveGoalSettings({ target });
    },
    [saveGoalSettings]
  );

  const clearTarget = useCallback(() => {
    saveGoalSettings({ target: undefined });
  }, [saveGoalSettings]);

  const syncGoalFromProfile = useCallback(() => {
    if (settings?.goalType !== profile.goal) {
      saveGoalSettings({ goalType: profile.goal });
    }
  }, [settings?.goalType, profile.goal, saveGoalSettings]);

  return {
    settings,
    goalType,
    target: settings?.target,
    latestMeasurement: latest,
    saveGoalSettings,
    setTarget,
    clearTarget,
    syncGoalFromProfile,
    isLoading: query.isLoading,
  };
});
