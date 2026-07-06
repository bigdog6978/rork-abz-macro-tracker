/**
 * Search results block: voice-resolver "best match" card, the suggestion
 * list (with quantity-scaled macros when the query parsed an amount), and
 * the manual-entry fallback. Extracted verbatim from app/add-food.tsx and
 * memoized so unrelated screen state doesn't re-render the list.
 */

import React, { memo, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, Pencil } from 'lucide-react-native';
import { formatNumber } from '../../utils/formatNumber';
import { useThemeColors, type AppColors } from '../../providers/ThemeProvider';
import { Type } from '../../theme/tokens';
import PhysiqPressable from '../ui/PhysiqPressable';
import type { NormalizedFood } from '../../features/food/types';
import * as foodService from '../../features/food/foodService';
import { detectUnitFromName } from '../../features/food/servingDefaults';
import type { VoiceResolvedItem } from '../../features/food/voiceResolver';
import type { ParsedInput } from '../../features/food/hooks/useFoodSearch';

type Props = {
  suggestions: NormalizedFood[];
  parsedInput: ParsedInput | null;
  textResolvedItem: VoiceResolvedItem | null;
  isResolvingText: boolean;
  showOtherResults: boolean;
  onToggleOtherResults: () => void;
  isSaving: boolean;
  onConfirmTextResolved: () => void;
  onSelectSuggestion: (food: NormalizedFood) => void;
  onManualMode: () => void;
};

function SuggestionsSection({
  suggestions,
  parsedInput,
  textResolvedItem,
  isResolvingText,
  showOtherResults,
  onToggleOtherResults,
  isSaving,
  onConfirmTextResolved,
  onSelectSuggestion,
  onManualMode,
}: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const parsed = parsedInput;
  // Derive unit label for "other results" scaled macros (no resolver)
  const otherUnitLabel =
    parsed?.unitId === 'fl_oz'
      ? 'fl oz'
      : parsed?.unitId ?? '';

  // Resolved quantity and unit for the best-match card header
  const resolvedQtyDisplay = textResolvedItem?.quantity ?? 0;
  const resolvedUnitLabel = textResolvedItem?.displayUnit ?? '';

  return (
    <View style={styles.suggestionsSection}>
      {/* ── Best Match Card (voice-resolver result) ── */}
      {(isResolvingText || textResolvedItem) && (
        <View style={styles.quickAddSection}>
          {isResolvingText ? (
            <View style={styles.resolvingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.resolvingText}>Finding best match…</Text>
            </View>
          ) : textResolvedItem ? (
            <>
              <Text style={styles.quickAddHeader}>
                BEST MATCH
              </Text>
              <PhysiqPressable
                feedback="confirm"
                style={styles.quickAddCard}
                onPress={onConfirmTextResolved}
                disabled={isSaving}
                testID="quick-add-card"
              >
                <View style={styles.quickAddContent}>
                  <Text style={styles.quickAddAmountLabel}>
                    {resolvedQtyDisplay} {resolvedUnitLabel}
                  </Text>
                  <Text style={styles.quickAddTitle} numberOfLines={2}>
                    {textResolvedItem.displayName}
                  </Text>
                  <Text style={styles.quickAddMacros}>
                    {formatNumber(textResolvedItem.macros.calories)} cal ·{' '}
                    {formatNumber(textResolvedItem.macros.protein_g)}p ·{' '}
                    {formatNumber(textResolvedItem.macros.carbs_g)}c ·{' '}
                    {formatNumber(textResolvedItem.macros.fat_g)}f
                  </Text>
                </View>
                <View style={[styles.quickAddButton, { backgroundColor: colors.primary }]}>
                  <Text style={styles.quickAddButtonText}>+ Add</Text>
                </View>
              </PhysiqPressable>

              {/* ── Other Results toggle ── */}
              {suggestions.length > 0 && (
                <PhysiqPressable
                  feedback="tap"
                  style={styles.otherResultsToggle}
                  onPress={onToggleOtherResults}
                >
                  <Text style={styles.otherResultsToggleText}>
                    {showOtherResults ? 'Hide other results ▲' : 'Other results ▼'}
                  </Text>
                </PhysiqPressable>
              )}
            </>
          ) : null}
        </View>
      )}

      {/* ── Suggestion list (always shown when no resolver is active; toggled otherwise) ── */}
      {(!textResolvedItem && !isResolvingText) || showOtherResults ? (
        suggestions.map((food) => {
          const cardDetected = parsed?.unitKind === 'serving' ? detectUnitFromName(food.name) : null;
          const cardFood =
            cardDetected && parsed?.unitKind === 'serving'
              ? { ...food, servingWeightGrams: food.servingWeightGrams ?? cardDetected.servingWeightG }
              : food;
          const cardScaling = parsed
            ? foodService.scaleMacrosFromQuantity(cardFood, parsed.quantity, parsed.unitId, parsed.unitKind)
            : null;
          const showScaled = cardScaling?.ok;

          return (
            <PhysiqPressable
              key={food.id}
              feedback="select"
              style={styles.suggestionCard}
              onPress={() => onSelectSuggestion(food)}
              testID={`suggestion-${food.id}`}
            >
              <View style={styles.suggestionInfo}>
                <Text style={styles.suggestionName} numberOfLines={1}>
                  {food.name}
                </Text>
                {food.brand ? (
                  <Text style={styles.suggestionBrand} numberOfLines={1}>
                    {food.brand}
                  </Text>
                ) : null}
                {showScaled && cardScaling ? (
                  <Text style={styles.suggestionMacros}>
                    {formatNumber(cardScaling.macros.calories)} cal ·{' '}
                    {formatNumber(cardScaling.macros.protein_g)}p ·{' '}
                    {formatNumber(cardScaling.macros.carbs_g)}c ·{' '}
                    {formatNumber(cardScaling.macros.fat_g)}f
                    {'  '}
                    <Text style={styles.suggestionMacrosFor}>
                      for {parsed?.quantity} {otherUnitLabel}
                    </Text>
                  </Text>
                ) : (
                  <Text style={styles.suggestionMacros}>
                    {formatNumber(food.per100g.calories)} cal · {formatNumber(food.per100g.protein_g)}p ·{' '}
                    {formatNumber(food.per100g.carbs_g)}c · {formatNumber(food.per100g.fat_g)}f per 100g
                  </Text>
                )}
              </View>
              <ChevronRight size={16} color={colors.textTertiary} />
            </PhysiqPressable>
          );
        })
      ) : null}

      <PhysiqPressable
        feedback="tap"
        style={styles.manualFallback}
        onPress={onManualMode}
      >
        <Pencil size={14} color={colors.primary} />
        <Text style={styles.manualFallbackText}>
          Can&apos;t find it? Enter manually
        </Text>
      </PhysiqPressable>
    </View>
  );
}

const createStyles = (colors: AppColors) => StyleSheet.create({
  suggestionsSection: {
    marginBottom: 8,
  },
  suggestionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  suggestionInfo: {
    flex: 1,
  },
  suggestionName: {
    ...Type.bodySm,
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text,
  },
  suggestionBrand: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
    marginTop: 1,
  },
  suggestionMacros: {
    ...Type.caption,
    fontWeight: '500' as const,
    color: colors.textTertiary,
    marginTop: 3,
  },
  suggestionMacrosFor: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '500' as const,
  },
  quickAddSection: {
    marginBottom: 12,
  },
  quickAddHeader: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '600' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  quickAddCard: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: colors.primaryMuted,
    borderColor: colors.primary,
    borderWidth: 2,
    borderRadius: 14,
    padding: 14,
  },
  quickAddContent: {
    flex: 1,
  },
  quickAddTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700' as const,
  },
  quickAddMacros: {
    ...Type.numeric,
    fontSize: 14,
    lineHeight: 18,
    color: colors.primary,
    marginTop: 4,
  },
  quickAddButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginLeft: 12,
  },
  quickAddButtonText: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '700' as const,
  },
  quickAddAmountLabel: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  resolvingRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 12,
  },
  resolvingText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  otherResultsToggle: {
    paddingVertical: 10,
    alignItems: 'center' as const,
  },
  otherResultsToggleText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600' as const,
  },
  manualFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
  },
  manualFallbackText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600' as const,
  },
});

export default memo(SuggestionsSection);
