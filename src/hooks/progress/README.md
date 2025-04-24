# Progress & Gamification Hooks

## Hooks Migration Guide

### Overview

This folder contains hooks for the flexbreak gamification and progress tracking system. We are transitioning to a more centralized approach to improve performance, reduce redundancy, and make the codebase more maintainable.

### Primary Hook: `useGamification`

**`useGamification`** is now the main hook for all gamification features. It provides:

- XP tracking and level progression
- Challenge management
- Achievement tracking
- Rewards unlocking
- Streak tracking
- All progress statistics

```tsx
import { useGamification } from '../hooks/progress';

function MyComponent() {
  const {
    // State
    level,
    totalXP,
    xpToNextLevel,
    percentToNextLevel,
    gamificationSummary,
    claimableChallenges,
    
    // Actions
    processRoutine,
    claimChallenge,
    refreshData,
    isFeatureUnlocked,
    handleStreakReset,
    resetStreakAchievements
  } = useGamification();
  
  // Use these values and functions in your component
}
```

### Deprecated Hooks

The following hooks are being phased out in favor of `useGamification`:

- **`useProgressSystem`** - Legacy system, now just wraps useGamification
- **`useProgressData`** - Use `gamificationSummary` from useGamification instead
- **`useStreakChecker`** - Use `handleStreakReset()` from useGamification
- **`useChallengeUpdater`** - Use `refreshData()` from useGamification
- **`useChallengeSystem`** - Use challenge functions from useGamification

### Challenge System Consolidation

To eliminate confusion and redundancy, we've consolidated challenge management:

1. **Removed duplicate logic** - All challenge logic now lives in gameEngine.ts
2. **Simplified hook structure** - `useChallengeSystem` and `useChallengeUpdater` are now just thin wrappers
3. **Centralized data access** - All challenge data comes from `gamificationSummary.challenges`

#### Before (Old Approach):
```tsx
// Complex system with multiple hooks and managers
import { useChallengeSystem } from '../hooks/progress';
import { useChallengeUpdater } from '../hooks/progress';

function ChallengesScreen() {
  const { 
    activeChallenges, 
    loading, 
    claimChallenge,
    syncChallengeProgress, 
    refreshChallenges 
  } = useChallengeSystem();
  
  // Separate hook for auto-updates
  useChallengeUpdater(...);
  
  // Rest of component...
}
```

#### Now (New Approach):
```tsx
// Simple, centralized approach
import { useGamification } from '../hooks/progress';

function ChallengesScreen() {
  const {
    gamificationSummary,
    isLoading,
    claimChallenge,
    refreshData
  } = useGamification();
  
  // All challenge data in one place
  const allChallenges = gamificationSummary?.challenges || {
    active: { daily: [], weekly: [], monthly: [], special: [] },
    completed: { daily: [], weekly: [], monthly: [], special: [] },
    claimable: []
  };
  
  // Rest of component...
}
```

### Streak Management

Streak management has been centralized in the `useGamification` hook. The system now provides:

- **Automatic streak tracking** - Tracks when user's streak is broken
- **Streak challenge management** - Resets streak challenges when a streak is broken
- **Streak achievement handling** - Manages streak-related achievements

#### Before (Old Approach):
```tsx
import { useStreakChecker } from '../hooks/progress';

function ProgressScreen() {
  // Complex setup with multiple parameters
  useStreakChecker(
    stats.currentStreak,
    progressData.length,
    refreshProgress,
    refreshChallenges
  );
}
```

#### Now (New Approach):
```tsx
// Use directly for streak checking
import { useStreakChecker } from '../hooks/progress';

function ProgressScreen() {
  // Simple usage - all logic is handled internally
  useStreakChecker();
}

// Or use the underlying functionality directly
import { useGamification } from '../hooks/progress';

function MyComponent() {
  const { handleStreakReset } = useGamification();
  
  // Call handleStreakReset when needed
}
```

### Helper Hooks (Still Valid)

These hooks are still valid as they provide specific UI functionality:

- **`useProgressTabManagement`** - For managing progress screen tabs
- **`useFeatureAccess`** - Wrapper around useGamification for feature access
- **`useLevelProgress`** - Simplified hook for level progress UI components

## Performance Benefits

- Reduced redundant API calls
- Shared state between hooks
- Better caching and invalidation
- Centralized error handling
- No more parallel logic in multiple files

## Implementation Status

This migration is ongoing. If you encounter issues with the new hooks or need help migrating, please refer to the CentralizationSummary.md document in the docs folder. 