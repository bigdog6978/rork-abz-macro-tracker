import {
  buildProHealthSignals,
  getSleepQueryRange,
  sumSleepHours,
  sumWorkoutMinutes,
} from '../services/healthkitMapping';

const sample = (value: number | string, start = '2026-06-17T00:00:00.000Z', end = '2026-06-17T01:00:00.000Z') =>
  ({ value, startDate: start, endDate: end }) as { value: number | string; startDate: string; endDate: string };

describe('healthkitMapping', () => {
  it('sums asleep stages and ignores awake segments', () => {
    const hours = sumSleepHours([
      sample('ASLEEP', '2026-06-17T01:00:00.000Z', '2026-06-17T02:30:00.000Z'),
      sample('AWAKE', '2026-06-17T02:30:00.000Z', '2026-06-17T02:45:00.000Z'),
      sample('ASLEEP', '2026-06-17T02:45:00.000Z', '2026-06-17T06:00:00.000Z'),
    ] as never);
    expect(hours).toBeCloseTo(4.75, 1);
  });

  it('uses prior-noon sleep query window', () => {
    const now = new Date(2026, 5, 17, 10, 0, 0);
    const range = getSleepQueryRange(now);
    const start = new Date(range.startDate);
    expect(start.getDate()).toBe(16);
    expect(start.getHours()).toBe(12);
    expect(range.endDate).toBe(now.toISOString());
  });

  it('prefers workout duration over exercise minutes when larger', () => {
    const signals = buildProHealthSignals({
      activeEnergy: [sample(420)],
      stepCount: sample(8000),
      exerciseMinutes: [sample(20)],
      workouts: [{ duration: 55 * 60 }],
      heartRateSamples: [sample(72)],
      sleepSamples: [],
      restingHR: sample(60),
      hrvSamples: [sample(45)],
      now: new Date('2026-06-17T12:00:00.000Z'),
    } as never);
    expect(signals.workoutMinutes).toBe(55);
    expect(signals.workoutCount).toBe(1);
    expect(signals.hrvSdnnMs).toBe(45);
    expect(signals.activeEnergyKcal).toBe(420);
  });

  it('sums workout minutes from multiple sessions', () => {
    expect(sumWorkoutMinutes([{ duration: 1800 }, { duration: 1200 }])).toBe(50);
  });
});
