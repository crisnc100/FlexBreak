/**
 * Progress System Testing Utilities
 * 
 * This module provides functions for testing the progress system.
 * Note: This should only be used in development and testing environments.
 */

import { ProgressEntry } from '../../types';
import * as storageService from '../../services/storageService';
import * as gamificationManager from './gamificationManager';

/**
 * Process a single routine for testing purposes
 * Updates user progress with the routine data using the new gamification system
 */
export const processRoutine = async (routine: ProgressEntry): Promise<void> => {
  try {
    // Use the new gamification system to process the routine
    await gamificationManager.processCompletedRoutine(routine);
    console.log(`Processed test routine: ${routine.area}, ${routine.duration} minutes`);
  } catch (error) {
    console.error('Error processing test routine:', error);
  }
};

/**
 * Process multiple routines for testing purposes
 */
export const processRoutines = async (routines: ProgressEntry[]): Promise<void> => {
  for (const routine of routines) {
    await processRoutine(routine);
  }
  
  console.log(`Processed ${routines.length} test routines`);
};

export { getUserProgress, saveUserProgress } from '../../services/storageService'; 