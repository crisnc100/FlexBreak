const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const { readFileSync, writeFileSync } = require('fs');
const path = require('path');

function withModularHeaders(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfileContent = readFileSync(podfilePath, 'utf8');

      // Add use_modular_headers! globally for Swift pod dependencies
      const useFrameworksPattern = /use_frameworks!\s*:linkage\s*=>\s*:static/;
      
      if (useFrameworksPattern.test(podfileContent)) {
        // Add use_modular_headers! right after use_frameworks!
        podfileContent = podfileContent.replace(
          useFrameworksPattern,
          'use_frameworks! :linkage => :static\n  use_modular_headers!'
        );
      } else {
        // If use_frameworks! is not found, add both at the beginning of target block
        const targetPattern = /target\s+['"].*?['"]\s+do/;
        podfileContent = podfileContent.replace(
          targetPattern,
          (match) => `${match}\n  use_frameworks! :linkage => :static\n  use_modular_headers!`
        );
      }

      // Also add specific modular headers for problematic pods if needed
      const postInstallPattern = /post_install\s+do\s+\|installer\|/;
      
      if (!podfileContent.includes('pod_target.build_configurations.each')) {
        const postInstallAddition = `
    # Fix for Swift pods with static libraries
    installer.pods_project.targets.each do |pod_target|
      pod_target.build_configurations.each do |config|
        config.build_settings['DEFINES_MODULE'] = 'YES'
        config.build_settings['SWIFT_VERSION'] = '5.0'
      end
    end`;

        if (postInstallPattern.test(podfileContent)) {
          podfileContent = podfileContent.replace(
            postInstallPattern,
            (match) => `${match}${postInstallAddition}`
          );
        }
      }

      writeFileSync(podfilePath, podfileContent);
      return config;
    },
  ]);
}

module.exports = withModularHeaders;