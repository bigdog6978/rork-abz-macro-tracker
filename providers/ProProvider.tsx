import createContextHook from '@nkzw/create-context-hook';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { sendProSnapshotToWatch, subscribePhysiqWatch } from 'physiq-watch-connectivity';
import { useUser } from './UserProvider';
import {
  clearProDynamicTargets,
  getLatestProHealthSignals,
  getProDynamicTargets,
  getProEntitlement,
  getProHydrationLog,
  getProSettings,
  saveLatestProHealthSignals,
  saveProDynamicTargets,
  saveProHydrationLog,
  saveProSettings,
  setProEntitlement,
} from '../storage/proRepo';
import {
  HealthConnectionStatus,
  ProEntitlementState,
  ProHealthSignals,
  ProHydrationLog,
  ProSettings,
} from '../features/pro/types';
import { applyProAdjustments, getHydrationTargetMl } from '../features/pro/proMacroEngine';
import { getTodayDateKey } from '../utils/dateKey';
import {
  isHealthKitAvailable,
  readTodayHealthSignals,
  requestHealthKitPermissions,
} from '../services/healthkit';

const defaultHydration: ProHydrationLog = {
  dateKey: '',
  consumedMl: 0,
  targetMl: 2400,
  lastUpdatedAt: '',
};

export const [ProProvider, usePro] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { macros } = useUser();
  const [postProHealthEducationPending, setPostProHealthEducationPending] = useState(false);

  const entitlementQuery = useQuery({
    queryKey: ['pro_entitlement'],
    queryFn: getProEntitlement,
  });
  const settingsQuery = useQuery({
    queryKey: ['pro_settings'],
    queryFn: getProSettings,
  });
  const healthQuery = useQuery({
    queryKey: ['pro_health_signals'],
    queryFn: getLatestProHealthSignals,
  });
  const hydrationQuery = useQuery({
    queryKey: ['pro_hydration_log'],
    queryFn: getProHydrationLog,
  });

  const entitlement = entitlementQuery.data ?? 'core_active';
  const settings: ProSettings = settingsQuery.data ?? {
    dynamicMacrosEnabled: true,
    hydrationEnabled: true,
    healthIntegrationEnabled: false,
    electrolyteNudgesEnabled: false,
    healthPermissionStatus: 'not_connected',
  };
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

  const hasProAccess = entitlement === 'pro_trial_active' || entitlement === 'pro_subscriber_active';

  const dynamic = useMemo(() => {
    if (!hasProAccess || !settings.dynamicMacrosEnabled) {
      return {
        targets: macros,
        reason: 'Core macro targets active.',
        inferredDayType: 'rest_day' as const,
      };
    }
    return applyProAdjustments(macros, healthSignals);
  }, [hasProAccess, settings.dynamicMacrosEnabled, macros, healthSignals]);

  const hydration = useMemo(() => {
    const base = hydrationQuery.data ?? defaultHydration;
    const target = hasProAccess && settings.hydrationEnabled
      ? getHydrationTargetMl(dynamic.targets, healthSignals)
      : 2400;
    const today = getTodayDateKey();
    if (base.dateKey !== today) {
      return { ...base, dateKey: today, consumedMl: 0, targetMl: target };
    }
    return { ...base, targetMl: target };
  }, [dynamic.targets, hasProAccess, healthSignals, hydrationQuery.data, settings.hydrationEnabled]);

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
      const wasPro = entitlement === 'pro_trial_active' || entitlement === 'pro_subscriber_active';
      const willBePro = state === 'pro_trial_active' || state === 'pro_subscriber_active';
      if (Platform.OS === 'ios' && willBePro && !wasPro) {
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
    if (hasProAccess && settings.dynamicMacrosEnabled) {
      await saveProDynamicTargets(dynamic.targets);
      queryClient.setQueryData(['pro_dynamic_targets'], dynamic.targets);
    } else {
      await clearProDynamicTargets();
      queryClient.setQueryData(['pro_dynamic_targets'], null);
    }
  }, [dynamic.targets, hasProAccess, queryClient, settings.dynamicMacrosEnabled]);

  useEffect(() => {
    void syncDynamicTargets();
  }, [syncDynamicTargets]);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !hasProAccess) return;
    const sub = subscribePhysiqWatch('onWatchPayload', (body) => {
      const payload = (body.payload as Record<string, string> | undefined) ?? {};
      if (payload.action === 'hydration_ack') {
        addHydration(250);
      }
    });
    return () => sub?.remove();
  }, [hasProAccess, addHydration]);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !hasProAccess) return;
    const t = dynamic.targets;
    void sendProSnapshotToWatch({
      calories: String(Math.round(t.calories)),
      protein: String(Math.round(t.protein_g)),
      carbs: String(Math.round(t.carbs_g)),
      fat: String(Math.round(t.fat_g)),
      hydration: `${Math.round(hydration.consumedMl)}/${Math.round(hydration.targetMl)} ml`,
      updatedAt: new Date().toISOString(),
    });
  }, [
    hasProAccess,
    dynamic.targets.calories,
    dynamic.targets.protein_g,
    dynamic.targets.carbs_g,
    dynamic.targets.fat_g,
    hydration.consumedMl,
    hydration.targetMl,
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

  return {
    entitlement,
    hasProAccess,
    settings,
    healthKitAvailable,
    healthKitAvailabilityReady,
    healthConnectionStatus,
    healthSignals,
    dynamicTargets: dynamic.targets,
    dynamicReason: dynamic.reason,
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
  };
});

