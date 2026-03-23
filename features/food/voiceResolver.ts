/**
 * Voice Meal Resolver
 *
 * Resolves parsed meal items through the same unified foodService resolver
 * used by typed search. This is the single source of truth for food lookup
 * in both typed and spoken entry paths.
 *
 * Adds confidence scoring and alternatives so the review UI can surface
 * ambiguous matches rather than silently guessing.
 */

import type { ParsedMealVoiceItem } from './mealVoiceParser';
import type { NormalizedFood } from './types';
import * as foodService from './foodService';
import { detectUnitFromName } from './servingDefaults';
import type { UnitId, UnitKind } from '../../src/lib/units';

// ─── Public Types ──────────────────────────────────────────────────────────────

export type ResolutionConfidence = 'high' | 'medium' | 'low';

type EntryOpts =
  | { measureMode: 'qty'; quantity: number; servingWeightG: number }
  | { measureMode: 'ounces'; quantity: number }
  | { measureMode: 'grams'; quantity: number };

export interface VoiceResolvedItem {
  id: string;
  label: string;
  displayName: string;
  quantity: number;
  displayUnit: string;
  unitKind: UnitKind;
  unitId: UnitId;
  grams: number;
  food: NormalizedFood;
  macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number };
  /** How well the top result matched the spoken query. */
  confidence: ResolutionConfidence;
  /** Non-empty for medium/low confidence — ranked alternatives the user can swap to. */
  alternatives: NormalizedFood[];
  entryOpts: EntryOpts;
}

export interface VoiceUnresolvedItem {
  id: string;
  label: string;
  /** Original parsed query text, preserved so the user can retry or enter manually. */
  query: string;
  reason: string;
}

export type VoiceResolutionResult =
  | { status: 'resolved'; item: VoiceResolvedItem }
  | { status: 'unresolved'; item: VoiceUnresolvedItem };

// ─── Internal Helpers ──────────────────────────────────────────────────────────

function generateId(): string {
  return `voice_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function singularize(query: string): string {
  if (query.endsWith('ies')) return `${query.slice(0, -3)}y`;
  if (query.endsWith('s') && !query.endsWith('ss')) return query.slice(0, -1);
  return query;
}

function isLikelyLiquid(food: NormalizedFood, query: string): boolean {
  if (typeof food.density_g_per_ml === 'number' && food.density_g_per_ml > 0) return true;
  const combined = `${food.name} ${query}`.toLowerCase();
  return /(juice|milk|water|wine|beer|broth|stock|coffee|tea|soda|smoothie|shake|drink)/.test(combined);
}

/**
 * Score how well the resolved food name covers the user's spoken query.
 *
 * Uses token coverage: what fraction of meaningful query tokens appear in the
 * food name. Single-character tokens (articles, etc.) are ignored.
 */
export function scoreConfidence(food: NormalizedFood, query: string): ResolutionConfidence {
  const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (tokens.length === 0) return 'low';
  const nameNorm = food.name.toLowerCase();
  const matched = tokens.filter((t) => nameNorm.includes(t));
  const coverage = matched.length / tokens.length;
  if (coverage >= 1.0) return 'high';
  if (coverage >= 0.5) return 'medium';
  return 'low';
}

function formatDisplayUnit(quantity: number, unitId: UnitId, unitLabel?: string): string {
  if (unitId === 'piece') {
    if (!unitLabel) return quantity === 1 ? 'item' : 'items';
    return quantity === 1 ? unitLabel : `${unitLabel}s`;
  }
  if (unitId === 'fl_oz') return 'fl oz';
  return unitId;
}

function makeUnresolved(parsedItem: ParsedMealVoiceItem, reason: string): VoiceResolutionResult {
  return {
    status: 'unresolved',
    item: { id: generateId(), label: parsedItem.label, query: parsedItem.query, reason },
  };
}

// ─── Core Resolver ─────────────────────────────────────────────────────────────

/**
 * Shared scaling + result-building logic used by both the fast-path and slow-path
 * resolvers. Receives an already-resolved primary food and the full candidate list.
 */
function buildResolvedResult(
  parsedItem: ParsedMealVoiceItem,
  primary: NormalizedFood,
  allResults: NormalizedFood[],
  confidence: ResolutionConfidence
): VoiceResolutionResult {
  const alternatives = confidence !== 'high' ? allResults.slice(1, 4) : [];

  // ── Resolve effective unit (handle ambiguous "oz" for liquids) ──
  let effectiveFood = primary;
  let unitKind: UnitKind = parsedItem.unitKind;
  let unitId: UnitId = parsedItem.unitId;

  if (parsedItem.ambiguousOunces && isLikelyLiquid(primary, parsedItem.query)) {
    unitKind = 'volume';
    unitId = 'fl_oz';
  }

  // ── Scale macros ──────────────────────────────────────────────
  let entryOpts: EntryOpts;
  let displayUnit: string;

  if (unitKind === 'serving') {
    const detected =
      detectUnitFromName(primary.name) ?? detectUnitFromName(parsedItem.query);
    if (detected) {
      effectiveFood = {
        ...primary,
        servingWeightGrams: primary.servingWeightGrams ?? detected.servingWeightG,
      };
    }

    const scaling = foodService.scaleMacrosFromQuantity(
      effectiveFood,
      parsedItem.quantity,
      'piece',
      'serving'
    );
    if (!scaling.ok) {
      return makeUnresolved(parsedItem, 'Could not determine serving size.');
    }

    const sw = effectiveFood.servingWeightGrams ?? detected?.servingWeightG;
    if (!sw) {
      return makeUnresolved(parsedItem, 'Serving weight unknown.');
    }

    const unitLabel = detected?.unitLabel ?? 'serving';
    entryOpts = { measureMode: 'qty', quantity: parsedItem.quantity, servingWeightG: sw };
    displayUnit = formatDisplayUnit(parsedItem.quantity, 'piece', unitLabel);

    return {
      status: 'resolved',
      item: {
        id: generateId(),
        label: parsedItem.label,
        displayName: effectiveFood.name,
        quantity: parsedItem.quantity,
        displayUnit,
        unitKind,
        unitId: 'piece',
        grams: scaling.gramsUsedForScaling,
        food: effectiveFood,
        macros: scaling.macros,
        confidence,
        alternatives,
        entryOpts,
      },
    };
  }

  // Mass or volume unit
  const scaling = foodService.scaleMacrosFromQuantity(
    effectiveFood,
    parsedItem.quantity,
    unitId,
    unitKind
  );

  if (!scaling.ok) {
    // Liquid density missing — try interpreting as grams as a graceful fallback
    if (scaling.reason === 'NEEDS_DENSITY') {
      const fallback = foodService.scaleMacrosFromQuantity(
        effectiveFood,
        parsedItem.quantity,
        'g',
        'mass'
      );
      if (fallback.ok) {
        return {
          status: 'resolved',
          item: {
            id: generateId(),
            label: parsedItem.label,
            displayName: effectiveFood.name,
            quantity: parsedItem.quantity,
            displayUnit: 'g',
            unitKind: 'mass',
            unitId: 'g',
            grams: fallback.gramsUsedForScaling,
            food: effectiveFood,
            macros: fallback.macros,
            confidence: 'low', // downgraded — unit was substituted
            alternatives,
            entryOpts: { measureMode: 'grams', quantity: fallback.gramsUsedForScaling },
          },
        };
      }
      return makeUnresolved(parsedItem, 'Needs liquid density to calculate macros.');
    }
    return makeUnresolved(parsedItem, 'Could not calculate macros for this serving.');
  }

  entryOpts =
    unitId === 'oz'
      ? { measureMode: 'ounces', quantity: parsedItem.quantity }
      : { measureMode: 'grams', quantity: scaling.gramsUsedForScaling };
  displayUnit = formatDisplayUnit(parsedItem.quantity, unitId);

  return {
    status: 'resolved',
    item: {
      id: generateId(),
      label: parsedItem.label,
      displayName: effectiveFood.name,
      quantity: parsedItem.quantity,
      displayUnit,
      unitKind,
      unitId,
      grams: scaling.gramsUsedForScaling,
      food: effectiveFood,
      macros: scaling.macros,
      confidence,
      alternatives,
      entryOpts,
    },
  };
}

/**
 * Resolve a single parsed voice item.
 *
 * Resolution order:
 *  1. Fast path — local SQLite only (CoFID, saved, recent, cached USDA).
 *     If a high-confidence match is found, return immediately with no network call.
 *  2. Slow path — full searchSuggestions pipeline (local + USDA network).
 *     Used when the local catalog has no high-confidence result.
 */
export async function resolveVoiceItem(
  parsedItem: ParsedMealVoiceItem
): Promise<VoiceResolutionResult> {
  const candidates = Array.from(
    new Set([parsedItem.query, singularize(parsedItem.query)].filter(Boolean))
  );

  // ── Fast path: local-only, no network ────────────────────────────────────────
  for (const candidate of candidates) {
    const localResults = await foodService.searchLocalOnly(candidate);
    if (localResults.length > 0) {
      const topLocal = localResults[0];
      const localConfidence = scoreConfidence(topLocal, parsedItem.query);
      if (localConfidence === 'high') {
        return buildResolvedResult(parsedItem, topLocal, localResults, 'high');
      }
    }
  }

  // ── Slow path: full pipeline (local + USDA network) ───────────────────────────
  let allResults: NormalizedFood[] = [];

  for (const candidate of candidates) {
    const result = await foodService.searchSuggestions(candidate);
    if (result.status === 'ok' && result.results.length > 0) {
      allResults = result.results;
      break;
    }
  }

  if (allResults.length === 0) {
    return makeUnresolved(parsedItem, 'No matching food found.');
  }

  const primaryRaw = allResults[0];

  // Fetch full USDA nutrient detail when the top hit is a USDA search stub
  const primary =
    primaryRaw.providerId === 'usda' && primaryRaw.externalId
      ? (await foodService.getFood(primaryRaw.externalId)) ?? primaryRaw
      : primaryRaw;

  const confidence = scoreConfidence(primary, parsedItem.query);
  return buildResolvedResult(parsedItem, primary, allResults, confidence);
}

/**
 * Resolve all parsed voice items in parallel.
 * Partial success: each item is resolved independently; a failure in one
 * item does not prevent others from resolving.
 */
export async function resolveVoiceItems(
  parsedItems: ParsedMealVoiceItem[]
): Promise<VoiceResolutionResult[]> {
  return Promise.all(parsedItems.map(resolveVoiceItem));
}
