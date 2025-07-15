/**
 * Get the next occurrence of a specific day of the week
 * @param dayOfWeek 0 for Sunday, 6 for Saturday
 * @param hours Hour in 24-hour format
 * @param minutes Minutes
 * @returns Date object for the next occurrence
 */
export function getNextDayOfWeek(dayOfWeek: number, hours: number, minutes: number): Date {
  const now = new Date();
  const result = new Date();
  result.setHours(hours);
  result.setMinutes(minutes);
  result.setSeconds(0);
  result.setMilliseconds(0);
  
  // Get current day of week
  const currentDayOfWeek = now.getDay();
  
  // Calculate days to add
  let daysToAdd = dayOfWeek - currentDayOfWeek;
  
  // If the calculated day is today but the time has passed, or it's in the past
  if (daysToAdd < 0 || (daysToAdd === 0 && now > result)) {
    daysToAdd += 7;
  }
  
  // Set the day
  result.setDate(now.getDate() + daysToAdd);
  
  return result;
}

/**
 * Convert day string to day number
 * @param day Day string (e.g., 'mon', 'monday', 'Mon')
 * @returns Day number (0-6) or -1 if invalid
 */
export function dayStringToNumber(day: string): number {
  const dayLower = day.toLowerCase();
  switch(dayLower) {
    case 'sun':
    case 'sunday': return 0;
    case 'mon':
    case 'monday': return 1;
    case 'tue':
    case 'tuesday': return 2;
    case 'wed':
    case 'wednesday': return 3;
    case 'thu':
    case 'thursday': return 4;
    case 'fri':
    case 'friday': return 5;
    case 'sat':
    case 'saturday': return 6;
    default: return -1;
  }
}