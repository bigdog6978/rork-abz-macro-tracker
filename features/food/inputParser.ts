/**
 * Parses typed text input to extract quantity, unit, and food query.
 * Used by the Add Food text search to strip "1 tbs" from "1 tbs butter"
 * before sending "butter" to the search API.
 *
 * Reuses the same parsing logic as mealVoiceParser for consistency
 * between voice and text entry.
 */

import type { UnitId, UnitKind } from '../../src/lib/units';
import { parseMealVoiceTranscript } from './mealVoiceParser';

export interface ParsedFoodInput {
  /** The cleaned food query with quantity/unit stripped (e.g., "butter") */
  foodQuery: string;
  /** Parsed quantity, or null if none detected */
  quantity: number | null;
  /** Parsed unit id, or null if no unit detected */
  unitId: UnitId | null;
  /** Parsed unit kind, or null if no unit detected */
  unitKind: UnitKind | null;
}

/** Matches leading quantity: digit, decimal, fraction, or number word */
const LEADING_QUANTITY_RE =
  /^(\d+(?:\.\d+)?|\d+\s*\/\s*\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|quarter|a|an)\b/i;

function hasLeadingQuantity(raw: string): boolean {
  return LEADING_QUANTITY_RE.test(raw.trim());
}

/**
 * Parse a raw user string like "1 tbs butter" or "200g chicken" or "2 cups rice"
 * into quantity, unit, and food query. Handles:
 * - Leading numbers (decimal, fraction, or number words like "two")
 * - Unit tokens with or without space (e.g. "1 tbs", "200g")
 * - Returns the remainder as the food query for search
 * - Plain "butter" (no quantity) returns quantity/unit as null
 */
export function parseTextInput(raw: string): ParsedFoodInput {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { foodQuery: '', quantity: null, unitId: null, unitKind: null };
  }

  // Plain food name with no leading quantity — search as-is
  if (!hasLeadingQuantity(trimmed)) {
    return { foodQuery: trimmed, quantity: null, unitId: null, unitKind: null };
  }

  // Reuse the voice parser for single-item input (handles "1 tbs butter", "200g chicken", etc.)
  const items = parseMealVoiceTranscript(trimmed);

  if (items.length === 0) {
    return { foodQuery: trimmed, quantity: null, unitId: null, unitKind: null };
  }

  const item = items[0];
  const foodQuery = item.query?.trim() || trimmed;

  return {
    foodQuery,
    quantity: item.quantity,
    unitId: item.unitId,
    unitKind: item.unitKind,
  };
}
