import { deriveAthleteCycleState } from '../storage/proRepo';
import { AthleteCycleProfile } from '../features/pro/types';

const baseProfile: AthleteCycleProfile = {
  enabled: true,
  trackingMode: 'manual',
  symptomTrackingEnabled: true,
  notesEnabled: true,
  allowCycleDataInExports: false,
  allowCoachExportCycleSummary: false,
  cycleLengthDays: 28,
  periodLengthDays: 5,
};

describe('deriveAthleteCycleState calendar estimation', () => {
  it('reports menstrual phase on the first days after period start', () => {
    const profile = { ...baseProfile, lastPeriodStartDate: '2026-06-17' };
    const state = deriveAthleteCycleState(profile, [], new Date('2026-06-18T12:00:00Z'));
    expect(state.currentPhase).toBe('menstrual');
    expect(state.predictedNextPhaseDate).toBe('2026-07-15');
  });

  it('reports follicular phase about a week in', () => {
    const profile = { ...baseProfile, lastPeriodStartDate: '2026-06-10' };
    const state = deriveAthleteCycleState(profile, [], new Date('2026-06-18T12:00:00Z'));
    expect(state.currentPhase).toBe('follicular');
  });

  it('reports ovulatory phase near day 14', () => {
    const profile = { ...baseProfile, lastPeriodStartDate: '2026-06-04' };
    const state = deriveAthleteCycleState(profile, [], new Date('2026-06-18T12:00:00Z'));
    expect(state.currentPhase).toBe('ovulatory');
  });

  it('reports luteal phase in the second half', () => {
    const profile = { ...baseProfile, lastPeriodStartDate: '2026-06-01' };
    const state = deriveAthleteCycleState(profile, [], new Date('2026-06-18T12:00:00Z'));
    expect(state.currentPhase).toBe('luteal');
  });

  it('prefers a same-day logged tag over the calendar estimate', () => {
    const profile = { ...baseProfile, lastPeriodStartDate: '2026-06-01' };
    const state = deriveAthleteCycleState(
      profile,
      [{ date: '2026-06-18', phaseTag: 'menstrual' }],
      new Date('2026-06-18T12:00:00Z')
    );
    expect(state.currentPhase).toBe('menstrual');
  });

  it('is insufficient with no data', () => {
    const state = deriveAthleteCycleState(baseProfile, [], new Date('2026-06-18T12:00:00Z'));
    expect(state.dataQuality).toBe('insufficient');
    expect(state.currentPhase).toBe('unknown');
  });
});
