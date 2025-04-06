/**
 * @deprecated Use useGamification().handleStreakReset() instead.
 * This hook is maintained for backward compatibility.
 */
import { useEffect } from 'react';
import { useGamification } from './useGamification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserProgress, saveUserProgress } from '../../services/storageService';
import { resetStreakAchievements } from '../../utils/progress/modules/achievementManager';
import * as streakFreezeManager from '../../utils/progress/modules/streakFreezeManager';
import * as streakManager from '../../utils/progress/modules/streakManager';
import { useIsFocused } from '@react-navigation/native';
import * as achievementManager from '../../utils/progress/modules/achievementManager';

/**
 * Custom hook to check streak status and update related achievements
 * This is now a thin wrapper around useGamification to maintain compatibility.
 */
export function useStreakChecker() {
  const { handleStreakReset, refreshData } = useGamification();
  const isFocused = useIsFocused();

  useEffect(() => {
    console.warn('useStreakChecker is deprecated. Use useGamification().handleStreakReset() instead.');
    
    const checkStreakStatus = async () => {
      try {
        // First, ensure streak freezes are properly initialized
        await streakFreezeManager.refillMonthlyStreakFreezes();
        
        // Check streak status
        const streakStatus = await streakManager.checkStreakStatus();
        
        // If streak is broken and can't be saved, reset streak achievements
        if (streakStatus.streakBroken && !streakStatus.canSaveYesterdayStreak) {
          console.log('Streak broken and cannot be saved, resetting achievements');
          
          // First use the gamification hook's method
          await handleStreakReset();
          
          // Then also directly reset achievements in storage
          const userProgress = await getUserProgress();
          if (userProgress) {
            const resetCount = resetStreakAchievements(userProgress);
            console.log(`Reset ${resetCount} streak achievements directly in storage`);
            
            if (resetCount > 0) {
              await saveUserProgress(userProgress);
            }
          }
        } else if (streakStatus.currentStreak > 0) {
          // Current streak is active, ensure it's properly handled
          console.log(`Active streak detected: ${streakStatus.currentStreak} days`);
          
          // If streak freeze was used, check if activity today should increment it
          const streakFreezeUsed = await streakFreezeManager.wasStreakFreezeUsedForCurrentDay();
          if (streakFreezeUsed) {
            console.log('Streak freeze was used recently - ensuring streak is maintained');
            // The check in streakManager.checkStreakStatus will handle the increment
          }
        }
        
        // Update last session date
        const today = new Date().toDateString();
        await AsyncStorage.setItem('lastSessionDate', today);
        
        // Always refresh data to ensure UI is up to date
        await refreshData();
      } catch (error) {
        console.error('Error checking streak status:', error);
      }
    };
    
    if (isFocused) {
      checkStreakStatus();
    }
  }, [handleStreakReset, refreshData, isFocused]);
} 