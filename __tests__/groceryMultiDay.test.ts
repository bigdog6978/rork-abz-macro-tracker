import { generateGroceryListFromDays } from '../utils/grocery/groceryListEngine';
import { MealSlot } from '../types';

const sampleMeals: MealSlot[] = [
  {
    name: 'Breakfast',
    icon: 'sunrise',
    percentage: 0.25,
    suggestions: [
      {
        id: '1',
        foodId: 'eggs',
        name: 'Eggs',
        portion: '2 large',
        portionGrams: 100,
        protein_g: 12,
        carbs_g: 1,
        fat_g: 10,
        calories: 140,
        category: 'protein',
        isSubstitutable: true,
      },
    ],
  },
];

describe('generateGroceryListFromDays', () => {
  it('aggregates the same ingredient across days', () => {
    const list = generateGroceryListFromDays(
      [
        { dayLabel: 'Mon', meals: sampleMeals },
        { dayLabel: 'Tue', meals: sampleMeals },
      ],
      'test-plan'
    );
    const eggs = list.categories.flatMap((c) => c.items).find((i) => i.name === 'Eggs');
    expect(eggs).toBeDefined();
    expect(eggs!.sources.some((s) => s.includes('Mon'))).toBe(true);
    expect(eggs!.sources.some((s) => s.includes('Tue'))).toBe(true);
  });
});
