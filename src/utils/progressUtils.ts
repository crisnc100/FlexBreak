import { ProgressEntry } from '../types';

/**
 * Calculate the user's current streak based on consecutive days of activity
 * Will reset streak if a day is missed
 */
export const calculateStreak = (data: ProgressEntry[]) => {
  if (data.length === 0) return 0;
  
  // Get all dates and convert to date strings (YYYY-MM-DD format) to avoid time issues
  const dateStrings = data.map(entry => {
    const date = new Date(entry.date);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  });
  
  // Get unique dates and sort them in descending order (newest first)
  const uniqueDateStrings = [...new Set(dateStrings)].sort().reverse();
  
  console.log(`Calculating streak from ${uniqueDateStrings.length} unique dates:`, uniqueDateStrings);
  
  if (uniqueDateStrings.length === 0) return 0;
  
  // Get the most recent date (first date in the array)
  const mostRecentDateStr = uniqueDateStrings[0];
  const mostRecentDate = new Date(mostRecentDateStr);
  
  // Format today and yesterday for comparison
  const today = new Date();
  const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  
  // Format yesterday for comparison
  const yesterdayFormatted = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  
  // Convert most recent date to midnight for comparison
  mostRecentDate.setHours(0, 0, 0, 0);
  
  // Check if either today or yesterday has an activity
  const hasTodayActivity = uniqueDateStrings.includes(todayFormatted);
  const hasYesterdayActivity = uniqueDateStrings.includes(yesterdayFormatted);
  
  console.log(`Today activity: ${hasTodayActivity}, Yesterday activity: ${hasYesterdayActivity}`);
  
  // If the most recent activity was before yesterday, the streak is broken
  // UNLESS the user has already completed a 5-day streak
  if (mostRecentDate < yesterday && !hasTodayActivity && !hasYesterdayActivity) {
    // Check if there's enough data for a 5+ day streak that should be preserved until end of today
    if (uniqueDateStrings.length >= 5) {
      // Check if the last 5 days before today were consecutive
      let isPreviousStreakValid = true;
      let prevDate = yesterday;
      
      for (let i = 0; i < 5; i++) {
        const checkDate = new Date(prevDate);
        checkDate.setDate(prevDate.getDate() - i);
        const checkDateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
        
        if (!uniqueDateStrings.includes(checkDateStr)) {
          isPreviousStreakValid = false;
          break;
        }
      }
      
      if (isPreviousStreakValid) {
        console.log('Previous 5-day streak found, maintaining streak until end of today');
        return 5; // Return the 5-day streak that's valid until end of today
      }
    }
    
    console.log('Streak reset: No activity yesterday or today');
    return 0;
  }
  
  // Start counting from the most recent date
  let streak = 1;
  
  // Convert date strings to Date objects for easier comparison
  const uniqueDates = uniqueDateStrings.map(ds => {
    const [year, month, day] = ds.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed in JS Date
  });
  
  // Loop through the dates to check for consecutive days
  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const currentDate = uniqueDates[i];
    const nextDate = uniqueDates[i + 1];
    
    // Calculate the difference in days
    const diffTime = currentDate.getTime() - nextDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    
    console.log(`Comparing ${currentDate.toISOString().split('T')[0]} with ${nextDate.toISOString().split('T')[0]}, diff: ${diffDays}`);
    
    // If the difference is exactly 1 day, it's consecutive
    if (Math.abs(diffDays - 1) < 0.1) { // Using a small epsilon to account for potential floating point issues
      streak++;
    } else {
      // Break the streak if days are not consecutive
      break;
    }
  }
  
  console.log(`Final streak calculation: ${streak} days`);
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