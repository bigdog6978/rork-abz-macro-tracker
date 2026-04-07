export const PRO_COPY = {
  /** Onboarding paywall — shared headline for Pro/Athlete selector */
  headline: 'Stop guessing. Start fueling.',
  subheadline:
    'Your macros adjust automatically based on your activity, training, and goals.',
  athleteHeadline: 'Stop guessing. Start fueling.',
  athleteSubheadline:
    'Your macros adjust automatically based on your activity, training, and goals.',
  tierBadgePro: 'Most Popular',
  tierBadgeAthlete: 'Built for serious training',
  tierHintPro: 'Most users start here',
  tierHintAthlete: 'For structured training & competition',
  featureBullets: [
    'Your calories adjust automatically based on your activity',
    'Carbs increase on training days, decrease on rest days',
    'Stay on track with smart reminders and hydration',
    'Weekly progress report with your Physiq Score',
  ],
  athleteFeatureBullets: [
    'Everything in Pro, plus structured fueling',
    'Fuel your body based on your training and competition',
    'Pre-game carb loading and recovery protocols',
    'Performance-focused macro adjustments',
  ],
  trialTitle: '3-day free trial',
  trialLineFullAccess: 'Full access. Cancel anytime.',
  trialDetail: 'Then $4.99/month unless canceled.',
  renewalDisclosure:
    'You get full access for 3 days. After trial ends, subscription renews unless canceled.',
  paywallTrustLine: 'No commitment. Cancel anytime.',
  ctaTrial: 'Start 3 Day Trial',
  /** Footer escape on paywall step */
  ctaSkipFooter: 'Skip for now',
  ctaPrimaryPriceHint: 'Then {price}/month. Cancel anytime.',
  ctaSubscribe: 'Subscribe $4.99/mo',
  ctaSubscribeAthlete: 'Subscribe $6.99/mo',
  ctaNotNow: 'Not now',
  infoTitle: 'Physiq Pro overview',
  infoBody:
    'Physiq Pro adapts macro and hydration guidance to your activity and Apple Health signals. It is designed for automated nutrition support without changing your core tracking workflow.',
  infoIncludedTitle: 'Included with Pro',
  infoIncludedBullets: [
    'Dynamic macro adjustments',
    'Activity-aware day type detection',
    'Hydration target + quick logs',
    'Watch-ready reminders and lightweight drift alerts',
    'Weekly Pro report and Physiq Score',
  ],
  legalFooter:
    'Subscription auto-renews unless canceled at least 24 hours before renewal. Manage anytime in Apple ID subscriptions.',
  athleteInfoTitle: 'Physiq Athlete overview',
  athleteInfoBody:
    'Physiq Athlete includes everything in Pro, then adds sport, season, and training-schedule context to shape fueling strategy for performance-focused users.',
  athleteInfoIncludedTitle: 'Included with Athlete',
  athleteInfoIncludedBullets: [
    'Everything in Physiq Pro',
    'Sport + season-aware fueling strategy',
    'Training and game schedule macro planning',
    'Competition-window adjustments (T-24, T-4, post)',
    'Optional cycle-aware adjustments with consent controls',
  ],
  watchRequiredNote: 'Apple Watch is required for full activity-driven Pro automation.',
  watchOptionalNote: 'You can still use basic Pro features without Apple Watch.',
  /** Pro / Athlete adaptive behavior requires Apple Health on iPhone */
  athleteLabel: 'Athlete-style adaptive targets',
  postProHealthTitle: 'Connect Apple Health for Pro',
  postProHealthBody:
    'Dynamic macros, activity-aware day types, and hydration cues use activity, workouts, heart rate, and sleep from Apple Health. Connect Health so Pro can adapt your targets—not just show static numbers.',
  postProHealthContinue: 'Connect Apple Health',
  postProHealthNotNow: 'Not now',
  postProHealthNotNowTitle: 'Limited without Apple Health',
  postProHealthNotNowBody:
    'Pro adaptive features need Apple Health data. You can connect anytime in Settings → Physiq Pro → Health Integration.',
  healthRequiredBannerTitle: 'Apple Health required for adaptive Pro',
  healthRequiredBannerBody:
    'Connect Apple Health to unlock Athlete-style adaptive targets and hydration cues tied to your activity.',
  healthRequiredBannerCta: 'Connect',
  iapStateCopy: {
    active: 'Subscription active.',
    expired: 'Subscription expired. Renew to restore premium features.',
    grace_period: 'Billing grace period active. Update payment details to keep access.',
    billing_retry: 'Billing retry in progress. Please check Apple payment settings.',
    deferred: 'Purchase pending approval. Access unlocks after Apple confirms.',
  },
} as const;

