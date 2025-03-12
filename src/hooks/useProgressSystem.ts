import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BodyArea, ProgressEntry } from '../types';
import { measureAsyncOperation } from '../utils/performance';

// Achievement structure
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  requirement: number;
  type: 'routine_count' | 'streak' | 'area_variety' | 'total_time' | 'custom';
  progress: number;
  completed: boolean;
  dateCompleted?: string;
  xpReward: number;
}

// Challenge structure
export interface Challenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  duration: 'daily' | 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  requirement: number;
  type: 'routine_count' | 'specific_area' | 'streak' | 'custom';
  progress: number;
  completed: boolean;
  areaFocus?: BodyArea;
  xpReward: number;
}

// Reward structure
export interface Reward {
  id: string;
  title: string;
  description: string;
  icon: string;
  levelRequired: number;
  unlocked: boolean;
  dateUnlocked?: string;
}

// User progress data
export interface UserProgress {
  totalXP: number;
  level: number;
  achievements: Record<string, Achievement>;
  challenges: Record<string, Challenge>;
  rewards: Record<string, Reward>;
  lastUpdated: string;
}

// Level thresholds - XP required for each level
const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  1000,   // Level 5
  2000,   // Level 6
  3500,   // Level 7
  5500,   // Level 8
  8000,   // Level 9
  12000   // Level 10
];

// Default achievements
const DEFAULT_ACHIEVEMENTS: Record<string, Achievement> = {
  'first_routine': {
    id: 'first_routine',
    title: 'First Steps',
    description: 'Complete your first stretching routine',
    icon: 'footsteps-outline',
    requirement: 1,
    type: 'routine_count',
    progress: 0,
    completed: false,
    xpReward: 50
  },
  'routine_master': {
    id: 'routine_master',
    title: 'Routine Master',
    description: 'Complete 10 stretching routines',
    icon: 'fitness-outline',
    requirement: 10,
    type: 'routine_count',
    progress: 0,
    completed: false,
    xpReward: 100
  },
  'dedication': {
    id: 'dedication',
    title: 'Dedication',
    description: 'Complete 50 stretching routines',
    icon: 'trophy-outline',
    requirement: 50,
    type: 'routine_count',
    progress: 0,
    completed: false,
    xpReward: 200
  },
  'streak_starter': {
    id: 'streak_starter',
    title: 'Streak Starter',
    description: 'Maintain a 3-day streak',
    icon: 'flame-outline',
    requirement: 3,
    type: 'streak',
    progress: 0,
    completed: false,
    xpReward: 75
  },
  'streak_warrior': {
    id: 'streak_warrior',
    title: 'Streak Warrior',
    description: 'Maintain a 7-day streak',
    icon: 'flame',
    requirement: 7,
    type: 'streak',
    progress: 0,
    completed: false,
    xpReward: 150
  },
  'variety_seeker': {
    id: 'variety_seeker',
    title: 'Variety Seeker',
    description: 'Try routines for 3 different body areas',
    icon: 'body-outline',
    requirement: 3,
    type: 'area_variety',
    progress: 0,
    completed: false,
    xpReward: 100
  },
  'full_coverage': {
    id: 'full_coverage',
    title: 'Full Coverage',
    description: 'Try routines for all body areas',
    icon: 'body',
    requirement: 6, // Assuming 6 body areas
    type: 'area_variety',
    progress: 0,
    completed: false,
    xpReward: 200
  },
  'time_investment': {
    id: 'time_investment',
    title: 'Time Investment',
    description: 'Spend 60 minutes stretching',
    icon: 'time-outline',
    requirement: 60,
    type: 'total_time',
    progress: 0,
    completed: false,
    xpReward: 100
  },
  'dedicated_stretcher': {
    id: 'dedicated_stretcher',
    title: 'Dedicated Stretcher',
    description: 'Spend 300 minutes stretching',
    icon: 'hourglass',
    requirement: 300,
    type: 'total_time',
    progress: 0,
    completed: false,
    xpReward: 250
  }
};

// Default rewards (unlocked at different levels)
const DEFAULT_REWARDS: Record<string, Reward> = {
  'custom_themes': {
    id: 'custom_themes',
    title: 'Custom Themes',
    description: 'Unlock custom app themes',
    icon: 'color-palette-outline',
    levelRequired: 2,
    unlocked: false
  },
  'advanced_analytics': {
    id: 'advanced_analytics',
    title: 'Advanced Analytics',
    description: 'Unlock detailed stretching analytics',
    icon: 'analytics-outline',
    levelRequired: 3,
    unlocked: false
  },
  'custom_routine_builder': {
    id: 'custom_routine_builder',
    title: 'Custom Routine Builder',
    description: 'Create and save your own custom routines',
    icon: 'create-outline',
    levelRequired: 4,
    unlocked: false
  },
  'personal_records': {
    id: 'personal_records',
    title: 'Personal Records',
    description: 'Track your personal bests and milestones',
    icon: 'ribbon-outline',
    levelRequired: 5,
    unlocked: false
  },
  'reminders_plus': {
    id: 'reminders_plus',
    title: 'Reminders+',
    description: 'Set custom reminders with advanced options',
    icon: 'notifications-outline',
    levelRequired: 6,
    unlocked: false
  },
  'animated_exercises': {
    id: 'animated_exercises',
    title: 'Animated Exercises',
    description: 'Unlock animated exercise demonstrations',
    icon: 'film-outline',
    levelRequired: 7,
    unlocked: false
  },
  'export_data': {
    id: 'export_data',
    title: 'Data Export',
    description: 'Export your progress data to CSV or PDF',
    icon: 'download-outline',
    levelRequired: 8,
    unlocked: false
  },
  'achievement_badges': {
    id: 'achievement_badges',
    title: 'Achievement Badges',
    description: 'Display your achievements on your profile',
    icon: 'shield-outline',
    levelRequired: 9,
    unlocked: false
  },
  'ultimate_stretcher': {
    id: 'ultimate_stretcher',
    title: 'Ultimate Stretcher Status',
    description: 'Unlock the title of Ultimate Stretcher and all premium features',
    icon: 'star',
    levelRequired: 10,
    unlocked: false
  }
};

// Default challenge templates - actual challenges will be generated from these
const CHALLENGE_TEMPLATES = [
  {
    title: 'Daily Stretch',
    description: 'Complete {requirement} routine(s) today',
    icon: 'today-outline',
    duration: 'daily',
    requirement: 1,
    type: 'routine_count',
    xpReward: 50
  },
  {
    title: 'Weekly Warrior',
    description: 'Complete {requirement} routines this week',
    icon: 'calendar-outline',
    duration: 'weekly',
    requirement: 5,
    type: 'routine_count',
    xpReward: 150
  },
  {
    title: 'Focus on {areaFocus}',
    description: 'Complete {requirement} {areaFocus} routine(s)',
    icon: 'body-outline',
    duration: 'weekly',
    requirement: 3,
    type: 'specific_area',
    xpReward: 100
  },
  {
    title: 'Streak Challenge',
    description: 'Maintain a {requirement}-day streak',
    icon: 'flame-outline',
    duration: 'weekly',
    requirement: 3,
    type: 'streak',
    xpReward: 120
  },
  {
    title: 'Monthly Milestone',
    description: 'Complete {requirement} routines this month',
    icon: 'trophy-outline',
    duration: 'monthly',
    requirement: 20,
    type: 'routine_count',
    xpReward: 300
  }
];

// Initial user progress state
const INITIAL_USER_PROGRESS: UserProgress = {
  totalXP: 0,
  level: 1,
  achievements: DEFAULT_ACHIEVEMENTS,
  challenges: {},
  rewards: DEFAULT_REWARDS,
  lastUpdated: new Date().toISOString()
};

interface UseProgressSystemReturn {
  userProgress: UserProgress;
  isLoading: boolean;
  refreshUserProgress: () => Promise<void>;
  updateProgressWithRoutines: (routines: ProgressEntry[]) => Promise<void>;
  updateCurrentStreak: (streak: number) => Promise<void>;
  completeChallenge: (challengeId: string) => Promise<void>;
  generateNewChallenges: () => Promise<void>;
  getUnlockedRewards: () => Reward[];
  getPendingAchievements: () => Achievement[];
  getCurrentChallenges: () => Challenge[];
  achievements: Achievement[];
  rewards: Reward[];
  challenges: Challenge[];
  completedChallenges: Challenge[];
  updateUserProgress: (update: Partial<UserProgress>) => Promise<void>;
}

export function useProgressSystem(): UseProgressSystemReturn {
  const [userProgress, setUserProgress] = useState<UserProgress>(INITIAL_USER_PROGRESS);
  const [isLoading, setIsLoading] = useState(true);
  const lastProcessedKey = useRef('');

  // Load user progress on mount
  useEffect(() => {
    loadUserProgress();
  }, []);

  // Load user progress from AsyncStorage
  const loadUserProgress = useCallback(async () => {
    try {
      setIsLoading(true);
      
      await measureAsyncOperation('loadUserProgress', async () => {
        const userProgressJson = await AsyncStorage.getItem('@userProgress');
        
        if (userProgressJson) {
          const savedProgress = JSON.parse(userProgressJson) as UserProgress;
          console.log('Loaded user progress:', savedProgress.level, 'XP:', savedProgress.totalXP);
          setUserProgress(savedProgress);
        } else {
          console.log('No existing user progress found, initializing defaults');
          // Initialize with defaults and save
          await AsyncStorage.setItem('@userProgress', JSON.stringify(INITIAL_USER_PROGRESS));
          setUserProgress(INITIAL_USER_PROGRESS);
          
          // Generate initial challenges
          generateNewChallenges();
        }
      });
    } catch (error) {
      console.error('Error loading user progress:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save user progress to AsyncStorage
  const saveUserProgress = useCallback(async (progress: UserProgress) => {
    try {
      await measureAsyncOperation('saveUserProgress', async () => {
        await AsyncStorage.setItem('@userProgress', JSON.stringify({
          ...progress,
          lastUpdated: new Date().toISOString()
        }));
        console.log('Saved user progress:', progress.level, 'XP:', progress.totalXP);
      });
    } catch (error) {
      console.error('Error saving user progress:', error);
    }
  }, []);

  // Calculate level based on XP
  const calculateLevel = useCallback((xp: number): number => {
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i]) {
        return i + 1;
      }
    }
    return 1; // Default to level 1
  }, []);

  // Update user XP and check for level up
  const updateXP = useCallback(async (xpToAdd: number) => {
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
      console.log(`Level up! ${userProgress.level} -> ${newLevel}`);
      
      // Update rewards that should be unlocked at this level
      const updatedRewards = { ...updatedProgress.rewards };
      
      Object.keys(updatedRewards).forEach(rewardId => {
        const reward = updatedRewards[rewardId];
        if (!reward.unlocked && reward.levelRequired <= newLevel) {
          console.log(`Unlocked reward: ${reward.title}`);
          updatedRewards[rewardId] = {
            ...reward,
            unlocked: true,
            dateUnlocked: new Date().toISOString()
          };
        }
      });
      
      updatedProgress.rewards = updatedRewards;
    }
    
    setUserProgress(updatedProgress);
    await saveUserProgress(updatedProgress);
    
    return leveledUp;
  }, [userProgress, calculateLevel, saveUserProgress]);

  // Check and update achievements
  const checkAchievements = useCallback(async (
    routineCount: number,
    currentStreak: number,
    uniqueAreas: string[],
    totalMinutes: number
  ) => {
    // Check if we've already calculated achievements for this data combination
    const achievementCheckKey = `achievements_${routineCount}_${currentStreak}_${uniqueAreas.length}_${totalMinutes}_${new Date().toDateString()}`;
    const lastAchievementCheckKey = useRef('');
    
    if (lastAchievementCheckKey.current === achievementCheckKey) {
      console.log('Already checked achievements with this data today, skipping');
      return { xpEarned: 0, leveledUp: false, achievementsCompleted: false };
    }
    
    lastAchievementCheckKey.current = achievementCheckKey;
    
    let xpEarned = 0;
    const updatedAchievements = { ...userProgress.achievements };
    let achievementsCompleted = false;
    
    // Check each achievement
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
        }
        
        // Check if the achievement is now completed
        if (newProgress >= achievement.requirement && !achievement.completed) {
          achievementsCompleted = true;
          xpEarned += achievement.xpReward;
          
          updatedAchievements[id] = {
            ...achievement,
            progress: newProgress,
            completed: true,
            dateCompleted: new Date().toISOString()
          };
          
          console.log(`Achievement unlocked: ${achievement.title} (+${achievement.xpReward} XP)`);
        } else if (newProgress !== achievement.progress) {
          // Just update progress
          updatedAchievements[id] = {
            ...achievement,
            progress: newProgress
          };
        }
      }
    });
    
    // Only update achievements in state if there were changes
    if (achievementsCompleted || Object.values(updatedAchievements).some((a, i, arr) => 
      a.progress !== userProgress.achievements[a.id]?.progress)
    ) {
      const updatedProgress = {
        ...userProgress,
        achievements: updatedAchievements
      };
      
      setUserProgress(updatedProgress);
      await saveUserProgress(updatedProgress);
      
      // Award XP if any achievements were completed
      if (xpEarned > 0) {
        const leveledUp = await updateXP(xpEarned);
        return { xpEarned, leveledUp, achievementsCompleted };
      }
    }
    
    return { xpEarned: 0, leveledUp: false, achievementsCompleted };
  }, [userProgress, updateXP, saveUserProgress]);

  // Update challenges based on user progress
  const updateChallenges = useCallback(async (
    routineCount: number,
    currentStreak: number,
    routinesByArea: Record<string, number>
  ) => {
    // Add a similar check to prevent repeated processing
    const challengeCheckKey = `challenges_${routineCount}_${currentStreak}_${Object.keys(routinesByArea).length}_${new Date().toDateString()}`;
    const lastChallengeCheckKey = useRef('');
    
    if (lastChallengeCheckKey.current === challengeCheckKey) {
      console.log('Already checked challenges with this data today, skipping');
      return { xpEarned: 0, leveledUp: false, challengesCompleted: false };
    }
    
    lastChallengeCheckKey.current = challengeCheckKey;
    
    let xpEarned = 0;
    const updatedChallenges = { ...userProgress.challenges };
    let challengesCompleted = false;
    
    // Current date for checking if challenges are still valid
    const now = new Date();
    
    // Check each active challenge
    Object.keys(updatedChallenges).forEach(id => {
      const challenge = updatedChallenges[id];
      
      // Skip already completed challenges
      if (challenge.completed) return;
      
      // Check if challenge has expired
      const endDate = new Date(challenge.endDate);
      if (now > endDate) {
        // Challenge expired without completion - will be removed during cleanup
        return;
      }
      
      let newProgress = challenge.progress;
      
      // Update progress based on challenge type
      switch (challenge.type) {
        case 'routine_count':
          newProgress = routineCount;
          break;
        case 'streak':
          newProgress = currentStreak;
          break;
        case 'specific_area':
          if (challenge.areaFocus) {
            newProgress = routinesByArea[challenge.areaFocus] || 0;
          }
          break;
      }
      
      // Check if the challenge is now completed
      if (newProgress >= challenge.requirement && !challenge.completed) {
        challengesCompleted = true;
        xpEarned += challenge.xpReward;
        
        updatedChallenges[id] = {
          ...challenge,
          progress: newProgress,
          completed: true
        };
        
        console.log(`Challenge completed: ${challenge.title} (+${challenge.xpReward} XP)`);
      } else if (newProgress !== challenge.progress) {
        // Just update progress
        updatedChallenges[id] = {
          ...challenge,
          progress: newProgress
        };
      }
    });
    
    // Only update challenges if there were actual changes
    if (challengesCompleted || Object.values(updatedChallenges).some((c, i, arr) => 
      c.progress !== userProgress.challenges[c.id]?.progress || 
      c.completed !== userProgress.challenges[c.id]?.completed)
    ) {
      // Update challenges in state
      const updatedProgress = {
        ...userProgress,
        challenges: updatedChallenges
      };
      
      setUserProgress(updatedProgress);
      await saveUserProgress(updatedProgress);
      
      // Award XP if any challenges were completed
      if (xpEarned > 0) {
        const leveledUp = await updateXP(xpEarned);
        return { xpEarned, leveledUp, challengesCompleted };
      }
    }
    
    return { xpEarned: 0, leveledUp: false, challengesCompleted };
  }, [userProgress, updateXP, saveUserProgress]);

  // Generate new challenges based on templates
  const generateNewChallenges = useCallback(async () => {
    const now = new Date();
    const updatedChallenges = { ...userProgress.challenges };
    
    // Clean up expired or completed challenges
    Object.keys(updatedChallenges).forEach(id => {
      const challenge = updatedChallenges[id];
      const endDate = new Date(challenge.endDate);
      
      // Remove if completed or expired
      if (challenge.completed || now > endDate) {
        delete updatedChallenges[id];
      }
    });
    
    // Generate new challenges up to a max of 3 active challenges
    const currentChallengeCount = Object.keys(updatedChallenges).length;
    const challengesToGenerate = Math.max(0, 3 - currentChallengeCount);
    
    if (challengesToGenerate > 0) {
      console.log(`Generating ${challengesToGenerate} new challenges`);
      
      // Get available body areas for specific area challenges
      const bodyAreas: BodyArea[] = [
        'Hips & Legs',
        'Lower Back',
        'Upper Back & Chest',
        'Shoulders & Arms',
        'Neck',
        'Full Body'
      ];
      
      // Generate new challenges
      for (let i = 0; i < challengesToGenerate; i++) {
        // Pick a random template
        const templateIndex = Math.floor(Math.random() * CHALLENGE_TEMPLATES.length);
        const template = CHALLENGE_TEMPLATES[templateIndex];
        
        // Set duration and dates
        let startDate = new Date();
        let endDate = new Date();
        
        switch (template.duration) {
          case 'daily':
            // End at midnight
            endDate.setHours(23, 59, 59, 999);
            break;
          case 'weekly':
            // End in 7 days
            endDate.setDate(endDate.getDate() + 7);
            break;
          case 'monthly':
            // End in 30 days
            endDate.setDate(endDate.getDate() + 30);
            break;
        }
        
        // For area-specific challenges, pick a random area
        let areaFocus: BodyArea | undefined;
        let title = template.title;
        let description = template.description;
        
        if (template.type === 'specific_area') {
          const areaIndex = Math.floor(Math.random() * bodyAreas.length);
          areaFocus = bodyAreas[areaIndex];
          
          // Replace placeholder with actual area
          title = title.replace('{areaFocus}', areaFocus);
          description = description.replace('{areaFocus}', areaFocus);
        }
        
        // Replace requirement placeholders
        description = description.replace('{requirement}', template.requirement.toString());
        
        // Create the challenge
        const newChallenge: Challenge = {
          id: `challenge_${Date.now()}_${i}`,
          title,
          description,
          icon: template.icon,
          duration: template.duration,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          requirement: template.requirement,
          type: template.type,
          progress: 0,
          completed: false,
          areaFocus,
          xpReward: template.xpReward
        };
        
        updatedChallenges[newChallenge.id] = newChallenge;
        console.log(`Generated challenge: ${newChallenge.title}`);
      }
    }
    
    // Update challenges in state
    const updatedProgress = {
      ...userProgress,
      challenges: updatedChallenges
    };
    
    setUserProgress(updatedProgress);
    await saveUserProgress(updatedProgress);
  }, [userProgress, saveUserProgress]);

  // Refresh user progress
  const refreshUserProgress = useCallback(async () => {
    await loadUserProgress();
  }, [loadUserProgress]);

  // Update progress with routines - main function to call with new progress data
  const updateProgressWithRoutines = useCallback(async (routines: ProgressEntry[]) => {
    if (!routines.length) return;
    
    // Add a guard to prevent excessive updates
    const processingKey = `${routines.length}_${new Date().toDateString()}`;
    
    if (lastProcessedKey.current === processingKey) {
      console.log('Already processed this data today, skipping update');
      return;
    }
    
    lastProcessedKey.current = processingKey;
    
    // Calculate statistics from routines
    const routineCount = routines.length;
    
    // Calculate total minutes
    const totalMinutes = routines.reduce((sum, entry) => {
      return sum + (parseInt(entry.duration) || 0);
    }, 0);
    
    // Get unique areas
    const uniqueAreas = Array.from(new Set(routines.map(r => r.area)));
    
    // Count routines by area
    const routinesByArea: Record<string, number> = {};
    routines.forEach(routine => {
      if (!routinesByArea[routine.area]) {
        routinesByArea[routine.area] = 0;
      }
      routinesByArea[routine.area]++;
    });
    
    // Current streak will be updated separately
    
    console.log('Updating progress with routines:', routineCount, 'Total minutes:', totalMinutes);
    
    // Check and update achievements
    const achievementResults = await checkAchievements(
      routineCount,
      userProgress.achievements.streak_warrior.progress, // Use existing streak value
      uniqueAreas,
      totalMinutes
    );
    
    // Update challenges
    const challengeResults = await updateChallenges(
      routineCount,
      userProgress.achievements.streak_warrior.progress, // Use existing streak value
      routinesByArea
    );
    
    // Return results
    return {
      ...achievementResults,
      ...challengeResults,
      xpEarned: achievementResults.xpEarned + challengeResults.xpEarned
    };
  }, [userProgress, checkAchievements, updateChallenges]);

  // Update current streak
  const updateCurrentStreak = useCallback(async (streak: number) => {
    // Only need to update achievement progress for streak
    const achievementResults = await checkAchievements(
      userProgress.achievements.dedication.progress, // Use existing routine count
      streak,
      [], // Use existing unique areas
      userProgress.achievements.dedicated_stretcher.progress // Use existing total minutes
    );
    
    // Update challenges with new streak
    const challengeResults = await updateChallenges(
      userProgress.achievements.dedication.progress, // Use existing routine count
      streak,
      {} // Use existing routines by area
    );
    
    return {
      ...achievementResults,
      ...challengeResults,
      xpEarned: achievementResults.xpEarned + challengeResults.xpEarned
    };
  }, [userProgress, checkAchievements, updateChallenges]);

  // Mark a specific challenge as complete
  const completeChallenge = useCallback(async (challengeId: string) => {
    const challenge = userProgress.challenges[challengeId];
    if (!challenge || challenge.completed) return;
    
    const updatedChallenges = { ...userProgress.challenges };
    updatedChallenges[challengeId] = {
      ...challenge,
      completed: true,
      progress: challenge.requirement // Set progress to requirement
    };
    
    // Award XP
    const leveledUp = await updateXP(challenge.xpReward);
    
    // Update challenges in state
    const updatedProgress = {
      ...userProgress,
      challenges: updatedChallenges
    };
    
    setUserProgress(updatedProgress);
    await saveUserProgress(updatedProgress);
    
    return { xpEarned: challenge.xpReward, leveledUp, challengesCompleted: true };
  }, [userProgress, updateXP, saveUserProgress]);

  // Get unlocked rewards
  const getUnlockedRewards = useCallback(() => {
    return Object.values(userProgress.rewards).filter(reward => reward.unlocked);
  }, [userProgress.rewards]);

  // Get pending (incomplete) achievements
  const getPendingAchievements = useCallback(() => {
    return Object.values(userProgress.achievements)
      .filter(achievement => !achievement.completed)
      .sort((a, b) => {
        // Sort by progress percentage (highest first)
        const aPercentage = a.progress / a.requirement;
        const bPercentage = b.progress / b.requirement;
        return bPercentage - aPercentage;
      });
  }, [userProgress.achievements]);

  // Get current active challenges
  const getCurrentChallenges = useCallback(() => {
    const now = new Date();
    return Object.values(userProgress.challenges)
      .filter(challenge => {
        const endDate = new Date(challenge.endDate);
        // Include if not completed and not expired
        return !challenge.completed && now <= endDate;
      })
      .sort((a, b) => {
        // Sort by end date (soonest first)
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      });
  }, [userProgress.challenges]);

  // Get all achievements as array
  const achievements = Object.values(userProgress.achievements);
  
  // Get all rewards as array
  const rewards = Object.values(userProgress.rewards);
  
  // Get active challenges
  const challenges = Object.values(userProgress.challenges).filter(c => !c.completed);
  
  // Get completed challenges
  const completedChallenges = Object.values(userProgress.challenges).filter(c => c.completed);
  
  // Update user progress
  const updateUserProgress = useCallback(async (update: Partial<UserProgress>) => {
    const updatedProgress = {
      ...userProgress,
      ...update
    };
    setUserProgress(updatedProgress);
    await saveUserProgress(updatedProgress);
  }, [userProgress, saveUserProgress]);

  return {
    userProgress,
    isLoading,
    refreshUserProgress,
    updateProgressWithRoutines,
    updateCurrentStreak,
    completeChallenge,
    generateNewChallenges,
    getUnlockedRewards,
    getPendingAchievements,
    getCurrentChallenges,
    achievements,
    rewards,
    challenges,
    completedChallenges,
    updateUserProgress
  };
} 