

import { useMemo } from 'react';
import { useGamification } from './useGamification';

export const useChallengeSystem = () => {
  const gamification = useGamification();
  
  console.warn(
    'useChallengeSystem is deprecated. Use useGamification() directly instead. ' +
    'This hook will be removed in a future update.'
  );
  
  // Provide a compatibility layer for existing components
  return useMemo(() => ({
    // Map to new structure
    activeChallenges: {
      daily: gamification.activeChallenges.daily || [],
      weekly: gamification.activeChallenges.weekly || [],
      monthly: gamification.activeChallenges.monthly || [],
      special: gamification.activeChallenges.special || [],
      completed: {
    daily: [],
    weekly: [],
    monthly: [],
    special: []
      },
      claimable: gamification.claimableChallenges || []
    },
    
    // Pass-through functions
    loading: gamification.challengesLoading,
    isClaimingChallenge: gamification.isLoading,
    
    // Functions mapped to useGamification
    refreshChallenges: async (category?: string) => {
      await gamification.refreshChallenges();
      return {
        daily: gamification.activeChallenges.daily || [],
        weekly: gamification.activeChallenges.weekly || [],
        monthly: gamification.activeChallenges.monthly || [],
        special: gamification.activeChallenges.special || []
      };
    },
    
    preloadChallengesForTab: async () => {
      await gamification.refreshChallenges();
    },
    
    claimChallenge: gamification.claimChallenge,
    
    updateChallengeProgress: async () => {
      await gamification.refreshChallenges();
    },
    
    syncChallengeProgress: async () => {
      await gamification.refreshData();
    }
  }), [gamification]);
}; 