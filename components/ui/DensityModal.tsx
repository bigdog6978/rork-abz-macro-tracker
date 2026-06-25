import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Modal,
  Pressable,
  StyleSheet,
  Keyboard,
} from 'react-native';
import { X } from 'lucide-react-native';
import PhysiqPressable from './PhysiqPressable';
import Colors from '../../constants/colors';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';

interface DensityModalProps {
  visible: boolean;
  initialValue?: number | null;
  onSave: (density: number) => void;
  onCancel: () => void;
}

const MIN_DENSITY = 0.01;
const MAX_DENSITY = 3.0;

export default function DensityModal({
  visible,
  initialValue,
  onSave,
  onCancel,
}: DensityModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [input, setInput] = useState(
    initialValue != null && initialValue > 0 ? String(initialValue) : ''
  );
  const [error, setError] = useState<string | null>(null);

  const handleSave = () => {
    const val = parseFloat(input.replace(',', '.'));
    if (isNaN(val) || val <= 0 || val > MAX_DENSITY) {
      setError('Enter a valid density (0.01–3.00).');
      return;
    }
    setError(null);
    onSave(val);
  };

  const handleCancel = () => {
    setError(null);
    onCancel();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <PhysiqPressable feedback="tap" style={styles.overlay} onPress={handleCancel}>
        <Pressable onPress={() => {}} style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.titleRow}>
            <Text style={styles.title}>Add density</Text>
            <PhysiqPressable
              feedback="tap"
              onPress={() => Keyboard.dismiss()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Dismiss keyboard"
            >
              <View style={styles.closeBtn}>
                <X size={16} color={Colors.textSecondary} />
              </View>
            </PhysiqPressable>
          </View>
          <Text style={styles.subheader}>
            Needed to convert volume → grams for accurate macros.
          </Text>
          <Text style={styles.label}>Density (g/ml)</Text>
          <TextInput
            style={[styles.input, error && styles.inputError]}
            value={input}
            onChangeText={(t) => {
              setInput(t);
              setError(null);
            }}
            keyboardType="decimal-pad"
            placeholder="e.g., 1.00"
            placeholderTextColor={Colors.textTertiary}
            accessibilityLabel="Density in grams per milliliter"
          />
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : (
            <Text style={styles.helper}>
              Quick reference: water = 1.00 g/ml • milk ≈ 1.03 • olive oil ≈ 0.91
            </Text>
          )}
          <View style={styles.actions}>
            <PhysiqPressable feedback="confirm" style={styles.primaryBtn} onPress={handleSave}>
              <Text style={styles.primaryText}>Save density</Text>
            </PhysiqPressable>
            <PhysiqPressable feedback="tap" style={styles.secondaryBtn} onPress={handleCancel}>
              <Text style={styles.secondaryText}>Not now</Text>
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
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700' as const,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.cardElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subheader: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginBottom: 16,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  inputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    color: Colors.danger,
    fontSize: 13,
    marginBottom: 12,
  },
  helper: {
    color: Colors.textTertiary,
    fontSize: 12,
    marginBottom: 20,
  },
  actions: {
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: colors.onPrimary,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  secondaryBtn: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  secondaryText: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500' as const,
  },
});
