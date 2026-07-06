import {
  DEFAULT_REMINDER_SETTINGS,
  isBehindHydrationPace,
  planReminders,
  ReminderPlanInputs,
} from '../features/reminders/reminderPlan';

const enabled = { ...DEFAULT_REMINDER_SETTINGS, enabled: true };

/** 9:00 AM local — before every default reminder slot. */
const morning = new Date(2026, 6, 6, 9, 0);

function inputs(overrides: Partial<ReminderPlanInputs> = {}): ReminderPlanInputs {
  return {
    settings: enabled,
    now: morning,
    proteinRemainingG: 80,
    entriesLoggedToday: 0,
    hydrationTrackingEnabled: true,
    hydrationConsumedMl: 0,
    hydrationTargetMl: 2400,
    ...overrides,
  };
}

describe('planReminders', () => {
  it('plans nothing when the master switch is off', () => {
    expect(planReminders(inputs({ settings: DEFAULT_REMINDER_SETTINGS }))).toEqual([]);
  });

  it('plans protein, hydration, and log reminders for an empty morning', () => {
    const plan = planReminders(inputs());
    const ids = plan.map((p) => p.id);
    expect(ids).toContain('physiq-reminder-protein');
    expect(ids).toContain('physiq-reminder-log');
    expect(ids).toContain('physiq-reminder-hydration-10');
    expect(ids).toContain('physiq-reminder-hydration-13');
    expect(ids).toContain('physiq-reminder-hydration-16');
  });

  it('skips the protein nudge when the gap is closed', () => {
    const plan = planReminders(inputs({ proteinRemainingG: 10 }));
    expect(plan.map((p) => p.id)).not.toContain('physiq-reminder-protein');
  });

  it('includes the remaining grams in the protein nudge body', () => {
    const plan = planReminders(inputs({ proteinRemainingG: 42.4 }));
    const protein = plan.find((p) => p.id === 'physiq-reminder-protein');
    expect(protein?.body).toContain('42g');
  });

  it('skips the log reminder once something is logged', () => {
    const plan = planReminders(inputs({ entriesLoggedToday: 3 }));
    expect(plan.map((p) => p.id)).not.toContain('physiq-reminder-log');
  });

  it('skips past slots — at 2pm only the 4pm hydration check remains', () => {
    const afternoon = new Date(2026, 6, 6, 14, 0);
    const plan = planReminders(inputs({ now: afternoon }));
    const hydrationIds = plan.filter((p) => p.id.startsWith('physiq-reminder-hydration'));
    expect(hydrationIds.map((p) => p.id)).toEqual(['physiq-reminder-hydration-16']);
  });

  it('skips hydration slots when on pace', () => {
    // 2000 of 2400 ml by 9am is far ahead of any slot's pace line.
    const plan = planReminders(inputs({ hydrationConsumedMl: 2000 }));
    expect(plan.some((p) => p.id.startsWith('physiq-reminder-hydration'))).toBe(false);
  });

  it('skips hydration entirely when hydration tracking is disabled', () => {
    const plan = planReminders(inputs({ hydrationTrackingEnabled: false }));
    expect(plan.some((p) => p.id.startsWith('physiq-reminder-hydration'))).toBe(false);
  });
});

describe('isBehindHydrationPace', () => {
  it('is never behind before the drinking window opens', () => {
    expect(isBehindHydrationPace(0, 2400, 8)).toBe(false);
  });

  it('tracks the linear 8am→8pm pace line', () => {
    // By 2pm (halfway) the pace line is 1200ml.
    expect(isBehindHydrationPace(1100, 2400, 14)).toBe(true);
    expect(isBehindHydrationPace(1300, 2400, 14)).toBe(false);
  });

  it('is never behind with no target', () => {
    expect(isBehindHydrationPace(0, 0, 16)).toBe(false);
  });
});
