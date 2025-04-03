/**
 * Cache Utilities for DeskStretch
 * Handles caching mechanisms for improved performance
 */

import { ProgressEntry } from '../../../../types';
import * as storageService from '../../../../services/storageService';

interface CacheEntry<T> {
  data: T | null;
  timestamp: number;
  ttl: number;
}

// Cache for routine data
let routineCache: CacheEntry<ProgressEntry[]> = {
  data: null,
  timestamp: 0,
  ttl: 60 * 1000 // 1 minute TTL by default
};

// Cache for level calculations
const levelCache: Record<number, {
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progress: number;
}> = {};

/**
 * Get all routines with caching to reduce redundant database calls
 */
export const getCachedRoutines = async (forceRefresh: boolean = false): Promise<ProgressEntry[]> => {
  const now = Date.now();
  
  // Return cached data if valid and not forcing refresh
  if (!forceRefresh && 
      routineCache.data && 
      routineCache.timestamp > 0 && 
      now - routineCache.timestamp < routineCache.ttl) {
    console.log('Using cached routines data');
    return routineCache.data;
  }
  
  // Refresh cache
  console.log('Fetching fresh routines data from storage');
  const allRoutines = await storageService.getAllRoutines() || [];
  
  // Update cache
  routineCache = {
    data: allRoutines,
    timestamp: now,
    ttl: 60 * 1000 // 1 minute TTL
  };
  
  return allRoutines;
};

/**
 * Invalidate routine cache when new data is added
 */
export const invalidateRoutineCache = (): void => {
  routineCache.timestamp = 0;
  routineCache.data = null;
};

/**
 * Get cached level calculation or calculate and cache new result
 */
export const getLevelCache = (xp: number): {
  level: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progress: number;
} | null => {
  return levelCache[xp] || null;
};

/**
 * Set level calculation in cache
 */
export const setLevelCache = (
  xp: number, 
  data: {
    level: number;
    xpForCurrentLevel: number;
    xpForNextLevel: number;
    progress: number;
  }
): void => {
  levelCache[xp] = data;
}; 