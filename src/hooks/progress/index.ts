// Export all progress hooks for easy importing

// Main progress systems
/** @deprecated - Use useGamification instead for better performance and centralized logic */
export { default as useProgressSystem } from './useProgressSystem';
/** Centralized hook for all gamification features - recommended approach */
export { useGamification } from './useGamification';

// Feature access and level progress - these are wrapper hooks around useGamification
export { useFeatureAccess } from './useFeatureAccess';
export { useLevelProgress } from './useLevelProgress';

// Specific data access hooks
/** @deprecated - Use useGamification().gamificationSummary instead */
export { useProgressData } from './useProgressData';
export { useProgressTabManagement } from './useProgressTabManagement';
/** @deprecated - Use useGamification().refreshData() instead */
export { useStreakChecker } from './useStreakChecker';
/** @deprecated - Use useGamification().refreshData() instead */
export { useChallengeUpdater } from './useChallengeUpdater';
/** @deprecated - Use useGamification() instead */
export { useChallengeSystem } from './useChallengeSystem';
