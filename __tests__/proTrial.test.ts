import { computeTrialStatus, getTrialEndMs, TRIAL_DURATION_DAYS } from '../features/pro/trial';

const DAY_MS = 24 * 60 * 60 * 1000;
const START = '2026-01-01T00:00:00.000Z';

describe('trial logic', () => {
  it('reports no trial when never started', () => {
    const status = computeTrialStatus(null, new Date(START));
    expect(status.started).toBe(false);
    expect(status.active).toBe(false);
    expect(status.expired).toBe(false);
    expect(status.daysRemaining).toBe(0);
    expect(status.endsAt).toBeNull();
  });

  it('treats invalid start dates as no trial', () => {
    expect(getTrialEndMs('not-a-date')).toBeNull();
    const status = computeTrialStatus('not-a-date', new Date(START));
    expect(status.started).toBe(false);
  });

  it('is active immediately after starting with full days remaining', () => {
    const status = computeTrialStatus(START, new Date(START));
    expect(status.active).toBe(true);
    expect(status.expired).toBe(false);
    expect(status.daysRemaining).toBe(TRIAL_DURATION_DAYS);
  });

  it('is active partway through the window', () => {
    const now = new Date(new Date(START).getTime() + 2 * DAY_MS);
    const status = computeTrialStatus(START, now);
    expect(status.active).toBe(true);
    expect(status.daysRemaining).toBe(3);
  });

  it('rounds up the final partial day to at least 1', () => {
    const now = new Date(new Date(START).getTime() + 4 * DAY_MS + 23 * 60 * 60 * 1000);
    const status = computeTrialStatus(START, now);
    expect(status.active).toBe(true);
    expect(status.daysRemaining).toBe(1);
  });

  it('expires exactly at the 5-day boundary', () => {
    const now = new Date(new Date(START).getTime() + TRIAL_DURATION_DAYS * DAY_MS);
    const status = computeTrialStatus(START, now);
    expect(status.active).toBe(false);
    expect(status.expired).toBe(true);
    expect(status.started).toBe(true);
    expect(status.daysRemaining).toBe(0);
  });

  it('remains expired after the window', () => {
    const now = new Date(new Date(START).getTime() + 10 * DAY_MS);
    const status = computeTrialStatus(START, now);
    expect(status.expired).toBe(true);
    expect(status.active).toBe(false);
  });

  it('computes the correct end timestamp', () => {
    const endMs = getTrialEndMs(START);
    expect(endMs).toBe(new Date(START).getTime() + TRIAL_DURATION_DAYS * DAY_MS);
  });
});
