import { useState, useEffect } from 'react';
import { ProgressEntry } from '../../types';
import { useRoutineStorage } from '../routines/useRoutineStorage';
import { useRefresh } from '../../context/RefreshContext';
import {
  calculateStreak,
  calculateWeeklyActivity,
  calculateDayOfWeekActivity,
  calculateActiveDays
} from '../../utils/progressUtils';

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

/**
 * Custom hook to manage progress data loading and calculation
 */
export function useProgressData() {
  const { recentRoutines, getAllRoutines, isLoading, hasSynchronized, synchronizeProgressData } = useRoutineStorage();
  const { isRefreshing, refreshProgress } = useRefresh();
  
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

  // Check if user has completed routines but they're all hidden
  const hasHiddenRoutinesOnly = allProgressData.length > 0 && progressData.length === 0;

  // Calculate all stats from progress data
  const calculateStats = (data: ProgressEntry[]) => {
    if (!data || data.length === 0) {
      console.log('No data to calculate stats from');
      return;
    }
    
    console.log(`Calculating stats from ${data.length} routines (including hidden)`);
    
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
    const streak = calculateStreak(data);

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

    console.log(`Stats calculated: ${totalRoutines} routines, ${totalMinutes} minutes, streak: ${streak}, today complete: ${isTodayComplete}`);
    
    setStats({
      totalRoutines,
      totalMinutes,
      currentStreak: streak,
      areaBreakdown,
      weeklyActivity,
      dayOfWeekBreakdown,
      activeRoutineDays,
      isTodayComplete
    });
    
    // Log stats for debugging
    console.log('Stats updated for achievements:', {
      totalRoutines,
      streak,
      areaCount: Object.keys(areaBreakdown).length,
      totalMinutes,
      areaBreakdown
    });
  };

  // Handle refresh
  const handleRefresh = async () => {
    console.log('Refreshing progress data...');
    await refreshProgress();
    
    try {
      // Get all routines for both premium and free users
      const allRoutines = await getAllRoutines();
      console.log('Refreshed all routines:', allRoutines.length);
      setAllProgressData(allRoutines);
      
      // Calculate stats
      calculateStats(allRoutines);
    } catch (error) {
      console.error('Error refreshing all routines:', error);
    }
  };

  // Update visible routines for display
  useEffect(() => {
    const loadData = async () => {
      try {
        const allRoutines = await getAllRoutines();
        
        if (allRoutines && allRoutines.length > 0) {
          console.log('Loaded routines for stats calculation:', allRoutines.length);
          setAllProgressData(allRoutines);
          
          // Calculate stats
          calculateStats(allRoutines);
        }
      } catch (error) {
        console.error('Error loading progress data:', error);
      }
    };
    
    loadData();
  }, []);

  return { 
    stats, 
    progressData, 
    allProgressData,
    hasHiddenRoutinesOnly,
    isLoading,
    isRefreshing,
    handleRefresh,
    calculateStats
  };
} 