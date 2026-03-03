import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../../constants/colors';

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
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setError(null);
    onSave(val);
  };

  const handleCancel = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
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
      <Pressable style={styles.overlay} onPress={handleCancel}>
        <Pressable onPress={() => {}} style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Add density</Text>
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
            <TouchableOpacity style={styles.primaryBtn} onPress={handleSave} activeOpacity={0.7}>
              <Text style={styles.primaryText}>Save density</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleCancel} activeOpacity={0.7}>
              <Text style={styles.secondaryText}>Not now</Text>
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
    marginBottom: 16,
  },
  title: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 4,
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
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryText: {
    color: Colors.white,
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
