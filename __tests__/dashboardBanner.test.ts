import {
  DashboardBannerInputs,
  PHOTO_PROMPT_MIN_STREAK,
  selectDashboardBanner,
} from '../features/home/dashboardBanner';

function inputs(overrides: Partial<DashboardBannerInputs> = {}): DashboardBannerInputs {
  return {
    measurementPromptVisible: false,
    streak: 0,
    hasBaselinePhoto: false,
    photoPromptDismissed: false,
    trainingNudgeEligible: false,
    ...overrides,
  };
}

describe('selectDashboardBanner', () => {
  it('shows nothing when no prompt is eligible', () => {
    expect(selectDashboardBanner(inputs())).toBeNull();
  });

  it('measurement prompt wins over everything', () => {
    expect(
      selectDashboardBanner(
        inputs({
          measurementPromptVisible: true,
          streak: 10,
          trainingNudgeEligible: true,
        })
      )
    ).toBe('measurement');
  });

  it('photo prompt fires at the streak threshold and beats training', () => {
    expect(
      selectDashboardBanner(
        inputs({ streak: PHOTO_PROMPT_MIN_STREAK, trainingNudgeEligible: true })
      )
    ).toBe('photo');
  });

  it('photo prompt respects dismissal, existing baseline, and low streak', () => {
    expect(selectDashboardBanner(inputs({ streak: 5, photoPromptDismissed: true }))).toBeNull();
    expect(selectDashboardBanner(inputs({ streak: 5, hasBaselinePhoto: true }))).toBeNull();
    expect(selectDashboardBanner(inputs({ streak: 2 }))).toBeNull();
  });

  it('training nudge is the lowest-priority fallback', () => {
    expect(selectDashboardBanner(inputs({ trainingNudgeEligible: true }))).toBe('training');
  });
});
