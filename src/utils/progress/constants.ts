import { UserProgress } from './types';

/**
 * Initial user progress structure
 * Used when creating a new user or resetting progress
 */
export const INITIAL_USER_PROGRESS: UserProgress = {
  totalXP: 0,
  level: 1,
  statistics: {
    totalRoutines: 0,
    totalMinutes: 0,
    currentStreak: 0,
    bestStreak: 0,
    uniqueAreas: [],
    routinesByArea: {},
    lastUpdated: new Date().toISOString()
  },
  achievements: {},
  challenges: {},
  rewards: {},
  xpHistory: [],
  lastUpdated: new Date().toISOString()
}; 