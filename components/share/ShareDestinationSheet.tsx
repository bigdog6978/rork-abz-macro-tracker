import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { ChevronRight, X } from 'lucide-react-native';
import Colors from '../../constants/colors';
import { Radius, Spacing } from '../../theme/tokens';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import PhysiqPressable from '../ui/PhysiqPressable';
import type { ShareDestination } from '../../utils/share/shareConstants';

interface DestinationRow {
  id: ShareDestination;
  label: string;
  subtitle?: string;
}

const DESTINATIONS: DestinationRow[] = [
  { id: 'instagram', label: 'Instagram', subtitle: 'Stories, Reels, or feed' },
  { id: 'tiktok', label: 'TikTok', subtitle: 'Create a post from Photos' },
  { id: 'facebook', label: 'Facebook', subtitle: 'Share to your timeline' },
  { id: 'messages', label: 'Messages', subtitle: 'Text or iMessage' },
  { id: 'save_photos', label: 'Save to Photos', subtitle: 'Save your 9:16 card' },
  { id: 'more', label: 'More…', subtitle: 'Other apps' },
  { id: 'facebook_group', label: 'PhysiqMacros community', subtitle: 'Facebook group' },
];

interface ShareDestinationSheetProps {
  visible: boolean;
  busy?: boolean;
  onClose: () => void;
  onSelect: (destination: ShareDestination) => void;
}

export default function ShareDestinationSheet({
  visible,
  busy = false,
  onClose,
  onSelect,
}: ShareDestinationSheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Share to…</Text>
            <PhysiqPressable feedback="tap" onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={Colors.textSecondary} />
            </PhysiqPressable>
          </View>
          <Text style={styles.hint}>
            Your progress card is a 9:16 vertical image — perfect for Stories and Reels.
          </Text>
          <ScrollView style={styles.list} bounces={false}>
            {DESTINATIONS.map((row) => (
              <PhysiqPressable
                key={row.id}
                feedback="tap"
                disabled={busy}
                style={styles.row}
                onPress={() => onSelect(row.id)}
              >
                <View style={styles.rowCopy}>
                  <Text style={styles.rowLabel}>{row.label}</Text>
                  {row.subtitle ? <Text style={styles.rowSubtitle}>{row.subtitle}</Text> : null}
                </View>
                <ChevronRight size={18} color={Colors.textTertiary} />
              </PhysiqPressable>
            ))}
          </ScrollView>
        </Pressable>
      </Pressable>
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
    sheet: {
      backgroundColor: Colors.card,
      borderTopLeftRadius: Radius.xxl,
      borderTopRightRadius: Radius.xxl,
      paddingBottom: 34,
      maxHeight: '78%',
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: Colors.cardBorder,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: Colors.textTertiary,
      alignSelf: 'center',
      marginTop: 10,
      marginBottom: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.sm,
    },
    title: { color: Colors.text, fontSize: 20, fontWeight: '800' },
    closeBtn: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      backgroundColor: Colors.cardElevated,
    },
    hint: {
      color: Colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      paddingHorizontal: Spacing.lg,
      paddingBottom: Spacing.md,
    },
    list: { paddingHorizontal: Spacing.lg },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 56,
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Colors.cardBorder,
    },
    rowCopy: { flex: 1, paddingRight: 12 },
    rowLabel: { color: Colors.text, fontSize: 16, fontWeight: '700' },
    rowSubtitle: { color: Colors.textSecondary, fontSize: 12, marginTop: 2 },
  });
