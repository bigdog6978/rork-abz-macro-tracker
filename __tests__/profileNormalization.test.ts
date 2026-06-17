import { normalizeStoredProfile } from '../utils/profileNormalization';

describe('normalizeStoredProfile', () => {
  it('prefers stored eatingStyle over legacy derivation', () => {
    const profile = normalizeStoredProfile({
      eatingStyle: 'keto',
      macro_strategy: 'standard',
      preference: 'standard',
      onboardingComplete: true,
    });
    expect(profile.eatingStyle).toBe('keto');
  });

  it('falls back to legacy derivation when eatingStyle is absent', () => {
    const profile = normalizeStoredProfile({
      macro_strategy: 'keto',
      onboardingComplete: true,
    });
    expect(profile.eatingStyle).toBe('keto');
  });

  it('accepts snake_case eating_style field', () => {
    const profile = normalizeStoredProfile({
      eating_style: 'vegan',
      onboardingComplete: true,
    });
    expect(profile.eatingStyle).toBe('vegan');
  });
});
