import * as IntentLauncher from 'expo-intent-launcher';
import { Platform } from 'react-native';

export const setupSiriShortcuts = async () => {
  if (Platform.OS !== 'ios') return;
  
  // This requires native code configuration
  // Users can manually add shortcut in iOS Settings > Siri & Search > FlexBreak
  console.log('Siri Shortcuts ready for manual configuration');
};

// Helper to create shortcut URL
export const getFlexCoachURL = () => {
  return 'flexbreak-app://flexcoach';
};