import { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import { Motion } from '../theme/tokens';

export function useStaggerFadeIn(count: number): Animated.Value[] {
  const anims = useRef<Animated.Value[]>(
    Array.from({ length: count }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: Motion.fadeInDuration,
        delay: i * Motion.staggerInterval,
        useNativeDriver: true,
      })
    );
    Animated.parallel(animations).start();
  }, [anims]);

  return anims;
}

export function useFadeIn(delay = 0): Animated.Value {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: Motion.fadeInDuration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [anim, delay]);

  return anim;
}
