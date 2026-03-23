import type { UnitId, UnitKind } from '../../src/lib/units';

const NUMBER_WORDS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  half: 0.5,
  quarter: 0.25,
};

type UnitMatch = {
  token: string;
  unitId: UnitId;
  unitKind: UnitKind;
  ambiguousOunces?: boolean;
};

const UNIT_MATCHES: UnitMatch[] = [
  // Volume — fluid ounces first to win over bare "ounce"
  { token: 'fluid ounces', unitId: 'fl_oz', unitKind: 'volume' },
  { token: 'fluid ounce', unitId: 'fl_oz', unitKind: 'volume' },
  { token: 'fl oz', unitId: 'fl_oz', unitKind: 'volume' },
  { token: 'milliliters', unitId: 'ml', unitKind: 'volume' },
  { token: 'milliliter', unitId: 'ml', unitKind: 'volume' },
  { token: 'ml', unitId: 'ml', unitKind: 'volume' },
  { token: 'liters', unitId: 'l', unitKind: 'volume' },
  { token: 'liter', unitId: 'l', unitKind: 'volume' },
  { token: 'l', unitId: 'l', unitKind: 'volume' },
  { token: 'cups', unitId: 'cup', unitKind: 'volume' },
  { token: 'cup', unitId: 'cup', unitKind: 'volume' },
  { token: 'tablespoons', unitId: 'tbsp', unitKind: 'volume' },
  { token: 'tablespoon', unitId: 'tbsp', unitKind: 'volume' },
  { token: 'tbsp', unitId: 'tbsp', unitKind: 'volume' },
  { token: 'teaspoons', unitId: 'tsp', unitKind: 'volume' },
  { token: 'teaspoon', unitId: 'tsp', unitKind: 'volume' },
  { token: 'tsp', unitId: 'tsp', unitKind: 'volume' },
  // Mass
  { token: 'ounces', unitId: 'oz', unitKind: 'mass', ambiguousOunces: true },
  { token: 'ounce', unitId: 'oz', unitKind: 'mass', ambiguousOunces: true },
  { token: 'ozs', unitId: 'oz', unitKind: 'mass', ambiguousOunces: true },
  { token: 'oz', unitId: 'oz', unitKind: 'mass', ambiguousOunces: true },
  { token: 'grams', unitId: 'g', unitKind: 'mass' },
  { token: 'gram', unitId: 'g', unitKind: 'mass' },
  { token: 'g', unitId: 'g', unitKind: 'mass' },
  { token: 'pounds', unitId: 'lb', unitKind: 'mass' },
  { token: 'pound', unitId: 'lb', unitKind: 'mass' },
  { token: 'lbs', unitId: 'lb', unitKind: 'mass' },
  { token: 'lb', unitId: 'lb', unitKind: 'mass' },
  // Serving descriptors — treat as count/piece unit
  { token: 'servings', unitId: 'piece', unitKind: 'serving' },
  { token: 'serving', unitId: 'piece', unitKind: 'serving' },
  { token: 'slices', unitId: 'piece', unitKind: 'serving' },
  { token: 'slice', unitId: 'piece', unitKind: 'serving' },
  { token: 'pieces', unitId: 'piece', unitKind: 'serving' },
  { token: 'piece', unitId: 'piece', unitKind: 'serving' },
  { token: 'scoops', unitId: 'piece', unitKind: 'serving' },
  { token: 'scoop', unitId: 'piece', unitKind: 'serving' },
];

export type ParsedMealVoiceItem = {
  label: string;
  query: string;
  quantity: number;
  unitId: UnitId;
  unitKind: UnitKind;
  ambiguousOunces: boolean;
};

function parseLeadingQuantity(segment: string): { quantity: number; rest: string } {
  const trimmed = segment.trim();
  const fractionMatch = trimmed.match(/^(\d+)\s*\/\s*(\d+)\b\s*(.*)$/i);
  if (fractionMatch) {
    const numerator = parseFloat(fractionMatch[1]);
    const denominator = parseFloat(fractionMatch[2]);
    const quantity = denominator > 0 ? numerator / denominator : 1;
    return { quantity, rest: fractionMatch[3] ?? '' };
  }

  const decimalMatch = trimmed.match(/^(\d+(?:\.\d+)?)\b\s*(.*)$/i);
  if (decimalMatch) {
    return {
      quantity: parseFloat(decimalMatch[1]) || 1,
      rest: decimalMatch[2] ?? '',
    };
  }

  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    const wordMatch = trimmed.match(new RegExp(`^${word}\\b\\s*(.*)$`, 'i'));
    if (wordMatch) {
      return { quantity: value, rest: wordMatch[1] ?? '' };
    }
  }

  return { quantity: 1, rest: trimmed };
}

function parseLeadingUnit(segment: string): {
  unitId: UnitId;
  unitKind: UnitKind;
  ambiguousOunces: boolean;
  rest: string;
} {
  const trimmed = segment.trim();
  // Strip a leading "a" or "an" so patterns like "half a cup of" and "a slice of" work
  const withoutArticle = trimmed.replace(/^(?:a|an)\s+/i, '');
  const toMatch = withoutArticle !== trimmed ? withoutArticle : trimmed;

  for (const match of UNIT_MATCHES) {
    const unitMatch = toMatch.match(new RegExp(`^${match.token}\\b\\s*(.*)$`, 'i'));
    if (unitMatch) {
      return {
        unitId: match.unitId,
        unitKind: match.unitKind,
        ambiguousOunces: !!match.ambiguousOunces,
        rest: unitMatch[1] ?? '',
      };
    }
  }

  // No unit found — return original (with article) as food name
  return {
    unitId: 'piece',
    unitKind: 'serving',
    ambiguousOunces: false,
    rest: trimmed,
  };
}

function normalizeFoodName(segment: string): string {
  return segment
    .trim()
    .replace(/^(?:of|a|an)\s+/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[.]+$/g, '')
    .trim();
}

/**
 * Split a transcript string into individual item segments.
 *
 * Handles:
 *  - Commas and semicolons as explicit separators
 *  - "and" / "plus" before a new quantity word
 *  - Implicit item boundaries: a letter word followed directly by a number
 *    word or digit (e.g. "two eggs one avocado" → "two eggs, one avocado")
 *    Note: "a" and "an" are NOT used as implicit boundaries because they are
 *    too ambiguous (they appear in food names like "a handful of nuts").
 */
function splitTranscript(transcript: string): string[] {
  const normalized = transcript
    .toLowerCase()
    .replace(/[;]/g, ',')
    // Split on explicit connectors (and / plus) before a new quantity
    .replace(
      /\s+(?:plus|and)\s+(?=(?:\d+(?:\.\d+)?|\d+\s*\/\s*\d+|a\b|an\b|one\b|two\b|three\b|four\b|five\b|six\b|seven\b|eight\b|nine\b|ten\b|half\b|quarter\b))/g,
      ', '
    )
    // Split on implicit item boundary: a letter-word followed by a number word
    // (excludes "a" / "an" which are articles)
    .replace(
      /([a-z])\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|quarter|\d+(?:\.\d+)?)\s+/g,
      '$1, $2 '
    )
    .replace(/\s+/g, ' ')
    .trim();

  return normalized
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function parseMealVoiceTranscript(transcript: string): ParsedMealVoiceItem[] {
  return splitTranscript(transcript)
    .map((segment) => {
      const { quantity, rest: afterQty } = parseLeadingQuantity(segment);
      const unit = parseLeadingUnit(afterQty);
      const query = normalizeFoodName(unit.rest);

      if (!query) return null;

      return {
        label: segment.trim(),
        query,
        quantity,
        unitId: unit.unitId,
        unitKind: unit.unitKind,
        ambiguousOunces: unit.ambiguousOunces,
      } satisfies ParsedMealVoiceItem;
    })
    .filter((item): item is ParsedMealVoiceItem => !!item);
}
