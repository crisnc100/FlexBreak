import { Achievement, UserProgress, ProgressUpdateResult } from './types';
import * as storageService from '../../services/storageService';
import * as xpManager from './xpManager';

/**
 * Core achievement definitions with proper XP values
 */
const CORE_ACHIEVEMENTS = {
  // Routine quantity achievements
  routine_5: {
    id: 'routine_5',
    title: 'Getting Started',
    description: 'Complete 5 stretching routines',
    icon: 'trophy',
    requirement: 5,
    progress: 0,
    completed: false,
    xp: 25,
    category: 'progress',
    uiCategory: 'beginner',
    type: 'routine_count'
  },
  routine_20: {
    id: 'routine_20',
    title: 'Regular Stretcher',
    description: 'Complete 20 stretching routines',
    icon: 'trophy',
    requirement: 20,
    progress: 0,
    completed: false,
    xp: 75,
    category: 'progress',
    uiCategory: 'intermediate',
    type: 'routine_count'
  },
  routine_30: {
    id: 'routine_30',
    title: 'Stretch Master',
    description: 'Complete 30 stretching routines',
    icon: 'trophy',
    requirement: 30,
    progress: 0,
    completed: false,
    xp: 100,
    category: 'progress',
    uiCategory: 'advanced',
    type: 'routine_count'
  },
  routine_50: {
    id: 'routine_50',
    title: 'Flexibility Devotee',
    description: 'Complete 50 routines',
    icon: 'trophy',
    requirement: 50,
    progress: 0,
    completed: false,
    xp: 200,
    category: 'progress',
    uiCategory: 'advanced',
    type: 'routine_count'
  },
  routine_100: {
    id: 'routine_100',
    title: 'Stretch Guru',
    description: 'Complete 100 routines',
    icon: 'trophy',
    requirement: 100,
    progress: 0,
    completed: false,
    xp: 300,
    category: 'progress',
    uiCategory: 'elite',
    type: 'routine_count'
  },
  routine_200: {
    id: 'routine_200',
    title: 'Flexibility Legend',
    description: 'Complete 200 routines',
    icon: 'trophy',
    requirement: 200,
    progress: 0,
    completed: false,
    xp: 500,
    category: 'progress',
    uiCategory: 'elite',
    type: 'routine_count'
  },
  
  // Streak achievements
  streak_3: {
    id: 'streak_3',
    title: 'Getting Into It',
    description: 'Maintain a 3-day stretching streak',
    icon: 'flame',
    requirement: 3,
    progress: 0,
    completed: false,
    xp: 25,
    category: 'streaks',
    uiCategory: 'beginner',
    type: 'streak'
  },
  streak_7: {
    id: 'streak_7',
    title: 'Weekly Warrior',
    description: 'Maintain a 7-day stretching streak',
    icon: 'flame',
    requirement: 7,
    progress: 0,
    completed: false,
    xp: 50,
    category: 'streaks',
    uiCategory: 'beginner',
    type: 'streak'
  },
  streak_14: {
    id: 'streak_14',
    title: 'Fortnight Flexer',
    description: 'Maintain a 14-day stretching streak',
    icon: 'flame',
    requirement: 14,
    progress: 0,
    completed: false,
    xp: 100,
    category: 'streaks',
    uiCategory: 'intermediate',
    type: 'streak'
  },
  streak_30: {
    id: 'streak_30',
    title: 'Monthly Milestone',
    description: 'Maintain a 30-day stretching streak',
    icon: 'flame',
    requirement: 30,
    progress: 0,
    completed: false,
    xp: 200,
    category: 'streaks',
    uiCategory: 'advanced',
    type: 'streak'
  },
  streak_60: {
    id: 'streak_60',
    title: 'Iron Flexibility',
    description: 'Maintain a 60-day stretching streak',
    icon: 'flame',
    requirement: 60,
    progress: 0,
    completed: false,
    xp: 350,
    category: 'streaks',
    uiCategory: 'elite',
    type: 'streak'
  },
  streak_365: {
    id: 'streak_365',
    title: 'Year of Flexibility',
    description: 'Maintain a 365-day stretching streak',
    icon: 'flame',
    requirement: 365,
    progress: 0,
    completed: false,
    xp: 500,
    category: 'streaks',
    uiCategory: 'elite',
    type: 'streak'
  },
  
  // Area variety achievements
  areas_3: {
    id: 'areas_3',
    title: 'Variety Beginner',
    description: 'Stretch 3 different body areas',
    icon: 'body',
    requirement: 3,
    progress: 0,
    completed: false,
    xp: 30,
    category: 'variety',
    uiCategory: 'beginner',
    type: 'area_variety'
  },
  areas_all: {
    id: 'areas_all',
    title: 'Variety Master',
    description: 'Stretch all body areas at least once',
    icon: 'body',
    requirement: 6, // Assuming 6 total areas
    progress: 0,
    completed: false,
    xp: 75,
    category: 'variety',
    uiCategory: 'intermediate',
    type: 'area_variety'
  },
  area_expert: {
    id: 'area_expert',
    title: 'Area Expert',
    description: 'Complete 15 routines in one body area',
    icon: 'body',
    requirement: 15,
    progress: 0,
    completed: false,
    xp: 150,
    category: 'variety',
    uiCategory: 'advanced',
    type: 'specific_area'
  },
  master_all_areas: {
    id: 'master_all_areas',
    title: 'Master of All Areas',
    description: 'Complete 30 routines in each body area',
    icon: 'body',
    requirement: 30,
    progress: 0,
    completed: false,
    xp: 400,
    category: 'variety',
    uiCategory: 'elite',
    type: 'specific_area'
  },
  
  // Time-based achievements
  minutes_60: {
    id: 'minutes_60',
    title: 'Time Investment',
    description: 'Complete 60 total minutes of stretching',
    icon: 'time',
    requirement: 60,
    progress: 0,
    completed: false,
    xp: 50,
    category: 'time',
    uiCategory: 'beginner',
    type: 'total_minutes'
  },
  minutes_300: {
    id: 'minutes_300',
    title: 'Dedicated Stretcher',
    description: 'Complete 300 total minutes of stretching',
    icon: 'time',
    requirement: 300,
    progress: 0,
    completed: false,
    xp: 100,
    category: 'time',
    uiCategory: 'intermediate',
    type: 'total_minutes'
  },
  minutes_1000: {
    id: 'minutes_1000',
    title: 'Time Dedication',
    description: 'Complete 1000 total minutes of stretching',
    icon: 'time',
    requirement: 1000,
    progress: 0,
    completed: false,
    xp: 200,
    category: 'time',
    uiCategory: 'advanced',
    type: 'total_minutes'
  }
};

/**
 * Initialize achievements for a new user
 * @returns Initial achievements object
 */
export const initializeAchievements = (): Record<string, Achievement> => {
  return { ...CORE_ACHIEVEMENTS };
};

/**
 * Get all achievements
 * @returns All achievements
 */
export const getAllAchievements = async (): Promise<Achievement[]> => {
  const userProgress = await storageService.getUserProgress();
  return Object.values(userProgress.achievements || {});
};

/**
 * Get completed achievements
 * @returns Completed achievements
 */
export const getCompletedAchievements = async (): Promise<Achievement[]> => {
  const userProgress = await storageService.getUserProgress();
  return Object.values(userProgress.achievements || {})
    .filter(achievement => achievement.completed);
};

/**
 * Get in-progress achievements
 * @returns In-progress achievements
 */
export const getInProgressAchievements = async (): Promise<Achievement[]> => {
  const userProgress = await storageService.getUserProgress();
  return Object.values(userProgress.achievements || {})
    .filter(achievement => !achievement.completed && achievement.progress > 0);
};

/**
 * Update achievements based on current user progress
 * This is the main function that checks and auto-awards achievements
 * @param userProgress Current user progress
 * @returns Updated user progress with any newly unlocked achievements
 */
export const updateAchievements = async (
  userProgress: UserProgress
): Promise<ProgressUpdateResult> => {
  console.log('Checking for achievement updates...');
  console.log('Statistics for achievement updates:', JSON.stringify(userProgress.statistics));
  
  // Create a copy of the user's achievements
  let achievements = { ...userProgress.achievements };
  
  // Initialize achievements if needed
  if (!achievements || Object.keys(achievements).length === 0) {
    achievements = initializeAchievements();
  }
  
  // Track changes
  let updatedProgress = { ...userProgress, achievements };
  let totalXpEarned = 0;
  const unlockedAchievements: Achievement[] = [];
  
  // Get statistics
  const { statistics } = userProgress;
  
  // Process each achievement
  for (const achievementId in achievements) {
    const achievement = achievements[achievementId];
    
    // Skip already completed achievements
    if (achievement.completed) continue;
    
    let newProgress = 0;
    
    // Update progress based on achievement type
    switch (achievement.type) {
      case 'routine_count':
        newProgress = statistics.totalRoutines;
        console.log(`Routine count achievement ${achievement.id}: Progress=${newProgress}/${achievement.requirement}`);
        break;
        
      case 'streak':
        console.log(`Checking Streak achievement ${achievement.id}:`);
        
        // Consider both current streak and best streak for achievements
        // This ensures achievements aren't lost if streak is reset but was previously achieved
        const effectiveStreak = Math.max(statistics.currentStreak, statistics.bestStreak || 0);
        console.log(`Current streak: ${statistics.currentStreak}, Best streak: ${statistics.bestStreak}, Effective streak: ${effectiveStreak}, Requirement: ${achievement.requirement}`);
        
        // Use the effective streak for achievement progress
        newProgress = effectiveStreak;
        console.log(`Setting achievement progress to: ${newProgress}`);
        break;
        
      case 'total_minutes':
        // Handle if totalMinutes doesn't exist yet
        newProgress = (statistics as any).totalMinutes || 0;
        console.log(`Total minutes achievement ${achievement.id}: Progress=${newProgress}/${achievement.requirement}`);
        break;
        
      case 'area_variety':
        // Map area names to standard categories for accurate tracking
        const areaMapping = {
          'neck': ['neck', 'Neck'],
          'shoulders': ['shoulders', 'Shoulders', 'Shoulders & Arms'],
          'back': ['back', 'Back', 'Upper Back', 'Lower Back', 'Upper Back & Chest'],
          'hips': ['hips', 'Hips'],
          'legs': ['legs', 'Legs'],
          'full_body': ['full_body', 'Full Body']
        };
        
        // Count unique standard categories
        const standardAreasUsed = new Set();
        statistics.uniqueAreas.forEach(area => {
          // Try to map this area to a standard category
          for (const [standardArea, variations] of Object.entries(areaMapping)) {
            if (variations.includes(area)) {
              standardAreasUsed.add(standardArea);
              break;
            }
          }
        });
        
        // Progress is based on number of unique standard categories
        newProgress = standardAreasUsed.size;
        console.log(`Area variety achievement ${achievement.id}: Progress=${newProgress}/${achievement.requirement} (standard categories)`);
        break;
        
      case 'specific_area':
        // Area expert achievement - for most stretched area
        if (achievement.id === 'area_expert') {
          // Find the area with the most routines
          let maxRoutines = 0;
          Object.entries(statistics.routinesByArea || {}).forEach(([area, count]) => {
            const routineCount = count as number;
            if (routineCount > maxRoutines) {
              maxRoutines = routineCount;
            }
          });
          newProgress = maxRoutines;
          console.log(`Area expert achievement ${achievement.id}: Progress=${newProgress}/${achievement.requirement} (most routines in a single area)`);
        }
        // Master of all areas - check if ALL areas have at least the required number
        else if (achievement.id === 'master_all_areas') {
          // Map area names to account for variations in naming
          const areaMapping = {
            'neck': ['neck', 'Neck'],
            'shoulders': ['shoulders', 'Shoulders', 'Shoulders & Arms'],
            'back': ['back', 'Back', 'Upper Back', 'Lower Back', 'Upper Back & Chest'],
            'hips': ['hips', 'Hips'],
            'legs': ['legs', 'Legs'],
            'full_body': ['full_body', 'Full Body']
          };
          
          // Count areas that meet the requirement
          let areasWithRequiredRoutines = 0;
          
          // Keep track of which areas have been checked
          const checkedAreas = new Set();
          
          // Check each area category
          Object.entries(areaMapping).forEach(([standardArea, variations]) => {
            let totalRoutinesForArea = 0;
            
            // Sum up all variations for this area
            variations.forEach(variation => {
              const count = statistics.routinesByArea[variation] || 0;
              totalRoutinesForArea += count;
              console.log(`Area ${variation} (maps to ${standardArea}): ${count} routines`);
            });
            
            // If this area meets the requirement, increment counter
            if (totalRoutinesForArea >= achievement.requirement) {
              areasWithRequiredRoutines++;
              console.log(`${standardArea} area has enough routines: ${totalRoutinesForArea} >= ${achievement.requirement}`);
            } else {
              console.log(`${standardArea} area needs more routines: ${totalRoutinesForArea}/${achievement.requirement}`);
            }
            
            // Mark area as checked
            checkedAreas.add(standardArea);
          });
          
          // Check for any areas that might not be in the mapping
          Object.keys(statistics.routinesByArea).forEach(area => {
            let mapped = false;
            Object.entries(areaMapping).forEach(([standardArea, variations]) => {
              if (variations.includes(area)) {
                mapped = true;
              }
            });
            
            if (!mapped) {
              console.log(`Unmapped area found: ${area} with ${statistics.routinesByArea[area]} routines`);
            }
          });
          
          // Progress is based on how many standard areas have the required number
          newProgress = areasWithRequiredRoutines;
          console.log(`Master all areas achievement ${achievement.id}: Progress=${newProgress}/${Object.keys(areaMapping).length} areas with ${achievement.requirement}+ routines`);
        }
        // Other specific area achievements
        else if (achievement.area) {
          newProgress = statistics.routinesByArea[achievement.area] || 0;
          console.log(`Specific area achievement ${achievement.id}: Progress=${newProgress}/${achievement.requirement}`);
        }
        break;
    }
    
    // Update achievement with new progress
    const updatedAchievement = {
      ...achievement,
      progress: newProgress
    };
    
    // Check if achievement is newly completed
    const shouldComplete = newProgress >= achievement.requirement && !achievement.completed;
    
    if (shouldComplete) {
      // Mark as completed with timestamp
      updatedAchievement.completed = true;
      updatedAchievement.dateCompleted = new Date().toISOString();
      
      console.log(`Achievement unlocked: ${achievement.title} (+${achievement.xp} XP)`);
      
      // Add XP for completing the achievement
      const result = await xpManager.addXP(
        achievement.xp,
        'achievement',
        `Completed: ${achievement.title}`,
        updatedProgress
      );
      
      // Update for next achievement in sequence
      updatedProgress = result.progress;
      totalXpEarned += achievement.xp;
      unlockedAchievements.push(updatedAchievement);
    } else if (achievement.progress !== newProgress) {
      console.log(`Achievement progress updated: ${achievement.title} (${achievement.progress} -> ${newProgress})`);
    }
    
    // Save updated achievement
    achievements[achievementId] = updatedAchievement;
  }
  
  // Final update with all achievements
  updatedProgress = {
    ...updatedProgress,
    achievements
  };
  
  // Save updated progress
  await storageService.saveUserProgress(updatedProgress);
  
  return {
    progress: updatedProgress,
    xpEarned: totalXpEarned,
    unlockedAchievements
  };
};

/**
 * Check if a specific achievement is completed
 * @param achievementId ID of the achievement to check
 * @returns Boolean indicating if completed
 */
export const isAchievementCompleted = async (
  achievementId: string
): Promise<boolean> => {
  const userProgress = await storageService.getUserProgress();
  const achievement = userProgress.achievements[achievementId];
  
  if (!achievement) return false;
  return achievement.completed;
};

/**
 * Get progress for a specific achievement
 * @param achievementId ID of the achievement to check
 * @returns Current progress and requirement
 */
export const getAchievementProgress = async (
  achievementId: string
): Promise<{ current: number; required: number; percent: number } | null> => {
  const userProgress = await storageService.getUserProgress();
  const achievement = userProgress.achievements[achievementId];
  
  if (!achievement) return null;
  
  const percent = Math.min(
    100, 
    Math.round((achievement.progress / achievement.requirement) * 100)
  );
  
  return {
    current: achievement.progress,
    required: achievement.requirement,
    percent
  };
};

/**
 * Reset streak-related achievement progress when a streak is broken
 * This preserves completed achievements but resets the in-progress ones
 */
export const resetStreakAchievements = async (): Promise<UserProgress> => {
  console.log('Resetting streak-related achievements due to broken streak');
  
  try {
    // Get current user progress
    const userProgress = await storageService.getUserProgress();
    let achievementsUpdated = false;
    
    // Check if achievements exist
    if (!userProgress.achievements || typeof userProgress.achievements !== 'object') {
      console.log('No achievements found or achievements is not an object');
      // Initialize achievements if needed
      userProgress.achievements = initializeAchievements();
      return userProgress;
    }
    
    // Clone the achievements object
    const updatedAchievements = { ...userProgress.achievements };
    
    // Get all streak-related achievements
    const streakAchievementIds = Object.keys(updatedAchievements).filter(id => 
      id.startsWith('streak_') && !updatedAchievements[id].completed
    );
    
    console.log(`Found ${streakAchievementIds.length} incomplete streak achievements to reset`);
    
    // Reset progress for incomplete streak achievements
    streakAchievementIds.forEach(id => {
      if (!updatedAchievements[id].completed) {
        updatedAchievements[id].progress = 0;
        achievementsUpdated = true;
        console.log(`Reset progress for achievement: ${id}`);
      }
    });
    
    // Only save if we made changes
    if (achievementsUpdated) {
      // Create updated progress object
      const updatedProgress = {
        ...userProgress,
        achievements: updatedAchievements
      };
      
      // Save to storage
      await storageService.saveUserProgress(updatedProgress);
      console.log('Saved updated user progress with reset streak achievements');
      
      return updatedProgress;
    }
    
    return userProgress;
  } catch (error) {
    console.error('Error resetting streak achievements:', error);
    return await storageService.getUserProgress();
  }
}; 