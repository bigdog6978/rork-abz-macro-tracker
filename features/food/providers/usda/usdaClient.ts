import { USDA_API_KEY, USDA_BASE_URL } from '../../../../config/env';

const isDev =
  typeof global !== 'undefined' && (global as any).__DEV__ === true;

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

const ALLOWED_DATA_TYPES = ['Foundation', 'SR Legacy'];

const PREFERRED_TERMS = /\b(raw|meat only|skinless|boneless|cooked|roasted|grilled|baked)\b/i;
const DEPRIORITIZED_TERMS = /\b(nugget|sandwich|roll|entree|orange|teriyaki|patty|strip|frozen|breaded)\b/i;

function rankFoods(foods: USDASearchFood[]): USDASearchFood[] {
  return [...foods].sort((a, b) => {
    const scoreA = (PREFERRED_TERMS.test(a.description) ? -1 : 0)
      + (DEPRIORITIZED_TERMS.test(a.description) ? 1 : 0);
    const scoreB = (PREFERRED_TERMS.test(b.description) ? -1 : 0)
      + (DEPRIORITIZED_TERMS.test(b.description) ? 1 : 0);
    return scoreA - scoreB;
  });
}

export class USDARequestError extends Error {
  constructor(
    public status: number,
    message: string,
    public isRateLimit: boolean = false
  ) {
    super(message);
    this.name = 'USDARequestError';
  }
}

export async function searchFoods(
  query: string,
  pageSize: number = 10
): Promise<USDASearchResponse> {
  if (!USDA_API_KEY) {
    if (isDev) {
      console.log('[usdaClient] hasApiKey: false');
    }
    throw new USDARequestError(0, 'USDA API key not configured');
  }

  const url = `${USDA_BASE_URL}/foods/search`;
  if (isDev) {
    console.log('[usdaClient] hasApiKey: true');
    console.log('[usdaClient] request URL:', url, '(key omitted)');
  }

  if (!url.startsWith('https://') || USDA_BASE_URL.includes('localhost')) {
    throw new USDARequestError(0, 'Invalid USDA endpoint');
  }

  const response = await fetch(
    `${USDA_BASE_URL}/foods/search?api_key=${USDA_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        pageSize,
        pageNumber: 1,
        dataType: ALLOWED_DATA_TYPES,
      }),
    }
  );

  if (isDev) {
    console.log('[usdaClient] response status:', response.status);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    if (isDev) {
      console.log('[usdaClient] error body snippet:', text.slice(0, 200));
    }
    if (response.status === 429) {
      throw new USDARequestError(429, 'Rate limit exceeded', true);
    }
    throw new USDARequestError(
      response.status,
      `USDA search failed: ${response.status}`
    );
  }

  const data: USDASearchResponse = await response.json();
  const filtered = (data.foods ?? []).filter(
    (f) => !f.brandOwner && ALLOWED_DATA_TYPES.includes(f.dataType)
  );
  const ranked = rankFoods(filtered);

  if (isDev) {
    console.log('[usdaClient] Search returned', ranked.length, 'generic results');
  }
  return { ...data, foods: ranked, totalHits: ranked.length };
}

export async function getFoodDetail(fdcId: string): Promise<USDAFoodDetail> {
  if (!USDA_API_KEY) {
    throw new USDARequestError(0, 'USDA API key not configured');
  }

  if (isDev) {
    console.log('[usdaClient] Getting details for fdcId:', fdcId);
  }

  const response = await fetch(
    `${USDA_BASE_URL}/food/${fdcId}?api_key=${USDA_API_KEY}`
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    if (isDev) {
      console.log('[usdaClient] Detail failed:', response.status, text.slice(0, 200));
    }
    if (response.status === 429) {
      throw new USDARequestError(429, 'Rate limit exceeded', true);
    }
    throw new USDARequestError(response.status, `USDA detail failed: ${response.status}`);
  }

  const data = await response.json();
  if (isDev) {
    console.log('[usdaClient] Detail returned for:', data.description);
  }
  return data;
}