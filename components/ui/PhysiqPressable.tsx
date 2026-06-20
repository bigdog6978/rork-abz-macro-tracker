import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Motion } from '../../theme/tokens';
import {
  type FeedbackIntent,
  getPressScale,
  initReduceMotionListener,
  isReduceMotionEnabled,
  playFeedback,
} from '../../utils/interactionFeedback';

export interface PhysiqPressableProps extends Omit<PressableProps, 'style'> {
  feedback?: FeedbackIntent;
  /** Skip scale animation while keeping haptic + sound. */
  disableScale?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export default function PhysiqPressable({
  feedback = 'tap',
  disableScale = false,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  style,
  children,
  accessibilityRole = 'button',
  ...rest
}: PhysiqPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const reduceMotionRef = useRef(isReduceMotionEnabled());

  useEffect(() => {
    void initReduceMotionListener().then((enabled) => {
      reduceMotionRef.current = enabled;
    });
  }, []);

  const animateTo = useCallback(
    (toValue: number) => {
      if (disabled || disableScale || reduceMotionRef.current) return;
      Animated.spring(scale, {
        toValue,
        ...Motion.pressSpring,
      }).start();
    },
    [disableScale, disabled, scale]
  );

  const handlePressIn = useCallback(
    (event: Parameters<NonNullable<PressableProps['onPressIn']>>[0]) => {
      if (!disabled) {
        playFeedback(feedback);
        animateTo(getPressScale(feedback));
      }
      onPressIn?.(event);
    },
    [animateTo, disabled, feedback, onPressIn]
  );

  const handlePressOut = useCallback(
    (event: Parameters<NonNullable<PressableProps['onPressOut']>>[0]) => {
      animateTo(1);
      onPressOut?.(event);
    },
    [animateTo, onPressOut]
  );

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, disabled ? { opacity: 0.5 } : null]}
    >
      <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>
    </Pressable>
  );
}
