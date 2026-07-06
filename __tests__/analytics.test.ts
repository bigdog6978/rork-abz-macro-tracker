/**
 * Analytics must be a safe no-op without env keys — a crash here would take
 * down every instrumented flow (logging, onboarding, settings).
 */

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    capture: jest.fn(),
    screen: jest.fn(),
  })),
}));

import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';
import { initAnalytics, reportError, track, trackScreen } from '../services/analytics';

describe('analytics without env keys', () => {
  it('never initializes vendors and never throws', () => {
    expect(() => {
      initAnalytics();
      initAnalytics(); // idempotent
      track('food_logged', { method: 'search', items: 1 });
      trackScreen('Dashboard');
      reportError(new Error('boom'), { where: 'test' });
    }).not.toThrow();

    // No keys in the test env → vendors stay untouched.
    expect(Sentry.init).not.toHaveBeenCalled();
    expect(PostHog).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
