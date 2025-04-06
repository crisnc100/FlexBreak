import { useState, useEffect, useCallback } from 'react';
import { ProgressEntry } from '../../types';
import { useRoutineStorage } from '../routines/useRoutineStorage';
import { useRefresh } from '../../context/RefreshContext';
import { useGamification } from './useGamification';
import {
  calculateStreak,
  calculateWeeklyActivity,
  calculateDayOfWeekActivity,
  calculateActiveDays
} from '../../utils/progress/modules/progressTracker';
import * as storageService from '../../services/storageService';
import { UserProgress } from '../../utils/progress/types';
import * as streakFreezeManager from '../../utils/progress/modules/streakFreezeManager';

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
      console.log('No data to calculate stats from');
      return;
    }
    
    console.log(`Calculating stats from ${data.length} routines (including hidden)`);
    
    // First get user progress from storage to ensure we have the most accurate streak
    const userProgress = await storageService.getUserProgress();
    const storedStreak = userProgress.statistics.currentStreak;
    
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

    // Calculate current streak
    const calculatedStreak = calculateStreak(data);
    
    // Use the stored streak from user progress if it's higher than the calculated streak
    // This ensures that freeze-protected streaks are properly recognized
    const displayStreak = Math.max(calculatedStreak, storedStreak);
    
    console.log('Streak comparison:', {
      calculatedStreak, 
      storedStreak, 
      displayStreak
    });

    // Check if there's an activity today
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const isTodayComplete = data.some(entry => {
      const entryDate = new Date(entry.date);
      const entryDateStr = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryDate.getDate()).padStart(2, '0')}`;
      return entryDateStr === todayStr;
    });
    
    console.log(`Today's activity check (${todayStr}): ${isTodayComplete ? 'Complete' : 'Incomplete'}`);

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

    console.log(`Stats calculated: ${totalRoutines} routines, ${totalMinutes} minutes, streak: ${displayStreak}, today complete: ${isTodayComplete}`);
    
    setStats({
      totalRoutines,
      totalMinutes,
      currentStreak: displayStreak,
      areaBreakdown,
      weeklyActivity,
      dayOfWeekBreakdown,
      activeRoutineDays,
      isTodayComplete
    });
    
    // Log stats for debugging
    console.log('Stats updated for achievements:', {
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
        console.log('Using cached progress data (age: ' + (now - dataCache.lastUpdated) + 'ms)');
        setUserProgress(dataCache.userProgress);
      } else {
        // Load fresh data from storage
        console.log('Loading fresh progress data from storage');
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
        console.log('Using cached freeze count: ' + dataCache.freezeCount);
        setFreezeCount(dataCache.freezeCount);
      } else {
        const count = await streakFreezeManager.getStreakFreezeCount();
        
        // Update freeze cache
        dataCache.freezeCount = count;
        dataCache.freezeLastUpdated = now;
        
        setFreezeCount(count);
      }
    } catch (error) {
      console.error('Error loading progress data:', error);
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
    console.log('Refreshing progress and gamification data...');
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
      console.log('Refreshed all routines:', allRoutines.length);
      
      // Update state
      setAllProgressData(allRoutines);
      setProgressData(allRoutines.filter(r => !r.hidden));
      
      // Calculate stats - now we need to await this since it's async
      await calculateStats(allRoutines);
    } catch (error) {
      console.error('Error refreshing all routines and gamification data:', error);
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
          console.log('Loaded routines for stats calculation:', allRoutines.length);
          setAllProgressData(allRoutines);
          setProgressData(allRoutines.filter(r => !r.hidden));
          
          // Calculate stats
          calculateStats(allRoutines);
        } else {
          console.log('No routines found for stats calculation');
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
        console.error('Error loading progress data:', error);
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