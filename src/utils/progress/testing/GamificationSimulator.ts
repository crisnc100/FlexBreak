/**
 * GamificationSimulator.ts
 * 
 * A tool for simulating day-by-day progression through the gamification system.
 * This allows testing of various aspects of the system like:
 * - Challenge cycles (daily, weekly, monthly)
 * - Streak calculations and rewards
 * - Level progression
 * - Achievement unlocking
 * - Reward unlocking based on level
 */

import { UserProgress, Challenge, Achievement, Reward, ProgressEntry } from '../types';
import * as storageService from '../../../services/storageService';
import * as gamificationManager from '../gameEngine';
import * as challengeManager from '../modules/challengeManager';
import * as achievementManager from '../modules/achievementManager';
import * as rewardManager from '../modules/rewardManager';
import * as levelManager from '../modules/levelManager';
import * as xpBoostManager from '../modules/xpBoostManager';
import * as streakFreezeManager from '../modules/streakFreezeManager';
import * as dateUtils from '../modules/utils/dateUtils';
import * as cacheUtils from '../modules/utils/cacheUtils';

// Store original date implementation to restore later
const OriginalDate = global.Date;

/**
 * Deep clone function to replace structuredClone for better compatibility
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as unknown as T;
  }
  
  const cloned = {} as T;
  Object.keys(obj as object).forEach(key => {
    (cloned as any)[key] = deepClone((obj as any)[key]);
  });
  
  return cloned;
}

/**
 * Class to simulate the gamification system with time manipulation
 */
export class GamificationSimulator {
  private currentDate: Date;
  private simulatedUserProgress: UserProgress | null = null;
  private simulationHistory: SimulationRecord[] = [];
  private originalStorageImplementation: any = {};

  constructor() {
    // Start with today's date by default
    this.currentDate = new Date();
    
    // Save original storage implementation
    this.originalStorageImplementation = {
      getUserProgress: storageService.getUserProgress,
      saveUserProgress: storageService.saveUserProgress,
      saveRoutineProgress: storageService.saveRoutineProgress,
      getAllRoutines: storageService.getAllRoutines
    };
  }

  /**
   * Initialize the simulator with a fresh user progress state
   */
  async initialize(resetExisting: boolean = true): Promise<UserProgress> {
    console.log("🧪 Initializing gamification simulator");
    
    // Override the Date constructor for simulation
    this.overrideDate();

    // Reset or load user progress
    if (resetExisting) {
      this.simulatedUserProgress = await gamificationManager.initializeUserProgress();
      await this.mockStorageImplementation();
      console.log("🧪 Created fresh user progress for simulation");
    } else {
      this.simulatedUserProgress = await storageService.getUserProgress();
      await this.mockStorageImplementation();
      console.log("🧪 Loaded existing user progress for simulation");
    }

    // Start with empty simulation history
    this.simulationHistory = [];
    
    return this.simulatedUserProgress;
  }

  /**
   * Clean up the simulator and restore original state
   */
  cleanup(): void {
    console.log("🧪 Cleaning up gamification simulator");
    
    // Restore the original Date
    global.Date = OriginalDate;
    
    // Restore original storage implementation
    (storageService as any).getUserProgress = this.originalStorageImplementation.getUserProgress;
    (storageService as any).saveUserProgress = this.originalStorageImplementation.saveUserProgress;
    (storageService as any).saveRoutineProgress = this.originalStorageImplementation.saveRoutineProgress;
    (storageService as any).getAllRoutines = this.originalStorageImplementation.getAllRoutines;
    
    // Clear caches
    cacheUtils.invalidateAllCaches();
    
    console.log("🧪 Simulator cleanup complete");
  }

  /**
   * Override the Date constructor to use our simulated date
   */
  private overrideDate(): void {
    const self = this;
    
    // Use type assertion to work around TypeScript's limitations with global Date
    (global as any).Date = class extends OriginalDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          // When called with no arguments, return the simulated current date
          super(self.currentDate);
        } else {
          // Otherwise behave normally
          super(...args);
        }
      }
      
      // Ensure static methods work correctly
      static now() {
        return self.currentDate.getTime();
      }
      
      static parse(dateString: string) {
        return OriginalDate.parse(dateString);
      }
      
      static UTC(...args: any[]) {
        return OriginalDate.UTC(...args);
      }
    };
    
    console.log(`🧪 Date override active - simulated date: ${this.currentDate.toISOString().split('T')[0]}`);
  }

  /**
   * Mock the storage implementation for simulation
   */
  private async mockStorageImplementation(): Promise<void> {
    const self = this;
    const simulatedRoutines: ProgressEntry[] = [];
    
    // Use type assertions to avoid readonly property errors
    (storageService as any).getUserProgress = async () => {
      if (!self.simulatedUserProgress) {
        throw new Error("Simulator not initialized");
      }
      return deepClone(self.simulatedUserProgress);
    };
    
    // Override saveUserProgress
    (storageService as any).saveUserProgress = async (progress: UserProgress) => {
      self.simulatedUserProgress = deepClone(progress);
      return self.simulatedUserProgress;
    };
    
    // Override saveRoutineProgress
    (storageService as any).saveRoutineProgress = async (routine: ProgressEntry) => {
      simulatedRoutines.push(deepClone(routine));
      return routine;
    };
    
    // Override getAllRoutines
    (storageService as any).getAllRoutines = async () => {
      return deepClone(simulatedRoutines);
    };
    
    // Clear caches to ensure fresh data
    cacheUtils.invalidateAllCaches();
    console.log("🧪 Mocked storage implementation for simulation");
  }

  /**
   * Advance the simulated date by a specified number of days
   */
  advanceDays(days: number = 1): Date {
    this.currentDate = new Date(this.currentDate.getTime() + (days * 24 * 60 * 60 * 1000));
    console.log(`🧪 Advanced simulation to: ${this.currentDate.toISOString().split('T')[0]}`);
    
    // Clear any caches that may be date-dependent
    cacheUtils.invalidateAllCaches();
    
    return this.currentDate;
  }

  /**
   * Set the specific date for simulation
   */
  setDate(year: number, month: number, day: number): Date {
    this.currentDate = new Date(year, month - 1, day); // Month is 0-indexed in JS Date
    console.log(`🧪 Set simulation date to: ${this.currentDate.toISOString().split('T')[0]}`);
    
    // Clear any caches that may be date-dependent
    cacheUtils.invalidateAllCaches();
    
    return this.currentDate;
  }

  /**
   * Simulate completing a routine with specified parameters
   */
  async simulateRoutine(options: {
    duration?: number;
    area?: string;
    stretches?: string[];
    time?: {hours: number, minutes: number};
  } = {}): Promise<SimulationRecord> {
    if (!this.simulatedUserProgress) {
      throw new Error("Simulator not initialized");
    }
    
    // Get default values
    const duration = options.duration || 5;
    const area = options.area || "Neck";
    const stretches = options.stretches || ["Neck Rotation", "Chin Tucks"];
    
    // Set time component if specified
    if (options.time) {
      this.currentDate.setHours(options.time.hours, options.time.minutes, 0, 0);
    }
    
    // Create the routine entry with proper type assertions
    const routine: ProgressEntry = {
      id: `sim-${Date.now()}`,
      date: this.currentDate.toISOString(),
      duration: duration.toString() as any, // Assert as any to avoid type errors
      area: area as any, // Assert as any to avoid type errors
      stretches: stretches,
      status: "completed"
    };
    
    console.log(`🧪 Simulating routine: ${routine.area} (${routine.duration} mins) on ${routine.date.split('T')[0]}`);
    
    // Save the before state
    const beforeUserProgress = await storageService.getUserProgress();
    const beforeLevel = beforeUserProgress.level;
    const beforeXP = beforeUserProgress.totalXP;
    
    // Process the routine through the gamification system
    const { userProgress, xpBreakdown, completedChallenges } = 
      await gamificationManager.processCompletedRoutine(routine);
    
    // Get updated level info
    const levelInfo = await gamificationManager.getUserLevelInfo();
    
    // Determine newly unlocked rewards if level changed
    const newlyUnlockedRewards: Reward[] = [];
    if (levelInfo.level > beforeLevel) {
      const allRewards = Object.values(userProgress.rewards || {});
      newlyUnlockedRewards.push(
        ...allRewards.filter(r => 
          r.unlocked && 
          r.levelRequired <= levelInfo.level && 
          r.levelRequired > beforeLevel
        )
      );
    }
    
    // Create a record of this simulation step
    const record: SimulationRecord = {
      date: this.currentDate.toISOString(),
      routine,
      xpEarned: levelInfo.totalXP - beforeXP,
      levelBefore: beforeLevel,
      levelAfter: levelInfo.level,
      levelUp: levelInfo.level > beforeLevel,
      totalXP: levelInfo.totalXP,
      xpToNextLevel: levelInfo.xpToNextLevel,
      percentToNextLevel: levelInfo.percentToNextLevel,
      completedChallenges,
      unlockedRewards: newlyUnlockedRewards,
      xpBreakdown
    };
    
    // Add to simulation history
    this.simulationHistory.push(record);
    
    // Log simulation results
    console.log(`🧪 Simulation results:`);
    console.log(`   XP Earned: ${record.xpEarned}, New Total: ${record.totalXP}`);
    console.log(`   Level: ${record.levelBefore} → ${record.levelAfter}${record.levelUp ? ' (Level Up!)' : ''}`);
    console.log(`   Completed Challenges: ${record.completedChallenges.length}`);
    console.log(`   Unlocked Rewards: ${record.unlockedRewards.length}`);
    
    return record;
  }

  /**
   * Simulate a full daily cycle, including challenge refreshes
   */
  async simulateDailyCycle(options: {
    skipToNextDay?: boolean;
    routineCount?: number;
    claimAllChallenges?: boolean;
  } = {}): Promise<DailyCycleResult> {
    if (!this.simulatedUserProgress) {
      throw new Error("Simulator not initialized");
    }
    
    const routineCount = options.routineCount || 1;
    const routineRecords: SimulationRecord[] = [];
    
    // Advance to next day if requested
    if (options.skipToNextDay) {
      this.advanceDays(1);
    }
    
    // Get beginning of day state
    const dayStart = dateUtils.today();
    const beforeUserProgress = await storageService.getUserProgress();
    const beforeChallenges = await challengeManager.getActiveChallenges();
    
    console.log(`🧪 Simulating daily cycle for ${dayStart} with ${routineCount} routines`);
    
    // Simulate routines throughout the day
    for (let i = 0; i < routineCount; i++) {
      // Spread routines throughout the day
      const hour = 9 + Math.floor((i / routineCount) * 12); // Between 9am and 9pm
      const record = await this.simulateRoutine({
        time: { hours: hour, minutes: Math.floor(Math.random() * 60) }
      });
      routineRecords.push(record);
    }
    
    // Claim all completed challenges if requested
    const claimedChallenges: Challenge[] = [];
    if (options.claimAllChallenges) {
      const claimable = await challengeManager.getClaimableChallenges();
      
      console.log(`🧪 Claiming ${claimable.length} completed challenges`);
      
      for (const challenge of claimable) {
        const result = await challengeManager.claimChallenge(challenge.id);
        if (result.success) {
          claimedChallenges.push(challenge);
        }
      }
    }
    
    // Get end of day state
    const afterUserProgress = await storageService.getUserProgress();
    const afterChallenges = await challengeManager.getActiveChallenges();
    
    // Create daily cycle result
    const result: DailyCycleResult = {
      date: dayStart,
      routineRecords,
      claimedChallenges,
      beforeState: {
        userProgress: beforeUserProgress,
        challenges: beforeChallenges
      },
      afterState: {
        userProgress: afterUserProgress,
        challenges: afterChallenges
      }
    };
    
    console.log(`🧪 Daily cycle simulation complete for ${dayStart}`);
    console.log(`   Routines: ${routineRecords.length}, XP: ${result.afterState.userProgress.totalXP - result.beforeState.userProgress.totalXP}`);
    console.log(`   Level: ${result.beforeState.userProgress.level} → ${result.afterState.userProgress.level}`);
    console.log(`   Claimed Challenges: ${claimedChallenges.length}`);
    
    return result;
  }

  /**
   * Simulate completing a streak of specified length
   */
  async simulateStreak(daysInStreak: number, options: {
    routinesPerDay?: number;
    claimAllChallenges?: boolean;
  } = {}): Promise<StreakResult> {
    if (!this.simulatedUserProgress) {
      throw new Error("Simulator not initialized");
    }
    
    const routinesPerDay = options.routinesPerDay || 1;
    const dailyCycles: DailyCycleResult[] = [];
    
    const startDate = new Date(this.currentDate);
    const startUserProgress = await storageService.getUserProgress();
    
    console.log(`🧪 Simulating ${daysInStreak} day streak starting from ${dateUtils.today()}`);
    
    // Simulate each day in the streak
    for (let day = 0; day < daysInStreak; day++) {
      // Skip to next day except for the first day
      const skipToNextDay = day > 0;
      
      const dailyResult = await this.simulateDailyCycle({
        skipToNextDay,
        routineCount: routinesPerDay,
        claimAllChallenges: options.claimAllChallenges
      });
      
      dailyCycles.push(dailyResult);
    }
    
    const endUserProgress = await storageService.getUserProgress();
    
    // Create streak result
    const result: StreakResult = {
      startDate: startDate.toISOString(),
      endDate: this.currentDate.toISOString(),
      daysInStreak,
      dailyCycles,
      startUserProgress,
      endUserProgress,
      totalXPGained: endUserProgress.totalXP - startUserProgress.totalXP,
      levelGained: endUserProgress.level - startUserProgress.level
    };
    
    console.log(`🧪 Streak simulation complete: ${daysInStreak} days`);
    console.log(`   Start: ${result.startDate.split('T')[0]}, End: ${result.endDate.split('T')[0]}`);
    console.log(`   Total XP Gained: ${result.totalXPGained}`);
    console.log(`   Level Gained: ${result.levelGained} (${startUserProgress.level} → ${endUserProgress.level})`);
    console.log(`   Final Streak: ${endUserProgress.statistics.currentStreak}`);
    
    return result;
  }

  /**
   * Claim a specific challenge
   */
  async claimChallenge(challengeId: string): Promise<{
    success: boolean;
    xpEarned: number;
    levelUp: boolean;
    challenge?: Challenge;
  }> {
    if (!this.simulatedUserProgress) {
      throw new Error("Simulator not initialized");
    }
    
    console.log(`🧪 Claiming challenge: ${challengeId}`);
    
    const beforeUserProgress = await storageService.getUserProgress();
    const beforeLevel = beforeUserProgress.level;
    
    // Find the challenge
    const challenge = beforeUserProgress.challenges[challengeId];
    if (!challenge) {
      console.log(`🧪 Challenge not found: ${challengeId}`);
      return { success: false, xpEarned: 0, levelUp: false };
    }
    
    // Claim the challenge
    const result = await challengeManager.claimChallenge(challengeId);
    
    if (result.success) {
      console.log(`🧪 Challenge claimed: ${challenge.title} (+${result.xpEarned} XP)`);
      if (result.levelUp) {
        console.log(`🧪 Level up: ${beforeLevel} → ${result.newLevel}`);
      }
    } else {
      console.log(`🧪 Failed to claim challenge: ${result.message}`);
    }
    
    return {
      success: result.success,
      xpEarned: result.xpEarned,
      levelUp: result.levelUp,
      challenge: challenge
    };
  }

  /**
   * Get all claimable challenges
   */
  async getClaimableChallenges(): Promise<Challenge[]> {
    return challengeManager.getClaimableChallenges();
  }

  /**
   * Get all active challenges
   */
  async getActiveChallenges(): Promise<Record<string, Challenge[]>> {
    return challengeManager.getActiveChallenges();
  }

  /**
   * Get the simulation history
   */
  getSimulationHistory(): SimulationRecord[] {
    return this.simulationHistory;
  }

  /**
   * Get the current simulated user progress
   */
  async getCurrentProgress(): Promise<UserProgress> {
    if (!this.simulatedUserProgress) {
      throw new Error("Simulator not initialized");
    }
    
    return storageService.getUserProgress();
  }

  /**
   * Get the summary of the current gamification state
   */
  async getGamificationSummary(): Promise<any> {
    return gamificationManager.getGamificationSummary();
  }
}

// Type definitions for simulation records and results
export interface SimulationRecord {
  date: string;
  routine: ProgressEntry;
  xpEarned: number;
  levelBefore: number;
  levelAfter: number;
  levelUp: boolean;
  totalXP: number;
  xpToNextLevel: number | null;
  percentToNextLevel: number;
  completedChallenges: Challenge[];
  unlockedRewards: Reward[];
  xpBreakdown: any;
}

export interface DailyCycleResult {
  date: string;
  routineRecords: SimulationRecord[];
  claimedChallenges: Challenge[];
  beforeState: {
    userProgress: UserProgress;
    challenges: Record<string, Challenge[]>;
  };
  afterState: {
    userProgress: UserProgress;
    challenges: Record<string, Challenge[]>;
  };
}

export interface StreakResult {
  startDate: string;
  endDate: string;
  daysInStreak: number;
  dailyCycles: DailyCycleResult[];
  startUserProgress: UserProgress;
  endUserProgress: UserProgress;
  totalXPGained: number;
  levelGained: number;
}

// Create a default export for easy importing
export default GamificationSimulator; 