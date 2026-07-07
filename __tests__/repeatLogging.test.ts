import {
  cloneEntriesForToday,
  getYesterdayEntries,
  getYesterdayMeal,
  selectRecentChips,
  sumCalories,
  yesterdayKey,
} from '../features/food/repeatLogging';
import { StoredLogs } from '../storage/dailyLogMigration';
import { FoodEntry } from '../types';
import type { NormalizedFood } from '../features/food/types';

const now = new Date(2026, 6, 6, 18, 30); // July 6 2026, 6:30pm

function entry(overrides: Partial<FoodEntry>): FoodEntry {
  return {
    id: 'src-' + Math.random().toString(36).slice(2),
    name: 'Food',
    calories: 300,
    protein_g: 20,
    carbs_g: 30,
    fat_g: 10,
    timestamp: new Date(2026, 6, 5, 8, 0).toISOString(),
    ...overrides,
  };
}

const logs: StoredLogs = {
  '2026-07-05': [
    entry({ id: 'a', mealType: 'breakfast' }),
    entry({ id: 'b', mealType: 'dinner' }),
    entry({ id: 'c' }), // untagged, 8am timestamp → breakfast by inference
  ],
  '2026-07-04': [entry({ id: 'old' })],
};

describe('yesterday helpers', () => {
  it('resolves yesterday relative to now', () => {
    expect(yesterdayKey(now)).toBe('2026-07-05');
    expect(getYesterdayEntries(logs, now).map((e) => e.id)).toEqual(['a', 'b', 'c']);
  });

  it('filters a single meal including inferred untagged entries', () => {
    expect(getYesterdayMeal(logs, 'breakfast', now).map((e) => e.id)).toEqual(['a', 'c']);
    expect(getYesterdayMeal(logs, 'lunch', now)).toEqual([]);
  });
});

describe('cloneEntriesForToday', () => {
  const source = getYesterdayEntries(logs, now);
  const clones = cloneEntriesForToday(source, now);

  it('assigns fresh ids and timestamps, preserving macros and customization', () => {
    expect(clones).toHaveLength(3);
    for (let i = 0; i < clones.length; i++) {
      expect(clones[i].id).not.toBe(source[i].id);
      expect(clones[i].timestamp).toBe(now.toISOString());
      expect(clones[i].calories).toBe(source[i].calories);
      expect(clones[i].protein_g).toBe(source[i].protein_g);
    }
    const ids = new Set(clones.map((c) => c.id));
    expect(ids.size).toBe(3);
  });

  it('pins mealType so an evening copy keeps breakfast items in breakfast', () => {
    expect(clones[0].mealType).toBe('breakfast');
    expect(clones[1].mealType).toBe('dinner');
    expect(clones[2].mealType).toBe('breakfast'); // inferred from source timestamp
  });

  it('does not mutate the source entries', () => {
    expect(source[0].id).toBe('a');
    expect(source[0].timestamp).toBe(new Date(2026, 6, 5, 8, 0).toISOString());
  });
});

describe('selectRecentChips', () => {
  const food = (id: string, calories = 200): NormalizedFood =>
    ({
      id,
      name: id,
      providerId: 'manual',
      basis: 'per100g',
      per100g: { calories, protein_g: 10, carbs_g: 10, fat_g: 5 },
    }) as NormalizedFood;

  it('takes the top N usable recents with scaled calories', () => {
    const chips = selectRecentChips(
      [
        { food: food('a', 100), lastServingGrams: 150 },
        { food: food('b'), lastServingGrams: 0 }, // unusable
        { food: food('c', 400), lastServingGrams: 50 },
      ],
      2
    );
    expect(chips.map((c) => c.food.id)).toEqual(['a', 'c']);
    expect(chips[0].calories).toBe(150); // 100/100g × 150g
    expect(chips[1].calories).toBe(200); // 400/100g × 50g
  });

  it('returns empty for no recents', () => {
    expect(selectRecentChips([])).toEqual([]);
  });
});

describe('sumCalories', () => {
  it('totals entry calories', () => {
    expect(sumCalories([entry({ calories: 100 }), entry({ calories: 250 })])).toBe(350);
  });
});
