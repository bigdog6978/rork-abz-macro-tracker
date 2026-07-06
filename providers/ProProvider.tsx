import { createSafeContextHook } from '../utils/createSafeContextHook';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { subscribePhysiqWatch } from 'physiq-watch-connectivity';
import { useUser } from './UserProvider';
import {
  appendAthleteCycleLog,
  clearAthleteCycleData,
  clearProDynamicTargets,
  deriveAthleteCycleState,
  getAthleteCycleLogs,
  getAthleteCycleProfile,
  getAthleteProfile,
  getLatestProHealthSignals,
  getProHydrationLog,
  getProSettings,
  saveAthleteCycleLogs,
  saveAthleteCycleProfile,
  saveAthleteProfile,
  saveLatestProHealthSignals,
  saveProDynamicTargets,
  saveProHydrationLog,
  saveProSettings,
} from '../storage/proRepo';
import {
  AthleteCycleLogEntry,
  AthleteCycleProfile,
  AthleteProfile,
  HealthConnectionStatus,
  HydrationUnit,
  ProEntitlementState,
  ProHealthSignals,
  ProHydrationLog,
  ProSettings,
} from '../features/pro/types';
import { defaultHydrationUnit } from '../utils/hydration';
import {
  applyAthleteAdjustments,
  applyProAdjustments,
  getAthleteHydrationTargetMl,
  getHydrationTargetMl,
} from '../features/pro/proMacroEngine';
import { getTodayDateKey } from '../utils/dateKey';
import { isHealthKitAvailable, readTodayHealthSignals, requestHealthKitPermissions } from '../services/healthkit';
import { setSoundEffectsEnabled } from '../utils/interactionFeedback';

const defaultHydration: ProHydrationLog = {
  dateKey: '',
  consumedMl: 0,
  targetMl: 2400,
  lastUpdatedAt: '',
};

const defaultAthleteProfile: AthleteProfile = {
  enabled: false,
  persona: 'general',
  userType: 'performance_intermediate',
  sport: 'Soccer',
  sports: [],
  activities: [],
  season: { phase: 'in_season' },
  schedule: [],
};

const defaultProSettings: ProSettings = {
  dynamicMacrosEnabled: true,
  hydrationEnabled: true,
  healthIntegrationEnabled: false,
  electrolyteNudgesEnabled: false,
  healthPermissionStatus: 'not_connected',
  healthEducationDismissed: false,
  soundEffectsEnabled: true,
};

const emptyCycleLogs: AthleteCycleLogEntry[] = [];

const defaultCycleProfile: AthleteCycleProfile = {
  enabled: false,
  trackingMode: 'manual',
  symptomTrackingEnabled: true,
  notesEnabled: true,
  allowCoachExportCycleSummary: false,
  allowCycleDataInExports: false,
};

export const [ProProvider, usePro] = createSafeContextHook(() => {
  const queryClient = useQueryClient();
  const { macros: baseMacros, profile } = useUser();

  const settingsQuery = useQuery({ queryKey: ['pro_settings'], queryFn: getProSettings });
  const healthQuery = useQuery({ queryKey: ['pro_health_signals'], queryFn: getLatestProHealthSignals });
  const hydrationQuery = useQuery({ queryKey: ['pro_hydration_log'], queryFn: getProHydrationLog });
  const athleteProfileQuery = useQuery({ queryKey: ['athlete_profile'], queryFn: getAthleteProfile });
  const athleteCycleProfileQuery = useQuery({ queryKey: ['athlete_cycle_profile'], queryFn: getAthleteCycleProfile });
  const athleteCycleLogsQuery = useQuery({ queryKey: ['athlete_cycle_logs'], queryFn: getAthleteCycleLogs });

  const entitlement: ProEntitlementState = 'unlocked';
  const hasPremium = true;
  const settings = settingsQuery.data ?? defaultProSettings;
  const athleteProfile = athleteProfileQuery.data ?? defaultAthleteProfile;
  const cycleProfile = athleteCycleProfileQuery.data ?? defaultCycleProfile;
  const cycleLogs = athleteCycleLogsQuery.data ?? emptyCycleLogs;
  const cycleDerived = useMemo(() => deriveAthleteCycleState(cycleProfile, cycleLogs), [cycleProfile, cycleLogs]);
  const healthSignals = healthQuery.data ?? null;
  const healthAvailabilityQuery = useQuery({
    queryKey: ['healthkit_available'],
    queryFn: isHealthKitAvailable,
  });
  const healthKitAvailable = healthAvailabilityQuery.data ?? false;
  const healthKitAvailabilityReady = healthAvailabilityQuery.isFetched;
  const healthConnectionStatus: HealthConnectionStatus = !healthKitAvailable
    ? 'not_available'
    : settings.healthIntegrationEnabled
      ? 'connected'
      : (settings.healthPermissionStatus ?? 'not_connected');

  const dynamic = useMemo(() => {
    if (!settings.dynamicMacrosEnabled) {
      return {
        targets: baseMacros,
        reason: 'Core macro targets active.',
        inferredDayType: 'rest_day' as const,
        tierApplied: 'core' as const,
        explainability: ['Dynamic layer disabled'],
        adjustmentConfidence: 'high' as const,
        fuelingStrategy: 'Base fueling only.',
      };
    }
    const proAdjusted = applyProAdjustments(baseMacros, healthSignals, settings.dayTypeOverride);
    if (!athleteProfile.enabled) return { ...proAdjusted, tierApplied: 'pro' as const };
    return applyAthleteAdjustments(
      baseMacros,
      proAdjusted,
      athleteProfile,
      cycleProfile.enabled ? cycleDerived : null
    );
  }, [
    settings.dynamicMacrosEnabled,
    settings.dayTypeOverride,
    baseMacros,
    healthSignals,
    athleteProfile,
    cycleProfile.enabled,
    cycleDerived,
  ]);

  const hydrationUnit: HydrationUnit =
    settings.hydrationUnit ?? defaultHydrationUnit(profile.measurementSystem);

  const hydration = useMemo(() => {
    const base = hydrationQuery.data ?? defaultHydration;
    const target = settings.hydrationEnabled
      ? athleteProfile.enabled
        ? getAthleteHydrationTargetMl(
            dynamic.targets,
            healthSignals,
            athleteProfile,
            cycleProfile.enabled ? cycleDerived : null
          )
        : getHydrationTargetMl(dynamic.targets, healthSignals)
      : 2400;
    const today = getTodayDateKey();
    if (base.dateKey !== today) {
      return { ...base, dateKey: today, consumedMl: 0, targetMl: target };
    }
    return { ...base, targetMl: target };
  }, [
    hydrationQuery.data,
    settings.hydrationEnabled,
    athleteProfile,
    dynamic.targets,
    healthSignals,
    cycleProfile.enabled,
    cycleDerived,
  ]);

  const settingsMutation = useMutation({
    mutationFn: async (next: ProSettings) => {
      await saveProSettings(next);
    },
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: ['pro_settings'] });
      const previous = queryClient.getQueryData<ProSettings>(['pro_settings']);
      queryClient.setQueryData(['pro_settings'], next);
      return { previous };
    },
    onError: (_err, _next, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['pro_settings'], context.previous);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pro_settings'] }),
  });
  const healthMutation = useMutation({
    mutationFn: async (next: ProHealthSignals) => {
      await saveLatestProHealthSignals(next);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pro_health_signals'] }),
  });
  const hydrationMutation = useMutation({
    mutationFn: async (next: ProHydrationLog) => {
      await saveProHydrationLog(next);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pro_hydration_log'] }),
  });

  const updateSettings = useCallback(
    (next: Partial<ProSettings>) => {
      settingsMutation.mutate({ ...settings, ...next });
    },
    [settings, settingsMutation]
  );

  useEffect(() => {
    setSoundEffectsEnabled(settings.soundEffectsEnabled !== false);
  }, [settings.soundEffectsEnabled]);

  const refreshHealthSignals = useCallback(async () => {
    if (!settings.healthIntegrationEnabled) return;
    const live = await readTodayHealthSignals();
    if (live) {
      await saveLatestProHealthSignals(live);
      queryClient.setQueryData(['pro_health_signals'], live);
    }
  }, [queryClient, settings.healthIntegrationEnabled]);

  const addHydration = useCallback(
    (ml: number) => {
      const next: ProHydrationLog = {
        ...hydration,
        consumedMl: Math.max(0, hydration.consumedMl + ml),
        lastUpdatedAt: new Date().toISOString(),
      };
      hydrationMutation.mutate(next);
    },
    [hydration, hydrationMutation]
  );

  const syncDynamicTargets = useCallback(async () => {
    if (settings.dynamicMacrosEnabled) {
      await saveProDynamicTargets(dynamic.targets);
      queryClient.setQueryData(['pro_dynamic_targets'], dynamic.targets);
    } else {
      await clearProDynamicTargets();
      queryClient.setQueryData(['pro_dynamic_targets'], null);
    }
  }, [dynamic.targets, queryClient, settings.dynamicMacrosEnabled]);

  useEffect(() => {
    void syncDynamicTargets();
  }, [syncDynamicTargets]);

  useEffect(() => {
    const sub = subscribePhysiqWatch('onWatchPayload', (body) => {
      const payload = (body.payload as Record<string, string> | undefined) ?? {};
      switch (payload.action) {
        case 'hydration_ack':
          addHydration(250);
          break;
        case 'log_water': {
          const ml = Number.parseInt(payload.ml ?? '', 10);
          if (Number.isFinite(ml) && ml !== 0) addHydration(ml);
          break;
        }
        case 'set_day_type': {
          const next = payload.dayType;
          if (next === 'auto' || next === 'training' || next === 'competition' || next === 'rest') {
            if (__DEV__) {
              console.log('[ProProvider] watch set_day_type', {
                incoming: next,
                previous: settings.dayTypeOverride ?? 'auto',
              });
            }
            updateSettings({ dayTypeOverride: next });
          }
          break;
        }
        default:
          break;
      }
    });
    return () => sub?.remove();
  }, [addHydration, updateSettings, settings.dayTypeOverride]);

  const enableHealthIntegration = useCallback(async (): Promise<boolean> => {
    try {
      const available = await isHealthKitAvailable();
      if (!available) {
        const next: ProSettings = {
          ...settings,
          healthIntegrationEnabled: false,
          healthPermissionStatus: 'not_available',
        };
        await saveProSettings(next);
        queryClient.setQueryData(['pro_settings'], next);
        return false;
      }

      const permission = await requestHealthKitPermissions();
      if (!permission.ok) {
        const next: ProSettings = {
          ...settings,
          healthIntegrationEnabled: false,
          healthPermissionStatus:
            permission.reason === 'denied' ? 'denied_or_restricted' : 'not_connected',
        };
        await saveProSettings(next);
        queryClient.setQueryData(['pro_settings'], next);
        return false;
      }

      const connected: ProSettings = {
        ...settings,
        healthIntegrationEnabled: true,
        healthPermissionStatus: 'connected',
      };
      await saveProSettings(connected);
      queryClient.setQueryData(['pro_settings'], connected);

      const live = await readTodayHealthSignals();
      if (live) {
        await saveLatestProHealthSignals(live);
        queryClient.setQueryData(['pro_health_signals'], live);
      }
      return true;
    } catch (error) {
      console.warn('[HealthKit] enableHealthIntegration failed', error);
      return false;
    }
  }, [queryClient, settings]);

  const disableHealthIntegration = useCallback(() => {
    settingsMutation.mutate({
      ...settings,
      healthIntegrationEnabled: false,
      healthPermissionStatus: healthKitAvailable ? 'not_connected' : 'not_available',
    });
  }, [healthKitAvailable, settings, settingsMutation]);

  const updateAthleteProfile = useCallback(
    async (next: Partial<AthleteProfile>) => {
      const merged = { ...athleteProfile, ...next };
      await saveAthleteProfile(merged);
      await queryClient.invalidateQueries({ queryKey: ['athlete_profile'] });
    },
    [athleteProfile, queryClient]
  );

  const updateCycleProfile = useCallback(
    async (next: Partial<AthleteCycleProfile>) => {
      const merged = { ...cycleProfile, ...next };
      await saveAthleteCycleProfile(merged);
      await queryClient.invalidateQueries({ queryKey: ['athlete_cycle_profile'] });
    },
    [cycleProfile, queryClient]
  );

  const addCycleLog = useCallback(
    async (entry: AthleteCycleLogEntry) => {
      await appendAthleteCycleLog(entry);
      await queryClient.invalidateQueries({ queryKey: ['athlete_cycle_logs'] });
    },
    [queryClient]
  );

  const clearCycleData = useCallback(async () => {
    await clearAthleteCycleData();
    await saveAthleteCycleLogs([]);
    await queryClient.invalidateQueries({ queryKey: ['athlete_cycle_profile'] });
    await queryClient.invalidateQueries({ queryKey: ['athlete_cycle_logs'] });
  }, [queryClient]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void queryClient.invalidateQueries({ queryKey: ['pro_settings'] });
      if (settings.healthIntegrationEnabled) {
        void refreshHealthSignals();
      }
    });
    return () => sub.remove();
  }, [queryClient, refreshHealthSignals, settings.healthIntegrationEnabled]);

  // Stable context value so consumers only re-render on actual data changes.
  return useMemo(
    () => ({
      entitlement,
      hasPremium,
      settings,
      healthKitAvailable,
      healthKitAvailabilityReady,
      healthConnectionStatus,
      healthSignals,
      athleteProfile,
      cycleProfile,
      cycleLogs,
      cycleDerived,
      dynamicTargets: dynamic.targets,
      dynamicReason: dynamic.reason,
      dynamicExplainability: dynamic.explainability ?? [],
      adjustmentConfidence: dynamic.adjustmentConfidence ?? 'medium',
      fuelingStrategy: dynamic.fuelingStrategy ?? '',
      inferredDayType: dynamic.inferredDayType,
      hydration,
      hydrationUnit,
      updateSettings,
      enableHealthIntegration,
      disableHealthIntegration,
      refreshHealthSignals,
      addHydration,
      syncDynamicTargets,
      updateAthleteProfile,
      updateCycleProfile,
      addCycleLog,
      clearCycleData,
    }),
    [
      settings,
      healthKitAvailable,
      healthKitAvailabilityReady,
      healthConnectionStatus,
      healthSignals,
      athleteProfile,
      cycleProfile,
      cycleLogs,
      cycleDerived,
      dynamic,
      hydration,
      hydrationUnit,
      updateSettings,
      enableHealthIntegration,
      disableHealthIntegration,
      refreshHealthSignals,
      addHydration,
      syncDynamicTargets,
      updateAthleteProfile,
      updateCycleProfile,
      addCycleLog,
      clearCycleData,
      // entitlement/hasPremium are render-scope constants
      entitlement,
      hasPremium,
    ]
  );
}, 'usePro', 'ProProvider');
