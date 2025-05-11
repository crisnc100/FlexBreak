import { UserProgress, Achievement, Challenge, Reward, Level } from './types';
import CORE_ACHIEVEMENTS from '../../data/achievements.json';
import CORE_CHALLENGES_DATA from '../../data/challenges.json';
import CORE_REWARDS from '../../data/rewards.json';

// Challenge categories
export const CHALLENGE_CATEGORIES = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  SPECIAL: 'special'
} as const;

// Typed challenge data - using a type assertion because the JSON doesn't exactly match our Challenge type
// This is fine because the Challenge interface extends what's in the JSON, adding runtime properties
export const CORE_CHALLENGES = CORE_CHALLENGES_DATA as unknown as Record<string, any[]>;

// Redemption periods (hours)
export const REDEMPTION_PERIODS = {
  daily: 24,
  weekly: 72,
  monthly: 168,
  special: 336,
} as const;

// Challenge count limits per category
export const CHALLENGE_LIMITS = {
  daily: 2,    // 2 daily challenges
  weekly: 2,   // 2 weekly challenges
  monthly: 2,  // 1 monthly challenge
  special: 1   // 1 special challenge
} as const;

// Daily limits for challenge claims
export const DAILY_LIMITS = { 
  MAX_CHALLENGES: 3, 
  MAX_XP: 150 
} as const;

// Initial User Progress
export const INITIAL_USER_PROGRESS: UserProgress = {
  totalXP: 0,
  level: 1,
  statistics: {
    totalRoutines: 0,
    currentStreak: 0,
    bestStreak: 0,
    uniqueAreas: [],
    totalMinutes: 0,
    routinesByArea: {},
    lastUpdated: new Date().toISOString()
  },
  challenges: {},
  achievements: {},
  rewards: {},
  lastDailyChallengeCheck: undefined,
  lastUpdated: new Date().toISOString(),
  hasReceivedWelcomeBonus: false,
};

// Levels
export const LEVELS: Level[] = [
  { level: 1, xpRequired: 0, title: 'Beginner' },
  { level: 2, xpRequired: 250, title: 'Rookie' },
  { level: 3, xpRequired: 500, title: 'Amateur' },
  { level: 4, xpRequired: 750, title: 'Enthusiast' },
  { level: 5, xpRequired: 1200, title: 'Committed' },
  { level: 6, xpRequired: 1800, title: 'Dedicated' },
  { level: 7, xpRequired: 2500, title: 'Pro' },
  { level: 8, xpRequired: 3200, title: 'Expert' },
  { level: 9, xpRequired: 4000, title: 'Master' },
  { level: 10, xpRequired: 5000, title: 'Guru' },
];

// Export static data
export { CORE_ACHIEVEMENTS, CORE_REWARDS };