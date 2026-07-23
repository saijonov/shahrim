// Metro config for the Shahrim native app inside a pnpm monorepo.
// Follows Expo's official "Working with monorepos" guide:
//   https://docs.expo.dev/guides/monorepos/
//
// The two critical pieces for pnpm:
//   1. watchFolders — let Metro see files outside apps/mobile (the workspace
//      root, where the shared @shahrim/* packages and the hoisted node_modules
//      live), so editing a shared package is picked up and its TS source is
//      transpiled by babel-preset-expo.
//   2. nodeModulesPaths — resolve deps from both the app's own node_modules and
//      the monorepo-root node_modules (pnpm hoists some there).
// Expo SDK 51's Metro resolves pnpm symlinks, so no extra symlink shims needed.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the whole monorepo (shared packages + root node_modules).
config.watchFolders = [monorepoRoot];

// 2. Resolve modules from the app first, then the monorepo root.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Keep hierarchical lookup on so nested node_modules still resolve.
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
