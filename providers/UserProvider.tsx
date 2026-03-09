import createContextHook from '@nkzw/create-context-hook';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  UserProfile,
  MacroTargets,
  DietaryModifier,
  legacyMacroStrategyToEatingStyle,
  normalizeLegacyActivityLevel,
} from '../types';
import { calculateMacros } from '../utils/macroEngine';
import { loadData, saveData, removeData, STORAGE_KEYS } from '../services/storage';

type LegacyUserProfile = {
  first_name?: string;
  firstName?: string;
  age?: number;
  sex?: 'male' | 'female';
  height_cm?: number;
  heightCm?: number;
  weight_lb?: number;
  weightLb?: number;
  bodyFatPercent?: number;
  body_fat_percent?: number;
  activity_level?: string;
  activityLevel?: string;
  goal?: 'cut' | 'gain' | 'maintain' | 'recompose';
  goal_rate?: string;
  preference?: string;
  macro_strategy?: string;
  dietary_modifiers?: string[];
  dietModifiers?: string[];
  dietNotes?: string;
  diet_notes?: string;
  measurement_system?: 'metric' | 'us';
  measurementSystem?: 'metric' | 'us';
  onboarding_complete?: boolean;
  onboardingComplete?: boolean;
};

const DEFAULT_PROFILE: UserProfile = {
  age: 30,
  sex: 'male',
  heightCm: 175,
  weightLb: 180,
  bodyFatPercent: undefined,
  activityLevel: 'moderate_training',
  goal: 'cut',
  eatingStyle: 'standard',
  dietModifiers: [],
  dietNotes: '',
  measurementSystem: 'us',
  onboardingComplete: false,
};

function normalizeDietModifiers(raw: string[] | undefined): DietaryModifier[] {
  const valid = new Set<DietaryModifier>([
    'gluten_free',
    'dairy_free',
    'nut_free',
    'egg_free',
    'soy_free',
    'shellfish_free',
    'intermittent_fasting',
  ]);
  return (raw ?? []).filter((value): value is DietaryModifier => valid.has(value as DietaryModifier));
}

function deriveEatingStyle(stored: LegacyUserProfile): UserProfile['eatingStyle'] {
  const legacyModifiers = stored.dietary_modifiers ?? stored.dietModifiers ?? [];
  if (legacyModifiers.includes('vegan')) return 'vegan';
  if (legacyModifiers.includes('vegetarian')) return 'vegetarian';
  if (legacyModifiers.includes('paleo')) return 'paleo';
  if (stored.preference === 'vegetarian') return 'vegetarian';
  if (stored.preference === 'mediterranean') return 'mediterranean';
  return legacyMacroStrategyToEatingStyle(stored.macro_strategy ?? stored.preference);
}

function normalizeStoredProfile(stored: LegacyUserProfile | null | undefined): UserProfile {
  if (!stored) return DEFAULT_PROFILE;

  return {
    ...DEFAULT_PROFILE,
    firstName: stored.firstName ?? stored.first_name ?? DEFAULT_PROFILE.firstName,
    age: stored.age ?? DEFAULT_PROFILE.age,
    sex: stored.sex ?? DEFAULT_PROFILE.sex,
    heightCm: stored.heightCm ?? stored.height_cm ?? DEFAULT_PROFILE.heightCm,
    weightLb: stored.weightLb ?? stored.weight_lb ?? DEFAULT_PROFILE.weightLb,
    bodyFatPercent: stored.bodyFatPercent ?? stored.body_fat_percent ?? DEFAULT_PROFILE.bodyFatPercent,
    goal: stored.goal ?? DEFAULT_PROFILE.goal,
    activityLevel: normalizeLegacyActivityLevel(stored.activityLevel ?? stored.activity_level),
    eatingStyle: deriveEatingStyle(stored),
    dietModifiers: normalizeDietModifiers(stored.dietModifiers ?? stored.dietary_modifiers),
    dietNotes: stored.dietNotes ?? stored.diet_notes ?? DEFAULT_PROFILE.dietNotes,
    measurementSystem: stored.measurementSystem ?? stored.measurement_system ?? DEFAULT_PROFILE.measurementSystem,
    onboardingComplete: stored.onboardingComplete ?? stored.onboarding_complete ?? DEFAULT_PROFILE.onboardingComplete,
  };
}

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

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      const updated = mergeDefined(profile, updates);
      setProfile(updated);
      saveMutation.mutate(updated);
    },
    [profile, saveMutation]
  );

  const completeOnboarding = useCallback(
    (profileData: Omit<UserProfile, 'onboardingComplete'>) => {
      const updated = { ...mergeDefined(profile, profileData), onboardingComplete: true };
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
