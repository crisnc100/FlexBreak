import * as storageService from '../services/storageService';
import { ProgressEntry, RoutineParams, BodyArea, Duration } from '../types';
import * as ProgressSystemUtils from './progress/progressSystem';
import { processRoutine, processRoutines } from './progress/testing';
import { calculateStreak } from './progressUtils';

/**
 * Testing utilities for the Progress System
 * IMPORTANT: These functions should only be used in a development environment
 */

// Generate a mock routine entry
export const generateMockRoutine = (options: {
  area?: BodyArea;
  duration?: number;
  date?: Date;
  numberOfStretches?: number;
}): ProgressEntry => {
  const {
    area = 'Full Body',
    duration = 5,
    date = new Date(),
    numberOfStretches = 3
  } = options;

  // Convert numeric duration to string Duration type
  const durationStr = String(duration) as Duration;

  return {
    date: date.toISOString(),
    area: area as BodyArea,
    duration: durationStr,
    stretchCount: numberOfStretches
    // No id, routineName, completed, or stretches as they're not in ProgressEntry
  };
};

// Add multiple mock routine entries
export const addMockRoutines = async (options: {
  count: number;
  areas?: BodyArea[];
  durationRange?: [number, number];
  dateRange?: [Date, Date];
  stretchesRange?: [number, number];
}): Promise<ProgressEntry[]> => {
  const {
    count,
    areas = ['Hips & Legs', 'Lower Back', 'Upper Back & Chest', 'Shoulders & Arms', 'Neck', 'Full Body'],
    durationRange = [3, 15],
    dateRange = [new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), new Date()],
    stretchesRange = [2, 8]
  } = options;

  const mockRoutines: ProgressEntry[] = [];

  // Generate random routines
  for (let i = 0; i < count; i++) {
    // Pick random area
    const randomArea = areas[Math.floor(Math.random() * areas.length)];

    // Random duration within range
    const randomDuration = Math.floor(
      Math.random() * (durationRange[1] - durationRange[0] + 1) + durationRange[0]
    );

    // Random date within range
    const startTime = dateRange[0].getTime();
    const endTime = dateRange[1].getTime();
    const randomDate = new Date(startTime + Math.random() * (endTime - startTime));

    // Random number of stretches
    const randomStretches = Math.floor(
      Math.random() * (stretchesRange[1] - stretchesRange[0] + 1) + stretchesRange[0]
    );

    // Create mock routine
    const mockRoutine = generateMockRoutine({
      area: randomArea as BodyArea,
      duration: randomDuration,
      date: randomDate,
      numberOfStretches: randomStretches
    });

    mockRoutines.push(mockRoutine);
  }

  try {
    // Sort by date (oldest first)
    mockRoutines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Get existing progress data
    const progressData = await storageService.getAllRoutines();
    
    // Combine new and existing progress
    const combinedProgress = [...progressData, ...mockRoutines];
    
    // Save to storage service - save each routine individually
    for (const routine of mockRoutines) {
      await storageService.saveRoutineProgress({
        area: routine.area,
        duration: routine.duration,
        date: routine.date,
        stretchCount: routine.stretchCount
      });
    }
    
    // Update progress system with new routines
    await processRoutines(mockRoutines);
    
    console.log(`Added ${mockRoutines.length} mock routines to the progress system`);
    return mockRoutines;
  } catch (error) {
    console.error('Error adding mock routines:', error);
    return [];
  }
};

// Set user to a specific XP level
export const setUserXP = async (xp: number): Promise<boolean> => {
  try {
    // Get current progress
    const userProgress = await ProgressSystemUtils.getUserProgress();
    
    // Update XP and level
    const levelData = ProgressSystemUtils.calculateLevel(xp, userProgress.level);
    
    // Save updated progress
    await ProgressSystemUtils.saveUserProgress({
      ...userProgress,
      totalXP: xp,
      level: levelData.level
    });
    
    console.log(`Set user XP to ${xp} (Level ${levelData.level})`);
    return true;
  } catch (error) {
    console.error('Error setting user XP:', error);
    return false;
  }
};

// Directly complete an achievement
export const completeAchievement = async (achievementId: string): Promise<boolean> => {
  try {
    // Get current progress
    const userProgress = await ProgressSystemUtils.getUserProgress();
    
    // Check if achievement exists
    if (!userProgress.achievements[achievementId]) {
      console.error(`Achievement with ID ${achievementId} not found`);
      return false;
    }
    
    // Mark achievement as completed and apply XP
    const achievement = userProgress.achievements[achievementId];
    const updatedAchievement = {
      ...achievement,
      completed: true,
      progress: achievement.requirement,
      dateCompleted: new Date().toISOString()
    };
    
    // Update achievements in user progress
    const updatedProgress = {
      ...userProgress,
      achievements: {
        ...userProgress.achievements,
        [achievementId]: updatedAchievement
      },
      totalXP: userProgress.totalXP + achievement.xp,
      level: ProgressSystemUtils.calculateLevel(userProgress.totalXP + achievement.xp, userProgress.level).level
    };
    
    // Save updated progress
    await ProgressSystemUtils.saveUserProgress(updatedProgress);
    
    console.log(`Completed achievement: ${achievement.title}, earned ${achievement.xp} XP`);
    return true;
  } catch (error) {
    console.error('Error completing achievement:', error);
    return false;
  }
};

// Create and complete a streak of routines
export const createStreak = async (streakLength: number): Promise<boolean> => {
  try {
    // First, clear existing progress data to avoid interference
    // We'll use a workaround since there's no direct method to clear all entries
    // Save an empty array to the progress entries key
    await storageService.setData(storageService.KEYS.PROGRESS.PROGRESS_ENTRIES, []);
    
    // Create routines for each day of the streak (most recent)
    const today = new Date();
    today.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
    const mockRoutines: ProgressEntry[] = [];
    
    console.log(`[STREAK TEST] Creating streak of ${streakLength} days starting from ${today.toISOString()}`);
    
    // Create a routine for each day in the streak, starting from today
    for (let i = 0; i < streakLength; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      // Keep the time consistent at noon to avoid any time-related issues
      date.setHours(12, 0, 0, 0);
      
      const mockRoutine = generateMockRoutine({
        date: date,
        area: 'Lower Back', // Valid BodyArea from the enum
        duration: 5
      });
      
      mockRoutines.push(mockRoutine);
      console.log(`[STREAK TEST] Added routine for day ${i+1}: ${date.toISOString().split('T')[0]}`);
    }
    
    // Sort routines by date (newest first)
    mockRoutines.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Log the dates to verify they're consecutive
    console.log('[STREAK TEST] Sorted dates:');
    mockRoutines.forEach((routine, index) => {
      console.log(`[STREAK TEST] Day ${index+1}: ${new Date(routine.date).toISOString().split('T')[0]}`);
    });
    
    // Save each routine individually
    for (const routine of mockRoutines) {
      await storageService.saveRoutineProgress({
        area: routine.area,
        duration: routine.duration,
        date: routine.date,
        stretchCount: routine.stretchCount
      });
    }
    
    // Update progress system with new routines
    await ProgressSystemUtils.processRoutines(mockRoutines);
    
    // Verify streak
    const actualStreak = calculateStreak(mockRoutines);
    console.log(`[STREAK TEST] Created streak of ${mockRoutines.length} days, actual streak calculation: ${actualStreak}`);
    
    return true;
  } catch (error) {
    console.error('Error creating streak:', error);
    return false;
  }
};

// Reset all progress data
export const resetAllProgressData = async (): Promise<boolean> => {
  try {
    // Clear progress entries by setting an empty array
    await storageService.setData(storageService.KEYS.PROGRESS.PROGRESS_ENTRIES, []);
    
    // Reset user progress to initial state
    await ProgressSystemUtils.resetUserProgress();
    
    console.log('Reset all progress data to initial state');
    return true;
  } catch (error) {
    console.error('Error resetting progress data:', error);
    return false;
  }
};

// Get a summary of current progress system state
export const getProgressSystemSummary = async (): Promise<any> => {
  try {
    const userProgress = await ProgressSystemUtils.getUserProgress();
    const routines = await storageService.getAllRoutines();
    
    const completedAchievements = Object.values(userProgress.achievements)
      .filter(a => a.completed)
      .map(a => ({ id: a.id, title: a.title, xp: a.xp }));
    
    const pendingAchievements = Object.values(userProgress.achievements)
      .filter(a => !a.completed)
      .map(a => ({ 
        id: a.id, 
        title: a.title, 
        progress: a.progress, 
        requirement: a.requirement,
        percentComplete: Math.round((a.progress / a.requirement) * 100) 
      }));
    
    // Get next level XP
    const nextLevelXP = ProgressSystemUtils.getNextLevelXP(userProgress.level);
    
    return {
      xp: userProgress.totalXP,
      level: userProgress.level,
      nextLevelAt: nextLevelXP || "Max level",
      routineCount: routines.length,
      streak: calculateStreak(routines),
      completedAchievements,
      pendingAchievements
    };
  } catch (error) {
    console.error('Error getting progress system summary:', error);
    return null;
  }
};

// Test the XP system
export const testXPSystem = async (): Promise<boolean> => {
  try {
    // First, clear existing progress data
    await storageService.setData(storageService.KEYS.PROGRESS.PROGRESS_ENTRIES, []);
    await storageService.removeData(storageService.KEYS.PROGRESS.USER_PROGRESS);
    
    console.log('=== XP SYSTEM TEST ===');
    
    // Initialize with default progress
    const initialProgress = await ProgressSystemUtils.getUserProgress();
    console.log(`Initial XP: ${initialProgress.totalXP}, Level: ${initialProgress.level}`);
    
    // Test 1: First routine ever (5 minutes)
    console.log('\nTest 1: First routine ever (5 minutes)');
    const firstRoutine = generateMockRoutine({
      date: new Date(),
      duration: 5,
      area: 'Lower Back'
    });
    
    await processRoutine(firstRoutine);
    let progress = await ProgressSystemUtils.getUserProgress();
    console.log(`Expected XP: 50 (base) + 50 (first time) = 100 XP`);
    console.log(`Actual XP: ${progress.totalXP}, Level: ${progress.level}`);
    
    // Test 2: Second routine (10 minutes) - should be 100 XP more
    console.log('\nTest 2: Second routine (10 minutes)');
    const secondRoutine = generateMockRoutine({
      date: new Date(Date.now() + 24 * 60 * 60 * 1000), // Next day
      duration: 10,
      area: 'Upper Back & Chest'
    });
    
    await processRoutine(secondRoutine);
    progress = await ProgressSystemUtils.getUserProgress();
    console.log(`Expected XP: 100 (previous) + 100 (10-min routine) = 200 XP`);
    console.log(`Actual XP: ${progress.totalXP}, Level: ${progress.level}`);
    
    // Test 3: Create a 3-day streak
    console.log('\nTest 3: Create a 3-day streak');
    await createStreak(3);
    progress = await ProgressSystemUtils.getUserProgress();
    console.log(`Expected XP: 200 (previous) + 50 (routine) + 50 (3-day streak) = 300 XP`);
    console.log(`Actual XP: ${progress.totalXP}, Level: ${progress.level}`);
    
    // Test 4: Create a 7-day streak
    console.log('\nTest 4: Create a 7-day streak');
    await createStreak(7);
    progress = await ProgressSystemUtils.getUserProgress();
    console.log(`Expected XP: 300 (previous) + 50 (routine) + 100 (7-day streak) = 450 XP`);
    console.log(`Actual XP: ${progress.totalXP}, Level: ${progress.level}`);
    
    // Test 5: Multiple routines in one day (only first should count)
    console.log('\nTest 5: Multiple routines in one day (only first should count)');
    const today = new Date();
    const morningRoutine = generateMockRoutine({
      date: new Date(today.setHours(9, 0, 0)),
      duration: 5,
      area: 'Neck'
    });
    
    const eveningRoutine = generateMockRoutine({
      date: new Date(today.setHours(18, 0, 0)),
      duration: 15,
      area: 'Hips & Legs'
    });
    
    await processRoutines([morningRoutine, eveningRoutine]);
    progress = await ProgressSystemUtils.getUserProgress();
    console.log(`Expected XP: 450 (previous) + 50 (5-min routine) = 500 XP (only first routine counts)`);
    console.log(`Actual XP: ${progress.totalXP}, Level: ${progress.level}`);
    
    console.log('\n=== XP SYSTEM TEST COMPLETE ===');
    return true;
  } catch (error) {
    console.error('Error testing XP system:', error);
    return false;
  }
}; 