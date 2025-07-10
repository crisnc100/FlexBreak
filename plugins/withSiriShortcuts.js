const { withInfoPlist, withXcodeProject } = require('@expo/config-plugins');

module.exports = function withSiriShortcuts(config) {
  // Add Siri usage description
  config = withInfoPlist(config, (config) => {
    config.modResults.NSUserActivityTypes = [
      'com.cristianortega.flexbreak.openFlexCoach',
    ];
    
    // Add suggested invocation phrase
    config.modResults.INIntentsSupported = ['OpenFlexCoachIntent'];
    
    return config;
  });

  return config;
};