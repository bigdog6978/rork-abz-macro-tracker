/**
 * Open Food Facts API client for barcode lookup.
 */

const OFF_BASE = 'https://world.openfoodfacts.org/api/v0/product';

export interface OFFProduct {
  status: number;
  status_verbose?: string;
  code?: string;
  product?: {
    product_name?: string;
    generic_name?: string;
    brands?: string;
    serving_size?: string;
    nutriments?: {
      'energy-kcal_100g'?: number;
      energy_100g?: number;
      energy_unit?: string;
      proteins_100g?: number;
      carbohydrates_100g?: number;
      fat_100g?: number;
    };
  };
}

function kcalFromEnergy(energy100g: number, unit?: string): number {
  if (!unit || unit === 'kcal') return energy100g;
  if (unit === 'kJ') return energy100g / 4.184;
  return energy100g;
}

export interface ParsedProduct {
  name: string;
  brand: string | null;
  servingSize: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  hasMissingMacros: boolean;
}

export async function fetchProductByBarcode(
  barcode: string
): Promise<{ found: boolean; product?: ParsedProduct; raw?: OFFProduct }> {
  const url = `${OFF_BASE}/${barcode}.json`;
  const res = await fetch(url);
  const data: OFFProduct = await res.json();

  if (data.status !== 1 || !data.product) {
    return { found: false, raw: data };
  }

  const p = data.product;
  const nut = p.nutriments ?? {};

  const name =
    p.product_name?.trim() ||
    p.generic_name?.trim() ||
    (p.brands ? `${p.brands} product` : 'Unknown product');
  const brand = p.brands?.trim() || null;
  const servingSize = p.serving_size?.trim() || null;

  let calories = nut['energy-kcal_100g'];
  if (calories == null && nut.energy_100g != null) {
    calories = kcalFromEnergy(nut.energy_100g, nut.energy_unit);
  }
  calories = typeof calories === 'number' ? calories : 0;

  const protein = typeof nut.proteins_100g === 'number' ? nut.proteins_100g : 0;
  const carbs =
    typeof nut.carbohydrates_100g === 'number' ? nut.carbohydrates_100g : 0;
  const fat = typeof nut.fat_100g === 'number' ? nut.fat_100g : 0;

  const hasMissingMacros =
    calories === 0 && protein === 0 && carbs === 0 && fat === 0;

  return {
    found: true,
    product: {
      name,
      brand,
      servingSize,
      calories: Math.round(calories * 10) / 10,
      protein: Math.round(protein * 10) / 10,
      carbs: Math.round(carbs * 10) / 10,
      fat: Math.round(fat * 10) / 10,
      hasMissingMacros,
    },
    raw: data,
  };
}
