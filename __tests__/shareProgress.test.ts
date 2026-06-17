import { buildShareCaption, buildShareHeadline } from '../utils/share/shareCaption';
import { GoalScore } from '../features/progress/types';

const mockGoalScore: GoalScore = {
  overall: 72,
  breakdown: [],
  insights: [],
};

describe('shareCaption', () => {
  it('builds headline from weight trend', () => {
    const headline = buildShareHeadline({
      firstName: 'Alex',
      goalScore: mockGoalScore,
      trends: [
        {
          field: 'weight',
          label: 'Weight',
          baselineValue: 180,
          latestValue: 175,
          change: -5,
          changePercent: -2.8,
          direction: 'down',
          isPositive: true,
          displayValue: '-5.0 lb',
        },
      ],
    });
    expect(headline).toContain('-5.0 lb');
  });

  it('includes metrics and score in caption', () => {
    const caption = buildShareCaption({
      goalScore: mockGoalScore,
      trends: [
        {
          field: 'waist',
          label: 'Waist',
          baselineValue: 34,
          latestValue: 32,
          change: -2,
          changePercent: 0,
          direction: 'down',
          isPositive: true,
          displayValue: '-2.0 in',
        },
      ],
      streak: 5,
    });
    expect(caption).toContain('Physiq Score: 72/100');
    expect(caption).toContain('Waist');
    expect(caption).toContain('#PhysiqMacros');
  });
});
