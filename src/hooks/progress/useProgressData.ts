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

  // Check if user has completed routines but they're all hidden
  const hasHiddenRoutinesOnly = allProgressData.length > 0 && progressData.length === 0;

  // Calculate all stats from progress data
  const calculateStats = useCallback(async (data: ProgressEntry[]) => {
    if (!data || data.length === 0) {
      return;
    }
    
    // First get user progress from storage to ensure we have the most accurate streak
    const userProgress = await storageService.getUserProgress();
    const storedStreak = userProgress.statistics.currentStreak;
    
    // Get the freeze dates to include in streak calculation
    const freezeDates = userProgress.rewards?.streak_freezes?.appliedDates || [];
    
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
      .map(r => dateUtils.toDateString(r.date));
    
    // Check today and yesterday
    const today = new Date();
    const todayStr = dateUtils.formatDateYYYYMMDD(today);
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = dateUtils.formatDateYYYYMMDD(yesterday);
    
    const hasToday = routineDates.includes(todayStr);
    const hasYesterday = routineDates.includes(yesterdayStr);
    const hasFreezeYesterday = freezeDates.includes(yesterdayStr);
    
    // Calculate current streak with and without freezes to compare
    const calculatedStreakBasic = calculateStreak(data);
    const calculatedStreakWithFreezes = calculateStreakWithFreezes(routineDates, freezeDates);
    
    // IMPORTANT: To avoid streak switching between 0 and 1, explicitly validate with streakValidator
    let displayStreak = calculatedStreakWithFreezes;
    
    try {
      // Validate through the streak validator which is the most reliable source of truth
      const validationResult = await streakValidator.validateAndCorrectStreak();
      
      if (validationResult.success) {
        displayStreak = validationResult.correctedStreak;
      }
    } catch (error) {
      console.error('[STATS ERROR] Error validating streak, falling back to calculated value:', error);
    }
    
    // Make sure we never flip-flop between 0 and 1 for single day activity
    if (calculatedStreakWithFreezes === 1 && displayStreak === 0) {
      // If there's activity today, a streak of 1 is more accurate than 0
      const hasTodayActivity = routineDates.includes(todayStr);
      
      if (hasTodayActivity) {
        displayStreak = 1;
      }
    }

    // Check if there's an activity today
    const isTodayComplete = routineDates.includes(todayStr);

    // Area breakdown
    const areaBreakdown = data.reduce((acc, entry) => {
      acc[entry.area] = (acc[entry.area] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Weekly activity trend (last 7 days)
    const weeklyActivity = calculateWeeklyActivity(data);

    // Day of week breakdown
    const dayOfWeekBreakdown = calculateDayOfWeekActivity(data);

    // Calculate active days over the last 30 days
    const activeRoutineDays = calculateActiveDays(data);
    
    // Save the value back to userProgress to ensure consistency across the app
    if (userProgress.statistics.currentStreak !== displayStreak) {
      userProgress.statistics.currentStreak = displayStreak;
      await storageService.saveUserProgress(userProgress);
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
    
    setStats(newStats);
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
        setUserProgress(dataCache.userProgress);
      } else {
        // Load fresh data from storage
        const progress = await storageService.getUserProgress();
        
        // Update cache
        dataCache.userProgress = progress;
        dataCache.lastUpdated = now;
        
        setUserProgress(progress);
      }
      
      // Check streak freeze count with caching
      const freezeCacheValid = !forceRefresh && 
                              (now - dataCache.freezeLastUpdated < dataCache.cooldownPeriod);
      
      if (freezeCacheValid) {
        setFreezeCount(dataCache.freezeCount);
      } else {
        // Check if user is premium before getting freeze count
        const isPremium = await storageService.getIsPremium();
        
        if (isPremium) {
          const count = await streakFreezeManager.getFreezesAvailable();
          
          // Update freeze cache
          dataCache.freezeCount = count;
          dataCache.freezeLastUpdated = now;
          
          setFreezeCount(count);
        } else {
          // Set to 0 for non-premium users
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
    await loadUserProgress(true);
  }, [loadUserProgress]);

  // Handle refresh - this now ensures both progress and gamification data are refreshed
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    
    try {
      // First synchronize all data between storage locations
      await synchronizeProgressData();
      
      // Then refresh the context
      await refreshProgress();
      
      // Refresh gamification data
      await refreshGamificationData();
      
      // Get all routines - this should now be consistent across all data sources
      const allRoutines = await getAllRoutines();
      
      // Update state
      setAllProgressData(allRoutines);
      setProgressData(allRoutines.filter(r => !r.hidden));
      
      // Calculate stats - now we need to await this since it's async
      await calculateStats(allRoutines);
    } catch (error) {
      console.error('[STATS ERROR] Error refreshing all routines and gamification data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [refreshProgress, refreshGamificationData, getAllRoutines, synchronizeProgressData, calculateStats]);

  // Initial data load - now with better coordination
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // First make sure all data is synchronized
        await storageService.synchronizeProgressData();
        
        // Load all routines
        const allRoutines = await getAllRoutines();
        
        if (allRoutines && allRoutines.length > 0) {
          setAllProgressData(allRoutines);
          setProgressData(allRoutines.filter(r => !r.hidden));
          
          // Calculate stats
          calculateStats(allRoutines);
        } else {
          setAllProgressData([]);
          setProgressData([]);
          
          // Reset stats to default values
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
      }
    };
    
    loadData();
  }, [calculateStats, getAllRoutines]);

  // Load data on component mount
  useEffect(() => {
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