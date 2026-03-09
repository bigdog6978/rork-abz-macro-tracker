import {
  calculateMacros,
  calculateTDEE,
  getRecompCalorieAdjustment,
} from '../utils/macroEngine';
import {
  legacyMacroStrategyToEatingStyle,
  normalizeLegacyActivityLevel,
  UserProfile,
} from '../types';

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    age: 32,
    sex: 'male',
    heightCm: 180,
    weightLb: 190,
    bodyFatPercent: undefined,
    goal: 'cut',
    activityLevel: 'moderate_training',
    eatingStyle: 'standard',
    dietModifiers: [],
    dietNotes: '',
    measurementSystem: 'us',
    onboardingComplete: true,
    firstName: 'Chris',
    ...overrides,
  };
}

describe('macroEngine', () => {
  it('applies recomp calorie reduction only when body fat is above threshold', () => {
    const highBodyFat = makeProfile({ goal: 'recompose', bodyFatPercent: 24, sex: 'male' });
    const lowBodyFat = makeProfile({ goal: 'recompose', bodyFatPercent: 14, sex: 'male' });

    expect(getRecompCalorieAdjustment(highBodyFat)).toBe(-0.05);
    expect(getRecompCalorieAdjustment(lowBodyFat)).toBe(0);
  });

  it('keeps displayed calories consistent with rounded macros', () => {
    const profile = makeProfile({ goal: 'gain', activityLevel: 'strength_training' });
    const macros = calculateMacros(profile);

    expect(macros.calories).toBe(macros.protein_g * 4 + macros.carbs_g * 4 + macros.fat_g * 9);
  });

  it('includes calculation details for transparency UI', () => {
    const profile = makeProfile({ goal: 'cut', activityLevel: 'moderate_training' });
    const macros = calculateMacros(profile);

    expect(macros.calculationDetails).toBeDefined();
    expect(macros.calculationDetails?.bmrFormula).toBe('Mifflin-St Jeor');
    expect(macros.calculationDetails?.activityLevelLabel).toBe('Moderate Training');
    expect(macros.calculationDetails?.proteinTargetGrams).toBe(macros.protein_g);
    expect(macros.calculationDetails?.carbTargetGrams).toBe(macros.carbs_g);
    expect(macros.calculationDetails?.fatTargetGrams).toBe(macros.fat_g);
  });

  it('caps keto carbs and shifts remaining calories to fat', () => {
    const profile = makeProfile({
      eatingStyle: 'keto',
      goal: 'maintain',
      activityLevel: 'light_activity',
    });
    const macros = calculateMacros(profile);

    expect(macros.carbs_g).toBeLessThanOrEqual(30);
    expect(macros.fat_g).toBeGreaterThan(0);
  });

  it('sets carnivore carbs to 5g and preserves calorie consistency', () => {
    const profile = makeProfile({
      eatingStyle: 'carnivore',
      goal: 'maintain',
      activityLevel: 'strength_training',
    });
    const macros = calculateMacros(profile);

    expect(macros.carbs_g).toBe(5);
    expect(macros.calories).toBe(macros.protein_g * 4 + macros.carbs_g * 4 + macros.fat_g * 9);
  });

  it('uses activity multipliers for TDEE', () => {
    const sedentary = calculateTDEE(makeProfile({ activityLevel: 'sedentary' }));
    const endurance = calculateTDEE(makeProfile({ activityLevel: 'endurance_training' }));

    expect(endurance).toBeGreaterThan(sedentary);
  });
});

describe('migration adapters', () => {
  it('maps legacy macro strategies to eating styles', () => {
    expect(legacyMacroStrategyToEatingStyle('low_carb')).toBe('keto');
    expect(legacyMacroStrategyToEatingStyle('high_protein')).toBe('standard');
    expect(legacyMacroStrategyToEatingStyle('mediterranean')).toBe('mediterranean');
    expect(legacyMacroStrategyToEatingStyle('unknown')).toBe('standard');
  });

  it('normalizes legacy activity levels', () => {
    expect(normalizeLegacyActivityLevel('lightly_active')).toBe('light_activity');
    expect(normalizeLegacyActivityLevel('moderately_active')).toBe('moderate_training');
    expect(normalizeLegacyActivityLevel('very_active')).toBe('strength_training');
    expect(normalizeLegacyActivityLevel('extra_active')).toBe('endurance_training');
  });
});
