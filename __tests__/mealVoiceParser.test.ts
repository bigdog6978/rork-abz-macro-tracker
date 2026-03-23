import { parseMealVoiceTranscript } from '../features/food/mealVoiceParser';

describe('mealVoiceParser', () => {
  // ── Existing baseline tests ────────────────────────────────────────────────

  it('parses a comma-separated meal with mixed count and liquid units', () => {
    expect(parseMealVoiceTranscript('2 eggs, 1 avocado, 6 ozs orange juice')).toEqual([
      {
        label: '2 eggs',
        query: 'eggs',
        quantity: 2,
        unitId: 'piece',
        unitKind: 'serving',
        ambiguousOunces: false,
      },
      {
        label: '1 avocado',
        query: 'avocado',
        quantity: 1,
        unitId: 'piece',
        unitKind: 'serving',
        ambiguousOunces: false,
      },
      {
        label: '6 ozs orange juice',
        query: 'orange juice',
        quantity: 6,
        unitId: 'oz',
        unitKind: 'mass',
        ambiguousOunces: true,
      },
    ]);
  });

  it('splits spoken list separators and number words', () => {
    expect(parseMealVoiceTranscript('two eggs and an avocado plus 8 fl oz orange juice')).toEqual([
      {
        label: 'two eggs',
        query: 'eggs',
        quantity: 2,
        unitId: 'piece',
        unitKind: 'serving',
        ambiguousOunces: false,
      },
      {
        label: 'an avocado',
        query: 'avocado',
        quantity: 1,
        unitId: 'piece',
        unitKind: 'serving',
        ambiguousOunces: false,
      },
      {
        label: '8 fl oz orange juice',
        query: 'orange juice',
        quantity: 8,
        unitId: 'fl_oz',
        unitKind: 'volume',
        ambiguousOunces: false,
      },
    ]);
  });

  // ── Quantity edge cases ────────────────────────────────────────────────────

  it('parses "half avocado" as 0.5 quantity', () => {
    const result = parseMealVoiceTranscript('half avocado');
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(0.5);
    expect(result[0].query).toBe('avocado');
    expect(result[0].unitKind).toBe('serving');
  });

  it('parses "quarter cup oatmeal" as 0.25 quantity with cup unit', () => {
    const result = parseMealVoiceTranscript('quarter cup oatmeal');
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(0.25);
    expect(result[0].unitId).toBe('cup');
    expect(result[0].query).toBe('oatmeal');
  });

  it('parses "1/2 cup Greek yogurt" as 0.5 quantity', () => {
    const result = parseMealVoiceTranscript('1/2 cup greek yogurt');
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(0.5);
    expect(result[0].unitId).toBe('cup');
    expect(result[0].query).toBe('greek yogurt');
  });

  // ── Unit parsing ──────────────────────────────────────────────────────────

  it('parses "1 cup cottage cheese"', () => {
    const result = parseMealVoiceTranscript('1 cup cottage cheese');
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(1);
    expect(result[0].unitId).toBe('cup');
    expect(result[0].unitKind).toBe('volume');
    expect(result[0].query).toBe('cottage cheese');
  });

  it('parses "6 ounces orange juice"', () => {
    const result = parseMealVoiceTranscript('6 ounces orange juice');
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(6);
    expect(result[0].unitId).toBe('oz');
    expect(result[0].ambiguousOunces).toBe(true);
    expect(result[0].query).toBe('orange juice');
  });

  it('parses "2 tablespoons peanut butter"', () => {
    const result = parseMealVoiceTranscript('2 tablespoons peanut butter');
    expect(result).toHaveLength(1);
    expect(result[0].unitId).toBe('tbsp');
    expect(result[0].query).toBe('peanut butter');
  });

  it('parses "1 teaspoon olive oil"', () => {
    const result = parseMealVoiceTranscript('1 teaspoon olive oil');
    expect(result).toHaveLength(1);
    expect(result[0].unitId).toBe('tsp');
    expect(result[0].query).toBe('olive oil');
  });

  // ── Serving descriptor units ──────────────────────────────────────────────

  it('parses "one slice toast" using slice as a serving unit', () => {
    const result = parseMealVoiceTranscript('one slice toast');
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(1);
    expect(result[0].unitId).toBe('piece');
    expect(result[0].unitKind).toBe('serving');
    expect(result[0].query).toBe('toast');
  });

  it('parses "2 slices bread"', () => {
    const result = parseMealVoiceTranscript('2 slices bread');
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(2);
    expect(result[0].unitId).toBe('piece');
    expect(result[0].query).toBe('bread');
  });

  it('parses "1 scoop protein powder"', () => {
    const result = parseMealVoiceTranscript('1 scoop protein powder');
    expect(result).toHaveLength(1);
    expect(result[0].unitId).toBe('piece');
    expect(result[0].query).toBe('protein powder');
  });

  // ── Article stripping in units ────────────────────────────────────────────

  it('parses "half a cup of oatmeal" as 0.5 cup oatmeal', () => {
    const result = parseMealVoiceTranscript('half a cup of oatmeal');
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(0.5);
    expect(result[0].unitId).toBe('cup');
    expect(result[0].query).toBe('oatmeal');
  });

  it('parses "a slice of bread" as 1 piece bread', () => {
    const result = parseMealVoiceTranscript('a slice of bread');
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(1);
    expect(result[0].unitId).toBe('piece');
    expect(result[0].query).toBe('bread');
  });

  it('parses "an avocado" as 1 avocado', () => {
    const result = parseMealVoiceTranscript('an avocado');
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(1);
    expect(result[0].query).toBe('avocado');
  });

  // ── Implicit item boundary splitting ─────────────────────────────────────

  it('splits "two eggs one avocado" on implicit number word boundary', () => {
    const result = parseMealVoiceTranscript('two eggs one avocado');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ quantity: 2, query: 'eggs' });
    expect(result[1]).toMatchObject({ quantity: 1, query: 'avocado' });
  });

  it('splits "two eggs one slice toast" — implicit boundary with serving unit', () => {
    const result = parseMealVoiceTranscript('two eggs one slice toast');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ quantity: 2, query: 'eggs' });
    expect(result[1]).toMatchObject({ quantity: 1, unitId: 'piece', query: 'toast' });
  });

  it('splits "one cup oatmeal three eggs" on implicit boundary', () => {
    const result = parseMealVoiceTranscript('one cup oatmeal three eggs');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ quantity: 1, unitId: 'cup', query: 'oatmeal' });
    expect(result[1]).toMatchObject({ quantity: 3, query: 'eggs' });
  });

  it('does NOT split "2 eggs" (no second item)', () => {
    const result = parseMealVoiceTranscript('2 eggs');
    expect(result).toHaveLength(1);
  });

  it('does NOT split "six fluid ounces orange juice" mid-unit', () => {
    const result = parseMealVoiceTranscript('six fluid ounces orange juice');
    expect(result).toHaveLength(1);
    expect(result[0].unitId).toBe('fl_oz');
    expect(result[0].query).toBe('orange juice');
  });

  // ── Multi-item natural speech sequences ───────────────────────────────────

  it('parses "2 eggs and 1 avocado" with explicit "and"', () => {
    const result = parseMealVoiceTranscript('2 eggs and 1 avocado');
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ quantity: 2, query: 'eggs' });
    expect(result[1]).toMatchObject({ quantity: 1, query: 'avocado' });
  });

  it('handles mixed commas and natural connectors', () => {
    const result = parseMealVoiceTranscript(
      '2 eggs, 1 cup cottage cheese and half avocado'
    );
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({ quantity: 2, query: 'eggs' });
    expect(result[1]).toMatchObject({ quantity: 1, unitId: 'cup', query: 'cottage cheese' });
    expect(result[2]).toMatchObject({ quantity: 0.5, query: 'avocado' });
  });

  // ── Edge / empty ──────────────────────────────────────────────────────────

  it('returns empty array for blank input', () => {
    expect(parseMealVoiceTranscript('')).toEqual([]);
  });

  it('returns empty array for whitespace-only input', () => {
    expect(parseMealVoiceTranscript('   ')).toEqual([]);
  });
});
