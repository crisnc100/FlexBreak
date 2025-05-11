// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add resolver to handle Firebase JS SDK
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

// Add additional server options for React Native Firebase if needed
config.resolver.extraNodeModules = new Proxy(
  {},
  {
    get: (target, name) => {
      if (name === 'firebase') {
        return `${__dirname}/node_modules/firebase`;
      }
      return undefined;
    },
  },
);

module.exports = config; 