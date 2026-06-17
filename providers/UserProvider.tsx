import { createSafeContextHook } from '../utils/createSafeContextHook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile, MacroTargets } from '../types';
import { calculateMacros } from '../utils/macroEngine';
import { DEFAULT_PROFILE, LegacyUserProfile, normalizeStoredProfile } from '../utils/profileNormalization';
import { clearProDynamicTargets } from '../storage/proRepo';
import { loadData, saveData, removeData, STORAGE_KEYS } from '../services/storage';

function mergeDefined<T extends object>(base: T, updates: Partial<T>): T {
  const definedEntries = Object.entries(updates).filter(([, value]) => value !== undefined);
  return { ...base, ...Object.fromEntries(definedEntries) as Partial<T> };
}

export const [UserProvider, useUser] = createSafeContextHook(() => {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [customMacros, setCustomMacrosState] = useState<MacroTargets | null>(null);

  const profileQuery = useQuery({
    queryKey: ['user_profile'],
    queryFn: async () => {
      let stored = await loadData<LegacyUserProfile>(STORAGE_KEYS.USER_PROFILE);
      if (!stored) {
        const legacy = await loadData<LegacyUserProfile>('abz_user_profile');
        if (legacy) {
          stored = legacy;
          await saveData(STORAGE_KEYS.USER_PROFILE, normalizeStoredProfile(stored));
          await removeData('abz_user_profile');
        }
      }
      return normalizeStoredProfile(stored);
    },
  });

  const customMacrosQuery = useQuery({
    queryKey: ['custom_macro_targets'],
    queryFn: () => loadData<MacroTargets>(STORAGE_KEYS.CUSTOM_MACRO_TARGETS),
  });
  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
    }
  }, [profileQuery.data]);

  useEffect(() => {
    if (customMacrosQuery.data !== undefined) {
      setCustomMacrosState(customMacrosQuery.data);
    }
  }, [customMacrosQuery.data]);

  const invalidateProDynamicTargets = useCallback(async () => {
    await clearProDynamicTargets();
    queryClient.setQueryData(['pro_dynamic_targets'], null);
  }, [queryClient]);

  const saveMutation = useMutation({
    mutationFn: async (updated: UserProfile) => {
      await saveData(STORAGE_KEYS.USER_PROFILE, updated);
      await removeData(STORAGE_KEYS.PROTOCOL);
      await invalidateProDynamicTargets();
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user_profile'], data);
    },
  });

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile((current) => {
      const updated = mergeDefined(current, updates);
      saveMutation.mutate(updated);
      return updated;
    });
  }, [saveMutation]);

  const completeOnboarding = useCallback(
    (profileData: Omit<UserProfile, 'onboardingComplete'>) => {
      setProfile((current) => {
        const updated = { ...mergeDefined(current, profileData), onboardingComplete: true };
        saveMutation.mutate(updated);
        return updated;
      });
    },
    [saveMutation]
  );

  const resetProfile = useCallback(async () => {
    await removeData(STORAGE_KEYS.USER_PROFILE);
    await removeData(STORAGE_KEYS.MACRO_TARGETS);
    await removeData(STORAGE_KEYS.PROTOCOL);
    await removeData(STORAGE_KEYS.CUSTOM_MACRO_TARGETS);
    setProfile(DEFAULT_PROFILE);
    setCustomMacrosState(null);
    queryClient.setQueryData(['user_profile'], DEFAULT_PROFILE);
    queryClient.setQueryData(['custom_macro_targets'], null);
  }, [queryClient]);

  const setCustomMacros = useCallback(async (targets: MacroTargets | null) => {
    if (targets) {
      await saveData(STORAGE_KEYS.CUSTOM_MACRO_TARGETS, targets);
    } else {
      await removeData(STORAGE_KEYS.CUSTOM_MACRO_TARGETS);
    }
    setCustomMacrosState(targets);
    queryClient.setQueryData(['custom_macro_targets'], targets);
    await invalidateProDynamicTargets();
  }, [invalidateProDynamicTargets, queryClient]);

  const calculatedMacros: MacroTargets = useMemo(() => {
    if (!profile.onboardingComplete) {
      return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    }
    return calculateMacros(profile);
  }, [profile]);

  const macros: MacroTargets = customMacros ?? calculatedMacros;

  const isLoading = profileQuery.isLoading;

  return {
    profile,
    macros,
    calculatedMacros,
    customMacros,
    setCustomMacros,
    isLoading,
    updateProfile,
    completeOnboarding,
    resetProfile,
  };
}, 'useUser', 'UserProvider');
