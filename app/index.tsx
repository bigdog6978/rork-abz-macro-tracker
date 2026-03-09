import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useUser } from '../providers/UserProvider';
import { useDailyLog } from '../providers/DailyLogProvider';
import Colors from '../constants/colors';

const LOGO_SIZE = 112;
const WORDMARK_SIZE = 36;
const SUBTITLE_SIZE = 15;
const VERSION_SIZE = 12;
const GRADIENT_COLORS = ['#FFC44D', '#FF6A1A', '#D84315'] as const;

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
  const router = useRouter();
  const { profile, isLoading: userLoading } = useUser();
  const { isLoading: logsLoading } = useDailyLog();
  const [hasNavigated, setHasNavigated] = useState(false);
  const [pendingTap, setPendingTap] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const tapHintAnim = useRef(new Animated.Value(0)).current;

  const isHydrated = !userLoading && !logsLoading;
  const version = Constants.expoConfig?.version;

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
    if (isHydrated && pendingTap && !hasNavigated) {
      setHasNavigated(true);
      setPendingTap(false);
      navigateFromProfile(router, profile);
    }
  }, [isHydrated, pendingTap, hasNavigated, router, profile]);

  const handlePress = useCallback(() => {
    if (hasNavigated) return;
    if (isHydrated) {
      setHasNavigated(true);
      navigateFromProfile(router, profile);
    } else {
      setPendingTap(true);
    }
  }, [hasNavigated, isHydrated, router, profile]);

  return (
    <Pressable
      style={styles.container}
      onPress={handlePress}
    >
      <LinearGradient
        colors={['#272727', '#000000']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <Animated.View style={[styles.centerStack, { opacity: fadeAnim }]}>
        <Image
          source={require('../assets/images/splash_icon.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="Physiq logo"
        />
        <View style={styles.wordmarkWrap}>
          <MaskedView
            maskElement={
              <Text style={[styles.wordmark, { backgroundColor: 'transparent', color: 'black' }]}>
                Physiq
              </Text>
            }
          >
            <LinearGradient
              colors={[...GRADIENT_COLORS]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.gradientFill}
            >
              <Text style={[styles.wordmark, styles.wordmarkInvisible]}>Physiq</Text>
            </LinearGradient>
          </MaskedView>
        </View>
        <Text style={styles.subtitle}>Macro Tracker</Text>
      </Animated.View>

      <View style={[styles.bottomArea, { bottom: insets.bottom + 16 }]}>
        {isHydrated && (
          <Animated.Text style={[styles.tapHint, { opacity: tapHintAnim }]}>
            Tap to continue
          </Animated.Text>
        )}
        {version ? (
          <Text style={styles.version}>v{version}</Text>
        ) : null}
      </View>
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
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  wordmarkWrap: {
    marginTop: 16,
  },
  wordmark: {
    fontSize: WORDMARK_SIZE,
    fontWeight: '700' as const,
    letterSpacing: 0.8,
  },
  wordmarkInvisible: {
    opacity: 0,
  },
  gradientFill: {
    paddingVertical: 2,
  },
  subtitle: {
    marginTop: 10,
    fontSize: SUBTITLE_SIZE,
    fontWeight: '500' as const,
    color: 'rgba(255, 255, 255, 0.6)',
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
