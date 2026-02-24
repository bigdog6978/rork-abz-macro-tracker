import Constants from 'expo-constants';

const extra = Constants.expoConfig?.extra as
  | { USDA_API_KEY?: string; USDA_BASE_URL?: string }
  | undefined;

export const USDA_API_KEY = extra?.USDA_API_KEY ?? '';
export const USDA_BASE_URL = extra?.USDA_BASE_URL ?? 'https://api.nal.usda.gov/fdc/v1';
