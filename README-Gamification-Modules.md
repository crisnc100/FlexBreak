# flexbreak Gamification System

## Modular Structure

The gamification system has been refactored into a modular structure to improve maintainability and separation of concerns. The system is now organized as follows:

### Main Entry Point

- **gameEngine.ts**: The central coordinator that provides a simplified API for the app and coordinates interactions between specialized modules.

### Specialized Modules

- **challengeManager.ts**: Handles all challenge-related operations including creating, refreshing, and completing challenges.
- **xpSystem.ts**: Manages XP calculations, leveling, and gamification summaries.
- **achievementManager.ts**: Tracks user achievements and handles unlocking new achievements.
- **progressTracker.ts**: Handles user statistics, progress tracking, and data visualization helpers.
- **streakManager.ts**: Manages user streaks, including updates and resets.
- **streakFreezeManager.ts**: Handles streak freeze functionality that allows users to preserve streaks when missing days.
- **rewardManager.ts**: Manages user rewards and unlocking new rewards based on level progression.
- **xpBoostManager.ts**: Handles temporary XP boosts that can be applied to increase XP gain.

### Supporting Files

- **types.ts**: Contains TypeScript interfaces and types for the gamification system.
- **constants.ts**: Contains constant values used throughout the system.
- **utils/logManager.ts**: Provides logging functionality for debugging and monitoring.

## API Overview

The gameEngine exposes a simplified API for the app to interact with the gamification system:

### Core Functions

- **processCompletedRoutine**: The main function that handles all updates when a user completes a routine.
- **initializeUserProgress**: Creates initial user progress data for new users.

### Re-exported Module Functions

Functions from specialized modules are re-exported through gameEngine for convenience:

- From challengeManager: `refreshChallenges`, `claimChallenge`, `getActiveChallenges`, `getClaimableChallenges`
- From xpSystem: `getUserLevelInfo`, `getGamificationSummary`, `calculateLevel`, `handleLevelUp`
- From streakManager: `handleStreakReset`, `resetStreakAchievements`

## Data Flow

1. User completes a routine
2. App calls `processCompletedRoutine`
3. gameEngine coordinates:
   - Updating statistics via `updateStatistics`
   - Calculating XP via xpSystem
   - Refreshing challenges via challengeManager
   - Updating achievements via achievementManager
   - Handling level ups via xpSystem
   - Updating streaks via streakManager
   - Saving progress via storageService

## Extending the System

When adding new gamification features:

1. Determine which module should handle the feature
2. Implement the feature in the appropriate module
3. If needed, expose the functionality through gameEngine

## Future Improvements

- Add more comprehensive testing
- Implement more advanced challenge types
- Enhance the reward system with more meaningful rewards
- Add social features like leaderboards or sharing 