import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Colors from '../../constants/colors';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';

type Props = {
  visible: boolean;
  onContinue: () => void;
  onNotNow: () => void;
};

export default function HealthPermissionModal({ visible, onContinue, onNotNow }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onNotNow}>
      <Pressable style={styles.overlay} onPress={onNotNow}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Apple Health access</Text>
          <Text style={styles.body}>
            Physiq uses activity, workout, heart rate, and sleep data from Apple Health to adapt
            macro and hydration targets.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onContinue}>
            <Text style={styles.primaryBtnText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={onNotNow}>
            <Text style={styles.secondaryBtnText}>Not now</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      padding: 20,
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    card: {
      borderRadius: 14,
      backgroundColor: Colors.card,
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      padding: 20,
    },
    title: {
      color: Colors.text,
      fontSize: 18,
      fontWeight: '700',
      marginBottom: 10,
      textAlign: 'center',
    },
    body: {
      color: Colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 20,
      textAlign: 'center',
    },
    primaryBtn: {
      borderRadius: 8,
      minHeight: 46,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      marginBottom: 10,
      paddingHorizontal: 24,
    },
    primaryBtnText: {
      color: colors.onPrimary,
      fontSize: 16,
      fontWeight: '600',
    },
    secondaryBtn: {
      borderRadius: 8,
      minHeight: 42,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      backgroundColor: 'transparent',
      paddingHorizontal: 24,
    },
    secondaryBtnText: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '600',
    },
  });

