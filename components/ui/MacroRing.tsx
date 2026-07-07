import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { withAlpha } from '../../theme/accentThemes';
import { Type } from '../../theme/typography';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import { formatNumber } from '../../utils/formatNumber';

const TRACK_COLOR = 'rgba(255,255,255,0.14)';
const DASH_COUNT = 20;
const GAP_RATIO = 0.44;
const DASH_RATIO = 0.56;
// Layered-stroke glow — keep in sync with CalorieGauge / DESIGN-SYSTEM.md.
const GLOW_OUTER_SCALE = 2.6;
const GLOW_OUTER_ALPHA = 0.14;
const GLOW_INNER_SCALE = 1.6;
const GLOW_INNER_ALPHA = 0.22;

function polarToCartesian(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number, clockwise = true) {
  const start = polarToCartesian(cx, cy, r, startDeg);
  const end = polarToCartesian(cx, cy, r, endDeg);
  const sweep = clockwise ? 1 : 0;
  const diff = endDeg - startDeg;
  const largeArc = (diff > 0 ? diff : diff + 360) <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
}

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
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    Animated.spring(animValue, {
      toValue: progress,
      useNativeDriver: false,
      tension: 40,
      friction: 12,
    }).start();
  }, [progress, animValue]);

  useEffect(() => {
    const listener = animValue.addListener(({ value }) => setDisplayProgress(value));
    return () => animValue.removeListener(listener);
  }, [animValue]);

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - strokeWidth / 2;

  const topArcPath = useMemo(() => describeArc(cx, cy, r, 180, 360, true), [cx, cy, r]);

  // Bottom half: radial dash segments (matches calorie dial)
  const bottomDashPaths = useMemo(() => {
    const paths: { path: string; index: number }[] = [];
    const totalDeg = 180;
    const gapSpan =
      totalDeg / ((DASH_COUNT + 1) + DASH_COUNT * (DASH_RATIO / GAP_RATIO));
    const dashSpan = gapSpan * (DASH_RATIO / GAP_RATIO);
    for (let i = 0; i < DASH_COUNT; i++) {
      const startDeg = gapSpan + i * (dashSpan + gapSpan);
      const endDeg = startDeg + dashSpan;
      paths.push({
        path: describeArc(cx, cy, r, startDeg, endDeg, true),
        index: i,
      });
    }
    return paths;
  }, [cx, cy, r]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Glow under the locked top arc (wide faint + tight falloff) */}
        <Path
          d={topArcPath}
          stroke={withAlpha(color, GLOW_OUTER_ALPHA)}
          strokeWidth={strokeWidth * GLOW_OUTER_SCALE}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d={topArcPath}
          stroke={withAlpha(color, GLOW_INNER_ALPHA)}
          strokeWidth={strokeWidth * GLOW_INNER_SCALE}
          strokeLinecap="round"
          fill="none"
        />
        {/* Top half: locked, always visible in macro color */}
        <Path
          d={topArcPath}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
          fill="none"
        />
        {/* Bottom half: inactive dash segments (matches calorie dial) */}
        {bottomDashPaths.map(({ path, index }) => (
          <Path
            key={`inactive-${index}`}
            d={path}
            stroke={TRACK_COLOR}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            fill="none"
          />
        ))}
        {/* Bottom half: active dashes (fill clockwise as progress increases) */}
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
  const colors = useThemeColors();
  const dialStyles = useMemo(() => createDialStyles(colors), [colors]);
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
          <Text style={[dialStyles.percent, { color }]} maxFontSizeMultiplier={1.3}>
            {percent}%
          </Text>
        </View>
      </View>
      <Text style={dialStyles.label}>{label}</Text>
      <Text style={dialStyles.target} maxFontSizeMultiplier={1.3}>
        {formatNumber(consumed)}g / {formatNumber(target)}g
      </Text>
    </View>
  );
}

const createDialStyles = (colors: AppColors) =>
  StyleSheet.create({
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
      ...Type.numeric,
      fontSize: 16,
      lineHeight: 19,
    },
    label: {
      ...Type.bodySm,
      fontWeight: '600' as const,
      color: colors.text,
      marginTop: 8,
    },
    target: {
      ...Type.numeric,
      fontSize: 11,
      lineHeight: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
  });
