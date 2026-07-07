import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Animated } from 'react-native';
import Svg, { Path, Defs, RadialGradient, Stop } from 'react-native-svg';
import { withAlpha } from '../../theme/accentThemes';

const DASH_COUNT = 28;
const INACTIVE_COLOR = 'rgba(255,255,255,0.14)';
// Layered-stroke glow (no SVG filters): wide faint pass + tighter falloff
// under the crisp arc. Spec in docs/DESIGN-SYSTEM.md — keep in sync with
// MacroRing.
const GLOW_OUTER_SCALE = 2.6;
const GLOW_OUTER_ALPHA = 0.14;
const GLOW_INNER_SCALE = 1.6;
const GLOW_INNER_ALPHA = 0.22;
const BED_ALPHA = 0.06;

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

interface CalorieGaugeProps {
  consumed: number;
  target: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}

export default function CalorieGauge({
  consumed,
  target,
  color,
  size = 128,
  strokeWidth = 10,
}: CalorieGaugeProps) {
  const progress = target > 0 ? Math.min(consumed / target, 1) : 0;
  const animValue = useRef(new Animated.Value(0)).current;
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: progress,
      duration: 120,
      useNativeDriver: false,
    }).start();
  }, [progress, animValue]);

  useEffect(() => {
    const listener = animValue.addListener(({ value }) => setDisplayProgress(value));
    return () => animValue.removeListener(listener);
  }, [animValue]);

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - strokeWidth / 2;

  // Top hemisphere (upper semicircle): 180° to 360° — continuous instrument arc
  const topArcPath = useMemo(() => {
    const startDeg = 180;
    const endDeg = 180 + 180 * displayProgress;
    return endDeg > startDeg ? describeArc(cx, cy, r, startDeg, endDeg) : '';
  }, [cx, cy, r, displayProgress]);

  // Bottom hemisphere (lower semicircle): 0° to 180° — radial dash segments
  // Equal gap spacing: junction gaps (top↔bottom) = internal gaps between dashes
  const bottomDashPaths = useMemo(() => {
    const paths: { path: string; index: number }[] = [];
    const totalDeg = 180;
    const gapRatio = 0.44; // 44% gap
    const dashRatio = 0.56; // 56% dash
    // (DASH_COUNT+1) gaps + DASH_COUNT dashes = 180°, gaps equal to internal spacing
    const gapSpan = totalDeg / ((DASH_COUNT + 1) + DASH_COUNT * (dashRatio / gapRatio));
    const dashSpan = gapSpan * (dashRatio / gapRatio);

    for (let i = 0; i < DASH_COUNT; i++) {
      const startDeg = gapSpan + i * (dashSpan + gapSpan);
      const endDeg = startDeg + dashSpan;
      paths.push({
        path: describeArc(cx, cy, r, startDeg, endDeg),
        index: i,
      });
    }
    return paths;
  }, [cx, cy, r]);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Defs>
          {/* Accent-tinted bed — the dial sits in a soft pool of its color. */}
          <RadialGradient id="gaugeBg" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={withAlpha(color, BED_ALPHA)} stopOpacity="1" />
            <Stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Path
          d={`M ${cx} ${cy} m 0 ${-r} a ${r} ${r} 0 0 1 0 ${r * 2} a ${r} ${r} 0 0 1 0 ${-r * 2}`}
          fill="url(#gaugeBg)"
        />
        {/* Glow under the top arc (two layered strokes, wide → tight) */}
        <Path
          d={describeArc(cx, cy, r, 180, 360)}
          stroke={withAlpha(color, GLOW_OUTER_ALPHA)}
          strokeWidth={strokeWidth * GLOW_OUTER_SCALE}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={describeArc(cx, cy, r, 180, 360)}
          stroke={withAlpha(color, GLOW_INNER_ALPHA)}
          strokeWidth={strokeWidth * GLOW_INNER_SCALE}
          strokeLinecap="round"
          fill="none"
        />
        {/* Top half: continuous accent arc (always visible) */}
        <Path
          d={describeArc(cx, cy, r, 180, 360)}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          fill="none"
        />
        {/* Bottom half: inactive dash segments (flat ends, instrument-style) */}
        {bottomDashPaths.map(({ path, index }) => (
          <Path
            key={`inactive-${index}`}
            d={path}
            stroke={INACTIVE_COLOR}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            fill="none"
          />
        ))}
        {/* Top half: progress arc (fills over grey track) */}
        {topArcPath ? (
          <Path
            d={topArcPath}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            fill="none"
          />
        ) : null}
        {/* Bottom half: active dashes (fill clockwise: 0° → 90° → 180°) */}
        {bottomDashPaths.map(({ path, index }) => {
          const threshold = (index + 1) / DASH_COUNT;
          const isActive = displayProgress >= threshold;
          return isActive ? (
            <React.Fragment key={`active-${index}`}>
              <Path
                d={path}
                stroke={withAlpha(color, GLOW_INNER_ALPHA)}
                strokeWidth={strokeWidth * GLOW_INNER_SCALE}
                strokeLinecap="round"
                fill="none"
              />
              <Path
                d={path}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="butt"
                fill="none"
              />
            </React.Fragment>
          ) : null;
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
