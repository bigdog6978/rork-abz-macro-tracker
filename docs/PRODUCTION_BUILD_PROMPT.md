# Production Build Prompt

Use this prompt when you need to create a production build of the Physiq Macro Tracker app.

---

## Cursor / AI Prompt

```md
You are building a production release of the Physiq Macro Tracker app.

**Project:** Expo (SDK 54) React Native app with expo-dev-client, EAS Build.

**GOAL:** Create a production-ready build for iOS and/or Android.

---

## PRE-BUILD CHECKLIST

1. **Version bump:** Ensure `app.json` has correct `version` and `ios.buildNumber` / `android.versionCode`.
2. **Environment:** Verify `app.json` has correct `bundleIdentifier` (iOS) and `package` (Android).
3. **Assets:** Confirm `icon.png`, `splash-icon.png`, and `adaptive-icon` exist in `assets/images/`.
4. **No debug code:** Remove or gate any `console.log`, debug toasts, or dev-only features.
5. **EAS:** Ensure `eas.json` is configured and `eas projectId` is set in `app.json`.

---

## BUILD COMMANDS

**iOS production:**
```bash
bun run build:ios
```
or
```bash
bunx eas build --platform ios --profile production
```

**Android production:**
```bash
bunx eas build --platform android --profile production
```

**Both platforms:**
```bash
bunx eas build --platform all --profile production
```

---

## SUBMIT TO APP STORE (iOS)

After the build completes:

```bash
bun run submit:ios
```
or
```bash
bunx eas submit --platform ios --latest --profile production
```

---

## PROJECT CONFIG

- **Bundle ID (iOS):** `app.rork.abz-macro-tracker`
- **Package (Android):** `app.rork.abz_macro_tracker`
- **EAS projectId:** `d62f829f-f2e7-4bd9-9e05-12c2ca4f727f`
- **Profile:** `production` uses `autoIncrement` and `ios.resourceClass: m-medium`

---

## DELIVER

1. Run the appropriate build command.
2. Confirm build succeeds on EAS.
3. If iOS, run submit command to submit to App Store Connect.
4. Report any errors or blockers.
```

---

## Quick Reference

| Command | Purpose |
|--------|---------|
| `bun run build:ios` | iOS production build |
| `bun run build:ios:dev` | iOS development build |
| `bun run submit:ios` | Submit latest iOS build to App Store |
| `bunx eas build --platform all --profile production` | Build both iOS and Android |
