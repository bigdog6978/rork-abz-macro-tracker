import { calculateMacros } from '../utils/macroEngine';
import {
  buildPsmfProfileUpdates,
  getPsmfDaysElapsed,
  hasValidPsmfAcknowledgment,
  isLeanForPsmf,
  isPsmfDurationExceeded,
  PSMF_CARBS_G,
  PSMF_FAT_G_MALE,
} from '../utils/psmfHelpers';
import { UserProfile } from '../types';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    age: 32,
    sex: 'male',
    heightCm: 180,
    weightLb: 190,
    bodyFatPercent: 22,
    goal: 'cut',
    activityLevel: 'moderate_training',
    eatingStyle: 'psmf',
    dietModifiers: [],
    dietNotes: '',
    measurementSystem: 'us',
    onboardingComplete: true,
    ...overrides,
  };
}

describe('PSMF macro engine', () => {
  it('uses lean mass for protein when body fat is provided', () => {
    const profile = makeProfile({ bodyFatPercent: 20, weightLb: 200, sex: 'male' });
    const macros = calculateMacros(profile);
    const leanLb = 200 * 0.8;
    expect(macros.protein_g).toBeGreaterThanOrEqual(Math.round(leanLb * 1.25));
  });

  it('caps carbs at 25g and fat at 25g for males', () => {
    const macros = calculateMacros(makeProfile());
    expect(macros.carbs_g).toBeLessThanOrEqual(30);
    expect(macros.carbs_g).toBe(PSMF_CARBS_G);
    expect(macros.fat_g).toBe(PSMF_FAT_G_MALE);
  });

  it('keeps calories consistent with macro sum', () => {
    const macros = calculateMacros(makeProfile());
    expect(macros.calories).toBe(
      macros.protein_g * 4 + macros.carbs_g * 4 + macros.fat_g * 9
    );
  });

  it('sets PSMF protein at or above standard cut protein', () => {
    const profile = makeProfile();
    const psmf = calculateMacros(profile);
    const standard = calculateMacros({ ...profile, eatingStyle: 'standard' });
    expect(psmf.protein_g).toBeGreaterThanOrEqual(standard.protein_g);
  });
});

describe('psmfHelpers', () => {
  it('flags lean profiles', () => {
    expect(isLeanForPsmf(makeProfile({ bodyFatPercent: 10, sex: 'male' }))).toBe(true);
    expect(isLeanForPsmf(makeProfile({ bodyFatPercent: 25, sex: 'male' }))).toBe(false);
  });

  it('requires acknowledgment for PSMF', () => {
    expect(hasValidPsmfAcknowledgment({ eatingStyle: 'psmf', psmfAcknowledgedAt: undefined })).toBe(false);
    expect(
      hasValidPsmfAcknowledgment({ eatingStyle: 'psmf', psmfAcknowledgedAt: '2026-01-01T00:00:00.000Z' })
    ).toBe(true);
    expect(hasValidPsmfAcknowledgment({ eatingStyle: 'standard' })).toBe(true);
  });

  it('sets psmfStartDate when switching to PSMF', () => {
    const prev = makeProfile({ eatingStyle: 'standard' });
    const updates = buildPsmfProfileUpdates(prev, 'psmf', new Date().toISOString());
    expect(updates.psmfStartDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('detects exceeded PSMF duration', () => {
    const oldStart = new Date();
    oldStart.setDate(oldStart.getDate() - 20);
    expect(isPsmfDurationExceeded(oldStart.toISOString().slice(0, 10))).toBe(true);
    expect(getPsmfDaysElapsed(oldStart.toISOString().slice(0, 10))).toBeGreaterThan(14);
  });
});

describe('PSMF acknowledgment gate', () => {
  it('cannot save valid PSMF without acknowledgment timestamp', () => {
    const profile = makeProfile({ psmfAcknowledgedAt: undefined });
    expect(hasValidPsmfAcknowledgment(profile)).toBe(false);
    profile.psmfAcknowledgedAt = new Date().toISOString();
    expect(hasValidPsmfAcknowledgment(profile)).toBe(true);
  });
});
