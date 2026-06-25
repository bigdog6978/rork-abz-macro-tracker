import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { AlertTriangle, X } from 'lucide-react-native';
import Colors from '../../constants/colors';
import { Radius, Spacing } from '../../theme/tokens';
import { UserProfile } from '../../types';
import { isLeanForPsmf } from '../../utils/psmfHelpers';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import PhysiqPressable from './PhysiqPressable';

export interface PsmfAcknowledgmentModalProps {
  visible: boolean;
  profile: Pick<UserProfile, 'sex' | 'bodyFatPercent' | 'weightLb' | 'heightCm'>;
  onClose: () => void;
  onAcknowledge: () => void;
}

const WARNING_POINTS = [
  'PSMF is an aggressive, short-term fat-loss protocol intended for 10–14 days maximum for most adults.',
  'Macro targets come from protein + essential fat + veggie carbs — calories are not inflated to match maintenance (TDEE).',
  'Not recommended beyond 2 weeks without medical supervision.',
  'Not appropriate if pregnant/nursing, under 18, history of eating disorder, BMI under normal range, or without adequate protein/micronutrient planning.',
  'Requires attention to hydration, electrolytes, and a multivitamin; consult a qualified professional before starting.',
];

export default function PsmfAcknowledgmentModal({
  visible,
  profile,
  onClose,
  onAcknowledge,
}: PsmfAcknowledgmentModalProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [leanAcknowledged, setLeanAcknowledged] = useState(false);
  const leanWarning = isLeanForPsmf(profile);

  const canConfirm = acknowledged && (!leanWarning || leanAcknowledged);

  const handleClose = () => {
    setAcknowledged(false);
    setLeanAcknowledged(false);
    onClose();
  };

  const handleConfirm = () => {
    if (!canConfirm) return;
    setAcknowledged(false);
    setLeanAcknowledged(false);
    onAcknowledge();
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={handleClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <PhysiqPressable feedback="tap" style={styles.backdrop} onPress={handleClose}>
          <View />
        </PhysiqPressable>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <AlertTriangle size={22} color={Colors.warning} />
              <Text style={styles.title}>PSMF Safety Notice</Text>
              <PhysiqPressable feedback="tap" onPress={handleClose} hitSlop={12} accessibilityLabel="Close">
                <X size={22} color={Colors.textSecondary} />
              </PhysiqPressable>
            </View>
            <Text style={styles.subtitle}>Advanced / Short-term protocol</Text>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {WARNING_POINTS.map((point) => (
              <View key={point} style={styles.bulletRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>{point}</Text>
              </View>
            ))}

            {leanWarning && (
              <View style={styles.leanBox}>
                <Text style={styles.leanTitle}>Extra caution: lean profile detected</Text>
                <Text style={styles.leanBody}>
                  Your body fat or BMI suggests you may already be lean. PSMF carries higher risk of muscle loss and metabolic stress. Strongly consider a less aggressive approach.
                </Text>
              </View>
            )}

            <PhysiqPressable
              feedback="select"
              style={styles.checkRow}
              onPress={() => setAcknowledged((v) => !v)}
            >
              <View style={[styles.checkbox, acknowledged && styles.checkboxActive]}>
                {acknowledged ? <Text style={styles.checkmark}>✓</Text> : null}
              </View>
              <Text style={styles.checkLabel}>I understand these risks and wish to proceed with PSMF</Text>
            </PhysiqPressable>

            {leanWarning && (
              <PhysiqPressable
                feedback="select"
                style={styles.checkRow}
                onPress={() => setLeanAcknowledged((v) => !v)}
              >
                <View style={[styles.checkbox, leanAcknowledged && styles.checkboxActive]}>
                  {leanAcknowledged ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <Text style={styles.checkLabel}>I understand the added risk for lean individuals</Text>
              </PhysiqPressable>
            )}
          </ScrollView>

          <PhysiqPressable
            feedback="confirm"
            style={[styles.confirmBtn, { backgroundColor: canConfirm ? colors.primary : Colors.textTertiary }]}
            onPress={handleConfirm}
            disabled={!canConfirm}
          >
            <Text style={[styles.confirmText, { color: colors.onPrimary }]}>I Understand — Select PSMF</Text>
          </PhysiqPressable>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    sheet: {
      backgroundColor: Colors.card,
      borderTopLeftRadius: Radius.lg,
      borderTopRightRadius: Radius.lg,
      maxHeight: '88%',
      paddingBottom: Spacing.lg,
    },
    header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    title: { flex: 1, fontSize: 18, fontWeight: '700', color: Colors.text },
    subtitle: { marginTop: 4, fontSize: 13, color: Colors.warning },
    scroll: { maxHeight: 420 },
    scrollContent: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md, gap: Spacing.sm },
    bulletRow: { flexDirection: 'row', gap: 8 },
    bullet: { color: Colors.textSecondary, fontSize: 14, lineHeight: 20 },
    bulletText: { flex: 1, fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
    leanBox: {
      backgroundColor: Colors.warningMuted,
      borderRadius: Radius.md,
      padding: Spacing.md,
      marginTop: Spacing.sm,
    },
    leanTitle: { fontSize: 14, fontWeight: '700', color: Colors.warning, marginBottom: 4 },
    leanBody: { fontSize: 13, lineHeight: 18, color: Colors.textSecondary },
    checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginTop: Spacing.sm },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 2,
      borderColor: Colors.textTertiary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    checkboxActive: { borderColor: colors.primary, backgroundColor: colors.primaryMuted },
    checkmark: { fontSize: 14, fontWeight: '700', color: colors.primary },
    checkLabel: { flex: 1, fontSize: 14, lineHeight: 20, color: Colors.text },
    confirmBtn: {
      marginHorizontal: Spacing.lg,
      marginTop: Spacing.sm,
      borderRadius: Radius.md,
      paddingVertical: 14,
      alignItems: 'center',
    },
    confirmText: { fontSize: 16, fontWeight: '700' },
  });
}
