/**
 * SimulationRunner.ts
 * 
 * This file provides sample scenarios and examples for using the
 * GamificationSimulator to test different aspects of the gamification system.
 */

import GamificationSimulator, { StreakResult } from './GamificationSimulator';

/**
 * Run various simulation scenarios to test the gamification system
 */
export async function runSimulations() {
  console.log('===== STARTING GAMIFICATION SIMULATIONS =====');
  
  // Run different test scenarios
  await simulateBasicRoutineCompletion();
  await simulateStreakProgression();
  await simulateWeeklyChallengesCycle();
  await simulateLevelProgression();
  await simulateCalendarTimeJumps();
  
  console.log('===== COMPLETED GAMIFICATION SIMULATIONS =====');
}

/**
 * Simulate a simple routine completion to ensure basic functionality
 */
async function simulateBasicRoutineCompletion() {
  console.log('\n🧪 SCENARIO: Basic Routine Completion');
  
  const simulator = new GamificationSimulator();
  await simulator.initialize(true); // Start with fresh user progress
  
  try {
    // Simulate a 5-minute Neck routine
    const result = await simulator.simulateRoutine({
      duration: 5,
      area: 'Neck',
      stretches: ['Neck Rotation', 'Chin Tucks'],
      time: { hours: 10, minutes: 30 }
    });
    
    console.log(`Routine completed with ${result.xpEarned} XP gained`);
    console.log(`Completed challenges: ${result.completedChallenges.length}`);
    
    // Get all claimable challenges
    const claimableChallenges = await simulator.getClaimableChallenges();
    console.log(`There are ${claimableChallenges.length} claimable challenges`);
    
    // Claim the first challenge if available
    if (claimableChallenges.length > 0) {
      const claimResult = await simulator.claimChallenge(claimableChallenges[0].id);
      console.log(`Claimed challenge: ${claimResult.challenge?.title} for ${claimResult.xpEarned} XP`);
    }
    
    // Complete a second routine on the same day
    const result2 = await simulator.simulateRoutine({
      duration: 10,
      area: 'Shoulders',
      stretches: ['Shoulder Rolls', 'Arm Across Chest'],
      time: { hours: 15, minutes: 45 }
    });
    
    console.log(`Second routine completed with ${result2.xpEarned} XP gained`);
    console.log(`Total XP after two routines: ${result2.totalXP}`);
    
  } finally {
    // Always clean up to restore original state
    simulator.cleanup();
  }
}

/**
 * Simulate a 7-day streak to test streak-based challenges
 */
async function simulateStreakProgression() {
  console.log('\n🧪 SCENARIO: 7-Day Streak Progression');
  
  const simulator = new GamificationSimulator();
  await simulator.initialize(true);
  
  try {
    // Simulate a 7-day streak with 1 routine per day
    const streakResult = await simulator.simulateStreak(7, {
      routinesPerDay: 1,
      claimAllChallenges: true // Auto-claim any completed challenges
    });
    
    // Log overall results
    console.log(`Streak completed: ${streakResult.daysInStreak} days`);
    console.log(`Total XP gained: ${streakResult.totalXPGained}`);
    console.log(`Level progression: ${streakResult.startUserProgress.level} → ${streakResult.endUserProgress.level}`);
    console.log(`Final streak value: ${streakResult.endUserProgress.statistics.currentStreak}`);
    
    // Check if streak challenges were completed
    const summary = await simulator.getGamificationSummary();
    const streakAchievements = summary.achievements.byCategory.Streaks || [];
    console.log(`Streak achievements completed: ${streakAchievements.completed?.length || 0}`);
    
  } finally {
    simulator.cleanup();
  }
}

/**
 * Simulate a full weekly cycle to test weekly challenge refreshes
 */
async function simulateWeeklyChallengesCycle() {
  console.log('\n🧪 SCENARIO: Weekly Challenges Cycle');
  
  const simulator = new GamificationSimulator();
  await simulator.initialize(true);
  
  try {
    // Get initial challenges
    let challenges = await simulator.getActiveChallenges();
    console.log(`Initial challenge counts - Daily: ${challenges.daily.length}, Weekly: ${challenges.weekly.length}`);
    
    // Simulate several days with routines, claiming challenges
    for (let day = 0; day < 9; day++) { // Simulate more than a week
      const dailyResult = await simulator.simulateDailyCycle({
        skipToNextDay: day > 0, // Don't skip the first day
        routineCount: 2, // Do 2 routines each day
        claimAllChallenges: true
      });
      
      if (day === 0 || day === 7) {
        // Log the state at the beginning and after a week
        console.log(`Day ${day + 1} challenges - Daily: ${dailyResult.afterState.challenges.daily.length}, Weekly: ${dailyResult.afterState.challenges.weekly.length}`);
      }
    }
    
    // Get final challenges
    challenges = await simulator.getActiveChallenges();
    console.log(`Final challenge counts - Daily: ${challenges.daily.length}, Weekly: ${challenges.weekly.length}`);
    
    // Check if weekly challenges were refreshed correctly
    const progressData = await simulator.getCurrentProgress();
    console.log(`Weekly challenge check date: ${progressData.lastDailyChallengeCheck}`);
    
  } finally {
    simulator.cleanup();
  }
}

/**
 * Simulate progression to level 5 and check rewards unlocking
 */
async function simulateLevelProgression() {
  console.log('\n🧪 SCENARIO: Level Progression and Rewards');
  
  const simulator = new GamificationSimulator();
  await simulator.initialize(true);
  
  try {
    // Get initial level info
    const initialProgress = await simulator.getCurrentProgress();
    console.log(`Starting level: ${initialProgress.level}, XP: ${initialProgress.totalXP}`);
    
    let currentLevel = initialProgress.level;
    let unlockedRewards = 0;
    
    // Simulate days until reaching level 5
    while (currentLevel < 5) {
      // Do multiple routines each day to level up faster
      const dailyResult = await simulator.simulateDailyCycle({
        skipToNextDay: true,
        routineCount: 3,
        claimAllChallenges: true
      });
      
      // Check for level ups and reward unlocks
      for (const record of dailyResult.routineRecords) {
        if (record.levelUp) {
          console.log(`Leveled up to ${record.levelAfter}`);
          unlockedRewards += record.unlockedRewards.length;
          
          if (record.unlockedRewards.length > 0) {
            console.log(`Unlocked rewards: ${record.unlockedRewards.map(r => r.title).join(', ')}`);
          }
        }
      }
      
      currentLevel = dailyResult.afterState.userProgress.level;
    }
    
    const finalProgress = await simulator.getCurrentProgress();
    console.log(`Final level: ${finalProgress.level}, XP: ${finalProgress.totalXP}`);
    console.log(`Total unlocked rewards: ${unlockedRewards}`);
    
    // Check which rewards are now unlocked
    const summary = await simulator.getGamificationSummary();
    const unlockedRewardsList = summary.rewards.filter((r: any) => r.unlocked);
    console.log(`Unlocked rewards: ${unlockedRewardsList.map((r: any) => r.title).join(', ')}`);
    
  } finally {
    simulator.cleanup();
  }
}

/**
 * Simulate specific calendar dates to test monthly challenges
 */
async function simulateCalendarTimeJumps() {
  console.log('\n🧪 SCENARIO: Calendar Month Transitions');
  
  const simulator = new GamificationSimulator();
  await simulator.initialize(true);
  
  try {
    // Start at beginning of a month
    const today = new Date();
    simulator.setDate(today.getFullYear(), today.getMonth() + 1, 1);
    
    // Get initial challenges
    let challenges = await simulator.getActiveChallenges();
    console.log(`Beginning of month - Monthly challenges: ${challenges.monthly.length}`);
    
    // Do routines for several days
    await simulator.simulateDailyCycle({ routineCount: 2, claimAllChallenges: true });
    
    // Jump to end of month
    simulator.setDate(today.getFullYear(), today.getMonth() + 1, 28);
    await simulator.simulateDailyCycle({ routineCount: 2, claimAllChallenges: true });
    
    // Jump to start of next month
    simulator.setDate(today.getFullYear(), today.getMonth() + 2, 1);
    await simulator.refreshChallenges();
    
    // Get challenges after month transition
    challenges = await simulator.getActiveChallenges();
    console.log(`Next month - Monthly challenges: ${challenges.monthly.length}`);
    
    // Check monthly challenge progress
    const currentProgress = await simulator.getCurrentProgress();
    const monthlyChallengeTitles = Object.values(currentProgress.challenges)
      .filter(c => c.category === 'monthly' && !c.claimed)
      .map(c => `${c.title} (${c.progress}/${c.requirement})`);
    
    console.log(`Monthly challenges: ${monthlyChallengeTitles.join(', ')}`);
    
  } finally {
    simulator.cleanup();
  }
}

/**
 * Add this helper method to the GamificationSimulator class to support the tests above
 */
declare module './GamificationSimulator' {
  interface GamificationSimulator {
    refreshChallenges(): Promise<void>;
  }
}

// Import directly instead of using dynamic import
import * as challengeManager from '../modules/challengeManager';

GamificationSimulator.prototype.refreshChallenges = async function() {
  const userProgress = await this.getCurrentProgress();
  return challengeManager.refreshChallenges(userProgress);
}; 