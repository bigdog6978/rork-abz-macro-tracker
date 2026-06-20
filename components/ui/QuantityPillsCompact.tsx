/**
 * Compact Amount/Quantity input with 2-column layout:
 * - Left: fixed-width qty input pill
 * - Right: UnitKind (Wt/Vol/Srv) + unit pills (ml/fl oz/cup etc.)
 *
 * All pills share identical height; no text wrapping.
 */
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  useWindowDimensions,
  Platform,
} from 'react-native';
import PhysiqPressable from './PhysiqPressable';
import { MoreVertical } from 'lucide-react-native';
import Colors from '../../constants/colors';
import type { UnitId, UnitKind } from '../../src/lib/units';
import { MASS_UNITS, VOLUME_UNITS, SERVING_UNITS } from '../../src/lib/units';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';

const PRIMARY_MASS = MASS_UNITS;
const PRIMARY_VOLUME = ['ml', 'fl_oz', 'cup'] as UnitId[];
const MORE_VOLUME = ['l', 'tbsp', 'tsp'] as UnitId[];
const PRIMARY_SERVING = SERVING_UNITS;

// Shared layout constants
const PILL_H = 40;
const RADIUS = 16;
const GAP = 12;
const ROW_GAP = 6;
const QTY_WIDTH = 150;
const QTY_WIDTH_MAX = 160;
const QTY_HEIGHT = 56;
const MORE_BTN_WIDTH = 40;
const PILL_FONT_SIZE = 14;

const KIND_LABELS: Record<UnitKind, string> = {
  mass: 'Wt',
  volume: 'Vol',
  serving: 'Srv',
};

const UNIT_LABELS: Record<UnitId, string> = {
  g: 'g',
  oz: 'oz',
  lb: 'lb',
  ml: 'ml',
  l: 'L',
  fl_oz: 'fl oz',
  cup: 'cup',
  tbsp: 'tbsp',
  tsp: 'tsp',
  serving: 'serv',
  piece: 'pcs',
};

interface QuantityPillsCompactProps {
  value: string;
  unit: UnitId;
  kind: UnitKind;
  onValueChange: (v: string) => void;
  onUnitChange: (unit: UnitId) => void;
  onKindChange: (kind: UnitKind) => void;
  servingWeightG?: number;
  onServingWeightChange?: (g: number) => void;
  showPerItemRow?: boolean;
  unitLabel?: string;
}

export default function QuantityPillsCompact({
  value,
  unit,
  kind,
  onValueChange,
  onUnitChange,
  onKindChange,
  servingWeightG = 50,
  onServingWeightChange,
  showPerItemRow = false,
  unitLabel = 'item',
}: QuantityPillsCompactProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [moreVisible, setMoreVisible] = useState(false);
  const { width: screenWidth } = useWindowDimensions();

  const qtyWidth = Math.min(QTY_WIDTH_MAX, Math.max(120, screenWidth * 0.4));

  const primaryUnits = kind === 'mass' ? PRIMARY_MASS : kind === 'volume' ? PRIMARY_VOLUME : PRIMARY_SERVING;
  const displayUnits =
    kind === 'volume' && MORE_VOLUME.includes(unit)
      ? [PRIMARY_VOLUME[0], PRIMARY_VOLUME[1], unit]
      : primaryUnits;

  const handleKindChange = (k: UnitKind) => {
    onKindChange(k);
    if (k === 'mass') onUnitChange('g');
    else if (k === 'volume') onUnitChange('ml');
    else onUnitChange('serving');
  };

  const handleUnitChange = (u: UnitId) => {
    onUnitChange(u);
    if (moreVisible) setMoreVisible(false);
  };

  const openMore = () => {
    setMoreVisible(true);
  };

  const pillBase = [styles.pill, { height: PILL_H }];
  const pillTextBase = [styles.pillText, { fontSize: PILL_FONT_SIZE, lineHeight: PILL_FONT_SIZE + 4 }];

  return (
    <View style={styles.wrap}>
      <View style={[styles.row, { gap: GAP }]}>
        {/* Left: Qty input pill */}
        <TextInput
          style={[
            styles.inputPill,
            {
              width: qtyWidth,
              height: QTY_HEIGHT,
              borderRadius: RADIUS,
            },
          ]}
          value={value}
          onChangeText={onValueChange}
          keyboardType="decimal-pad"
          placeholder="Qty"
          placeholderTextColor={Colors.textTertiary}
          accessibilityLabel="Quantity amount"
        />

        {/* Right: Unit controls */}
        <View style={styles.unitColumn}>
          {/* Row 1: UnitKind (Wt / Vol / Srv) */}
          <View style={[styles.tierA, { height: PILL_H + 4, borderRadius: RADIUS - 2 }]}>
            {(['mass', 'volume', 'serving'] as UnitKind[]).map((k) => (
              <PhysiqPressable
                key={k}
                feedback="select"
                style={[
                  ...pillBase,
                  styles.kindPill,
                  kind === k && styles.pillSelected,
                ]}
                onPress={() => handleKindChange(k)}
                accessibilityLabel={`${KIND_LABELS[k]} - ${k}`}
                accessibilityState={{ selected: kind === k }}
              >
                <Text
                  style={[...pillTextBase, kind === k ? styles.pillTextSelected : styles.pillTextInactive]}
                  numberOfLines={1}
                  ellipsizeMode="clip"
                >
                  {KIND_LABELS[k]}
                </Text>
              </PhysiqPressable>
            ))}
          </View>

          {/* Row 2: Unit pills + More */}
          <View style={[styles.tierB, { gap: ROW_GAP }]}>
            <View style={styles.unitGrid}>
              {displayUnits.map((u) => (
                <PhysiqPressable
                  key={u}
                  feedback="select"
                  style={[
                    ...pillBase,
                    styles.unitPill,
                    unit === u && styles.pillSelected,
                  ]}
                  onPress={() => handleUnitChange(u)}
                  accessibilityLabel={UNIT_LABELS[u]}
                  accessibilityState={{ selected: unit === u }}
                >
                  <Text
                    style={[...pillTextBase, unit === u ? styles.pillTextSelected : styles.pillTextInactive]}
                    numberOfLines={1}
                    ellipsizeMode="clip"
                  >
                    {UNIT_LABELS[u]}
                  </Text>
                </PhysiqPressable>
              ))}
            </View>
            {kind === 'volume' && (
              <PhysiqPressable
                feedback="tap"
                style={[styles.moreBtn, { width: MORE_BTN_WIDTH }]}
                onPress={openMore}
                accessibilityLabel="More volume units"
              >
                <MoreVertical size={20} color={colors.primary} />
              </PhysiqPressable>
            )}
          </View>
        </View>
      </View>

      {showPerItemRow && kind === 'serving' && (
        <View style={styles.perItemRow}>
          <Text style={styles.perItemLabel}>1 {unitLabel} =</Text>
          <TextInput
            style={styles.perItemInput}
            value={String(servingWeightG)}
            onChangeText={(t) => onServingWeightChange?.(parseFloat(t) || 50)}
            keyboardType="decimal-pad"
            placeholder="50"
            placeholderTextColor={Colors.textTertiary}
          />
          <Text style={styles.perItemUnit}>g</Text>
        </View>
      )}

      <Modal
        visible={moreVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMoreVisible(false)}
      >
        <Pressable style={styles.moreOverlay} onPress={() => setMoreVisible(false)}>
          <Pressable onPress={() => {}} style={styles.moreSheet}>
            <View style={styles.moreHandle} />
            <Text style={styles.moreTitle}>Volume units</Text>
            {MORE_VOLUME.map((u) => (
              <PhysiqPressable
                key={u}
                feedback="select"
                style={[styles.moreItem, unit === u && styles.moreItemSelected]}
                onPress={() => handleUnitChange(u)}
                accessibilityLabel={UNIT_LABELS[u]}
              >
                <Text
                  style={[styles.moreItemText, unit === u && styles.moreItemTextSelected]}
                  numberOfLines={1}
                >
                  {UNIT_LABELS[u]}
                </Text>
              </PhysiqPressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  wrap: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputPill: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 14,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  unitColumn: {
    flex: 1,
    gap: ROW_GAP,
  },
  tierA: {
    flexDirection: 'row',
    backgroundColor: Colors.cardElevated,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  kindPill: {
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 8,
    borderRadius: RADIUS - 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tierB: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unitGrid: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  unitPill: {
    flex: 1,
    minWidth: 48,
    paddingVertical: 0,
    paddingHorizontal: 6,
    borderRadius: RADIUS - 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pill: {
    minHeight: PILL_H,
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontWeight: '600' as const,
  },
  pillTextInactive: {
    color: Colors.textSecondary,
  },
  pillTextSelected: {
    color: colors.onPrimary,
  },
  moreBtn: {
    paddingVertical: 0,
    height: PILL_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  perItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  perItemLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  perItemInput: {
    width: 60,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: Colors.text,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  perItemUnit: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  moreOverlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  moreSheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 34,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.cardBorder,
  },
  moreHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  moreTitle: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
    marginBottom: 12,
  },
  moreItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.cardElevated,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  moreItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryMuted,
  },
  moreItemText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  moreItemTextSelected: {
    color: colors.primary,
  },
});
