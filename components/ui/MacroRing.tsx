import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Colors from '../../constants/colors';
import { formatNumber } from '../../utils/formatNumber';

interface MacroRingProps {
  consumed: number;
  target: number;
  color: string;
  size: number;
  strokeWidth: number;
  showLabel?: boolean;
}

export default function MacroRing({
  consumed,
  target,
  color,
  size,
  strokeWidth,
  showLabel = false,
}: MacroRingProps) {
  const progress = target > 0 ? Math.min(consumed / target, 1) : 0;
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: progress,
      useNativeDriver: false,
      tension: 40,
      friction: 12,
    }).start();
  }, [progress, animValue]);

  return (
    <View style={{ width: size, height: size }}>
      <View
        style={[
          styles.trackRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.progressRing,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: strokeWidth,
            borderColor: color,
            transform: [
              {
                rotate: animValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['-45deg', '315deg'],
                }),
              },
            ],
          },
        ]}
      />
      {showLabel && (
        <View style={styles.glowOverlay}>
          <Animated.View
            style={[
              styles.glowDot,
              {
                backgroundColor: color,
                opacity: animValue.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0, 0.2, 0.35],
                }),
              },
            ]}
          />
        </View>
      )}
    </View>
  );
}

interface MacroDialProps {
  label: string;
  consumed: number;
  target: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}

export function MacroDial({
  label,
  consumed,
  target,
  color,
  size = 76,
  strokeWidth = 6,
}: MacroDialProps) {
  const percent = target > 0 ? Math.round((consumed / target) * 100) : 0;

  return (
    <View style={dialStyles.item}>
      <View style={[dialStyles.ringWrap, { width: size, height: size }]}>
        <MacroRing
          consumed={consumed}
          target={target}
          color={color}
          size={size}
          strokeWidth={strokeWidth}
          showLabel
        />
        <View style={dialStyles.center}>
          <Text style={[dialStyles.percent, { color }]}>{percent}%</Text>
        </View>
      </View>
      <Text style={dialStyles.label}>{label}</Text>
      <Text style={dialStyles.target}>
        {formatNumber(consumed)}g / {formatNumber(target)}g
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  trackRing: {
    borderColor: 'rgba(255,255,255,0.06)',
    position: 'absolute',
  },
  progressRing: {
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    position: 'absolute',
  },
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowDot: {
    width: '80%',
    height: '80%',
    borderRadius: 999,
  },
});

const dialStyles = StyleSheet.create({
  item: {
    flex: 1,
    alignItems: 'center',
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  percent: {
    fontSize: 15,
    fontWeight: '800' as const,
  },
  label: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
    marginTop: 8,
  },
  target: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 2,
  },
});
