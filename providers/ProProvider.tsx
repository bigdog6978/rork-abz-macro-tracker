import createContextHook from '@nkzw/create-context-hook';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
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
  getProEntitlement,
  getProHydrationLog,
  getProSettings,
  getTrialConversionState,
  saveAthleteCycleLogs,
  saveAthleteCycleProfile,
  saveAthleteProfile,
  saveLatestProHealthSignals,
  saveProDynamicTargets,
  saveProHydrationLog,
  saveProSettings,
  saveTrialConversionState,
  setProEntitlement,
  TrialConversionState,
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
import {
  getCustomerState,
  getProducts,
  IapProductView,
  IapTier,
  openManageSubscriptions,
  purchaseTier,
  restorePurchases,
} from '../services/iap';
import { IapCustomerState } from '../services/iapMapping';

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

/** When EXPO_PUBLIC_DEV_UNLOCK_PREMIUM is 1/true, treat as full Athlete (Pro + Athlete surfaces). */
function isDevUnlockPremium(): boolean {
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
    return 'Subscriptions are not available right now. You can continue with the free experience.';
  }
  if (message.includes('product not available')) {
    return 'This subscription is currently unavailable. Please try again in a moment.';
  }
  if (message.includes('cancel')) {
    return 'Purchase was canceled.';
  }
  return 'Unable to complete subscription right now. Please try again.';
}

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
  const trialConversionQuery = useQuery({
    queryKey: ['trial_conversion_state'],
    queryFn: getTrialConversionState,
  });

  const storedEntitlement = entitlementQuery.data ?? 'core_active';
  const iapCustomerState = (iapCustomerQuery.data as IapCustomerState | undefined) ?? null;
  const trialConversionState = (trialConversionQuery.data as TrialConversionState | undefined) ?? {};
  const devUnlockPremium = isDevUnlockPremium();
  const entitlementFromSources: ProEntitlementState =
    Platform.OS === 'ios' && iapCustomerState ? iapCustomerState.entitlement : storedEntitlement;
  const entitlement: ProEntitlementState = devUnlockPremium
    ? 'athlete_subscriber_active'
    : entitlementFromSources;
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

  const hasProAccess =
    devUnlockPremium ||
    entitlement === 'pro_trial_active' ||
    entitlement === 'pro_subscriber_active';
  const hasAthleteAccess =
    devUnlockPremium ||
    entitlement === 'athlete_trial_active' ||
    entitlement === 'athlete_subscriber_active';
  const hasAnyPremium = hasProAccess || hasAthleteAccess;
  const tierLabel = hasAthleteAccess ? 'athlete' : hasProAccess ? 'pro' : 'core';
  const trialConversionPromptDue = useMemo(() => {
    if (devUnlockPremium) return false;
    if (Platform.OS !== 'ios' || !iapCustomerState) return false;
    const trialEnded = !iapCustomerState.trialActive && iapCustomerState.lifecycleStatus === 'expired';
    if (!trialEnded || !trialConversionState.trialStartedAt) return false;
    const lastShown = trialConversionState.trialConversionPromptLastShownAt
      ? new Date(trialConversionState.trialConversionPromptLastShownAt)
      : null;
    const skippedAt = trialConversionState.trialConversionSkippedAt
      ? new Date(trialConversionState.trialConversionSkippedAt)
      : null;
    const now = Date.now();
    if (lastShown && now - lastShown.getTime() < 1000 * 60 * 60 * 24) return false;
    if (skippedAt && now - skippedAt.getTime() < 1000 * 60 * 60 * 24) return false;
    return true;
  }, [devUnlockPremium, iapCustomerState, trialConversionState]);

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
  const purchaseMutation = useMutation({
    mutationFn: async (tier: IapTier) => purchaseTier(tier),
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

  const startPurchase = useCallback(
    async (tier: IapTier): Promise<boolean> => {
      if (Platform.OS !== 'ios') return false;
      try {
        const beforePremium = hasAnyPremium;
        const result = await purchaseMutation.mutateAsync(tier);
        const nowIso = new Date().toISOString();
        if (result.trialActive) {
          await saveTrialConversionState({
            ...trialConversionState,
            trialStartedAt: nowIso,
            trialEndedAt: undefined,
            trialTier: tier,
          });
          await queryClient.invalidateQueries({ queryKey: ['trial_conversion_state'] });
        } else if (!result.trialActive && result.lifecycleStatus === 'active') {
          await saveTrialConversionState({
            ...trialConversionState,
            trialConversionSkippedAt: undefined,
          });
          await queryClient.invalidateQueries({ queryKey: ['trial_conversion_state'] });
        }
        const nowPremium =
          result.entitlement === 'pro_subscriber_active' || result.entitlement === 'athlete_subscriber_active';
        if (Platform.OS === 'ios' && nowPremium && !beforePremium) {
          setPostProHealthEducationPending(true);
        }
        return true;
      } catch (error) {
        console.warn('[IAP] purchase failed', error);
        return false;
      }
    },
    [hasAnyPremium, purchaseMutation, queryClient, trialConversionState]
  );

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

  const proProduct = iapProducts.find((p) => p.productId === 'physiq.pro.monthly') ?? null;
  const athleteProduct = iapProducts.find((p) => p.productId === 'physiq.athlete.monthly') ?? null;

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void queryClient.invalidateQueries({ queryKey: ['iap_customer_state'] });
        void queryClient.invalidateQueries({ queryKey: ['trial_conversion_state'] });
      }
    });
    return () => sub.remove();
  }, [queryClient]);

  useEffect(() => {
    if (Platform.OS !== 'ios' || !iapCustomerState || iapCustomerState.trialActive) return;
    if (!trialConversionState.trialStartedAt || trialConversionState.trialEndedAt) return;
    const run = async () => {
      await saveTrialConversionState({
        ...trialConversionState,
        trialEndedAt: iapCustomerState.trialEndsAt ?? new Date().toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: ['trial_conversion_state'] });
    };
    void run();
  }, [iapCustomerState, queryClient, trialConversionState]);

  const markTrialConversionPromptShown = useCallback(async () => {
    await saveTrialConversionState({
      ...trialConversionState,
      trialConversionPromptLastShownAt: new Date().toISOString(),
    });
    await queryClient.invalidateQueries({ queryKey: ['trial_conversion_state'] });
  }, [queryClient, trialConversionState]);

  const skipTrialConversionPrompt = useCallback(async () => {
    await saveTrialConversionState({
      ...trialConversionState,
      trialConversionSkippedAt: new Date().toISOString(),
      trialConversionPromptLastShownAt: new Date().toISOString(),
    });
    await queryClient.invalidateQueries({ queryKey: ['trial_conversion_state'] });
  }, [queryClient, trialConversionState]);

  const saveTrialExperienceRating = useCallback(async (rating: number) => {
    await saveTrialConversionState({
      ...trialConversionState,
      trialExperienceRating: Math.max(1, Math.min(5, Math.round(rating))),
    });
    await queryClient.invalidateQueries({ queryKey: ['trial_conversion_state'] });
  }, [queryClient, trialConversionState]);

  return {
    entitlement,
    tierLabel,
    hasProAccess,
    hasAthleteAccess,
    hasAnyPremium,
    iapProducts,
    proProduct,
    athleteProduct,
    iapLoading: iapProductsQuery.isLoading || iapCustomerQuery.isLoading,
    iapPurchasePending: purchaseMutation.isPending,
    iapRestorePending: restoreMutation.isPending,
    iapError:
      mapIapErrorForDisplay(purchaseMutation.error as Error | null) ??
      mapIapErrorForDisplay(restoreMutation.error as Error | null),
    iapLifecycleStatus: iapCustomerState?.lifecycleStatus ?? 'expired',
    iapStatusMessage: iapCustomerState?.statusMessage ?? 'Subscription inactive.',
    trialActive: iapCustomerState?.trialActive ?? false,
    trialEndsAt: iapCustomerState?.trialEndsAt ?? null,
    trialConversionState,
    trialConversionPromptDue,
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
    openManageSubscriptions,
    markTrialConversionPromptShown,
    skipTrialConversionPrompt,
    saveTrialExperienceRating,
  };
});
