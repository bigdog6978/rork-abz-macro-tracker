/**
 * Tests for features/food/voiceResolver.ts
 *
 * All network and SQLite calls are mocked. The tests verify:
 *  - Resolution routes through the shared foodService.searchSuggestions
 *  - Confidence scoring based on name-token coverage
 *  - Alternatives returned for medium/low confidence results
 *  - Partial success: unresolved items don't block resolved ones
 *  - Graceful fallback when no results or scaling fails
 */

// ─── Module mocks (must come before imports) ─────────────────────────────────

jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('../src/data/db', () => ({ openDb: jest.fn() }));
jest.mock('../src/data/catalogInit', () => ({
  ensureFoodCatalogReady: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/data/foodsRepo', () => ({
  searchLocalFoods: jest.fn().mockResolvedValue([]),
  localFoodToNormalizedFood: jest.fn(),
  getCatalogMeta: jest.fn().mockResolvedValue(null),
  hydrateUsdaResults: jest.fn().mockResolvedValue(undefined),
  getSavedFoods: jest.fn().mockResolvedValue([]),
}));
jest.mock('../storage/foodRepo', () => ({
  getCachedSearch: jest.fn().mockResolvedValue(null),
  setCachedSearch: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));

// Mock foodService — keep scaleMacrosFromQuantity real (pure math) but stub network calls
jest.mock('../features/food/foodService', () => {
  const actual = jest.requireActual('../features/food/foodService');
  return {
    ...actual,
    searchSuggestions: jest.fn(),
    getFood: jest.fn(),
    isApiAvailable: jest.fn().mockReturnValue(false),
  };
});

import { resolveVoiceItem, resolveVoiceItems, scoreConfidence } from '../features/food/voiceResolver';
import * as foodService from '../features/food/foodService';
import type { NormalizedFood } from '../features/food/types';
import { parseMealVoiceTranscript } from '../features/food/mealVoiceParser';

// ─── Test fixtures ────────────────────────────────────────────────────────────

function makeFood(overrides: Partial<NormalizedFood> = {}): NormalizedFood {
  return {
    id: 'test:1',
    providerId: 'manual',
    basis: 'per100g',
    name: 'Chicken Breast',
    per100g: { calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 },
    servingWeightGrams: 100,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

const mockSearchSuggestions = foodService.searchSuggestions as jest.Mock;
const mockGetFood = foodService.getFood as jest.Mock;

beforeEach(() => {
  // resetAllMocks clears both call history AND mock implementations/return-value queues
  jest.resetAllMocks();
  mockGetFood.mockResolvedValue(null); // default: no detail fetch
});

// ─── scoreConfidence ─────────────────────────────────────────────────────────

describe('scoreConfidence', () => {
  it('returns high when all query tokens appear in the food name', () => {
    const food = makeFood({ name: 'Orange Juice' });
    expect(scoreConfidence(food, 'orange juice')).toBe('high');
  });

  it('returns medium when ~half the tokens match', () => {
    const food = makeFood({ name: 'Cheddar Cheese' });
    expect(scoreConfidence(food, 'cottage cheese')).toBe('medium');
  });

  it('returns low when no tokens match', () => {
    const food = makeFood({ name: 'Brown Rice' });
    expect(scoreConfidence(food, 'scrambled eggs')).toBe('low');
  });

  it('ignores single-character tokens (articles, etc.)', () => {
    const food = makeFood({ name: 'Egg' });
    // "a" is a single char and should be ignored; "egg" matches
    expect(scoreConfidence(food, 'a egg')).toBe('high');
  });
});

// ─── resolveVoiceItem ─────────────────────────────────────────────────────────

describe('resolveVoiceItem', () => {
  it('resolves a simple serving-unit query successfully', async () => {
    // Voice input: "chicken breast" — quantity defaults to 1 serving (100g)
    const chicken = makeFood({ name: 'Chicken Breast', servingWeightGrams: 100 });
    mockSearchSuggestions.mockResolvedValue({ status: 'ok', results: [chicken] });

    // Use a directly-constructed parsedItem to keep this test independent of parser edge cases
    const parsedItem = {
      label: 'chicken breast',
      query: 'chicken breast',
      quantity: 1,
      unitId: 'piece' as const,
      unitKind: 'serving' as const,
      ambiguousOunces: false,
    };

    const result = await resolveVoiceItem(parsedItem);

    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') return;
    expect(result.item.displayName).toBe('Chicken Breast');
    expect(result.item.grams).toBeCloseTo(100);
    expect(result.item.macros.calories).toBe(165);
    expect(result.item.confidence).toBe('high');
    expect(result.item.alternatives).toHaveLength(0); // high confidence → no alternatives
  });

  it('returns medium confidence when food name only partially matches the query', async () => {
    // "cottage cheese" tokens: ["cottage", "cheese"]
    // "Cheese Sauce" only contains "cheese" (coverage = 1/2 = 0.5 → medium)
    // Use density so volume unit scaling succeeds without forcing 'low' fallback
    const food = makeFood({ name: 'Cheese Sauce', density_g_per_ml: 1.1 });
    const alt = makeFood({ id: 'test:2', name: 'Cottage Cheese, 2% Milkfat' });
    mockSearchSuggestions.mockResolvedValue({ status: 'ok', results: [food, alt] });

    const parsed = parseMealVoiceTranscript('1 cup cottage cheese');
    const result = await resolveVoiceItem(parsed[0]);

    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') return;
    expect(result.item.confidence).toBe('medium');
    expect(result.item.alternatives.length).toBeGreaterThan(0);
    expect(result.item.alternatives[0].name).toBe('Cottage Cheese, 2% Milkfat');
  });

  it('returns low confidence when food name does not cover query tokens', async () => {
    const irrelevant = makeFood({ name: 'Chicken Soup' });
    mockSearchSuggestions.mockResolvedValue({ status: 'ok', results: [irrelevant] });

    const parsed = parseMealVoiceTranscript('2 scrambled eggs');
    const result = await resolveVoiceItem(parsed[0]);

    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') return;
    expect(result.item.confidence).toBe('low');
  });

  it('returns unresolved when search returns no results', async () => {
    mockSearchSuggestions.mockResolvedValue({ status: 'empty', results: [] });

    const parsed = parseMealVoiceTranscript('1 cup quinzanberry');
    const result = await resolveVoiceItem(parsed[0]);

    expect(result.status).toBe('unresolved');
    if (result.status !== 'unresolved') return;
    expect(result.item.reason).toContain('No matching food');
    expect(result.item.query).toBe('quinzanberry');
  });

  it('returns unresolved when search errors', async () => {
    mockSearchSuggestions.mockResolvedValue({ status: 'error', errorCode: 'NETWORK_ERROR' });

    const parsed = parseMealVoiceTranscript('2 eggs');
    const result = await resolveVoiceItem(parsed[0]);

    expect(result.status).toBe('unresolved');
  });

  it('fetches USDA detail for USDA provider stubs', async () => {
    const stub = makeFood({ id: 'usda:12345', providerId: 'usda', externalId: '12345' });
    const detail = makeFood({
      id: 'usda:12345',
      providerId: 'usda',
      name: 'Chicken, Broilers or Fryers, Breast',
      per100g: { calories: 165, protein_g: 31, carbs_g: 0, fat_g: 3.6 },
    });
    mockSearchSuggestions.mockResolvedValue({ status: 'ok', results: [stub] });
    mockGetFood.mockResolvedValue(detail);

    const parsed = parseMealVoiceTranscript('100g chicken breast');
    const result = await resolveVoiceItem(parsed[0]);

    expect(mockGetFood).toHaveBeenCalledWith('12345');
    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') return;
    expect(result.item.displayName).toContain('Chicken');
  });

  it('handles "half avocado" → 0.5 × serving', async () => {
    const avocado = makeFood({
      name: 'Avocado',
      per100g: { calories: 160, protein_g: 2, carbs_g: 9, fat_g: 15 },
      servingWeightGrams: 150,
    });
    mockSearchSuggestions.mockResolvedValue({ status: 'ok', results: [avocado] });

    const parsed = parseMealVoiceTranscript('half avocado');
    expect(parsed[0].quantity).toBe(0.5);

    const result = await resolveVoiceItem(parsed[0]);
    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') return;
    expect(result.item.quantity).toBe(0.5);
    // 0.5 × 150g = 75g → 75/100 × 160 = 120 cal
    expect(result.item.macros.calories).toBe(120);
  });

  it('resolves "6 oz orange juice" as volume (fl_oz) for a known liquid', async () => {
    const juice = makeFood({
      name: 'Orange Juice',
      density_g_per_ml: 1.05,
      per100g: { calories: 45, protein_g: 0.7, carbs_g: 10.4, fat_g: 0.2 },
    });
    mockSearchSuggestions.mockResolvedValue({ status: 'ok', results: [juice] });

    const parsed = parseMealVoiceTranscript('6 oz orange juice');
    // Ambiguous oz → should flip to fl_oz for a liquid food
    expect(parsed[0].ambiguousOunces).toBe(true);

    const result = await resolveVoiceItem(parsed[0]);
    expect(result.status).toBe('resolved');
    if (result.status !== 'resolved') return;
    expect(result.item.unitId).toBe('fl_oz');
  });
});

// ─── resolveVoiceItems (batch) ────────────────────────────────────────────────

describe('resolveVoiceItems', () => {
  it('resolves multiple items in parallel', async () => {
    const egg = makeFood({
      name: 'Egg',
      servingWeightGrams: 50,
      per100g: { calories: 155, protein_g: 13, carbs_g: 1.1, fat_g: 11 },
    });
    const avocado = makeFood({
      id: 'test:avo',
      name: 'Avocado',
      servingWeightGrams: 150,
      per100g: { calories: 160, protein_g: 2, carbs_g: 9, fat_g: 15 },
    });

    mockSearchSuggestions
      .mockResolvedValueOnce({ status: 'ok', results: [egg] })      // eggs query
      .mockResolvedValueOnce({ status: 'ok', results: [egg] })      // egg (singular) query
      .mockResolvedValueOnce({ status: 'ok', results: [avocado] })  // avocado query
      .mockResolvedValue({ status: 'ok', results: [avocado] });     // any further calls

    const parsed = parseMealVoiceTranscript('2 eggs, 1 avocado');
    expect(parsed).toHaveLength(2);

    const results = await resolveVoiceItems(parsed);
    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('resolved');
    expect(results[1].status).toBe('resolved');
  });

  it('partial success: one resolved, one unresolved', async () => {
    const egg = makeFood({ name: 'Egg', servingWeightGrams: 50 });
    mockSearchSuggestions
      .mockResolvedValueOnce({ status: 'ok', results: [egg] })
      .mockResolvedValue({ status: 'empty', results: [] }); // second item fails

    const parsed = parseMealVoiceTranscript('2 eggs, 1 flurblefritz');
    const results = await resolveVoiceItems(parsed);

    const resolved = results.filter((r) => r.status === 'resolved');
    const unresolved = results.filter((r) => r.status === 'unresolved');

    expect(resolved).toHaveLength(1);
    expect(unresolved).toHaveLength(1);
    // Unresolved item preserves the original query for manual fallback
    if (unresolved[0].status === 'unresolved') {
      expect(unresolved[0].item.query).toBe('flurblefritz');
    }
  });

  it('all items can be unresolved without crashing', async () => {
    mockSearchSuggestions.mockResolvedValue({ status: 'empty', results: [] });

    const parsed = parseMealVoiceTranscript('1 florp, 2 blargs');
    const results = await resolveVoiceItems(parsed);

    expect(results.every((r) => r.status === 'unresolved')).toBe(true);
    expect(results).toHaveLength(2);
  });

  it('high-confidence items get empty alternatives array', async () => {
    const food = makeFood({ name: 'Brown Rice', servingWeightGrams: 185 });
    mockSearchSuggestions.mockResolvedValue({ status: 'ok', results: [food] });

    // Use direct parsedItem so query tokens exactly match the food name
    const parsedItem = {
      label: 'brown rice',
      query: 'brown rice',
      quantity: 1,
      unitId: 'piece' as const,
      unitKind: 'serving' as const,
      ambiguousOunces: false,
    };
    const results = await resolveVoiceItems([parsedItem]);

    expect(results[0].status).toBe('resolved');
    if (results[0].status === 'resolved') {
      expect(results[0].item.confidence).toBe('high');
      expect(results[0].item.alternatives).toHaveLength(0);
    }
  });

  it('low-confidence items include alternatives from the search results', async () => {
    const poor = makeFood({ name: 'Soup Crackers' });
    const alt1 = makeFood({ id: 'test:2', name: 'Large Egg' });
    const alt2 = makeFood({ id: 'test:3', name: 'Egg White' });
    mockSearchSuggestions.mockResolvedValue({
      status: 'ok',
      results: [poor, alt1, alt2],
    });

    const parsed = parseMealVoiceTranscript('2 eggs');
    const results = await resolveVoiceItems(parsed);

    expect(results[0].status).toBe('resolved');
    if (results[0].status === 'resolved') {
      expect(results[0].item.confidence).not.toBe('high');
      expect(results[0].item.alternatives.length).toBeGreaterThan(0);
    }
  });
});
