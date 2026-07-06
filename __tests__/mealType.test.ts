import { entryMealType, groupEntriesByMeal, inferMealType } from '../features/food/mealType';
import { FoodEntry } from '../types';

function at(hour: number, minute = 0): Date {
  return new Date(2026, 6, 6, hour, minute);
}

function entry(overrides: Partial<FoodEntry>): FoodEntry {
  return {
    id: Math.random().toString(36).slice(2),
    name: 'Food',
    calories: 100,
    protein_g: 10,
    carbs_g: 5,
    fat_g: 2,
    timestamp: at(12).toISOString(),
    ...overrides,
  };
}

describe('inferMealType', () => {
  it('maps the day windows with correct boundaries', () => {
    expect(inferMealType(at(4))).toBe('breakfast');
    expect(inferMealType(at(10, 59))).toBe('breakfast');
    expect(inferMealType(at(11))).toBe('lunch');
    expect(inferMealType(at(15, 59))).toBe('lunch');
    expect(inferMealType(at(16))).toBe('dinner');
    expect(inferMealType(at(20, 59))).toBe('dinner');
    expect(inferMealType(at(21))).toBe('snack');
    expect(inferMealType(at(0))).toBe('snack');
    expect(inferMealType(at(3, 59))).toBe('snack');
  });
});

describe('entryMealType', () => {
  it('prefers the explicit tag over the timestamp', () => {
    expect(entryMealType(entry({ mealType: 'dinner', timestamp: at(8).toISOString() }))).toBe('dinner');
  });

  it('infers from timestamp for pre-1.4 entries', () => {
    expect(entryMealType(entry({ timestamp: at(8).toISOString() }))).toBe('breakfast');
  });

  it('falls back to snack for unparseable timestamps', () => {
    expect(entryMealType(entry({ timestamp: 'not-a-date' }))).toBe('snack');
  });
});

describe('groupEntriesByMeal', () => {
  it('returns ordered non-empty sections with subtotals', () => {
    const sections = groupEntriesByMeal([
      entry({ mealType: 'dinner', calories: 600, protein_g: 40 }),
      entry({ mealType: 'breakfast', calories: 300, protein_g: 20 }),
      entry({ mealType: 'breakfast', calories: 200, protein_g: 10 }),
    ]);

    expect(sections.map((s) => s.mealType)).toEqual(['breakfast', 'dinner']);
    expect(sections[0].totals.calories).toBe(500);
    expect(sections[0].totals.protein_g).toBe(30);
    expect(sections[0].entries).toHaveLength(2);
  });

  it('preserves insertion order within a meal', () => {
    const a = entry({ id: 'a', mealType: 'lunch' });
    const b = entry({ id: 'b', mealType: 'lunch' });
    const sections = groupEntriesByMeal([a, b]);
    expect(sections[0].entries.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('mixes tagged and untagged (historical) entries into the same sections', () => {
    const sections = groupEntriesByMeal([
      entry({ mealType: 'breakfast' }),
      entry({ timestamp: at(9).toISOString() }), // untagged → breakfast
    ]);
    expect(sections).toHaveLength(1);
    expect(sections[0].entries).toHaveLength(2);
  });

  it('returns no sections for an empty log', () => {
    expect(groupEntriesByMeal([])).toEqual([]);
  });
});
