import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Colors from '../constants/colors';
import { useThemeColors, type AppColors } from '../providers/ThemeProvider';
import PhysiqPressable from './ui/PhysiqPressable';

export interface SegmentOption<T extends string = string> {
  label: string;
  value: T;
}

interface SegmentedToggleProps<T extends string = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

function SegmentedToggle<T extends string = string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  style,
}: SegmentedToggleProps<T>) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.track, style]} accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <PhysiqPressable
            key={option.value}
            feedback="select"
            style={[styles.segment, selected && styles.segmentSelected]}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {option.label}
            </Text>
          </PhysiqPressable>
        );
      })}
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: Colors.cardElevated,
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  segment: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  segmentSelected: {
    backgroundColor: colors.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  labelSelected: {
    color: colors.onPrimary,
  },
});

export default SegmentedToggle;
