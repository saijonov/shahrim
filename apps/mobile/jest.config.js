// jest-expo drives the RN/Expo transform + module setup. We only unit-test pure
// logic (no native modules), but the preset keeps RN imports safe if a module
// pulls one in transitively.
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/**/*.test.ts?(x)"],
  // Transform RN/Expo (which ship Flow/ESM) AND the shared @shahrim/* packages
  // (TS source). pnpm flattens deps under node_modules/.pnpm/<name>@<ver>/... —
  // scopes use `+` (e.g. @react-native+js-polyfills) — so the ignore pattern is
  // anchored at `.pnpm/` and allow-lists the package-name prefixes to transform.
  transformIgnorePatterns: [
    "node_modules/.pnpm/(?!((jest-)?react-native|@react-native|@react-navigation|expo|@expo|@expo-google-fonts|react-native-.*|@unimodules|unimodules|sentry-expo|native-base|react-native-svg|@shahrim))",
  ],
  // Resolve the workspace packages directly to their TS source so tests do not
  // depend on pnpm symlink resolution quirks.
  moduleNameMapper: {
    "^@shahrim/api-client$": "<rootDir>/../../packages/api-client/src/index.ts",
    "^@shahrim/i18n$": "<rootDir>/../../packages/i18n/src/index.ts",
    "^@shahrim/i18n/uz\\.json$": "<rootDir>/../../packages/i18n/locales/uz.json",
    "^@shahrim/ui-tokens$": "<rootDir>/../../packages/ui-tokens/src/index.ts",
  },
};
