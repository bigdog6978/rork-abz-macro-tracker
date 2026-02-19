import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Colors from '../constants/colors';

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
  return (
    <View style={[styles.track, style]} accessibilityLabel={accessibilityLabel}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.segment, selected && styles.segmentSelected]}
            onPress={() => onChange(option.value)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
    minWidth: 44,
  },
  segmentSelected: {
    backgroundColor: Colors.primary,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  labelSelected: {
    color: Colors.white,
  },
});

export default SegmentedToggle;
