import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../state/hooks';
import { 
  initializeStreakState, 
  updateStreakStatus, 
  applyStreakFreeze 
} from '../../state/slices/streakSlice';
import * as streakManager from '../../utils/progress/modules/streakManager';
import * as streakFreezeManager from '../../utils/progress/modules/streakFreezeManager';

/**
 * Custom hook for managing streak functionality using Redux
 * This provides a clean API for components to interact with streak functionality
 */
export const useStreak = () => {
  const dispatch = useAppDispatch();
  const { 
    streak, 
    streakState, 
    routineDates, 
    streakFreezeDates, 
    processedToday,
    isLoading,
    error 
  } = useAppSelector(state => state.streak);
  
  const [freezesAvailable, setFreezesAvailable] = useState(0);
  const [canSaveYesterdayStreak, setCanSaveYesterdayStreak] = useState(false);
  
  // Initialize streak state when the hook is first used
  useEffect(() => {
    dispatch(initializeStreakState());
    
    // Check freezes available
    const checkFreezes = async () => {
      const count = await streakFreezeManager.getFreezesAvailable();
      setFreezesAvailable(count);
    };
    
    // Check if yesterday's streak can be saved
    const checkStreakSaveEligibility = async () => {
      const isEligible = await streakManager.isEligibleForStreakFreeze();
      setCanSaveYesterdayStreak(isEligible);
    };
    
    checkFreezes();
    checkStreakSaveEligibility();
  }, [dispatch]);
  
  // Update freezes available and save eligibility whenever the streak state changes
  useEffect(() => {
    const updateFreezesAndEligibility = async () => {
      const count = await streakFreezeManager.getFreezesAvailable();
      setFreezesAvailable(count);
      
      const isEligible = await streakManager.isEligibleForStreakFreeze();
      setCanSaveYesterdayStreak(isEligible);
    };
    
    updateFreezesAndEligibility();
  }, [streak, streakState, streakFreezeDates]);
  
  // Update streak status with a completed routine
  const updateStreak = async (hasCompletedRoutine: boolean = false) => {
    try {
      await dispatch(updateStreakStatus(hasCompletedRoutine)).unwrap();
      return true;
    } catch (error) {
      console.error('Error updating streak:', error);
      return false;
    }
  };
  
  // Apply streak freeze
  const saveStreakWithFreeze = async () => {
    try {
      const result = await dispatch(applyStreakFreeze()).unwrap();
      return {
        success: true,
        streakState: result.streakState
      };
    } catch (error) {
      console.error('Error applying streak freeze:', error);
      return {
        success: false,
        streakState: 'BROKEN'
      };
    }
  };
  
  // Reset current streak (user declined to use streak freeze)
  const letStreakBreak = async () => {
    try {
      await streakManager.letStreakBreak();
      // Refresh the Redux state after letting streak break
      dispatch(initializeStreakState());
      return true;
    } catch (error) {
      console.error('Error letting streak break:', error);
      return false;
    }
  };
  
  return {
    streak,
    streakState,
    routineDates,
    streakFreezeDates,
    processedToday,
    freezesAvailable,
    canSaveYesterdayStreak,
    isLoading,
    error,
    updateStreak,
    saveStreakWithFreeze,
    letStreakBreak
  };
}; 