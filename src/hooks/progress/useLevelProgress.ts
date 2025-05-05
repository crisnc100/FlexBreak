import { useMemo, useCallback, useEffect } from 'react';
import { useGamification } from './useGamification';
import { Level } from '../../utils/progress/types';
import * as gamificationManager from '../../utils/progress/gameEngine';
import { LEVELS } from '../../utils/progress/constants';

/**
 * Return type for the useLevelProgress hook
 */
interface LevelProgressInfo {
  currentLevel: number;
  currentLevelData: Level;
  nextLevelData: Level | null;
  totalXP: number;
  xpToNextLevel: number;
  xpProgress: number;
  percentComplete: number;
  refreshLevelData: () => Promise<void>;
}

/**
 * Custom hook to consistently calculate level progress for use in components
 * This centralizes the logic so it's the same everywhere in the app
 */
export function useLevelProgress(): LevelProgressInfo {
  const { totalXP, level, xpToNextLevel, refreshData } = useGamification();
  
  const progressInfo = useMemo(() => {
    // Get the level data for the current and next levels
    const currentLevelData = LEVELS.find(l => l.level === level) || LEVELS[0];
    const nextLevelData = LEVELS.find(l => l.level === level + 1) || null;
    
    // Calculate the percent progress using the same logic throughout the app
    let xpProgress = 0;
    
    if (nextLevelData) {
      const xpForCurrentLevel = currentLevelData.xpRequired;
      const xpForNextLevel = nextLevelData.xpRequired;
      const xpRangeForLevel = xpForNextLevel - xpForCurrentLevel;
      const xpProgressInLevel = totalXP - xpForCurrentLevel;
      
      // Calculate progress as a number between 0 and 1
      xpProgress = Math.min(Math.max(xpProgressInLevel / xpRangeForLevel, 0), 1);
    } else {
      // At max level
      xpProgress = 1;
    }
    
    return {
      currentLevel: level,
      currentLevelData,
      nextLevelData,
      totalXP,
      xpToNextLevel,
      xpProgress,
      percentComplete: Math.round(xpProgress * 100)
    };
  }, [level, totalXP, xpToNextLevel]);
  
  // Public function for refreshing data only (no processing)
  const refreshLevelData = useCallback(async () => {
    try {
      // Get the latest gamification data
      const levelInfo = await gamificationManager.getUserLevelInfo();
      await refreshData();
    } catch (error) {
      console.error('Error refreshing level data:', error);
    }
  }, [refreshData]);
  
  return {
    ...progressInfo,
    refreshLevelData
  };
} 