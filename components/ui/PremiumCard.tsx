import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gradients, Radius, Shadows } from '../../theme/tokens';
import Colors from '../../constants/colors';

interface PremiumCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'hero';
}

export default function PremiumCard({
  children,
  style,
  variant = 'default',
}: PremiumCardProps) {
  const gradient = variant === 'hero' ? Gradients.hero : Gradients.card;
  const shadow = variant === 'hero' ? Shadows.cardElevated : Shadows.card;

  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.card,
        shadow as ViewStyle,
        variant === 'hero' && styles.hero,
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    overflow: 'hidden',
  },
  hero: {
    borderRadius: Radius.xl,
  },
});
