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
  unitLabel?: string;
  servingWeightG?: number;
  servingVolumeMl?: number;
  density_g_per_ml?: number | null;
}

function parseNumber(value: string): number {
  return parseFloat(value.replace(',', '.'));
}

function singularizeLabel(label: string): string {
  const normalized = label.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return 'serving';
  if (normalized.endsWith('ies')) return `${normalized.slice(0, -3)}y`;
  if (normalized.endsWith('sses')) return normalized;
  if (normalized.endsWith('s') && normalized.length > 3) return normalized.slice(0, -1);
  return normalized;
}

function isMeasurementLabel(label: string): boolean {
  return /^(g|gram|grams|kg|ml|milliliter|milliliters|millilitre|millilitres|l|liter|liters|litre|litres|fl oz|fluid ounce|fluid ounces)$/i.test(
    label.trim()
  );
}

export function parseServingSizeText(servingSize: string | null | undefined): {
  unitLabel?: string;
  servingWeightG?: number;
  servingVolumeMl?: number;
  density_g_per_ml?: number | null;
} {
  const text = servingSize?.trim();
  if (!text) return {};

  const countLabelMatch = text.match(
    /^\s*\d+(?:[.,]\d+)?\s+([a-z][a-z\s-]{0,24}?)(?=\s*\(|\s+\d|\s*$)/i
  );
  const parsedLabel = countLabelMatch?.[1]?.trim();
  const unitLabel =
    parsedLabel && !isMeasurementLabel(parsedLabel) ? singularizeLabel(parsedLabel) : undefined;

  const gramMatch = text.match(/(\d+(?:[.,]\d+)?)\s*(kg|g|gram|grams)\b/i);
  const volumeMatch = text.match(
    /(\d+(?:[.,]\d+)?)\s*(ml|milliliters?|millilitres?|l|liters?|litres?|fl\.?\s*oz|fluid ounce(?:s)?)\b/i
  );

  const servingWeightG = gramMatch
    ? Math.round(parseNumber(gramMatch[1]) * (gramMatch[2].toLowerCase() === 'kg' ? 1000 : 1) * 10) / 10
    : undefined;

  const servingVolumeMl = volumeMatch
    ? (() => {
        const amount = parseNumber(volumeMatch[1]);
        const unit = volumeMatch[2].toLowerCase().replace(/\./g, '');
        if (unit === 'l' || unit.startsWith('liter') || unit.startsWith('litre')) {
          return Math.round(amount * 1000 * 10) / 10;
        }
        if (unit.includes('fl oz') || unit.startsWith('fluid ounce')) {
          return Math.round(amount * 29.5735295625 * 10) / 10;
        }
        return Math.round(amount * 10) / 10;
      })()
    : undefined;

  const density_g_per_ml =
    servingWeightG != null && servingVolumeMl != null && servingVolumeMl > 0
      ? Math.round((servingWeightG / servingVolumeMl) * 1000) / 1000
      : undefined;

  if (servingWeightG != null) {
    return {
      unitLabel: unitLabel ?? 'serving',
      servingWeightG,
      servingVolumeMl,
      density_g_per_ml,
    };
  }

  if (servingVolumeMl != null) {
    return {
      unitLabel,
      servingVolumeMl,
    };
  }

  return {};
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
  const servingMeta = parseServingSizeText(servingSize);

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
      unitLabel: servingMeta.unitLabel,
      servingWeightG: servingMeta.servingWeightG,
      servingVolumeMl: servingMeta.servingVolumeMl,
      density_g_per_ml: servingMeta.density_g_per_ml,
    },
    raw: data,
  };
}
