import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import PhysiqPressable from './PhysiqPressable';
import Colors from '../../constants/colors';
import { formatNumber } from '../../utils/formatNumber';
import { scaleMacros, QuantityInfo } from '../../utils/quantityUtils';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';

interface EditQuantitySheetProps {
  visible: boolean;
  foodName: string;
  baseQty: number;
  baseCalories: number;
  baseProtein: number;
  baseCarbs: number;
  baseFat: number;
  quantityInfo: QuantityInfo;
  onSave: (newQty: number) => void;
  onCancel: () => void;
}

export default function EditQuantitySheet({
  visible,
  foodName,
  baseQty,
  baseCalories,
  baseProtein,
  baseCarbs,
  baseFat,
  quantityInfo,
  onSave,
  onCancel,
}: EditQuantitySheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [qty, setQty] = useState(baseQty);
  const { unit, step, isCountBased } = quantityInfo;

  const scale = baseQty > 0 ? qty / baseQty : 1;
  const { calories, protein_g, carbs_g, fat_g } = scaleMacros(
    baseCalories,
    baseProtein,
    baseCarbs,
    baseFat,
    scale
  );

  const handleDecrement = useCallback(() => {
    const next = Math.max(step, qty - step);
    if (next !== qty) {
      setQty(next);
    }
  }, [qty, step]);

  const handleIncrement = useCallback(() => {
    setQty(qty + step);
  }, [qty, step]);

  const handleSave = useCallback(() => {
    onSave(qty);
    onCancel();
  }, [qty, onSave, onCancel]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent
    >
      <PhysiqPressable feedback="tap" style={styles.overlay} onPress={onCancel}>
        <Pressable onPress={() => {}} style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Edit quantity</Text>
          <Text style={styles.subtitle}>{foodName}</Text>

          <View style={styles.stepperRow}>
            <PhysiqPressable
              feedback="select"
              style={styles.stepperBtn}
              onPress={handleDecrement}
              disabled={qty <= step}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Minus size={20} color={qty <= step ? Colors.textTertiary : Colors.text} />
            </PhysiqPressable>
            <Text style={styles.qtyValue}>
              {isCountBased ? Math.round(qty) : (qty % 1 === 0 ? qty : parseFloat(qty.toFixed(1)))} {unit}
            </Text>
            <PhysiqPressable
              feedback="select"
              style={styles.stepperBtn}
              onPress={handleIncrement}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Plus size={20} color={Colors.text} />
            </PhysiqPressable>
          </View>

          <Text style={styles.preview}>
            {formatNumber(calories)} cal · {formatNumber(protein_g)}P · {formatNumber(carbs_g)}C · {formatNumber(fat_g)}F
          </Text>

          <View style={styles.actions}>
            <PhysiqPressable feedback="tap" style={styles.cancelBtn} onPress={onCancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </PhysiqPressable>
            <PhysiqPressable feedback="confirm" style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveText}>Save</Text>
            </PhysiqPressable>
          </View>
        </Pressable>
      </PhysiqPressable>
    </Modal>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 34,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: Colors.cardBorder,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textTertiary,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 6,
  },
  title: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: '700' as const,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
    marginBottom: 20,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 12,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700' as const,
    minWidth: 80,
    textAlign: 'center',
  },
  preview: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  saveText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
