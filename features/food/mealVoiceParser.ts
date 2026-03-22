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
  { token: 'fluid ounces', unitId: 'fl_oz', unitKind: 'volume' },
  { token: 'fluid ounce', unitId: 'fl_oz', unitKind: 'volume' },
  { token: 'fl oz', unitId: 'fl_oz', unitKind: 'volume' },
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
  for (const match of UNIT_MATCHES) {
    const unitMatch = trimmed.match(new RegExp(`^${match.token}\\b\\s*(.*)$`, 'i'));
    if (unitMatch) {
      return {
        unitId: match.unitId,
        unitKind: match.unitKind,
        ambiguousOunces: !!match.ambiguousOunces,
        rest: unitMatch[1] ?? '',
      };
    }
  }

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
    .replace(/^of\s+/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[.]+$/g, '')
    .trim();
}

function splitTranscript(transcript: string): string[] {
  const normalized = transcript
    .toLowerCase()
    .replace(/[;]/g, ',')
    .replace(/\s+(?:plus|and)\s+(?=(?:\d+(?:\.\d+)?|\d+\s*\/\s*\d+|a\b|an\b|one\b|two\b|three\b|four\b|five\b|six\b|seven\b|eight\b|nine\b|ten\b|half\b|quarter\b))/g, ', ')
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
      const { quantity, rest } = parseLeadingQuantity(segment);
      const unit = parseLeadingUnit(rest);
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
