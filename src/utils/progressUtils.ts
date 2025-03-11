import { ProgressEntry } from '../types';

/**
 * Calculate the user's current streak based on consecutive days of activity
 */
export const calculateStreak = (data: ProgressEntry[]) => {
  if (data.length === 0) return 0;
  
  // Get all dates and sort them in descending order (newest first)
  const sortedDates = data
    .map(entry => new Date(entry.date).setHours(0, 0, 0, 0))
    .sort((a, b) => b - a);
  
  // Get unique dates
  const uniqueDates = [...new Set(sortedDates)];
  
  const today = new Date().setHours(0, 0, 0, 0);
  
  // Check if they've done a routine today
  const hasWorkoutToday = uniqueDates[0] === today;
  
  let streak = hasWorkoutToday ? 1 : 0;
  if (streak === 0) return 0; // No streak if didn't work out today

  // Count consecutive days
  let prevDate: number = uniqueDates[0] as number;
  for (let i = 1; i < uniqueDates.length; i++) {
    // Both prevDate and uniqueDates[i] are already numbers (milliseconds since epoch)
    const diff = (prevDate - (uniqueDates[i] as number)) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      streak++;
      prevDate = uniqueDates[i] as number;
    } else {
      break;
    }
  }
  
  return streak;
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