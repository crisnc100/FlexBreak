export const FEATURE_FLAGS = {
  ENHANCED_NOTIFICATIONS: {
    enabled: true,
    platforms: {
      ios: true,
      android: true,
    },
    soundEnabled: true,
    richContentEnabled: true,
    testModeEnabled: __DEV__,
  },
};
