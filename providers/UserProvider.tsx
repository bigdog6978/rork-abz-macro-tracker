import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile, MacroTargets } from '../types';
import { calculateMacros } from '../utils/macroEngine';

const PROFILE_KEY = 'abz_user_profile';

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
      const stored = await AsyncStorage.getItem(PROFILE_KEY);
      if (stored) {
        return JSON.parse(stored) as UserProfile;
      }
      return DEFAULT_PROFILE;
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
    }
  }, [profileQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (updated: UserProfile) => {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
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
    await AsyncStorage.removeItem(PROFILE_KEY);
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
