import React, { useEffect, useRef, useCallback, useState } from 'react';
import { View, Text, StyleSheet, Animated, Pressable, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { useUser } from '../providers/UserProvider';
import { useDailyLog } from '../providers/DailyLogProvider';
import { useThemeColors } from '../providers/ThemeProvider';
import { Gradients } from '../theme/tokens';
import SplashBrandSvg from '../components/ui/SplashBrandSvg';

const SPLASH_BRAND_MAX = 300;
const SPLASH_BRAND_HORIZONTAL_INSET = 32;
const SPLASH_BRAND_SCALE = 0.8;
const ASPECT_SPLASH = 602.13 / 601.26;
const VERSION_SIZE = 12;

function navigateFromProfile(router: ReturnType<typeof useRouter>, profile: { onboardingComplete?: boolean; firstName?: string } | null) {
  try {
    if (profile?.onboardingComplete) {
      router.replace('/(tabs)' as never);
    } else if (profile?.firstName) {
      router.replace('/onboarding' as never);
    } else {
      router.replace('/welcome' as never);
    }
  } catch {
    router.replace('/welcome' as never);
  }
}

export default function SplashScreen() {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const router = useRouter();
  const colors = useThemeColors();
  const { profile, isLoading: userLoading } = useUser();
  const { isLoading: logsLoading } = useDailyLog();
  const hasNavigatedRef = useRef(false);
  const [pendingTap, setPendingTap] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tapHintAnim = useRef(new Animated.Value(0)).current;

  const isHydrated = !userLoading && !logsLoading;
  const version = Constants.expoConfig?.version;

  const brandSide =
    Math.min(
      SPLASH_BRAND_MAX,
      Math.max(0, windowWidth - SPLASH_BRAND_HORIZONTAL_INSET),
    ) * SPLASH_BRAND_SCALE;
  const brandW = brandSide;
  const brandH = brandSide * ASPECT_SPLASH;

  const startExitAndNavigate = useCallback(() => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    navigateFromProfile(router, profile);
  }, [profile, router]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (isHydrated) {
      Animated.timing(tapHintAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isHydrated, tapHintAnim]);

  useEffect(() => {
    if (isHydrated && pendingTap && !hasNavigatedRef.current) {
      setPendingTap(false);
      startExitAndNavigate();
    }
  }, [isHydrated, pendingTap, startExitAndNavigate]);

  const handlePress = useCallback(() => {
    if (hasNavigatedRef.current) return;
    if (isHydrated) {
      startExitAndNavigate();
    } else {
      setPendingTap(true);
    }
  }, [isHydrated, startExitAndNavigate]);

  return (
    <Pressable
      style={styles.container}
      onPress={handlePress}
    >
      <LinearGradient
        colors={Gradients.screen}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <Animated.View style={[styles.centerStack, { opacity: fadeAnim }]}>
        <SplashBrandSvg width={brandW} height={brandH} color={colors.primary} />
      </Animated.View>

      <Animated.View style={[styles.bottomArea, { bottom: insets.bottom + 16, opacity: fadeAnim }]}>
        {isHydrated && (
          <Animated.Text style={[styles.tapHint, { opacity: tapHintAnim }]}>
            Tap to continue
          </Animated.Text>
        )}
        {version ? (
          <Text style={styles.version}>v{version}</Text>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerStack: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomArea: {
    position: 'absolute',
    bottom: 16,
    alignItems: 'center',
    gap: 8,
  },
  tapHint: {
    fontSize: 12.5,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.45)',
  },
  version: {
    fontSize: VERSION_SIZE,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.35)',
  },
});
