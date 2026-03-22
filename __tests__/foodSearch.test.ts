import { rankFoods, type FoodItem } from '../src/search/foodSearch';

describe('foodSearch ranking', () => {
  it('prefers generic whole eggs over branded or prepared egg results', () => {
    const foods: FoodItem[] = [
      { id: 'generic-egg', name: 'Egg, whole, raw, fresh', brand: null },
      { id: 'wegmans-egg', name: 'Large brown eggs', brand: 'Wegmans' },
      { id: 'egg-salad', name: 'Egg salad', brand: null },
    ];

    const ranked = rankFoods(foods, 'egg');
    const ids = ranked.map((food) => food.id);

    expect(ids[0]).toBe('generic-egg');
    expect(ids.indexOf('generic-egg')).toBeLessThan(ids.indexOf('wegmans-egg'));
  });

  it('prefers plain chicken breast over branded prepared chicken', () => {
    const foods: FoodItem[] = [
      { id: 'generic-chicken', name: 'Chicken breast, skinless, boneless, raw', brand: null },
      { id: 'branded-chicken', name: 'Chicken breast strips, grilled', brand: 'Wegmans' },
      { id: 'nuggets', name: 'Chicken nuggets', brand: 'Tyson' },
    ];

    const ranked = rankFoods(foods, 'chicken breast');
    const ids = ranked.map((food) => food.id);

    expect(ids[0]).toBe('generic-chicken');
    expect(ids.indexOf('generic-chicken')).toBeLessThan(ids.indexOf('branded-chicken'));
    expect(ids.indexOf('generic-chicken')).toBeLessThan(ids.indexOf('nuggets'));
  });

  it('prefers raw boneless skinless chicken breast over deli-style chicken breast phrase matches', () => {
    const foods: FoodItem[] = [
      { id: 'roll', name: 'Chicken breast, roll, oven-roasted', brand: null },
      { id: 'sliced', name: 'Chicken breast, oven-roasted, fat-free, sliced', brand: null },
      { id: 'raw', name: 'Chicken, breast, boneless, skinless, raw', brand: null },
      { id: 'deli', name: 'Chicken breast, deli, rotisserie seasoned, sliced', brand: null },
    ];

    const ranked = rankFoods(foods, 'chicken breast');
    const ids = ranked.map((food) => food.id);

    expect(ids[0]).toBe('raw');
  });

  it('prefers a plain apple over branded and processed apple products', () => {
    const foods: FoodItem[] = [
      { id: 'generic-apple', name: 'Apple, raw, with skin', brand: null },
      { id: 'apple-slices', name: 'Apple slices', brand: 'Wegmans' },
      { id: 'apple-sauce', name: 'Apple sauce', brand: null },
    ];

    const ranked = rankFoods(foods, 'apple');
    const ids = ranked.map((food) => food.id);

    expect(ids[0]).toBe('generic-apple');
    expect(ids.indexOf('generic-apple')).toBeLessThan(ids.indexOf('apple-slices'));
  });

  it('keeps a generic salmon result above branded salmon items', () => {
    const foods: FoodItem[] = [
      { id: 'generic-salmon', name: 'Salmon, Atlantic, raw', brand: null },
      { id: 'brand-salmon', name: 'Atlantic salmon fillet', brand: 'Private Selection' },
      { id: 'smoked-salmon', name: 'Smoked salmon', brand: null },
    ];

    const ranked = rankFoods(foods, 'salmon');
    const ids = ranked.map((food) => food.id);

    expect(ids[0]).toBe('generic-salmon');
    expect(ids.indexOf('generic-salmon')).toBeLessThan(ids.indexOf('brand-salmon'));
  });

  it('treats size words like large as weak modifiers, not the main food match', () => {
    const foods: FoodItem[] = [
      { id: 'lima-cooked', name: 'Lima beans, large, mature seeds, cooked, boiled, without salt', brand: null },
      { id: 'lima-raw', name: 'Lima beans, large, mature seeds, raw', brand: null },
      { id: 'egg-large', name: 'Eggs, Grade A, Large, egg whole', brand: null },
      { id: 'burger-large', name: 'Fast foods, cheeseburger; single, large patty', brand: null },
    ];

    const ranked = rankFoods(foods, 'large egg');
    const ids = ranked.map((food) => food.id);

    expect(ids[0]).toBe('egg-large');
    expect(ids.indexOf('egg-large')).toBeLessThan(ids.indexOf('lima-cooked'));
    expect(ids.indexOf('egg-large')).toBeLessThan(ids.indexOf('lima-raw'));
    expect(ids.indexOf('egg-large')).toBeLessThan(ids.indexOf('burger-large'));
  });
});
