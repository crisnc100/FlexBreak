/**
 * flexbreak Gamification System
 * ------------------------------
 * This module contains the gamification components for flexbreak:
 * - XP System
 * - Achievements
 * - Challenges
 * - Rewards
 * - Progress Tracking
 */

// Re-export from new files for backward compatibility
export * from './types';
// Re-export selectively to avoid duplications
import { 
  processCompletedRoutine,
  initializeUserProgress
} from './gameEngine';
export {
  processCompletedRoutine,
  initializeUserProgress
};
export * from './modules/rewardManager';
export * from './modules/challengeManager';

// Import and re-export from storageService for accessing user data
import * as storageService from '../../services/storageService';

// Console warning about migration
console.warn(
  'WARNING: The progress system has been migrated. Please use the useGamification hook instead of direct imports from utils/progress.'
);

// Create stub implementations for backward compatibility
// These are temporary and will be removed after all components are migrated

// XP system stubs
export const xp = {
  getLevelData: (level: number) => {
    console.warn('Deprecated: Use useGamification().gamificationSummary instead');
    // Import LEVELS from constants
    const { LEVELS } = require('./constants');
    // Find the appropriate level data or use a default
    if (level <= LEVELS.length) {
      return { 
        level, 
        title: LEVELS[level-1].title || `Level ${level}`,
        xpRequired: LEVELS[level-1].xpRequired 
      };
    }
    // For levels beyond the defined array
    return { 
      level, 
      title: `Level ${level}`,
      xpRequired: LEVELS[LEVELS.length-1].xpRequired + 1000 * (level - LEVELS.length)
    };
  }
};

// Achievements system stubs
export const achievements = {
  getAchievements: async () => {
    console.warn('Deprecated: Use useGamification().gamificationSummary.achievements instead');
    return [];
  },
  updateAchievements: async (userProgress: any) => {
    console.warn('Deprecated: Use useGamification().processRoutine() instead');
    return { progress: userProgress, unlockedAchievements: [] };
  },
  getCompletedAchievements: async () => {
    console.warn('Deprecated: Use useGamification().gamificationSummary.achievements.completed instead');
    return [];
  }
};

// Challenges system stubs
export const challenges = {
  getChallenges: async () => {
    console.warn('Deprecated: Use useGamification().gamificationSummary.challenges instead');
    return [];
  },
  updateChallenges: async (routines: any[], userProgress: any) => {
    console.warn('Deprecated: Use useGamification().processRoutine() instead');
    return { progress: userProgress, updatedChallenges: [] };
  },
  claimChallenge: async (challengeId: string) => {
    console.warn('Deprecated: Use useGamification().claimChallenge() instead');
    return { success: false, message: 'Using deprecated API', xpEarned: 0 };
  },
  generateChallenges: async (userProgress: any) => {
    console.warn('Deprecated: Use useGamification().refreshData() instead');
    return userProgress;
  },
  refreshExpiredChallenges: async (userProgress: any) => {
    console.warn('Deprecated: Use useGamification().refreshData() instead');
    return userProgress;
  }
};

// Statistics system stubs
export const statistics = {
  updateStats: async (routine: any, userProgress: any) => {
    console.warn('Deprecated: Use useGamification().processRoutine() instead');
    return userProgress;
  },
  getStreak: async () => {
    console.warn('Deprecated: Use useGamification().gamificationSummary.statistics instead');
    return { current: 0, best: 0 };
  }
};

// Rewards system stubs
export const rewards = {
  getRewards: async () => {
    console.warn('Deprecated: Use useGamification().gamificationSummary.rewards instead');
    return [];
  },
  isFeatureUnlocked: async (featureId: string) => {
    console.warn('Deprecated: Use useGamification().isFeatureUnlocked() instead');
    return false;
  }
};

// Tracker stubs
export const tracker = {
  logRoutineCompleted: async (routine: any) => {
    console.warn('Deprecated: Use useGamification().processRoutine() instead');
  }
};

// Challenge tracker stubs
export const challengeTracker = {
  updateChallengeProgress: async (routines: any[], userProgress: any) => {
    console.warn('Deprecated: Use useGamification().processRoutine() instead');
    return userProgress;
  }
};

// Export a simple checkRewards function for backward compatibility
export const checkRewards = async (progress: any): Promise<any> => {
  console.warn('Deprecated: Use useGamification().gamificationSummary.rewards instead');
  return progress;
};

// Types stubs
export const types = {
  // Use a simple object instead of trying to use the actual type
  UserProgress: {} as any
};
