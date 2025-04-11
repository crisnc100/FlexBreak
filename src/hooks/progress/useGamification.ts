/**
 * DeskStretch Gamification System
 * ------------------------------
 * PRIMARY HOOK: This is the recommended hook for all gamification functionality.
 * 
 * This hook provides a centralized interface to:
 * - XP and level progression
 * - Challenges (daily, weekly, monthly)
 * - Achievements
 * - Rewards and unlockable features
 * - Statistics and progress data
 * 
 * Components should use this hook instead of useProgressSystem, useChallengeSystem, 
 * or other specialized hooks for better performance and consistency.
 */
import { useState, useEffect, useCallback } from 'react';
import { ProgressEntry, Challenge, Achievement, Reward, CHALLENGE_STATUS } from '../../utils/progress/types';
import * as gamificationManager from '../../utils/progress/gameEngine';
import * as achievementManager from '../../utils/progress/modules/achievementManager';
import * as storageService from '../../services/storageService';
import { EventEmitter } from '../../utils/EventEmitter';
import * as streakManager from '../../utils/progress/modules/streakManager';
import * as soundEffects from '../../utils/soundEffects';

// Define result types for better type safety
interface RoutineProcessResult {
  success: boolean;
  xpEarned: number;
  levelUp: boolean;
  newLevel: number;
  unlockedAchievements: Achievement[];
  completedChallenges: Challenge[];
  newlyUnlockedRewards: Reward[];
  xpBreakdown: Array<{ source: string; amount: number; description: string }>;
}

interface ChallengeClaimResult {
  success: boolean;
  message: string;
  xpEarned: number;
  levelUp: boolean;
  newLevel: number;
  originalXp: number;
  xpBoostApplied: boolean;
}

// Create an event emitter to notify level-up events across the app
export const gamificationEvents = new EventEmitter();
export const LEVEL_UP_EVENT = 'level_up';
export const REWARD_UNLOCKED_EVENT = 'reward_unlocked';
export const XP_UPDATED_EVENT = 'xp_updated';
export const CHALLENGE_COMPLETED_EVENT = 'challenge_completed';

/**
 * Hook for interacting with the gamification system
 */
export function useGamification() {
  const [isLoading, setIsLoading] = useState(true);
  const [level, setLevel] = useState(1);
  const [totalXP, setTotalXP] = useState(0);
  const [xpToNextLevel, setXpToNextLevel] = useState(100);
  const [percentToNextLevel, setPercentToNextLevel] = useState(0);
  const [recentlyUnlockedAchievements, setRecentlyUnlockedAchievements] = useState<Achievement[]>([]);
  const [recentlyCompletedChallenges, setRecentlyCompletedChallenges] = useState<Challenge[]>([]);
  const [recentlyUnlockedRewards, setRecentlyUnlockedRewards] = useState<Reward[]>([]);
  const [claimableChallenges, setClaimableChallenges] = useState<Challenge[]>([]);
  const [activeChallenges, setActiveChallenges] = useState<Record<string, Challenge[]>>({
    daily: [],
    weekly: [],
    monthly: [],
    special: []
  });
  const [challengesLoading, setChallengesLoading] = useState(true);
  const [gamificationSummary, setGamificationSummary] = useState<any>(null);
  
  // Load initial gamification data
  useEffect(() => {
    loadGamificationData();
  }, []);
  
  // Load all gamification data
  const loadGamificationData = useCallback(async () => {
    setIsLoading(true);
    setChallengesLoading(true);
    try {
      console.log('Loading gamification data...');
      
      // Get user progress and ensure achievements are initialized
      const userProgress = await storageService.getUserProgress();
      achievementManager.initializeAchievements(userProgress);
      
      // Get level info
      const levelInfo = await gamificationManager.getUserLevelInfo();
      setLevel(levelInfo.level);
      setTotalXP(levelInfo.totalXP);
      setXpToNextLevel(levelInfo.xpToNextLevel);
      setPercentToNextLevel(levelInfo.percentToNextLevel);
      
      // Make sure challenges are properly refreshed
      await gamificationManager.refreshChallenges(userProgress);
      
      // Update achievements and save if needed
      const updatedCount = await achievementManager.updateAchievements(userProgress);
      if (updatedCount > 0) {
        console.log(`Updated ${updatedCount} achievements, saving progress...`);
        await storageService.saveUserProgress(userProgress);
      }
      
      // Get achievements summary
      const achievementsSummary = achievementManager.getAchievementsSummary(userProgress);
      console.log('Achievement summary loaded:', {
        total: Object.keys(userProgress.achievements).length,
        completed: achievementsSummary.completed.length,
        inProgress: achievementsSummary.inProgress.length,
        categories: Object.keys(achievementsSummary.byCategory).length
      });
      
      // Get full summary and update with achievement data
      const summary = await gamificationManager.getGamificationSummary();
      if (summary) {
        summary.achievements = achievementsSummary;
      }
      setGamificationSummary(summary);
      
      // Get active challenges
      const active = await gamificationManager.getActiveChallenges();
      setActiveChallenges(active);
      
      // Get claimable challenges
      const claimable = await gamificationManager.getClaimableChallenges();
      setClaimableChallenges(claimable);
      
      console.log('Gamification data loaded:', {
        daily: active.daily.length,
        weekly: active.weekly.length,
        monthly: active.monthly.length,
        special: active.special.length,
        claimable: claimable.length,
        achievements: {
          total: Object.keys(userProgress.achievements).length,
          completed: achievementsSummary.completed.length,
          inProgress: achievementsSummary.inProgress.length,
          categories: Object.keys(achievementsSummary.byCategory).length
        }
      });
      
      // Clear any previously displayed notifications
      setRecentlyUnlockedAchievements([]);
      setRecentlyCompletedChallenges([]);
      setRecentlyUnlockedRewards([]);
    } catch (error) {
      console.error('Error loading gamification data:', error);
    } finally {
      setIsLoading(false);
      setChallengesLoading(false);
    }
  }, []);
  
  // Public function for refreshing data only (no processing)
  const refreshData = useCallback(async () => {
    await loadGamificationData();
  }, [loadGamificationData]);
  
  // Process a routine
  const processRoutine = useCallback(async (routine: ProgressEntry): Promise<RoutineProcessResult> => {
    setIsLoading(true);
    try {
      // Get current user progress for achievement comparison
      const beforeProgress = await storageService.getUserProgress();
      
      // Update achievements before comparison
      await achievementManager.updateAchievements(beforeProgress);
      const beforeAchievements = achievementManager.getAchievementsSummary(beforeProgress);
      
      // Process through the gamification system
      const { userProgress, xpBreakdown, completedChallenges } = await gamificationManager.processCompletedRoutine(routine);
      
      // Update achievements after processing routine
      await achievementManager.updateAchievements(userProgress);
      await storageService.saveUserProgress(userProgress);
      
      // Get level info to check for level up
      const prevLevel = level;
      const levelInfo = await gamificationManager.getUserLevelInfo();
      const levelUp = levelInfo.level > prevLevel;
      
      // Compare achievements to find newly unlocked ones
      const afterAchievements = achievementManager.getAchievementsSummary(userProgress);
      const unlockedAchievements = afterAchievements.completed.filter(
        after => !beforeAchievements.completed.find(before => before.id === after.id)
      );
      
      // Check for newly unlocked rewards due to level up
      const newlyUnlockedRewards: Reward[] = [];
      if (levelUp) {
        // Get rewards that were unlocked due to the level up
        const rewards = Object.values(userProgress.rewards || {});
        newlyUnlockedRewards.push(
          ...rewards.filter(r => r.unlocked && r.levelRequired <= levelInfo.level && r.levelRequired > prevLevel)
        );
      }
      
      console.log(`processRoutine results: XP: ${levelInfo.totalXP - totalXP}, Level: ${prevLevel}->${levelInfo.level}, Achievements: ${unlockedAchievements.length}, Challenges: ${completedChallenges.length}, Rewards: ${newlyUnlockedRewards.length}`);
      
      // Create proper result object
      const result: RoutineProcessResult = {
        success: true,
        xpEarned: levelInfo.totalXP - totalXP,
        levelUp,
        newLevel: levelInfo.level,
        unlockedAchievements,
        completedChallenges: completedChallenges || [], // Use the newly completed challenges from the game engine
        newlyUnlockedRewards,
        xpBreakdown: xpBreakdown || []
      };
      
      // Update state with results
      if (result.xpEarned > 0) {
        setTotalXP(prev => prev + result.xpEarned);
        
        // Emit XP updated event
        gamificationEvents.emit(XP_UPDATED_EVENT, {
          previousXP: totalXP,
          newXP: totalXP + result.xpEarned,
          xpEarned: result.xpEarned,
          source: 'routine'
        });
      }
      
      if (result.levelUp) {
        console.log('Level up detected in useGamification.processRoutine!');
        setLevel(result.newLevel);
        
        // Play level up sound
        soundEffects.playLevelUpSound();
        
        // Emit level up event to notify other components
        gamificationEvents.emit(LEVEL_UP_EVENT, {
          oldLevel: prevLevel,
          newLevel: result.newLevel
        });
        
        // If rewards were unlocked, emit reward unlocked event
        if (result.newlyUnlockedRewards && result.newlyUnlockedRewards.length > 0) {
          gamificationEvents.emit(REWARD_UNLOCKED_EVENT, result.newlyUnlockedRewards);
        }
      }
      
      // If challenges were completed, emit challenge completed event
      if (completedChallenges && completedChallenges.length > 0) {
        console.log(`Emitting CHALLENGE_COMPLETED_EVENT for ${completedChallenges.length} challenges`);
        gamificationEvents.emit(CHALLENGE_COMPLETED_EVENT, completedChallenges);
      }
      
      // Set notifications for UI
      setRecentlyUnlockedAchievements(unlockedAchievements);
      setRecentlyCompletedChallenges(completedChallenges || []);
      setRecentlyUnlockedRewards(result.newlyUnlockedRewards);
      
      // Refresh all data
      await loadGamificationData();
      
      return result;
    } catch (error) {
      console.error('Error processing routine:', error);
      return {
        success: false,
        xpEarned: 0,
        levelUp: false,
        newLevel: level,
        unlockedAchievements: [],
        completedChallenges: [],
        newlyUnlockedRewards: [],
        xpBreakdown: []
      };
    } finally {
      setIsLoading(false);
    }
  }, [loadGamificationData, level, totalXP]);
  
  // Claim a completed challenge
  const claimChallenge = useCallback(async (challengeId: string): Promise<ChallengeClaimResult> => {
    setIsLoading(true);
    try {
      // Get the challenge information first to include it in notifications
      const userProgress = await storageService.getUserProgress();
      const challenge = userProgress.challenges[challengeId];
      const challengeTitle = challenge?.title || 'Unknown Challenge';
      const oldLevel = level; // Store current level to detect level-up
      
      // Claim the challenge
      const result = await gamificationManager.claimChallenge(challengeId);
      
      if (result.success) {
        // Update XP
        if (result.xpEarned > 0) {
          setTotalXP(prev => prev + result.xpEarned);
          
          // Emit XP updated event with challenge details and boost information
          gamificationEvents.emit(XP_UPDATED_EVENT, {
            previousXP: totalXP,
            newXP: totalXP + result.xpEarned,
            xpEarned: result.xpEarned,
            originalXp: result.originalXp, // Include original XP before boost
            xpBoostApplied: result.xpBoostApplied, // Whether boost was applied
            source: 'challenge',
            details: `From ${challengeTitle} challenge${result.xpBoostApplied ? ' (2x XP Boost)' : ''}`
          });
        }
        
        // Update level if needed
        if (result.levelUp) {
          setLevel(result.newLevel);
          
          // Play level up sound
          soundEffects.playLevelUpSound();
          
          // Emit level up event with detailed challenge source information
          gamificationEvents.emit(LEVEL_UP_EVENT, {
            oldLevel: oldLevel,
            newLevel: result.newLevel,
            source: 'challenge',
            details: `From claiming ${challengeTitle} challenge`,
            challengeId: challengeId,
            challengeTitle: challengeTitle,
            xpEarned: result.xpEarned,
            originalXp: result.originalXp,
            xpBoostApplied: result.xpBoostApplied
          });
          
          console.log(`Level up triggered by challenge ${challengeTitle} - Level ${oldLevel} to ${result.newLevel}`);
        }
        
        // Refresh data
        await loadGamificationData();
        
        return {
          success: true,
          message: result.message || 'Challenge claimed successfully',
          xpEarned: result.xpEarned,
          originalXp: result.originalXp,
          xpBoostApplied: result.xpBoostApplied,
          levelUp: result.levelUp,
          newLevel: result.newLevel
        };
      }
      
      return {
        success: false,
        message: result.message || 'Failed to claim challenge',
        xpEarned: 0,
        originalXp: 0,
        xpBoostApplied: false,
        levelUp: false,
        newLevel: level
      };
    } catch (error) {
      console.error('Error claiming challenge:', error);
      return {
        success: false,
        message: 'Error claiming challenge',
        xpEarned: 0,
        originalXp: 0,
        xpBoostApplied: false,
        levelUp: false,
        newLevel: level
      };
    } finally {
      setIsLoading(false);
    }
  }, [loadGamificationData, level, totalXP]);
  
  // Check if a feature is unlocked
  const isFeatureUnlocked = useCallback(async (featureId: string): Promise<boolean> => {
    try {
      // For level-gated features without a specific reward
      const levelInfo = await gamificationManager.getUserLevelInfo();
      
      // Check level requirements first
      if (featureId === 'custom_routines' && levelInfo.level >= 4) {
        return true;
      }
      if (featureId === 'dark_mode' && levelInfo.level >= 2) {
        return true;
      }
      if (featureId === 'detailed_stats' && levelInfo.level >= 3) {
        return true;
      }
      
      // Otherwise check for specific reward
      const userProgress = await storageService.getUserProgress();
      const reward = userProgress.rewards[featureId];
      return reward ? reward.unlocked : false;
    } catch (error) {
      console.error('Error checking if feature is unlocked:', error);
      return false;
    }
  }, []);
  
  // Dismiss notifications
  const dismissNotifications = useCallback(() => {
    setRecentlyUnlockedAchievements([]);
    setRecentlyCompletedChallenges([]);
    setRecentlyUnlockedRewards([]);
  }, []);
  
  // Reset all gamification data for testing
  const resetAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Initialize new user progress
      await gamificationManager.initializeUserProgress();
      
      // Reload data
      await loadGamificationData();
      
      return true;
    } catch (error) {
      console.error('Error resetting gamification data:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [loadGamificationData]);
  
  // Handle streak reset - resets all streak-related challenges and achievements
  const handleStreakReset = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await gamificationManager.handleStreakReset();
      await loadGamificationData();
      return {
        success: true,
        message: 'Streak challenges and achievements reset successfully'
      };
    } catch (error) {
      console.error('Error resetting streak challenges:', error);
      return {
        success: false,
        message: 'Error resetting streak challenges'
      };
    } finally {
      setIsLoading(false);
    }
  }, [loadGamificationData]);

  // Reset streak achievements only
  const resetStreakAchievements = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await gamificationManager.resetStreakAchievements();
      await loadGamificationData();
      return {
        success: true,
        message: 'Streak achievements reset successfully'
      };
    } catch (error) {
      console.error('Error resetting streak achievements:', error);
      return {
        success: false,
        message: 'Error resetting streak achievements'
      };
    } finally {
      setIsLoading(false);
    }
  }, [loadGamificationData]);
  
  // Add XP directly
  const addXp = useCallback(async (amount: number, source: string, details?: string) => {
    setIsLoading(true);
    try {
      // Correct function name to match what's available in gamificationManager
      // First, get the latest user progress
      const userProgress = await storageService.getUserProgress();
      
      // Then add XP manually
      userProgress.totalXP += amount;
      await storageService.saveUserProgress(userProgress);
      
      // Update state with results
      if (amount > 0) {
        setTotalXP(prev => prev + amount);
        
        // Emit XP updated event with improved details
        gamificationEvents.emit(XP_UPDATED_EVENT, {
          previousXP: totalXP,
          newXP: totalXP + amount,
          xpEarned: amount,
          source: source || 'manual',
          details: details || `From ${source || 'manual action'}`
        });
      }
      
      // Check if level up occurred
      const newLevelInfo = await gamificationManager.getUserLevelInfo();
      const levelUp = newLevelInfo.level > level;
      
      if (levelUp) {
        setLevel(newLevelInfo.level);
        
        // Play level up sound
        soundEffects.playLevelUpSound();
        
        // Emit level up event with source information
        gamificationEvents.emit(LEVEL_UP_EVENT, {
          oldLevel: level,
          newLevel: newLevelInfo.level,
          source: source || 'manual' // Include the source of the XP that caused the level up
        });
      }
      
      // Refresh all data
      await loadGamificationData();
      
      return {
        success: true,
        xpEarned: amount,
        levelUp,
        newLevel: newLevelInfo.level
      };
    } catch (error) {
      console.error('Error adding XP:', error);
      return {
        success: false,
        xpEarned: 0,
        levelUp: false,
        newLevel: level
      };
    } finally {
      setIsLoading(false);
    }
  }, [loadGamificationData, level, totalXP]);
  
  // Get all active challenges
  const getActiveChallenges = useCallback(async (): Promise<Record<string, Challenge[]>> => {
    try {
      const challenges = await gamificationManager.getActiveChallenges();
      setActiveChallenges(challenges);
      return challenges;
    } catch (error) {
      console.error('Error getting active challenges:', error);
      return {
        daily: [],
        weekly: [],
        monthly: [],
        special: []
      };
    }
  }, []);
  
  // Get all claimable challenges
  const getClaimableChallenges = useCallback(async (): Promise<Challenge[]> => {
    try {
      const challenges = await gamificationManager.getClaimableChallenges();
      setClaimableChallenges(challenges);
      return challenges;
    } catch (error) {
      console.error('Error getting claimable challenges:', error);
      return [];
    }
  }, []);
  
  // Get time remaining for claiming a challenge
  const getTimeRemainingForChallenge = useCallback((challenge: Challenge): number => {
    const now = new Date();
    
    if (!challenge.dateCompleted) {
      // Challenge not completed yet, return end date time
      const endDate = new Date(challenge.endDate);
      return Math.max(0, endDate.getTime() - now.getTime());
    }
    
    // Challenge completed, calculate redemption period
    const completedDate = new Date(challenge.dateCompleted);
    const redemptionMs = (
      challenge.category === 'daily' ? 24 :
      challenge.category === 'weekly' ? 72 :
      challenge.category === 'monthly' ? 168 : 
      336 // special
    ) * 60 * 60 * 1000;
    
    return Math.max(0, (completedDate.getTime() + redemptionMs) - now.getTime());
  }, []);
  
  // Format time remaining in human-readable format
  const formatTimeRemaining = useCallback((milliseconds: number): string => {
    if (milliseconds <= 0) return 'Expired';
    
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return 'Less than 1m';
    }
  }, []);
  
  // Refresh challenges specifically
  const refreshChallenges = useCallback(async (): Promise<void> => {
    setChallengesLoading(true);
    try {
      console.log('Refreshing challenges in useGamification...');
      
      // Get the current user progress
      const userProgress = await storageService.getUserProgress();
      
      // Initialize streak if needed and get current status
      if (!streakManager.streakCache.initialized) {
        await streakManager.initializeStreak();
      }
      const streakStatus = await streakManager.getStreakStatus();
      
      console.log('STREAK STATUS in refreshChallenges:', {
        currentStreak: streakStatus.currentStreak,
        maintainedToday: streakStatus.maintainedToday,
        freezesAvailable: streakStatus.freezesAvailable,
        lastUpdated: userProgress.statistics.lastUpdated
      });
      
      // Look specifically for streak challenges before refresh
      const streakChallengesBefore = Object.values(userProgress.challenges)
        .filter(c => c.type === 'streak' && !c.completed);
      
      if (streakChallengesBefore.length > 0) {
        console.log('STREAK CHALLENGES BEFORE REFRESH:', 
          streakChallengesBefore.map(c => ({
            title: c.title,
            progress: c.progress,
            requirement: c.requirement,
            status: c.status
          }))
        );
      }
      
      // Refresh challenges
      await gamificationManager.refreshChallenges(userProgress);
      
      // Get fresh user progress to see changes
      const updatedProgress = await storageService.getUserProgress();
      
      // Look for streak challenges after refresh
      const streakChallengesAfter = Object.values(updatedProgress.challenges)
        .filter(c => c.type === 'streak' && !c.completed);
      
      if (streakChallengesAfter.length > 0) {
        console.log('STREAK CHALLENGES AFTER REFRESH:', 
          streakChallengesAfter.map(c => ({
            title: c.title,
            progress: c.progress,
            requirement: c.requirement,
            status: c.status
          }))
        );
      }
      
      // Clear existing challenges first to avoid overlap
      setActiveChallenges({
        daily: [],
        weekly: [],
        monthly: [],
        special: []
      });
      
      // Update the challenge states - get fresh data
      const active = await gamificationManager.getActiveChallenges();
      
      console.log('Active challenges after refresh:', {
        daily: (active.daily || []).length,
        weekly: (active.weekly || []).length,
        monthly: (active.monthly || []).length,
        special: (active.special || []).length
      });
      
      // Update state with new challenge data
      setActiveChallenges(active);
      
      // Get claimable challenges separately
      const claimable = await gamificationManager.getClaimableChallenges();
      setClaimableChallenges(claimable);
      
      console.log(`Found ${claimable.length} claimable challenges`);
    } catch (error) {
      console.error('Error refreshing challenges:', error);
    } finally {
      setChallengesLoading(false);
    }
  }, []);
  
  // Get challenge by ID
  const getChallengeById = useCallback(async (challengeId: string): Promise<Challenge | null> => {
    try {
      const userProgress = await storageService.getUserProgress();
      return userProgress.challenges[challengeId] || null;
    } catch (error) {
      console.error('Error getting challenge by ID:', error);
      return null;
    }
  }, []);
  
  // Check if user has challenges expiring soon (for notifications)
  const hasExpiringChallenges = useCallback((): { count: number, urgent: boolean } => {
    const urgentExpiryThreshold = 2 * 60 * 60 * 1000; // 2 hours
    const warningExpiryThreshold = 12 * 60 * 60 * 1000; // 12 hours
    
    let expiringCount = 0;
    let urgentCount = 0;
    
    // Check all claimable challenges
    claimableChallenges.forEach(challenge => {
      const timeRemaining = getTimeRemainingForChallenge(challenge);
      
      if (timeRemaining <= warningExpiryThreshold) {
        expiringCount++;
        
        if (timeRemaining <= urgentExpiryThreshold) {
          urgentCount++;
        }
      }
    });
    
    return {
      count: expiringCount,
      urgent: urgentCount > 0
    };
  }, [claimableChallenges, getTimeRemainingForChallenge]);
  
  return {
    // State
    isLoading,
    level,
    totalXP,
    xpToNextLevel,
    percentToNextLevel,
    recentlyUnlockedAchievements,
    recentlyCompletedChallenges,
    recentlyUnlockedRewards,
    claimableChallenges,
    activeChallenges,
    challengesLoading,
    gamificationSummary,
    
    // Actions
    processRoutine,
    claimChallenge,
    isFeatureUnlocked,
    dismissNotifications,
    refreshData,
    resetAllData,
    addXp,
    handleStreakReset,
    resetStreakAchievements,
    
    // New challenge-related functions
    getActiveChallenges,
    getClaimableChallenges,
    getTimeRemainingForChallenge,
    formatTimeRemaining,
    refreshChallenges,
    getChallengeById,
    hasExpiringChallenges
  };
} 