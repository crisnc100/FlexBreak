/**
 * Cache Utilities for flexbreak
 * Handles caching mechanisms for improved performance
 */

import { ProgressEntry } from '../../../../types';
import * as storageService from '../../../../services/storageService';
import { Challenge } from '../../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

// Cache for challenges by category
const challengeCache: Record<string, CacheEntry<Challenge[]>> = {
  daily: { data: null, timestamp: 0, ttl: 30 * 1000 }, // 30 seconds TTL
  weekly: { data: null, timestamp: 0, ttl: 60 * 1000 }, // 1 minute TTL
  monthly: { data: null, timestamp: 0, ttl: 120 * 1000 }, // 2 minutes TTL
  special: { data: null, timestamp: 0, ttl: 120 * 1000 }, // 2 minutes TTL
  claimable: { data: null, timestamp: 0, ttl: 20 * 1000 } // 20 seconds TTL (should be fresh)
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
 * Get cached challenges by category
 */
export const getCachedChallenges = (category: string, forceRefresh: boolean = false): Challenge[] | null => {
  const now = Date.now();
  const cache = challengeCache[category];
  
  // Return cached data if valid and not forcing refresh
  if (!forceRefresh && 
      cache && 
      cache.data && 
      cache.timestamp > 0 && 
      now - cache.timestamp < cache.ttl) {
    console.log(`Using cached ${category} challenges data`);
    return cache.data;
  }
  
  return null;
};

/**
 * Store challenges in cache by category
 */
export const setCachedChallenges = (category: string, challenges: Challenge[]): void => {
  if (!challengeCache[category]) {
    challengeCache[category] = {
      data: null,
      timestamp: 0,
      ttl: 60 * 1000 // Default 1 minute TTL
    };
  }
  
  console.log(`Caching ${challenges.length} ${category} challenges`);
  
  challengeCache[category].data = challenges;
  challengeCache[category].timestamp = Date.now();
};

/**
 * Set a value in AsyncStorage with proper string conversion
 * @param key Storage key
 * @param value Value to store
 * @returns Promise that resolves to true if successful
 */
export const setStoredValue = async (key: string, value: string): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.error(`Error setting stored value for key ${key}:`, error);
    return false;
  }
};

/**
 * Get a value from AsyncStorage
 * @param key Storage key
 * @param defaultValue Default value if not found
 * @returns The stored value or default value
 */
export const getStoredValue = async (key: string, defaultValue: string = ''): Promise<string> => {
  try {
    const value = await AsyncStorage.getItem(key);
    return value !== null ? value : defaultValue;
  } catch (error) {
    console.error(`Error getting stored value for key ${key}:`, error);
    return defaultValue;
  }
};

/**
 * Invalidate challenge cache for a specific category or all categories
 */
export const invalidateChallengeCache = (category?: string): void => {
  if (category) {
    if (challengeCache[category]) {
      console.log(`Invalidating ${category} challenge cache`);
      challengeCache[category].timestamp = 0;
      challengeCache[category].data = null;
    }
  } else {
    // Invalidate all challenge categories
    console.log('Invalidating all challenge caches');
    Object.keys(challengeCache).forEach(key => {
      challengeCache[key].timestamp = 0;
      challengeCache[key].data = null;
    });
  }
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

/**
 * Invalidate all types of caches
 */
export const invalidateAllCaches = (): void => {
  // Clear challenge caches for all categories
  const categories = ['daily', 'weekly', 'monthly', 'special', 'claimable'];
  categories.forEach(category => invalidateChallengeCache(category));
  
  // Clear routine cache
  invalidateRoutineCache();
  
  console.log('All caches invalidated');
}; 