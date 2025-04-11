import * as storageService from '../../../services/storageService';
import { UserProgress } from '../types';

/**
 * Save UserProgress with version checking to prevent race conditions
 * This function adds a version counter to track changes and prevent 
 * older versions from overwriting newer ones.
 * 
 * @param progress UserProgress object to save
 * @param reason Reason for the save (for logging)
 * @returns Success flag
 */
export const saveUserProgressWithVersionCheck = async (
  progress: UserProgress,
  reason: string = 'unknown'
): Promise<boolean> => {
  try {
    // Initialize _version if not present
    if (!progress._version) {
      progress._version = 1;
    }
    
    // Get current stored version from storage to compare
    const storedProgress = await storageService.getUserProgress();
    
    // If stored version is newer, we might be overwriting newer changes
    if (storedProgress._version && storedProgress._version > progress._version) {
      console.warn(`⚠️ Prevented overwriting newer UserProgress: Local v${progress._version} < Stored v${storedProgress._version} (reason: ${reason})`);
      
      // Return failure - caller should handle by reloading the latest data
      return false;
    }
    
    // Increment version before saving
    progress._version++;
    
    console.log(`📝 Saving UserProgress v${progress._version} (reason: ${reason})`);
    
    // Save the updated progress
    await storageService.saveUserProgress(progress);
    return true;
  } catch (error) {
    console.error('Error saving UserProgress with version check:', error);
    return false;
  }
}; 