import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProgressEntry } from '../types';
import { calculateStreak } from './progressUtils';

// Define types for the progress system
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: number;
  progress: number;
  completed: boolean;
  dateCompleted?: string;
  xp: number;
  category: 'beginner' | 'intermediate' | 'advanced' | 'elite';
  type: 'routine_count' | 'streak' | 'area_variety' | 'total_time' | 'specific_area';
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: number;
  progress: number;
  completed: boolean;
  dateCompleted?: string;
  xp: number;
  startDate: string;
  endDate: string;
  type: 'routine_count' | 'streak' | 'specific_area' | 'time_based';
}

export interface Reward {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  dateUnlocked?: string;
  levelRequired: number;
  type: 'theme' | 'feature' | 'content';
}

export interface UserProgress {
  totalXP: number;
  level: number;
  achievements: Record<string, Achievement>;
  challenges: Record<string, Challenge>;
  rewards: Record<string, Reward>;
  stats: {
    totalRoutines: number;
    totalMinutes: number;
    currentStreak: number;
    bestStreak: number;
    uniqueAreas: string[];
    routinesByArea: Record<string, number>;
    lastUpdated: string;
  };
  lastUpdated: string;
}

// Level definitions
export const LEVELS = [
  { level: 1, xpRequired: 0, title: 'Stretching Novice' },
  { level: 2, xpRequired: 200, title: 'Flexibility Enthusiast' },
  { level: 3, xpRequired: 500, title: 'Stretching Regular' },
  { level: 4, xpRequired: 1000, title: 'Flexibility Pro' },
  { level: 5, xpRequired: 2000, title: 'Stretching Expert' },
  { level: 6, xpRequired: 3500, title: 'Flexibility Master' },
  { level: 7, xpRequired: 5000, title: 'Stretching Guru' },
  { level: 8, xpRequired: 7500, title: 'Flexibility Champion' },
  { level: 9, xpRequired: 10000, title: 'Stretching Legend' },
  { level: 10, xpRequired: 15000, title: 'Ultimate Flexibility Master' }
];

// Default achievements
export const DEFAULT_ACHIEVEMENTS: Record<string, Achievement> = {
  first_routine: {
    id: 'first_routine',
    title: 'First Steps',
    description: 'Complete your first routine',
    icon: 'checkmark-circle-outline',
    requirement: 1,
    progress: 0,
    completed: false,
    xp: 50,
    category: 'beginner',
    type: 'routine_count'
  },
  routine_streak_3: {
    id: 'routine_streak_3',
    title: 'Consistency Starter',
    description: '3-day streak achieved',
    icon: 'flame-outline',
    requirement: 3,
    progress: 0,
    completed: false,
    xp: 100,
    category: 'beginner',
    type: 'streak'
  },
  routine_streak_7: {
    id: 'routine_streak_7',
    title: 'Weekly Warrior',
    description: '7-day streak achieved',
    icon: 'calendar-outline',
    requirement: 7,
    progress: 0,
    completed: false,
    xp: 200,
    category: 'intermediate',
    type: 'streak'
  },
  routine_count_10: {
    id: 'routine_count_10',
    title: 'Dedicated Stretcher',
    description: 'Complete 10 routines',
    icon: 'trophy-outline',
    requirement: 10,
    progress: 0,
    completed: false,
    xp: 150,
    category: 'beginner',
    type: 'routine_count'
  },
  area_variety_3: {
    id: 'area_variety_3',
    title: 'Body Explorer',
    description: 'Stretch 3 different body areas',
    icon: 'body-outline',
    requirement: 3,
    progress: 0,
    completed: false,
    xp: 100,
    category: 'beginner',
    type: 'area_variety'
  },
  total_time_60: {
    id: 'total_time_60',
    title: 'Time Investment',
    description: 'Spend 60+ minutes stretching',
    icon: 'time-outline',
    requirement: 60,
    progress: 0,
    completed: false,
    xp: 100,
    category: 'beginner',
    type: 'total_time'
  },
  routine_count_25: {
    id: 'routine_count_25',
    title: 'Stretch Enthusiast',
    description: 'Complete 25 routines',
    icon: 'ribbon-outline',
    requirement: 25,
    progress: 0,
    completed: false,
    xp: 250,
    category: 'intermediate',
    type: 'routine_count'
  },
  routine_streak_14: {
    id: 'routine_streak_14',
    title: 'Fortnight Flexer',
    description: '14-day streak achieved',
    icon: 'flame-outline',
    requirement: 14,
    progress: 0,
    completed: false,
    xp: 300,
    category: 'intermediate',
    type: 'streak'
  },
  total_time_300: {
    id: 'total_time_300',
    title: 'Dedicated Stretcher',
    description: 'Spend 300+ minutes stretching',
    icon: 'hourglass-outline',
    requirement: 300,
    progress: 0,
    completed: false,
    xp: 250,
    category: 'intermediate',
    type: 'total_time'
  },
  routine_count_50: {
    id: 'routine_count_50',
    title: 'Flexibility Devotee',
    description: 'Complete 50 routines',
    icon: 'medal-outline',
    requirement: 50,
    progress: 0,
    completed: false,
    xp: 500,
    category: 'advanced',
    type: 'routine_count'
  },
  routine_streak_30: {
    id: 'routine_streak_30',
    title: 'Monthly Milestone',
    description: '30-day streak achieved',
    icon: 'calendar-number-outline',
    requirement: 30,
    progress: 0,
    completed: false,
    xp: 500,
    category: 'advanced',
    type: 'streak'
  },
  specific_area_15: {
    id: 'specific_area_15',
    title: 'Area Expert',
    description: 'Complete 15 routines in one body area',
    icon: 'fitness-outline',
    requirement: 15,
    progress: 0,
    completed: false,
    xp: 350,
    category: 'advanced',
    type: 'specific_area'
  },
  routine_count_100: {
    id: 'routine_count_100',
    title: 'Stretch Guru',
    description: 'Complete 100 routines',
    icon: 'medal-outline',
    requirement: 100,
    progress: 0,
    completed: false,
    xp: 1000,
    category: 'elite',
    type: 'routine_count'
  },
  routine_streak_60: {
    id: 'routine_streak_60',
    title: 'Iron Flexibility',
    description: '60-day streak achieved',
    icon: 'infinite-outline',
    requirement: 60,
    progress: 0,
    completed: false,
    xp: 1500,
    category: 'elite',
    type: 'streak'
  }
};

// Default rewards
export const DEFAULT_REWARDS: Record<string, Reward> = {
  dark_theme: {
    id: 'dark_theme',
    title: 'Dark Theme',
    description: 'Unlock the dark theme for the app',
    icon: 'moon-outline',
    unlocked: false,
    levelRequired: 2,
    type: 'theme'
  },
  custom_routines: {
    id: 'custom_routines',
    title: 'Custom Routines',
    description: 'Create and save your own custom routines',
    icon: 'create-outline',
    unlocked: false,
    levelRequired: 3,
    type: 'feature'
  },
  advanced_stats: {
    id: 'advanced_stats',
    title: 'Advanced Statistics',
    description: 'Access detailed statistics about your stretching habits',
    icon: 'stats-chart-outline',
    unlocked: false,
    levelRequired: 4,
    type: 'feature'
  },
  expert_routines: {
    id: 'expert_routines',
    title: 'Expert Routines',
    description: 'Unlock advanced stretching routines',
    icon: 'star-outline',
    unlocked: false,
    levelRequired: 5,
    type: 'content'
  }
};

// Initial user progress state
export const INITIAL_USER_PROGRESS: UserProgress = {
  totalXP: 0,
  level: 1,
  achievements: DEFAULT_ACHIEVEMENTS,
  challenges: {},
  rewards: DEFAULT_REWARDS,
  stats: {
    totalRoutines: 0,
    totalMinutes: 0,
    currentStreak: 0,
    bestStreak: 0,
    uniqueAreas: [],
    routinesByArea: {},
    lastUpdated: new Date().toISOString()
  },
  lastUpdated: new Date().toISOString()
};

/**
 * Get user progress from storage
 */
export const getUserProgress = async (): Promise<UserProgress> => {
  try {
    const jsonValue = await AsyncStorage.getItem('@userProgress');
    if (jsonValue !== null) {
      return JSON.parse(jsonValue);
    }
    return INITIAL_USER_PROGRESS;
  } catch (error) {
    console.error('Error getting user progress:', error);
    return INITIAL_USER_PROGRESS;
  }
};

/**
 * Save user progress to storage
 */
export const saveUserProgress = async (progress: UserProgress): Promise<boolean> => {
  try {
    const jsonValue = JSON.stringify({
      ...progress,
      lastUpdated: new Date().toISOString()
    });
    await AsyncStorage.setItem('@userProgress', jsonValue);
    return true;
  } catch (error) {
    console.error('Error saving user progress:', error);
    return false;
  }
};

/**
 * Calculate level based on XP
 */
export const calculateLevel = (xp: number): number => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      return LEVELS[i].level;
    }
  }
  return 1; // Default to level 1
};

/**
 * Add XP to user progress and check for level up
 */
export const addXP = async (xpToAdd: number): Promise<{ leveledUp: boolean; newLevel: number; newTotalXP: number }> => {
  if (xpToAdd <= 0) {
    return { leveledUp: false, newLevel: 0, newTotalXP: 0 };
  }

  const userProgress = await getUserProgress();
  const newTotalXP = userProgress.totalXP + xpToAdd;
  const newLevel = calculateLevel(newTotalXP);
  const leveledUp = newLevel > userProgress.level;

  // Update user progress
  const updatedProgress = {
    ...userProgress,
    totalXP: newTotalXP,
    level: newLevel
  };

  // Check for newly unlocked rewards
  if (leveledUp) {
    const updatedRewards = { ...updatedProgress.rewards };

    Object.keys(updatedRewards).forEach(rewardId => {
      const reward = updatedRewards[rewardId];
      if (!reward.unlocked && reward.levelRequired <= newLevel) {
        updatedRewards[rewardId] = {
          ...reward,
          unlocked: true,
          dateUnlocked: new Date().toISOString()
        };
      }
    });

    updatedProgress.rewards = updatedRewards;
  }

  // Save updated progress
  await saveUserProgress(updatedProgress);

  return { leveledUp, newLevel, newTotalXP };
};

/**
 * Update user progress with completed routines
 */
export const updateProgressWithRoutines = async (routines: ProgressEntry[]): Promise<{
  xpEarned: number;
  leveledUp: boolean;
  achievementsCompleted: string[];
  challengesCompleted: string[];
}> => {
  if (!routines.length) {
    return { xpEarned: 0, leveledUp: false, achievementsCompleted: [], challengesCompleted: [] };
  }

  try {
    const userProgress = await getUserProgress();
    
    // Ensure userProgress has the required structure
    if (!userProgress.stats) {
      userProgress.stats = {
        totalRoutines: 0,
        totalMinutes: 0,
        currentStreak: 0,
        bestStreak: 0,
        uniqueAreas: [],
        routinesByArea: {},
        lastUpdated: new Date().toISOString()
      };
    }
    
    // Calculate statistics from routines
    const routineCount = routines.length;
    
    // Calculate total minutes
    const totalMinutes = routines.reduce((sum, entry) => {
      const duration = typeof entry.duration === 'string' 
        ? parseInt(entry.duration, 10) 
        : (typeof entry.duration === 'number' ? entry.duration : 0);
        
      return sum + duration;
    }, 0);
    
    // Get unique areas
    const uniqueAreas = [...new Set(routines.map(routine => routine.area))];
    
    // Count routines by area
    const routinesByArea: Record<string, number> = {};
    routines.forEach(routine => {
      if (!routinesByArea[routine.area]) {
        routinesByArea[routine.area] = 0;
      }
      routinesByArea[routine.area]++;
    });
    
    // Calculate current streak
    const currentStreak = calculateStreak(routines);
    
    // Update user stats
    const updatedStats = {
      totalRoutines: routineCount,
      totalMinutes,
      currentStreak,
      bestStreak: Math.max((userProgress.stats && userProgress.stats.bestStreak) || 0, currentStreak),
      uniqueAreas,
      routinesByArea,
      lastUpdated: new Date().toISOString()
    };
    
    // Check achievements
    let totalXpEarned = 0;
    const achievementsCompleted: string[] = [];
    const updatedAchievements = { ...userProgress.achievements };
    
    // Process each achievement
    Object.keys(updatedAchievements).forEach(id => {
      const achievement = updatedAchievements[id];
      
      if (!achievement.completed) {
        let newProgress = achievement.progress;
        
        // Update progress based on achievement type
        switch (achievement.type) {
          case 'routine_count':
            newProgress = routineCount;
            break;
          case 'streak':
            newProgress = currentStreak;
            break;
          case 'area_variety':
            newProgress = uniqueAreas.length;
            break;
          case 'total_time':
            newProgress = totalMinutes;
            break;
          case 'specific_area':
            if (Object.keys(routinesByArea).length > 0) {
              newProgress = Math.max(...Object.values(routinesByArea));
            }
            break;
        }
        
        // Check if achievement is completed
        if (newProgress >= achievement.requirement && !achievement.completed) {
          totalXpEarned += achievement.xp;
          achievementsCompleted.push(id);
          
          updatedAchievements[id] = {
            ...achievement,
            progress: newProgress,
            completed: true,
            dateCompleted: new Date().toISOString()
          };
        } else if (newProgress !== achievement.progress) {
          // Just update progress
          updatedAchievements[id] = {
            ...achievement,
            progress: newProgress
          };
        }
      }
    });
    
    // Check active challenges
    const challengesCompleted: string[] = [];
    const updatedChallenges = { ...userProgress.challenges };
    
    Object.keys(updatedChallenges).forEach(id => {
      const challenge = updatedChallenges[id];
      
      // Skip if already completed or expired
      if (challenge.completed || new Date(challenge.endDate) < new Date()) {
        return;
      }
      
      let newProgress = challenge.progress;
      
      // Update progress based on challenge type
      switch (challenge.type) {
        case 'routine_count':
          // Count routines completed during the challenge period
          newProgress = routines.filter(r => {
            const routineDate = new Date(r.date);
            return routineDate >= new Date(challenge.startDate) && 
                   routineDate <= new Date(challenge.endDate);
          }).length;
          break;
        case 'streak':
          newProgress = currentStreak;
          break;
        case 'specific_area':
          // Count routines for a specific area during the challenge period
          const areaRoutines = routines.filter(r => {
            const routineDate = new Date(r.date);
            return r.area === challenge.id.split('_').pop() && 
                   routineDate >= new Date(challenge.startDate) && 
                   routineDate <= new Date(challenge.endDate);
          });
          newProgress = areaRoutines.length;
          break;
        case 'time_based':
          // Calculate total minutes during the challenge period
          newProgress = routines
            .filter(r => {
              const routineDate = new Date(r.date);
              return routineDate >= new Date(challenge.startDate) && 
                     routineDate <= new Date(challenge.endDate);
            })
            .reduce((sum, entry) => {
              const duration = typeof entry.duration === 'string' 
                ? parseInt(entry.duration, 10) 
                : (typeof entry.duration === 'number' ? entry.duration : 0);
              
              return sum + (isNaN(duration) ? 0 : duration);
            }, 0);
          break;
      }
      
      // Check if challenge is completed
      if (newProgress >= challenge.requirement && !challenge.completed) {
        totalXpEarned += challenge.xp;
        challengesCompleted.push(id);
        
        updatedChallenges[id] = {
          ...challenge,
          progress: newProgress,
          completed: true,
          dateCompleted: new Date().toISOString()
        };
      } else if (newProgress !== challenge.progress) {
        // Just update progress
        updatedChallenges[id] = {
          ...challenge,
          progress: newProgress
        };
      }
    });
    
    // Update user progress
    const updatedProgress = {
      ...userProgress,
      achievements: updatedAchievements,
      challenges: updatedChallenges,
      stats: updatedStats
    };
    
    await saveUserProgress(updatedProgress);
    
    // Add XP if earned
    let leveledUp = false;
    if (totalXpEarned > 0) {
      const xpResult = await addXP(totalXpEarned);
      leveledUp = xpResult.leveledUp;
    }
    
    return {
      xpEarned: totalXpEarned,
      leveledUp,
      achievementsCompleted,
      challengesCompleted
    };
  } catch (error) {
    console.error('Error updating progress with routines:', error);
    return { xpEarned: 0, leveledUp: false, achievementsCompleted: [], challengesCompleted: [] };
  }
};

/**
 * Create a new challenge
 */
export const createChallenge = async (challenge: Omit<Challenge, 'progress' | 'completed' | 'dateCompleted'>): Promise<boolean> => {
  try {
    const userProgress = await getUserProgress();
    
    // Add new challenge
    const newChallenge: Challenge = {
      ...challenge,
      progress: 0,
      completed: false
    };
    
    const updatedProgress = {
      ...userProgress,
      challenges: {
        ...userProgress.challenges,
        [challenge.id]: newChallenge
      }
    };
    
    await saveUserProgress(updatedProgress);
    return true;
  } catch (error) {
    console.error('Error creating challenge:', error);
    return false;
  }
};

/**
 * Get active challenges
 */
export const getActiveChallenges = async (): Promise<Challenge[]> => {
  try {
    const userProgress = await getUserProgress();
    const now = new Date();
    
    return Object.values(userProgress.challenges).filter(challenge => 
      !challenge.completed && 
      new Date(challenge.endDate) >= now
    );
  } catch (error) {
    console.error('Error getting active challenges:', error);
    return [];
  }
};

/**
 * Get completed challenges
 */
export const getCompletedChallenges = async (): Promise<Challenge[]> => {
  try {
    const userProgress = await getUserProgress();
    
    return Object.values(userProgress.challenges).filter(challenge => 
      challenge.completed
    );
  } catch (error) {
    console.error('Error getting completed challenges:', error);
    return [];
  }
};

/**
 * Get unlocked achievements
 */
export const getUnlockedAchievements = async (): Promise<Achievement[]> => {
  try {
    const userProgress = await getUserProgress();
    
    return Object.values(userProgress.achievements).filter(achievement => 
      achievement.completed
    );
  } catch (error) {
    console.error('Error getting unlocked achievements:', error);
    return [];
  }
};

/**
 * Get in-progress achievements
 */
export const getInProgressAchievements = async (): Promise<Achievement[]> => {
  try {
    const userProgress = await getUserProgress();
    
    return Object.values(userProgress.achievements).filter(achievement => 
      !achievement.completed && achievement.progress > 0
    );
  } catch (error) {
    console.error('Error getting in-progress achievements:', error);
    return [];
  }
};

/**
 * Get unlocked rewards
 */
export const getUnlockedRewards = async (): Promise<Reward[]> => {
  try {
    const userProgress = await getUserProgress();
    
    return Object.values(userProgress.rewards).filter(reward => 
      reward.unlocked
    );
  } catch (error) {
    console.error('Error getting unlocked rewards:', error);
    return [];
  }
};

/**
 * Reset user progress (for testing)
 */
export const resetUserProgress = async (): Promise<boolean> => {
  try {
    await saveUserProgress(INITIAL_USER_PROGRESS);
    return true;
  } catch (error) {
    console.error('Error resetting user progress:', error);
    return false;
  }
}; 