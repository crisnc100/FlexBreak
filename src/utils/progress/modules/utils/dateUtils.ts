/**
 * dateUtils.ts  –  timezone-safe date helpers for FlexBreak
 * All functions work in the device’s LOCAL calendar.
 */

////////////////////
//  CONSTANTS
////////////////////

/** 24 h in milliseconds */
export const MS_PER_DAY = 86_400_000;

////////////////////
//  BASIC FORMATS
////////////////////

/** Cast Date|string ➜ local YYYY-MM-DD */
export function toDateString(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');   // 0-based
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Today (local) as YYYY-MM-DD */
export function todayStringLocal(): string {
  return toDateString(new Date());
}

/** Yesterday (local) as YYYY-MM-DD */
export function yesterdayStringLocal(): string {
  const y = new Date();
  y.setDate(y.getDate() - 1);
  return toDateString(y);
}

/** Local “YYYY-MM-DD” for arbitrary Date */
export function formatDateYYYYMMDD(date: Date): string {
  return toDateString(date);
}

////////////////////
//  COMPARISONS
////////////////////

export function isSameDay(a: Date | string, b: Date | string): boolean {
  return toDateString(a) === toDateString(b);
}

export function isToday(d: Date | string): boolean {
  return isSameDay(d, new Date());
}

export function isYesterday(d: Date | string): boolean {
  return toDateString(d) === yesterdayStringLocal();
}

////////////////////
//  INTERVALS
////////////////////

export function daysBetween(
  start: Date | string,
  end: Date | string
): number {
  const a = new Date(toDateString(start)).getTime();
  const b = new Date(toDateString(end)).getTime();
  return Math.round(Math.abs(a - b) / MS_PER_DAY);
}

export function diffInMs(a: Date | string, b: Date | string): number {
  return Math.abs(
    (typeof a === 'string' ? new Date(a) : a).getTime() -
    (typeof b === 'string' ? new Date(b) : b).getTime()
  );
}

////////////////////
//  RESET HELPERS
////////////////////

/** Weekly reset happens every Sunday local-time */
export function shouldResetWeekly(lastCheck: string): boolean {
  if (!lastCheck) return true;
  const prev = new Date(lastCheck);
  const now = new Date();
  // crossed a Sunday boundary
  return prev.getDay() !== 0 && now.getDay() === 0 || prev.getDay() > now.getDay();
}

/** Monthly reset at the first day of a new month */
export function shouldResetMonthly(lastCheck: string): boolean {
  if (!lastCheck) return true;
  const prev = new Date(lastCheck);
  const now = new Date();
  return prev.getMonth() !== now.getMonth() || prev.getFullYear() !== now.getFullYear();
}

////////////////////
//  CHALLENGE HELPERS
////////////////////

/**
 * End-date (ISO) for a challenge category.
 * – daily   ➜ end of today
 * – weekly  ➜ upcoming Sunday 23:59:59
 * – monthly ➜ last day of this month 23:59:59
 * – special ➜ +14 days
 */
export function getEndDateForCategory(category: string): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);          // default: end of today

  switch (category) {
    case 'weekly': {
      const daysToSun = (7 - d.getDay()) % 7;
      d.setDate(d.getDate() + daysToSun);
      break;
    }
    case 'monthly': {
      d.setMonth(d.getMonth() + 1, 0);  // “0” ➜ last day of prev month = last of current
      break;
    }
    case 'special':
      d.setDate(d.getDate() + 14);
      break;
    // daily / unknown fall through – already today @ 23:59
  }
  return d.toISOString();
}

////////////////////
//  MISC
////////////////////

export function getDayOfWeek(date: Date): number {
  return date.getDay(); // 0 = Sun … 6 = Sat
}

export function parseDate(str: string): Date {
  return new Date(str);
}

export function getDaysAgoString(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return toDateString(d);
}

////////////////////
//  LEGACY ALIASES
////////////////////
//  (Stopgap so existing code that imported { today } keeps compiling)
export const today          = todayStringLocal;
export const yesterdayString = yesterdayStringLocal;
