import { useState, useEffect, useCallback } from 'react';
import { ProgressEntry } from '../../types';
import { useRoutineStorage } from '../routines/useRoutineStorage';
import { useRefresh } from '../../context/RefreshContext';
import { useGamification } from './useGamification';
import {
  calculateStreak,
  calculateStreakWithFreezes,
  calculateWeeklyActivity,
  calculateDayOfWeekActivity,
  calculateActiveDays
} from '../../utils/progress/modules/progressTracker';
import * as storageService from '../../services/storageService';
import * as streakManager from '../../utils/progress/modules/streakManager';
import { UserProgress } from '../../utils/progress/types';
import * as streakFreezeManager from '../../utils/progress/modules/streakFreezeManager';
import * as streakValidator from '../../utils/progress/modules/streakValidator';
import * as dateUtils from '../../utils/progress/modules/utils/dateUtils';

// Define progress stats interface
export interface ProgressStats {
  totalRoutines: number;
  totalMinutes: number;
  currentStreak: number;
  areaBreakdown: Record<string, number>;
  weeklyActivity: number[];
  dayOfWeekBreakdown: number[];
  activeRoutineDays: number;
  isTodayComplete: boolean;
}

// Cache data with timestamps to minimize unnecessary refreshes
const dataCache = {
  userProgress: null as UserProgress | null,
  lastUpdated: 0,
  freezeCount: 0,
  freezeLastUpdated: 0,
  // Cooldown period in ms (300ms)
  cooldownPeriod: 300
};

/**
 * Custom hook to manage progress data loading and calculation
 */
export function useProgressData() {
  const { recentRoutines, getAllRoutines, isLoading: isRoutinesLoading, synchronizeProgressData } = useRoutineStorage();
  const { isRefreshing, refreshProgress } = useRefresh();
  const { refreshData: refreshGamificationData } = useGamification();
  const [isLoading, setIsLoading] = useState(true);
  
  const [progressData, setProgressData] = useState<ProgressEntry[]>([]);
  const [allProgressData, setAllProgressData] = useState<ProgressEntry[]>([]);
  const [stats, setStats] = useState<ProgressStats>({
    totalRoutines: 0,
    totalMinutes: 0,
    currentStreak: 0,
    areaBreakdown: {},
    weeklyActivity: Array(7).fill(0),
    dayOfWeekBreakdown: Array(7).fill(0),
    activeRoutineDays: 0,
    isTodayComplete: false
  });
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
  const [freezeCount, setFreezeCount] = useState(0);

  // Add debug effect to log stats when they change
  useEffect(() => {
    console.log(`[STATS DEBUG] Stats updated: 
      - Total routines: ${stats.totalRoutines}
      - Total minutes: ${stats.totalMinutes}
      - Current streak: ${stats.currentStreak}
      - Today complete: ${stats.isTodayComplete}
      - Active days (30d): ${stats.activeRoutineDays}
      - Areas: ${Object.keys(stats.areaBreakdown).join(', ')}
    `);
    
    // Log weekly activity data
    console.log(`[STATS DEBUG] Weekly activity: ${JSON.stringify(stats.weeklyActivity)}`);
    
    // Log day of week breakdown
    console.log(`[STATS DEBUG] Day of week breakdown: ${JSON.stringify(stats.dayOfWeekBreakdown)}`);
    
  }, [stats]);
  
  // Log when freeze count changes
  useEffect(() => {
    console.log(`[STATS DEBUG] Freeze count updated: ${freezeCount}`);
  }, [freezeCount]);

  // Check if user has completed routines but they're all hidden
  const hasHiddenRoutinesOnly = allProgressData.length > 0 && progressData.length === 0;

  // Calculate all stats from progress data
  const calculateStats = useCallback(async (data: ProgressEntry[]) => {
    if (!data || data.length === 0) {
      console.log('[STATS DEBUG] No data to calculate stats from');
      return;
    }
    
    console.log(`[STATS DEBUG] Calculating stats from ${data.length} routines (including hidden)`);
    
    // Log all dates for debugging
    const allDates = data.map(entry => {
      const dateOnly = dateUtils.toDateString(entry.date) || '';
      return dateOnly;
    }).sort();
    console.log(`[STATS DEBUG] All routine dates: ${JSON.stringify(allDates)}`);
    
    // First get user progress from storage to ensure we have the most accurate streak
    const userProgress = await storageService.getUserProgress();
    const storedStreak = userProgress.statistics.currentStreak;
    
    // Get the freeze dates to include in streak calculation
    const freezeDates = userProgress.rewards?.streak_freezes?.appliedDates || [];
    console.log(`[STATS DEBUG] Freeze dates: ${JSON.stringify(freezeDates)}`);
    
    // Total routines
    const totalRoutines = data.length;

    // Total minutes
    const totalMinutes = data.reduce((sum, entry) => {
      // Make sure we're parsing the duration as a number
      const duration = typeof entry.duration === 'string' 
        ? parseInt(entry.duration, 10) 
        : (typeof entry.duration === 'number' ? entry.duration : 0);
      
      return sum + (isNaN(duration) ? 0 : duration);
    }, 0);

    // Extract routine dates for streak calculation
    const routineDates = data
      .filter(r => r.date)
      .map(r => r.date!.split('T')[0]);
    
    console.log(`[STATS DEBUG] Extracted ${routineDates.length} routine dates for streak calculation`);
    
    // Check today and yesterday
    const today = new Date();
    const todayStr = dateUtils.formatDateYYYYMMDD(today);
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = dateUtils.formatDateYYYYMMDD(yesterday);
    
    const hasToday = routineDates.includes(todayStr);
    const hasYesterday = routineDates.includes(yesterdayStr);
    const hasFreezeYesterday = freezeDates.includes(yesterdayStr);
    
    console.log(`[STATS DEBUG] Date checks: 
      - Today (${todayStr}): ${hasToday ? 'Has routine' : 'No routine'}
      - Yesterday (${yesterdayStr}): ${hasYesterday ? 'Has routine' : 'No routine'}, ${hasFreezeYesterday ? 'Has freeze' : 'No freeze'}
    `);
    
    // Calculate current streak with and without freezes to compare
    const calculatedStreakBasic = calculateStreak(data);
    const calculatedStreakWithFreezes = calculateStreakWithFreezes(routineDates, freezeDates);
    
    console.log(`[STATS DEBUG] Streak calculations:
      - Basic streak: ${calculatedStreakBasic}
      - With freezes: ${calculatedStreakWithFreezes}
      - Stored streak: ${storedStreak}
    `);
    
    // IMPORTANT: To avoid streak switching between 0 and 1, explicitly validate with streakValidator
    let displayStreak = calculatedStreakWithFreezes;
    
    try {
      // Validate through the streak validator which is the most reliable source of truth
      console.log('[STATS DEBUG] Calling streak validator...');
      const validationResult = await streakValidator.validateAndCorrectStreak();
      
      if (validationResult.success) {
        displayStreak = validationResult.correctedStreak;
        console.log(`[STATS DEBUG] Validator returned corrected streak: ${displayStreak}`);
        
        // If we've made corrections, make sure they're saved
        if (validationResult.corrections.length > 0) {
          console.log('[STATS DEBUG] Streak validation corrections made:', validationResult.corrections);
        }
      } else {
        console.log('[STATS DEBUG] Streak validation failed, using calculated streak');
      }
    } catch (error) {
      console.error('[STATS ERROR] Error validating streak, falling back to calculated value:', error);
    }
    
    // Make sure we never flip-flop between 0 and 1 for single day activity
    if (calculatedStreakWithFreezes === 1 && displayStreak === 0) {
      // If there's activity today, a streak of 1 is more accurate than 0
      const hasTodayActivity = routineDates.includes(todayStr);
      
      if (hasTodayActivity) {
        console.log('[STATS DEBUG] Override: Using streak=1 because there is activity today');
        displayStreak = 1;
      }
    }
    
    console.log('[STATS DEBUG] Final streak comparison:', {
      calculatedStreak: calculatedStreakBasic, 
      calculatedWithFreezes: calculatedStreakWithFreezes,
      storedStreak, 
      displayStreak
    });

    // Check if there's an activity today
    const isTodayComplete = routineDates.includes(todayStr);
    
    console.log(`[STATS DEBUG] Today's activity check (${todayStr}): ${isTodayComplete ? 'Complete' : 'Incomplete'}`);

    // Area breakdown
    const areaBreakdown = data.reduce((acc, entry) => {
      acc[entry.area] = (acc[entry.area] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(`[STATS DEBUG] Area breakdown: ${JSON.stringify(areaBreakdown)}`);

    // Weekly activity trend (last 7 days)
    const weeklyActivity = calculateWeeklyActivity(data);
    console.log(`[STATS DEBUG] Weekly activity: ${JSON.stringify(weeklyActivity)}`);

    // Day of week breakdown
    const dayOfWeekBreakdown = calculateDayOfWeekActivity(data);
    console.log(`[STATS DEBUG] Day of week breakdown: ${JSON.stringify(dayOfWeekBreakdown)}`);

    // Calculate active days over the last 30 days
    const activeRoutineDays = calculateActiveDays(data);
    console.log(`[STATS DEBUG] Active days (30 days): ${activeRoutineDays}`);

    console.log(`[STATS DEBUG] Stats calculated: ${totalRoutines} routines, ${totalMinutes} minutes, streak: ${displayStreak}, today complete: ${isTodayComplete}`);
    
    // Save the value back to userProgress to ensure consistency across the app
    if (userProgress.statistics.currentStreak !== displayStreak) {
      console.log(`[STATS DEBUG] Updating UserProgress streak from ${userProgress.statistics.currentStreak} to ${displayStreak}`);
      userProgress.statistics.currentStreak = displayStreak;
      await storageService.saveUserProgress(userProgress);
      console.log(`[STATS DEBUG] Updated UserProgress streak to ${displayStreak}`);
    }
    
    // Create and set updated stats
    const newStats = {
      totalRoutines,
      totalMinutes,
      currentStreak: displayStreak,
      areaBreakdown,
      weeklyActivity,
      dayOfWeekBreakdown,
      activeRoutineDays,
      isTodayComplete
    };
    
    console.log('[STATS DEBUG] Setting new stats:', JSON.stringify(newStats, null, 2));
    setStats(newStats);
    
    // Log stats for debugging
    console.log('[STATS DEBUG] Stats updated for achievements:', {
      totalRoutines,
      streak: displayStreak,
      areaCount: Object.keys(areaBreakdown).length,
      totalMinutes,
      areaBreakdown
    });
  }, []);

  // Load user progress with caching
  const loadUserProgress = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      
      const now = Date.now();
      const cacheValid = !forceRefresh && 
                         dataCache.userProgress && 
                         (now - dataCache.lastUpdated < dataCache.cooldownPeriod);
      
      // Use cached data if valid and not forcing refresh
      if (cacheValid) {
        console.log(`[STATS DEBUG] Using cached progress data (age: ${now - dataCache.lastUpdated}ms)`);
        setUserProgress(dataCache.userProgress);
      } else {
        // Load fresh data from storage
        console.log('[STATS DEBUG] Loading fresh progress data from storage');
        const progress = await storageService.getUserProgress();
        
        console.log(`[STATS DEBUG] Loaded user progress: Level ${progress.level}, XP: ${progress.totalXP}, Current streak: ${progress.statistics.currentStreak}`);
        
        // Update cache
        dataCache.userProgress = progress;
        dataCache.lastUpdated = now;
        
        setUserProgress(progress);
      }
      
      // Check streak freeze count with caching
      const freezeCacheValid = !forceRefresh && 
                              (now - dataCache.freezeLastUpdated < dataCache.cooldownPeriod);
      
      if (freezeCacheValid) {
        console.log(`[STATS DEBUG] Using cached freeze count: ${dataCache.freezeCount}`);
        setFreezeCount(dataCache.freezeCount);
      } else {
        // Check if user is premium before getting freeze count
        const isPremium = await storageService.getIsPremium();
        
        if (isPremium) {
          console.log('[STATS DEBUG] User is premium, fetching freeze count');
          const count = await streakFreezeManager.getFreezesAvailable();
          console.log(`[STATS DEBUG] Retrieved freeze count: ${count}`);
          
          // Update freeze cache
          dataCache.freezeCount = count;
          dataCache.freezeLastUpdated = now;
          
          setFreezeCount(count);
        } else {
          // Set to 0 for non-premium users
          console.log('[STATS DEBUG] User is not premium, setting freeze count to 0');
          dataCache.freezeCount = 0;
          dataCache.freezeLastUpdated = now;
          setFreezeCount(0);
        }
      }
    } catch (error) {
      console.error('[STATS ERROR] Error loading progress data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Force refresh bypassing cache
  const forceRefresh = useCallback(async () => {
    console.log('[STATS DEBUG] Force refreshing progress data...');
    await loadUserProgress(true);
  }, [loadUserProgress]);

  // Handle refresh - this now ensures both progress and gamification data are refreshed
  const handleRefresh = useCallback(async () => {
    console.log('[STATS DEBUG] Refreshing progress and gamification data...');
    setIsLoading(true);
    
    try {
      // First synchronize all data between storage locations
      console.log('[STATS DEBUG] Synchronizing storage data...');
      await synchronizeProgressData();
      
      // Then refresh the context
      console.log('[STATS DEBUG] Refreshing progress context...');
      await refreshProgress();
      
      // Refresh gamification data
      console.log('[STATS DEBUG] Refreshing gamification data...');
      await refreshGamificationData();
      
      // Get all routines - this should now be consistent across all data sources
      console.log('[STATS DEBUG] Getting all routines after refresh...');
      const allRoutines = await getAllRoutines();
      console.log(`[STATS DEBUG] Refreshed all routines: ${allRoutines.length}`);
      
      // Extract dates for debugging
      const routineDates = allRoutines.map(r => r.date?.split('T')[0]).sort();
      console.log(`[STATS DEBUG] All routine dates after refresh: ${JSON.stringify(routineDates)}`);
      
      // Update state
      setAllProgressData(allRoutines);
      setProgressData(allRoutines.filter(r => !r.hidden));
      
      // Calculate stats - now we need to await this since it's async
      console.log('[STATS DEBUG] Calculating stats after refresh...');
      await calculateStats(allRoutines);
      
      console.log('[STATS DEBUG] Refresh complete');
    } catch (error) {
      console.error('[STATS ERROR] Error refreshing all routines and gamification data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [refreshProgress, refreshGamificationData, getAllRoutines, synchronizeProgressData, calculateStats]);

  // Initial data load - now with better coordination
  useEffect(() => {
    const loadData = async () => {
      console.log('[STATS DEBUG] Initial data load started');
      setIsLoading(true);
      try {
        // First make sure all data is synchronized
        console.log('[STATS DEBUG] Synchronizing progress data on initial load...');
        await storageService.synchronizeProgressData();
        
        // Load all routines
        console.log('[STATS DEBUG] Loading all routines on initial load...');
        const allRoutines = await getAllRoutines();
        
        if (allRoutines && allRoutines.length > 0) {
          console.log(`[STATS DEBUG] Loaded ${allRoutines.length} routines for stats calculation`);
          
          // Extract dates for debugging
          const routineDates = allRoutines.map(r => r.date?.split('T')[0]).sort();
          console.log(`[STATS DEBUG] All routine dates on initial load: ${JSON.stringify(routineDates)}`);
          
          setAllProgressData(allRoutines);
          setProgressData(allRoutines.filter(r => !r.hidden));
          console.log(`[STATS DEBUG] Visible routines: ${allRoutines.filter(r => !r.hidden).length}`);
          
          // Calculate stats
          console.log('[STATS DEBUG] Calculating initial stats...');
          calculateStats(allRoutines);
        } else {
          console.log('[STATS DEBUG] No routines found for stats calculation');
          setAllProgressData([]);
          setProgressData([]);
          
          // Reset stats to default values
          console.log('[STATS DEBUG] Setting default stats (no routines)');
          setStats({
            totalRoutines: 0,
            totalMinutes: 0,
            currentStreak: 0,
            areaBreakdown: {},
            weeklyActivity: Array(7).fill(0),
            dayOfWeekBreakdown: Array(7).fill(0),
            activeRoutineDays: 0,
            isTodayComplete: false
          });
        }
      } catch (error) {
        console.error('[STATS ERROR] Error loading progress data:', error);
      } finally {
        setIsLoading(false);
        console.log('[STATS DEBUG] Initial data load complete');
      }
    };
    
    loadData();
  }, [calculateStats, getAllRoutines]);

  // Load data on component mount
  useEffect(() => {
    console.log('[STATS DEBUG] Initial user progress load');
    loadUserProgress();
  }, [loadUserProgress]);

  return { 
    stats, 
    progressData, 
    allProgressData,
    hasHiddenRoutinesOnly,
    isLoading: isLoading || isRoutinesLoading || isRefreshing,
    isRefreshing,
    handleRefresh,
    calculateStats,
    userProgress,
    freezeCount,
    loadUserProgress,
    forceRefresh
  };
} 