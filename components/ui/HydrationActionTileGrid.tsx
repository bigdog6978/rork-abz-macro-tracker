import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '../../constants/colors';
import PhysiqPressable from './PhysiqPressable';
import {
  DAY_TYPE_TILE_GAP,
  DAY_TYPE_TILE_RADIUS,
} from './DayTypeTileGrid';
import {
  hydrationActionAccessibilityLabel,
  hydrationActionGrid,
  type HydrationGridAction,
  type HydrationUnit,
} from '../../utils/hydration';

export function hydrationActionGridSize(tileSide: number): { width: number; height: number } {
  const span = tileSide * 2 + DAY_TYPE_TILE_GAP;
  return { width: span, height: span };
}

type TileProps = {
  action: HydrationGridAction;
  tileSide: number;
  labelSize: number;
  disabled: boolean;
  styles: ReturnType<typeof createStyles>;
  onAction: (mlDelta: number) => void;
};

function HydrationActionTile({ action, tileSide, labelSize, disabled, styles, onAction }: TileProps) {
  const [pressed, setPressed] = useState(false);
  const isRemove = action.direction === 'remove';
  const mlDelta = isRemove ? -action.ml : action.ml;
  const isActive = pressed && !disabled;

  const handlePressIn = useCallback(() => {
    if (!disabled) setPressed(true);
  }, [disabled]);

  const handlePressOut = useCallback(() => {
    setPressed(false);
  }, []);

  const handlePress = useCallback(() => {
    onAction(mlDelta);
  }, [mlDelta, onAction]);

  const labelColor = isActive
    ? Colors.background
    : isRemove
      ? Colors.textSecondary
      : Colors.hydration;

  return (
    <PhysiqPressable
      feedback={isRemove ? 'tap' : 'select'}
      disabled={disabled}
      style={[
        styles.tile,
        { width: tileSide, height: tileSide },
        isActive ? styles.tilePressed : isRemove ? styles.tileRemove : styles.tileAdd,
        disabled && styles.tileDisabled,
      ]}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={hydrationActionAccessibilityLabel(action)}
      accessibilityState={{ disabled }}
    >
      <Text
        style={[
          styles.tileLabel,
          {
            fontSize: labelSize,
            lineHeight: Math.round(labelSize * 1.15),
            color: labelColor,
          },
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {action.label}
      </Text>
    </PhysiqPressable>
  );
}

type Props = {
  unit: HydrationUnit;
  consumedMl: number;
  onAction: (mlDelta: number) => void;
  tileSide: number;
};

export default function HydrationActionTileGrid({ unit, consumedMl, onAction, tileSide }: Props) {
  const styles = useMemo(() => createStyles(), []);
  const actions = useMemo(() => hydrationActionGrid(unit), [unit]);
  const labelSize = Math.max(9, Math.round(tileSide * 0.16));
  const row0 = actions.slice(0, 2);
  const row1 = actions.slice(2, 4);
  const { width, height } = hydrationActionGridSize(tileSide);

  const renderTile = (action: HydrationGridAction) => {
    const isRemove = action.direction === 'remove';
    const disabled = isRemove && consumedMl <= 0;

    return (
      <HydrationActionTile
        key={action.label}
        action={action}
        tileSide={tileSide}
        labelSize={labelSize}
        disabled={disabled}
        styles={styles}
        onAction={onAction}
      />
    );
  };

  return (
    <View style={[styles.grid, { width, height }]}>
      <View style={styles.gridRow}>{row0.map(renderTile)}</View>
      <View style={styles.gridRow}>{row1.map(renderTile)}</View>
    </View>
  );
}

const createStyles = () =>
  StyleSheet.create({
    grid: {
      gap: DAY_TYPE_TILE_GAP,
    },
    gridRow: {
      flexDirection: 'row',
      gap: DAY_TYPE_TILE_GAP,
    },
    tile: {
      borderRadius: DAY_TYPE_TILE_RADIUS,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      paddingHorizontal: 4,
    },
    tileAdd: {
      borderColor: Colors.hydration,
      backgroundColor: Colors.hydrationMuted,
    },
    tileRemove: {
      borderColor: Colors.cardBorder,
      backgroundColor: Colors.card,
    },
    tilePressed: {
      borderColor: Colors.hydration,
      backgroundColor: Colors.hydration,
    },
    tileDisabled: {
      opacity: 0.4,
    },
    tileLabel: {
      width: '100%',
      fontWeight: '700' as const,
      textAlign: 'center' as const,
    },
  });
