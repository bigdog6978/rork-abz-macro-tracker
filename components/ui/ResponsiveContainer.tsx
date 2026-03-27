import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';

const MAX_CONTENT_WIDTH = 700;
const TABLET_BREAKPOINT = 768;

export function useIsTablet(): boolean {
  const { width } = useWindowDimensions();
  return width >= TABLET_BREAKPOINT;
}

interface ResponsiveContainerProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function ResponsiveContainer({ children, style }: ResponsiveContainerProps) {
  return (
    <View style={[styles.wrapper, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    maxWidth: MAX_CONTENT_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
});
