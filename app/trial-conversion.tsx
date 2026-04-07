import React, { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star } from 'lucide-react-native';
import Colors from '../constants/colors';
import { useThemeColors, type AppColors } from '../providers/ThemeProvider';
import { usePro } from '../providers/ProProvider';

export default function TrialConversionScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const {
    trialConversionState,
    saveTrialExperienceRating,
    skipTrialConversionPrompt,
    startPurchase,
    iapPurchasePending,
  } = usePro();
  const [rating, setRating] = useState<number>(trialConversionState.trialExperienceRating ?? 0);

  const tier = trialConversionState.trialTier ?? 'pro';
  const title = tier === 'athlete' ? 'Continue with Athlete?' : 'Continue with Pro?';

  const handleSubscribe = async () => {
    if (rating > 0) {
      await saveTrialExperienceRating(rating);
    }
    const purchased = await startPurchase(tier);
    if (!purchased) {
      Alert.alert('Purchase not completed', 'Please try again in a moment.');
      return;
    }
    router.replace('/(tabs)' as never);
  };

  const handleSkip = async () => {
    if (rating > 0) {
      await saveTrialExperienceRating(rating);
    }
    await skipTrialConversionPrompt();
    router.replace('/(tabs)' as never);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>
      <Text style={styles.heading}>How was your trial experience?</Text>
      <Text style={styles.subheading}>Tap a rating from 1 to 5 stars.</Text>
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((value) => {
          const active = value <= rating;
          return (
            <TouchableOpacity
              key={value}
              style={styles.starButton}
              onPress={() => setRating(value)}
              accessibilityRole="button"
              accessibilityLabel={`${value} stars`}
            >
              <Star size={28} color={active ? colors.primary : Colors.textTertiary} fill={active ? colors.primary : 'transparent'} />
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardBody}>
          {tier === 'athlete'
            ? 'Athlete includes everything in Pro with performance-focused planning.'
            : 'Pro keeps your adaptive macros and hydration guidance active.'}
        </Text>
        <Text style={styles.disclosure}>
          Subscription auto-renews unless canceled at least 24 hours before renewal. Manage or cancel anytime in Apple ID Subscriptions.
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.primaryButton]} disabled={iapPurchasePending} onPress={handleSubscribe}>
          <Text style={styles.primaryText}>{iapPurchasePending ? 'Processing...' : 'Subscribe'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.secondaryButton]} disabled={iapPurchasePending} onPress={handleSkip}>
          <Text style={styles.secondaryText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 20,
      backgroundColor: 'transparent',
      gap: 14,
    },
    heading: {
      color: Colors.text,
      fontSize: 28,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    subheading: {
      color: Colors.textSecondary,
      fontSize: 15,
      lineHeight: 21,
    },
    starRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      marginVertical: 4,
    },
    starButton: {
      padding: 8,
    },
    card: {
      marginTop: 4,
      padding: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      backgroundColor: Colors.card,
      gap: 8,
    },
    cardTitle: {
      color: Colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    cardBody: {
      color: Colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    disclosure: {
      color: Colors.textTertiary,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 2,
    },
    actions: {
      marginTop: 'auto',
      gap: 10,
    },
    button: {
      minHeight: 52,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 14,
      borderWidth: 1.5,
    },
    primaryButton: {
      borderColor: colors.primary,
      backgroundColor: colors.primaryMuted,
    },
    secondaryButton: {
      borderColor: Colors.cardBorder,
      backgroundColor: Colors.card,
    },
    primaryText: {
      color: colors.primary,
      fontSize: 18,
      fontWeight: '800',
    },
    secondaryText: {
      color: Colors.textSecondary,
      fontSize: 16,
      fontWeight: '700',
    },
  });
