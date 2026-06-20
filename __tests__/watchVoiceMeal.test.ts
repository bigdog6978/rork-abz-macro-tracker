jest.mock('../features/food/foodService', () => ({
  createFoodEntry: jest.fn(),
  addToRecent: jest.fn(),
}));

jest.mock('../features/food/voiceResolver', () => ({
  resolveVoiceItems: jest.fn(),
}));

import { processVoiceMealTranscript } from '../features/food/processVoiceMealTranscript';
import { resolveVoiceItems } from '../features/food/voiceResolver';

describe('processVoiceMealTranscript', () => {
  it('returns a helpful message for empty input', async () => {
    const { result, entries, resolvedItems } = await processVoiceMealTranscript('   ');
    expect(result.ok).toBe(false);
    expect(result.summary).toMatch(/nothing heard/i);
    expect(entries).toHaveLength(0);
    expect(resolvedItems).toHaveLength(0);
  });

  it('returns a helpful message when nothing resolves confidently', async () => {
    (resolveVoiceItems as jest.Mock).mockResolvedValue([
      { status: 'unresolved', item: { id: '1', label: 'mystery', query: 'mystery', reason: 'nope' } },
    ]);

    const { result, entries } = await processVoiceMealTranscript('2 eggs');
    expect(result.ok).toBe(false);
    expect(result.summary).toMatch(/no confident matches/i);
    expect(entries).toHaveLength(0);
  });
});
