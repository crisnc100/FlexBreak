const { withDangerousMod, withPlugins } = require('@expo/config-plugins');
const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

function withFirebaseIOS(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const filePath = resolve(config.modRequest.platformProjectRoot, 'Podfile');
      
      try {
        let contents = readFileSync(filePath, 'utf-8');
        
        // Add Firebase-specific pod configurations
        if (!contents.includes('# Firebase specific configurations')) {
          // Find the target block
          const targetRegex = /target\s+['"](\w+)['"]\s+do/;
          const targetMatch = contents.match(targetRegex);
          
          if (targetMatch) {
            const targetName = targetMatch[1];
            
            // Add pod configurations inside the target block
            contents = contents.replace(
              /target\s+['"](\w+)['"]\s+do/,
              `target '${targetName}' do
  # Firebase specific configurations
  pod 'Firebase', :modular_headers => true
  pod 'FirebaseCoreInternal', :modular_headers => true
  pod 'GoogleUtilities', :modular_headers => true
  pod 'FirebaseCore', :modular_headers => true
  pod 'FirebaseMessaging', :modular_headers => true`
            );
          }
        }
        
        // Fix the post_install to handle module conflicts
        if (!contents.includes('# Fix for Firebase module conflicts')) {
          contents = contents.replace(
            /post_install do \|installer\|/,
            `post_install do |installer|
    # Fix for Firebase module conflicts
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.4'
        
        # Fix module conflicts for React Native Firebase
        if target.name == 'React-RCTAppDelegate'
          config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
        end
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

module.exports = withFirebaseIOS;