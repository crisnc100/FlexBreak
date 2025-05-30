# Gamification System Migration Plan

## Overview

This document outlines the steps required to complete the migration to a centralized gamification system for flexbreak. The goal is to eliminate type inconsistencies, centralize logic, and improve system reliability.

## Current Issues

1. **Type Inconsistencies**: 
   - Multiple definitions of `Challenge`, `Achievement`, and `UserProgress` interfaces
   - Imports coming from different locations
   - Missing required fields (e.g., `startDate` in challenges)

2. **Logic Fragmentation**:
   - Business logic spread across multiple files
   - Duplicate processing for similar operations
   - Redemption periods and grace periods handled inconsistently

3. **State Management**:
   - No central hook for gamification features
   - Redundant and inefficient storage operations
   - Race conditions possible during updates

## Migration Steps

### 1. Type Consolidation (Completed)

- [x] Update `Challenge` interface in main types to include all required fields
- [x] Align `Achievement` interface to support flexible types
- [x] Update `UserProgress` interface to include all statistics fields
- [x] Add `lastDailyChallengeCheck` field for challenge management

### 2. Import Standardization

- [ ] Create a barrel export file in `utils/progress/index.ts` to export all types
- [ ] Update all imports to use the centralized exports
- [ ] Remove deprecated exports and mark stub functions with warnings

### 3. Logic Centralization

- [ ] Create a `ChallengeManager` class to handle all challenge operations
- [ ] Create an `AchievementManager` class for achievement tracking
- [ ] Implement `GamificationManager` to coordinate system-wide operations
- [ ] Ensure proper grace period handling for all challenges

### 4. State Management Improvements

- [ ] Create a `useGamification` hook that provides all gamification features
- [ ] Implement proper batch storage operations to reduce writes
- [ ] Add transaction-like operations for critical updates
- [ ] Add cache layer for frequently accessed data

### 5. Challenge System Enhancements

- [ ] Fix challenge expiration logic to run once daily
- [ ] Implement daily limit validation for claiming challenges
- [ ] Add proper grace period UI indicators 
- [ ] Ensure challenges reset properly at day/week/month boundaries

### 6. Achievement System Refinements

- [ ] Improve tracking for area variety achievements
- [ ] Optimize time-based achievement tracking
- [ ] Add validation logic for achievement completion
- [ ] Ensure area expert achievements update correctly

### 7. Reward System Updates

- [ ] Centralize reward unlocking logic
- [ ] Add proper validation for feature availability
- [ ] Ensure streak flexSaves and XP boosts function correctly
- [ ] Create smooth reward unlocking experience

### 8. Testing Plan

- [ ] Create comprehensive test suite for gamification features
- [ ] Test grace periods with simulated time passage
- [ ] Validate challenge limits and expiration
- [ ] Test achievement progress across multiple routines

## Implementation Schedule

1. **Phase 1 - Foundation (Current Phase)**
   - Type consolidation
   - Import standardization
   - Basic hook setup

2. **Phase 2 - Core Logic**
   - Challenge system improvements
   - Achievement system refinement
   - Storage optimization

3. **Phase 3 - Polish**
   - UI integration
   - Performance optimization
   - Edge case handling

## Migration Notes

- Keep backwards compatibility during transition
- Add detailed logging for debugging
- Maintain periodic backups of user progress data
- Document all significant changes

## Completion Criteria

The migration will be considered complete when:

1. All type warnings and errors are resolved
2. Challenge expiration and grace periods work correctly
3. Storage operations are optimized to minimize writes
4. Achievement tracking is accurate across all types
5. UI components use the centralized hook
6. Test coverage is comprehensive 