import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../services/storageService';
import { measureAsyncOperation } from './performance';

// Constants for storage optimization
export const MAX_XP_HISTORY_ENTRIES = 100;
export const MAX_ROUTINE_HISTORY_DAYS = 90; // Keep routines from last 90 days
export const MAX_TOTAL_ROUTINES = 500; // Maximum number of routine entries to keep

/**
 * Get the size of all AsyncStorage data
 * @returns Object with storage statistics
 */
export const getStorageStats = async (): Promise<{
  totalSize: number;
  itemCount: number;
  itemSizes: Record<string, number>;
  largestItems: Array<{ key: string, size: number }>;
}> => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const itemSizes: Record<string, number> = {};
    let totalSize = 0;
    
    // Measure size of each item
    for (const key of allKeys) {
      const data = await AsyncStorage.getItem(key);
      const size = data ? new TextEncoder().encode(data).length : 0;
      itemSizes[key] = size;
      totalSize += size;
    }
    
    // Find largest items
    const largestItems = Object.entries(itemSizes)
      .map(([key, size]) => ({ key, size }))
      .sort((a, b) => b.size - a.size)
      .slice(0, 5); // Top 5 largest items
    
    return {
      totalSize,
      itemCount: allKeys.length,
      itemSizes,
      largestItems
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return {
      totalSize: 0,
      itemCount: 0,
      itemSizes: {},
      largestItems: []
    };
  }
};

/**
 * Format bytes to a human-readable format
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
};

/**
 * Log storage usage information to the console
 */
export const logStorageInfo = async (): Promise<void> => {
  const stats = await measureAsyncOperation('getStorageStats', () => getStorageStats());
  
  console.log('===== ASYNC STORAGE USAGE =====');
  console.log(`Total Size: ${formatBytes(stats.totalSize)}`);
  console.log(`Total Items: ${stats.itemCount}`);
  console.log('\nLargest Items:');
  stats.largestItems.forEach(item => {
    console.log(`- ${item.key}: ${formatBytes(item.size)}`);
  });
  console.log('==============================');
  
  // Storage health check
  const warningThreshold = 3 * 1024 * 1024; // 3MB
  const criticalThreshold = 5 * 1024 * 1024; // 5MB

  if (stats.totalSize > criticalThreshold) {
    console.warn('CRITICAL: AsyncStorage usage is very high, consider purging old data');
  } else if (stats.totalSize > warningThreshold) {
    console.warn('WARNING: AsyncStorage usage is approaching limits');
  }
  
  return stats;
};

/**
 * Prune old routine history to save space
 * @returns Number of routines removed
 */
export const pruneRoutineHistory = async (): Promise<number> => {
  try {
    // Get all routines
    const allRoutinesStr = await AsyncStorage.getItem(KEYS.ROUTINES.ALL);
    if (!allRoutinesStr) return 0;
    
    const allRoutines = JSON.parse(allRoutinesStr);
    const oldCount = allRoutines.length;
    
    // Keep only last X days of routines
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - MAX_ROUTINE_HISTORY_DAYS);
    
    // First approach: Date-based pruning
    let filteredRoutines = allRoutines.filter((routine: any) => 
      new Date(routine.date) >= cutoffDate
    );
    
    // Second approach: If still too many, keep most recent MAX_TOTAL_ROUTINES
    if (filteredRoutines.length > MAX_TOTAL_ROUTINES) {
      filteredRoutines = filteredRoutines
        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, MAX_TOTAL_ROUTINES);
    }
    
    // Save pruned list back to storage
    await AsyncStorage.setItem(KEYS.ROUTINES.ALL, JSON.stringify(filteredRoutines));
    
    const removed = oldCount - filteredRoutines.length;
    if (removed > 0) {
      console.log(`Pruned ${removed} old routine entries`);
    }
    
    return removed;
  } catch (error) {
    console.error('Error pruning routine history:', error);
    return 0;
  }
};

/**
 * Limit the size of XP history to prevent excessive growth
 * @returns Number of entries removed
 */
export const limitXpHistory = async (): Promise<number> => {
  try {
    // Get user progress
    const userProgressStr = await AsyncStorage.getItem(KEYS.PROGRESS.USER_PROGRESS);
    if (!userProgressStr) return 0;
    
    const userProgress = JSON.parse(userProgressStr);
    
    // Check if XP history exists and needs trimming
    if (!userProgress.xpHistory || userProgress.xpHistory.length <= MAX_XP_HISTORY_ENTRIES) {
      return 0;
    }
    
    const originalLength = userProgress.xpHistory.length;
    
    // Sort by timestamp (newest first) and keep only MAX_XP_HISTORY_ENTRIES
    userProgress.xpHistory = userProgress.xpHistory
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, MAX_XP_HISTORY_ENTRIES);
    
    // Save back to storage
    await AsyncStorage.setItem(KEYS.PROGRESS.USER_PROGRESS, JSON.stringify(userProgress));
    
    const removed = originalLength - userProgress.xpHistory.length;
    if (removed > 0) {
      console.log(`Trimmed ${removed} XP history entries`);
    }
    
    return removed;
  } catch (error) {
    console.error('Error limiting XP history:', error);
    return 0;
  }
};

/**
 * Runs all storage optimization functions
 * @returns Results of optimization operations
 */
export const optimizeStorage = async (): Promise<{
  routinesRemoved: number;
  xpEntriesRemoved: number;
  sizeBefore: number;
  sizeAfter: number;
}> => {
  // Get size before optimization
  const beforeStats = await getStorageStats();
  
  // Run optimizations
  const routinesRemoved = await pruneRoutineHistory();
  const xpEntriesRemoved = await limitXpHistory();
  
  // Get size after optimization
  const afterStats = await getStorageStats();
  
  const results = {
    routinesRemoved,
    xpEntriesRemoved,
    sizeBefore: beforeStats.totalSize,
    sizeAfter: afterStats.totalSize
  };
  
  console.log('===== STORAGE OPTIMIZATION RESULTS =====');
  console.log(`Removed ${routinesRemoved} routine entries`);
  console.log(`Removed ${xpEntriesRemoved} XP history entries`);
  console.log(`Size before: ${formatBytes(results.sizeBefore)}`);
  console.log(`Size after: ${formatBytes(results.sizeAfter)}`);
  console.log(`Saved: ${formatBytes(results.sizeBefore - results.sizeAfter)}`);
  console.log('========================================');
  
  return results;
}; 