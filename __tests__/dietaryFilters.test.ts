import { FOODS } from '../constants/foodDatabase';
import {
  isFoodBlockedByDietaryModifiers,
  mealViolatesKosherMeatDairy,
  resolveKosherFoodId,
} from '../utils/dietaryFilters';

describe('dietaryFilters', () => {
  it('blocks pork for halal', () => {
    expect(isFoodBlockedByDietaryModifiers(FOODS.bacon, ['halal'])).toBe(true);
    expect(isFoodBlockedByDietaryModifiers(FOODS.chicken_breast, ['halal'])).toBe(false);
  });

  it('blocks pork and shellfish for kosher', () => {
    expect(isFoodBlockedByDietaryModifiers(FOODS.pork_loin, ['kosher'])).toBe(true);
    expect(isFoodBlockedByDietaryModifiers(FOODS.shrimp, ['kosher'])).toBe(true);
    expect(isFoodBlockedByDietaryModifiers(FOODS.salmon, ['kosher'])).toBe(false);
  });

  it('blocks high-fat foods for PSMF eating style', () => {
    expect(isFoodBlockedByDietaryModifiers(FOODS.ribeye, [], 'psmf')).toBe(true);
    expect(isFoodBlockedByDietaryModifiers(FOODS.chicken_breast, [], 'psmf')).toBe(false);
  });

  it('detects kosher meat+dairy violations', () => {
    expect(mealViolatesKosherMeatDairy(['chicken_breast', 'cheddar'])).toBe(true);
    expect(mealViolatesKosherMeatDairy(['salmon', 'greek_yogurt'])).toBe(false);
  });

  it('swaps dairy when kosher meal has mammalian meat', () => {
    const swapped = resolveKosherFoodId('cheddar', ['chicken_breast', 'cheddar'], {
      cheddar: 'avocado',
    });
    expect(swapped).toBe('avocado');
  });
});
