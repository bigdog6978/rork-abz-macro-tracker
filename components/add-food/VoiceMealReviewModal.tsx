/**
 * Review sheet for a spoken meal draft (items, unresolved, totals, confirm).
 * Extracted verbatim from app/add-food.tsx; memoized so search keystrokes and
 * form edits on the parent screen don't re-render it.
 */

import React, { memo, useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Bookmark, X } from 'lucide-react-native';
import { formatNumber } from '../../utils/formatNumber';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import { Type } from '../../theme/tokens';
import PhysiqPressable from '../ui/PhysiqPressable';
import type { VoiceMealDraft } from '../../features/food/hooks/useVoiceMeal';

type Props = {
  visible: boolean;
  draft: VoiceMealDraft | null;
  dismissedUnresolvedIds: string[];
  onDismissUnresolved: (id: string) => void;
  showSaveToLibrary: boolean;
  saveToLibrary: boolean;
  onToggleSaveToLibrary: () => void;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

function VoiceMealReviewModal({
  visible,
  draft,
  dismissedUnresolvedIds,
  onDismissUnresolved,
  showSaveToLibrary,
  saveToLibrary,
  onToggleSaveToLibrary,
  isSaving,
  onClose,
  onConfirm,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <PhysiqPressable feedback="tap" style={styles.voiceModalOverlay} onPress={onClose}>
        <Pressable style={styles.voiceModalSheet} onPress={() => {}}>
          <Text style={styles.voiceModalTitle}>Review Spoken Meal</Text>
          <Text style={styles.voiceModalSubtitle}>
            Check the items and macros before adding to your log.
          </Text>

          {draft && (() => {
            const activeUnresolved = draft.unresolved.filter(
              (u) => !dismissedUnresolvedIds.includes(u.id)
            );
            const hasResolved = draft.items.length > 0;
            const confirmLabel = hasResolved && activeUnresolved.length > 0
              ? `Add ${draft.items.length} item${draft.items.length !== 1 ? 's' : ''} to Log`
              : 'Confirm and Add';

            return (
              <>
                <View style={styles.voiceTranscriptCard}>
                  <Text style={styles.voiceTranscriptLabel}>Transcript</Text>
                  <Text style={styles.voiceTranscriptModalText}>{draft.transcript}</Text>
                </View>

                <ScrollView
                  style={styles.voiceItemsScroll}
                  contentContainerStyle={styles.voiceItemsContent}
                  showsVerticalScrollIndicator={false}
                >
                  {draft.items.map((item) => (
                    <View key={item.id} style={styles.voiceItemCard}>
                      <View style={styles.voiceItemHeader}>
                        <View style={styles.voiceItemNameRow}>
                          <Text style={styles.voiceItemName} numberOfLines={2}>
                            {item.quantity} {item.displayUnit} {item.displayName}
                          </Text>
                          {item.confidence !== 'high' && (
                            <View
                              style={[
                                styles.voiceConfidenceBadge,
                                item.confidence === 'medium'
                                  ? styles.voiceConfidenceMedium
                                  : styles.voiceConfidenceLow,
                              ]}
                            >
                              <Text style={styles.voiceConfidenceText}>
                                {item.confidence === 'medium' ? '~match' : '?match'}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.voiceItemCalories}>
                          {formatNumber(item.macros.calories)} cal
                        </Text>
                      </View>
                      <Text style={styles.voiceItemMacros}>
                        {formatNumber(item.macros.protein_g)}p · {formatNumber(item.macros.carbs_g)}c · {formatNumber(item.macros.fat_g)}f
                      </Text>
                      {item.confidence !== 'high' && item.alternatives.length > 0 && (
                        <Text style={styles.voiceAlternativesHint}>
                          {item.alternatives.length} alternative{item.alternatives.length > 1 ? 's' : ''} available — retake to refine
                        </Text>
                      )}
                    </View>
                  ))}

                  {activeUnresolved.length > 0 && (
                    <View style={styles.voiceUnresolvedCard}>
                      <Text style={styles.voiceUnresolvedTitle}>Could not resolve</Text>
                      {activeUnresolved.map((item) => (
                        <View key={item.id} style={styles.voiceUnresolvedRow}>
                          <View style={styles.voiceUnresolvedInfo}>
                            <Text style={styles.voiceUnresolvedLabel}>{item.label}</Text>
                            <Text style={styles.voiceUnresolvedReason}>{item.reason}</Text>
                          </View>
                          <PhysiqPressable
                            feedback="tap"
                            onPress={() => onDismissUnresolved(item.id)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            accessibilityLabel={`Dismiss ${item.label}`}
                          >
                            <X size={16} color={colors.textTertiary} />
                          </PhysiqPressable>
                        </View>
                      ))}
                      {hasResolved && (
                        <Text style={styles.voiceUnresolvedDismissHint}>
                          Tap × to dismiss and add the rest
                        </Text>
                      )}
                    </View>
                  )}
                </ScrollView>

                <View style={styles.voiceTotalsCard}>
                  <Text style={styles.voiceTotalsTitle}>Meal totals</Text>
                  <Text style={styles.voiceTotalsValue}>
                    {formatNumber(draft.totals.calories)} cal · {formatNumber(draft.totals.protein_g)}p · {formatNumber(draft.totals.carbs_g)}c · {formatNumber(draft.totals.fat_g)}f
                  </Text>
                </View>

                {showSaveToLibrary && (
                  <PhysiqPressable
                    feedback="select"
                    style={styles.saveToLibraryRow}
                    onPress={onToggleSaveToLibrary}
                  >
                    <Bookmark
                      size={18}
                      color={saveToLibrary ? colors.primary : colors.textTertiary}
                    />
                    <Text
                      style={[
                        styles.saveToLibraryText,
                        saveToLibrary && styles.saveToLibraryTextActive,
                      ]}
                    >
                      Save to Saved Foods
                    </Text>
                    <View
                      style={[
                        styles.toggleTrack,
                        saveToLibrary && styles.toggleTrackActive,
                      ]}
                    >
                      <View
                        style={[
                          styles.toggleThumb,
                          saveToLibrary && styles.toggleThumbActive,
                        ]}
                      />
                    </View>
                  </PhysiqPressable>
                )}

                <View style={styles.voiceModalActions}>
                  <PhysiqPressable
                    feedback="tap"
                    style={styles.voiceSecondaryButton}
                    onPress={onClose}
                  >
                    <Text style={styles.voiceSecondaryButtonText}>Cancel</Text>
                  </PhysiqPressable>
                  <PhysiqPressable
                    feedback="confirm"
                    style={[
                      styles.voicePrimaryButton,
                      (!hasResolved || isSaving) && styles.voicePrimaryButtonDisabled,
                    ]}
                    onPress={onConfirm}
                    disabled={!hasResolved || isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color={colors.onPrimary} />
                    ) : (
                      <Text style={styles.voicePrimaryButtonText}>{confirmLabel}</Text>
                    )}
                  </PhysiqPressable>
                </View>
              </>
            );
          })()}
        </Pressable>
      </PhysiqPressable>
    </Modal>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  voiceModalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  voiceModalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    maxHeight: '82%',
  },
  voiceModalTitle: {
    ...Type.title,
    color: colors.text,
  },
  voiceModalSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  voiceTranscriptCard: {
    backgroundColor: colors.cardElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
    marginTop: 16,
  },
  voiceTranscriptLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  voiceTranscriptModalText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  voiceItemsScroll: {
    marginTop: 14,
    maxHeight: 280,
  },
  voiceItemsContent: {
    gap: 10,
  },
  voiceItemCard: {
    backgroundColor: colors.cardElevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 14,
  },
  voiceItemHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
  },
  voiceItemNameRow: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  voiceItemName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700' as const,
    flexShrink: 1,
  },
  voiceConfidenceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  voiceConfidenceMedium: {
    backgroundColor: colors.warningMuted,
  },
  voiceConfidenceLow: {
    backgroundColor: colors.dangerMuted,
  },
  voiceConfidenceText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: colors.textSecondary,
  },
  voiceAlternativesHint: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 6,
  },
  voiceItemCalories: {
    ...Type.numeric,
    fontSize: 14,
    lineHeight: 18,
    color: colors.calories,
  },
  voiceItemMacros: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '500' as const,
    marginTop: 6,
  },
  voiceUnresolvedCard: {
    backgroundColor: colors.dangerMuted,
    borderRadius: 12,
    padding: 14,
  },
  voiceUnresolvedTitle: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  voiceUnresolvedRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 6,
  },
  voiceUnresolvedInfo: {
    flex: 1,
  },
  voiceUnresolvedLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  voiceUnresolvedReason: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  voiceUnresolvedDismissHint: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '500' as const,
    marginTop: 10,
  },
  voiceTotalsCard: {
    backgroundColor: colors.primaryMuted,
    borderRadius: 14,
    padding: 14,
    marginTop: 16,
  },
  voiceTotalsTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  voiceTotalsValue: {
    ...Type.numeric,
    fontSize: 16,
    lineHeight: 21,
    color: colors.text,
    marginTop: 6,
  },
  voiceModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  voiceSecondaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingVertical: 15,
    backgroundColor: colors.cardElevated,
  },
  voiceSecondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  voicePrimaryButton: {
    flex: 1.3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 15,
    backgroundColor: colors.primary,
  },
  voicePrimaryButtonDisabled: {
    opacity: 0.45,
  },
  voicePrimaryButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '800' as const,
  },
  saveToLibraryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 8,
  },
  saveToLibraryText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
  },
  saveToLibraryTextActive: {
    color: colors.text,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleTrackActive: {
    backgroundColor: colors.primary,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.textTertiary,
    alignSelf: 'flex-start',
  },
  toggleThumbActive: {
    backgroundColor: colors.white,
    alignSelf: 'flex-end',
  },
});

export default memo(VoiceMealReviewModal);
