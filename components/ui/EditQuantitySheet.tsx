import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TouchableOpacity,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Minus, Plus } from 'lucide-react-native';
import Colors from '../../constants/colors';
import { formatNumber } from '../../utils/formatNumber';
import { scaleMacros, QuantityInfo } from '../../utils/quantityUtils';

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
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      setQty(next);
    }
  }, [qty, step]);

  const handleIncrement = useCallback(() => {
    const next = qty + step;
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setQty(next);
  }, [qty, step]);

  const handleSave = useCallback(() => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
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
      <Pressable style={styles.overlay} onPress={onCancel}>
        <Pressable onPress={() => {}} style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Edit quantity</Text>
          <Text style={styles.subtitle}>{foodName}</Text>

          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={handleDecrement}
              disabled={qty <= step}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Minus size={20} color={qty <= step ? Colors.textTertiary : Colors.text} />
            </TouchableOpacity>
            <Text style={styles.qtyValue}>
              {isCountBased ? Math.round(qty) : (qty % 1 === 0 ? qty : parseFloat(qty.toFixed(1)))} {unit}
            </Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={handleIncrement}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Plus size={20} color={Colors.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.preview}>
            {formatNumber(calories)} cal · {formatNumber(protein_g)}P · {formatNumber(carbs_g)}C · {formatNumber(fat_g)}F
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.7}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: '600' as const,
  },
});
