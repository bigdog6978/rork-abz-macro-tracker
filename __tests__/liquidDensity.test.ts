jest.mock('../config/env', () => ({
  getUsdaApiKey: () => '',
  getUsdaBaseUrl: () => 'https://api.nal.usda.gov/fdc/v1',
  getUsdaDebugInfo: () => ({}),
}));

jest.mock('../src/data/db', () => ({
  openDb: jest.fn(),
}));

import { applyKnownLiquidDensity, inferDensityFromName } from '../features/food/liquidDensity';
import { scaleMacrosFromQuantity } from '../features/food/foodService';
import type { NormalizedFood } from '../features/food/types';

function makeFood(name: string): NormalizedFood {
  return {
    id: `manual:${name}`,
    providerId: 'manual',
    name,
    basis: 'per100g',
    per100g: {
      calories: 100,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
    },
    updatedAt: new Date().toISOString(),
  };
}

describe('liquid density inference', () => {
  it('infers density for common beverages and oils', () => {
    expect(inferDensityFromName('Red wine')).toBe(0.99);
    expect(inferDensityFromName('IPA beer')).toBe(1.01);
    expect(inferDensityFromName('Olive oil')).toBe(0.91);
    expect(inferDensityFromName('Whole milk')).toBe(1.03);
  });

  it('returns undefined for foods without a known liquid density profile', () => {
    expect(inferDensityFromName('Chicken breast')).toBeUndefined();
  });

  it('applies inferred density to a normalized food only when missing', () => {
    const beer = applyKnownLiquidDensity(makeFood('Craft beer'));
    const existing = applyKnownLiquidDensity({
      ...makeFood('Wine'),
      density_g_per_ml: 1.2,
    });

    expect(beer.density_g_per_ml).toBe(1.01);
    expect(existing.density_g_per_ml).toBe(1.2);
  });

  it('allows common liquids to scale from volume without requiring manual density', () => {
    const wine = applyKnownLiquidDensity(makeFood('Red wine'));
    const result = scaleMacrosFromQuantity(wine, 150, 'ml', 'volume');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.gramsUsedForScaling).toBeCloseTo(148.5, 1);
      expect(result.macros.calories).toBe(149);
    }
  });
});
