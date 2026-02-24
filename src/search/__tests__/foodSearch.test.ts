import {
  normalize,
  tokenize,
  rankFoods,
  FoodItem,
  FoodStats,
  ScoredFood,
} from '../foodSearch';

describe('normalize', () => {
  it('lowercases and trims', () => {
    expect(normalize('  Chicken Breast  ')).toBe('chicken breast');
  });
  it('collapses whitespace', () => {
    expect(normalize('chicken   breast')).toBe('chicken breast');
  });
});

describe('tokenize', () => {
  it('splits on non-alphanumeric', () => {
    expect(tokenize('chicken breast, raw')).toEqual(['chicken', 'breast', 'raw']);
  });
  it('filters empty tokens', () => {
    expect(tokenize('  a  b  ')).toEqual(['a', 'b']);
  });
});

describe('rankFoods', () => {
  const chickenBreast: FoodItem = {
    id: '1',
    name: 'Chicken breast, raw',
    calories: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
  };

  const chickenSpread: FoodItem = {
    id: '2',
    name: 'Chicken spread',
    calories: 200,
    protein: 15,
    carbs: 5,
    fat: 14,
  };

  const fatChicken: FoodItem = {
    id: '3',
    name: 'Fat, chicken',
    calories: 900,
    protein: 0,
    carbs: 0,
    fat: 100,
  };

  const chickenThigh: FoodItem = {
    id: '4',
    name: 'Chicken thigh, skinless, raw',
    calories: 209,
    protein: 26,
    carbs: 0,
    fat: 10.9,
  };

  const groundChicken: FoodItem = {
    id: '5',
    name: 'Ground chicken, raw',
    calories: 143,
    protein: 17,
    carbs: 0,
    fat: 8.1,
  };

  const chickenFeet: FoodItem = {
    id: '6',
    name: 'Chicken feet, raw',
    calories: 215,
    protein: 19,
    carbs: 0,
    fat: 15,
  };

  const chickenWing: FoodItem = {
    id: '7',
    name: 'Chicken wing, raw',
    calories: 203,
    protein: 16,
    carbs: 0,
    fat: 14,
  };

  const candidates = [
    chickenSpread,
    fatChicken,
    chickenFeet,
    chickenBreast,
    chickenThigh,
    groundChicken,
    chickenWing,
  ];

  it('"chicken" ranks chicken breast above chicken spread and fat, chicken', () => {
    const ranked = rankFoods(candidates, 'chicken');
    const names = ranked.map((f) => f.name);

    const breastIdx = names.indexOf('Chicken breast, raw');
    const spreadIdx = names.indexOf('Chicken spread');
    const fatIdx = names.indexOf('Fat, chicken');

    expect(breastIdx).toBeLessThan(spreadIdx);
    expect(breastIdx).toBeLessThan(fatIdx);
  });

  it('"chicken spread" ranks spread above breast', () => {
    const ranked = rankFoods(candidates, 'chicken spread');
    const names = ranked.map((f) => f.name);

    const spreadIdx = names.indexOf('Chicken spread');
    const breastIdx = names.indexOf('Chicken breast, raw');

    expect(spreadIdx).toBeLessThan(breastIdx);
  });

  it('"ground chicken" ranks ground chicken above breast', () => {
    const ranked = rankFoods(candidates, 'ground chicken');
    const names = ranked.map((f) => f.name);

    const groundIdx = names.indexOf('Ground chicken, raw');
    const breastIdx = names.indexOf('Chicken breast, raw');

    expect(groundIdx).toBeLessThan(breastIdx);
  });

  it('"chicken feet" ranks feet above breast (explicit intent)', () => {
    const ranked = rankFoods(candidates, 'chicken feet');
    const names = ranked.map((f) => f.name);

    const feetIdx = names.indexOf('Chicken feet, raw');
    const breastIdx = names.indexOf('Chicken breast, raw');

    expect(feetIdx).toBeLessThan(breastIdx);
  });

  it('personalization: after selecting breast twice, breast ranks above other chicken forms', () => {
    const statsMap: Record<string, FoodStats> = {
      '1': { selectionCount: 2, lastSelectedAt: Date.now() - 1000 },
      '4': { selectionCount: 0, lastSelectedAt: 0 },
      '5': { selectionCount: 0, lastSelectedAt: 0 },
      '7': { selectionCount: 0, lastSelectedAt: 0 },
    };

    const ranked = rankFoods(candidates, 'chicken', statsMap);
    const names = ranked.map((f) => f.name);

    const breastIdx = names.indexOf('Chicken breast, raw');
    const thighIdx = names.indexOf('Chicken thigh, skinless, raw');
    const wingIdx = names.indexOf('Chicken wing, raw');

    expect(breastIdx).toBeLessThan(thighIdx);
    expect(breastIdx).toBeLessThan(wingIdx);
  });

  it('debug=true attaches __debug to each item', () => {
    const ranked = rankFoods([chickenBreast, chickenSpread], 'chicken', undefined, true) as ScoredFood[];
    expect(ranked[0].__debug).toBeDefined();
    expect(ranked[0].__debug?.score).toBeGreaterThanOrEqual(0);
    expect(ranked[0].__debug?.reasons).toBeInstanceOf(Array);
  });
});
