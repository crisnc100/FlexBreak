import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../storageService';
import { scheduleAICheckIns, cancelAICheckIns } from './aiWellnessScheduler';
import * as Notifications from 'expo-notifications';

/**
 * Handles the transition when a user upgrades from free to premium
 * This should be called when the premium status changes
 */
export const handleAIWellnessUpgrade = async () => {
  try {
    // Check if AI Wellness is enabled
    const isEnabled = await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED);
    
    if (isEnabled !== 'true') {
      // AI Wellness not enabled, nothing to do
      return;
    }
    
    console.log('User upgraded to premium - updating AI Wellness schedule');
    
    // Cancel existing notifications (Wednesday only)
    await cancelAICheckIns();
    
    // Schedule new notifications (Daily)
    await scheduleAICheckIns(true, false); // isPremium = true, isInitialSetup = false
    
    // Send a celebration notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Welcome to Premium AI Wellness! 🎉",
        body: "You now have daily access to your AI Flex Coach! I'll check in with you every day at 2 PM. Ready to level up your wellness? 💪",
        data: { 
          type: 'ai_wellness_upgrade',
          isPremium: true
        },
      },
      trigger: {
        seconds: 2
      }
    });
    
    // Clear any usage limits from today
    const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
    const todayStr = new Date().toDateString();
    const usageKey = `@ai_usage_${userId}_${todayStr}`;
    await AsyncStorage.removeItem(usageKey);
    
    console.log('AI Wellness upgraded to premium successfully');
    
  } catch (error) {
    console.error('Error handling AI Wellness upgrade:', error);
  }
};

/**
 * Handles the transition when a user downgrades from premium to free
 */
export const handleAIWellnessDowngrade = async () => {
  try {
    const isEnabled = await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED);
    
    if (isEnabled !== 'true') {
      return;
    }
    
    console.log('User downgraded to free - updating AI Wellness schedule');
    
    // Cancel existing notifications (Daily)
    await cancelAICheckIns();
    
    // Schedule new notifications (Wednesday only)
    await scheduleAICheckIns(false, false); // isPremium = false, isInitialSetup = false
    
    // Send a notification about the change
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "AI Wellness Updated 📅",
        body: "Your AI Flex Coach is now available on Wednesdays. Thanks for trying premium! I'll still be here to help you stay healthy! 🌟",
        data: { 
          type: 'ai_wellness_downgrade',
          isPremium: false
        },
      },
      trigger: {
        seconds: 2
      }
    });
    
    console.log('AI Wellness downgraded to free successfully');
    
  } catch (error) {
    console.error('Error handling AI Wellness downgrade:', error);
  }
};