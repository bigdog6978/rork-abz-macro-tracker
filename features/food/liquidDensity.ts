import { NormalizedFood } from './types';

const KNOWN_LIQUID_DENSITIES: Array<{
  keywords: string[];
  density_g_per_ml: number;
}> = [
  { keywords: ['olive oil'], density_g_per_ml: 0.91 },
  { keywords: ['oil'], density_g_per_ml: 0.92 },
  { keywords: ['wine'], density_g_per_ml: 0.99 },
  { keywords: ['beer'], density_g_per_ml: 1.01 },
  { keywords: ['milk'], density_g_per_ml: 1.03 },
  { keywords: ['juice'], density_g_per_ml: 1.04 },
  { keywords: ['soda', 'cola', 'soft drink'], density_g_per_ml: 1.04 },
  { keywords: ['broth', 'stock'], density_g_per_ml: 1.01 },
  { keywords: ['coffee'], density_g_per_ml: 1.0 },
  { keywords: ['tea'], density_g_per_ml: 1.0 },
  { keywords: ['water', 'sparkling water'], density_g_per_ml: 1.0 },
];

export function inferDensityFromName(name: string | null | undefined): number | undefined {
  const normalized = name?.trim().toLowerCase() ?? '';
  if (!normalized) return undefined;

  for (const entry of KNOWN_LIQUID_DENSITIES) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) {
      return entry.density_g_per_ml;
    }
  }

  return undefined;
}

export function applyKnownLiquidDensity(food: NormalizedFood): NormalizedFood {
  if (typeof food.density_g_per_ml === 'number' && food.density_g_per_ml > 0) {
    return food;
  }

  const inferred = inferDensityFromName(food.name);
  if (typeof inferred !== 'number') {
    return food;
  }

  return {
    ...food,
    density_g_per_ml: inferred,
  };
}
