import type { ExpoConfig } from 'expo/config';

const DEFAULT_USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

export default (): ExpoConfig => {
  const base = require('./app.json').expo as ExpoConfig;
  return {
    ...base,
    extra: {
      ...base.extra,
      USDA_API_KEY: process.env.USDA_API_KEY ?? process.env.EXPO_PUBLIC_USDA_API_KEY ?? '',
      USDA_BASE_URL: process.env.USDA_BASE_URL ?? DEFAULT_USDA_BASE_URL,
    },
  };
};
