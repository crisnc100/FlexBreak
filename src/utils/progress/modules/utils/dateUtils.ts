/**
 * Date Utilities for flexbreak
 * Handles all date-related operations consistently across the application
 */

/**
 * Format a date to YYYY-MM-DD
 */
// util/date.ts
export const toDateString = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;

  // Use the system-default tz (or pass an explicit one)
  const [year, month, day] = [
    d.getFullYear(),
    d.getMonth() + 1,          // zero-based
    d.getDate()
  ].map(n => String(n).padStart(2, '0'));

  return `${year}-${month}-${day}`;   // local YYYY-MM-DD
};


/**
 * Get current date string in YYYY-MM-DD format
 */
export const today = (): string => {
  return toDateString(new Date());
};

/**
 * Get yesterday's date string in YYYY-MM-DD format
 */
export const yesterdayString = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return toDateString(yesterday);
};

/**
 * Check if two dates are the same day
 */
export const isSameDay = (date1: Date | string, date2: Date | string): boolean => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  return toDateString(d1) === toDateString(d2);
};

/**
 * Check if a date is today
 */
export const isToday = (date: Date | string): boolean => {
  return isSameDay(typeof date === 'string' ? new Date(date) : date, new Date());
};

/**
 * Calculate days between two dates
 */
export const daysBetween = (date1: Date | string, date2: Date | string): number => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  
  // Reset hours to ensure we're comparing just days
  const start = new Date(d1);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(d2);
  end.setHours(0, 0, 0, 0);
  
  // Calculate the time difference in milliseconds
  const timeDiff = Math.abs(end.getTime() - start.getTime());
  
  // Convert milliseconds to days
  return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
};

/**
 * Calculate time difference in milliseconds
 */
export const diffInMs = (date1: Date | string, date2: Date | string): number => {
  const d1 = typeof date1 === 'string' ? new Date(date1).getTime() : date1.getTime();
  const d2 = typeof date2 === 'string' ? new Date(date2).getTime() : date2.getTime();
  return Math.abs(d1 - d2);
};

/**
 * Check if a weekly reset should occur
 */
export const shouldResetWeekly = (lastCheck: string): boolean => {
  if (!lastCheck) return true;
  
  const lastCheckDate = new Date(lastCheck);
  const now = new Date();
  const lastDay = lastCheckDate.getDay();
  const today = now.getDay();
  
  // If today is Sunday (0) and last check wasn't Sunday, or we crossed a Sunday boundary
  return (today === 0 && lastDay !== 0) || (lastDay > today);
};

/**
 * Check if a monthly reset should occur
 */
export const shouldResetMonthly = (lastCheck: string): boolean => {
  if (!lastCheck) return true;
  
  const lastCheckDate = new Date(lastCheck);
  const now = new Date();
  
  // Check if we crossed a month boundary
  return lastCheckDate.getMonth() !== now.getMonth() || 
         lastCheckDate.getFullYear() !== now.getFullYear();
};

/**
 * Get the appropriate end date for a challenge based on its category
 */
export const getEndDateForCategory = (category: string): string => {
  const now = new Date();
  const result = new Date(now);
  
  // Default end time for all cases
  result.setHours(23, 59, 59, 999);
  
  switch(category) {
    case 'daily':
      // End at midnight tonight (no change needed)
      break;
      
    case 'weekly':
      // End at the end of the current week (Sunday)
      const daysToSunday = 7 - result.getDay();
      result.setDate(result.getDate() + (daysToSunday === 0 ? 7 : daysToSunday));
      break;
      
    case 'monthly':
      // End at the end of the current month
      result.setMonth(result.getMonth() + 1, 0);
      break;
      
    case 'special':
      // Special challenges last for 2 weeks by default
      result.setDate(result.getDate() + 14);
      break;
      
    default:
      // Default to 24 hours for unknown categories
      result.setDate(result.getDate() + 1);
  }
  
  return result.toISOString();
};

/**
 * Format date as YYYY-MM-DD using local timezone
 * This is used throughout the app for streak calculations
 */
export const formatDateYYYYMMDD = (date: Date): string => {
  // Use local date components to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * Get the day of the week for a date (0 = Sunday, 1 = Monday, etc.)
 */
export const getDayOfWeek = (date: Date): number => {
  return date.getDay();
};

/**
 * Check if a date is yesterday
 */
export const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
};

/**
 * Parse a date string to a Date object
 */
export const parseDate = (dateStr: string): Date => {
  return new Date(dateStr);
}; 