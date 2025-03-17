

// Import and re-export all functions from the new storageService
import * as storageService from '../../../src/services/storageService';

// Re-export functions with the same names for backward compatibility
export const saveIsPremium = storageService.saveIsPremium;
export const getIsPremium = storageService.getIsPremium;
export const saveFavorite = storageService.saveFavorite;
export const removeFavorite = storageService.removeFavorite;
export const getFavorites = storageService.getFavorites;
export const saveProgress = storageService.saveRoutineProgress;
export const getProgress = storageService.getAllRoutines;
export const saveReminderEnabled = storageService.saveReminderEnabled;
export const getReminderEnabled = storageService.getReminderEnabled;
export const saveReminderTime = storageService.saveReminderTime;
export const getReminderTime = storageService.getReminderTime;
export const getRecentRoutines = storageService.getRecentRoutines;
export const saveFavoriteRoutine = storageService.saveFavoriteRoutine;
export const saveCompletedRoutine = storageService.saveCompletedRoutine;
export const clearAllData = storageService.clearAllData;

// Add a deprecation warning when this file is imported
console.warn(
  'WARNING: src/utils/storage.ts is deprecated. Import from src/services/storageService.ts instead.'
); 