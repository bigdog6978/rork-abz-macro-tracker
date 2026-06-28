import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Pressable,
  StyleSheet,
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

/** Applied to the inner animated wrapper so children receive flex layout. */
const INNER_LAYOUT_KEYS = new Set<keyof ViewStyle>([
  'flexDirection',
  'flexWrap',
  'alignItems',
  'alignContent',
  'justifyContent',
  'gap',
  'rowGap',
  'columnGap',
]);

function splitPressableStyles(style: StyleProp<ViewStyle>): {
  pressableStyle: ViewStyle;
  innerLayoutStyle: ViewStyle;
} {
  const flat = StyleSheet.flatten(style) ?? {};
  const pressableStyle: ViewStyle = {};
  const innerLayoutStyle: ViewStyle = {};

  for (const key of Object.keys(flat) as (keyof ViewStyle)[]) {
    const value = flat[key];
    if (value === undefined) continue;

    if (INNER_LAYOUT_KEYS.has(key)) {
      (innerLayoutStyle as Record<string, unknown>)[key] = value;
    } else {
      (pressableStyle as Record<string, unknown>)[key] = value;
    }
  }

  const hasInnerLayout = Object.keys(innerLayoutStyle).length > 0;
  if (hasInnerLayout) {
    innerLayoutStyle.alignSelf = innerLayoutStyle.alignSelf ?? 'stretch';
    if (
      flat.height != null ||
      flat.flex === 1 ||
      (typeof flat.flexGrow === 'number' && flat.flexGrow > 0)
    ) {
      innerLayoutStyle.flexGrow = innerLayoutStyle.flexGrow ?? 1;
    }
  }

  return { pressableStyle, innerLayoutStyle };
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

  const { pressableStyle, innerLayoutStyle } = useMemo(() => splitPressableStyles(style), [style]);

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
      style={[pressableStyle, disabled ? { opacity: 0.5 } : null]}
    >
      <Animated.View style={[innerLayoutStyle, { transform: [{ scale }] }]}>{children}</Animated.View>
    </Pressable>
  );
}
