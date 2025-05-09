import { Achievement, UserProgress } from '../types';
import { CORE_ACHIEVEMENTS } from '../constants';
import * as storageService from '../../../services/storageService';
import * as streakManager from './streakManager';
import { calculateStreakWithFreezes } from './progressTracker';

/**
 * Initialize achievements for a user progress object
 * @param userProgress The user progress object to initialize achievements in
 */
export const initializeAchievements = (userProgress: UserProgress): void => {
  // Always ensure achievements object exists
  if (!userProgress.achievements) {
    userProgress.achievements = {};
  }

  // Initialize any missing achievements
  CORE_ACHIEVEMENTS.forEach((achievement) => {
    if (!userProgress.achievements[achievement.id]) {
      userProgress.achievements[achievement.id] = {
        ...achievement,
        progress: 0,
        completed: false
      };
    }
  });

  console.log(`Initialized ${Object.keys(userProgress.achievements).length} achievements`);
};

/**
 * Update achievement progress based on user statistics
 * @param userProgress The user progress object containing achievements and statistics
 * @returns The number of achievements that were updated
 */
export const updateAchievements = async (userProgress: UserProgress): Promise<number> => {
  let updatedCount = 0;
  
  // Ensure achievements are initialized
  initializeAchievements(userProgress);
  
  // Process all achievements sequentially
  for (const achievement of Object.values(userProgress.achievements)) {
    if (!achievement.completed) {
      const stats = userProgress.statistics;
      const oldProgress = achievement.progress || 0; // Ensure progress is initialized
      
      // Update progress based on achievement type
      switch (achievement.type) {
        case 'routine_count': 
          achievement.progress = stats.totalRoutines || 0; 
          break;
        case 'streak': 
          // Get streak from streak manager for consistency
          const streakStatus = await streakManager.getStreakStatus();
          achievement.progress = streakStatus.currentStreak;
          
          // Double check with calculateStreakWithFreezes
          const routines = await storageService.getAllRoutines();
          const freezeDates = userProgress.rewards?.streak_freezes?.appliedDates || [];
          
          // Extract routine dates
          const routineDates = routines
            .filter(r => r.date)
            .map(r => r.date.split('T')[0]);
          
          // Calculate streak with freezes
          const calculatedStreak = calculateStreakWithFreezes(routineDates, freezeDates);
          
          if (calculatedStreak !== achievement.progress) {
            console.log(`Streak discrepancy in achievement: ${achievement.progress} vs ${calculatedStreak}. Using calculated value.`);
            achievement.progress = calculatedStreak;
            
            // Update streak in the streak manager to keep everything in sync
            await streakManager.updateStoredStreak(calculatedStreak);
          }
          break;
        case 'area_variety': 
          achievement.progress = stats.uniqueAreas?.length || 0; 
          break;
        case 'specific_area': 
          achievement.progress = Math.max(...Object.values(stats.routinesByArea || {}).map(count => count || 0), 0); 
          break;
        case 'total_minutes': 
          achievement.progress = stats.totalMinutes || 0; 
          break;
      }
      
      // Check for completion and award XP
      if (achievement.progress >= achievement.requirement) {
        achievement.completed = true;
        achievement.dateCompleted = new Date().toISOString();
        userProgress.totalXP += achievement.xp;
        console.log(`Achievement completed: ${achievement.title} (+${achievement.xp} XP)`);
      }
      
      // Count if progress changed
      if (oldProgress !== achievement.progress) {
        updatedCount++;
        console.log(`Achievement "${achievement.title}" progress updated: ${oldProgress} → ${achievement.progress}`);
      }
    }
  }
  
  if (updatedCount > 0) {
    console.log(`Updated ${updatedCount} achievements`);
  }
  
  return updatedCount;
};

/**
 * Reset progress on streak-related achievements
 * @param userProgress The user progress object containing achievements
 * @returns The number of achievements that were reset
 */
export const resetStreakAchievements = (userProgress: UserProgress): number => {
  let resetCount = 0;
  
  Object.values(userProgress.achievements).forEach(achievement => {
    if (achievement.type === 'streak' && !achievement.completed) {
      const oldProgress = achievement.progress;
      achievement.progress = 0;
      
      if (oldProgress !== 0) {
        console.log(`Reset streak achievement: ${achievement.title} (${oldProgress} → 0)`);
        resetCount++;
      }
    }
  });
  
  return resetCount;
};

/**
 * Get achievements grouped by category and completion status
 * @param userProgress The user progress object containing achievements
 */
export const getAchievementsSummary = (userProgress: UserProgress) => {
  // Ensure achievements are initialized before getting summary
  initializeAchievements(userProgress);
  
  const summary = {
    completed: [] as Achievement[],
    inProgress: [] as Achievement[],
    byCategory: {} as Record<string, Achievement[]>
  };
  
  // Process all achievements
  Object.values(userProgress.achievements).forEach(achievement => {
    // Add to completed or in-progress
    if (achievement.completed) {
      summary.completed.push(achievement);
    } else if (achievement.progress > 0) { // Only add to in-progress if there's actual progress
      summary.inProgress.push(achievement);
    }
    
    // Add to category
    const category = achievement.category;
    if (!summary.byCategory[category]) {
      summary.byCategory[category] = [];
    }
    summary.byCategory[category].push(achievement);
  });
  

  
  return summary;
};
