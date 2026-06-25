import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  Platform,
} from 'react-native';
import PhysiqPressable from './PhysiqPressable';
import Colors from '../../constants/colors';
import type { UnitId, UnitKind } from '../../src/lib/units';
import { MASS_UNITS, VOLUME_UNITS, SERVING_UNITS } from '../../src/lib/units';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';

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

const PRIMARY_MASS = ['g', 'oz', 'lb'] as UnitId[];
const PRIMARY_VOLUME = ['ml', 'fl_oz', 'cup'] as UnitId[];
const MORE_VOLUME = ['l', 'tbsp', 'tsp'] as UnitId[];
const PRIMARY_SERVING = ['serving', 'piece'] as UnitId[];

interface QuantityPillsProps {
  value: string;
  unit: UnitId;
  kind: UnitKind;
  onValueChange: (v: string) => void;
  onUnitChange: (unit: UnitId) => void;
  onKindChange: (kind: UnitKind) => void;
  /** When kind is serving and unit is piece, optional per-item grams (e.g. 1 egg = 50g) */
  servingWeightG?: number;
  onServingWeightChange?: (g: number) => void;
  showPerItemRow?: boolean;
  unitLabel?: string;
}

export default function QuantityPills({
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
}: QuantityPillsProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [moreVolumeVisible, setMoreVolumeVisible] = useState(false);

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
    if (moreVolumeVisible) setMoreVolumeVisible(false);
  };

  const openMoreVolume = () => {
    setMoreVolumeVisible(true);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          style={styles.inputPill}
          value={value}
          onChangeText={onValueChange}
          keyboardType="decimal-pad"
          placeholder="Qty"
          placeholderTextColor={Colors.textTertiary}
          accessibilityLabel="Quantity amount"
        />
        <View style={styles.unitGroup}>
          <View style={styles.tierA}>
            {(['mass', 'volume', 'serving'] as UnitKind[]).map((k) => (
              <PhysiqPressable
                key={k}
                feedback="select"
                style={[styles.pill, kind === k && styles.pillSelected]}
                onPress={() => handleKindChange(k)}
                accessibilityLabel={`${KIND_LABELS[k]} - ${k}`}
                accessibilityState={{ selected: kind === k }}
              >
                <Text style={[styles.pillText, kind === k && styles.pillTextSelected]}>
                  {KIND_LABELS[k]}
                </Text>
              </PhysiqPressable>
            ))}
          </View>
          <View style={styles.tierB}>
            {displayUnits.map((u) => (
              <PhysiqPressable
                key={u}
                feedback="select"
                style={[styles.pill, unit === u && styles.pillSelected]}
                onPress={() => handleUnitChange(u)}
                accessibilityLabel={`${UNIT_LABELS[u]}`}
                accessibilityState={{ selected: unit === u }}
              >
                <Text style={[styles.pillText, unit === u && styles.pillTextSelected]}>
                  {UNIT_LABELS[u]}
                </Text>
              </PhysiqPressable>
            ))}
            {kind === 'volume' && (
              <PhysiqPressable
                feedback="tap"
                style={styles.moreBtn}
                onPress={openMoreVolume}
                accessibilityLabel="More volume units"
              >
                <Text style={styles.moreText}>More</Text>
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
        visible={moreVolumeVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMoreVolumeVisible(false)}
      >
        <PhysiqPressable feedback="tap" style={styles.moreOverlay} onPress={() => setMoreVolumeVisible(false)}>
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
                <Text style={[styles.moreItemText, unit === u && styles.moreItemTextSelected]}>
                  {UNIT_LABELS[u]}
                </Text>
              </PhysiqPressable>
            ))}
          </Pressable>
        </PhysiqPressable>
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
    gap: 10,
  },
  inputPill: {
    flex: 2,
    minWidth: 80,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  unitGroup: {
    flex: 3,
    gap: 6,
  },
  tierA: {
    flexDirection: 'row',
    backgroundColor: Colors.cardElevated,
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tierB: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  pillTextSelected: {
    color: colors.onPrimary,
  },
  moreBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  moreText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.primary,
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
