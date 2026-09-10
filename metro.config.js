// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add resolver to handle Firebase JS SDK
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs', 'ts', 'tsx', 'js', 'jsx'];

// Ensure proper module resolution
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, 'src'),
];

// Add additional server options / module aliases
config.resolver.extraNodeModules = {
  // Ensure Firebase JS SDK resolves correctly
  'firebase': path.resolve(__dirname, 'node_modules/firebase'),
  'firebase/compat/functions': path.resolve(
    __dirname,
    'node_modules/firebase/compat/functions'
  ),
};

// Exclude firebase-admin from Metro file watching (dev dependency only)
config.watchFolders = [
  path.resolve(__dirname, 'src'),
  path.resolve(__dirname, 'assets'),
];

// Anchor project-only backend exclusions; a generic /functions/ expression also
// hides semver/functions, which Reanimated needs during bundling.
const escapedRoot = __dirname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
config.resolver.blockList = [new RegExp(`${escapedRoot}/(?:functions|supabase)/`)];

// Clear cache on each run in development
if (process.env.NODE_ENV !== 'production') {
  config.resetCache = true;
}

module.exports = config; 
