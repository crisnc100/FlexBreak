const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

function withFirebaseMessaging(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const filePath = resolve(config.modRequest.platformProjectRoot, 'Podfile');
      
      try {
        let contents = readFileSync(filePath, 'utf-8');
        
        // Add use_modular_headers! before the target block
        if (!contents.includes('use_modular_headers!')) {
          contents = contents.replace(
            /prepare_react_native_project!\n/,
            'prepare_react_native_project!\n\n# Enable modular headers for Firebase\nuse_modular_headers!\n'
          );
        }
        
        // Ensure proper iOS deployment target
        if (!contents.includes("config.build_settings['IPHONEOS_DEPLOYMENT_TARGET']")) {
          contents = contents.replace(
            /post_install do \|installer\|/,
            `post_install do |installer|
    # Fix for Firebase pod issues
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '14.0'
      end
    end`
          );
        }
        
        writeFileSync(filePath, contents);
      } catch (error) {
        console.error('Error modifying Podfile:', error);
      }
      
      return config;
    },
  ]);
}

module.exports = withFirebaseMessaging;