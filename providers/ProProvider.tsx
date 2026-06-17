import createContextHook from '@nkzw/create-context-hook';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { subscribePhysiqWatch } from 'physiq-watch-connectivity';
import { useUser } from './UserProvider';
import {
  acknowledgeTrialExpiry as acknowledgeTrialExpiryRepo,
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
  getTrialState,
  saveAthleteCycleLogs,
  saveAthleteCycleProfile,
  saveAthleteProfile,
  saveLatestProHealthSignals,
  saveProDynamicTargets,
  saveProHydrationLog,
  saveProSettings,
  setProEntitlement,
  startTrial as startTrialRepo,
} from '../storage/proRepo';
import { computeTrialStatus, DEFAULT_TRIAL_STATE } from '../features/pro/trial';
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
import {
  getCustomerState,
  getProducts,
  IapProductView,
  purchaseLifetime,
  restorePurchases,
} from '../services/iap';
import { IapCustomerState, LIFETIME_PRODUCT_ID } from '../services/iapMapping';

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

/** When __DEV__ AND EXPO_PUBLIC_DEV_UNLOCK_PREMIUM is 1/true, unlock all premium surfaces. Never in production. */
function isDevUnlockPremium(): boolean {
  if (!__DEV__) return false;
  const raw = Constants.expoConfig?.extra?.EXPO_PUBLIC_DEV_UNLOCK_PREMIUM;
  if (raw === true) return true;
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes';
  }
  return false;
}

function mapIapErrorForDisplay(error: Error | null): string | null {
  if (!error?.message) return null;
  const message = error.message.toLowerCase();
  if (
    message.includes('expo_public_revenuecat') ||
    message.includes('api key') ||
    message.includes('revenuecat')
  ) {
    return 'The store is not available right now. You can continue with the free experience.';
  }
  if (message.includes('product not available')) {
    return 'This purchase is currently unavailable. Please try again in a moment.';
  }
  if (message.includes('cancel')) {
    return 'Purchase was canceled.';
  }
  return 'Unable to complete the purchase right now. Please try again.';
}

export const [ProProvider, usePro] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { macros: baseMacros } = useUser();
  const [postProHealthEducationPending, setPostProHealthEducationPending] = useState(false);

  const entitlementQuery = useQuery({ queryKey: ['pro_entitlement'], queryFn: getProEntitlement });
  const settingsQuery = useQuery({ queryKey: ['pro_settings'], queryFn: getProSettings });
  const healthQuery = useQuery({ queryKey: ['pro_health_signals'], queryFn: getLatestProHealthSignals });
  const hydrationQuery = useQuery({ queryKey: ['pro_hydration_log'], queryFn: getProHydrationLog });
  const athleteProfileQuery = useQuery({ queryKey: ['athlete_profile'], queryFn: getAthleteProfile });
  const athleteCycleProfileQuery = useQuery({ queryKey: ['athlete_cycle_profile'], queryFn: getAthleteCycleProfile });
  const athleteCycleLogsQuery = useQuery({ queryKey: ['athlete_cycle_logs'], queryFn: getAthleteCycleLogs });
  const iapProductsQuery = useQuery({
    queryKey: ['iap_products'],
    queryFn: getProducts,
    enabled: Platform.OS === 'ios',
    staleTime: 1000 * 60 * 5,
  });
  const iapCustomerQuery = useQuery({
    queryKey: ['iap_customer_state'],
    queryFn: getCustomerState,
    enabled: Platform.OS === 'ios',
    staleTime: 1000 * 30,
  });

  const trialQuery = useQuery({ queryKey: ['pro_trial_state'], queryFn: getTrialState });
  const trialState = trialQuery.data ?? DEFAULT_TRIAL_STATE;
  const [trialNow, setTrialNow] = useState(() => Date.now());

  const storedEntitlement = entitlementQuery.data ?? 'core';
  const iapCustomerState = (iapCustomerQuery.data as IapCustomerState | undefined) ?? null;
  const devUnlockPremium = isDevUnlockPremium();
  const entitlementFromSources: ProEntitlementState =
    Platform.OS === 'ios' && iapCustomerState ? iapCustomerState.entitlement : storedEntitlement;
  const entitlement: ProEntitlementState = devUnlockPremium ? 'unlocked' : entitlementFromSources;
  const purchasedPremium = devUnlockPremium || entitlement === 'unlocked';

  const trialStatus = useMemo(
    () => computeTrialStatus(trialState.startedAt, new Date(trialNow)),
    [trialState.startedAt, trialNow]
  );
  // Trial grants the same access as a lifetime unlock while active.
  const hasPremium = purchasedPremium || trialStatus.active;
  // Trial UI flags only matter when the user has not already purchased / dev-unlocked.
  const trialActive = !purchasedPremium && trialStatus.active;
  const trialExpired = !purchasedPremium && trialStatus.started && trialStatus.expired;
  const trialDaysRemaining = trialActive ? trialStatus.daysRemaining : 0;
  const trialEndsAt = trialStatus.endsAt;
  const trialExpiryNeedsAck = trialExpired && !trialState.expiryAcknowledged;
  const settings = settingsQuery.data ?? {
    dynamicMacrosEnabled: true,
    hydrationEnabled: true,
    healthIntegrationEnabled: false,
    electrolyteNudgesEnabled: false,
    healthPermissionStatus: 'not_connected',
  };
  const athleteProfileRaw = athleteProfileQuery.data ?? defaultAthleteProfile;
  const athleteProfile = useMemo(
    () => (devUnlockPremium ? { ...athleteProfileRaw, enabled: true } : athleteProfileRaw),
    [devUnlockPremium, athleteProfileRaw]
  );
  const cycleProfile = athleteCycleProfileQuery.data ?? defaultCycleProfile;
  const cycleLogs = athleteCycleLogsQuery.data ?? [];
  const cycleDerived = useMemo(() => deriveAthleteCycleState(cycleProfile, cycleLogs), [cycleProfile, cycleLogs]);
  const healthSignals = healthQuery.data ?? null;
  const iapProducts = (iapProductsQuery.data as IapProductView[] | undefined) ?? [];
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

  useEffect(() => {
    if (devUnlockPremium) return;
    if (Platform.OS !== 'ios' || !iapCustomerState) return;
    if (storedEntitlement !== iapCustomerState.entitlement) {
      void setProEntitlement(iapCustomerState.entitlement);
      void queryClient.invalidateQueries({ queryKey: ['pro_entitlement'] });
    }
  }, [devUnlockPremium, iapCustomerState, queryClient, storedEntitlement]);

  const dynamic = useMemo(() => {
    if (!hasPremium || !settings.dynamicMacrosEnabled) {
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
    const proAdjusted = applyProAdjustments(baseMacros, healthSignals);
    if (!athleteProfile.enabled) return { ...proAdjusted, tierApplied: 'pro' as const };
    return applyAthleteAdjustments(
      baseMacros,
      proAdjusted,
      athleteProfile,
      cycleProfile.enabled ? cycleDerived : null
    );
  }, [hasPremium, settings.dynamicMacrosEnabled, baseMacros, healthSignals, athleteProfile, cycleProfile.enabled, cycleDerived]);

  const hydration = useMemo(() => {
    const base = hydrationQuery.data ?? defaultHydration;
    const target = hasPremium && settings.hydrationEnabled
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
    hasPremium,
    settings.hydrationEnabled,
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
  const purchaseMutation = useMutation({
    mutationFn: async () => purchaseLifetime(),
    onSuccess: async (state) => {
      await setProEntitlement(state.entitlement);
      await queryClient.invalidateQueries({ queryKey: ['iap_customer_state'] });
      await queryClient.invalidateQueries({ queryKey: ['pro_entitlement'] });
    },
  });
  const restoreMutation = useMutation({
    mutationFn: async () => restorePurchases(),
    onSuccess: async (state) => {
      await setProEntitlement(state.entitlement);
      await queryClient.invalidateQueries({ queryKey: ['iap_customer_state'] });
      await queryClient.invalidateQueries({ queryKey: ['pro_entitlement'] });
    },
  });
  const startTrialMutation = useMutation({
    mutationFn: async () => startTrialRepo(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pro_trial_state'] }),
  });
  const acknowledgeTrialExpiryMutation = useMutation({
    mutationFn: async () => acknowledgeTrialExpiryRepo(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['pro_trial_state'] }),
  });

  const updateSettings = useCallback(
    (next: Partial<ProSettings>) => {
      settingsMutation.mutate({ ...settings, ...next });
    },
    [settings, settingsMutation]
  );

  const setEntitlement = useCallback(
    (state: ProEntitlementState) => {
      const wasPremium = entitlement === 'unlocked';
      const willBePremium = state === 'unlocked';
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

  const startPurchase = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') return false;
    try {
      const beforePremium = hasPremium;
      const result = await purchaseMutation.mutateAsync();
      const nowPremium = result.entitlement === 'unlocked';
      if (Platform.OS === 'ios' && nowPremium && !beforePremium) {
        setPostProHealthEducationPending(true);
      }
      return true;
    } catch (error) {
      console.warn('[IAP] purchase failed', error);
      return false;
    }
  }, [hasPremium, purchaseMutation]);

  const restoreActivePurchases = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'ios') return false;
    try {
      await restoreMutation.mutateAsync();
      return true;
    } catch (error) {
      console.warn('[IAP] restore failed', error);
      return false;
    }
  }, [restoreMutation]);

  // Starts the 5-day trial once. Returns false if a trial was already started (cannot restart).
  const startTrial = useCallback(async (): Promise<boolean> => {
    if (trialStatus.started || purchasedPremium) return false;
    await startTrialMutation.mutateAsync();
    setTrialNow(Date.now());
    return true;
  }, [trialStatus.started, purchasedPremium, startTrialMutation]);

  const markTrialExpiryAcknowledged = useCallback(() => {
    acknowledgeTrialExpiryMutation.mutate();
  }, [acknowledgeTrialExpiryMutation]);

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
    if (hasPremium && settings.dynamicMacrosEnabled) {
      await saveProDynamicTargets(dynamic.targets);
      queryClient.setQueryData(['pro_dynamic_targets'], dynamic.targets);
    } else {
      await clearProDynamicTargets();
      queryClient.setQueryData(['pro_dynamic_targets'], null);
    }
  }, [dynamic.targets, hasPremium, queryClient, settings.dynamicMacrosEnabled]);

  useEffect(() => {
    void syncDynamicTargets();
  }, [syncDynamicTargets]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const sub = subscribePhysiqWatch('onWatchPayload', (body) => {
      const payload = (body.payload as Record<string, string> | undefined) ?? {};
      if (payload.action === 'hydration_ack') {
        addHydration(250);
      }
    });
    return () => sub?.remove();
  }, [addHydration]);

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
      const merged = { ...athleteProfileRaw, ...next };
      await saveAthleteProfile(merged);
      await queryClient.invalidateQueries({ queryKey: ['athlete_profile'] });
    },
    [athleteProfileRaw, queryClient]
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

  const lifetimeProduct =
    iapProducts.find((p) => p.productId === LIFETIME_PRODUCT_ID) ?? iapProducts[0] ?? null;

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      // Re-evaluate the trial window in case it expired while backgrounded.
      setTrialNow(Date.now());
      void queryClient.invalidateQueries({ queryKey: ['pro_trial_state'] });
      if (Platform.OS === 'ios') {
        void queryClient.invalidateQueries({ queryKey: ['iap_customer_state'] });
      }
    });
    return () => sub.remove();
  }, [queryClient]);

  // While foregrounded, flip to expired exactly when the active trial window ends.
  useEffect(() => {
    if (!trialStatus.active || !trialStatus.endsAt) return;
    const ms = new Date(trialStatus.endsAt).getTime() - Date.now();
    if (ms <= 0) {
      setTrialNow(Date.now());
      return;
    }
    const timer = setTimeout(() => setTrialNow(Date.now()), Math.min(ms + 500, 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [trialStatus.active, trialStatus.endsAt]);

  return {
    entitlement,
    hasPremium,
    trialActive,
    trialExpired,
    trialDaysRemaining,
    trialEndsAt,
    trialExpiryNeedsAck,
    startTrial,
    markTrialExpiryAcknowledged,
    iapProducts,
    lifetimeProduct,
    iapLoading: iapProductsQuery.isLoading || iapCustomerQuery.isLoading,
    iapPurchasePending: purchaseMutation.isPending,
    iapRestorePending: restoreMutation.isPending,
    iapError:
      mapIapErrorForDisplay(purchaseMutation.error as Error | null) ??
      mapIapErrorForDisplay(restoreMutation.error as Error | null),
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
    startPurchase,
    restoreActivePurchases,
  };
});
