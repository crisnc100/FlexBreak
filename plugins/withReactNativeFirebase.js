const { withDangerousMod } = require('@expo/config-plugins');
const { readFileSync, writeFileSync } = require('fs');
const { resolve } = require('path');

function withReactNativeFirebase(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const filePath = resolve(config.modRequest.platformProjectRoot, 'Podfile');
      
      try {
        let contents = readFileSync(filePath, 'utf-8');
        
        // Remove any existing use_modular_headers! to avoid conflicts
        contents = contents.replace(/use_modular_headers!\s*\n/g, '');
        
        // Add specific Firebase pod configurations with static frameworks
        if (!contents.includes('# React Native Firebase Configuration')) {
          contents = contents.replace(
            /use_react_native!\(/,
            `# React Native Firebase Configuration
  use_frameworks! :linkage => :static
  $RNFirebaseAsStaticFramework = true
  
  use_react_native!(`
          );
        }
        
        // Add Firebase specific pod configurations if not already present
        if (!contents.includes('pod \'Firebase/Core\'')) {
          // Find the target block and add Firebase pods
          contents = contents.replace(
            /target 'FlexBreak' do/,
            `target 'FlexBreak' do
  # Firebase pods
  pod 'Firebase/Core', :modular_headers => true
  pod 'Firebase/Messaging', :modular_headers => true
  pod 'FirebaseCore', :modular_headers => true
  pod 'GoogleUtilities', :modular_headers => true`
          );
        }
        
        // Modify the post_install block
        if (contents.includes('post_install do |installer|')) {
          // Add our fixes after react_native_post_install
          contents = contents.replace(
            /react_native_post_install\([^)]+\)/,
            `react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
      :ccache_enabled => false
    )
    
    # Fix for React Native Firebase
    installer.pods_project.build_configurations.each do |config|
      config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
    end
    
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
        
        # Fix for ReactCommon duplicates
        if target.name.start_with?('React')
          config.build_settings['DEFINES_MODULE'] = 'NO'
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

module.exports = withReactNativeFirebase;