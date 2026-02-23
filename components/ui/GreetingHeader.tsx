import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Colors from '../../constants/colors';
import { getGreeting, getMotivationHook, ProgressLevel } from '../../utils/greeting';
import { useFadeIn } from '../../utils/motion';

interface GreetingHeaderProps {
  firstName?: string | null;
  showHook?: boolean;
  progress?: ProgressLevel;
  statusText?: string;
  variant?: 'default' | 'compact';
}

export default function GreetingHeader({
  firstName,
  showHook = true,
  progress = 'none',
  statusText,
  variant = 'default',
}: GreetingHeaderProps) {
  const fadeAnim = useFadeIn();
  const greeting = getGreeting(firstName);
  const hook = getMotivationHook(progress);
  const isCompact = variant === 'compact';

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }, isCompact && styles.compact]}>
      <Text style={[styles.greeting, isCompact && styles.greetingCompact]}>{greeting}</Text>
      {showHook && (
        <Text style={styles.hook}>{hook}</Text>
      )}
      {statusText ? (
        <Text style={styles.status}>{statusText}</Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 4,
  },
  compact: {
    paddingBottom: 2,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '800' as const,
    color: Colors.text,
  },
  greetingCompact: {
    fontSize: 20,
  },
  hook: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textTertiary,
    marginTop: 4,
  },
  status: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginTop: 4,
  },
});
