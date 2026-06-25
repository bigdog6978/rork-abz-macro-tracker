import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { X } from 'lucide-react-native';
import Colors from '../../constants/colors';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import { PRO_COPY } from '../../src/content/proMicrocopy';
import PhysiqPressable from './PhysiqPressable';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ProInfoModal({ visible, onClose }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <PhysiqPressable feedback="tap" style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{PRO_COPY.infoTitle}</Text>
            <PhysiqPressable feedback="tap" onPress={onClose} style={styles.closeBtn}>
              <X size={16} color={Colors.textSecondary} />
            </PhysiqPressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.body}>{PRO_COPY.infoBody}</Text>
            <Text style={styles.subtitle}>{PRO_COPY.infoIncludedTitle}</Text>
            {PRO_COPY.infoIncludedBullets.map((line) => (
              <Text key={line} style={styles.bullet}>- {line}</Text>
            ))}
            <Text style={styles.includedNote}>{PRO_COPY.includedLine}</Text>
          </ScrollView>
        </Pressable>
      </PhysiqPressable>
    </Modal>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      padding: 20,
    },
    sheet: {
      backgroundColor: Colors.card,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: 16,
      padding: 16,
      maxHeight: '78%',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    title: {
      color: Colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    closeBtn: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: Colors.cardBorder,
      backgroundColor: Colors.cardElevated,
    },
    body: {
      color: Colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      marginBottom: 12,
    },
    subtitle: {
      color: Colors.text,
      fontSize: 14,
      fontWeight: '700',
      marginBottom: 8,
    },
    bullet: {
      color: Colors.textSecondary,
      fontSize: 14,
      marginBottom: 6,
    },
    includedNote: {
      color: Colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 12,
      fontWeight: '600',
    },
  });

