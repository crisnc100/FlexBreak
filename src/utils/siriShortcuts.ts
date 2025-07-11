import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../services/storageService';

// Check if user can access Flex Coach based on subscription and day
export const canAccessFlexCoach = async (): Promise<{ canAccess: boolean; message?: string }> => {
  try {
    // Check if AI wellness is enabled
    const aiWellnessEnabled = await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED);
    if (aiWellnessEnabled !== 'true') {
      return {
        canAccess: false,
        message: 'Please enable AI Wellness Coach in settings first'
      };
    }

    // Check premium status
    const isPremium = await AsyncStorage.getItem('@user_premium') === 'true';
    
    if (isPremium) {
      return { canAccess: true };
    }
    
    // For free users, check if it's Wednesday
    const today = new Date().getDay();
    const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
    
    // Check if this is their first interaction ever
    const hasEverUsedKey = `@ai_wellness_first_used_${userId}`;
    const hasEverUsed = await AsyncStorage.getItem(hasEverUsedKey);
    
    // If it's not Wednesday and they've used it before, block access
    if (today !== 3 && hasEverUsed) {
      return {
        canAccess: false,
        message: 'AI Wellness Coach is available on Wednesdays for free users. Upgrade to premium for daily access!'
      };
    }
    
    // Mark that they've now used it (for first-time users)
    if (!hasEverUsed) {
      await AsyncStorage.setItem(hasEverUsedKey, 'true');
    }
    
    return { canAccess: true };
  } catch (error) {
    console.error('Error checking Flex Coach access:', error);
    return { canAccess: false, message: 'Error checking access' };
  }
};

export const setupSiriShortcuts = async () => {
  if (Platform.OS !== 'ios') return;
  
  // Mark that Siri shortcuts are available
  await AsyncStorage.setItem('@siri_shortcuts_available', 'true');
  
  console.log('Siri Shortcuts ready for configuration');
};

// Helper to create shortcut URL
export const getFlexCoachURL = () => {
  return 'flexbreak-app://flexcoach';
};

// Handle Siri shortcut invocation
export const handleSiriShortcut = async (): Promise<{ success: boolean; message?: string }> => {
  const accessCheck = await canAccessFlexCoach();
  
  if (!accessCheck.canAccess) {
    return { success: false, message: accessCheck.message };
  }
  
  // Open the app with deep link
  const url = getFlexCoachURL();
  const canOpen = await Linking.canOpenURL(url);
  
  if (canOpen) {
    await Linking.openURL(url);
    return { success: true };
  }
  
  return { success: false, message: 'Unable to open Flex Coach' };
};

// Get user activity for Siri
export const getUserActivityInfo = () => {
  return {
    activityType: 'com.cristianortega.flexbreak.openFlexCoach',
    title: 'Open Flex Coach',
    keywords: ['flex', 'coach', 'wellness', 'ai', 'chat', 'flexbreak'],
    suggestedInvocationPhrase: 'Open Flex Coach',
    isEligibleForSearch: true,
    isEligibleForPrediction: true,
    persistentIdentifier: 'open-flex-coach-shortcut'
  };
};