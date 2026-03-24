import { NormalizedFood } from './types';

const KNOWN_LIQUID_DENSITIES: Array<{
  keywords: string[];
  density_g_per_ml: number;
}> = [
  // Oils — specific varieties before generic 'oil'
  { keywords: ['olive oil'], density_g_per_ml: 0.91 },
  { keywords: ['avocado oil'], density_g_per_ml: 0.91 },
  { keywords: ['coconut oil'], density_g_per_ml: 0.92 },
  { keywords: ['vegetable oil', 'canola oil', 'sunflower oil', 'grapeseed oil', 'sesame oil'], density_g_per_ml: 0.92 },
  { keywords: ['oil'], density_g_per_ml: 0.92 },
  // Alcoholic
  { keywords: ['wine'], density_g_per_ml: 0.99 },
  { keywords: ['beer'], density_g_per_ml: 1.01 },
  // Dairy & dairy alternatives
  { keywords: ['heavy cream', 'heavy whipping cream', 'whipping cream', 'double cream'], density_g_per_ml: 1.01 },
  { keywords: ['cream', 'half and half', 'half-and-half'], density_g_per_ml: 1.01 },
  { keywords: ['buttermilk'], density_g_per_ml: 1.03 },
  { keywords: ['kefir'], density_g_per_ml: 1.03 },
  { keywords: ['oat milk', 'almond milk', 'soy milk', 'coconut milk', 'rice milk', 'cashew milk'], density_g_per_ml: 1.03 },
  { keywords: ['milk'], density_g_per_ml: 1.03 },
  // Juices
  { keywords: ['orange juice', 'apple juice', 'cranberry juice', 'grape juice', 'lemon juice', 'lime juice'], density_g_per_ml: 1.04 },
  { keywords: ['juice'], density_g_per_ml: 1.04 },
  // Drinks
  { keywords: ['smoothie'], density_g_per_ml: 1.05 },
  { keywords: ['protein shake', 'meal replacement'], density_g_per_ml: 1.04 },
  { keywords: ['kombucha'], density_g_per_ml: 1.01 },
  { keywords: ['sports drink', 'gatorade', 'electrolyte'], density_g_per_ml: 1.02 },
  { keywords: ['soda', 'cola', 'soft drink'], density_g_per_ml: 1.04 },
  // Sauces & condiments
  { keywords: ['hot sauce', 'sriracha', 'tabasco'], density_g_per_ml: 1.07 },
  { keywords: ['soy sauce', 'tamari', 'worcestershire'], density_g_per_ml: 1.07 },
  { keywords: ['ketchup'], density_g_per_ml: 1.1 },
  { keywords: ['salsa'], density_g_per_ml: 1.0 },
  { keywords: ['vinegar', 'apple cider vinegar', 'balsamic'], density_g_per_ml: 1.01 },
  // Syrups & sweeteners
  { keywords: ['maple syrup', 'agave', 'syrup'], density_g_per_ml: 1.4 },
  { keywords: ['honey'], density_g_per_ml: 1.4 },
  // Soups & broths
  { keywords: ['broth', 'stock'], density_g_per_ml: 1.01 },
  // Hot drinks
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
