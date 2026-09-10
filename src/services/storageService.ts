import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { ProgressEntry, RoutineParams, BodyArea, Duration, Position } from '../types';
import { UserProgress } from '../utils/progress/types';
import { INITIAL_USER_PROGRESS } from '../utils/progress/constants';
import { streakEvents, STREAK_UPDATED_EVENT } from '../utils/progress/modules/streakManager';
import { clearAllAINotifications, clearAllNotifications } from '../utils/clearAllNotifications';
// ========== STORAGE KEYS ==========
export const KEYS = {
  USER: {
    PREMIUM: '@user_premium',
    TESTING_PREMIUM: '@flexbreak:testing_premium_access',
    SUBSCRIPTION_DETAILS: '@user_subscription_details',
  },
  PROGRESS: {
    USER_PROGRESS: '@user_progress',
    PROGRESS_ENTRIES: 'progress',
    PROGRESS_HISTORY: '@progress',
    HIDDEN_ROUTINES: '@hiddenRoutines',
  },
  ROUTINES: {
    FAVORITE_ROUTINES: '@favoriteRoutines',
    FAVORITES: 'favorites',
    RECENT: '@recentRoutines',
    ALL: '@allRoutines',
  },
  SETTINGS: {
    REMINDER_ENABLED: 'reminderEnabled',
    REMINDER_TIME: 'reminderTime',
    SHOW_DASHBOARD: '@shouldShowDashboard',
    TRANSITION_DURATION: '@transitionDuration',
  },
  UI: {
    COMPLETED_CHALLENGES: '@completedChallenges',
    ACHIEVEMENTS: '@achievements',
    REWARDS: '@rewards',
    LAST_REFRESH_TIME: '@lastRefreshTime',
    SYNC_TIMESTAMP: '@syncTimestamp',
  },
  MINIGAMES: {
    LAST_PLAYED_DATE: '@minigame_last_played_date',
    GAMES_PLAYED_TODAY: '@minigame_games_played_today',
    TOTAL_GAMES_PLAYED: '@minigame_total_games_played',
    PERFECT_SCORES: '@minigame_perfect_scores',
    CONSECUTIVE_DAYS: '@minigame_consecutive_days',
    TRIVIA_CORRECT_COUNT: '@minigame_trivia_correct',
    BEST_REACTION_TIME: '@minigame_best_reaction_time',
  },
  CUSTOM: {
    USER_SETTINGS: '@userSettings',
    CUSTOM_ROUTINES: '@customRoutines',
    ROUTINE_HISTORY: '@routineHistory',
  },
  USER_AGREEMENTS: {
    FITNESS_DISCLAIMER_ACCEPTED: 'fitness_disclaimer_accepted',
    NON_MEDICAL_NOTICE_SHOWN: 'non_medical_notice_shown',
  },
  AI_WELLNESS: {
    CONVERSATION_HISTORY: '@ai_wellness_conversations',
    USER_PATTERNS: '@ai_wellness_patterns',
    EFFECTIVENESS_TRACKING: '@ai_wellness_effectiveness',
    LAST_CHECKIN: '@ai_wellness_last_checkin',
    WEEKLY_USAGE: '@ai_wellness_weekly_usage',
    ENABLED: '@ai_wellness_enabled',
    USER_NAME: '@ai_wellness_user_name',
    HAS_SEEN_WELCOME: '@ai_wellness_has_seen_welcome',
    INTRO_MESSAGES_COUNT: '@ai_wellness_intro_count',
    FIRST_ENABLE_DONE: '@ai_wellness_first_enable_done',
    TIME_PREFERENCE: '@ai_wellness_time_preference',
    PREMIUM_WELCOME_SENT: '@ai_wellness_premium_welcome_sent',
  }
};

// ========== INITIAL STATE VALUES ==========
export const INITIAL_STATE = {
  USER_PROGRESS: { ...INITIAL_USER_PROGRESS },
  FAVORITES: [],
  RECENT_ROUTINES: [],
  SETTINGS: {
    reminderEnabled: false,
    reminderTime: null,
    showDashboard: false
  }
};

// ========== GENERIC STORAGE METHODS ==========

/**
 * Generic method to get data from AsyncStorage
 * @param key Storage key
 * @param defaultValue Default value if key doesn't exist
 * @returns The stored value or default value
 */
export const getData = async <T>(key: string, defaultValue: T): Promise<T> => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    if (jsonValue === null) {
      return defaultValue;
    }
    return JSON.parse(jsonValue);
  } catch (error) {
    return defaultValue;
  }
};

/**
 * Generic method to set data in AsyncStorage
 * @param key Storage key
 * @param value Value to store
 * @returns Success boolean
 */
export const setData = async <T>(key: string, value: T): Promise<boolean> => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Generic method to remove data from AsyncStorage
 * @param key Storage key
 * @returns Success boolean
 */
export const removeData = async (key: string): Promise<boolean> => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get all keys in AsyncStorage
 * @returns Array of keys
 */
export const getAllKeys = async (): Promise<readonly string[]> => {
  try {
    return await AsyncStorage.getAllKeys();
  } catch (error) {
    return [];
  }
};

// ========== USER METHODS ==========

/**
 * Save premium status
 * @param isPremium Whether user has premium access
 * @returns Success boolean
 */
export type StoredSubscriptionDetails = {
  productId: string;
  purchaseDate: string;
  expiryDate?: string;
  isActive: boolean;
  autoRenewing?: boolean;
  platform: 'ios' | 'android';
  purchaseToken?: string;
  verificationSource?: 'server';
};
export type EntitlementRecord = {
  version: 1;
  paid?: { source: 'paid' | 'legacy-paid'; active: boolean; details?: StoredSubscriptionDetails };
  promo?: { source: 'promo'; expiryDate: string };
  dev?: boolean;
};
const ENTITLEMENT_KEY = '@flexbreak:entitlements:v1';
const isFuture = (date?: string) => !!date && Number.isFinite(Date.parse(date)) && Date.parse(date) > Date.now();
const developmentBuild = () => typeof __DEV__ !== 'undefined' && __DEV__;
let entitlementQueue: Promise<unknown> = Promise.resolve();
const serializeEntitlement = <T>(operation: () => Promise<T>): Promise<T> => {
  const next = entitlementQueue.then(operation);
  entitlementQueue = next.catch(() => undefined);
  return next;
};
const readEntitlement = async (): Promise<EntitlementRecord> => {
  const stored = await AsyncStorage.getItem(ENTITLEMENT_KEY);
  if (stored !== null) {
    const record = JSON.parse(stored) as EntitlementRecord;
    if (!record || record.version !== 1) throw new Error('Invalid entitlement record');
    return record;
  }
  const [paidFlag, promoFlag, promoType, promoExpiry, subscription, devFlag] = await Promise.all([
    AsyncStorage.getItem(KEYS.USER.PREMIUM),
    AsyncStorage.getItem('@flexbreak:premium_status'),
    AsyncStorage.getItem('@flexbreak:premium_type'),
    AsyncStorage.getItem('@flexbreak:premium_expiry_date'),
    AsyncStorage.getItem(KEYS.USER.SUBSCRIPTION_DETAILS),
    AsyncStorage.getItem(KEYS.USER.TESTING_PREMIUM),
  ]);
  const oldSubscription: StoredSubscriptionDetails | undefined = subscription ? JSON.parse(subscription) : undefined;
  const promoEvidence = promoFlag !== null || promoType !== null || promoExpiry !== null;
  const record: EntitlementRecord = { version: 1 };
  // Old release synthesized subscription expiry from "now". It is not a verified
  // expiry; preserve real legacy-paid access until a definitive store answer.
  if (paidFlag === 'true' && (!promoEvidence || !!oldSubscription?.productId)) {
    record.paid = { source: oldSubscription?.verificationSource === 'server' ? 'paid' : 'legacy-paid', active: true, details: oldSubscription };
  }
  // Keep expired promo provenance, too: its old paid boolean must never migrate
  // into a perpetual legacy subscription on a later launch.
  if (promoFlag === 'true' && promoExpiry) record.promo = { source: 'promo', expiryDate: promoExpiry };
  if (developmentBuild() && devFlag === 'true') record.dev = true;
  await AsyncStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(record));
  return record;
};
export const getEntitlementSnapshot = () => serializeEntitlement(async () => {
  const record = await readEntitlement();
  const details = record.paid?.details;
  const paid = record.paid?.active === true && (record.paid.source === 'legacy-paid' ||
    (record.paid.source === 'paid' && details?.verificationSource === 'server' && details.isActive === true && isFuture(details.expiryDate)));
  const promo = record.promo?.source === 'promo' && isFuture(record.promo.expiryDate);
  const expiries = [paid && record.paid?.source === 'paid' ? details?.expiryDate : undefined, promo ? record.promo?.expiryDate : undefined]
    .filter((date): date is string => !!date).sort((a, b) => Date.parse(a) - Date.parse(b));
  return {
    isPremium: !!(paid || promo || (developmentBuild() && record.dev)),
    source: paid ? record.paid?.source : promo ? 'promo' as const : developmentBuild() && record.dev ? 'dev' as const : null,
    nextExpiry: expiries[0] || null,
    subscriptionDetails: details || null,
  };
});
export const getIsPremium = async (): Promise<boolean> => (await getEntitlementSnapshot()).isPremium;

// Compatibility entry point: production access is derived, never granted by a boolean.
export const saveIsPremium = (isPremium: boolean): Promise<boolean> => serializeEntitlement(async () => {
  if (!developmentBuild()) return false;
  const record = await readEntitlement();
  record.dev = isPremium;
  await AsyncStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(record));
  return true;
});
export const savePromoEntitlement = (expiryDate: string): Promise<void> => serializeEntitlement(async () => {
  if (!isFuture(expiryDate)) throw new Error('Invalid or expired promo entitlement');
  const record = await readEntitlement();
  record.promo = { source: 'promo', expiryDate };
  await AsyncStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(record));
});
// Only a successful store reconciliation may call this; network failures never do.
export const clearVerifiedPaidEntitlement = (): Promise<void> => serializeEntitlement(async () => {
  const record = await readEntitlement();
  record.paid = { source: 'paid', active: false, details: record.paid?.details };
  await AsyncStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(record));
});

// ========== PROGRESS METHODS ==========

/**
 * Get user progress data
 * @returns User progress object
 */
export const getUserProgress = async (strict = false): Promise<UserProgress> => {
  try {
    const progress = strict
      ? JSON.parse(await AsyncStorage.getItem(KEYS.PROGRESS.USER_PROGRESS) || JSON.stringify(INITIAL_USER_PROGRESS))
      : await getData<UserProgress>(KEYS.PROGRESS.USER_PROGRESS, { ...INITIAL_USER_PROGRESS });
    
    if (strict && (!progress || Array.isArray(progress) || !Number.isFinite(progress.totalXP))) {
      throw new Error('Invalid saved user progress');
    }
    // Migrate progress if needed
    const migratedProgress = migrateUserProgress(progress);
    
    // If migration was performed, save the updated progress
    if (!strict && migratedProgress !== progress) {
      await saveUserProgress(migratedProgress);
    }
    
    return migratedProgress;
  } catch (error) {
    if (strict) throw error;
    return { ...INITIAL_USER_PROGRESS };
  }
};

/**
 * Save user progress data
 * @param progress User progress object
 * @returns Success boolean
 */
export const saveUserProgress = async (progress: UserProgress): Promise<boolean> => {
  try {
    // Update the lastUpdated timestamp
    const updatedProgress = {
      ...progress,
      lastUpdated: new Date().toISOString()
    };
    
    const result = await setData(KEYS.PROGRESS.USER_PROGRESS, updatedProgress);
    return result;
  } catch (error) {
    return false;
  }
};

/**
 * Reset user progress to initial state
 * @returns Initial user progress
 */
export const resetUserProgress = async (): Promise<UserProgress> => {
  try {
    await removeData(KEYS.PROGRESS.USER_PROGRESS);
    return { ...INITIAL_USER_PROGRESS };
  } catch (error) {
    return { ...INITIAL_USER_PROGRESS };
  }
};

/**
 * Migrate user progress to the latest format if needed
 * @param progress The user progress to migrate
 * @returns The migrated user progress
 */
const migrateUserProgress = (progress: UserProgress): UserProgress => {
  const migratedProgress = { ...progress };
  
  // Ensure statistics object exists
  if (!migratedProgress.statistics) {
    migratedProgress.statistics = {
      totalRoutines: 0,
      currentStreak: 0,
      bestStreak: 0,
      uniqueAreas: [],
      totalMinutes: 0,
      routinesByArea: {},
      lastUpdated: new Date().toISOString()
    };
  }
  
  // Ensure routinesByArea exists
  if (!migratedProgress.statistics.routinesByArea) {
    migratedProgress.statistics.routinesByArea = {};
  }
  
  // Ensure totalMinutes exists
  if (migratedProgress.statistics.totalMinutes === undefined) {
    migratedProgress.statistics.totalMinutes = 0;
  }
  
  // IMPORTANT: For existing users with routines, set the welcome bonus flag
  // This prevents users from getting a duplicate welcome bonus
  if (!migratedProgress.hasReceivedWelcomeBonus) {
    // If the user has any XP or completed routines, they should have the flag set to true
    if (migratedProgress.totalXP > 0 || migratedProgress.statistics.totalRoutines > 0) {
      migratedProgress.hasReceivedWelcomeBonus = true;
    } else {
      // New user, initialize the flag to false
      migratedProgress.hasReceivedWelcomeBonus = false;
    }
  }
  
  return migratedProgress;
};

// ========== ROUTINE METHODS ==========

// Debug helper function for timezone logging
const logTimezone = (functionName: string, message: string) => {
};

/**
 * Get recent routines
 * @returns Array of recent routines
 */
export const getRecentRoutines = async (): Promise<ProgressEntry[]> => {
  try {
    logTimezone('getRecentRoutines', `Current date/time: ${new Date().toISOString()}`);
    logTimezone('getRecentRoutines', `Local time components: Y=${new Date().getFullYear()} M=${new Date().getMonth()+1} D=${new Date().getDate()}`);
    logTimezone('getRecentRoutines', `Timezone offset: ${new Date().getTimezoneOffset() / -60}h`);
    
    const routines = await getData<ProgressEntry[]>(KEYS.PROGRESS.PROGRESS_HISTORY, []);
    logTimezone('getRecentRoutines', `Found ${routines.length} total routines`);
    
    if (routines.length > 0) {
      logTimezone('getRecentRoutines', `First routine date: ${routines[0].date}`);
      
      // Check date parsing
      const firstDate = new Date(routines[0].date);
      logTimezone('getRecentRoutines', `First routine parsed ISO: ${firstDate.toISOString()}`);
      logTimezone('getRecentRoutines', `First routine local components: Y=${firstDate.getFullYear()} M=${firstDate.getMonth()+1} D=${firstDate.getDate()}`);
    }
    
    // Filter out hidden routines
    const visibleRoutines = routines.filter(routine => !routine.hidden);
    logTimezone('getRecentRoutines', `Returning ${visibleRoutines.length} visible routines`);
    
    return visibleRoutines;
  } catch (error) {
    logTimezone('getRecentRoutines', `Error: ${error}`);
    return [];
  }
};

/**
 * Get all routines (including hidden)
 * @returns Array of all routines
 */
export const getAllRoutines = async (strict = false): Promise<ProgressEntry[]> => {
  try {
    logTimezone('getAllRoutines', `Current date/time: ${new Date().toISOString()}`);
    
    const allRoutines: ProgressEntry[] = strict
      ? JSON.parse(await AsyncStorage.getItem(KEYS.PROGRESS.PROGRESS_ENTRIES) || '[]')
      : await getData<ProgressEntry[]>(KEYS.PROGRESS.PROGRESS_ENTRIES, []);
    if (!Array.isArray(allRoutines)) throw new Error('Invalid routine history');
    logTimezone('getAllRoutines', `Found ${allRoutines.length} total routines`);
    
    if (allRoutines.length > 0) {
      // Log sorted dates to help debug streak calculation issues
      const sortedDates = [...allRoutines]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map(r => r.date);
      
      logTimezone('getAllRoutines', `First few sorted dates: ${sortedDates.slice(0, 5).join(', ')}`);
      
      // Check date parsing for the most recent routine
      if (sortedDates.length > 0) {
        const mostRecentDate = new Date(sortedDates[0]);
        logTimezone('getAllRoutines', `Most recent date parsed: ${mostRecentDate.toISOString()}`);
        logTimezone('getAllRoutines', `Most recent local components: Y=${mostRecentDate.getFullYear()} M=${mostRecentDate.getMonth()+1} D=${mostRecentDate.getDate()}`);
      }
    }
    
    return allRoutines;
  } catch (error) {
    if (strict) throw error;
    logTimezone('getAllRoutines', `Error: ${error}`);
    return [];
  }
};

/**
 * Save routine progress
 * @param entry Progress entry to save
 * @returns Success boolean
 */
// Same queue also protects direct callers from read/modify/write races.
let routineWriteQueue: Promise<unknown> = Promise.resolve();
export const saveRoutineProgress = (entry: ProgressEntry): Promise<boolean> => {
  const operation = routineWriteQueue.then(async () => {
    try {
      const recent: ProgressEntry[] = JSON.parse(await AsyncStorage.getItem(KEYS.PROGRESS.PROGRESS_HISTORY) || '[]');
      const all = await getAllRoutines(true);
      if (!Array.isArray(recent)) throw new Error('Invalid recent routine history');
      const identity = (routine: ProgressEntry) => routine.id || routine.date;
      const contains = (items: ProgressEntry[]) => items.some(item => identity(item) === identity(entry));
      // Each key is independently idempotent: retry repairs a partially written pair.
      if (!contains(recent)) {
        await AsyncStorage.setItem(KEYS.PROGRESS.PROGRESS_HISTORY, JSON.stringify([entry, ...recent].slice(0, 20)));
      }
      if (!contains(all)) {
        await AsyncStorage.setItem(KEYS.PROGRESS.PROGRESS_ENTRIES, JSON.stringify([...all, entry]));
      }
      streakEvents.emit(STREAK_UPDATED_EVENT);
      return true;
    } catch (error) {
      logTimezone('saveRoutineProgress', `Error: ${error}`);
      return false;
    }
  });
  routineWriteQueue = operation.catch(() => undefined);
  return operation;
};

/**
 * Save completed routine
 * @param routine Routine parameters
 * @param stretchCount Number of stretches completed
 * @returns Success boolean
 */
export const saveCompletedRoutine = async (
  routine: RoutineParams, 
  stretchCount: number = 0
): Promise<boolean> => {
  try {
    logTimezone('saveCompletedRoutine', `Current date/time: ${new Date().toISOString()}`);
    
    // Create progress entry
    const now = new Date();
    const formattedDate = now.toISOString();
    const cleanDate = formattedDate.split('T')[0];
    
    logTimezone('saveCompletedRoutine', `Formatted date: ${formattedDate}`);
    logTimezone('saveCompletedRoutine', `Clean date: ${cleanDate}`);
    logTimezone('saveCompletedRoutine', `Local components: Y=${now.getFullYear()} M=${now.getMonth()+1} D=${now.getDate()}`);
    
    const entry: ProgressEntry = {
      area: routine.area,
      duration: routine.duration,
      date: formattedDate,
      stretchCount: stretchCount,
      position: routine.position,
      savedStretches: routine.customStretches || []
    };
    
    return await saveRoutineProgress(entry);
  } catch (error) {
    logTimezone('saveCompletedRoutine', `Error: ${error}`);
    return false;
  }
};

/**
 * Hide a routine
 * @param routineDate Date of routine to hide
 * @returns Success boolean
 */
export const hideRoutine = async (routineDate: string): Promise<boolean> => {
  try {
    // Get existing routines
    const existingRoutines = await getRecentRoutines();
    
    // Find the routine to hide
    const routineToHide = existingRoutines.find(routine => routine.date === routineDate);
    
    if (!routineToHide) {
      return false;
    }
    
    // Remove from visible routines
    const updatedRoutines = existingRoutines.filter(
      routine => routine.date !== routineDate
    );
    
    // Save updated visible routines
    await setData(KEYS.PROGRESS.PROGRESS_HISTORY, updatedRoutines);
    
    // Add to hidden routines
    const hiddenRoutines = await getData<ProgressEntry[]>(KEYS.PROGRESS.HIDDEN_ROUTINES, []);
    
    // Mark the routine as hidden
    const hiddenRoutine = {
      ...routineToHide,
      hidden: true
    };
    
    hiddenRoutines.push(hiddenRoutine);
    await setData(KEYS.PROGRESS.HIDDEN_ROUTINES, hiddenRoutines);
    
    return true;
  } catch (error) {
    return false;
  }
};

// ========== FAVORITES METHODS ==========

/**
 * Get favorite stretches
 * @returns Array of favorite stretch IDs
 */
export const getFavorites = async (): Promise<number[]> => {
  return getData<number[]>(KEYS.ROUTINES.FAVORITES, []);
};

/**
 * Save a stretch as favorite
 * @param stretchId ID of stretch to save
 * @returns Success boolean
 */
export const saveFavorite = async (stretchId: number): Promise<boolean> => {
  try {
    const favorites = await getFavorites();
    if (!favorites.includes(stretchId)) {
      favorites.push(stretchId);
      return await setData(KEYS.ROUTINES.FAVORITES, favorites);
    }
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Remove a stretch from favorites
 * @param stretchId ID of stretch to remove
 * @returns Success boolean
 */
export const removeFavorite = async (stretchId: number): Promise<boolean> => {
  try {
    const favorites = await getFavorites();
    const updatedFavorites = favorites.filter(id => id !== stretchId);
    return await setData(KEYS.ROUTINES.FAVORITES, updatedFavorites);
  } catch (error) {
    return false;
  }
};

/**
 * Save a routine to favorites
 * @param routine Routine to save
 * @returns Success boolean or object with status and message
 */
export const saveFavoriteRoutine = async (routine: { 
  name?: string; 
  area: BodyArea; 
  duration: Duration,
  position?: Position,
  savedStretches?: any[]
}): Promise<{success: boolean, limitReached?: boolean, message?: string}> => {
  try {
    // Get existing favorites
    const favorites = await getData<any[]>(KEYS.ROUTINES.FAVORITE_ROUTINES, []);
    
    // Check if we've reached the maximum number of favorites (15)
    if (favorites.length >= 15) {
      return {
        success: false,
        limitReached: true,
        message: 'You can save up to 15 favorite routines. Please remove some before adding more.'
      };
    }
    
    // Add new favorite
    const newFavorite = {
      ...routine,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    
    // Add to beginning of array
    const updatedFavorites = [newFavorite, ...favorites];
    
    // Save to storage
    const saveResult = await setData(KEYS.ROUTINES.FAVORITE_ROUTINES, updatedFavorites);
    
    return {
      success: saveResult,
      message: saveResult ? 'Routine saved to favorites!' : 'Failed to save routine'
    };
  } catch (error) {
    return {
      success: false,
      message: 'An error occurred while saving the routine'
    };
  }
};

/**
 * Get favorite routines
 * @returns Array of favorite routines
 */
export const getFavoriteRoutines = async (): Promise<any[]> => {
  try {
    const favorites = await getData<any[]>(KEYS.ROUTINES.FAVORITE_ROUTINES, []);
    return favorites;
  } catch (error) {
    return [];
  }
};

/**
 * Delete a favorite routine by ID
 * @param routineId ID of the routine to delete
 * @returns Success boolean
 */
export const deleteFavoriteRoutine = async (routineId: string): Promise<boolean> => {
  try {
    // Get existing favorite routines
    const favorites = await getFavoriteRoutines();
    
    // Filter out the routine to delete
    const updatedFavorites = favorites.filter(routine => routine.id !== routineId);
    
    // If nothing was removed, return false
    if (updatedFavorites.length === favorites.length) {
      return false;
    }
    
    // Save updated favorites
    const success = await setData(KEYS.ROUTINES.FAVORITE_ROUTINES, updatedFavorites);
    return success;
  } catch (error) {
    return false;
  }
};

// ========== SETTINGS METHODS ==========

/**
 * Save reminder enabled setting
 * @param enabled Whether reminders are enabled
 * @returns Success boolean
 */
export const saveReminderEnabled = async (enabled: boolean): Promise<boolean> => {
  return setData(KEYS.SETTINGS.REMINDER_ENABLED, enabled);
};

/**
 * Get reminder enabled setting
 * @returns Whether reminders are enabled
 */
export const getReminderEnabled = async (): Promise<boolean> => {
  return getData<boolean>(KEYS.SETTINGS.REMINDER_ENABLED, false);
};

/**
 * Save reminder time
 * @param time Time for reminders
 * @returns Success boolean
 */
export const saveReminderTime = async (time: string): Promise<boolean> => {
  return setData(KEYS.SETTINGS.REMINDER_TIME, time);
};

/**
 * Get reminder time
 * @returns Reminder time string or null
 */
export const getReminderTime = async (): Promise<string | null> => {
  try {
    // Direct AsyncStorage call for string value
    return await AsyncStorage.getItem(KEYS.SETTINGS.REMINDER_TIME);
  } catch (error) {
    return null;
  }
};

/**
 * Set dashboard display flag
 * @param value Whether to show dashboard
 * @returns Success boolean
 */
export const setDashboardFlag = async (value: boolean): Promise<boolean> => {
  return setData(KEYS.SETTINGS.SHOW_DASHBOARD, value);
};

/**
 * Get dashboard display flag
 * @returns Whether to show dashboard
 */
export const getDashboardFlag = async (): Promise<boolean> => {
  return getData<boolean>(KEYS.SETTINGS.SHOW_DASHBOARD, false);
};

/**
 * Save transition duration preference
 */
export const saveTransitionDuration = async (duration: number): Promise<boolean> => {
  try {
    await AsyncStorage.setItem('@transition_duration', duration.toString());
    return true;
  } catch (error) {
    console.error('Failed to save transition duration', error);
    return false;
  }
};

/**
 * Get saved transition duration preference, defaults to 5 seconds
 */
export const getTransitionDuration = async (): Promise<number> => {
  try {
    const value = await AsyncStorage.getItem('@transition_duration');
    if (value !== null) {
      return parseInt(value, 10);
    }
    return 5; // Default to 5 seconds
  } catch (error) {
    console.error('Failed to get transition duration', error);
    return 5; // Default to 5 seconds on error too
  }
};

// ========== DATA MANAGEMENT METHODS ==========

/**
 * Synchronize progress data between different storage keys
 * @returns Success boolean
 */
export const synchronizeProgressData = async (): Promise<boolean> => {
  try {
    // Get data from all storage locations
    const recentRoutinesData = await getData<ProgressEntry[]>(KEYS.PROGRESS.PROGRESS_HISTORY, []);
    const progressData = await getData<ProgressEntry[]>(KEYS.PROGRESS.PROGRESS_ENTRIES, []);
    const hiddenRoutinesData = await getData<ProgressEntry[]>(KEYS.PROGRESS.HIDDEN_ROUTINES, []);
    
    // Create a merged set of unique entries based on date
    const mergedEntries: { [key: string]: ProgressEntry } = {};
    
    // We'll process data in the following order to ensure precedence:
    // 1. Progress data (source of truth)
    // 2. Hidden routines (to maintain hidden status)
    // 3. Recent visible routines
    
    // First add entries from progress data (core source of truth)
    progressData.forEach((entry: ProgressEntry) => {
      if (entry.date) {
        mergedEntries[entry.date] = entry;
      }
    });
    
    // Then add entries from hidden routines (to maintain hidden status)
    hiddenRoutinesData.forEach((entry: ProgressEntry) => {
      if (entry.date) {
        if (!mergedEntries[entry.date]) {
          // If the entry doesn't exist in merged entries, add it
          mergedEntries[entry.date] = entry;
        } else {
          // If it exists, ensure hidden flag is preserved
          mergedEntries[entry.date] = {
            ...mergedEntries[entry.date],
            hidden: true
          };
        }
      }
    });
    
    // Finally add entries from visible routines (but don't overwrite hidden status)
    recentRoutinesData.forEach((entry: ProgressEntry) => {
      if (entry.date) {
        if (!mergedEntries[entry.date]) {
          // If entry doesn't exist, add it
          mergedEntries[entry.date] = entry;
        } else if (!mergedEntries[entry.date].hidden) {
          // If entry exists but isn't marked as hidden, update it
          // This preserves hidden status if it was set in hiddenRoutinesData
          mergedEntries[entry.date] = {
            ...entry,
            hidden: mergedEntries[entry.date].hidden || false
          };
        }
      }
    });
    
    // Convert back to arrays
    const mergedRoutines = Object.values(mergedEntries);
    
    // Sort by date (newest first)
    mergedRoutines.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    // Split into visible and hidden routines
    const visibleRoutines = mergedRoutines.filter(routine => !routine.hidden);
    const hiddenRoutines = mergedRoutines.filter(routine => routine.hidden);
    
    // Save synchronized data back to storage
    await setData(KEYS.PROGRESS.PROGRESS_HISTORY, visibleRoutines);
    await setData(KEYS.PROGRESS.HIDDEN_ROUTINES, hiddenRoutines);
    
    // Save ALL routines (both visible and hidden) to progress entries for statistics
    await setData(KEYS.PROGRESS.PROGRESS_ENTRIES, mergedRoutines);
    
    // Update timestamp of synchronization
    await setData(KEYS.UI.SYNC_TIMESTAMP, new Date().toISOString());
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Export user progress data to a file (for web platforms)
 * @param progress The user progress data to export
 */
export const exportUserProgress = (progress: UserProgress): void => {
  if (Platform.OS === 'web') {
    try {
      const jsonString = JSON.stringify(progress, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json', lastModified: new Date().getTime() });
      const url = URL.createObjectURL(blob);
      
      const doc = (globalThis as any).document;
      const a = doc.createElement('a');
      a.href = url;
      a.download = 'flexbreak_progress.json';
      doc.body.appendChild(a);
      a.click();
      doc.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Could not export progress data:', error);
    }
  } else {
    // File export is only implemented on web.
  }
};

/**
 * Clear all app data
 * @param resetTestingData Optional parameter to also clear testing-related data
 * @returns Success boolean
 */
export const clearAllData = async (resetTestingData: boolean = false): Promise<boolean> => {
  try {
    // Cancel all scheduled notifications first
    try {
      const Notifications = await import('expo-notifications');
      await Notifications.cancelAllScheduledNotificationsAsync();
      console.log('All scheduled notifications cancelled');
    } catch (notifError) {
      console.error('Error cancelling notifications:', notifError);
      // Continue with data clearing even if notification cancellation fails
    }
    
    // Get all known keys from our KEYS object
    const knownKeys = [
      ...Object.values(KEYS.USER),
      ...Object.values(KEYS.PROGRESS),
      ...Object.values(KEYS.ROUTINES),
      ...Object.values(KEYS.SETTINGS),
      ...Object.values(KEYS.UI),
      ...Object.values(KEYS.CUSTOM),
      ...Object.values(KEYS.USER_AGREEMENTS)
    ];
    
    // Explicitly add routine data keys to ensure they get cleared
    knownKeys.push(
      '@user_routines', 
      '@all_routines', 
      '@visible_routines',
      '@user_progress',
      '@gamification',
      '@achievements',
      '@challenges'
    );
    
    // Add AI wellness keys to ensure they get cleared
    if (KEYS.AI_WELLNESS) {
      knownKeys.push(...Object.values(KEYS.AI_WELLNESS));
    }
    
    // Comprehensive AI wellness data cleanup
    knownKeys.push(
      // AI wellness core
      '@ai_wellness_enabled',
      '@ai_wellness_has_seen_welcome',
      '@ai_wellness_show_modal',
      '@ai_wellness_voice_mode',
      '@ai_wellness_last_response',
      '@ai_wellness_regular_scheduled',
      '@ai_wellness_voice_context',
      '@ai_wellness_notification_conversation',
      '@ai_wellness_voice_intro_seen',
      '@ai_wellness_premium_upgrade_seen',
      '@ai_wellness_show_upgrade_on_next_open',
      '@ai_wellness_user_name',
      '@ai_wellness_time_preference',
      '@ai_wellness_custom_time',
      '@ai_wellness_premium_welcome_sent',
      '@last_premium_status',
      
      // FlexChat modal and related data
      '@show_flexchat_on_open',
      '@flexbreak:open_flexchat_after_settings',
      '@flexbreak:device_id',
      '@ai_wellness_last_toggle',
      '@ai_wellness_toggle_count',
      '@last_notification_processed',
      '@ai_wellness_onboarding_seen',
      '@ai_wellness_first_enable_done',
      '@ai_wellness_intro_count',
      '@ai_wellness_detected_language',
      
      // AI conversation and session data
      '@ai_conversation_session_*',
      '@ai_wellness_session_*',
      '@ai_wellness_last_interaction',
      '@ai_wellness_daily_count',
      '@ai_wellness_weekly_count',
      
      // AI memory and insights
      '@ai_wellness_memory_*',
      '@ai_wellness_simple_memory_*',
      '@ai_wellness_insights_*',
      '@ai_wellness_user_patterns_*',
      '@ai_wellness_effectiveness_*',
      
      // AI cost and rate limiting
      '@ai_wellness_cost_*',
      '@ai_wellness_rate_limit_*',
      '@ai_wellness_last_request_*',
      
      // AI notification data
      '@ai_wellness_notification_*',
      '@ai_wellness_upgrade_notification_*',
      '@ai_wellness_check_in_*',
      '@ai_wellness_follow_up_*',
      
      // App state for AI
      '@app_state'
    );
    
    // Add pattern-based AI keys from all existing keys
    const aiPatterns = [
      /^@ai_wellness_/,
      /^@ai_conversation_/,
      /^@ai_notification_/,
      /^@ai_cost_/,
      /^@ai_memory_/
    ];
    
    // Define testing-related keys to preserve
    const testingKeys = [
      '@flexbreak:testing_phase',
      '@flexbreak:testing_access',
      '@flexbreak:bob_simulator_access',
      '@flexbreak:testing_return_phase',
      '@flexbreak:simulator_scenario',
      '@flexbreak:testing_feedback',
      'testing_access_granted',
      'testing_current_stage',
    ];
    
    // Explicitly ensure premium keys are included for removal
    const premiumKeys = [
      KEYS.USER.PREMIUM,
      KEYS.USER.TESTING_PREMIUM,
      '@flexbreak:testing_premium_access',
      '@user_premium',
      '@premium',
      '@isPremium'
    ];
    
    // Add premium keys to known keys to ensure they get cleared
    knownKeys.push(...premiumKeys);
    
    // Get all keys from AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Add all AI-related keys found by pattern matching
    allKeys.forEach(key => {
      if (aiPatterns.some(pattern => pattern.test(key))) {
        knownKeys.push(key);
      }
    });
    
    // Merge with our known keys list
    const uniqueKeys = [...new Set([...knownKeys, ...allKeys])] as string[];
    
    // Filter out testing keys if needed
    const keysToRemove = resetTestingData 
      ? uniqueKeys 
      : uniqueKeys.filter(key => !testingKeys.includes(key));
    
    // Remove the keys in batches to avoid potential issues
    await AsyncStorage.multiRemove(keysToRemove);
    
    // If testing data was preserved, restore basic testing access
    if (!resetTestingData) {
      await restoreTestingAccess();
    }
    
    // Explicitly clear premium status to ensure it's reset
    await AsyncStorage.setItem(KEYS.USER.PREMIUM, 'false');
    await AsyncStorage.setItem(KEYS.USER.TESTING_PREMIUM, 'false');
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Restore basic testing access after a complete reset
 * This ensures the user can still access testing features
 */
export const restoreTestingAccess = async (): Promise<void> => {
  if (!developmentBuild()) return;
  try {
    // Set minimum testing keys to ensure access
    await AsyncStorage.setItem('@flexbreak:testing_access', 'true');
    await AsyncStorage.setItem('@flexbreak:testing_phase', '1');
  } catch (error) {
    console.warn('Could not restore testing access:', error);
  }
};

// ========== CUSTOM ROUTINES METHODS ==========

/**
 * Save a custom routine
 * @param routine Custom routine to save
 * @returns Success boolean
 */
export const saveCustomRoutine = async (routine: { 
  name: string; 
  area: BodyArea; 
  duration: Duration;
  customStretches?: { id: number | string; isRest?: boolean; bilateral?: boolean; }[];
}): Promise<boolean> => {
  try {
    // Get existing custom routines
    const customRoutines = await getCustomRoutines();
    
    // Add new custom routine
    const newRoutine = {
      ...routine,
      id: Date.now().toString(),
      timestamp: new Date().toISOString()
    };
    
    // Add to beginning of array
    const updatedRoutines = [newRoutine, ...customRoutines];
    
    // Save to storage
    return await setData(KEYS.CUSTOM.CUSTOM_ROUTINES, updatedRoutines);
  } catch (error) {
    return false;
  }
};

/**
 * Get all custom routines
 * @returns Array of custom routines
 */
export const getCustomRoutines = async (): Promise<any[]> => {
  return getData<any[]>(KEYS.CUSTOM.CUSTOM_ROUTINES, []);
};

/**
 * Delete a custom routine by ID
 * @param routineId ID of routine to delete
 * @returns Success boolean
 */
export const deleteCustomRoutine = async (routineId: string): Promise<boolean> => {
  try {
    // Get existing custom routines
    const customRoutines = await getCustomRoutines();
    
    // Remove the routine with the specified ID
    const updatedRoutines = customRoutines.filter(routine => routine.id !== routineId);
    
    // Save to storage
    return await setData(KEYS.CUSTOM.CUSTOM_ROUTINES, updatedRoutines);
  } catch (error) {
    return false;
  }
};

/**
 * Initializes user progress data if it doesn't exist
 * @returns The initialized or existing user progress
 */
export const initializeUserProgressIfEmpty = async (): Promise<UserProgress> => {
  try {
    const progress = await getUserProgress();
    
    // If progress is empty or has no totalXP property, initialize it
    if (!progress || progress.totalXP === undefined) {
      const defaultProgress = INITIAL_USER_PROGRESS;
      await saveUserProgress(defaultProgress);
      return defaultProgress;
    }
    
    return progress;
  } catch (error) {
    // Return default progress if there was an error
    return INITIAL_USER_PROGRESS;
  }
};

/**
 * Clear all saved routines but maintain other user data
 * @returns Success boolean
 */
export const clearRoutines = async (): Promise<boolean> => {
  try {
    // Clear routine data from storage
    await setData(KEYS.PROGRESS.PROGRESS_ENTRIES, []);
    await setData(KEYS.PROGRESS.PROGRESS_HISTORY, []);
    
    // Verify the routines were cleared
    const routines = await getAllRoutines();
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Reset simulation data for testers
 * This is similar to clearAllData but with extra precautions to preserve tester status and premium access
 * @returns Success boolean
 */
export const resetSimulationData = async (): Promise<boolean> => {
  if (!developmentBuild()) return false;
  try {
    // First, backup premium and testing status
    const testingPremium = await AsyncStorage.getItem(KEYS.USER.TESTING_PREMIUM);
    const regularPremium = await getData<boolean>(KEYS.USER.PREMIUM, false);
    
    // Get all keys for simulation data including AI wellness
    const simulationKeys = [
      ...Object.values(KEYS.PROGRESS),
      ...Object.values(KEYS.ROUTINES),
      ...Object.values(KEYS.UI),
      '@user_routines', 
      '@all_routines', 
      '@visible_routines',
      '@user_progress',
      '@gamification',
      '@achievements',
      '@challenges'
    ];
    
    // Add all AI wellness keys for simulation reset
    const aiWellnessKeys = [
      '@ai_wellness_enabled',
      '@ai_wellness_has_seen_welcome',
      '@ai_wellness_show_modal',
      '@ai_wellness_voice_mode',
      '@ai_wellness_last_response',
      '@ai_wellness_regular_scheduled',
      '@ai_wellness_voice_context',
      '@ai_wellness_notification_conversation',
      '@ai_wellness_voice_intro_seen',
      '@ai_wellness_premium_upgrade_seen',
      '@ai_wellness_show_upgrade_on_next_open',
      '@ai_wellness_user_name',
      '@ai_wellness_time_preference',
      '@ai_wellness_custom_time',
      '@ai_wellness_premium_welcome_sent',
      '@last_premium_status',
      '@app_state',
      // FlexChat modal related
      '@show_flexchat_on_open',
      '@flexbreak:open_flexchat_after_settings',
      '@flexbreak:device_id',
      '@ai_wellness_last_toggle',
      '@ai_wellness_toggle_count',
      '@last_notification_processed',
      '@ai_wellness_onboarding_seen',
      '@ai_wellness_first_enable_done',
      '@ai_wellness_intro_count',
      '@ai_wellness_detected_language'
    ];
    
    simulationKeys.push(...aiWellnessKeys);
    
    // Define keys to preserve (testing and premium related)
    const keysToPreserve = [
      KEYS.USER.PREMIUM,
      KEYS.USER.TESTING_PREMIUM,
      '@flexbreak:testing_phase',
      '@flexbreak:testing_access',
      '@flexbreak:bob_simulator_access',
      '@flexbreak:testing_return_phase',
      '@flexbreak:simulator_scenario',
      '@flexbreak:testing_feedback',
      '@flexbreak:testing_checklist_progress',
      '@flexbreak:testing_checklist_p2_progress',
      '@flexbreak:testing_feedback_submitted',
      'testing_access_granted',
      'testing_current_stage'
    ];
    
    // Get all keys from AsyncStorage
    const allKeys = await AsyncStorage.getAllKeys();
    
    // Add AI pattern matching for comprehensive cleanup
    const aiPatterns = [
      /^@ai_wellness_/,
      /^@ai_conversation_/,
      /^@ai_notification_/,
      /^@ai_cost_/,
      /^@ai_memory_/
    ];
    
    // Filter to get just the keys we want to remove (simulation data + AI patterns)
    const keysToRemove = allKeys.filter(key => {
      // Remove if it's in simulation keys AND not preserved
      if (simulationKeys.includes(key) && !keysToPreserve.includes(key)) {
        return true;
      }
      // Also remove if it matches AI patterns AND not preserved
      if (aiPatterns.some(pattern => pattern.test(key)) && !keysToPreserve.includes(key)) {
        return true;
      }
      return false;
    });
    
    // Explicitly add conversation session keys for common user IDs
    const commonUserIds = ['anonymous', 'user', 'test', 'demo'];
    commonUserIds.forEach(userId => {
      const sessionKey = `@ai_conversation_session_${userId}`;
      if (!keysToRemove.includes(sessionKey)) {
        keysToRemove.push(sessionKey);
      }
    });
    
    // Clear simulation keys except preserved ones
    await AsyncStorage.multiRemove(keysToRemove);
    
    // Safety check - restore premium status if somehow lost
    if (testingPremium === 'true' || regularPremium) {
      await AsyncStorage.setItem(KEYS.USER.TESTING_PREMIUM, testingPremium || 'false');
      await setData(KEYS.USER.PREMIUM, regularPremium);
    }
    
    // Re-initialize user progress with defaults
    await initializeUserProgressIfEmpty();
    
    // Additionally, clear custom reminder messages from all possible storage locations
    await AsyncStorage.removeItem('@flexbreak:custom_reminder_message');
    await AsyncStorage.removeItem('reminder_message');
    await AsyncStorage.removeItem('firebase_reminder_message');
    
    // Clear AI memory service data
    try {
      const memoryService = await import('./ai/memory/memoryService');
      if (memoryService.default && memoryService.default.clearMemory) {
        // Clear memory for anonymous user (covers most cases)
        await memoryService.default.clearMemory('anonymous');
        // Also try to get actual user ID and clear if available
        const userId = await AsyncStorage.getItem('@user_id');
        if (userId && userId !== 'anonymous') {
          await memoryService.default.clearMemory(userId);
        }
      }
    } catch (error) {
      console.log('Memory service not available or error clearing:', error);
    }
    
    // Clear conversation manager sessions
    try {
      const conversationManager = await import('./ai/core/conversationManager');
      if (conversationManager.conversationManager) {
        // Clear common user sessions
        const userIds = ['anonymous', 'user', 'test', 'demo'];
        for (const userId of userIds) {
          await conversationManager.conversationManager.clearSession(userId);
        }
        // Also clear actual user ID if exists
        const actualUserId = await AsyncStorage.getItem('@user_id');
        if (actualUserId && !userIds.includes(actualUserId)) {
          await conversationManager.conversationManager.clearSession(actualUserId);
        }
      }
    } catch (error) {
      console.log('Conversation manager not available or error clearing:', error);
    }
    
    // Cancel all AI wellness notifications
    try {
      const Notifications = await import('expo-notifications');
      const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
      const aiNotificationIds = scheduledNotifications
        .filter(notif => 
          (typeof notif.content.data?.type === 'string' && notif.content.data.type.includes('ai_wellness')) ||
          notif.identifier.includes('ai_wellness')
        )
        .map(notif => notif.identifier);
      
      for (const id of aiNotificationIds) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
      console.log(`Cancelled ${aiNotificationIds.length} AI wellness notifications`);
    } catch (error) {
      console.log('Error cancelling AI notifications:', error);
    }
    
    console.log('Simulation data reset, AI data cleared, and custom reminder messages cleared');
    
    return true;
  } catch (e) {
    console.error('Error resetting simulation data:', e);
    return false;
  }
};

/**
 * Aggressively clear all premium status from any possible location
 * @returns Whether the premium status was successfully cleared
 */
export const clearAllPremiumStatus = async (): Promise<boolean> => {
  if (!developmentBuild()) return false;
  await AsyncStorage.removeItem(ENTITLEMENT_KEY);
  // Define all possible premium-related keys that might exist
  const premiumKeys = [
    KEYS.USER.PREMIUM,
    KEYS.USER.TESTING_PREMIUM,
    '@flexbreak:testing_premium_access',
    '@user_premium',
    '@premium',
    '@isPremium',
    '@premium_access',
    'premium_status',
    'isPremium',
    'premium_access',
    'premiumAccess',
    'premium_unlocked',
    'premium_user'
  ];
  
  try {
    // First get current status for debugging
    for (const key of premiumKeys) {
      const value = await AsyncStorage.getItem(key);
    }
    
    // Different removal techniques
    
    // Method 1: Direct removal
    for (const key of premiumKeys) {
      await AsyncStorage.removeItem(key);
    }
    
    // Method 2: Set to false then remove
    for (const key of premiumKeys) {
      await AsyncStorage.setItem(key, 'false');
      await AsyncStorage.removeItem(key);
    }
    
    // Method 3: Use multiRemove
    await AsyncStorage.multiRemove(premiumKeys);
    
    // Verification after all methods
    let stillExists = false;
    for (const key of premiumKeys) {
      const value = await AsyncStorage.getItem(key);
      if (value !== null && value !== '') {
        stillExists = true;
      }
    }
    
    if (stillExists) {
      return false;
    } else {
      return true;
    }
  } catch (error) {
    return false;
  }
};

// ========== SUBSCRIPTION MANAGEMENT ==========

/**
 * Save subscription details to storage
 * @param details Subscription details object
 * @returns Success boolean
 */
export const saveSubscriptionDetails = (details: StoredSubscriptionDetails): Promise<boolean> => serializeEntitlement(async () => {
  if (details.verificationSource !== 'server' || !details.productId || !details.purchaseToken ||
      !['ios', 'android'].includes(details.platform) || typeof details.isActive !== 'boolean' ||
      !Number.isFinite(Date.parse(details.purchaseDate)) || !details.expiryDate ||
      !Number.isFinite(Date.parse(details.expiryDate)) || (details.isActive && !isFuture(details.expiryDate))) {
    throw new Error('Subscription must have a verified store status and expiry');
  }
  const record = await readEntitlement();
  if (!details.isActive && record.paid?.active && record.paid.details?.productId && record.paid.details.productId !== details.productId) {
    throw new Error('Inactive subscription does not match the active subscription');
  }
  record.paid = { source: 'paid', active: details.isActive, details };
  // This record is the authority. Do not acknowledge a purchase if it fails.
  await AsyncStorage.setItem(ENTITLEMENT_KEY, JSON.stringify(record));
  await AsyncStorage.setItem(KEYS.USER.SUBSCRIPTION_DETAILS, JSON.stringify(details));
  return true;
});
export const getSubscriptionDetails = async (): Promise<StoredSubscriptionDetails | null> =>
  (await getEntitlementSnapshot()).subscriptionDetails;

// Local cancellation does not end paid-through access. Actual expiry/revocation
// arrives via verified store reconciliation, not this legacy boolean API.
export const clearSubscriptionDetails = async (): Promise<boolean> => {
  if (!developmentBuild()) return false;
  await clearVerifiedPaidEntitlement();
  return true;
};
