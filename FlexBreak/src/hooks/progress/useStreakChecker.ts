/**
 * @deprecated Use useGamification().handleStreakReset() instead.
 * This hook is maintained for backward compatibility.
 */
import { useEffect } from 'react';
import { useGamification } from './useGamification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as streakManager from '../../utils/progress/modules/streakManager';
import * as flexSaveManager from '../../utils/progress/modules/flexSaveManager';
import { useIsFocused } from '@react-navigation/native';

/**
 * Custom hook to check streak status and update related achievements
 * This is now a thin wrapper around useGamification to maintain compatibility,
 * but it calls the centralized streak management functions.
 */
export function useStreakChecker() {
  const { refreshData } = useGamification();
  const isFocused = useIsFocused();

  useEffect(() => {
    console.warn('useStreakChecker is deprecated. Use useGamification().handleStreakReset() instead.');
    
    const checkStreakStatus = async () => {
      try {
        console.log('Running streak check on app focus');
        
        // Ensure streak flexSaves are properly initialized/refilled if needed
        await flexSaveManager.refillFlexSaves();
        
        // Initialize streak if needed
        if (!streakManager.streakCache.initialized) {
          await streakManager.initializeStreak();
        }
        
        // Get current streak status
        const streakStatus = await streakManager.getStreakStatus();
        
        console.log('Streak status check result:', {
          currentStreak: streakStatus.currentStreak,
          maintainedToday: streakStatus.maintainedToday,
          flexSavesAvailable: streakStatus.flexSavesAvailable
        });
        
        // Update streak challenges (now handled automatically by the streak manager)
        const userProgress = await streakManager.getLegacyStreakStatus();
        
        // Update last session date
        const today = new Date().toDateString();
        await AsyncStorage.setItem('lastSessionDate', today);
        
        // Always refresh data to ensure UI is up to date
        await refreshData();
      } catch (error) {
        console.error('Error checking streak status:', error);
      }
    };
    
    // Run check when screen is focused
    if (isFocused) {
      checkStreakStatus();
    }
    
    // Set up listener for streak updates
    const handleStreakUpdate = () => {
      console.log('Streak updated event received in useStreakChecker');
      checkStreakStatus();
    };
    
    // Listen for general streak updates
    streakManager.streakEvents.on(streakManager.STREAK_UPDATED_EVENT, handleStreakUpdate);
    
    // Cleanup
    return () => {
      streakManager.streakEvents.off(streakManager.STREAK_UPDATED_EVENT, handleStreakUpdate);
    };
  }, [refreshData, isFocused]);
} 