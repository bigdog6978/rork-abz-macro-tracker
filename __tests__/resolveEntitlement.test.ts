import { resolveEntitlement, EntitlementInputs } from '../features/pro/resolveEntitlement';
import { computeTrialStatus } from '../features/pro/trial';

const noTrial = computeTrialStatus(null);
const activeTrial = computeTrialStatus(new Date().toISOString());
const expiredTrial = computeTrialStatus(new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString());

function inputs(overrides: Partial<EntitlementInputs> = {}): EntitlementInputs {
  return {
    monetizationEnabled: true,
    devUnlock: false,
    storedEntitlement: 'core',
    iapEntitlement: 'core',
    trialStatus: noTrial,
    ...overrides,
  };
}

describe('resolveEntitlement', () => {
  it('is always unlocked while monetization is disabled (current shipping state)', () => {
    expect(resolveEntitlement(inputs({ monetizationEnabled: false }))).toEqual({
      entitlement: 'unlocked',
      hasPremium: true,
    });
  });

  it('honors the internal-review dev unlock', () => {
    expect(resolveEntitlement(inputs({ devUnlock: true })).hasPremium).toBe(true);
  });

  it('unlocks from live IAP ownership', () => {
    expect(resolveEntitlement(inputs({ iapEntitlement: 'unlocked' }))).toEqual({
      entitlement: 'unlocked',
      hasPremium: true,
    });
  });

  it('unlocks from the locally stored entitlement when IAP is unreachable', () => {
    expect(resolveEntitlement(inputs({ storedEntitlement: 'unlocked' })).hasPremium).toBe(true);
  });

  it('grants premium (not entitlement) during an active trial', () => {
    expect(resolveEntitlement(inputs({ trialStatus: activeTrial }))).toEqual({
      entitlement: 'core',
      hasPremium: true,
    });
  });

  it('drops to core after the trial expires', () => {
    expect(resolveEntitlement(inputs({ trialStatus: expiredTrial }))).toEqual({
      entitlement: 'core',
      hasPremium: false,
    });
  });
});
