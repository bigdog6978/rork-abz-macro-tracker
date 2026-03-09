import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile, MacroTargets } from '../types';
import { calculateMacros } from '../utils/macroEngine';
import { DEFAULT_PROFILE, LegacyUserProfile, normalizeStoredProfile } from '../utils/profileNormalization';
import { loadData, saveData, removeData, STORAGE_KEYS } from '../services/storage';

function mergeDefined<T extends object>(base: T, updates: Partial<T>): T {
  const definedEntries = Object.entries(updates).filter(([, value]) => value !== undefined);
  return { ...base, ...Object.fromEntries(definedEntries) as Partial<T> };
}

export const [UserProvider, useUser] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

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

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
    }
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (updated: UserProfile) => {
      await saveData(STORAGE_KEYS.USER_PROFILE, updated);
      const macros = calculateMacros(updated);
      await saveData(STORAGE_KEYS.MACRO_TARGETS, macros);
      await removeData(STORAGE_KEYS.PROTOCOL);
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
    setProfile(DEFAULT_PROFILE);
    queryClient.setQueryData(['user_profile'], DEFAULT_PROFILE);
  }, [queryClient]);

  const macros: MacroTargets = useMemo(() => {
    if (!profile.onboardingComplete) {
      return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
    }
    return calculateMacros(profile);
  }, [profile]);

  const isLoading = profileQuery.isLoading;

  return {
    profile,
    macros,
    isLoading,
    updateProfile,
    completeOnboarding,
    resetProfile,
  };
});
