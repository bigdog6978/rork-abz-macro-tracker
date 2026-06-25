import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Sparkles, PersonStanding, Trophy, Moon } from 'lucide-react-native';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';
import type { ProDayTypeOverride } from '../../features/pro/types';

/** Matches targets/watch/DayTypePicker.swift SF Symbol names. */
const SF_SYMBOLS: Record<ProDayTypeOverride, SFSymbol> = {
  auto: 'sparkles',
  training: 'figure.run',
  competition: 'trophy.fill',
  rest: 'moon.zzz.fill',
};

const LUCIDE_FALLBACKS = {
  auto: Sparkles,
  training: PersonStanding,
  competition: Trophy,
  rest: Moon,
} as const;

type Props = {
  id: ProDayTypeOverride;
  size: number;
  color: string;
};

export default function DayTypeTileIcon({ id, size, color }: Props) {
  const FallbackIcon = LUCIDE_FALLBACKS[id];

  return (
    <View style={[styles.slot, { width: size, height: size }]}>
      <SymbolView
        name={SF_SYMBOLS[id]}
        size={size}
        tintColor={color}
        weight="bold"
        scale="medium"
        resizeMode="scaleAspectFit"
        style={styles.symbol}
        fallback={
          <View style={styles.fallbackWrap}>
            <FallbackIcon size={size} color={color} strokeWidth={2.5} />
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  slot: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: {
    width: '100%',
    height: '100%',
  },
  fallbackWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
