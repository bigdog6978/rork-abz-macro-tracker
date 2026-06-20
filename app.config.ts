import type { ExpoConfig } from 'expo/config';

const DEFAULT_USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

/** Single source of truth for HealthKit usage strings (react-native-health config plugin + review). */
const HEALTH_SHARE_USAGE =
  'Physiq reads activity, workouts, heart rate, heart rate variability, and sleep from Apple Health to adapt macro and hydration targets.';
const HEALTH_UPDATE_USAGE =
  'Physiq does not write health data. This permission is required by Apple Health for app compatibility.';
const CAMERA_USAGE =
  'Physiq uses the camera to scan barcodes and capture progress photos stored on your device.';
const PHOTO_LIBRARY_USAGE =
  'Physiq accesses your photo library so you can add progress photos stored on your device.';

export default (): ExpoConfig => ({
  name: 'Physiq Macro Tracker',
  slug: 'abz-macro-tracker',
  version: '1.3.3',
  orientation: 'default',
  icon: './assets/images/icon.png',
  scheme: 'rork-app',
  userInterfaceStyle: 'automatic',
  // New Architecture required by react-native-worklets (Expo SDK 54). react-native-health
  // uses legacy NativeModules; interop is supported but expo-doctor flags it as untested.
  newArchEnabled: true,
  // Native splash cannot use SVG or theme colors. In-app splash loads
  // assets/splash_brand.svg at runtime via SplashBrandSvg (useThemeColors().primary).
  splash: {
    backgroundColor: '#0D0D0D',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'app.rork.abz-macro-tracker',
    buildNumber: '13',
    // Apple Developer Team ID (10 chars). Set APPLE_TEAM_ID in env for prebuild/EAS, or add here.
    ...(process.env.APPLE_TEAM_ID ? { appleTeamId: process.env.APPLE_TEAM_ID } : {}),
    entitlements: {
      'com.apple.security.application-groups': ['group.app.rork.abz-macro-tracker'],
    },
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSCameraUsageDescription: CAMERA_USAGE,
      NSPhotoLibraryUsageDescription: PHOTO_LIBRARY_USAGE,
      NSPhotoLibraryAddUsageDescription: 'Physiq can save your progress share cards to your photo library.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'app.rork.abz_macro_tracker',
    versionCode: 12,
    permissions: ['CAMERA'],
  },
  web: {
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    ['expo-router', { origin: 'https://rork.com/' }],
    'expo-asset',
    'expo-font',
    'expo-web-browser',
    [
      'expo-camera',
      {
        cameraPermission: CAMERA_USAGE,
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: PHOTO_LIBRARY_USAGE,
        cameraPermission: CAMERA_USAGE,
      },
    ],
    [
      'expo-media-library',
      {
        photosPermission: PHOTO_LIBRARY_USAGE,
        savePhotosPermission: 'Physiq can save your progress share cards to your photo library.',
      },
    ],
    [
      'expo-speech-recognition',
      {
        microphonePermission:
          'Physiq uses the microphone so you can speak a meal and quickly add foods to your log.',
        speechRecognitionPermission:
          'Physiq uses speech recognition to turn spoken meals into food entries with macros.',
      },
    ],
    'expo-sqlite',
    [
      'react-native-health',
      {
        healthSharePermission: HEALTH_SHARE_USAGE,
        healthUpdatePermission: HEALTH_UPDATE_USAGE,
      },
    ],
    '@bacons/apple-targets',
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
    EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '',
    // Set to 1/true in .env for local or internal review only — never in App Store production env.
    EXPO_PUBLIC_DEV_UNLOCK_PREMIUM: process.env.EXPO_PUBLIC_DEV_UNLOCK_PREMIUM ?? '',
  },
});
