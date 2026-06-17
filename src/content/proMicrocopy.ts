export const PRO_COPY = {
  /** Onboarding paywall headline */
  headline: 'Stop guessing. Start fueling.',
  subheadline:
    'Your macros adjust automatically based on your activity, training, and goals.',
  featureBullets: [
    'Your calories adjust automatically based on your activity',
    'Carbs increase on training days, decrease on rest days',
    'Stay on track with smart reminders and hydration',
    'Sport, season, and training-schedule fueling strategy',
    'Weekly progress report with your Physiq Score',
  ],
  /** One-time purchase framing */
  oneTimeTitle: 'Unlock everything',
  oneTimeLine: 'One-time purchase, yours forever.',
  priceFallback: '$24.99',
  ctaUnlock: 'Unlock Everything',
  ctaPriceHint: 'One-time purchase of {price}. Yours forever.',
  /** Free trial framing */
  trialTitle: 'Try everything free for 5 days',
  trialCta: 'Start 5-day free trial',
  trialDisclosure:
    'Full premium access for 5 days. No payment required to start. One-time purchase available anytime.',
  trialDaysLeft: '{n} days left in your trial',
  trialOneDayLeft: '1 day left in your trial',
  trialEndedTitle: 'Your trial has ended',
  trialEndedBody:
    'Unlock lifetime access to keep dynamic macros, athlete mode, and more.',
  ctaUnlockLifetimePrice: 'Unlock lifetime — {price}',
  /** Footer escape on paywall step */
  ctaSkipFooter: 'Skip for now',
  ctaRestore: 'Restore Purchases',
  oneTimeDisclosure:
    'One-time purchase. No subscription and no auto-renewal. Charged once to your Apple ID at confirmation.',
  infoTitle: 'Physiq Premium overview',
  infoBody:
    'Physiq Premium adapts macro and hydration guidance to your activity and Apple Health signals. It is designed for automated nutrition support without changing your core tracking workflow.',
  infoIncludedTitle: 'Included with Premium',
  infoIncludedBullets: [
    'Dynamic macro adjustments',
    'Activity-aware day type detection',
    'Hydration target + quick logs',
    'Watch-ready reminders and lightweight drift alerts',
    'Weekly report and Physiq Score',
    'Sport + season-aware fueling strategy',
    'Training and game schedule macro planning',
    'Optional cycle-aware adjustments with consent controls',
  ],
  watchRequiredNote: 'Apple Watch is required for full activity-driven automation.',
  watchOptionalNote: 'You can still use basic premium features without Apple Watch.',
  /** Adaptive behavior requires Apple Health on iPhone */
  athleteLabel: 'Athlete-style adaptive targets',
  postProHealthTitle: 'Connect Apple Health',
  postProHealthBody:
    'Dynamic macros, activity-aware day types, and hydration cues use activity, workouts, heart rate, and sleep from Apple Health. Connect Health so Physiq can adapt your targets—not just show static numbers.',
  postProHealthContinue: 'Connect Apple Health',
  postProHealthNotNow: 'Not now',
  postProHealthNotNowTitle: 'Limited without Apple Health',
  postProHealthNotNowBody:
    'Adaptive features need Apple Health data. You can connect anytime in Settings → Physiq Premium → Health Integration.',
  healthRequiredBannerTitle: 'Apple Health required for adaptive targets',
  healthRequiredBannerBody:
    'Connect Apple Health to unlock Athlete-style adaptive targets and hydration cues tied to your activity.',
  healthRequiredBannerCta: 'Connect',
} as const;
