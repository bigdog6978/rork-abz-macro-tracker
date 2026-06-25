import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Colors from '../../constants/colors';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import PhysiqPressable from './PhysiqPressable';

type Props = {
  visible: boolean;
  connecting?: boolean;
  onContinue: () => void;
  onNotNow: () => void;
};

export default function HealthPermissionModal({ visible, connecting = false, onContinue, onNotNow }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onNotNow}>
      <PhysiqPressable feedback="tap" style={styles.overlay} onPress={onNotNow}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Apple Health access</Text>
          <Text style={styles.body}>
            Physiq uses activity, workout, heart rate, heart rate variability, and sleep data
            from Apple Health to adapt macro and hydration targets.
          </Text>
          <PhysiqPressable
            feedback="confirm"
            style={[styles.primaryBtn, connecting && styles.primaryBtnDisabled]}
            onPress={onContinue}
            disabled={connecting}
          >
            <Text style={styles.primaryBtnText}>{connecting ? 'Connecting…' : 'Continue'}</Text>
          </PhysiqPressable>
          <PhysiqPressable feedback="tap" style={styles.secondaryBtn} onPress={onNotNow} disabled={connecting}>
            <Text style={styles.secondaryBtnText}>Not now</Text>
          </PhysiqPressable>
        </Pressable>
      </PhysiqPressable>
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
    primaryBtnDisabled: {
      opacity: 0.65,
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

