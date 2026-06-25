import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Colors from '../../constants/colors';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import { PRO_COPY } from '../../src/content/proMicrocopy';
import PhysiqPressable from './PhysiqPressable';

type Props = {
  visible: boolean;
  onContinue: () => void;
  onNotNow: () => void;
};

export default function ProHealthEducationModal({ visible, onContinue, onNotNow }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onNotNow}>
      <PhysiqPressable feedback="tap" style={styles.overlay} onPress={onNotNow}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{PRO_COPY.postProHealthTitle}</Text>
          <Text style={styles.body}>{PRO_COPY.postProHealthBody}</Text>
          <View style={styles.hintBox}>
            <Text style={styles.hint}>{PRO_COPY.athleteLabel}</Text>
          </View>
          <PhysiqPressable feedback="confirm" style={styles.primaryBtn} onPress={onContinue}>
            <Text style={styles.primaryBtnText}>{PRO_COPY.postProHealthContinue}</Text>
          </PhysiqPressable>
          <PhysiqPressable feedback="tap" style={styles.secondaryBtn} onPress={onNotNow}>
            <Text style={styles.secondaryBtnText}>{PRO_COPY.postProHealthNotNow}</Text>
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
      marginBottom: 12,
      textAlign: 'center',
    },
    hintBox: {
      backgroundColor: colors.primaryMuted,
      borderRadius: 8,
      padding: 10,
      marginBottom: 16,
    },
    hint: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '600',
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
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    secondaryBtnText: {
      color: Colors.textSecondary,
      fontSize: 15,
      fontWeight: '500',
    },
  });
