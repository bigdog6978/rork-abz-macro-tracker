import { parseMealVoiceTranscript } from '../features/food/mealVoiceParser';

describe('mealVoiceParser', () => {
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
});
