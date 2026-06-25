import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ProDayTypeOverride } from '../../features/pro/types';
import {
  DAY_TYPE_PICKER_TILE_ORDER,
  DAY_TYPE_PICKER_SHORT_LABELS,
} from '../../features/pro/constants';
import Colors from '../../constants/colors';
import { blendHex, withAlpha } from '../../theme/accentThemes';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import PhysiqPressable from './PhysiqPressable';
import DayTypeTileIcon from './DayTypeTileIcon';

/** Matches watch WatchLayoutMetrics.todayTileGap */
export const DAY_TYPE_TILE_GAP = 4;
/** Matches watch WatchLayoutMetrics.tileCornerRadiusCap */
export const DAY_TYPE_TILE_RADIUS = 12;
/** Default square tile size for phone modal (watch uses dynamic todayTileSide). */
export const DAY_TYPE_TILE_SIDE_DEFAULT = 100;

type Props = {
  selectedId: ProDayTypeOverride;
  onSelect: (id: ProDayTypeOverride) => void;
  tileSide?: number;
};

export function dayTypeGridSize(tileSide: number): { width: number; height: number } {
  const span = tileSide * 2 + DAY_TYPE_TILE_GAP;
  return { width: span, height: span };
}

export default function DayTypeTileGrid({
  selectedId,
  onSelect,
  tileSide = DAY_TYPE_TILE_SIDE_DEFAULT,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const iconSize = Math.max(12, Math.round(tileSide * 0.22));
  const labelSize = Math.max(9, Math.round(tileSide * 0.14));

  const row0 = DAY_TYPE_PICKER_TILE_ORDER.slice(0, 2);
  const row1 = DAY_TYPE_PICKER_TILE_ORDER.slice(2, 4);

  const renderTile = (id: ProDayTypeOverride) => {
    const isSelected = selectedId === id;
    const label = DAY_TYPE_PICKER_SHORT_LABELS[id];
    const contentColor = isSelected ? Colors.background : colors.primary;

    return (
      <PhysiqPressable
        key={id}
        feedback="select"
        style={[
          styles.tile,
          { width: tileSide, height: tileSide },
          isSelected ? styles.tileSelected : styles.tileUnselected,
        ]}
        onPress={() => onSelect(id)}
        accessibilityRole="button"
        accessibilityLabel={`${label}${isSelected ? ', selected' : ''}`}
        accessibilityState={{ selected: isSelected }}
      >
        <View style={[styles.tileContent, { width: tileSide, height: tileSide }]}>
          <DayTypeTileIcon id={id} size={iconSize} color={contentColor} />
          <Text
            style={[
              styles.tileLabel,
              { fontSize: labelSize, lineHeight: Math.round(labelSize * 1.15), color: contentColor },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {label}
          </Text>
        </View>
      </PhysiqPressable>
    );
  };

  const { width, height } = dayTypeGridSize(tileSide);

  return (
    <View style={[styles.grid, { width, height }]}>
      <View style={styles.gridRow}>
        {row0.map(renderTile)}
      </View>
      <View style={styles.gridRow}>
        {row1.map(renderTile)}
      </View>
    </View>
  );
}

const createStyles = (colors: AppColors) => {
  const unselectedFill = blendHex(Colors.card, Colors.background, 0.35);

  return StyleSheet.create({
    grid: {
      gap: DAY_TYPE_TILE_GAP,
    },
    gridRow: {
      flexDirection: 'row',
      gap: DAY_TYPE_TILE_GAP,
    },
    tile: {
      borderRadius: DAY_TYPE_TILE_RADIUS,
      overflow: 'hidden',
    },
    tileContent: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
    },
    tileSelected: {
      backgroundColor: colors.primary,
      borderWidth: 0,
    },
    tileUnselected: {
      backgroundColor: unselectedFill,
      borderWidth: 1,
      borderColor: withAlpha(colors.primary, 0.5),
    },
    tileLabel: {
      width: '100%',
      fontWeight: '700' as const,
      textAlign: 'center' as const,
    },
  });
};
