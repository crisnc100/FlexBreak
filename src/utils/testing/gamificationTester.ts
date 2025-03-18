import { BodyArea, Duration, ProgressEntry } from '../../types';
import * as storageService from '../../services/storageService';
import * as gamificationManager from '../progress/gamificationManager';
import * as achievementManager from '../progress/achievementManager';
import * as challengeManager from '../progress/challengeManager';
import * as xpManager from '../progress/xpManager';

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
  const date = new Date();
  date.setTime(date.getTime() + daysOffset * ONE_DAY);
  return date.toISOString();
};

/**
 * Create a mock routine entry
 */
export const createMockRoutine = (
  area: BodyArea = 'Full Body',
  duration: Duration = '5',
  daysOffset: number = 0,
  stretchCount: number = 5
): ProgressEntry => {
  return {
    area,
    duration,
    date: getDateForOffset(daysOffset),
    stretchCount
  };
};

/**
 * Add a single mock routine to the system and process it through gamification
 */
export const addMockRoutine = async (
  area: BodyArea = 'Full Body',
  duration: Duration = '5',
  daysOffset: number = 0,
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
    const result = await gamificationManager.processCompletedRoutine(routine);
    xpEarned = result.xpEarned;
    unlockedAchievements = result.unlockedAchievements;
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
  endToday: boolean = true
): Promise<{
  routines: ProgressEntry[];
  totalXpEarned: number;
  unlockedAchievements: any[];
}> => {
  const routines: ProgressEntry[] = [];
  let totalXpEarned = 0;
  const allUnlockedAchievements: any[] = [];
  
  // Determine starting offset
  const startOffset = endToday ? -(length - 1) : -length;
  
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
  if (userProgress.statistics.currentStreak < length) {
    userProgress.statistics.currentStreak = length;
    if (length > userProgress.statistics.bestStreak) {
      userProgress.statistics.bestStreak = length;
    }
    await storageService.saveUserProgress(userProgress);
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
    endDaysAgo = 0,
    randomizeAreas = true,
    randomizeDurations = true,
    specificArea = 'Full Body',
    specificDuration = '5',
    processForXP = true
  } = options;
  
  // Validate inputs
  if (count <= 0 || startDaysAgo <= endDaysAgo) {
    throw new Error('Invalid options for generating routine history');
  }
  
  const routines: ProgressEntry[] = [];
  let totalXpEarned = 0;
  const allUnlockedAchievements: any[] = [];
  
  // Available options
  const areas: BodyArea[] = ['Full Body', 'Lower Back', 'Upper Back & Chest', 'Shoulders & Arms', 'Neck', 'Hips & Legs'];
  const durations: Duration[] = ['5', '10', '15'];
  
  // Calculate day range
  const dayRange = startDaysAgo - endDaysAgo;
  
  // Generate routines
  for (let i = 0; i < count; i++) {
    // Random day within range
    const dayOffset = -startDaysAgo + Math.floor(Math.random() * dayRange);
    
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
    return true;
  } catch (error) {
    console.error('Error resetting user progress:', error);
    return false;
  }
};

/**
 * Directly add XP to the user
 */
export const addDirectXP = async (
  amount: number,
  source: string = 'testing',
  details: string = 'Direct XP addition for testing'
): Promise<{
  newTotalXP: number;
  newLevel: number;
  levelUp: boolean;
}> => {
  const userProgress = await storageService.getUserProgress();
  const oldLevel = userProgress.level;
  
  // Add XP using the XP manager
  const result = await xpManager.addXP(amount, source, details, userProgress);
  
  return {
    newTotalXP: result.progress.totalXP,
    newLevel: result.progress.level,
    levelUp: result.progress.level > oldLevel
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