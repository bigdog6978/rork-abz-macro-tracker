import { getUsdaApiKey, getUsdaBaseUrl, getUsdaDebugInfo } from '../../../../config/env';

const USDA_TIMEOUT_MS = 12000;

const USDA_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'User-Agent': 'PhysiqMacroTracker/1.1.0 (food tracking)',
};

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
    public isRateLimit: boolean = false,
    public code?: string,
    public usdaMessage?: string
  ) {
    super(message);
    this.name = 'USDARequestError';
  }
}

async function withTimeout<T>(ms: number, promise: Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  try {
    // fetch doesn't use AbortController from the promise - we pass it at call site
    return await promise;
  } finally {
    clearTimeout(timeout);
  }
}

export async function searchFoods(
  query: string,
  pageSize: number = 10
): Promise<USDASearchResponse> {
  const apiKey = getUsdaApiKey();
  const baseUrl = getUsdaBaseUrl();

  if (!apiKey) {
    console.log('[USDA] Search failed: USDA_API_KEY_MISSING');
    throw new USDARequestError(0, 'USDA API key not configured', false, 'USDA_API_KEY_MISSING');
  }

  const url = `${baseUrl}/foods/search`;
  if (__DEV__) {
    console.log('[USDA] Search request:', url, '(key omitted)');
  }

  if (!baseUrl.startsWith('https://') || baseUrl.includes('localhost')) {
    throw new USDARequestError(0, 'Invalid USDA endpoint', false, 'INVALID_ENDPOINT');
  }

  const fullUrl = `${baseUrl}/foods/search?api_key=${encodeURIComponent(apiKey)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), USDA_TIMEOUT_MS);

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: USDA_HEADERS,
      body: JSON.stringify({
        query,
        pageSize,
        pageNumber: 1,
        dataType: ALLOWED_DATA_TYPES,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const text = await response.text().catch(() => '');
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (e) {
      // ignore parse error
    }

    if (!response.ok) {
      const msg = json?.message ?? json?.error ?? (text || `HTTP_${response.status}`);
      console.log('[USDA] Search failed', {
        status: response.status,
        query,
        message: msg,
      });
      if (response.status === 429) {
        throw new USDARequestError(429, 'Rate limit exceeded', true, 'RATE_LIMIT', msg);
      }
      if (response.status === 401 || response.status === 403) {
        throw new USDARequestError(response.status, 'API key rejected', false, 'API_KEY_REJECTED', msg);
      }
      throw new USDARequestError(response.status, `USDA_HTTP_ERROR_${response.status}: ${msg}`, false, undefined, msg);
    }

    const data: USDASearchResponse = json ?? { foods: [], totalHits: 0 };
    const filtered = (data.foods ?? []).filter(
      (f) => !f.brandOwner && ALLOWED_DATA_TYPES.includes(f.dataType)
    );
    const ranked = rankFoods(filtered);

    if (__DEV__) {
      console.log('[USDA] Search returned', ranked.length, 'generic results');
    }
    return { ...data, foods: ranked, totalHits: ranked.length };
  } catch (err: any) {
    const isAbort = err?.name === 'AbortError';
    const message = isAbort ? 'Request timeout' : err?.message ?? 'Unknown error';
    console.log('[USDA] Search failed', {
      query,
      message,
      name: err?.name,
      stack: err?.stack?.slice(0, 200),
    });
    if (isAbort) {
      throw new USDARequestError(0, 'Network issue reaching USDA API (timeout)', false, 'NETWORK_TIMEOUT');
    }
    throw new USDARequestError(0, `Network error: ${message}`, false, 'NETWORK_ERROR', message);
  }
}

export async function getFoodDetail(fdcId: string): Promise<USDAFoodDetail> {
  const apiKey = getUsdaApiKey();
  const baseUrl = getUsdaBaseUrl();

  if (!apiKey) {
    throw new USDARequestError(0, 'USDA API key not configured', false, 'USDA_API_KEY_MISSING');
  }

  if (__DEV__) {
    console.log('[USDA] Getting details for fdcId:', fdcId);
  }

  const url = `${baseUrl}/food/${fdcId}?api_key=${encodeURIComponent(apiKey)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), USDA_TIMEOUT_MS);

    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json', 'User-Agent': USDA_HEADERS['User-Agent'] },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const text = await response.text().catch(() => '');
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (e) {
      // ignore
    }

    if (!response.ok) {
      const msg = json?.message ?? json?.error ?? (text ? text.slice(0, 200) : `HTTP ${response.status}`);
      if (response.status === 429) {
        throw new USDARequestError(429, 'Rate limit exceeded', true, 'RATE_LIMIT', msg);
      }
      if (response.status === 401 || response.status === 403) {
        throw new USDARequestError(response.status, 'API key rejected', false, 'API_KEY_REJECTED', msg);
      }
      throw new USDARequestError(response.status, `USDA detail failed: ${response.status}`, false, undefined, msg);
    }

    if (__DEV__) {
      console.log('[USDA] Detail returned for:', json?.description);
    }
    return json;
  } catch (err: any) {
    if (err instanceof USDARequestError) throw err;
    if (err?.name === 'AbortError') {
      throw new USDARequestError(0, 'Network issue reaching USDA API (timeout)', false, 'NETWORK_TIMEOUT');
    }
    const networkMsg = err?.message ?? 'Unknown error';
    throw new USDARequestError(0, `Network error: ${networkMsg}`, false, 'NETWORK_ERROR', networkMsg);
  }
}

/**
 * Health check for USDA API connectivity. Used in Settings for troubleshooting.
 * Includes source and baseUrl for diagnosing device builds.
 */
export async function usdaHealthCheck(): Promise<{
  ok: boolean;
  error?: string;
  status?: number;
  keySuffix?: string;
  keyLength?: number;
  usdaMessage?: string;
  source?: string;
  baseUrl?: string;
}> {
  const apiKey = getUsdaApiKey();
  const debug = getUsdaDebugInfo();

  if (!apiKey) {
    return {
      ok: false,
      error: 'USDA_API_KEY_MISSING',
      source: debug.source,
      baseUrl: debug.baseUrl,
    };
  }

  const baseUrl = getUsdaBaseUrl();
  const url = `${baseUrl}/foods/search?api_key=${encodeURIComponent(apiKey)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: USDA_HEADERS,
      body: JSON.stringify({ query: 'egg', pageSize: 1, pageNumber: 1 }),
    });

    const text = await res.text().catch(() => '');
    let usdaMessage: string | undefined;
    try {
      const json = text ? JSON.parse(text) : null;
      usdaMessage = json?.message ?? json?.error ?? (text ? text.slice(0, 120) : undefined);
    } catch {
      usdaMessage = text ? text.slice(0, 120) : undefined;
    }

    return {
      ok: res.ok,
      status: res.status,
      keySuffix: debug.keySuffix,
      keyLength: debug.keyLength,
      usdaMessage: !res.ok ? usdaMessage : undefined,
      source: debug.source,
      baseUrl: debug.baseUrl,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message ?? 'Unknown error',
      keySuffix: debug.keySuffix,
      keyLength: debug.keyLength,
      source: debug.source,
      baseUrl: debug.baseUrl,
    };
  }
}
