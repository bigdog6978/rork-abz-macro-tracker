import { Platform } from 'react-native';

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const Gradients = {
  card: ['#1E1E1E', '#141414'] as [string, string],
  cardSubtle: ['#1A1A1A', '#121212'] as [string, string],
  hero: ['#1F1F1F', '#111111'] as [string, string],
} as const;

export const Shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
    },
    android: { elevation: 4 },
    default: {},
  }) as Record<string, unknown>,
  cardElevated: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
    },
    android: { elevation: 6 },
    default: {},
  }) as Record<string, unknown>,
  fab: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
    },
    android: { elevation: 8 },
    default: {},
  }) as Record<string, unknown>,
} as const;

export const Motion = {
  staggerInterval: 80,
  fadeInDuration: 350,
  springConfig: {
    tension: 40,
    friction: 12,
    useNativeDriver: true,
  },
} as const;
