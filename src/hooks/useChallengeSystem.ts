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
  
  // Refresh challenges and check for expirations
  const refreshChallenges = useCallback(async () => {
    try {
      // Handle expired challenges and check for challenges about to expire
      await challengeManager.handleExpiredChallenges();
      await challengeManager.checkExpiringChallenges();
      
      // Reload active challenges
      await loadActiveChallenges();
    } catch (error) {
      console.error('Error refreshing challenges:', error);
    }
  }, [loadActiveChallenges]);

  // Generate new challenges
  const generateNewChallenges = useCallback(async () => {
    setLoading(true);
    try {
      await challengeManager.generateChallenges('all');
      await loadActiveChallenges();
      
      return { success: true };
    } catch (error) {
      console.error('Error generating challenges:', error);
      return { success: false, message: 'Failed to generate challenges' };
    } finally {
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
    // This function will be called after completing a routine
    // It leverages the gamification system which now handles challenge updates
    refreshData();
  }, [refreshData]);

  // Load challenges on first render
  useEffect(() => {
    loadActiveChallenges();
  }, [loadActiveChallenges]);

  return {
    activeChallenges,
    loading,
    generateNewChallenges,
    claimChallenge,
    updateChallengeProgress,
    refreshChallenges
  };
}; 