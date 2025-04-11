import { ProgressEntry } from '../../../types';
import * as dateUtils from './utils/dateUtils';

/**
 * Calculates the current streak from a list of routines
 * This method handles basic streak calculation, not streak freeze logic
 * Streak freeze handling is now centralized in streakManager.ts
 * 
 * @param routines List of completed routines
 * @returns The current streak based on consecutive days
 */
export const calculateStreak = (routines: ProgressEntry[]): number => {
  if (!routines || routines.length === 0) {
    return 0;
  }
  
  // Get unique dates from routines
  const uniqueDates = Array.from(
    new Set(
      routines
        .filter(r => r.date)
        .map(r => r.date!.split('T')[0]) // Take only the date part
    )
  ).sort().reverse(); // Sort in descending order (newest first)
  
  console.log(`Calculating basic streak from ${uniqueDates.length} unique dates`);
  
  // If no dates, return 0
  if (uniqueDates.length === 0) {
    return 0;
  }
  
  // Count consecutive days starting from most recent date
  let streakCount = 1;  // Start with 1 for the most recent date
  let currentDate = new Date(uniqueDates[0]);
  
  // Start from the second date in our unique dates list
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i]);
    const dayDiff = dateUtils.daysBetween(prevDate, currentDate);
    
    // Check if dates are consecutive
    if (dayDiff === 1) {
      streakCount++;
      currentDate = prevDate;
    } else {
      // Streak is broken by a gap (2+ days)
      break;
    }
  }
  
  return streakCount;
};

/**
 * Calculate weekly activity for the past 7 days
 */
export const calculateWeeklyActivity = (data: ProgressEntry[]) => {
  // Create an array for the last 7 days (0 = today, 1 = yesterday, etc.)
  const last7Days = Array(7).fill(0);
  
  // Get today's date at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Calculate the timestamp for 7 days ago
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6); // Go back 6 days to include today
  
  console.log('Calculating weekly activity from', sevenDaysAgo.toISOString(), 'to', today.toISOString());
  
  // Process each routine entry
  data.forEach(entry => {
    // Parse the entry date and set to midnight
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);
    
    // Check if the entry is within the last 7 days
    if (entryDate >= sevenDaysAgo && entryDate <= today) {
      // Calculate days difference from today
      const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Increment the count for this day
      if (daysDiff >= 0 && daysDiff < 7) {
        last7Days[daysDiff]++;
      }
    }
  });
  
  // Reverse the array so it's in chronological order (oldest to newest)
  const result = [...last7Days].reverse();
  
  console.log('Weekly activity data:', result);
  return result;
};

/**
 * Calculate activity by day of week
 */
export const calculateDayOfWeekActivity = (data: ProgressEntry[]) => {
  // Initialize array for days of week (0 = Monday, 1 = Tuesday, ..., 6 = Sunday)
  const daysOfWeek = Array(7).fill(0);
  
  // Process each routine entry
  data.forEach(entry => {
    try {
      const date = new Date(entry.date);
      
      // Convert JavaScript day (0 = Sunday, 1 = Monday, ...) to our format (0 = Monday, ..., 6 = Sunday)
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
      const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to 0 = Monday, ..., 6 = Sunday
      
      // Increment the count for this day of week
      daysOfWeek[adjustedDayOfWeek]++;
    } catch (error) {
      console.error('Error processing date:', entry.date, error);
    }
  });
  
  console.log('Day of week activity data:', daysOfWeek);
  return daysOfWeek;
};

/**
 * Calculate active days over the last 30 days
 */
export const calculateActiveDays = (data: ProgressEntry[]) => {
  if (data.length === 0) return 0;
  
  const today = new Date().setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // 30 days including today
  const thirtyDaysAgoTimestamp = thirtyDaysAgo.setHours(0, 0, 0, 0);
  
  // Get unique dates in the last 30 days
  const uniqueDates = new Set();
  
  data.forEach(entry => {
    const entryDate = new Date(entry.date).setHours(0, 0, 0, 0);
    if (entryDate >= thirtyDaysAgoTimestamp && entryDate <= today) {
      uniqueDates.add(entryDate);
    }
  });
  
  return uniqueDates.size;
};

/**
 * Get ordered day names based on the current day
 */
export const getOrderedDayNames = (dayNames: string[]) => {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Convert to our format where 0 = Monday
  const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  
  // Create an array of the last 7 days in order
  const orderedDays = [];
  for (let i = 6; i >= 0; i--) {
    // Calculate the day index, wrapping around if necessary
    const dayIndex = (adjustedDayOfWeek - i + 7) % 7;
    orderedDays.push(dayNames[dayIndex]);
  }
  
  return orderedDays;
};

/**
 * Get the date range for the weekly activity chart
 */
export const getWeeklyActivityDateRange = () => {
  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 6); // Go back 6 days to include today
  
  // Format dates as MM/DD
  const formatDate = (date: Date) => {
    const month = date.getMonth() + 1; // getMonth() is 0-indexed
    const day = date.getDate();
    return `${month}/${day}`;
  };
  
  return `${formatDate(sevenDaysAgo)} - ${formatDate(today)}`;
};

/**
 * Calculate consistency percentage
 */
export const getConsistencyPercentage = (activeDays: number) => {
  return Math.round((activeDays / 30) * 100);
};

/**
 * Find most active day
 */
export const getMostActiveDay = (dayOfWeekBreakdown: number[], dayNames: string[]) => {
  // If there's no activity data, return N/A
  if (dayOfWeekBreakdown.every(count => count === 0)) {
    return 'N/A';
  }
  
  // Find the index of the maximum value
  const maxValue = Math.max(...dayOfWeekBreakdown);
  const maxIndex = dayOfWeekBreakdown.indexOf(maxValue);
  
  // Check if there are multiple days with the same maximum value
  const maxDays = dayOfWeekBreakdown.filter(count => count === maxValue);
  
  if (maxDays.length > 1) {
    // Multiple days have the same count
    return dayNames[maxIndex] + ' +';
  }
  
  return dayNames[maxIndex];
};

/**
 * Calculates the streak with freeze dates included
 * This addresses inconsistencies between streakManager and the main stats system
 *
 * @param routineDates Array of routine dates (YYYY-MM-DD)
 * @param freezeDates Array of freeze dates (YYYY-MM-DD)
 * @returns The current streak based on consecutive days
 */
export const calculateStreakWithFreezes = (routineDates: string[], freezeDates: string[]): number => {
  if ((!routineDates || routineDates.length === 0) && (!freezeDates || freezeDates.length === 0)) {
    return 0;
  }
  
  // Combine unique dates from routines and freezes
  const uniqueDates = Array.from(
    new Set([...routineDates, ...freezeDates])
  ).sort().reverse(); // Sort in descending order (newest first)
  
  console.log(`Calculating streak from ${uniqueDates.length} unique dates (${routineDates.length} routines, ${freezeDates.length} freezes)`);
  
  // If no dates, return 0
  if (uniqueDates.length === 0) {
    return 0;
  }
  
  // Count consecutive days starting from most recent date
  let streakCount = 1;  // Start with 1 for the most recent date
  let currentDate = new Date(uniqueDates[0]);
  
  // Start from the second date in our unique dates list
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i]);
    const dayDiff = dateUtils.daysBetween(prevDate, currentDate);
    
    // Check if dates are consecutive
    if (dayDiff === 1) {
      streakCount++;
      currentDate = prevDate;
    } else {
      // Streak is broken by a gap (2+ days)
      break;
    }
  }
  
  return streakCount;
}; 