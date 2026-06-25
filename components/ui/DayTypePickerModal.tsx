import React, { useMemo } from 'react';
import { Modal, View, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import type { ProDayTypeOverride } from '../../features/pro/types';
import Colors from '../../constants/colors';
import { Radius } from '../../theme/tokens';
import PhysiqPressable from './PhysiqPressable';
import DayTypeTileGrid, {
  DAY_TYPE_TILE_GAP,
  DAY_TYPE_TILE_SIDE_DEFAULT,
  dayTypeGridSize,
} from './DayTypeTileGrid';

/** Inner padding between popup card edge and tile grid (all sides). */
const CARD_PADDING = 10;
/** Horizontal inset from screen edge when sizing tiles (24pt each side). */
const SCREEN_HORIZONTAL_MARGIN = 48;

type Props = {
  visible: boolean;
  selectedId: ProDayTypeOverride;
  onSelect: (id: ProDayTypeOverride) => void;
  onClose: () => void;
};

export default function DayTypePickerModal({ visible, selectedId, onSelect, onClose }: Props) {
  const { width: screenWidth } = useWindowDimensions();

  const tileSide = useMemo(() => {
    const maxGrid = screenWidth - SCREEN_HORIZONTAL_MARGIN - CARD_PADDING * 2;
    const fromScreen = Math.floor((maxGrid - DAY_TYPE_TILE_GAP) / 2);
    return Math.max(88, Math.min(DAY_TYPE_TILE_SIDE_DEFAULT, fromScreen));
  }, [screenWidth]);

  const cardSize = useMemo(() => {
    const grid = dayTypeGridSize(tileSide);
    return {
      width: grid.width + CARD_PADDING * 2,
      height: grid.height + CARD_PADDING * 2,
    };
  }, [tileSide]);

  const handleSelect = (id: ProDayTypeOverride) => {
    onSelect(id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.root}>
        <PhysiqPressable
          feedback="tap"
          style={styles.backdrop}
          onPress={onClose}
          accessibilityLabel="Close day type picker"
        >
          <View style={StyleSheet.absoluteFill} />
        </PhysiqPressable>
        <View style={styles.centered} pointerEvents="box-none">
          <Pressable
            onPress={() => {}}
            style={[styles.card, cardSize]}
            accessibilityViewIsModal
          >
            <DayTypeTileGrid
              selectedId={selectedId}
              onSelect={handleSelect}
              tileSide={tileSide}
            />
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: Colors.background,
    padding: CARD_PADDING,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
});
