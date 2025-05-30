// Export all progress hooks for easy importing

// Main progress systems
/** Centralized hook for all gamification features - recommended approach */
export { useGamification } from './useGamification';

// Feature access and level progress - these are wrapper hooks around useGamification
export { useFeatureAccess } from './useFeatureAccess';
export { useLevelProgress } from './useLevelProgress';

// Specific data access hooks
/** @deprecated - Use useGamification().gamificationSummary instead */
export { useProgressData } from './useProgressData';
export { useProgressTabManagement } from './useProgressTabManagement';


// Streak tracking hooks - export both named and default export
export { useStreak } from './useStreak';
export { default as useStreakDefault } from './useStreak';

