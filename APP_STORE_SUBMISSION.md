# App Store Connect Submission Guide

This guide walks you through building and submitting Physiq Macro Tracker to the Apple App Store.

## Prerequisites

- **Apple Developer Account** ($99/year) — [developer.apple.com](https://developer.apple.com)
- **Expo account** — Sign up at [expo.dev](https://expo.dev)
- **Node/Bun** — Already set up for this project

---

## Step 1: EAS CLI

`eas-cli` is already a dev dependency. Run:

```bash
bun run build:ios
```

Or call EAS directly:

```bash
bunx eas build --platform ios --profile production
```

---

## Step 2: Log in to Expo

```bash
bunx eas login
```

Use your Expo account credentials (create one at [expo.dev](https://expo.dev) if needed).

---

## Step 3: Configure the Project (First Time Only)

```bash
bunx eas build:configure
```

This confirms `eas.json` and `app.json` settings. The project is already configured with `eas.json`.

---

## Step 4: Build for iOS (Production)

```bash
bun run build:ios
```

This will:

1. Upload your project to EAS servers
2. Build a signed `.ipa` for App Store
3. Auto-increment the build number
4. Handle code signing (you’ll be prompted to create/link credentials if needed)

**First build:** EAS will ask about Apple credentials. Choose:

- **Set up a new Apple Developer account** — if you haven’t linked one
- **Use existing credentials** — if you already have certificates/provisioning profiles

---

## Step 5: Create the App in App Store Connect (First Time Only)

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. **My Apps** → **+** → **New App**
3. Fill in:
   - **Platform:** iOS
   - **Name:** Physiq Macro Tracker
   - **Primary Language:** English (or your choice)
   - **Bundle ID:** `app.rork.abz-macro-tracker` (must match `app.json`)
   - **SKU:** e.g. `physiq-macro-tracker`
4. Create the app and note the **App ID** (numeric) for `eas submit` if you use it.

---

## Step 6: Submit the Build to App Store Connect

**Option A — EAS Submit (recommended):**

After the build finishes:

```bash
bun run submit:ios
```

You’ll be prompted for:

- Apple ID (email)
- App-specific password (create at [appleid.apple.com](https://appleid.apple.com) → Sign-In and Security → App-Specific Passwords)

**Option B — Manual upload:**

1. Download the `.ipa` from the EAS build page
2. Use **Transporter** (Mac App Store) or **Xcode Organizer** to upload to App Store Connect

---

## Step 7: Complete App Store Listing

In App Store Connect:

1. **App Information** — Description, keywords, support URL, privacy policy URL
2. **Pricing** — Free or paid
3. **App Privacy** — Privacy nutrition labels (data collection, etc.)
4. **Screenshots** — Required sizes (e.g. 6.7", 6.5", 5.5" iPhone)
5. **Version** — Match `version` in `app.config.ts` (currently `1.1.0`)
6. **Build** — Select the build you submitted
7. **Submit for Review**

---

## Quick Reference

| Command | Purpose |
|--------|---------|
| `bun run build:ios` | Build App Store IPA |
| `bun run submit:ios` | Submit latest build |
| `bunx eas build:list` | List recent builds |
| `bunx eas credentials` | Manage signing credentials |

---

## Troubleshooting

- **“No valid code signing”** — Run `bunx eas credentials` and follow prompts to set up Apple Developer credentials
- **Bundle ID mismatch** — Ensure `app.json` → `expo.ios.bundleIdentifier` matches the app in App Store Connect
- **Build fails** — Check the build logs on [expo.dev](https://expo.dev) for the specific error

---

## Monetization launch checklist (paywall is wired, currently OFF)

The app ships with everything unlocked. Entitlement resolution is fully
wired (`features/pro/resolveEntitlement.ts` → `ProProvider`); turning
monetization on is these steps — do them together, not piecemeal:

1. **Flip the flag:** `IAP_MONETIZATION_ENABLED = true` in
   `services/iapMapping.ts`. (An existing test asserts it is `false`;
   update `__tests__/iapService.test.ts` in the same commit.)
2. **RevenueCat:** create/verify products (`physiq.pro.monthly`
   $4.99/mo, `physiq.athlete.monthly` $6.99/mo — see PRD §9; the legacy
   `physiq.lifetime.unlock` mapping still resolves for early buyers) and
   set `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` as an EAS secret.
3. **Env hygiene:** confirm `EXPO_PUBLIC_DEV_UNLOCK_PREMIUM` is NOT set
   in the production EAS environment (it force-unlocks everything).
4. **Paywall UI:** re-add purchase/restore/trial screens (removed in
   1.3.2). `purchaseLifetime` / `restorePurchases` / `startTrial` are
   ready; purchase analytics events already fire on success.
5. **Sandbox test on device:** purchase, restore-purchases, trial start
   → expiry (5 days; use a short-trial build), offline launch (stored
   entitlement keeps premium), Apple-required restore button.
6. **Observability:** set `EXPO_PUBLIC_SENTRY_DSN` and
   `EXPO_PUBLIC_POSTHOG_API_KEY` EAS secrets so trial/purchase funnels
   are measured from day one; run `npx @sentry/wizard -i reactNative`
   once for source-map upload.
7. **App Review:** subscription disclosures (price, duration,
   auto-renew), Terms/Privacy links near the paywall (already in
   Settings), and screenshot of the paywall for the review notes.
