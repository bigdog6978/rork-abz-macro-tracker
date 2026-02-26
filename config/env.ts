import Constants from 'expo-constants';

const USDA_BASE_URL_DEFAULT = 'https://api.nal.usda.gov/fdc/v1';

type Extra = {
  EXPO_PUBLIC_USDA_API_KEY?: string;
  usda_api_key?: string;
  USDA_API_KEY?: string;
  USDA_BASE_URL?: string;
};

export type UsdaKeySource =
  | 'extra'       // Constants.expoConfig.extra (EXPO_PUBLIC or USDA_API_KEY)
  | 'publicEnv'   // process.env.EXPO_PUBLIC_USDA_API_KEY
  | 'legacyExtra' // Constants.expoConfig.extra.usda_api_key
  | 'legacyEnv'   // process.env.usda_api_key or process.env.USDA_API_KEY
  | 'missing';

/**
 * Bulletproof USDA API key resolution across Expo dev, simulator, TestFlight/standalone, and Android.
 * Checks sources in priority order for consistent behavior on simulator and physical device.
 */
export function getUsdaApiKey(): string {
  const extra = (Constants.expoConfig?.extra || {}) as Extra;

  const key =
    (extra?.EXPO_PUBLIC_USDA_API_KEY ?? '').trim() ||
    (process.env.EXPO_PUBLIC_USDA_API_KEY ?? '').trim() ||
    (extra?.usda_api_key ?? '').trim() ||
    (process.env.usda_api_key ?? '').trim() ||
    // EAS / app.config typically uses USDA_API_KEY
    (extra?.USDA_API_KEY ?? '').trim() ||
    (process.env.USDA_API_KEY ?? '').trim() ||
    '';

  return key.trim();
}

/**
 * USDA base URL. Always returns the real USDA endpoint unless explicitly overridden.
 * Rejects localhost for security.
 */
export function getUsdaBaseUrl(): string {
  const extra = (Constants.expoConfig?.extra || {}) as Extra;
  const override =
    extra?.USDA_BASE_URL ?? process.env.USDA_BASE_URL ?? '';

  const trimmed = (override || '').trim();
  if (
    trimmed &&
    trimmed.startsWith('https://') &&
    !trimmed.includes('localhost')
  ) {
    return trimmed;
  }
  return USDA_BASE_URL_DEFAULT;
}

export interface UsdaDebugInfo {
  keyLength: number;
  keySuffix?: string;
  baseUrl: string;
  source: UsdaKeySource;
}

/**
 * Returns debug info for USDA config. Never returns or logs the full key.
 */
export function getUsdaDebugInfo(): UsdaDebugInfo {
  const extra = (Constants.expoConfig?.extra || {}) as Extra;

  let key = '';
  let source: UsdaKeySource = 'missing';

  if ((extra?.EXPO_PUBLIC_USDA_API_KEY ?? '').trim()) {
    key = (extra.EXPO_PUBLIC_USDA_API_KEY ?? '').trim();
    source = 'extra';
  } else if ((process.env.EXPO_PUBLIC_USDA_API_KEY ?? '').trim()) {
    key = (process.env.EXPO_PUBLIC_USDA_API_KEY ?? '').trim();
    source = 'publicEnv';
  } else if ((extra?.usda_api_key ?? '').trim()) {
    key = (extra.usda_api_key ?? '').trim();
    source = 'legacyExtra';
  } else if ((process.env.usda_api_key ?? '').trim()) {
    key = (process.env.usda_api_key ?? '').trim();
    source = 'legacyEnv';
  } else if ((extra?.USDA_API_KEY ?? '').trim()) {
    key = (extra.USDA_API_KEY ?? '').trim();
    source = 'extra';
  } else if ((process.env.USDA_API_KEY ?? '').trim()) {
    key = (process.env.USDA_API_KEY ?? '').trim();
    source = 'legacyEnv';
  }

  return {
    keyLength: key.length,
    keySuffix: key.length >= 4 ? `...${key.slice(-4)}` : undefined,
    baseUrl: getUsdaBaseUrl(),
    source,

    
  };
}
