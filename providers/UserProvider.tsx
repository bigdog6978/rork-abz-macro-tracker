import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile, MacroTargets } from '../types';
import { calculateMacros } from '../utils/macroEngine';
import { loadData, saveData, removeData, STORAGE_KEYS } from '../services/storage';

const DEFAULT_PROFILE: UserProfile = {
  age: 30,
  sex: 'male',
  height_cm: 175,
  weight_lb: 180,
  activity_level: 'moderately_active',
  goal: 'cut',
  goal_rate: 'moderate',
  preference: 'balanced',
  macro_strategy: 'balanced',
  dietary_modifiers: [],
  measurement_system: 'us',
  onboarding_complete: false,
};

export const [UserProvider, useUser] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);

  const profileQuery = useQuery({
    queryKey: ['user_profile'],
    queryFn: async () => {
      let stored = await loadData<UserProfile>(STORAGE_KEYS.USER_PROFILE);
      if (!stored) {
        const legacy = await loadData<UserProfile>('abz_user_profile');
        if (legacy) {
          stored = legacy;
          await saveData(STORAGE_KEYS.USER_PROFILE, stored);
          await removeData('abz_user_profile');
        }
      }
      return stored ?? DEFAULT_PROFILE;
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
      await saveData(STORAGE_KEYS.PROTOCOL, updated.macro_strategy ?? 'balanced');
      return updated;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user_profile'], data);
    },
  });

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      const updated = { ...profile, ...updates };
      setProfile(updated);
      saveMutation.mutate(updated);
    },
    [profile, saveMutation]
  );

  const completeOnboarding = useCallback(
    (profileData: Omit<UserProfile, 'onboarding_complete'>) => {
      const updated = { ...profile, ...profileData, onboarding_complete: true };
      setProfile(updated);
      saveMutation.mutate(updated);
    },
    [profile, saveMutation]
  );

  const resetProfile = useCallback(async () => {
    await removeData(STORAGE_KEYS.USER_PROFILE);
    await removeData(STORAGE_KEYS.MACRO_TARGETS);
    await removeData(STORAGE_KEYS.PROTOCOL);
    setProfile(DEFAULT_PROFILE);
    queryClient.setQueryData(['user_profile'], DEFAULT_PROFILE);
  }, [queryClient]);

  const macros: MacroTargets = useMemo(() => {
    if (!profile.onboarding_complete) {
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
