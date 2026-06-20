import { applyAthleteAdjustments, applyProAdjustments, getAthleteHydrationTargetMl } from '../features/pro/proMacroEngine';
import { deriveAthleteCycleState } from '../storage/proRepo';
import { AthleteProfile, ProHealthSignals } from '../features/pro/types';
import { MacroTargets } from '../types';

const BASE: MacroTargets = {
  calories: 2400,
  protein_g: 170,
  carbs_g: 260,
  fat_g: 70,
};

const SIGNALS: ProHealthSignals = {
  dateKey: '2026-04-07',
  activeEnergyKcal: 880,
  steps: 13200,
  workoutMinutes: 72,
  workoutCount: 2,
  hrTrendDeltaPct: 5,
  sleepHours: 7.1,
};

const ATHLETE: AthleteProfile = {
  enabled: true,
  persona: 'athlete',
  userType: 'advanced_athlete',
  sport: 'Soccer',
  sports: ['Soccer'],
  competitionLevel: 'semi_pro',
  activities: [],
  season: { phase: 'in_season' },
  schedule: [
    { id: 'a', dayOfWeek: 1, sessionType: 'training', durationMin: 75, intensity: 'high' },
    { id: 'b', dayOfWeek: 3, sessionType: 'game', durationMin: 90, intensity: 'high' },
  ],
};

describe('athlete macro layer', () => {
  it('applies athlete override above pro and emits explainability', () => {
    const pro = applyProAdjustments(BASE, SIGNALS);
    const cycle = deriveAthleteCycleState(
      { enabled: true, trackingMode: 'manual', symptomTrackingEnabled: true, notesEnabled: true, allowCoachExportCycleSummary: false, allowCycleDataInExports: false },
      [{ date: '2026-04-07', phaseTag: 'luteal', symptoms: ['fatigue'] }]
    );
    const athlete = applyAthleteAdjustments(BASE, pro, ATHLETE, cycle);
    expect(athlete.tierApplied).toBe('athlete');
    expect(athlete.targets.calories).toBeGreaterThan(0);
    expect(athlete.explainability?.length).toBeGreaterThan(0);
    expect(athlete.reason.toLowerCase()).toContain('athlete');
  });

  it('keeps athlete hydration target bounded', () => {
    const cycle = deriveAthleteCycleState(
      { enabled: true, trackingMode: 'manual', symptomTrackingEnabled: true, notesEnabled: true, allowCoachExportCycleSummary: false, allowCycleDataInExports: false },
      [{ date: '2026-04-07', phaseTag: 'menstrual', symptoms: ['fatigue', 'cramps'] }]
    );
    const hydration = getAthleteHydrationTargetMl(BASE, SIGNALS, ATHLETE, cycle);
    expect(hydration).toBeGreaterThanOrEqual(2000);
    expect(hydration).toBeLessThanOrEqual(5800);
  });
});
