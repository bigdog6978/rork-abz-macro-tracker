import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { UtensilsCrossed } from 'lucide-react-native';
import Colors from '../../constants/colors';
import { useFadeIn } from '../../utils/motion';

interface EmptyStateProps {
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title = 'Fuel your day.',
  subtitle = 'Tap + to log your first meal.',
  icon,
}: EmptyStateProps) {
  const fadeAnim = useFadeIn(200);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.iconWrap}>
        {icon ?? <UtensilsCrossed size={40} color={Colors.textTertiary} strokeWidth={1} />}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  iconWrap: {
    opacity: 0.15,
    marginBottom: 16,
  },
  title: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  subtitle: {
    color: Colors.textTertiary,
    fontSize: 14,
    fontWeight: '500' as const,
    marginTop: 6,
  },
});
