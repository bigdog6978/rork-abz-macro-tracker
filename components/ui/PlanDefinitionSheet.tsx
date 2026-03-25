import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { X } from 'lucide-react-native';
import Colors from '../../constants/colors';
import type { LearnMoreSection } from '../../src/content/planDefinitions';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';

interface PlanDefinitionSheetProps {
  visible: boolean;
  title: string;
  sections: LearnMoreSection[];
  onClose: () => void;
}

function formatBody(text: string): string[] {
  return text.split('\n').filter((line) => line.trim().length > 0);
}

export default function PlanDefinitionSheet({
  visible,
  title,
  sections,
  onClose,
}: PlanDefinitionSheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleClose = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
      statusBarTranslucent
      accessibilityViewIsModal
      accessibilityLabel={`Learn more about ${title}`}
    >
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={handleClose} accessibilityRole="button">
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.handle} />
            <View style={styles.titleRow}>
              <Text style={styles.title} accessibilityRole="header">
                {title}
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Close"
                accessibilityRole="button"
              >
                <X size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            {sections.map((section, idx) => (
              <View key={idx} style={styles.section}>
                <Text style={styles.sectionHeading}>{section.heading}</Text>
                {formatBody(section.body).map((para, pIdx) => (
                  <Text key={pIdx} style={styles.sectionBody}>
                    {para}
                  </Text>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: AppColors) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: Colors.overlay,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
    },
    sheet: {
      backgroundColor: Colors.card,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '85%',
      flex: 1,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: Colors.cardBorder,
    },
    header: {
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    handle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: Colors.textTertiary,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 12,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      color: Colors.text,
      fontSize: 20,
      fontWeight: '700' as const,
      flex: 1,
    },
    closeBtn: {
      padding: 4,
    },
    scroll: {
      flexGrow: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 34,
    },
    section: {
      marginBottom: 20,
    },
    sectionHeading: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700' as const,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 6,
    },
    sectionBody: {
      color: Colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 4,
    },
  });
