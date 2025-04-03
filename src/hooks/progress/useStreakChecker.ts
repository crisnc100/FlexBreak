/**
 * @deprecated Use useGamification().handleStreakReset() instead.
 * This hook is maintained for backward compatibility.
 */
import { useEffect } from 'react';
import { useGamification } from './useGamification';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Custom hook to check streak status and update related achievements
 * This is now a thin wrapper around useGamification to maintain compatibility.
 */
export function useStreakChecker() {
  const { handleStreakReset, refreshData } = useGamification();

  useEffect(() => {
    console.warn('useStreakChecker is deprecated. Use useGamification().handleStreakReset() instead.');
    
    const checkStreakStatus = async () => {
      try {
        // Check if streak is broken and reset if needed
        const lastSessionDate = await AsyncStorage.getItem('lastSessionDate');
        const today = new Date().toDateString();
        
        // If no previous session or session was yesterday, streak is intact
        if (!lastSessionDate) {
          await AsyncStorage.setItem('lastSessionDate', today);
          return;
        }
        
        const lastDate = new Date(lastSessionDate);
        const currentDate = new Date(today);
        
        // Calculate days between sessions
        const timeDiff = currentDate.getTime() - lastDate.getTime();
        const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        
        // If more than 1 day has passed, streak is broken
        if (daysDiff > 1) {
          console.log('Streak broken! Resetting streak challenges...');
          await handleStreakReset();
        }
        
        // Update last session date
        await AsyncStorage.setItem('lastSessionDate', today);
        
        // Always refresh data to ensure UI is up to date
        await refreshData();
      } catch (error) {
        console.error('Error checking streak status:', error);
      }
    };
    
    checkStreakStatus();
  }, [handleStreakReset, refreshData]);
} 