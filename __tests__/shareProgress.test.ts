import { buildShareCaption, buildShareHeadline } from '../utils/share/shareCaption';
import {
  buildPhotoStatChips,
  computeLeanMassChange,
  pickDefaultShareTemplate,
} from '../utils/share/shareMetrics';
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

  it('includes metrics and score in body progress caption', () => {
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
      template: 'body_progress',
    });
    expect(caption).toContain('Physiq Score: 72/100');
    expect(caption).toContain('Waist');
    expect(caption).toContain('#PhysiqMacros');
  });

  it('builds daily macros caption', () => {
    const caption = buildShareCaption({
      goalScore: mockGoalScore,
      trends: [],
      template: 'daily_macros',
      dailyMacros: { caloriesConsumed: 1950, caloriesTarget: 2000 },
      streak: 3,
    });
    expect(caption).toContain('1950 / 2000');
    expect(caption).toContain('#MacroTracking');
  });

  it('builds progress photo caption from stat chips', () => {
    const caption = buildShareCaption({
      goalScore: mockGoalScore,
      trends: [],
      template: 'progress_photo',
      photoStatChips: [{ label: 'Body fat', value: '-2.0 %', isPositive: true }],
    });
    expect(caption).toContain('Body fat');
    expect(caption).toContain('-2.0 %');
  });
});

describe('shareMetrics', () => {
  it('computes lean mass change', () => {
    const trend = computeLeanMassChange(
      {
        id: '1',
        userId: 'u',
        recordedAt: '',
        weightLb: 200,
        bodyFatPercent: 20,
      },
      {
        id: '2',
        userId: 'u',
        recordedAt: '',
        weightLb: 198,
        bodyFatPercent: 18,
      }
    );
    expect(trend?.displayValue).toContain('lb');
  });

  it('builds photo stat chips from trends', () => {
    const chips = buildPhotoStatChips(
      [
        {
          field: 'bodyFat',
          label: 'Body Fat',
          direction: 'down',
          isPositive: true,
          displayValue: '-2.0 %',
        },
      ],
      { id: '1', userId: 'u', recordedAt: '', weightLb: 180, bodyFatPercent: 22 },
      { id: '2', userId: 'u', recordedAt: '', weightLb: 175, bodyFatPercent: 20 }
    );
    expect(chips.length).toBeGreaterThan(0);
    expect(chips[0].label).toBe('Body fat');
  });

  it('picks default template', () => {
    expect(
      pickDefaultShareTemplate({
        hasDailyData: true,
        caloriesProgress: 0.95,
        hasLatestPhoto: true,
        hasBodyProgress: true,
      })
    ).toBe('daily_macros');
    expect(
      pickDefaultShareTemplate({
        hasDailyData: false,
        caloriesProgress: 0,
        hasLatestPhoto: true,
        hasBodyProgress: false,
      })
    ).toBe('progress_photo');
  });
});
