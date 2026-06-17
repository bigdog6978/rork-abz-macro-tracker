import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { X } from 'lucide-react-native';
import Colors from '../../constants/colors';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import { PRO_COPY } from '../../src/content/proMicrocopy';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function ProInfoModal({ visible, onClose }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const infoTitle = PRO_COPY.infoTitle;
  const infoBody = PRO_COPY.infoBody;
  const infoIncludedTitle = PRO_COPY.infoIncludedTitle;
  const infoIncludedBullets = PRO_COPY.infoIncludedBullets;
  const disclosure = PRO_COPY.oneTimeDisclosure;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{infoTitle}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.body}>{infoBody}</Text>
            <Text style={styles.subtitle}>{infoIncludedTitle}</Text>
            {infoIncludedBullets.map((line) => (
              <Text key={line} style={styles.bullet}>- {line}</Text>
            ))}
            <Text style={styles.disclosure}>{disclosure}</Text>
          </ScrollView>
        </Pressable>
      </Pressable>
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
    disclosure: {
      color: colors.primary,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 12,
      fontWeight: '600',
    },
  });

