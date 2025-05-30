# FlexBreak App Specification

## Overview

FlexBreak is a React Native mobile app (iOS/Android) built with TypeScript and Expo, targeting work-from-home users with quick, trainer-curated stretching routines (5-15 minutes) to relieve stiffness. It offers a free tier and a premium subscription ($4.99/month) unlocking progress tracking, favorites, and reminders. Data is stored locally via AsyncStorage, static assets are bundled, and Expo OTA updates are used for maintenance.

- **Target:** WFH individuals needing mobility breaks
- **Goal:** Provide personalized routines, gamify habit formation, monetize via subscriptions
- **Deployment:**
  - App Store ($99/year)
  - Google Play ($25 one-time)

## App Structure Checklist

- ✅ **Framework:** React Native, TypeScript, Expo (SDK 50+)
- ✅**Navigation:** Bottom tab navigation (@react-navigation/bottom-tabs) with 5 screens:
  - Home
  - Routine
  - Progress
  - Favorites
  - Settings
- [ ] **Storage:**
  - ✅ Use AsyncStorage for user data
  - [ ] Define keys: "userProgress", "favorites", "reminderTime", "isPremium"
- [ ] **Assets:**
  - ✅ Static TS files: stretches.ts, tips.ts
  - [ ] Bundle PNGs/videos in assets/
- [ ] **Monetization:**
  - [ ] Integrate expo-in-app-purchases for $4.99/month subscription

## Tech Stack Checklist

### Core Technologies
- ✅ React Native with TypeScript
- ✅ Expo SDK 50+
- ✅ @react-native-async-storage/async-storage for local storage

### Libraries
- ✅ @react-navigation/bottom-tabs - Tab navigation
- ✅ @react-native-picker/picker - Dropdowns
- [✅ ] expo-notifications - Reminders
- [ ] expo-in-app-purchases - Subscriptions
- ✅ @expo/vector-icons - Icons (Ionicons)
- ✅ nativewind - Tailwind CSS styling

## App Features Checklist

```
- **src/**
  - **features/**: Feature-specific code
    - **progress/**: Progress tracking and gamification
      - `components/`: Stats, achievements, challenges UI
      - `hooks/`: `useProgressSystem.ts`
      - `utils/`: `progressUtils.ts`, `Achievements.ts`, etc.
    - **routines/**: Routine generation and execution
      - `components/`: `ActiveRoutine.tsx`, etc.
      - `hooks/`: `useRoutineParams.ts`, `useRoutineTimer.ts`, etc.
      - `utils/`: `RoutineGenerator.ts`
    - **favorites/**: (Planned for FavoritesScreen.tsx)
    - **settings/**: (Planned for SettingsScreen.tsx)
  - **core/**: App-wide services and utilities
    - `services/storage/`: `storage.service.ts` (centralized AsyncStorage logic)
    - `context/`: `PremiumContext.ts`, `RefreshContext.ts`
    - `utils/`: `debounce.ts`, `notifications.ts`, etc.
  - **ui/**: Shared UI components
    - `common/`: `RefreshableFlatList.tsx`, etc.
    - `SmartPickModal.tsx`, `SubscriptionModal.tsx`, etc.
  - **data/**: `Stretches.ts`, `Tips.ts`
  - **types/**: `index.ts`
  - **screens/**: `HomeScreen.tsx`, `ProgressScreen.tsx`, etc. (not yet moved)

**Notes:**
- `HomeScreen.tsx` is still in `screens/`—its final placement (e.g., `features/home/`) is TBD.
- Errors occurred after moving files, likely due to outdated imports.

## FlexBreak Implementation Roadmap

---

# High Priority (Core Features & Revenue)

**Completed:**
- [✅] Finish Rewards 8-9
- [✅] Define 15 premium stretches
- [✅] Implement Desk Break Boost feature
- [✅] Create 3 Stretch Playlists with audio
- [✅] Update Rewards UI
- [✅] Test unlocks at 2500/3500/5000 XP
- [✅] Add sound effect features around the app (in progress)
- [✅] Fix streak not resetting if user misses a day
  - Note: UI could better indicate streak will end unless user reaches level 6 (streak freeze)

**To Do:**
_(none)_

---

# In-App Purchases (IAP)

**To Do:**
- [ ] Integrate react-native-iap
- [ ] Configure $5/month and $45/year premium plans
- [ ] Set up Apple/Google Play store listings
- [ ] Implement purchase flow
- [ ] Test buy/cancel scenarios

**Restore Purchases:**
- [ ] Add "Restore" button in Settings
- [ ] Sync with IAP library
- [ ] Test reinstall scenarios

---

# Favorites

**Completed:**
- [✅] Add "Favorite" button UI
- [✅] Store favorites in Redux
- [✅] Create favorites tab view

**To Do:**
_(none)_

---

# Smart Pick

**Completed:**
- [✅] Implement suggestion algorithm

**To Do:**
_(none)_

---

# Medium Priority (UX & Engagement)

## Reminders (Local Mock)
**To Do:**
- [ ] Implement streak reminder notifications
- [ ] Add premium feature notifications
- [ ] Create unfinished routine reminders
- [ ] Prepare Firebase integration (for future)
- [ ] Add voice feature for custom routines (optional)

## Intro Sequence
**Completed:**
- [✅] Build 3-screen onboarding flow
- [✅] Add skip functionality

**To Do:**
_(none)_

## Settings Updates
**Completed:**
- [✅] Update Privacy Policy

**To Do:**
- [ ] Create About and Help sections
- [ ] Add diagnostic tools (version, logs)

---

# Lower Priority (Content & Refinement)

## Video Content
**To Do:**
- [ ] Record 5/10/15-min sample videos
- [ ] Add AI voice narration
- [ ] Embed videos in app
- [ ] Add routine validation to prevent skipping

---

# Testing

**To Do:**
- [✅ ] Improve design for testing simulation (user-friendly for non-technical testers)
- [✅ ] Add clear instructions for testers
- [✅ ] Add code for test users only

---

# Premium Promo Codes

**To Do:**
- [ ] Create promo codes for premium access (week, month, 3 months, 6 months)
- [ ] Track number of users who redeem promo codes

# Create App Icon
# Photos or somethign for viewing vip stretches. 
# Remove console logs, better efficeint loading acroos states in the app. anything to optimzie? 