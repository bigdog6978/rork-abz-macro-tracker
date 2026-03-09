import type { ExpoConfig } from 'expo/config';

const DEFAULT_USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

export default (): ExpoConfig => ({
  name: 'Physiq Macro Tracker',
  slug: 'abz-macro-tracker',
  version: '1.2.4',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'rork-app',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  splash: {
    image: './assets/images/splash_icon.png',
    resizeMode: 'contain',
    backgroundColor: '#0D0D0D',
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'app.rork.abz-macro-tracker',
    buildNumber: '11',
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription:
        'Physiq uses the camera to scan barcodes to quickly add foods. No photos or videos are stored.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'app.rork.abz_macro_tracker',
    versionCode: 11,
    permissions: ['CAMERA'],
  },
  web: {
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    ['expo-router', { origin: 'https://rork.com/' }],
    'expo-font',
    'expo-web-browser',
    [
      'expo-camera',
      {
        cameraPermission:
          'Physiq uses the camera to scan barcodes to quickly add foods. No photos or videos are stored.',
      },
    ],
    'expo-sqlite',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    router: { origin: 'https://rork.com/' },
    eas: { projectId: 'd62f829f-f2e7-4bd9-9e05-12c2ca4f727f' },
    EXPO_PUBLIC_USDA_API_KEY: process.env.EXPO_PUBLIC_USDA_API_KEY ?? process.env.USDA_API_KEY ?? '',
    USDA_API_KEY: process.env.USDA_API_KEY ?? process.env.EXPO_PUBLIC_USDA_API_KEY ?? '',
    usda_api_key: process.env.usda_api_key ?? process.env.USDA_API_KEY ?? process.env.EXPO_PUBLIC_USDA_API_KEY ?? '',
    USDA_BASE_URL: process.env.USDA_BASE_URL ?? DEFAULT_USDA_BASE_URL,
  },
});
