import { BodyArea, Duration, ProgressEntry } from '../../types';
import * as storageService from '../../services/storageService';
import * as gamificationManager from '../progress/gamificationManager';
import * as achievementManager from '../progress/achievementManager';
import * as challengeManager from '../progress/challengeManager';
import * as xpManager from '../progress/xpManager';
import { LEVELS } from '../progress/xpManager';

/**
 * Comprehensive testing utility for the gamification system
 * Allows for simulating various user scenarios and directly manipulating achievement progress
 */

// Date manipulation helpers
const ONE_DAY = 24 * 60 * 60 * 1000; // One day in milliseconds

/**
 * Generate a date string for a specific day offset from today
 * @param daysOffset Number of days in the past (negative) or future (positive)
 * @returns ISO date string
 */
export const getDateForOffset = (daysOffset: number): string => {
  // Ensure daysOffset is always negative or zero (today) to avoid future dates
  const offsetToUse = daysOffset <= 0 ? daysOffset : 0;
  
  // If the requested offset is 0 (today), force it to be at least -1 (yesterday)
  const finalOffset = offsetToUse === 0 ? -1 : offsetToUse;
  
  const date = new Date();
  date.setTime(date.getTime() + finalOffset * ONE_DAY);
  return date.toISOString();
};

/**
 * Create a mock routine entry
 */
export const createMockRoutine = (
  area: BodyArea = 'Full Body',
  duration: Duration = '5',
  daysOffset: number = -1, // Default to yesterday instead of today (0)
  stretchCount: number = 5
): ProgressEntry => {
  // Ensure daysOffset is always at least -1 (yesterday) or earlier
  const safeOffset = daysOffset <= -1 ? daysOffset : -1;
  
  return {
    area,
    duration,
    date: getDateForOffset(safeOffset),
    stretchCount
  };
};

/**
 * Add a single mock routine to the system and process it through gamification
 */
export const addMockRoutine = async (
  area: BodyArea = 'Full Body',
  duration: Duration = '5',
  daysOffset: number = -1,
  stretchCount: number = 5,
  processForXP: boolean = true
): Promise<{
  routine: ProgressEntry;
  xpEarned: number;
  unlockedAchievements: any[];
}> => {
  const routine = createMockRoutine(area, duration, daysOffset, stretchCount);
  
  // Save the routine
  await storageService.saveRoutineProgress(routine);
  
  let xpEarned = 0;
  let unlockedAchievements: any[] = [];
  
  // Process through gamification if requested
  if (processForXP) {
    // Get current user progress to ensure statistics are up to date
    const userProgress = await storageService.getUserProgress();
    
    // Ensure streak is calculated based on all routines
    const allRoutines = await storageService.getAllRoutines();
    
    // Calculate streak directly
    const { calculateStreak } = require('../progressUtils');
    const calculatedStreak = calculateStreak(allRoutines);
    
    console.log(`Calculated streak from mock routine: ${calculatedStreak} days`);
    
    // Update statistics based on the new routine
    if (!userProgress.statistics) {
      userProgress.statistics = {
        totalRoutines: 0,
        currentStreak: 0,
        bestStreak: 0,
        uniqueAreas: [],
        routinesByArea: {},
        lastUpdated: new Date().toISOString(),
        totalMinutes: 0
      };
    }
    
    // Update streak and best streak
    userProgress.statistics.currentStreak = calculatedStreak;
    if (calculatedStreak > userProgress.statistics.bestStreak) {
      userProgress.statistics.bestStreak = calculatedStreak;
    }
    
    // Convert duration to number
    const durationNum = parseInt(duration);
    if (!isNaN(durationNum)) {
      userProgress.statistics.totalMinutes = (userProgress.statistics.totalMinutes || 0) + durationNum;
    }
    
    // Update statistics based on the new routine
    userProgress.statistics.totalRoutines = allRoutines.length;
    
    // Add area to uniqueAreas if not already present
    if (!userProgress.statistics.uniqueAreas.includes(area)) {
      userProgress.statistics.uniqueAreas.push(area);
    }
    
    // Update routinesByArea counter
    if (!userProgress.statistics.routinesByArea[area]) {
      userProgress.statistics.routinesByArea[area] = 1;
    } else {
      userProgress.statistics.routinesByArea[area]++;
    }
    
    console.log(`Updated statistics: totalRoutines=${userProgress.statistics.totalRoutines}, currentStreak=${userProgress.statistics.currentStreak}`);
    
    // Save updated statistics
    await storageService.saveUserProgress(userProgress);
    
    // Now process the routine with updated statistics
    const result = await gamificationManager.processCompletedRoutine(routine);
    xpEarned = result.xpEarned;
    unlockedAchievements = result.unlockedAchievements;
    
    // Do a final check for achievements in case they weren't unlocked
    if (unlockedAchievements.length === 0) {
      console.log('No achievements unlocked during routine processing, checking again...');
      const updatedProgress = await storageService.getUserProgress();
      const achievementResult = await achievementManager.updateAchievements(updatedProgress);
      if (achievementResult.unlockedAchievements.length > 0) {
        console.log(`Found ${achievementResult.unlockedAchievements.length} unlocked achievements in second check`);
        unlockedAchievements = achievementResult.unlockedAchievements;
      }
    }
  }
  
  return {
    routine,
    xpEarned,
    unlockedAchievements
  };
};

/**
 * Create a streak by adding routines for consecutive days
 */
export const createMockStreak = async (
  length: number,
  endToday: boolean = false
): Promise<{
  routines: ProgressEntry[];
  totalXpEarned: number;
  unlockedAchievements: any[];
}> => {
  const routines: ProgressEntry[] = [];
  let totalXpEarned = 0;
  const allUnlockedAchievements: any[] = [];
  
  // Always ensure we're using dates in the past
  // If endToday is true, end with yesterday (-1)
  // If endToday is false, end with the day before yesterday (-2)
  const endDayOffset = endToday ? -1 : -2;
  
  // Calculate starting offset: For a 3-day streak ending yesterday (-1),
  // we'd need to start at -3 (3 days ago)
  const startOffset = endDayOffset - (length - 1);
  
  console.log(`Creating ${length}-day streak from ${startOffset} to ${endDayOffset}`);
  
  // Create a routine for each day in the streak
  for (let i = 0; i < length; i++) {
    const dayOffset = startOffset + i;
    
    // Randomize areas and duration for more realistic data
    const areas: BodyArea[] = ['Full Body', 'Lower Back', 'Upper Back & Chest', 'Shoulders & Arms', 'Neck', 'Hips & Legs'];
    const durations: Duration[] = ['5', '10', '15'];
    
    const area = areas[Math.floor(Math.random() * areas.length)];
    const duration = durations[Math.floor(Math.random() * durations.length)];
    
    const { routine, xpEarned, unlockedAchievements } = await addMockRoutine(
      area,
      duration,
      dayOffset,
      5 + Math.floor(Math.random() * 5), // 5-10 stretches
      true // Process for XP
    );
    
    routines.push(routine);
    totalXpEarned += xpEarned;
    allUnlockedAchievements.push(...unlockedAchievements);
  }
  
  // Ensure streak is properly set in user progress
  const userProgress = await storageService.getUserProgress();
  
  // Manually calculate streak for verification
  const allRoutines = await storageService.getAllRoutines();
  
  // Update statistics to match the created streak
  userProgress.statistics.currentStreak = length;
  if (length > userProgress.statistics.bestStreak) {
    userProgress.statistics.bestStreak = length;
  }
  await storageService.saveUserProgress(userProgress);
  
  // Force achievement check after setting the streak
  const achievementResult = await achievementManager.updateAchievements(userProgress);
  if (achievementResult.unlockedAchievements.length > 0) {
    allUnlockedAchievements.push(...achievementResult.unlockedAchievements);
  }
  
  return {
    routines,
    totalXpEarned,
    unlockedAchievements: allUnlockedAchievements
  };
};

/**
 * Directly manipulate an achievement's progress to test completion
 */
export const setAchievementProgress = async (
  achievementId: string,
  progress: number,
  markCompleted: boolean = false
): Promise<{
  achievement: any;
  wasUpdated: boolean;
}> => {
  // Get current user progress
  const userProgress = await storageService.getUserProgress();
  
  // Check if achievement exists
  if (!userProgress.achievements || !userProgress.achievements[achievementId]) {
    console.error(`Achievement ${achievementId} not found`);
    return {
      achievement: null,
      wasUpdated: false
    };
  }
  
  // Update achievement
  const achievement = userProgress.achievements[achievementId];
  const wasAlreadyCompleted = achievement.completed;
  
  // Update progress
  achievement.progress = progress;
  
  // Mark as completed if requested or if progress meets requirement
  if (markCompleted || progress >= achievement.requirement) {
    achievement.completed = true;
    if (!achievement.dateCompleted) {
      achievement.dateCompleted = new Date().toISOString();
    }
  }
  
  // Save changes
  userProgress.achievements[achievementId] = achievement;
  await storageService.saveUserProgress(userProgress);
  
  // Trigger achievement update to process XP if newly completed
  if (!wasAlreadyCompleted && achievement.completed) {
    await achievementManager.updateAchievements(userProgress);
  }
  
  return {
    achievement,
    wasUpdated: true
  };
};

/**
 * Complete all achievements in a category or with specific criteria
 */
export const completeAchievements = async (
  options: {
    category?: string;
    uiCategory?: string;
    ids?: string[];
    all?: boolean;
  }
): Promise<{
  completedCount: number;
  totalXpEarned: number;
  achievements: any[];
}> => {
  // Get current user progress
  const userProgress = await storageService.getUserProgress();
  
  if (!userProgress.achievements) {
    return {
      completedCount: 0,
      totalXpEarned: 0,
      achievements: []
    };
  }
  
  // Filter achievements based on criteria
  const achievementsToComplete = Object.values(userProgress.achievements).filter(a => {
    // Skip already completed
    if (a.completed) return false;
    
    // Check category if specified
    if (options.category && a.category !== options.category) return false;
    
    // Check UI category if specified
    if (options.uiCategory && a.uiCategory !== options.uiCategory) return false;
    
    // Check IDs if specified
    if (options.ids && !options.ids.includes(a.id)) return false;
    
    // If all is true, include all achievements
    return options.all || false;
  });
  
  let totalXpEarned = 0;
  const completedAchievements = [];
  
  // Complete each achievement
  for (const achievement of achievementsToComplete) {
    const { achievement: updated, wasUpdated } = await setAchievementProgress(
      achievement.id,
      achievement.requirement,
      true
    );
    
    if (wasUpdated) {
      totalXpEarned += achievement.xp;
      completedAchievements.push(updated);
    }
  }
  
  return {
    completedCount: completedAchievements.length,
    totalXpEarned,
    achievements: completedAchievements
  };
};

/**
 * Generate a large number of routines over a time period
 */
export const generateRoutineHistory = async (
  options: {
    count: number;
    startDaysAgo: number;
    endDaysAgo?: number;
    randomizeAreas?: boolean;
    randomizeDurations?: boolean;
    specificArea?: BodyArea;
    specificDuration?: Duration;
    processForXP?: boolean;
  }
): Promise<{
  routineCount: number;
  totalXpEarned: number;
  unlockedAchievements: any[];
}> => {
  const {
    count,
    startDaysAgo,
    endDaysAgo = 1, // Changed default from 0 to 1 to avoid today's date
    randomizeAreas = true,
    randomizeDurations = true,
    specificArea = 'Full Body',
    specificDuration = '5',
    processForXP = true
  } = options;
  
  // Validate inputs and ensure we're not using today's date
  if (count <= 0) {
    throw new Error('Invalid options for generating routine history: count must be positive');
  }
  
  // Ensure startDaysAgo is greater than endDaysAgo and both are at least 1
  const safeStartDaysAgo = Math.max(startDaysAgo, endDaysAgo + 1, 2);
  const safeEndDaysAgo = Math.max(endDaysAgo, 1); // At least yesterday
  
  // Check if range is valid
  if (safeStartDaysAgo <= safeEndDaysAgo) {
    throw new Error('Invalid date range for generating routine history');
  }
  
  console.log(`Generating ${count} routines between ${safeStartDaysAgo} and ${safeEndDaysAgo} days ago`);
  
  const routines: ProgressEntry[] = [];
  let totalXpEarned = 0;
  const allUnlockedAchievements: any[] = [];
  
  // Available options
  const areas: BodyArea[] = ['Full Body', 'Lower Back', 'Upper Back & Chest', 'Shoulders & Arms', 'Neck', 'Hips & Legs'];
  const durations: Duration[] = ['5', '10', '15'];
  
  // Calculate day range
  const dayRange = safeStartDaysAgo - safeEndDaysAgo;
  
  // Generate routines
  for (let i = 0; i < count; i++) {
    // Random day within range, always in the past
    const dayOffset = -safeStartDaysAgo + Math.floor(Math.random() * dayRange);
    
    // Select area and duration
    const area = randomizeAreas ? areas[Math.floor(Math.random() * areas.length)] : specificArea;
    const duration = randomizeDurations ? durations[Math.floor(Math.random() * durations.length)] : specificDuration;
    
    const { routine, xpEarned, unlockedAchievements } = await addMockRoutine(
      area,
      duration,
      dayOffset,
      5 + Math.floor(Math.random() * 5), // 5-10 stretches
      processForXP
    );
    
    routines.push(routine);
    totalXpEarned += xpEarned;
    allUnlockedAchievements.push(...unlockedAchievements);
    
    // Add small delay to avoid storage conflicts
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  return {
    routineCount: routines.length,
    totalXpEarned,
    unlockedAchievements: allUnlockedAchievements
  };
};

/**
 * Reset all user progress data for testing purposes
 */
export const resetAllUserProgress = async (): Promise<boolean> => {
  try {
    // Use the initialization function from gamification manager
    await gamificationManager.initializeUserProgress();
    
    // Extra check to make sure achievements and statistics are properly reset
    const userProgress = await storageService.getUserProgress();
    
    // Ensure statistics are properly reset
    userProgress.statistics = {
      totalRoutines: 0,
      currentStreak: 0,
      bestStreak: 0,
      uniqueAreas: [],
      routinesByArea: {},
      lastUpdated: new Date().toISOString(),
      totalMinutes: 0
    };
    
    // Ensure achievements are reset to initial state
    userProgress.achievements = achievementManager.initializeAchievements();
    
    // Ensure XP and level are reset
    userProgress.totalXP = 0;
    userProgress.level = 1;
    
    // Save the fully reset progress
    await storageService.saveUserProgress(userProgress);
    
    console.log("User progress fully reset for testing");
    return true;
  } catch (error) {
    console.error('Error resetting user progress:', error);
    return false;
  }
};

/**
 * Add XP directly to the user
 */
export const addDirectXP = async (amount: number): Promise<{ 
  newTotalXP: number; 
  newLevel: number; 
  levelUp: boolean;
  previousLevel: number 
}> => {
  const userProgress = await storageService.getUserProgress();
  const previousLevel = userProgress.level;
  const oldXP = userProgress.xp;
  
  // Add the XP
  userProgress.xp += amount;
  console.log(`Adding ${amount} XP. Old total: ${oldXP}, New total: ${userProgress.xp}`);
  
  // Check for level up
  const oldLevel = userProgress.level;
  const xpThresholds = LEVELS.map(level => level.xpRequired);
  
  // Find the new level based on total XP
  let newLevel = 1;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (userProgress.xp >= LEVELS[i].xpRequired) {
      newLevel = LEVELS[i].level;
      break;
    }
  }
  
  // Determine if this was a level up
  const levelUp = newLevel > oldLevel;
  
  if (levelUp) {
    console.log(`🎉 LEVEL UP through testing! ${oldLevel} → ${newLevel}`);
    userProgress.level = newLevel;
    
    // ADDED: Set special flag for level up testing
    userProgress.testLevelUp = true;
    userProgress.testPreviousLevel = oldLevel;
  }
  
  // Calculate XP to next level
  let xpToNextLevel = 0;
  if (newLevel < LEVELS.length) {
    xpToNextLevel = LEVELS[newLevel].xpRequired - userProgress.xp;
  } else {
    // If at max level, just set a default increment (e.g., 1000 XP to next level)
    xpToNextLevel = 1000;
  }
  
  // Save the updated progress
  await storageService.saveUserProgress(userProgress);
  
  return {
    newTotalXP: userProgress.xp,
    newLevel,
    levelUp,
    previousLevel
  };
};

/**
 * Test a specific achievement requirement
 * For example, test the "streak_7" achievement by creating a 7-day streak
 */
export const testAchievementRequirement = async (
  achievementId: string
): Promise<{
  success: boolean;
  achievement: any;
  message: string;
}> => {
  // Get user progress and find the achievement
  const userProgress = await storageService.getUserProgress();
  
  if (!userProgress.achievements || !userProgress.achievements[achievementId]) {
    return {
      success: false,
      achievement: null,
      message: `Achievement ${achievementId} not found`
    };
  }
  
  const achievement = userProgress.achievements[achievementId];
  
  // Check if already completed
  if (achievement.completed) {
    return {
      success: false,
      achievement,
      message: `Achievement ${achievementId} is already completed`
    };
  }
  
  try {
    // Different handling based on achievement type
    switch (achievement.type) {
      case 'streak':
        // Create a streak matching the requirement
        await createMockStreak(achievement.requirement);
        break;
        
      case 'routine_count':
        // Generate enough routines
        await generateRoutineHistory({
          count: achievement.requirement,
          startDaysAgo: achievement.requirement,
          processForXP: true
        });
        break;
        
      case 'area_variety':
        // Create routines for different areas
        const areas: BodyArea[] = ['Full Body', 'Lower Back', 'Upper Back & Chest', 'Shoulders & Arms', 'Neck', 'Hips & Legs'];
        for (let i = 0; i < Math.min(achievement.requirement, areas.length); i++) {
          await addMockRoutine(areas[i], '5', -i);
        }
        break;
        
      case 'total_minutes':
        // Calculate how many routines needed based on minutes
        const minutesPerRoutine = 15; // Max duration
        const routinesNeeded = Math.ceil(achievement.requirement / minutesPerRoutine);
        await generateRoutineHistory({
          count: routinesNeeded,
          startDaysAgo: routinesNeeded,
          randomizeDurations: false,
          specificDuration: '15',
          processForXP: true
        });
        break;
        
      case 'specific_area':
        // Create routines for a specific area
        const targetArea = achievement.area || 'Full Body';
        await generateRoutineHistory({
          count: achievement.requirement,
          startDaysAgo: achievement.requirement,
          randomizeAreas: false,
          specificArea: targetArea as BodyArea,
          processForXP: true
        });
        break;
        
      default:
        return {
          success: false,
          achievement,
          message: `Unknown achievement type: ${achievement.type}`
        };
    }
    
    // Check if the achievement was completed
    const updatedProgress = await storageService.getUserProgress();
    const updatedAchievement = updatedProgress.achievements[achievementId];
    
    if (updatedAchievement.completed) {
      return {
        success: true,
        achievement: updatedAchievement,
        message: `Successfully completed achievement ${achievementId}`
      };
    } else {
      return {
        success: false,
        achievement: updatedAchievement,
        message: `Achievement not completed. Current progress: ${updatedAchievement.progress}/${updatedAchievement.requirement}`
      };
    }
  } catch (error) {
    return {
      success: false,
      achievement,
      message: `Error testing achievement: ${error.message}`
    };
  }
};

/**
 * Get a list of all available achievements with their progress
 */
export const getAllAchievementsWithProgress = async (): Promise<{
  completed: any[];
  inProgress: any[];
  locked: any[];
}> => {
  const achievements = await achievementManager.getAllAchievements();
  
  return {
    completed: achievements.filter(a => a.completed),
    inProgress: achievements.filter(a => !a.completed && a.progress > 0),
    locked: achievements.filter(a => !a.completed && a.progress === 0)
  };
}; 