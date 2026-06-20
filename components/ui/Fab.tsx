import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Shadows } from '../../theme/tokens';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import PhysiqPressable from './PhysiqPressable';

interface FabProps {
  onPress: () => void;
  icon?: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
}

export default function Fab({ onPress, icon, testID, accessibilityLabel = 'Add food' }: FabProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  return (
    <PhysiqPressable
      feedback="confirm"
      onPress={handlePress}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      style={styles.fab}
    >
      {icon ?? <Plus size={26} color={colors.onPrimary} />}
    </PhysiqPressable>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Shadows.fab as Record<string, unknown>),
  },
});
