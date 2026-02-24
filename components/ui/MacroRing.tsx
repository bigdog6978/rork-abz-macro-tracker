import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Colors from '../../constants/colors';
import { formatNumber } from '../../utils/formatNumber';

const TRACK_COLOR = 'rgba(255,255,255,0.06)';

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
  const bottomArcPath = useMemo(() => describeArc(cx, cy, r, 0, 180, true), [cx, cy, r]);
  const progressArcPath = useMemo(() => {
    const endDeg = 0 + 180 * displayProgress;
    return endDeg > 0 ? describeArc(cx, cy, r, 0, endDeg, true) : '';
  }, [cx, cy, r, displayProgress]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        {/* Bottom half: grey track (always visible) */}
        <Path
          d={bottomArcPath}
          stroke={TRACK_COLOR}
          strokeWidth={strokeWidth}
          strokeLinecap="butt"
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
        {/* Bottom half: progress fills clockwise from upper arc (0° → 90° → 180°) */}
        {progressArcPath ? (
          <Path
            d={progressArcPath}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            fill="none"
          />
        ) : null}
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
          <Text style={[dialStyles.percent, { color }]}>{percent}%</Text>
        </View>
      </View>
      <Text style={dialStyles.label}>{label}</Text>
      <Text style={dialStyles.target}>
        {formatNumber(consumed)}g / {formatNumber(target)}g
      </Text>
    </View>
  );
}

const dialStyles = StyleSheet.create({
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
    fontSize: 15,
    fontWeight: '800' as const,
  },
  label: {
    color: Colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
    marginTop: 8,
  },
  target: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 2,
  },
});
