import { Achievement, UserProgress } from '../types';
import { CORE_ACHIEVEMENTS } from '../constants';
import * as storageService from '../../../services/storageService';
import * as streakManager from './streakManager';
import { calculateStreakWithFlexSaves } from './progressTracker';
import * as dateUtils from './utils/dateUtils';
import { gamificationEvents } from '../../../hooks/progress/useGamification';

// Define achievement completed event constant
export const ACHIEVEMENT_COMPLETED_EVENT = 'achievement_completed';

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
  const newlyCompletedAchievements: Achievement[] = [];
  
  // Ensure achievements are initialized
  initializeAchievements(userProgress);
  
  // Process all achievements sequentially
  for (const achievement of Object.values(userProgress.achievements)) {
    if (achievement.completed) {
      // Guard: If something elsewhere set progress < requirement, restore it
      if (achievement.type === 'streak' && (achievement.progress ?? 0) < achievement.requirement) {
        achievement.progress = achievement.requirement;
      }
      continue;                                    // skip normal processing
    }
    
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
        
        // Double check with calculateStreakWithFlexSaves
        const routines = await storageService.getAllRoutines();
        const flexSaveDates = userProgress.rewards?.flex_saves?.appliedDates || [];
        
        // Extract routine dates
        const routineDates = routines
          .filter(r => r.date)
          .map(r => dateUtils.toDateString(r.date));
        
        // Calculate streak with flexSaves
        const calculatedStreak = calculateStreakWithFlexSaves(routineDates, flexSaveDates);
        
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
      // Record the previous completed state
      const wasAlreadyCompleted = achievement.completed;
      
      // Update achievement status
      achievement.completed = true;
      achievement.dateCompleted = new Date().toISOString();
      achievement.badgeUnlocked = false; // Badge has been earned but not acknowledged yet
      userProgress.totalXP += achievement.xp;
      
      console.log(`Achievement completed: ${achievement.title} (+${achievement.xp} XP)`);
      
      // If this is a newly completed achievement, add to the array
      if (!wasAlreadyCompleted) {
        newlyCompletedAchievements.push(achievement);
      }
    }
    
    // Count if progress changed
    if (oldProgress !== achievement.progress) {
      updatedCount++;
      console.log(`Achievement "${achievement.title}" progress updated: ${oldProgress} → ${achievement.progress}`);
    }
  }
  
  // Emit events for newly completed achievements
  if (newlyCompletedAchievements.length > 0) {
    // Send them one at a time to avoid overwhelming the UI
    setTimeout(() => {
      newlyCompletedAchievements.forEach((achievement, index) => {
        // Stagger notifications by 2 seconds each
        setTimeout(() => {
          console.log(`Emitting achievement completed event for: ${achievement.title}`);
          gamificationEvents.emit(ACHIEVEMENT_COMPLETED_EVENT, achievement);
        }, index * 2000);
      });
    }, 1000); // Wait 1 second after routine completion
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

/**
 * Get badge tier based on achievement category
 * @param achievement The achievement to determine badge tier for
 * @returns The badge tier
 */
export const getBadgeTier = (achievement: Achievement): 'bronze' | 'silver' | 'gold' | 'platinum' => {
  // If badge tier is already set, use it
  if (achievement.badgeTier) {
    return achievement.badgeTier;
  }
  
  // Determine tier based on achievement category
  switch (achievement.category) {
    case 'beginner':
      return 'bronze';
    case 'intermediate':
      return 'silver';
    case 'advanced':
      return 'gold';
    case 'elite':
      return 'platinum';
    default:
      // Default based on achievement type and requirement
      if (achievement.type === 'streak') {
        if (achievement.requirement >= 30) return 'platinum';
        if (achievement.requirement >= 14) return 'gold';
        if (achievement.requirement >= 7) return 'silver';
        return 'bronze';
      } else if (achievement.type === 'routine_count') {
        if (achievement.requirement >= 50) return 'platinum';
        if (achievement.requirement >= 30) return 'gold';
        if (achievement.requirement >= 20) return 'silver';
        return 'bronze';
      }
      return 'bronze';
  }
};

/**
 * Mark an achievement badge as unlocked/viewed in the UI
 * @param userProgress User progress object
 * @param achievementId ID of the achievement to mark as unlocked
 * @returns True if the achievement was marked as unlocked, false otherwise
 */
export const markBadgeAsUnlocked = async (userProgress: UserProgress, achievementId: string): Promise<boolean> => {
  if (
    userProgress.achievements && 
    userProgress.achievements[achievementId] && 
    userProgress.achievements[achievementId].completed &&
    !userProgress.achievements[achievementId].badgeUnlocked
  ) {
    userProgress.achievements[achievementId].badgeUnlocked = true;
    await storageService.saveUserProgress(userProgress);
    return true;
  }
  return false;
};

/**
 * Get all newly unlocked achievement badges that haven't been viewed yet
 * @param userProgress User progress object
 * @returns Array of achievements with unlocked but not viewed badges
 */
export const getNewlyUnlockedBadges = (userProgress: UserProgress): Achievement[] => {
  if (!userProgress.achievements) return [];
  
  return Object.values(userProgress.achievements).filter(achievement => 
    achievement.completed && achievement.badgeUnlocked === false
  );
};
