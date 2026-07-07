const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // Design system: UI code reads colors through useThemeColors() so accent
    // themes apply everywhere; direct constants/colors imports are legacy.
    // Warning (not error) while unmigrated screens remain — see
    // docs/DESIGN-SYSTEM.md migration checklist.
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["**/constants/colors"],
              message:
                "Use useThemeColors() (providers/ThemeProvider) instead of static Colors.",
            },
          ],
        },
      ],
    },
  },
]);
