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
  source?: string | null;
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

function normalizeForPhraseMatch(text: string): string {
  return (text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, ' ')
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
  'roll',
  'sliced',
  'deli',
  'rotisserie',
  'seasoned',
  'flavor',
  'flavoured',
  'flavored',
  'bbq',
  'barbecue',
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
  // Beef cut additions
  'tips',
  'tip',
  'skirt',
  'hanger',
  'chuck',
  'rump',
  'picanha',
  'tritip',
  'cube',
  'cubed',
]);

const NON_INGREDIENT_TERMS = new Set([
  'bar',
  'bars',
  'cereal',
  'cookie',
  'cookies',
  'cracker',
  'crackers',
  'chips',
  'juice',
  'soda',
  'soup',
  'sauce',
  'meal',
  'shake',
  'drink',
  'smoothie',
  'yogurt',
]);

const WEAK_MODIFIER_TOKENS = new Set([
  'small',
  'medium',
  'large',
  'jumbo',
  'extra',
  'mini',
]);

const WHOLE_FOOD_QUALIFIERS = new Set([
  'raw',
  'fresh',
  'plain',
  'skinless',
  'boneless',
  'meat',
  'only',
]);

// ─── Scoring Weights ───────────────────────────────────────────────────────

const TRUSTED_REFERENCE_SOURCES = new Set(['cofid_uk', 'usda']);

const WEIGHTS = {
  exactMatch: 120,
  prefixMatch: 60,
  wordBoundary: 20,
  substring: 8,
  tokenCoverageMax: 40,
  commonFormMax: 50,
  processedPenaltyMax: 55,
  genericIngredientBonus: 26,
  wholeFoodNameBonus: 18,
  brandedIngredientPenalty: 24,
  wholeFoodQualifierBonus: 28,
  primaryIngredientCoverageMax: 50,
  missingPrimaryIngredientPenalty: 95,
  partialPrimaryMissPenalty: 22,
  trustedReferenceBonus: 10,
  curatedBuiltinBonus: 65,
  hasMacrosBonus: 6,
  popularityBoostScale: 15,
  recencyBoostMax: 12,
  recencyWindowMs: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function isIngredientQuery(tokens: string[]): boolean {
  if (tokens.length === 0 || tokens.length > 4) return false;
  if (tokens.some((token) => NON_INGREDIENT_TERMS.has(token))) return false;
  if (tokens.some((token) => PROCESSED_TERMS.has(token))) return false;
  return true;
}

function getPrimaryIngredientTokens(tokens: string[]): string[] {
  const filtered = tokens.filter((token) => !WEAK_MODIFIER_TOKENS.has(token));
  return filtered.length > 0 ? filtered : tokens;
}

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
  const phraseNorm = normalizeForPhraseMatch(name);
  const queryPhraseNorm = normalizeForPhraseMatch(query.norm);
  const nameTokens = tokenize(name);
  const queryTokensSet = new Set(query.tokens);
  const ingredientQuery = isIngredientQuery(query.tokens);
  const primaryIngredientTokens = ingredientQuery
    ? getPrimaryIngredientTokens(query.tokens)
    : query.tokens;

  // ─── Exact match ─────────────────────────────────────────────────────────
  if (nameNorm === query.norm || phraseNorm === queryPhraseNorm) {
    score += WEIGHTS.exactMatch;
    reasons.push(`exact: +${WEIGHTS.exactMatch}`);
  }

  // ─── Prefix match ────────────────────────────────────────────────────────
  if (
    (nameNorm.startsWith(query.norm) || phraseNorm.startsWith(queryPhraseNorm)) &&
    phraseNorm !== queryPhraseNorm
  ) {
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

  if (ingredientQuery) {
    const hasBrand = !!normalize(food.brand ?? '');
    const processedNameTokens = nameTokens.filter((token) => PROCESSED_TERMS.has(token));
    const wholeFoodQualifierCount = nameTokens.filter((token) => WHOLE_FOOD_QUALIFIERS.has(token)).length;
    const matchedPrimaryTokens = primaryIngredientTokens.filter((token) =>
      nameTokens.some((nt) => nt.includes(token) || token.includes(nt))
    );
    const primaryCoverage =
      primaryIngredientTokens.length > 0
        ? matchedPrimaryTokens.length / primaryIngredientTokens.length
        : 0;
    const primaryCoverageBonus = Math.round(
      primaryCoverage * WEIGHTS.primaryIngredientCoverageMax
    );

    if (!hasBrand) {
      score += WEIGHTS.genericIngredientBonus;
      reasons.push(`genericIngredient: +${WEIGHTS.genericIngredientBonus}`);
    } else {
      score -= WEIGHTS.brandedIngredientPenalty;
      reasons.push(`brandedIngredient: -${WEIGHTS.brandedIngredientPenalty}`);
    }

    if (processedNameTokens.length === 0) {
      score += WEIGHTS.wholeFoodNameBonus;
      reasons.push(`wholeFoodName: +${WEIGHTS.wholeFoodNameBonus}`);
    }

    if (primaryCoverageBonus > 0) {
      score += primaryCoverageBonus;
      reasons.push(`primaryCoverage(${primaryCoverage.toFixed(2)}): +${primaryCoverageBonus}`);
    }

    if (matchedPrimaryTokens.length === 0 && primaryIngredientTokens.length > 0) {
      score -= WEIGHTS.missingPrimaryIngredientPenalty;
      reasons.push(`missingPrimaryIngredient: -${WEIGHTS.missingPrimaryIngredientPenalty}`);
    } else if (matchedPrimaryTokens.length < primaryIngredientTokens.length) {
      const missPenalty =
        (primaryIngredientTokens.length - matchedPrimaryTokens.length) *
        WEIGHTS.partialPrimaryMissPenalty;
      score -= missPenalty;
      reasons.push(`partialPrimaryMiss: -${missPenalty}`);
    }

    if (wholeFoodQualifierCount > 0) {
      const qualifierBonus = Math.min(
        wholeFoodQualifierCount * 8,
        WEIGHTS.wholeFoodQualifierBonus
      );
      score += qualifierBonus;
      reasons.push(`wholeFoodQualifiers(${wholeFoodQualifierCount}): +${qualifierBonus}`);
    }
  }

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

  // ─── Source trust: boost trusted reference databases for ingredient queries ─
  if (ingredientQuery && food.source && TRUSTED_REFERENCE_SOURCES.has(food.source)) {
    score += WEIGHTS.trustedReferenceBonus;
    reasons.push(`trustedRef(${food.source}): +${WEIGHTS.trustedReferenceBonus}`);
  }

  // ─── Curated built-in bonus: always surface app's canonical foods first ───
  if (food.id?.startsWith('builtin:')) {
    score += WEIGHTS.curatedBuiltinBonus;
    reasons.push(`curatedBuiltin: +${WEIGHTS.curatedBuiltinBonus}`);
  }

  // ─── Macro data present: slight boost for foods with actual nutrition data ──
  if (
    typeof food.calories === 'number' &&
    food.calories > 0 &&
    typeof food.protein === 'number'
  ) {
    score += WEIGHTS.hasMacrosBonus;
    reasons.push(`hasMacros: +${WEIGHTS.hasMacrosBonus}`);
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
