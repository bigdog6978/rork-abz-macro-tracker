import { calculateMacros, calculateTDEE } from '../utils/macroEngine';
import {
  buildPsmfProfileUpdates,
  calculatePsmfProteinGrams,
  getPsmfDaysElapsed,
  hasValidPsmfAcknowledgment,
  isLeanForPsmf,
  isPsmfDurationExceeded,
  PSMF_CARBS_G,
  PSMF_FAT_G_MALE,
  PSMF_MAX_DEFICIT_FACTOR,
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

function psmfCalories(protein_g: number): number {
  return protein_g * 4 + PSMF_CARBS_G * 4 + PSMF_FAT_G_MALE * 9;
}

describe('PSMF macro engine', () => {
  it('uses lean mass for protein when body fat is provided', () => {
    const profile = makeProfile({ bodyFatPercent: 20, weightLb: 200, sex: 'male' });
    const macros = calculateMacros(profile);
    const leanLb = 200 * 0.8;
    expect(macros.protein_g).toBeGreaterThanOrEqual(Math.round(leanLb * 1.25));
    expect(macros.protein_g).toBeLessThanOrEqual(Math.round(leanLb * 1.5));
  });

  it('caps carbs at 25g and fat at 25g for males', () => {
    const macros = calculateMacros(makeProfile());
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

  it('242 lb male without body fat — moderate training (~242g protein, not inflated)', () => {
    const profile = makeProfile({
      weightLb: 242,
      bodyFatPercent: undefined,
      activityLevel: 'moderate_training',
    });
    const macros = calculateMacros(profile);
    expect(macros.protein_g).toBe(242);
    expect(macros.protein_g).toBeLessThan(280);
    expect(macros.calories).toBe(psmfCalories(242));
  });

  it('242 lb male without body fat — endurance training (activity must not inflate protein)', () => {
    const profile = makeProfile({
      weightLb: 242,
      bodyFatPercent: undefined,
      activityLevel: 'endurance_training',
    });
    const macros = calculateMacros(profile);
    expect(macros.protein_g).toBe(242);
    expect(macros.protein_g).toBeLessThan(280);
    expect(macros.calories).toBe(psmfCalories(242));
  });

  it('242 lb male with 22% body fat — BW floor wins over lean-mass estimate', () => {
    const profile = makeProfile({
      weightLb: 242,
      bodyFatPercent: 22,
      activityLevel: 'moderate_training',
    });
    const macros = calculateMacros(profile);
    const leanLb = 242 * 0.78;
    expect(Math.round(leanLb * 1.25)).toBe(236);
    expect(macros.protein_g).toBe(242);
    expect(macros.calories).toBe(psmfCalories(242));
  });

  it('190 lb male 22% BF existing profile — no TDEE calorie-floor inflation', () => {
    const profile = makeProfile();
    const macros = calculateMacros(profile);
    const expectedProtein = calculatePsmfProteinGrams(profile);
    expect(macros.protein_g).toBe(expectedProtein);
    expect(macros.calories).toBe(
      expectedProtein * 4 + PSMF_CARBS_G * 4 + PSMF_FAT_G_MALE * 9
    );
  });

  it('allows PSMF calories below TDEE × 0.55 (large deficit is expected)', () => {
    const profile = makeProfile({
      weightLb: 242,
      bodyFatPercent: undefined,
      activityLevel: 'endurance_training',
    });
    const macros = calculateMacros(profile);
    const tdee = calculateTDEE(profile);
    expect(macros.calories).toBeLessThan(tdee * PSMF_MAX_DEFICIT_FACTOR);
    expect(macros.calculationDetails?.safetyNote).toBeDefined();
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
