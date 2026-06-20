export const PRO_COPY = {
  /** Onboarding + settings feature overview headline */
  headline: 'Adaptive fueling, built in',
  subheadline:
    'Your macros adjust automatically based on your activity, training, and goals.',
  featureBullets: [
    'Your calories adjust automatically based on your activity',
    'Carbs increase on training days, decrease on rest days',
    'Stay on track with smart reminders and hydration',
    'Sport, season, and training-schedule fueling strategy',
    'Weekly progress report with your Physiq Score',
  ],
  /** The five plain-language Premium capabilities, surfaced in Settings + onboarding. */
  capabilities: [
    {
      id: 'adaptive_targets',
      title: 'Adaptive Targets',
      body: 'Your macros auto-shift with your activity and day type.',
    },
    {
      id: 'training_mode',
      title: 'Training Mode',
      body: 'Fueling tuned to your sport, activities, season, and weekly schedule.',
    },
    {
      id: 'cycle_sync',
      title: 'Cycle Sync',
      body: 'Optional cycle-aware fueling and hydration, on-device and private.',
    },
    {
      id: 'smart_hydration',
      title: 'Smart Hydration',
      body: 'A hydration goal that scales with training and heat, in your units.',
    },
    {
      id: 'weekly_report',
      title: 'Weekly Report + Physiq Score',
      body: 'A weekly snapshot of adherence, activity, hydration, and consistency.',
    },
  ],
  includedTitle: 'Included with Physiq',
  includedLine: 'All adaptive features are included — no upgrade required.',
  infoTitle: 'Physiq Premium overview',
  infoBody:
    'Physiq Premium adapts macro and hydration guidance to your activity and Apple Health signals. It is designed for automated nutrition support without changing your core tracking workflow.',
  infoIncludedTitle: 'Included features',
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
  watchOptionalNote: 'You can still use adaptive features without Apple Watch.',
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
