/**
 * Offline food search ranking for local on-device food database.
 * Re-ranks up to 50 candidates using deterministic scoring.
 * No network, no Supabase — local data only.
 */

// ─── Data Types ─────────────────────────────────────────────────────────────

export interface FoodItem {
  id: string;
  name: string;
  brand?: string | null;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface FoodStats {
  selectionCount: number;
  lastSelectedAt: number; // epoch ms
}

export interface ScoredFood extends FoodItem {
  __debug?: { score: number; reasons: string[] };
}

// ─── Normalization & Tokenization ───────────────────────────────────────────

/**
 * Normalize text for comparison: lowercase, trim, collapse whitespace.
 */
export function normalize(text: string): string {
  return (text ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Tokenize text into words (split on non-alphanumeric, filter empty).
 */
export function tokenize(text: string): string[] {
  const norm = normalize(text);
  return norm
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 0);
}

// ─── Processed / Odd Terms (penalized only if user didn't type them) ─────────

const PROCESSED_TERMS = new Set([
  'spread',
  'bologna',
  'frankfurter',
  'bratwurst',
  'canned',
  'feet',
  'skin',
  'fat',
  'nuggets',
  'tenders',
  'meatless',
  'giblets',
  'gizzard',
  'liver',
  'heart',
  'offal',
  'processed',
  'deli',
  'luncheon',
  'jerky',
  'sausage',
  'pate',
  'paste',
  'pâté',
  'smoked',
  'cured',
  'pickled',
  'dried',
  'dehydrated',
  'powder',
  'extract',
  'concentrate',
  'broth',
  'stock',
  'bouillon',
  'gravy',
  'sauce',
  'dressing',
  'mayonnaise',
  'ketchup',
  'mustard',
]);

// ─── Common Form Tokens (boost when query is base term like "chicken") ────────

const COMMON_FORMS = new Set([
  'breast',
  'thigh',
  'thighs',
  'drumstick',
  'drumsticks',
  'wing',
  'wings',
  'tenderloin',
  'ground',
  'whole',
  'meat',
  'cooked',
  'raw',
  'grilled',
  'roasted',
  'baked',
  'fried',
  'steamed',
  'boiled',
  'broiled',
  'fillet',
  'filet',
  'cutlet',
  'chop',
  'loin',
  'sirloin',
  'ribeye',
  'strip',
  'round',
  'flank',
  'brisket',
  'shank',
  'leg',
  'legs',
]);

// ─── Scoring Weights ───────────────────────────────────────────────────────

const WEIGHTS = {
  exactMatch: 120,
  prefixMatch: 60,
  wordBoundary: 20,
  substring: 8,
  tokenCoverageMax: 40,
  commonFormMax: 50,
  processedPenaltyMax: 55,
  popularityBoostScale: 15,
  recencyBoostMax: 12,
  recencyWindowMs: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// ─── Score Food ─────────────────────────────────────────────────────────────

/**
 * Score a single food item against a query.
 * Returns { score, reasons } for deterministic ranking.
 */
export function scoreFood(
  food: FoodItem,
  query: { norm: string; tokens: string[] },
  stats?: FoodStats
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  const name = food.name ?? '';
  const nameNorm = normalize(name);
  const nameTokens = tokenize(name);
  const queryTokensSet = new Set(query.tokens);

  // ─── Exact match ─────────────────────────────────────────────────────────
  if (nameNorm === query.norm) {
    score += WEIGHTS.exactMatch;
    reasons.push(`exact: +${WEIGHTS.exactMatch}`);
  }

  // ─── Prefix match ────────────────────────────────────────────────────────
  if (nameNorm.startsWith(query.norm) && nameNorm !== query.norm) {
    score += WEIGHTS.prefixMatch;
    reasons.push(`prefix: +${WEIGHTS.prefixMatch}`);
  }

  // ─── Word boundary & substring matches per token ──────────────────────────
  let wordBoundaryCount = 0;
  let substringCount = 0;

  for (const token of query.tokens) {
    if (!token) continue;

    const wordBoundaryRe = new RegExp(`\\b${escapeRegex(token)}\\b`, 'i');
    if (wordBoundaryRe.test(name)) {
      wordBoundaryCount++;
    }

    if (nameNorm.includes(token)) {
      substringCount++;
    }
  }

  if (wordBoundaryCount > 0) {
    const add = wordBoundaryCount * WEIGHTS.wordBoundary;
    score += add;
    reasons.push(`wordBoundary(${wordBoundaryCount}): +${add}`);
  }
  if (substringCount > 0) {
    const add = substringCount * WEIGHTS.substring;
    score += add;
    reasons.push(`substring(${substringCount}): +${add}`);
  }

  // ─── Token coverage ratio (0..40) ────────────────────────────────────────
  const matchedTokens = query.tokens.filter((t) =>
    nameTokens.some((nt) => nt.includes(t) || t.includes(nt))
  );
  const coverage =
    query.tokens.length > 0
      ? matchedTokens.length / query.tokens.length
      : 0;
  const coverageScore = Math.round(coverage * WEIGHTS.tokenCoverageMax);
  if (coverageScore > 0) {
    score += coverageScore;
    reasons.push(`tokenCoverage(${coverage.toFixed(2)}): +${coverageScore}`);
  }

  // ─── Common form boost (0..35) ────────────────────────────────────────────
  let commonFormBoost = 0;
  const hasSpecificFormInQuery = query.tokens.some((t) => COMMON_FORMS.has(t));

  if (hasSpecificFormInQuery) {
    // User typed e.g. "breast" — strongly boost items with that token
    for (const t of query.tokens) {
      if (COMMON_FORMS.has(t) && nameTokens.some((nt) => nt === t)) {
        commonFormBoost += 25;
        reasons.push(`specificForm("${t}"): +25`);
      }
    }
  } else {
    // Base term like "chicken" — boost items with common forms
    // Breast and thigh are highest-priority (most common cuts)
    const PRIORITY_FORMS = new Set(['breast', 'thigh', 'thighs']);
    const matchedForms = nameTokens.filter((t) => COMMON_FORMS.has(t));
    for (const t of matchedForms) {
      commonFormBoost += PRIORITY_FORMS.has(t) ? 22 : 10;
    }
    commonFormBoost = Math.min(commonFormBoost, WEIGHTS.commonFormMax);
    if (commonFormBoost > 0) {
      reasons.push(`commonForm(${matchedForms.join(',')}): +${commonFormBoost}`);
    }
  }

  score += commonFormBoost;

  // ─── Processed penalty (0..40) — only if user did NOT type those tokens ───
  let processedPenalty = 0;
  for (const nt of nameTokens) {
    if (PROCESSED_TERMS.has(nt) && !queryTokensSet.has(nt)) {
      processedPenalty += 8;
    }
  }
  processedPenalty = Math.min(processedPenalty, WEIGHTS.processedPenaltyMax);
  if (processedPenalty > 0) {
    score -= processedPenalty;
    reasons.push(`processedPenalty: -${processedPenalty}`);
  }

  // ─── Personalization: popularity & recency ────────────────────────────────
  if (stats) {
    const popularityBoost =
      Math.log(1 + stats.selectionCount) * WEIGHTS.popularityBoostScale;
    if (popularityBoost > 0) {
      score += popularityBoost;
      reasons.push(`popularity(log(1+${stats.selectionCount})): +${popularityBoost.toFixed(1)}`);
    }

    const now = Date.now();
    const age = now - stats.lastSelectedAt;
    if (age >= 0 && age <= WEIGHTS.recencyWindowMs) {
      const recencyBoost =
        (1 - age / WEIGHTS.recencyWindowMs) * WEIGHTS.recencyBoostMax;
      if (recencyBoost > 0) {
        score += recencyBoost;
        reasons.push(`recency: +${recencyBoost.toFixed(1)}`);
      }
    }
  }

  return { score, reasons };
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Rank Foods ─────────────────────────────────────────────────────────────

/**
 * Rank and sort food items by relevance score.
 * Use after fetching up to 50 candidates from local storage.
 *
 * @param foods - Up to 50 candidate foods from SQLite/JSON
 * @param queryText - User's search query
 * @param statsMap - Optional map of foodId -> FoodStats for personalization
 * @param debug - If true, attach __debug { score, reasons } to each item
 */
export function rankFoods(
  foods: FoodItem[],
  queryText: string,
  statsMap?: Record<string, FoodStats>,
  debug?: boolean
): FoodItem[] {
  const queryNorm = normalize(queryText);
  const queryTokens = tokenize(queryText);

  if (queryTokens.length === 0 && !queryNorm) {
    return [...foods];
  }

  const query = { norm: queryNorm, tokens: queryTokens };

  const scored = foods.map((food) => {
    const stats = statsMap?.[food.id];
    const { score, reasons } = scoreFood(food, query, stats);

    const result: ScoredFood = { ...food };
    if (debug) {
      result.__debug = { score, reasons };
    }
    return { food: result, score };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.map((s) => s.food);
}

// ─── Usage Example ──────────────────────────────────────────────────────────
//
// After fetching up to 50 candidates from local storage (SQLite or JSON):
//
//   import { rankFoods } from './src/search/foodSearch';
//   import { getSavedFoods } from '../storage/foodRepo';
//
//   // 1. Get candidates (e.g. from SQLite: SELECT * FROM foods WHERE name LIKE '%chicken%' LIMIT 50)
//   const candidates = await getLocalFoodCandidates(query); // returns FoodItem[]
//
//   // 2. Build stats map from selection history (optional, for personalization)
//   const statsMap = await getFoodStatsMap(); // Record<string, FoodStats>
//
//   // 3. Rank and return sorted results
//   const ranked = rankFoods(candidates, query, statsMap, __DEV__);
//
//   // 4. Use ranked in UI
//   setSearchResults(ranked);
