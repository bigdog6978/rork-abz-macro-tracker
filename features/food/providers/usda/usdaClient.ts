import { USDA_API_KEY } from '../../../../config/env';

const BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

export interface USDASearchResponse {
  foods: USDASearchFood[];
  totalHits: number;
}

export interface USDASearchFood {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  foodNutrients: USDASearchNutrient[];
}

export interface USDASearchNutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  value: number;
}

export interface USDAFoodDetail {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  foodNutrients: USDADetailNutrient[];
  servingSize?: number;
  servingSizeUnit?: string;
}

export interface USDADetailNutrient {
  nutrient: {
    id: number;
    name: string;
    number: string;
    unitName: string;
  };
  amount?: number;
}

export async function searchFoods(
  query: string,
  pageSize: number = 10
): Promise<USDASearchResponse> {
  if (!USDA_API_KEY) {
    throw new Error('USDA API key not configured');
  }

  console.log('[usdaClient] Searching for:', query);

  const response = await fetch(
    `${BASE_URL}/foods/search?api_key=${USDA_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, pageSize }),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.log('[usdaClient] Search failed:', response.status, text);
    throw new Error(`USDA search failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('[usdaClient] Search returned', data.foods?.length ?? 0, 'results');
  return data;
}

export async function getFoodDetail(fdcId: string): Promise<USDAFoodDetail> {
  if (!USDA_API_KEY) {
    throw new Error('USDA API key not configured');
  }

  console.log('[usdaClient] Getting details for fdcId:', fdcId);

  const response = await fetch(
    `${BASE_URL}/food/${fdcId}?api_key=${USDA_API_KEY}`
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    console.log('[usdaClient] Detail failed:', response.status, text);
    throw new Error(`USDA detail failed: ${response.status}`);
  }

  const data = await response.json();
  console.log('[usdaClient] Detail returned for:', data.description);
  return data;
}