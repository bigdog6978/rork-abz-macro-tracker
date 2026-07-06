jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {},
  },
}));

jest.mock('../src/data/db', () => ({
  openDb: jest.fn(),
}));

jest.mock('../src/data/foodsRepo', () => ({
  upsertFood: jest.fn(),
  getFoodById: jest.fn(),
  searchFoods: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async () => null),
    setItem: jest.fn(async () => undefined),
    removeItem: jest.fn(async () => undefined),
  },
}));

import {
  computeStreak,
  ensureEntryMacros,
  migrateEntry,
  normalizeStoredLogs,
  StoredLogs,
} from '../storage/dailyLogMigration';
import { FoodEntry } from '../types';

function makeEntry(overrides: Partial<FoodEntry> = {}): FoodEntry {
  return {
    id: 'entry-1',
    name: 'Chicken breast',
    calories: 165,
    protein_g: 31,
    carbs_g: 0,
    fat_g: 3.6,
    timestamp: '2026-07-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('migrateEntry', () => {
  it("rewrites legacy measureMode 'units' to 'qty'", () => {
    const migrated = migrateEntry(makeEntry({ measureMode: 'units' }));
    expect(migrated.measureMode).toBe('qty');
  });

  it('leaves other measure modes untouched and preserves identity', () => {
    const entry = makeEntry({ measureMode: 'grams' });
    expect(migrateEntry(entry)).toBe(entry);
  });
});

describe('ensureEntryMacros', () => {
  const per100g = { calories: 100, protein_g: 10, carbs_g: 5, fat_g: 2 };

  it('recomputes macros from nutrientsPer100g for qty mode', () => {
    const entry = makeEntry({
      measureMode: 'qty',
      quantity: 2,
      servingWeightG: 50,
      nutrientsPer100g: per100g,
      calories: 999,
      protein_g: 99,
    });
    const fixed = ensureEntryMacros(entry);
    // 2 × 50g = 100g → per100g values apply directly
    expect(fixed.servingGrams).toBe(100);
    expect(fixed.calories).toBe(100);
    expect(fixed.protein_g).toBe(10);
    expect(fixed.carbs_g).toBe(5);
    expect(fixed.fat_g).toBe(2);
  });

  it('respects isCustomMacros and stored values', () => {
    const entry = makeEntry({
      isCustomMacros: true,
      nutrientsPer100g: per100g,
      calories: 999,
    });
    expect(ensureEntryMacros(entry)).toBe(entry);
  });

  it('passes through entries without nutrientsPer100g', () => {
    const entry = makeEntry();
    expect(ensureEntryMacros(entry)).toBe(entry);
  });
});

describe('normalizeStoredLogs', () => {
  it('migrates and recomputes every entry, skipping non-array days', () => {
    const logs = {
      '2026-07-01': [
        makeEntry({
          id: 'a',
          measureMode: 'units',
          quantity: 1,
          servingWeightG: 200,
          nutrientsPer100g: { calories: 50, protein_g: 5, carbs_g: 1, fat_g: 1 },
        }),
      ],
      '2026-07-02': 'corrupt' as unknown as FoodEntry[],
    } as StoredLogs;

    const out = normalizeStoredLogs(logs);
    expect(Object.keys(out)).toEqual(['2026-07-01']);
    expect(out['2026-07-01'][0].measureMode).toBe('qty');
    expect(out['2026-07-01'][0].calories).toBe(100); // 200g × 50/100g
  });
});

describe('computeStreak', () => {
  const day = (offset: number): string => {
    const d = new Date(2026, 6, 10, 12); // July 10 2026, local noon
    d.setDate(d.getDate() - offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };
  const now = new Date(2026, 6, 10, 12);
  const entries = [makeEntry()];

  it('returns 0 for empty logs', () => {
    expect(computeStreak({}, now)).toBe(0);
  });

  it('counts today plus consecutive prior days', () => {
    const logs: StoredLogs = { [day(0)]: entries, [day(1)]: entries, [day(2)]: entries };
    expect(computeStreak(logs, now)).toBe(3);
  });

  it('still counts a streak when today has no entries yet', () => {
    const logs: StoredLogs = { [day(1)]: entries, [day(2)]: entries };
    expect(computeStreak(logs, now)).toBe(2);
  });

  it('stops at the first gap', () => {
    const logs: StoredLogs = { [day(0)]: entries, [day(2)]: entries };
    expect(computeStreak(logs, now)).toBe(1);
  });

  it('ignores empty-day placeholder keys', () => {
    const logs: StoredLogs = { [day(0)]: [], [day(1)]: entries };
    expect(computeStreak(logs, now)).toBe(1);
  });
});
