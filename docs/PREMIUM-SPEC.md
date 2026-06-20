# Physiq Premium — Product Specification

Status: draft for review. This document defines what "Premium" means in Physiq, what each
feature does, the screens that host it, and the data model behind it. Premium is fully
included (no paywall); "Premium" describes the adaptive capability set, not a purchase tier.

---

## 1. The five capabilities

Physiq Premium is presented as five plain-language capabilities:

1. Adaptive Targets — your macros auto-shift with your activity and day type.
2. Training Mode — sport / activity / season / schedule-aware fueling (replaces "Athlete Mode").
3. Cycle Sync — optional, female-only, cycle-aware fueling and hydration.
4. Smart Hydration — a hydration goal that scales with training and heat, logged in your units.
5. Weekly Report + Physiq Score — a weekly snapshot of adherence, activity, hydration, consistency.

---

## 2. Adaptive Targets

What it does: adjusts calories and carbs around a base target using activity signals
(Apple Health) and the day type. Protein is protected; fat is back-calculated.

- Engine: `features/pro/proMacroEngine.ts` (`applyProAdjustments`, `applyAthleteAdjustments`).
- Day type: auto-inferred from Health (`workout_day` / `high_activity_day` / `rest_day`),
  with a NEW manual override (training / competition / rest / auto).
- Surfacing: today's adaptive calories + day type appear on the home dashboard (new) and the
  weekly Pro Report (existing).

## 3. Training Mode (reframes "Athlete Mode")

Definition: an opt-in mode for people who train for a sport or work out for fitness. It tailors
fueling to what you do, when you do it, and where you are in your season. Seeded by onboarding
(Section 7) so it is meaningful on day one.

Configuration (Settings → Training Mode):
- Sport(s): multi-select from an expanded `ATHLETE_SPORTS` plus general categories
  (General strength, General cardio, Hybrid/CrossFit, Hiking/Outdoor). Primary + secondary.
- Competition level: Recreational, High School, College/Collegiate, Amateur/Club, Semi-pro,
  Professional, Masters/Adult league.
- Experience (`AthleteUserType`): NOT asked separately — derived from competition level
  (Recreational → casual; HS/College/Amateur → performance; Semi-pro/Pro → advanced), overridable.
- Season: preseason / in-season / off-season with optional start/end dates.
- Weekly schedule: per-day sessions (practice / training / game / rest), duration, intensity.
  Feeds `getAthleteSessionLoad` so the training-load factor is no longer always 0.
- Day type override + Competition Day fueling windows (T-72 / T-24 / T-4 / post 0–2h).

Non-athletes (fitness persona) use the same engine with their selected activities driving
schedule/load and day-type defaults instead of sport + season.

## 4. Cycle Sync (reframes "Female Track")

- Visibility gated on `profile.sex === 'female'`; hidden entirely for male users.
- Logging UI (replaces the hardcoded "Log Fatigue Day"): last period start, cycle length,
  period length, bleeding level, symptom multi-select, optional note.
- Phase estimation: calendar-based (menstrual / follicular / ovulatory / luteal) from last
  period start + cycle length, refined by logged tags — not just "the last log's tag".
- Phase-aware adjustments: small luteal calorie bump; menstrual/luteal hydration bumps; shown
  with clear, plain-language explanations.
- Consent + privacy: explicit opt-in; all data stored on-device only.

## 5. Smart Hydration

- Unit preference defaults from `measurementSystem`: `us` → cups / fl oz, `metric` → mL / L.
- Quick-add chips in the chosen unit (e.g., 1 cup, 16 oz, 500 mL) plus a custom amount.
- Stored internally in mL (no migration); conversion happens only at display/input via
  `utils/hydration.ts`.
- Electrolyte nudges: activate the existing `electrolyteNudgesEnabled` flag — a simple reminder
  on long/high-intensity/hot days.
- Home dashboard hydration ring.

## 6. Apple Watch (phone-driven, Option B+)

Design north star: on-brand, simple, beautiful, icon-led.

- Paged `TabView` (Calories | Macros | Hydration | Today/Training), one focal metric per page.
- Brand: `PhysiqTheme` colors (dark `#0D0D0D`, chartreuse `#DEFF00` accent, macro colors). A
  small clean brand mark replaces the letter-spaced wordmark; the accent ring is the hero.
- Icons: SF Symbols (`flame.fill`, `figure.run`, `drop.fill`, `fork.knife`, `chart.bar.fill`,
  `moon.zzz.fill`, `trophy.fill`), reused phone-side for a consistent visual language.
- Hero rings via `RingGaugeView`; macro page shows three labeled mini-rings.
- watchOS complications (calories left, hydration %, day type).
- Quick actions over `physiq-watch-connectivity`: log water in user units, quick-add saved
  meal/protein, mark today's day type. Subtle haptics; 1–2 type weights.
- **Interaction feedback:** unified tap/select/confirm haptics + optional UI click on phone;
  system click haptics on Watch (`WatchInteractionFeedback`, `PhysiqPressableButtonStyle`).
  See `docs/INTERACTION-FEEDBACK.md`.

No on-watch HealthKit (stays phone-driven).

## 7. Onboarding capture (athlete vs activity)

One adaptive "How you train" step after Activity Level (10 → 11 steps), branching in place:

- Persona fork: "I train/compete for a sport" / "I work out for fitness" / "Just tracking".
- Athlete fields: sport(s), competition level, season, optional sessions/week.
- Fitness fields: activity multi-select (`ACTIVITY_TYPES`), sessions/week, session length.
- Only the persona choice is required; detail fields are optional and editable later.

Reconciliation with `ActivityLevel` (TDEE driver in `utils/macroEngine.ts`): the persona answers
pre-select a sensible `ActivityLevel` but never silently change calories — the user sees/adjusts it.

## 8. Data model

In `features/pro/types.ts`:
- `TrainingPersona = 'athlete' | 'fitness' | 'general'`.
- `AthleteCompetitionLevel = 'recreational' | 'high_school' | 'college' | 'amateur_club' | 'semi_pro' | 'professional' | 'masters'`.
- `ActivityType` union + `ACTIVITY_TYPES` catalog (label + icon).
- `AthleteProfile` gains `persona`, `competitionLevel?`, `sports: string[]` (primary kept as
  `sport`), `activities: ActivityType[]`. `userType` derived from competition level by default.
- Expanded `ATHLETE_SPORTS` + general categories.
- `ProSettings` gains `hydrationUnit?: 'ml' | 'oz' | 'cup'` (defaults from `measurementSystem`).

Persisted via existing repo functions with safe defaults so existing users migrate cleanly.

## 9. Where premium shows up (discovery)

- Home dashboard: adaptive calories, day type, hydration ring.
- Settings: Physiq Premium panel reorganized into the five capabilities with real editors.
- Onboarding: persona capture step + post-onboarding nudge to finish Training Mode setup.

## 10. Phased delivery

1. Hydration units + gender-gate Cycle Sync + clarified premium copy.
2. Data model + onboarding capture.
3. Training Mode Settings UI + engine wiring.
4. Cycle Sync logging + phase estimation + consent + phase-aware fueling.
5. Home dashboard surfacing + Settings reorg + post-onboarding nudge.
6. Watch redesign.

## 11. Constraints

- No paywall changes (premium stays unlocked).
- Hydration stored in mL; convert only at the edges.
- Watch stays phone-driven (no on-watch HealthKit).
- Each phase is independently shippable; watch/native changes require a new EAS build.
