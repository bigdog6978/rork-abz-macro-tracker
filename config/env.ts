import Constants from 'expo-constants';

type Extra = { USDA_API_KEY?: string; USDA_BASE_URL?: string };

/**
 * Single source of truth for USDA API key.
 * Works in dev (process.env), EAS builds (extra), and production.
 */
export function getUsdaApiKey(): string {
  const extra = (Constants.expoConfig?.extra || {}) as Extra;
  const keyFromExtra = extra?.USDA_API_KEY;
  const keyFromProcess =
    process.env.USDA_API_KEY ?? process.env.EXPO_PUBLIC_USDA_API_KEY ?? '';
  return (keyFromExtra || keyFromProcess || '').trim();
}

export function getUsdaBaseUrl(): string {
  const extra = (Constants.expoConfig?.extra || {}) as Extra;
  return (
    extra?.USDA_BASE_URL ??
    process.env.USDA_BASE_URL ??
    'https://api.nal.usda.gov/fdc/v1'
  );
}
