# DeskStretch Gamification System Migration Guide

## Overview

The DeskStretch gamification system has been completely refactored for better organization, performance, and maintainability. This document provides guidance on migrating from the old system to the new one.

## Migration Timeline

1. **Current Phase**: Dual system (both old and new files coexist)
2. **Next Phase**: Transition existing components to use new system
3. **Final Phase**: Remove deprecated files

## New System Structure

The new gamification system consists of the following components:

- **gamificationManager.ts**: Central coordination of all gamification features
- **xpManager.ts**: XP calculation, tracking, and awarding
- **achievementManager.ts**: Achievement management and auto-awarding
- **challengeManager.ts**: Challenge generation, tracking, and claiming
- **rewardManager.ts**: Reward management and unlocking based on level
- **types.ts**: Shared types for the gamification system

## Migration Status

The following components have been migrated to use the new system:

- ✅ `RoutineScreen.tsx` - Now uses `useGamification` hook for routine processing
- ✅ `Challenges.tsx` - Now uses `useGamification` hook for challenge management
- ✅ `Achievements.tsx` - Now uses `useGamification` hook for achievements display

Components still needing migration:

- ⏳ `ProfileScreen.tsx` - Needs to use `useGamification` hook for level/XP display
- ⏳ `RewardsScreen.tsx` - Needs to use `useGamification` hook for rewards
- ⏳ `ProgressScreen.tsx` - Needs to use `useGamification` hook for progress overview

## Migration Steps

### 1. Migrate Component Dependencies (IN PROGRESS)

- Update components to use the new `useGamification` hook
- Remove imports from old utility files
- Update component logic to use new hook functions

### 2. Update XpNotificationManager (TODO)

- Create a new version that works with the `useGamification` hook
- Update its implementation to handle XP, achievement, and reward notifications

### 3. Test All Functionality (TODO)

- Test routine completion, XP earning
- Test challenge claiming
- Test achievement unlocking
- Test reward unlocking based on level

### 4. Remove Deprecated Files (FUTURE)

Once all components are migrated and tested, remove these files:

- achievements.ts
- challenges.ts
- rewards.ts
- xp.ts
- statistics.ts
- tracker.ts
- challengeTracker.ts
- constants.ts
- core.ts
- progressSystem.ts
- storage.ts (functionality moved to storageService.ts)

## How to Migrate

### For Application Components

1. Replace imports from individual files with the new hook:

```javascript
// OLD
import * as xp from '../utils/progress/xp';
import * as challenges from '../utils/progress/challenges';

// NEW
import { useGamification } from '../hooks/useGamification';

function MyComponent() {
  const { 
    processRoutine, 
    claimChallenge, 
    level, 
    totalXP 
  } = useGamification();
  
  // Use new functions instead of old ones
}
```

### For Specific Features

#### XP System

Old: `xp.ts`
New: `xpManager.ts` + `useGamification` hook

```javascript
// OLD
const xpEarned = await xp.calculateXPForRoutine(routine);

// NEW
const { xpEarned } = await processRoutine(routine);
```

#### Achievements

Old: `achievements.ts`
New: `achievementManager.ts` + `useGamification` hook

```javascript
// OLD
const achievements = await achievements.getCompletedAchievements();

// NEW
const { achievements: { completed } } = gamificationSummary;
```

#### Challenges

Old: `challenges.ts` + `challengeTracker.ts`
New: `challengeManager.ts` + `useGamification` hook

```javascript
// OLD
const claimableChallenge = await challenges.claimChallenge(id);

// NEW
const result = await claimChallenge(id);
```

#### Rewards

Old: `rewards.ts`
New: `rewardManager.ts` + `useGamification` hook

```javascript
// OLD
const isUnlocked = await rewards.isFeatureUnlocked('dark_mode');

// NEW
const isUnlocked = await isFeatureUnlocked('dark_mode');
```

## Component Migration Examples

### RoutineScreen.tsx Migration
```javascript
// Old
import useProgressSystem from '../hooks/useProgressSystem';
import { calculateRoutineXP } from '../utils/progress/xp';

// New
import { useGamification } from '../hooks/useGamification';

// Old
const progressSystem = useProgressSystem();
const updateProgressWithRoutines = async (routines: ProgressEntry[]) => {
  return progressSystem.updateChallengesWithRoutines(routines);
};

// New
const { 
  processRoutine, 
  isLoading: isGamificationLoading
} = useGamification();

// Old routine processing
const allRoutines = await getAllRoutines();
const result = await updateProgressWithRoutines(allRoutines);

// New routine processing
const result = await processRoutine(entry);
```

### Challenges.tsx Migration
```javascript
// Old
import useProgressSystem from '../../hooks/useProgressSystem';

// New
import { useGamification } from '../../hooks/useGamification';

// Old
const { 
  userProgress,
  refreshUserChallenges,
  claimChallengeReward
} = useProgressSystem();

// New
const { 
  claimableChallenges,
  claimChallenge,
  gamificationSummary,
  refreshData
} = useGamification();
```

### Achievements.tsx Migration
```javascript
// Old
import * as ProgressSystemUtils from '../../utils/progress/progressSystem';

// New
import { useGamification } from '../../hooks/useGamification';

// Old
const Achievements: React.FC<AchievementsProps> = ({
  totalRoutines,
  currentStreak,
  areaBreakdown,
  totalXP = 0,
  level = 1,
  totalMinutes = 0,
  completedAchievements = []
}) => {
  // Direct use of props

// New
const Achievements: React.FC<AchievementsProps> = ({
  // Keep props for backward compatibility
  totalRoutines: propsRoutines,
  currentStreak: propsStreak,
  areaBreakdown: propsAreas,
  totalXP: propsTotalXP,
  level: propsLevel,
  totalMinutes: propsMinutes,
  completedAchievements: propsAchievements
}) => {
  // Use gamification hook
  const { gamificationSummary, isLoading, refreshData } = useGamification();
  
  // Use merged values from both sources
  const totalRoutines = gamificationSummary?.statistics?.routinesCompleted || propsRoutines || 0;
  const currentStreak = gamificationSummary?.statistics?.currentStreak || propsStreak || 0;
  const totalXP = gamificationSummary?.totalXP || propsTotalXP || 0;
  const level = gamificationSummary?.level || propsLevel || 1;
  const totalMinutes = gamificationSummary?.statistics?.totalMinutes || propsMinutes || 0;
}
```

## Benefits of New System

- Centralized management through `gamificationManager.ts`
- Better separation of concerns
- Improved type safety
- More consistent API
- Better performance through reduced redundant calculations
- React-specific hook for easier integration
- Comprehensive notification system for unlocks
- Support for streaks, consistent tracking, and proper XP awarding 