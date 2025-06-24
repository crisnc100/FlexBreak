/**
 * Debouncer to prevent notification spam
 * Ensures scheduling functions aren't called repeatedly
 */

const lastScheduled = new Map<string, number>();
const DEBOUNCE_TIME = 60000; // 1 minute minimum between scheduling attempts

export const canScheduleNotifications = (type: string): boolean => {
  const now = Date.now();
  const lastTime = lastScheduled.get(type) || 0;
  
  if (now - lastTime < DEBOUNCE_TIME) {
    console.log(`Skipping ${type} scheduling - already scheduled ${Math.round((now - lastTime) / 1000)}s ago`);
    return false;
  }
  
  return true;
};

export const markScheduled = (type: string): void => {
  lastScheduled.set(type, Date.now());
  console.log(`Marked ${type} as scheduled at ${new Date().toLocaleTimeString()}`);
};

export const resetDebouncer = (): void => {
  lastScheduled.clear();
  console.log('Notification debouncer reset');
};