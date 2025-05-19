import { ProgressEntry } from '../../../types';
import * as dateUtils from './utils/dateUtils';

// For converting ISO date strings to local YYYY-MM-DD format, use dateUtils.toDateString

/**
 * Calculates the current streak from a list of routines
 * This method handles basic streak calculation, not streak flexSave logic
 * Streak flexSave handling is now centralized in streakManager.ts
 * 
 * @param routines List of completed routines
 * @returns The current streak based on consecutive days
 */
export const calculateStreak = (routines: ProgressEntry[]): number => {
  if (!routines || routines.length === 0) {
    return 0;
  }
  
  
  // Get unique dates from routines, using local dates instead of UTC
  const uniqueDates = Array.from(
    new Set(
      routines
        .filter(r => r.date)
        .map(r => dateUtils.toDateString(r.date!)) // Use dateUtils.toDateString instead of convertToLocalDateStr
    )
  ).sort().reverse(); // Sort in descending order (newest first)
  

  
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
  
  // Count entries within range for validation
  let entriesInRange = 0;
  
  // Process each routine entry
  data.forEach(entry => {
    // Parse the entry date using local time, not UTC
    const entryDate = new Date(entry.date);
    entryDate.setHours(0, 0, 0, 0);
    
    // Check if the entry is within the last 7 days
    if (entryDate >= sevenDaysAgo && entryDate <= today) {
      // Calculate days difference from today
      const daysDiff = Math.floor((today.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24));
      
      entriesInRange++;
      
      // Increment the count for this day
      if (daysDiff >= 0 && daysDiff < 7) {
        last7Days[daysDiff]++;
      }
    }
  });
  
  // Reverse the array so it's in chronological order (oldest to newest)
  const result = [...last7Days].reverse();
  
  return result;
};

/**
 * Calculate activity by day of week
 */
export const calculateDayOfWeekActivity = (data: ProgressEntry[]) => {
  // Initialize array for days of week (0 = Monday, 1 = Tuesday, ..., 6 = Sunday)
  const daysOfWeek = Array(7).fill(0);
  
  // Count how many entries we successfully process
  let processedEntries = 0;
  
  // Process each routine entry
  data.forEach(entry => {
    try {
      // Use local date to get the day of week to ensure correct day attribution
      const date = new Date(entry.date);
      
      // Convert JavaScript day (0 = Sunday, 1 = Monday, ...) to our format (0 = Monday, ..., 6 = Sunday)
      const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
      const adjustedDayOfWeek = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert to 0 = Monday, ..., 6 = Sunday
      
      // Increment the count for this day of week
      daysOfWeek[adjustedDayOfWeek]++;
      
      processedEntries++;
    } catch (error) {
      // Silent fail
    }
  });
  
  return daysOfWeek;
};

/**
 * Calculate active days over the last 30 days
 */
export const calculateActiveDays = (data: ProgressEntry[]) => {
  if (data.length === 0) {
    return 0;
  }
  
  const today = new Date().setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // 30 days including today
  const thirtyDaysAgoTimestamp = thirtyDaysAgo.setHours(0, 0, 0, 0);
  
  // Get unique dates in the last 30 days, using local dates for consistent day attribution
  const uniqueDates = new Set();
  
  // Track which dates were found
  const foundDates: string[] = [];
  
  data.forEach(entry => {
    // Convert the entry date to local time for consistency
    const localDateStr = dateUtils.toDateString(entry.date);
    const entryDate = new Date(localDateStr).setHours(0, 0, 0, 0);
    
    if (entryDate >= thirtyDaysAgoTimestamp && entryDate <= today) {
      uniqueDates.add(entryDate);
      foundDates.push(localDateStr);
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
  
  const result = `${formatDate(sevenDaysAgo)} - ${formatDate(today)}`;
  return result;
};

/**
 * Calculate consistency percentage
 */
export const getConsistencyPercentage = (activeDays: number) => {
  const result = Math.round((activeDays / 30) * 100);
  return result;
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
 * Calculates the streak with flexSave dates included
 * This addresses inconsistencies between streakManager and the main stats system
 *
 * @param routineDates Array of routine dates (YYYY-MM-DD, local tz)
 * @param flexSaveDates  Array of flexSave dates  (YYYY-MM-DD, local tz)
 * @returns The current streak based on consecutive days
 */
export const calculateStreakWithFlexSaves = (
  routineDates: string[],
  flexSaveDates:  string[]
): number => {
  // ────────────────  early-out for empty data  ────────────────
  if ((!routineDates?.length) && (!flexSaveDates?.length)) return 0;



  /* ------------------------------------------------------------------
   * 1️⃣  make absolutely sure every entry is a *local* YYYY-MM-DD string
   *     (avoids the implicit UTC parse bug)
   * ------------------------------------------------------------------ */
  const normalisedDates = [
    ...routineDates.map(d => dateUtils.toDateString(d)),
    ...flexSaveDates .map(d => dateUtils.toDateString(d))
  ];

  const uniqueDates = Array.from(new Set(normalisedDates)).sort().reverse();


  if (!uniqueDates.length) return 0;                // paranoia guard

  // -------------------------------------------------------------------
  const today      = dateUtils.todayStringLocal();
  const yesterday  = dateUtils.yesterdayStringLocal();



  const hasToday      = uniqueDates.includes(today);
  const hasYesterday  = uniqueDates.includes(yesterday);



  /* helper: parse "YYYY-MM-DD" as a *local* midnight date object */
  const toLocalDate = (s: string): Date => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);                  // month is zero-based
  };

  // how many days since the most-recent activity?
  const mostRecent   = uniqueDates[0];
  const daysSince    = dateUtils.daysBetween(toLocalDate(mostRecent), toLocalDate(today));



  // missing two *full* days (and nothing today/yesterday) ⇒ streak broken
  if (daysSince > 1 && !hasToday && !hasYesterday) {
    console.log('[TRACKER TIMEZONE DEBUG] calculateStreakWithFlexSaves - Streak broken, no recent activity');
    return 0;
  }

  /* ------------------------------------------------------------------
   * 2️⃣  walk newest → oldest, counting ONLY routine days
   *     (flexSave days keep the chain alive but don't add to length)
   * ------------------------------------------------------------------ */

  // quick lookup table for flexSaves → O(1) membership test
  const flexSaveSet = new Set(flexSaveDates.map(d => dateUtils.toDateString(d)));

  // If the most–recent day is *not* a flexSave it contributes 1 to the streak
  let streak  = flexSaveSet.has(mostRecent) ? 0 : 1;
  let cursor  = toLocalDate(mostRecent);

  for (let i = 1; i < uniqueDates.length; i++) {
    const dayStr   = uniqueDates[i];
    const dayDate  = toLocalDate(dayStr);

    const diff = dateUtils.daysBetween(dayDate, cursor);

    // gap larger than 1 day → chain broken
    if (diff !== 1) break;

    // consecutive – only bump streak if this date is *not* a flexSave
    if (!flexSaveSet.has(dayStr)) {
      streak += 1;
    }

    // move cursor backwards one day in the chain
    cursor = dayDate;
  }

  console.log(`[TRACKER TIMEZONE DEBUG] calculateStreakWithFlexSaves - Final streak count: ${streak}`);
  return streak;
};
