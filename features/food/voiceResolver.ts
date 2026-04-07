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
import { detectUnitFromName, getVolumeWeightGrams } from './servingDefaults';
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

function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 1);
}

function tokenCoverage(food: NormalizedFood, query: string): number {
  const tokens = tokenizeQuery(query);
  if (tokens.length === 0) return 0;
  const nameNorm = food.name.toLowerCase();
  const matched = tokens.filter((t) => nameNorm.includes(t));
  return matched.length / tokens.length;
}

const BRAND_OR_RESTAURANT_QUERY_HINTS = new Set([
  'mcdonalds',
  'burger',
  'king',
  'wendys',
  'dennys',
  'ihop',
  'kfc',
  'subway',
  'chipotle',
  'panera',
  'starbucks',
  'taco',
  'bell',
  'restaurant',
  'takeout',
  'from',
  'brand',
]);

const BRAND_OR_RESTAURANT_NAME_HINTS = new Set([
  'restaurant',
  'denny',
  'mcdonald',
  'wendy',
  'ihop',
  'kfc',
  'subway',
  'chipotle',
  'panera',
  'starbucks',
  'taco',
  'bell',
  'pizza',
  'hut',
  'domino',
  'popeyes',
  'arbys',
  'chick',
  'fil',
  'a',
]);

function queryHasBrandOrRestaurantIntent(query: string): boolean {
  const q = query.toLowerCase().trim();
  if (/\bfrom\s+[a-z0-9]/i.test(q)) return true;
  if (/\b[a-z0-9]+['’]s\b/i.test(q)) return true;
  const tokens = tokenizeQuery(q);
  return tokens.some((t) => BRAND_OR_RESTAURANT_QUERY_HINTS.has(t));
}

function isBrandOrRestaurantFood(food: NormalizedFood): boolean {
  if (food.brand && food.brand.trim().length > 0) return true;
  const nameTokens = tokenizeQuery(food.name);
  return nameTokens.some((t) => BRAND_OR_RESTAURANT_NAME_HINTS.has(t));
}

/**
 * Voice-specific rerank:
 * - If user did not explicitly mention a brand/restaurant, prefer generic foods
 *   with comparable token coverage over branded/restaurant entries.
 * - Keeps fallback behavior intact when only branded options exist.
 */
function rerankVoiceResults(results: NormalizedFood[], query: string): NormalizedFood[] {
  if (results.length <= 1) return results;
  if (queryHasBrandOrRestaurantIntent(query)) return results;

  const top = results[0];
  if (!isBrandOrRestaurantFood(top)) return results;

  const topCoverage = tokenCoverage(top, query);
  const coverageFloor = Math.max(0.5, topCoverage - 0.34);
  const genericIndex = results.findIndex((f) => {
    if (isBrandOrRestaurantFood(f)) return false;
    return tokenCoverage(f, query) >= coverageFloor;
  });

  if (genericIndex <= 0) return results;
  const picked = results[genericIndex];
  return [picked, ...results.slice(0, genericIndex), ...results.slice(genericIndex + 1)];
}

const SOLID_FOOD_PATTERN =
  /\b(steak|beef|chicken|pork|meat|fish|bacon|turkey|lamb|salmon|tuna|burger|egg|bread|rice|pasta|potato|vegetable|salad|cheese|tofu|tempeh|shrimp|prawn|crab|lobster|scallop|clam|mussel|oyster)\b/i;

function isLikelyLiquid(food: NormalizedFood, query: string): boolean {
  const combined = `${food.name} ${query}`.toLowerCase();
  // Solid foods are never liquids regardless of any density value on the record
  if (SOLID_FOOD_PATTERN.test(combined)) return false;
  if (typeof food.density_g_per_ml === 'number' && food.density_g_per_ml > 0) return true;
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

/** Log entry title for mass/volume items — includes quantity so edit screen matches user intent. */
function massVolumeDisplayName(quantity: number, unitId: UnitId, foodName: string): string {
  const du = formatDisplayUnit(quantity, unitId);
  return `${quantity} ${du} ${foodName}`;
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
    if (scaling.reason === 'NEEDS_DENSITY') {
      // Try volume-to-weight lookup for solid foods (rice, oats, etc.)
      const volumeGrams = getVolumeWeightGrams(effectiveFood.name, parsedItem.query, unitId);
      if (typeof volumeGrams === 'number' && volumeGrams > 0) {
        const totalGrams = parsedItem.quantity * volumeGrams;
        const volScaling = foodService.scaleMacrosFromQuantity(effectiveFood, totalGrams, 'g', 'mass');
        if (volScaling.ok) {
          return {
            status: 'resolved',
            item: {
              id: generateId(),
              label: parsedItem.label,
              displayName: massVolumeDisplayName(
                parsedItem.quantity,
                unitId,
                effectiveFood.name
              ),
              quantity: parsedItem.quantity,
              displayUnit: formatDisplayUnit(parsedItem.quantity, unitId),
              unitKind: 'mass',
              unitId: 'g',
              grams: volScaling.gramsUsedForScaling,
              food: effectiveFood,
              macros: volScaling.macros,
              confidence,
              alternatives,
              entryOpts: { measureMode: 'grams', quantity: volScaling.gramsUsedForScaling },
            },
          };
        }
      }
      // Last resort: interpret the raw quantity as grams
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
            displayName: massVolumeDisplayName(
              parsedItem.quantity,
              'g',
              effectiveFood.name
            ),
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
      displayName: massVolumeDisplayName(
        parsedItem.quantity,
        unitId,
        effectiveFood.name
      ),
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
    const localResultsRaw = await foodService.searchLocalOnly(candidate) ?? [];
    const localResults = rerankVoiceResults(localResultsRaw, parsedItem.query);
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
      allResults = rerankVoiceResults(result.results, parsedItem.query);
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
