import { ProgressEntry } from '../../types';
import { UserProgress, XpAddResult, XpHistoryEntry, Level } from './types';
import * as storageService from '../../services/storageService';
import * as xpBoostManager from './xpBoostManager';

/**
 * XP levels configuration
 * Defines XP thresholds for each level
 */
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
  { level: 10, xpRequired: 5000, title: 'Guru' }
];

/**
 * Checks if a routine is the first one completed on its day
 * @param routine The routine to check
 * @param allRoutines All completed routines
 * @returns Boolean indicating if this is first routine of its day
 */
export const isFirstRoutineOfDay = (
  routine: ProgressEntry,
  allRoutines: ProgressEntry[]
): boolean => {
  // Extract date from routine (without time)
  const routineDate = new Date(routine.date);
  const routineDateString = routineDate.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // Find other routines on the same day
  const routinesOnSameDay = allRoutines.filter(r => {
    const date = new Date(r.date);
    return date.toISOString().split('T')[0] === routineDateString;
  });
  
  // Sort routines by time
  routinesOnSameDay.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateA.getTime() - dateB.getTime();
  });
  
  // If there are routines on this day, check if this is the first one
  if (routinesOnSameDay.length === 0) {
    return false; // Should not happen, but just in case
  }
  
  // Get the earliest routine of the day
  const earliestRoutine = routinesOnSameDay[0];
  
  // Log for debugging
  console.log(`Checking if routine is first of day: 
    - This routine time: ${new Date(routine.date).toISOString()}
    - Earliest routine time: ${new Date(earliestRoutine.date).toISOString()}
    - Is first: ${earliestRoutine.date === routine.date}
    - Total routines today: ${routinesOnSameDay.length}
  `);
  
  // This routine is the first one of the day if its date matches the earliest one
  return earliestRoutine.date === routine.date;
};

/**
 * Calculate XP for a completed routine
 * @param routine The completed routine
 * @param isFirstRoutineOfDay Whether this is the first routine of the day
 * @param isFirstEverRoutine Whether this is the user's first ever routine
 * @returns XP earned and breakdown
 */
export const calculateRoutineXp = async (
  routine: ProgressEntry,
  isFirstRoutineOfDay: boolean,
  isFirstEverRoutine: boolean
): Promise<{ xp: number; breakdown: Array<{source: string; amount: number; description: string}> }> => {
  // Initialize XP and breakdown
  let totalXp = 0;
  const breakdown: Array<{source: string; amount: number; description: string}> = [];
  
  // Check if XP boost is active
  const { isActive: isXpBoostActive, data: xpBoostData } = await xpBoostManager.checkXpBoostStatus();
  const xpMultiplier = isXpBoostActive ? xpBoostData.multiplier : 1;
  
  // Base XP for the routine - only awarded on first routine of the day
  let baseXp = 0;
  if (isFirstRoutineOfDay) {
    // Calculate base XP based on duration
    const duration = parseInt(routine.duration, 10);
    if (duration <= 5) {
      baseXp = 30;
    } else if (duration <= 10) {
      baseXp = 60;
    } else {
      baseXp = 90;
    }
    
    // Apply XP boost if active
    if (isXpBoostActive) {
      baseXp = Math.floor(baseXp * xpMultiplier);
      
      // Add base XP to breakdown with indication of boost
      breakdown.push({
        source: 'routine',
        amount: baseXp,
        description: `${duration}-Minute Routine (2x XP Boost Applied)`
      });
    } else {
      // Add standard base XP to breakdown
      breakdown.push({
        source: 'routine',
        amount: baseXp,
        description: `${duration}-Minute Routine`
      });
    }
    
    totalXp += baseXp;
  }
  
  // First-ever routine bonus (50 XP, not affected by XP boost)
  if (isFirstEverRoutine) {
    const welcomeBonus = 50;
    
    // Add welcome bonus to breakdown
    breakdown.push({
      source: 'first_ever',
      amount: welcomeBonus,
      description: 'First Ever Routine Completed'
    });
    
    totalXp += welcomeBonus;
  }
  
  // Any custom bonuses can be added here...
  
  return {
    xp: totalXp,
    breakdown
  };
};

/**
 * Adds XP to user progress with detailed tracking
 * @param amount XP amount to add
 * @param source Source of XP (routine, challenge, achievement)
 * @param details Additional details for tracking
 * @param userProgress Current user progress
 * @returns Updated progress and XP info
 */
export const addXP = async (
  amount: number,
  source: string,
  details: string,
  userProgress: UserProgress
): Promise<XpAddResult> => {
  // Validate amount
  const validAmount = Math.max(0, Math.round(amount));
  
  // Get current XP values
  const previousTotal = userProgress.totalXP || 0;
  const previousLevel = userProgress.level || 1;
  
  // Calculate new totals
  const newTotal = previousTotal + validAmount;
  
  // Determine level based on XP thresholds
  let newLevel = 1;
  
  // Use the LEVELS array to determine the user's level based on XP
  const calculateLevel = (xp: number): number => {
    let level = 1;
    for (let i = 0; i < LEVELS.length; i++) {
      if (xp >= LEVELS[i].xpRequired) {
        level = i + 1; // Level is 1-indexed
      } else {
        break;
      }
    }
    return level;
  };
  
  newLevel = calculateLevel(newTotal);
  const levelUp = newLevel > previousLevel;
  
  // Create XP history entry
  const xpHistoryEntry: XpHistoryEntry = {
    id: `xp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    amount: validAmount,
    source,
    timestamp: new Date().toISOString(),
    details,
    claimed: source !== 'challenge' // Only challenges need claiming
  };
  
  // Add to XP history
  const xpHistory = userProgress.xpHistory || [];
  xpHistory.push(xpHistoryEntry);
  
  // Update rewards if leveled up
  let updatedRewards = { ...userProgress.rewards };
  if (levelUp) {
    // Check for rewards that should be unlocked at this level
    Object.keys(updatedRewards).forEach(rewardId => {
      const reward = updatedRewards[rewardId];
      if (!reward.unlocked && reward.levelRequired <= newLevel) {
        updatedRewards[rewardId] = {
          ...reward,
          unlocked: true
        };
        
        console.log(`Reward unlocked: ${reward.title} (Level ${reward.levelRequired})`);
      }
    });
  }
  
  // Create updated progress object
  const updatedProgress = {
    ...userProgress,
    totalXP: newTotal,
    level: newLevel,
    xpHistory,
    rewards: updatedRewards,
    lastUpdated: new Date().toISOString()
  };
  
  // Save updated progress
  await storageService.saveUserProgress(updatedProgress);
  
  if (levelUp) {
    console.log(`🎉 Level Up! ${previousLevel} → ${newLevel}`);
  }
  
  console.log(`Added ${validAmount} XP from ${source}. Total: ${previousTotal} → ${newTotal}`);
  
  return {
    previousTotal,
    newTotal,
    previousLevel,
    newLevel,
    levelUp,
    amount: validAmount,
    progress: updatedProgress
  };
};

/**
 * Process a completed routine to award XP (if eligible)
 * @param routine The routine to process
 * @returns XP earned and resulting progress
 */
export const processRoutineForXP = async (
  routine: ProgressEntry
): Promise<{ xpEarned: number; updatedProgress: UserProgress }> => {
  try {
    // Get current progress and all routines
    const userProgress = await storageService.getUserProgress();
    const allRoutines = await storageService.getAllRoutines();
    
    console.log(`Processing routine for XP: ${routine.area} - ${routine.duration} minutes`);
    
    // Check if this is the first ever routine
    const isFirstEver = allRoutines.length === 1 && allRoutines[0].date === routine.date;
    
    // Check if this is the first routine of its day
    const isFirstOfDay = isFirstRoutineOfDay(routine, allRoutines);
    
    console.log(`Routine status - First ever: ${isFirstEver}, First of day: ${isFirstOfDay}`);
    
    // Only award XP if this is the first routine of the day
    let xpEarned = 0;
    let updatedProgress = userProgress;
    
    if (isFirstOfDay) {
      // Calculate XP for the routine
      const { xp, breakdown } = await calculateRoutineXp(routine, isFirstOfDay, isFirstEver);
      
      console.log(`Routine qualifies for XP (first of day). Awarding ${xp} XP.`);
      
      // Award XP with detailed tracking
      for (const item of breakdown) {
        const result = await addXP(
          item.amount,
          item.source,
          item.description,
          updatedProgress
        );
        updatedProgress = result.progress;
        xpEarned += item.amount;
      }
    } else {
      console.log(`Routine does not qualify for XP (not first of day).`);
    }
    
    return { xpEarned, updatedProgress };
  } catch (error) {
    console.error('Error processing routine for XP:', error);
    return { xpEarned: 0, updatedProgress: await storageService.getUserProgress() };
  }
};

/**
 * Calculate user level based on XP
 * @param xp Total XP
 * @returns Object with level and progress info
 */
export const calculateLevel = (
  xp: number
): { level: number; xpForCurrentLevel: number; xpForNextLevel: number; progress: number } => {
  // Find the highest level where XP is greater than or equal to the threshold
  let level = 1;
  
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xpRequired) {
      level = i + 1; // Level is 1-indexed
    } else {
      break;
    }
  }
  
  // Calculate XP for current level
  const xpForCurrentLevel = level > 1 ? LEVELS[level - 1].xpRequired : 0;
  
  // Calculate XP for next level
  const xpForNextLevel = level < LEVELS.length ? LEVELS[level].xpRequired : Infinity;
  
  // Calculate progress to next level (0-1)
  const progress = (xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel);
  
  return {
    level,
    xpForCurrentLevel,
    xpForNextLevel,
    progress
  };
}; 