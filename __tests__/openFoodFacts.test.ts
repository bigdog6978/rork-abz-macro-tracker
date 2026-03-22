import { parseServingSizeText } from '../src/services/openFoodFacts';
import { normalizeSearchResult, normalizeDetailResult } from '../features/food/providers/usda/usdaNormalizer';

describe('parseServingSizeText', () => {
  it('parses counted weight servings into a serving unit', () => {
    expect(parseServingSizeText('1 bar (40 g)')).toEqual({
      unitLabel: 'bar',
      servingWeightG: 40,
    });
  });

  it('treats plain gram servings as one serving weight', () => {
    expect(parseServingSizeText('30 g')).toEqual({
      unitLabel: 'serving',
      servingWeightG: 30,
    });
  });

  it('captures package volume servings when only milliliters are available', () => {
    expect(parseServingSizeText('1 bottle (355 ml)')).toEqual({
      unitLabel: 'bottle',
      servingVolumeMl: 355,
    });
  });

  it('derives density when both grams and milliliters are provided', () => {
    expect(parseServingSizeText('1 bottle (240 ml / 252 g)')).toEqual({
      unitLabel: 'bottle',
      servingWeightG: 252,
      servingVolumeMl: 240,
      density_g_per_ml: 1.05,
    });
  });
});

describe('USDA nutrient normalization', () => {
  it('supports modern USDA nutrient numbers used by some foods like oils', () => {
    const search = normalizeSearchResult({
      fdcId: 1,
      description: 'Oil, olive, extra virgin',
      dataType: 'Foundation',
      foodNutrients: [
        { nutrientId: 1008, nutrientName: 'Energy', nutrientNumber: '1008', unitName: 'KCAL', value: 884 },
        { nutrientId: 1003, nutrientName: 'Protein', nutrientNumber: '1003', unitName: 'G', value: 0 },
        { nutrientId: 1005, nutrientName: 'Carbohydrate, by difference', nutrientNumber: '1005', unitName: 'G', value: 0 },
        { nutrientId: 1004, nutrientName: 'Total lipid (fat)', nutrientNumber: '1004', unitName: 'G', value: 100 },
      ],
    });

    const detail = normalizeDetailResult({
      fdcId: 1,
      description: 'Oil, olive, extra virgin',
      dataType: 'Foundation',
      foodNutrients: [
        { nutrient: { id: 1008, name: 'Energy', number: '1008', unitName: 'KCAL' }, amount: 884 },
        { nutrient: { id: 1003, name: 'Protein', number: '1003', unitName: 'G' }, amount: 0 },
        { nutrient: { id: 1005, name: 'Carbohydrate, by difference', number: '1005', unitName: 'G' }, amount: 0 },
        { nutrient: { id: 1004, name: 'Total lipid (fat)', number: '1004', unitName: 'G' }, amount: 100 },
      ],
    });

    expect(search.per100g.calories).toBe(884);
    expect(search.per100g.fat_g).toBe(100);
    expect(detail.per100g.calories).toBe(884);
    expect(detail.per100g.fat_g).toBe(100);
  });

  it('falls back to NLEA fat and macro-derived calories when USDA omits explicit energy', () => {
    const search = normalizeSearchResult({
      fdcId: 748608,
      description: 'Oil, olive, extra virgin',
      dataType: 'Foundation',
      foodNutrients: [
        { nutrientId: 1085, nutrientName: 'Total fat (NLEA)', nutrientNumber: '298', unitName: 'G', value: 93.7 },
      ],
    });

    const detail = normalizeDetailResult({
      fdcId: 748608,
      description: 'Oil, olive, extra virgin',
      dataType: 'Foundation',
      foodNutrients: [
        { nutrient: { id: 1085, name: 'Total fat (NLEA)', number: '298', unitName: 'G' }, amount: 93.7 },
      ],
    });

    expect(search.per100g.fat_g).toBe(93.7);
    expect(search.per100g.calories).toBe(843);
    expect(detail.per100g.fat_g).toBe(93.7);
    expect(detail.per100g.calories).toBe(843);
  });
});
