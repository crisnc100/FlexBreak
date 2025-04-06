import { ProgressEntry } from '../../types';

export type { ProgressEntry };

// Challenge status enum
export enum CHALLENGE_STATUS {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CLAIMED = 'claimed',
  EXPIRED = 'expired'
}

// Interface for achievement objects
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: number;
  progress: number;
  completed: boolean;
  xp: number;
  category: string;
  uiCategory?: string; // UI categorization: beginner, intermediate, advanced, elite
  type: string;
  area?: string;
  dateCompleted?: string;
}

// Interface for challenge objects
export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  requirement: number;
  requirementData?: {
    area?: string;
    time?: string;
    [key: string]: any;
  };
  progress: number;
  xp: number;
  completed: boolean;
  claimed: boolean;
  startDate: string;
  endDate: string;
  dateCompleted?: string;
  dateClaimed?: string;
  expiryDate?: string;
  expiryWarning?: boolean;
  status: CHALLENGE_STATUS;
  lastResetDate?: string; // When challenge was last reset
  history?: ChallengeHistory[]; // Record of previous completions
  timeRange?: { start: number; end: number };
  area?: string;
  areaTarget?: string;
  data?: Record<string, any>; // For storing additional tracking information
  failureReason?: string; // Reason why the challenge failed, if applicable
  lastUpdated: string;
  lastDailyChallengeCheck?: string; // Added for challenge management
  xpHistory?: XpHistoryEntry[];  // Optional for backward compatibility
  hasReceivedWelcomeBonus?: boolean; // Flag to track if user has received the first-time welcome bonus
}

// Interface for challenge history records
export interface ChallengeHistory {
  completedDate: string;
  claimedDate?: string;
  xpEarned: number;
  originalXp?: number;  // Original XP before any boosts were applied
  xpBoostApplied?: boolean;  // Whether XP boost was active when claimed
}

// Interface for reward objects
export interface Reward {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  levelRequired: number;
  type: string;
  uses?: number; // Number of uses available (for streak freezes)
  lastRefill?: string; // Date of last refill (for streak freezes)
  lastUsed?: string; // Date when last used (for streak freezes)
}

// Interface for level objects
export interface Level {
  level: number;
  xpRequired: number;
  title: string;
}

// Interface for XP breakdown
export interface XpBreakdown {
  base?: number;
  streak?: number;
  newArea?: number;
  consecutive?: number;
  other?: number;
  [key: string]: number | undefined;
}

// Interface for routine XP calculation result
export interface RoutineXpResult {
  xp: number;
  breakdown: XpBreakdown;
}

// Interface for XP history entry
export interface XpHistoryEntry {
  id: string;
  amount: number;
  source: string;
  timestamp: string;
  details?: string;
  claimed: boolean;
}

// Interface for the complete user progress object
export interface UserProgress {
  totalXP: number;
  level: number;
  achievements: Record<string, Achievement>;
  challenges: Record<string, Challenge>;
  rewards: Record<string, Reward>;
  statistics: {
    totalRoutines: number;
    currentStreak: number;
    bestStreak: number;
    uniqueAreas: string[];
    routinesByArea: Record<string, number>;
    lastUpdated: string;
    totalMinutes?: number;  // Make this optional for backward compatibility
  };
  lastUpdated: string;
  lastDailyChallengeCheck?: string; // Added for challenge management
  xpHistory?: XpHistoryEntry[];  // Optional for backward compatibility
  hasReceivedWelcomeBonus?: boolean; // Flag to track if user has received the first-time welcome bonus
}

// Interface for progress update result
export interface ProgressUpdateResult {
  progress: UserProgress;
  xpEarned: number;
  unlockedAchievements: Achievement[];
}

// Interface for XP add result
export interface XpAddResult {
  previousTotal: number;
  newTotal: number;
  previousLevel: number;
  newLevel: number;
  levelUp: boolean;
  amount: number;
  progress: UserProgress;
}

// Interface for challenge update result
export interface ChallengeUpdateResult {
  progress: UserProgress;
  updatedChallenges: Challenge[];
}

// Interface for challenge claim result
export interface ChallengeClaimResult {
  success: boolean;
  message: string;
  progress: UserProgress;
  xpEarned: number;
  originalXp?: number;  // Original XP before any boosts were applied
  xpBoostApplied?: boolean;  // Whether XP boost was active when claimed
  xpReduction?: boolean; // Indicates if XP was reduced due to expiration
}

// Interface for XP summary items
export interface XpSummaryItem {
  source: string;
  totalXp: number;
  count: number;
}

// Interface for streak bonus
export interface StreakBonus {
  days: number;
  xpBonus: number;
}

// Interface for achievement category
export interface AchievementCategory {
  id: string;
  name: string;
  description: string;
  achievements: Achievement[];
} 