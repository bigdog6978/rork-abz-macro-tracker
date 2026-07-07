import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { Motion, Shadows } from '../../theme/tokens';
import Colors from '../../constants/colors';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import { playFeedback } from '../../utils/interactionFeedback';
import PhysiqPressable from './PhysiqPressable';

export interface FabAction {
  key: string;
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
}

interface FabProps {
  onPress: () => void;
  /** Long-press quick actions (spring up above the FAB). Tap is unchanged. */
  actions?: FabAction[];
  icon?: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
}

export default function Fab({
  onPress,
  actions,
  icon,
  testID,
  accessibilityLabel = 'Add food',
}: FabProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [actionsOpen, setActionsOpen] = useState(false);
  const springAnim = useRef(new Animated.Value(0)).current;

  const closeActions = useCallback(() => {
    Animated.timing(springAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(
      ({ finished }) => {
        if (finished) setActionsOpen(false);
      }
    );
  }, [springAnim]);

  const handlePress = useCallback(() => {
    if (actionsOpen) {
      closeActions();
      return;
    }
    onPress();
  }, [actionsOpen, closeActions, onPress]);

  const handleLongPress = useCallback(() => {
    if (!actions || actions.length === 0) return;
    playFeedback('select');
    setActionsOpen(true);
    Animated.spring(springAnim, {
      toValue: 1,
      tension: Motion.pressSpring.tension,
      friction: Motion.pressSpring.friction,
      useNativeDriver: true,
    }).start();
  }, [actions, springAnim]);

  const handleActionPress = useCallback(
    (action: FabAction) => {
      closeActions();
      action.onPress();
    },
    [closeActions]
  );

  return (
    <>
      {actionsOpen && (
        <PhysiqPressable
          feedback="tap"
          style={StyleSheet.absoluteFill}
          onPress={closeActions}
          accessibilityLabel="Close quick actions"
        >
          <View />
        </PhysiqPressable>
      )}
      {actionsOpen && actions && (
        <Animated.View
          style={[
            styles.actionsColumn,
            {
              opacity: springAnim,
              transform: [
                {
                  translateY: springAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }),
                },
              ],
            },
          ]}
        >
          {actions.map((action) => (
            <PhysiqPressable
              key={action.key}
              feedback="select"
              style={styles.actionRow}
              onPress={() => handleActionPress(action)}
              accessibilityRole="button"
              accessibilityLabel={action.label}
            >
              <Text style={styles.actionLabel}>{action.label}</Text>
              <View style={styles.actionIcon}>{action.icon}</View>
            </PhysiqPressable>
          ))}
        </Animated.View>
      )}
      <PhysiqPressable
        feedback="confirm"
        onPress={handlePress}
        onLongPress={actions && actions.length > 0 ? handleLongPress : undefined}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityHint={
          actions && actions.length > 0 ? 'Long press for quick actions' : undefined
        }
        style={styles.fab}
      >
        {icon ?? <Plus size={26} color={colors.onPrimary} />}
      </PhysiqPressable>
    </>
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
  actionsColumn: {
    position: 'absolute',
    bottom: 92,
    right: 20,
    alignItems: 'flex-end',
    gap: 10,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  actionLabel: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '700' as const,
    backgroundColor: Colors.cardElevated,
    borderColor: Colors.cardBorder,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    overflow: 'hidden',
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Shadows.card as Record<string, unknown>),
  },
});
