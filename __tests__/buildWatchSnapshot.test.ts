import { buildWatchSnapshotPayload, WatchSnapshotInputs } from '../features/pro/buildWatchSnapshot';
import {
  computeDynamicState,
  computeHydrationLogState,
} from '../features/pro/computeDynamicState';
import { UserProfile } from '../types';
import type { AthleteProfile, ProSettings } from '../features/pro/types';

const profile = {
  firstName: 'Kris',
  onboardingComplete: true,
  eatingStyle: 'standard',
  dietModifiers: ['low_glycemic'],
} as unknown as UserProfile;

const settings: ProSettings = {
  dynamicMacrosEnabled: true,
  hydrationEnabled: true,
  healthIntegrationEnabled: true,
  electrolyteNudgesEnabled: false,
  healthPermissionStatus: 'connected',
  healthEducationDismissed: false,
  soundEffectsEnabled: true,
};

const athleteProfile = {
  enabled: false,
  persona: 'general',
  userType: 'performance_intermediate',
  sport: 'Soccer',
  sports: [],
  activities: [],
  season: { phase: 'in_season' },
  schedule: [],
} as unknown as AthleteProfile;

function baseInputs(): WatchSnapshotInputs {
  return {
    profile,
    targets: { calories: 2600, protein_g: 165.4, carbs_g: 260, fat_g: 72 },
    totals: { calories: 1360, protein_g: 92.26, carbs_g: 180, fat_g: 41 },
    streak: 4,
    hydrationConsumedMl: 1300.4,
    hydrationTargetMl: 2400,
    hydrationUnit: 'ml',
    primaryHex: '#DEFF00',
    athleteProfile,
    settings,
    inferredDayType: 'workout_day',
    healthSignals: null,
    healthConnected: true,
    voiceMealFeedback: '',
  };
}

describe('buildWatchSnapshotPayload', () => {
  it('produces the documented WatchConnectivity contract (all string values)', () => {
    const payload = buildWatchSnapshotPayload(baseInputs());

    // Every value must be a string (WatchConnectivity convention).
    for (const [key, value] of Object.entries(payload)) {
      expect(typeof value).toBe('string');
      expect(key).toBeTruthy();
    }

    expect(payload.caloriesRemaining).toBe('1240');
    expect(payload.caloriesTarget).toBe('2600');
    expect(payload.caloriesConsumed).toBe('1360');
    expect(payload.proteinConsumed).toBe('92.3'); // 1-decimal rounding
    expect(payload.proteinTarget).toBe('165.4');
    expect(payload.hydrationConsumedMl).toBe('1300');
    expect(payload.hydration).toBe('1300/2400 ml');
    expect(payload.streak).toBe('4');
    expect(payload.firstName).toBe('Kris');
    expect(payload.syncState).toBe('ready');
    expect(payload.dayType).toBe('workout_day');
    expect(payload.dayTypeLabel).toBe('Workout day');
    expect(payload.dayTypeOverride).toBe('auto');
    expect(payload.dayTypeSource).toBe('inferred');
    expect(payload.healthConnected).toBe('1');
    expect(payload.primaryHex).toBe('#DEFF00');
    expect(payload.tier).toBe('unlocked');
  });

  it('clamps calories remaining at zero and reflects overrides', () => {
    const inputs = baseInputs();
    inputs.totals = { ...inputs.totals, calories: 3000 };
    inputs.settings = { ...settings, dayTypeOverride: 'training' };
    const payload = buildWatchSnapshotPayload(inputs);

    expect(payload.caloriesRemaining).toBe('0');
    expect(payload.dayTypeOverride).toBe('training');
    expect(payload.dayTypeSource).toBe('override');
  });

  it('marks degraded sync before onboarding completes', () => {
    const inputs = baseInputs();
    inputs.profile = { ...profile, onboardingComplete: false } as UserProfile;
    const payload = buildWatchSnapshotPayload(inputs);
    expect(payload.syncState).toBe('onboarding_incomplete');
    expect(payload.syncMessage.length).toBeGreaterThan(0);
  });
});

describe('computeDynamicState', () => {
  const base = { calories: 2600, protein_g: 165, carbs_g: 260, fat_g: 72 };

  it('returns core targets untouched when the dynamic layer is off', () => {
    const off = { ...settings, dynamicMacrosEnabled: false };
    const result = computeDynamicState(base, off, null, athleteProfile, null);
    expect(result.targets).toEqual(base);
    expect(result.tierApplied).toBe('core');
    expect(result.inferredDayType).toBe('rest_day');
  });

  it('applies the pro layer with no signals as a rest-day passthrough', () => {
    const result = computeDynamicState(base, settings, null, athleteProfile, null);
    expect(result.tierApplied).toBe('pro');
    expect(result.targets).toEqual(base);
  });
});

describe('computeHydrationLogState', () => {
  const log = { dateKey: '2026-07-05', consumedMl: 900, targetMl: 2400, lastUpdatedAt: 'x' };

  it('keeps consumed within the same day and applies the new target', () => {
    const next = computeHydrationLogState(log, '2026-07-05', 2600);
    expect(next.consumedMl).toBe(900);
    expect(next.targetMl).toBe(2600);
  });

  it('resets consumed on day rollover', () => {
    const next = computeHydrationLogState(log, '2026-07-06', 2600);
    expect(next.consumedMl).toBe(0);
    expect(next.dateKey).toBe('2026-07-06');
  });
});
