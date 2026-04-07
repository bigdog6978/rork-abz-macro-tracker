# PHYSIQ MACROS - UNIFIED PRODUCT REQUIREMENTS DOCUMENT
(Core + Pro + Athlete + Future AI Tier)

## 1) PRODUCT VISION
Physiq Macros is a macro tracking app that evolves into a tiered performance nutrition system.

It serves:
- Everyday users -> simple macro tracking
- Fitness users -> automated nutrition (Pro)
- Athletes -> structured fueling system (Athlete)
- Future -> AI-driven coaching (Pro+ / Athlete+)

Tagline system:
- Core: **Track your macros.**
- Pro: **Macros that adapt to your activity.**
- Athlete: **Fueling built for performance.**
- Pro+/Athlete+ (future): **Your AI nutrition coach.**

## 2) PRODUCT TIERS (CRITICAL FOR UX + CURSOR)

### Tier 1 - Core App ($2.99 one-time)
UNCHANGED:
- Macro tracking
- Meal planning
- Saved foods
- Logging
- Weight tracking

### Tier 2 - Physiq Pro ($4.99/mo)
Automation + Apple Watch + Health.

Positioning: "Your macros adjust automatically based on your activity."

### Tier 3 - Physiq Athlete ($6.99/mo)
Structured fueling system for athletes.

Positioning: "Nutrition that follows your training and competition."

### Tier 4 - Future (NOT IN SCOPE YET)
- Pro+: AI coaching + photo food logging
- Athlete+: AI athlete fueling + predictive coaching

Constraints:
- Do NOT build AI in this phase.
- Architecture must allow for future integration.

## 3) CORE ARCHITECTURE PRINCIPLE
SINGLE ENGINE, MULTIPLE LAYERS.

- One macro engine (shared)
- Pro layer modifies via activity signals
- Athlete layer overrides via schedule + sport + season

Priority order:
**Athlete > Pro > Core**

## 4) USER TYPES (GLOBAL)
Used only for Athlete tier branching:
- Casual Data-Driven
- Performance Intermediate
- Advanced Athlete

Constraint:
- Pro tier does NOT require user type selection.

## 5) ONBOARDING ARCHITECTURE

### Core Onboarding
Unchanged.

### Upgrade Entry Points
User can enter Pro/Athlete via:
- Onboarding upsell
- Settings upgrade
- Feature trigger (example: "Connect Apple Watch")

### Pro Onboarding (LIGHTWEIGHT)
- Connect Apple Health (optional)
- Enable dynamic macros
- Enable hydration tracking

Constraints:
- No complexity
- No schedules
- No sports

### Athlete Onboarding (FULL)
- User type selection
- Sport selection (20 sports)
- Weekly schedule input:
  - practice / training / game / rest
  - time / duration / intensity
- Season context:
  - preseason / in-season / off-season
  - dates

Generate:
- macro targets by day type
- meal timing
- carb load strategy
- weekly plan
- shopping list

## 6) FEATURE ALLOCATION (CRITICAL)

### PRO FEATURES (Tier 2)

**Apple Health Integration**
- Active energy
- Workouts
- Steps
- HR trends
- Sleep proxy

**Dynamic Macro Engine (Pro Layer)**
- Activity-based calorie adjustment
- Carb adjustment for training load
- Guardrails:
  - protein floor
  - bounded adjustments
  - no volatility

**Automatic Day-Type Detection**
- Workout day
- Rest day
- High activity day

**Hydration Module (Base Version)**
- Daily hydration target
- Activity-adjusted hydration
- Quick log (+250ml / +500ml / +750ml)
- Watch + phone sync
- Optional electrolyte nudges

**Apple Watch Experience (Pro)**
Surfaces:
- Macro progress
- Calories remaining
- Hydration quick log
- Protein reminders
- Fueling Now (simplified)
- Light drift alerts

Nudges:
- Protein remaining
- Under calories
- Hydration reminders
- Post-workout suggestion

**Weekly Report**
- Nutrition adherence
- Activity summary
- Hydration adherence
- Weight trend

**Physiq Score**
Composite of:
- Adherence
- Activity alignment
- Hydration
- Consistency

### ATHLETE FEATURES (Tier 3)

**Sport System (20 sports)**
- Football (American)
- Soccer
- Basketball
- Baseball
- Ice Hockey
- Softball
- Volleyball
- Rugby
- Lacrosse
- Field Hockey
- Water Polo
- Cricket
- Track Sprinting
- Distance Running
- Marathon
- Cycling
- Swimming
- Tennis
- Wrestling
- Triathlon

**Weekly Schedule Engine**
- Practice
- Training
- Game
- Rest
- Duration
- Intensity

**Season System**
- Preseason
- In-season
- Off-season
- Dates

**Advanced Macro Engine (Athlete Layer)**
Inputs:
- Sport
- Schedule
- Season
- Health data

Outputs:
- Day-type macros
- Meal timing
- Fueling strategy

**Competition Protocols**
- T-72
- T-24
- T-4
- Post 0-2h

**Hydration Module (Advanced)**
- Sweat rate
- Session hydration
- Electrolyte timing
- Training-aware hydration

**Apple Watch (Advanced)**
Surfaces:
- Fueling Now
- Drift alert
- Recovery window
- Session check-ins

Voice + quick logging:
- Voice meal logging
- Confirmation flow
- Watch-first interactions

**Planning + Shopping**
- Weekly meal plans
- Regeneration
- Consolidated shopping list
- Week variants:
  - heavy
  - taper
  - travel
  - game week

**Pro-Level Athlete Features**
- Readiness -> fueling bridge
- Explainable adjustments
- Travel mode
- Minimum Effective Fuel mode
- Performance correlation
- Coach export
- Female athlete track
- Under-fueling safeguards

## 7) HYDRATION (SHARED SYSTEM)
Hydration exists in BOTH tiers.

| Feature | Pro | Athlete |
|---|---|---|
| Daily target | ✓ | ✓ |
| Activity adjustment | ✓ | ✓ |
| Session hydration |  | ✓ |
| Sweat rate |  | ✓ |
| Electrolytes | ✓ (basic) | ✓ (advanced) |

## 8) APPLE WATCH (SHARED ARCHITECTURE)

Principles:
- <2 second glance
- 1-2 taps
- Voice-first

| Feature | Pro | Athlete |
|---|---|---|
| Macro rings | ✓ | ✓ |
| Hydration logging | ✓ | ✓ |
| Protein reminders | ✓ | ✓ |
| Fueling Now | ✓ (simple) | ✓ (advanced) |
| Drift alerts | ✓ (light) | ✓ (advanced) |
| Recovery windows |  | ✓ |
| Session check-ins |  | ✓ |

## 9) SUBSCRIPTION MODEL

| Tier | Price |
|---|---|
| Pro | $4.99/mo |
| Athlete | $6.99/mo |
| Future Pro+ | $9.99/mo |
| Future Athlete+ | TBD |

Trial logic:
- One-time trial per tier
- Managed via entitlement states

Recommended entitlement states:
- `core_active`
- `pro_trial_active`
- `pro_subscriber_active`
- `athlete_trial_active`
- `athlete_subscriber_active`
- `pro_trial_consumed`
- `athlete_trial_consumed`

## 10) UX - TIER SELECTION (VERY IMPORTANT)

When user is prompted, show a simple choice UI:

Option 1 - Pro:
"Automatically adjust your macros based on your activity."

Option 2 - Athlete:
"Fuel your body based on your training, schedule, and competition."

Rules:
- No feature overload in UI
- Clear distinction:
  - Pro = automatic
  - Athlete = structured

## 11) COMPLIANCE, PRIVACY, AND UX STANDARDS
- Apple-compliant subscription disclosures (trial, price, auto-renew)
- Restore/manage subscription flows
- Neutral permission wording for camera/microphone/health
- Privacy-forward health data handling and consent UX
- No medical diagnosis claims; descriptive performance guidance only

## 12) METRICS
- Pro conversion rate
- Athlete conversion rate
- Trial start and trial-to-paid conversion by tier
- Settings upgrade conversion by tier
- Weekly schedule completion (Athlete)
- Meal plan adherence by day type
- Hydration adherence rate
- Watch interaction completion rate
- Notification action rate vs dismiss rate
- Retention uplift by tier

## 13) ACCEPTANCE CRITERIA
- Core app unchanged
- Feature gating works correctly across tiers
- Macro engine unified (no independent forks)
- Athlete overrides Pro when both are active
- Health integration optional
- Watch interactions function independently and sync to phone
- Hydration syncs across devices
- Onboarding branches correctly (Core, Pro, Athlete)
- Subscription flows compliant

## 14) ROLLOUT PLAN

### Phase 1
- Pro foundation
- HealthKit integration
- Watch (Pro surfaces)
- Hydration base module

### Phase 2
- Athlete onboarding
- Schedule + season system
- Advanced macros (Athlete layer)

### Phase 3
- Competition protocols
- Advanced watch features (Athlete)
- Performance analytics

### Phase 4 (Future)
- AI layers (Pro+ / Athlete+)

## 15) Female Athlete Track - Menstrual-Cycle Requirements (Addendum)

Scope:
- Athlete tier only (initial release)
- Consent-gated and privacy-forward
- Performance fueling guidance only (no diagnosis/treatment claims)

Data model:
- `AthleteCycleProfile` (enabled, tracking mode, baseline cycle settings, consent + export flags)
- `AthleteCycleLogEntry` (phase tag, bleeding, symptoms, optional notes)
- `AthleteCycleDerivedState` (phase + confidence + data quality + last computed)

UX:
- Optional enablement during Athlete onboarding with explicit consent
- Settings controls for enabling/disabling and deleting cycle data
- Explainability in reports only when enabled/applicable
- No sensitive cycle details on watch glance surfaces by default

Algorithm hooks:
- Bounded hydration/fueling/recovery adjustments when confidence is adequate
- Confidence-aware fallback: low-confidence signals reduce cycle influence
- Hooked into Athlete layer with guardrails (Athlete > Pro > Core)

Privacy/compliance:
- Data minimization, explicit consent, deletion path
- Export of cycle details disabled by default
- Neutral performance wording; no medical claims
