import { useState, useEffect, useCallback, useRef } from 'react';
import { ProgressEntry } from '../types';
import * as ProgressSystemUtils from '../utils/progressSystem';
import { calculateStreak } from '../utils/progressUtils';

/**
 * Hook for managing user progress, XP, levels, achievements, and challenges
 */
export function useProgressSystem() {
  const [userProgress, setUserProgress] = useState<ProgressSystemUtils.UserProgress>(
    ProgressSystemUtils.INITIAL_USER_PROGRESS
  );
  const [isLoading, setIsLoading] = useState(true);
  const lastProcessedKey = useRef<string | null>(null);

  // Load user progress on mount
  useEffect(() => {
    const loadUserProgress = async () => {
      try {
        setIsLoading(true);
        const progress = await ProgressSystemUtils.getUserProgress();
        setUserProgress(progress);
      } catch (error) {
        console.error('Error loading user progress:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUserProgress();
  }, []);

  // Save user progress
  const saveUserProgress = useCallback(async (progress: ProgressSystemUtils.UserProgress) => {
    try {
      await ProgressSystemUtils.saveUserProgress(progress);
      setUserProgress(progress);
      return true;
    } catch (error) {
      console.error('Error saving user progress:', error);
      return false;
    }
  }, []);

  // Calculate level based on XP
  const calculateLevel = useCallback((xp: number) => {
    return ProgressSystemUtils.calculateLevel(xp);
  }, []);

  // Update XP and check for level up
  const updateXP = useCallback(async (xpToAdd: number) => {
    if (xpToAdd <= 0) {
      console.log('No XP to add, skipping update');
      return false;
    }
    
    const result = await ProgressSystemUtils.addXP(xpToAdd);
    
    // Refresh user progress
    const updatedProgress = await ProgressSystemUtils.getUserProgress();
    setUserProgress(updatedProgress);
    
    return result.leveledUp;
  }, []);

  // Check and update achievements
  const checkAchievements = useCallback(async (
    routineCount: number,
    currentStreak: number,
    uniqueAreas: string[],
    totalMinutes: number,
    routinesByArea: Record<string, number> = {}
  ) => {
    // Create a unique key for this check to prevent duplicate processing
    const achievementCheckKey = `achievements_${routineCount}_${currentStreak}_${uniqueAreas.length}_${totalMinutes}_${Object.keys(routinesByArea).length}`;
    
    console.log(`Checking achievements with key: ${achievementCheckKey}`);
    console.log(`Data: routines=${routineCount}, streak=${currentStreak}, areas=${uniqueAreas.length}, minutes=${totalMinutes}`);
    
    let xpEarned = 0;
    const updatedAchievements = { ...userProgress.achievements };
    let achievementsCompleted = false;
    
    // Check each achievement
    Object.keys(updatedAchievements).forEach(id => {
      const achievement = updatedAchievements[id];
      
      if (!achievement.completed) {
        let newProgress = achievement.progress;
        
        // Update progress based on achievement type
        switch (achievement.type) {
          case 'routine_count':
            newProgress = routineCount;
            break;
          case 'streak':
            newProgress = currentStreak;
            break;
          case 'area_variety':
            newProgress = uniqueAreas.length;
            break;
          case 'total_time':
            newProgress = totalMinutes;
            break;
          case 'specific_area':
            // Find the area with the most routines
            if (Object.keys(routinesByArea).length > 0) {
              newProgress = Math.max(...Object.values(routinesByArea));
            }
            break;
        }
        
        console.log(`Achievement ${achievement.title}: progress ${achievement.progress} -> ${newProgress}, requirement: ${achievement.requirement}`);
        
        // Check if the achievement is now completed
        if (newProgress >= achievement.requirement && !achievement.completed) {
          achievementsCompleted = true;
          xpEarned += achievement.xp;
          
          updatedAchievements[id] = {
            ...achievement,
            progress: newProgress,
            completed: true,
            dateCompleted: new Date().toISOString()
          };
          
          console.log(`Achievement unlocked: ${achievement.title} (+${achievement.xp} XP)`);
        } else if (newProgress !== achievement.progress) {
          // Just update progress
          updatedAchievements[id] = {
            ...achievement,
            progress: newProgress
          };
          
          console.log(`Achievement progress updated: ${achievement.title} - ${newProgress}/${achievement.requirement}`);
        }
      }
    });
    
    // Only update achievements in state if there were changes
    if (achievementsCompleted || Object.values(updatedAchievements).some(a => 
      a.progress !== userProgress.achievements[a.id]?.progress)
    ) {
      const updatedProgress = {
        ...userProgress,
        achievements: updatedAchievements
      };
      
      setUserProgress(updatedProgress);
      await saveUserProgress(updatedProgress);
      
      // Award XP if any achievements were completed
      if (xpEarned > 0) {
        console.log(`Awarding ${xpEarned} XP for completed achievements`);
        const leveledUp = await updateXP(xpEarned);
        return { xpEarned, leveledUp, achievementsCompleted };
      }
    }
    
    return { xpEarned: 0, leveledUp: false, achievementsCompleted };
  }, [userProgress, updateXP, saveUserProgress]);

  // Update challenges
  const updateChallenges = useCallback(async (
    routineCount: number,
    currentStreak: number,
    routinesByArea: Record<string, number> = {}
  ) => {
    // Skip if no challenges
    if (Object.keys(userProgress.challenges).length === 0) {
      return { xpEarned: 0, challengesCompleted: false };
    }
    
    let xpEarned = 0;
    let challengesCompleted = false;
    const updatedChallenges = { ...userProgress.challenges };
    const now = new Date();
    
    // Process each active challenge
    Object.keys(updatedChallenges).forEach(id => {
      const challenge = updatedChallenges[id];
      
      // Skip if already completed or expired
      if (challenge.completed || new Date(challenge.endDate) < now) {
        return;
      }
      
      let newProgress = challenge.progress;
      
      // Update progress based on challenge type
      switch (challenge.type) {
        case 'routine_count':
          newProgress = routineCount;
          break;
        case 'streak':
          newProgress = currentStreak;
          break;
        case 'specific_area':
          const targetArea = challenge.id.split('_').pop();
          if (targetArea && routinesByArea[targetArea]) {
            newProgress = routinesByArea[targetArea];
          }
          break;
      }
      
      // Check if challenge is completed
      if (newProgress >= challenge.requirement && !challenge.completed) {
        challengesCompleted = true;
        xpEarned += challenge.xp;
        
        updatedChallenges[id] = {
          ...challenge,
          progress: newProgress,
          completed: true,
          dateCompleted: new Date().toISOString()
        };
        
        console.log(`Challenge completed: ${challenge.title} (+${challenge.xp} XP)`);
      } else if (newProgress !== challenge.progress) {
        // Just update progress
        updatedChallenges[id] = {
          ...challenge,
          progress: newProgress
        };
        
        console.log(`Challenge progress updated: ${challenge.title} - ${newProgress}/${challenge.requirement}`);
      }
    });
    
    // Only update challenges in state if there were changes
    if (challengesCompleted || Object.values(updatedChallenges).some(c => 
      c.progress !== userProgress.challenges[c.id]?.progress)
    ) {
      const updatedProgress = {
        ...userProgress,
        challenges: updatedChallenges
      };
      
      setUserProgress(updatedProgress);
      await saveUserProgress(updatedProgress);
      
      // Award XP if any challenges were completed
      if (xpEarned > 0) {
        console.log(`Awarding ${xpEarned} XP for completed challenges`);
        const leveledUp = await updateXP(xpEarned);
        return { xpEarned, leveledUp, challengesCompleted };
      }
    }
    
    return { xpEarned: 0, leveledUp: false, challengesCompleted };
  }, [userProgress, updateXP, saveUserProgress]);

  // Update progress with routines - main function to call with new progress data
  const updateProgressWithRoutines = useCallback(async (routines: ProgressEntry[]) => {
    if (!routines.length) return;
    
    // Add a guard to prevent excessive updates
    const processingKey = `${routines.length}_${new Date().toDateString()}`;
    
    if (lastProcessedKey.current === processingKey) {
      console.log('Already processed this data today, skipping update');
      return;
    }
    
    lastProcessedKey.current = processingKey;
    
    const result = await ProgressSystemUtils.updateProgressWithRoutines(routines);
    
    // Refresh user progress
    const updatedProgress = await ProgressSystemUtils.getUserProgress();
    setUserProgress(updatedProgress);
    
    console.log('Progress update complete:', result);
    
    return result;
  }, []);

  // Create a new challenge
  const createChallenge = useCallback(async (challenge: Omit<ProgressSystemUtils.Challenge, 'progress' | 'completed' | 'dateCompleted'>) => {
    const result = await ProgressSystemUtils.createChallenge(challenge);
    
    if (result) {
      // Refresh user progress
      const updatedProgress = await ProgressSystemUtils.getUserProgress();
      setUserProgress(updatedProgress);
    }
    
    return result;
  }, []);

  // Get active challenges
  const getActiveChallenges = useCallback(async () => {
    return ProgressSystemUtils.getActiveChallenges();
  }, []);

  // Get completed challenges
  const getCompletedChallenges = useCallback(async () => {
    return ProgressSystemUtils.getCompletedChallenges();
  }, []);

  // Get unlocked achievements
  const getUnlockedAchievements = useCallback(async () => {
    return ProgressSystemUtils.getUnlockedAchievements();
  }, []);

  // Get in-progress achievements
  const getInProgressAchievements = useCallback(async () => {
    return ProgressSystemUtils.getInProgressAchievements();
  }, []);

  // Get unlocked rewards
  const getUnlockedRewards = useCallback(async () => {
    return ProgressSystemUtils.getUnlockedRewards();
  }, []);

  // Reset user progress (for testing)
  const resetUserProgress = useCallback(async () => {
    const result = await ProgressSystemUtils.resetUserProgress();
    
    if (result) {
      // Refresh user progress
      const updatedProgress = await ProgressSystemUtils.getUserProgress();
      setUserProgress(updatedProgress);
    }
    
    return result;
  }, []);

  return {
    userProgress,
    isLoading,
    updateProgressWithRoutines,
    updateXP,
    checkAchievements,
    updateChallenges,
    createChallenge,
    getActiveChallenges,
    getCompletedChallenges,
    getUnlockedAchievements,
    getInProgressAchievements,
    getUnlockedRewards,
    resetUserProgress,
    calculateLevel
  };
} 