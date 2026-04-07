import createContextHook from '@nkzw/create-context-hook';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { sendProSnapshotToWatch, subscribePhysiqWatch } from 'physiq-watch-connectivity';
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
  getProEntitlement,
  getProHydrationLog,
  getProSettings,
  saveAthleteCycleLogs,
  saveAthleteCycleProfile,
  saveAthleteProfile,
  saveLatestProHealthSignals,
  saveProDynamicTargets,
  saveProHydrationLog,
  saveProSettings,
  setProEntitlement,
} from '../storage/proRepo';
import {
  AthleteCycleLogEntry,
  AthleteCycleProfile,
  AthleteProfile,
  HealthConnectionStatus,
  ProEntitlementState,
  ProHealthSignals,
  ProHydrationLog,
  ProSettings,
} from '../features/pro/types';
import {
  applyAthleteAdjustments,
  applyProAdjustments,
  getAthleteHydrationTargetMl,
  getHydrationTargetMl,
} from '../features/pro/proMacroEngine';
import { getTodayDateKey } from '../utils/dateKey';
import { isHealthKitAvailable, readTodayHealthSignals, requestHealthKitPermissions } from '../services/healthkit';

const defaultHydration: ProHydrationLog = {
  dateKey: '',
  consumedMl: 0,
  targetMl: 2400,
  lastUpdatedAt: '',
};

const defaultAthleteProfile: AthleteProfile = {
  enabled: false,
  userType: 'performance_intermediate',
  sport: 'Soccer',
  season: { phase: 'in_season' },
  schedule: [],
};

const defaultCycleProfile: AthleteCycleProfile = {
  enabled: false,
  trackingMode: 'manual',
  symptomTrackingEnabled: true,
  notesEnabled: true,
  allowCoachExportCycleSummary: false,
  allowCycleDataInExports: false,
};

export const [ProProvider, usePro] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { macros } = useUser();
  const [postProHealthEducationPending, setPostProHealthEducationPending] = useState(false);

  const entitlementQuery = useQuery({ queryKey: ['pro_entitlement'], queryFn: getProEntitlement });
  const settingsQuery = useQuery({ queryKey: ['pro_settings'], queryFn: getProSettings });
  const healthQuery = useQuery({ queryKey: ['pro_health_signals'], queryFn: getLatestProHealthSignals });
  const hydrationQuery = useQuery({ queryKey: ['pro_hydration_log'], queryFn: getProHydrationLog });
  const athleteProfileQuery = useQuery({ queryKey: ['athlete_profile'], queryFn: getAthleteProfile });
  const athleteCycleProfileQuery = useQuery({ queryKey: ['athlete_cycle_profile'], queryFn: getAthleteCycleProfile });
  const athleteCycleLogsQuery = useQuery({ queryKey: ['athlete_cycle_logs'], queryFn: getAthleteCycleLogs });

  const entitlement = entitlementQuery.data ?? 'core_active';
  const settings = settingsQuery.data ?? {
    dynamicMacrosEnabled: true,
    hydrationEnabled: true,
    healthIntegrationEnabled: false,
    electrolyteNudgesEnabled: false,
    healthPermissionStatus: 'not_connected',
  };
  const athleteProfile = athleteProfileQuery.data ?? defaultAthleteProfile;
  const cycleProfile = athleteCycleProfileQuery.data ?? defaultCycleProfile;
  const cycleLogs = athleteCycleLogsQuery.data ?? [];
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

  const hasProAccess =
    entitlement === 'pro_trial_active' || entitlement === 'pro_subscriber_active';
  const hasAthleteAccess =
    entitlement === 'athlete_trial_active' || entitlement === 'athlete_subscriber_active';
  const hasAnyPremium = hasProAccess || hasAthleteAccess;
  const tierLabel = hasAthleteAccess ? 'athlete' : hasProAccess ? 'pro' : 'core';

  const dynamic = useMemo(() => {
    if (!hasAnyPremium || !settings.dynamicMacrosEnabled) {
      return {
        targets: macros,
        reason: 'Core macro targets active.',
        inferredDayType: 'rest_day' as const,
        tierApplied: 'core' as const,
        explainability: ['Dynamic layer disabled'],
        adjustmentConfidence: 'high' as const,
        fuelingStrategy: 'Base fueling only.',
      };
    }
    const proAdjusted = applyProAdjustments(macros, healthSignals);
    if (!hasAthleteAccess || !athleteProfile.enabled) return { ...proAdjusted, tierApplied: 'pro' as const };
    return applyAthleteAdjustments(
      macros,
      proAdjusted,
      athleteProfile,
      cycleProfile.enabled ? cycleDerived : null
    );
  }, [hasAnyPremium, settings.dynamicMacrosEnabled, macros, healthSignals, hasAthleteAccess, athleteProfile, cycleProfile.enabled, cycleDerived]);

  const hydration = useMemo(() => {
    const base = hydrationQuery.data ?? defaultHydration;
    const target = hasAnyPremium && settings.hydrationEnabled
      ? hasAthleteAccess && athleteProfile.enabled
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
    hasAnyPremium,
    settings.hydrationEnabled,
    hasAthleteAccess,
    athleteProfile,
    dynamic.targets,
    healthSignals,
    cycleProfile.enabled,
    cycleDerived,
  ]);

  const entitlementMutation = useMutation({
    mutationFn: async (state: ProEntitlementState) => {
      await setProEntitlement(state);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pro_entitlement'] }),
  });
  const settingsMutation = useMutation({
    mutationFn: async (next: ProSettings) => {
      await saveProSettings(next);
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

  const setEntitlement = useCallback(
    (state: ProEntitlementState) => {
      const wasPremium =
        entitlement === 'pro_trial_active' ||
        entitlement === 'pro_subscriber_active' ||
        entitlement === 'athlete_trial_active' ||
        entitlement === 'athlete_subscriber_active';
      const willBePremium =
        state === 'pro_trial_active' ||
        state === 'pro_subscriber_active' ||
        state === 'athlete_trial_active' ||
        state === 'athlete_subscriber_active';
      if (Platform.OS === 'ios' && willBePremium && !wasPremium) {
        setPostProHealthEducationPending(true);
      }
      entitlementMutation.mutate(state);
    },
    [entitlement, entitlementMutation]
  );

  const clearPostProHealthEducation = useCallback(() => {
    setPostProHealthEducationPending(false);
  }, []);

  const refreshHealthSignals = useCallback(async () => {
    if (!settings.healthIntegrationEnabled) return;
    const live = await readTodayHealthSignals();
    if (live) {
      healthMutation.mutate(live);
    }
  }, [healthMutation, settings.healthIntegrationEnabled]);

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
    if (hasAnyPremium && settings.dynamicMacrosEnabled) {
      await saveProDynamicTargets(dynamic.targets);
      queryClient.setQueryData(['pro_dynamic_targets'], dynamic.targets);
    } else {
      await clearProDynamicTargets();
      queryClient.setQueryData(['pro_dynamic_targets'], null);
    }
  }, [dynamic.targets, hasAnyPremium, queryClient, settings.dynamicMacrosEnabled]);

  useEffect(() => {
    void syncDynamicTargets();
  }, [syncDynamicTargets]);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !hasAnyPremium) return;
    const sub = subscribePhysiqWatch('onWatchPayload', (body) => {
      const payload = (body.payload as Record<string, string> | undefined) ?? {};
      if (payload.action === 'hydration_ack') {
        addHydration(250);
      }
    });
    return () => sub?.remove();
  }, [hasAnyPremium, addHydration]);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !hasAnyPremium) return;
    const t = dynamic.targets;
    void sendProSnapshotToWatch({
      calories: String(Math.round(t.calories)),
      protein: String(Math.round(t.protein_g)),
      carbs: String(Math.round(t.carbs_g)),
      fat: String(Math.round(t.fat_g)),
      hydration: `${Math.round(hydration.consumedMl)}/${Math.round(hydration.targetMl)} ml`,
      tier: tierLabel,
      athleteSport: hasAthleteAccess ? athleteProfile.sport : 'N/A',
      updatedAt: new Date().toISOString(),
    });
  }, [
    hasAnyPremium,
    dynamic.targets.calories,
    dynamic.targets.protein_g,
    dynamic.targets.carbs_g,
    dynamic.targets.fat_g,
    hydration.consumedMl,
    hydration.targetMl,
    tierLabel,
    hasAthleteAccess,
    athleteProfile.sport,
  ]);

  const enableHealthIntegration = useCallback(async (): Promise<boolean> => {
    const available = await isHealthKitAvailable();
    if (!available) {
      settingsMutation.mutate({
        ...settings,
        healthIntegrationEnabled: false,
        healthPermissionStatus: 'not_available',
      });
      return false;
    }
    const granted = await requestHealthKitPermissions();
    if (!granted) {
      settingsMutation.mutate({
        ...settings,
        healthIntegrationEnabled: false,
        healthPermissionStatus: 'denied_or_restricted',
      });
      return false;
    }
    settingsMutation.mutate({
      ...settings,
      healthIntegrationEnabled: true,
      healthPermissionStatus: 'connected',
    });
    const live = await readTodayHealthSignals();
    if (live) {
      healthMutation.mutate(live);
    }
    return true;
  }, [healthMutation, settings, settingsMutation]);

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

  return {
    entitlement,
    tierLabel,
    hasProAccess,
    hasAthleteAccess,
    hasAnyPremium,
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
    updateSettings,
    enableHealthIntegration,
    disableHealthIntegration,
    setEntitlement,
    refreshHealthSignals,
    addHydration,
    syncDynamicTargets,
    postProHealthEducationPending,
    clearPostProHealthEducation,
    updateAthleteProfile,
    updateCycleProfile,
    addCycleLog,
    clearCycleData,
  };
});
