import { useState, useEffect, useCallback } from 'react';
import * as challengeManager from '../utils/progress/challengeManager';
import { Challenge } from '../utils/progress/types';
import { useGamification } from './useGamification';
import * as storageService from '../services/storageService';

export const useChallengeSystem = () => {
  const [loading, setLoading] = useState(true);
  const [activeChallenges, setActiveChallenges] = useState<{
    daily: Challenge[];
    weekly: Challenge[];
    monthly: Challenge[];
    special: Challenge[];
  }>({
    daily: [],
    weekly: [],
    monthly: [],
    special: []
  });
  
  const { refreshData } = useGamification();

  // Load active challenges
  const loadActiveChallenges = useCallback(async () => {
    setLoading(true);
    try {
      const challenges = await challengeManager.getActiveChallenges();
      setActiveChallenges(challenges);
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Modified refreshChallenges function to focus on updating progress rather than generating new challenges
  const refreshChallenges = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Refreshing challenges and updating progress...');
      
      // First synchronize routine counts with challenge progress
      console.log('Synchronizing routine counts with challenge progress');
      await syncChallengeProgress();
      
      // Then check for expiring challenges
      await challengeManager.checkExpiringChallenges();
      
      // Force update daily challenges based on completed routines
      await challengeManager.forceUpdateDailyChallengesWithRoutines();
      
      // Reload active challenges
      await loadActiveChallenges();
      
      console.log('Challenge refresh complete');
      setLoading(false);
    } catch (error) {
      console.error('Error refreshing challenges:', error);
      setLoading(false);
    }
  }, [loadActiveChallenges]);

  // Claim a challenge reward
  const claimChallenge = useCallback(async (challengeId: string) => {
    console.log(`Attempting to claim challenge: ${challengeId}`);
    try {
      // CRITICAL FIX: First, ensure all daily challenges are properly updated
      // This ensures the challenge is marked as completed if routines were done
      await challengeManager.forceUpdateDailyChallengesWithRoutines();
      
      // Now attempt the claim - it should work if routines have been completed
      const result = await challengeManager.claimChallenge(challengeId);
      console.log(`Claim result:`, result);
      
      // Reload active challenges if successful
      if (result.success) {
        await loadActiveChallenges();
      }
      
      return {
        success: result.success,
        xpEarned: result.xpEarned,
        message: result.message
      };
    } catch (error) {
      console.error('Error claiming challenge:', error);
      return {
        success: false,
        xpEarned: 0,
        message: 'An error occurred while claiming the challenge'
      };
    }
  }, [loadActiveChallenges]);
  
  // Update challenge progress
  const updateChallengeProgress = useCallback(() => {
    console.log('Updating challenge progress after routine completion');
    
    // Refresh gamification data
    refreshData();
    
    // Also force-update challenges to ensure progress is tracked
    challengeManager.forceUpdateDailyChallengesWithRoutines()
      .then(() => {
        console.log('Challenges updated after routine completion');
        loadActiveChallenges();
      })
      .catch(error => {
        console.error('Error updating challenges after routine:', error);
      });
  }, [refreshData, loadActiveChallenges]);

  // Load challenges on first render
  useEffect(() => {
    loadActiveChallenges();
  }, [loadActiveChallenges]);

  // Add a new function to sync challenge progress with actual routine counts
  const syncChallengeProgress = async () => {
    try {
      console.log('Starting challenge progress synchronization');
      
      // Get all routines
      const allRoutines = await storageService.getAllRoutines();
      console.log(`Found ${allRoutines.length} total routines for progress sync`);
      
      // Calculate time periods
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Count routines for today
      const todayRoutines = allRoutines.filter(routine => {
        const routineDate = new Date(routine.date).toISOString().split('T')[0];
        return routineDate === today;
      });
      
      // Count routines for this week
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);
      
      const weekRoutines = allRoutines.filter(routine => {
        const routineDate = new Date(routine.date);
        return routineDate >= startOfWeek;
      });
      
      // Count routines for this month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthRoutines = allRoutines.filter(routine => {
        const routineDate = new Date(routine.date);
        return routineDate >= startOfMonth;
      });
      
      console.log(`Routine counts - Today: ${todayRoutines.length}, Week: ${weekRoutines.length}, Month: ${monthRoutines.length}`);
      
      // Get current user progress
      const userProgress = await storageService.getUserProgress();
      let hasUpdates = false;
      
      // Update daily routine challenges
      Object.values(userProgress.challenges).forEach(challenge => {
        if (challenge.category === 'daily' && 
            challenge.type === 'routine_count' && 
            !challenge.claimed &&
            new Date(challenge.endDate) > now) {
          
          const correctProgress = Math.min(todayRoutines.length, challenge.requirement);
          if (challenge.progress !== correctProgress) {
            console.log(`Fixing daily challenge "${challenge.title}" progress: ${challenge.progress} → ${correctProgress}`);
            userProgress.challenges[challenge.id].progress = correctProgress;
            hasUpdates = true;
          }
          
          // Mark as completed if progress meets requirement
          if (correctProgress >= challenge.requirement && !challenge.completed) {
            console.log(`Marking daily challenge "${challenge.title}" as completed`);
            userProgress.challenges[challenge.id].completed = true;
            hasUpdates = true;
          }
        }
      });
      
      // Update weekly routine challenges
      Object.values(userProgress.challenges).forEach(challenge => {
        if (challenge.category === 'weekly' && 
            challenge.type === 'routine_count' && 
            !challenge.claimed &&
            new Date(challenge.endDate) > now) {
          
          const correctProgress = Math.min(weekRoutines.length, challenge.requirement);
          if (challenge.progress !== correctProgress) {
            console.log(`Fixing weekly challenge "${challenge.title}" progress: ${challenge.progress} → ${correctProgress}`);
            userProgress.challenges[challenge.id].progress = correctProgress;
            hasUpdates = true;
          }
          
          // Mark as completed if progress meets requirement
          if (correctProgress >= challenge.requirement && !challenge.completed) {
            console.log(`Marking weekly challenge "${challenge.title}" as completed`);
            userProgress.challenges[challenge.id].completed = true;
            hasUpdates = true;
          }
        }
      });
      
      // Update monthly routine challenges
      Object.values(userProgress.challenges).forEach(challenge => {
        if (challenge.category === 'monthly' && 
            challenge.type === 'routine_count' && 
            !challenge.claimed &&
            new Date(challenge.endDate) > now) {
          
          const correctProgress = Math.min(monthRoutines.length, challenge.requirement);
          if (challenge.progress !== correctProgress) {
            console.log(`Fixing monthly challenge "${challenge.title}" progress: ${challenge.progress} → ${correctProgress}`);
            userProgress.challenges[challenge.id].progress = correctProgress;
            hasUpdates = true;
          }
          
          // Mark as completed if progress meets requirement
          if (correctProgress >= challenge.requirement && !challenge.completed) {
            console.log(`Marking monthly challenge "${challenge.title}" as completed`);
            userProgress.challenges[challenge.id].completed = true;
            hasUpdates = true;
          }
        }
      });
      
      // Save changes if any were made
      if (hasUpdates) {
        console.log('Saving updated challenge progress after synchronization');
        await storageService.saveUserProgress(userProgress);
      } else {
        console.log('No challenge progress updates needed');
      }
      
      return userProgress;
    } catch (error) {
      console.error('Error synchronizing challenge progress:', error);
      return await storageService.getUserProgress();
    }
  };

  return {
    activeChallenges,
    loading,
    claimChallenge,
    updateChallengeProgress,
    refreshChallenges
  };
}; 