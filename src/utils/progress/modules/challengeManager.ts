import { UserProgress, Challenge, CHALLENGE_STATUS } from '../types';
import * as storageService from '../../../services/storageService';
import { CORE_CHALLENGES, REDEMPTION_PERIODS, CHALLENGE_LIMITS, DAILY_LIMITS } from '../constants';
import { ChallengeFactory } from '../factories/challengeFactory';
import * as dateUtils from './utils/dateUtils';
import * as cacheUtils from './utils/cacheUtils';
import * as rewardManager from './rewardManager';
import * as levelManager from './levelManager';

// Track recent challenges to avoid repetition
let recentChallenges: Record<string, string[]> = { daily: [], weekly: [] };

// Helper to track used challenges to avoid repetition
const trackUsedChallenge = (challengeId: string, category: string) => {
  recentChallenges[category] = recentChallenges[category] || [];
  recentChallenges[category].push(challengeId);
  const maxHistory = category === 'daily' ? 3 : 2;
  if (recentChallenges[category].length > maxHistory) {
    recentChallenges[category] = recentChallenges[category].slice(-maxHistory);
  }
};

// Helper to check if routines have been done for time-specific challenges
const checkTimeSpecificRoutines = (
  allRoutines: any[],
  timeRange: { start: number; end: number } = { start: 0, end: 24 },
  dayOffset: number = 0
): number => {
  const now = new Date();
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + dayOffset);
  const targetDateString = dateUtils.toDateString(targetDate);
  
  const matchingRoutines = allRoutines.filter(routine => {
    const routineDate = new Date(routine.date);
    const routineDateString = dateUtils.toDateString(routineDate);
    const routineHour = routineDate.getHours();
    
    return routineDateString === targetDateString && 
           routineHour >= timeRange.start && 
           routineHour < timeRange.end;
  });
  
  return matchingRoutines.length;
};

/**
 * Update challenge statuses based on their current state
 */
export const updateChallengeStatus = (challenge: Challenge): Challenge => {
  // Skip challenges that already have a final status
  if (challenge.status === CHALLENGE_STATUS.CLAIMED || 
      challenge.status === CHALLENGE_STATUS.EXPIRED) {
    return challenge;
  }
  
  const now = new Date();
  
  // Update status based on completion and claim state
  if (challenge.completed) {
    if (challenge.claimed) {
      challenge.status = CHALLENGE_STATUS.CLAIMED;
    } else {
      challenge.status = CHALLENGE_STATUS.COMPLETED;
      
      // Check if challenge is about to expire
      if (challenge.dateCompleted) {
        const completedDate = new Date(challenge.dateCompleted);
        const redemptionMs = REDEMPTION_PERIODS[challenge.category as keyof typeof REDEMPTION_PERIODS] * 60 * 60 * 1000;
        const expiryTime = completedDate.getTime() + redemptionMs;
        
        // Add exact expiry date for UI display
        challenge.expiryDate = new Date(expiryTime).toISOString();
        
        // Set warning flag if less than 25% of redemption time remains
        const timeUntilExpiry = expiryTime - now.getTime();
        challenge.expiryWarning = timeUntilExpiry < (redemptionMs * 0.25);
      }
    }
  } else {
    challenge.status = CHALLENGE_STATUS.ACTIVE;
    
    // Check if challenge is about to expire
    const endDate = new Date(challenge.endDate);
    const timeUntilEnd = endDate.getTime() - now.getTime();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    // Set warning flag if less than 1 day remains for daily challenges
    // or less than 2 days for others
    const warningThreshold = challenge.category === 'daily' ? dayInMs : dayInMs * 2;
    challenge.expiryWarning = timeUntilEnd < warningThreshold;
  }
  
  return challenge;
};

/**
 * Update challenges based on user progress data
 */
export const updateChallengeProgress = async (userProgress: UserProgress, challenge: Challenge): Promise<Challenge> => {
  // Skip already completed or claimed challenges
  if (challenge.completed || 
      challenge.claimed || 
      challenge.status === CHALLENGE_STATUS.EXPIRED) {
    return challenge;
  }
  
  const stats = userProgress.statistics;
  const allRoutines = await cacheUtils.getCachedRoutines(true); // Force refresh routines
  
  // Log for debugging
  console.log(`Updating challenge: ${challenge.title} (${challenge.type}), current progress: ${challenge.progress}/${challenge.requirement}`);
  
  // Handle challenge based on its type and specific ID
  try {
    // Update progress based on challenge type - with special case handling
    switch (challenge.type) {
      case 'routine_count':
        // Handle special named challenges with specific conditions
        if (challenge.id.includes('morning_flexibility')) {
          // Morning routines (before noon)
          challenge.progress = checkTimeSpecificRoutines(allRoutines, { start: 0, end: 12 });
          console.log(`Morning flexibility challenge: ${challenge.progress}/${challenge.requirement} routines completed before noon`);
        } 
        else if (challenge.id.includes('evening_routine')) {
          // Evening routines (after 6pm)
          challenge.progress = checkTimeSpecificRoutines(allRoutines, { start: 18, end: 24 });
          console.log(`Evening routine challenge: ${challenge.progress}/${challenge.requirement} routines completed after 6pm`);
        }
        else if (challenge.id.includes('night_owl')) {
          // Night owl routines (after 9pm)
          challenge.progress = checkTimeSpecificRoutines(allRoutines, { start: 21, end: 24 });
        }
        else if (challenge.id.includes('afternoon_') || challenge.id.includes('lunch_')) {
          // Afternoon routines (12pm-6pm)
          challenge.progress = checkTimeSpecificRoutines(allRoutines, { start: 12, end: 18 });
        }
        else if (challenge.id.includes('daily_stretch') || challenge.id.includes('daily_routine')) {
          // Daily stretch challenge - count today's routines only
          const todayRoutines = allRoutines.filter(routine => dateUtils.isToday(routine.date));
          challenge.progress = todayRoutines.length;
          console.log(`Daily stretch challenge: ${challenge.progress}/${challenge.requirement} routines completed today`);
        }
        else if (challenge.id.includes('monthly_dedication')) {
          // Monthly dedication - count this month's routines only
          const now = new Date();
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          
          // Filter routines from this month only
          const thisMonthRoutines = allRoutines.filter(routine => {
            const routineDate = new Date(routine.date);
            return routineDate >= firstDayOfMonth && routineDate <= now;
          });
          
          challenge.progress = thisMonthRoutines.length;
          console.log(`Monthly dedication challenge: ${challenge.progress}/${challenge.requirement} routines this month`);
        }
        else if (challenge.id.includes('weekly_routines')) {
          // Weekly dedication - count this week's routines only
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Set to Sunday
          weekStart.setHours(0, 0, 0, 0);
          
          // Filter routines from this week only
          const thisWeekRoutines = allRoutines.filter(routine => {
            const routineDate = new Date(routine.date);
            return routineDate >= weekStart && routineDate <= new Date();
          });
          
          challenge.progress = thisWeekRoutines.length;
          console.log(`Weekly routines challenge: ${challenge.progress}/${challenge.requirement} routines this week`);
        }
        else {
          // Default routine count challenge - use total routines count
          challenge.progress = stats.totalRoutines || 0;
        }
        break;
        
      case 'daily_minutes':
        // Basic total minutes challenge
        challenge.progress = stats.totalMinutes || 0;
        
        // For challenges that check mins today only
        if (challenge.id.includes('today_') || challenge.id.includes('daily_mins')) {
          // Get routines from today and sum their durations
          const todayRoutines = allRoutines.filter(routine => dateUtils.isToday(routine.date));
          
          const todayMinutes = todayRoutines.reduce((sum, routine) => {
            return sum + parseInt(routine.duration, 10);
          }, 0);
          
          challenge.progress = todayMinutes;
          console.log(`Today's minutes challenge: ${challenge.progress}/${challenge.requirement} minutes today`);
        }
        break;
      
      case 'total_minutes':
        // Track total minutes for all time or month based challenges
        challenge.progress = stats.totalMinutes || 0;
        
        // If it's a monthly challenge like "stretch_master", only count this month's minutes
        if (challenge.id.includes('monthly_minutes') || challenge.id.includes('stretch_master')) {
          const now = new Date();
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          
          // Filter routines from this month only
          const thisMonthRoutines = allRoutines.filter(routine => {
            const routineDate = new Date(routine.date);
            return routineDate >= firstDayOfMonth && routineDate <= now;
          });
          
          // Sum minutes from this month
          const thisMonthMinutes = thisMonthRoutines.reduce((sum, routine) => {
            return sum + parseInt(routine.duration, 10);
          }, 0);
          
          challenge.progress = thisMonthMinutes;
          console.log(`Stretch Master monthly challenge: ${challenge.progress}/${challenge.requirement} minutes this month`);
        }
        break;
        
      case 'streak':
        // Use the current streak from statistics, ensuring it's a number
        challenge.progress = Number(stats.currentStreak) || 0;
        console.log(`Streak challenge: ${challenge.progress}/${challenge.requirement}`);
        break;
        
      case 'weekly_consistency':
      case 'unique_days':
        // Count unique days in the current week with routines
        try {
          // Get the start of the current week (Sunday)
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Set to Sunday
          weekStart.setHours(0, 0, 0, 0);
          
          // Get unique dates this week with routines
          const uniqueDaysThisWeek = new Set();
          allRoutines.forEach(routine => {
            const routineDate = new Date(routine.date);
            // Check if routine is from this week
            if (routineDate >= weekStart && routineDate <= new Date()) {
              const dayString = routineDate.toISOString().split('T')[0];
              uniqueDaysThisWeek.add(dayString);
            }
          });
          
          challenge.progress = uniqueDaysThisWeek.size;
          console.log(`Weekly consistency challenge progress: ${challenge.progress}/${challenge.requirement} days`);
        } catch (error) {
          console.error('Error calculating weekly consistency:', error);
          // Fall back to current streak as a proxy if calculation fails
          challenge.progress = Math.min(7, stats.currentStreak || 0);
        }
        break;
        
      case 'area_variety':
        // Default: Use all unique areas
        if (challenge.id.includes('monthly_variety')) {
          // For monthly challenges, filter routines from this month
          const now = new Date();
          const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          
          // Filter routines from this month only
          const thisMonthRoutines = allRoutines.filter(routine => {
            const routineDate = new Date(routine.date);
            return routineDate >= firstDayOfMonth && routineDate <= now;
          });
          
          // Count unique areas from this month's routines
          const uniqueAreasThisMonth = new Set();
          thisMonthRoutines.forEach(routine => {
            uniqueAreasThisMonth.add(routine.area);
          });
          
          challenge.progress = uniqueAreasThisMonth.size;
          console.log(`Monthly variety challenge: ${challenge.progress}/${challenge.requirement} unique areas this month`);
        } else if (challenge.id.includes('weekly_variety') || challenge.id.includes('weekly_explorer')) {
          // For weekly challenges, filter routines from this week
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Set to Sunday
          weekStart.setHours(0, 0, 0, 0);
          
          // Filter routines from this week only
          const thisWeekRoutines = allRoutines.filter(routine => {
            const routineDate = new Date(routine.date);
            return routineDate >= weekStart && routineDate <= new Date();
          });
          
          // Count unique areas from this week's routines
          const uniqueAreasThisWeek = new Set();
          thisWeekRoutines.forEach(routine => {
            uniqueAreasThisWeek.add(routine.area);
          });
          
          challenge.progress = uniqueAreasThisWeek.size;
          console.log(`Weekly variety challenge: ${challenge.progress}/${challenge.requirement} unique areas this week`);
        } else {
          // Default for other area variety challenges - use all areas from user statistics
          challenge.progress = stats.uniqueAreas?.length || 0;
          console.log(`Area variety challenge: ${challenge.progress}/${challenge.requirement} unique areas`);
        }
        break;
        
      case 'specific_area':
        // Check for routines targeting a specific area
        const specificArea = challenge.requirementData?.area;
        if (specificArea && stats.routinesByArea) {
          challenge.progress = stats.routinesByArea[specificArea] || 0;
          console.log(`Specific area challenge '${specificArea}': ${challenge.progress}/${challenge.requirement} routines`);
        } else {
          // Without a specific area defined, use highest area count as default
          if (stats.routinesByArea && Object.keys(stats.routinesByArea).length > 0) {
            challenge.progress = Math.max(...Object.values(stats.routinesByArea));
          }
        }
        break;
        
      default:
        // For any unhandled challenge types, log a warning
        console.warn(`Unknown challenge type: ${challenge.type} for challenge ${challenge.id}`);
        break;
    }
    
    // Make sure progress is a valid number
    challenge.progress = Number(challenge.progress) || 0;
    
  } catch (error) {
    console.error(`Error updating challenge ${challenge.id}:`, error);
  }
  
  // Check if challenge is now completed
  if (challenge.progress >= challenge.requirement && !challenge.completed) {
    challenge.completed = true;
    challenge.dateCompleted = new Date().toISOString();
    challenge.status = CHALLENGE_STATUS.COMPLETED;
    console.log(`Challenge completed: ${challenge.title} (${challenge.progress}/${challenge.requirement})`);
  }
  
  return challenge;
};

/**
 * Expire challenges that have passed their end date
 * @param userProgress The user progress object to update
 * @returns The number of challenges that were expired
 */
export const expireChallenges = async (userProgress: UserProgress): Promise<number> => {
  const now = new Date();
  let expiredCount = 0;
  
  // Process all challenges to check for expired ones
  Object.values(userProgress.challenges).forEach(challenge => {
    // Skip already expired challenges
    if (challenge.status === CHALLENGE_STATUS.EXPIRED) {
      return;
    }
    
    const endDate = new Date(challenge.endDate);
    
    // Completed challenges with claim period expired
    if (challenge.completed && !challenge.claimed) {
      const completedDate = challenge.dateCompleted ? new Date(challenge.dateCompleted) : now;
      const redemptionMs = REDEMPTION_PERIODS[challenge.category as keyof typeof REDEMPTION_PERIODS] * 60 * 60 * 1000;
      
      if (now.getTime() - completedDate.getTime() > redemptionMs) {
        console.log(`Challenge expired (claim period): ${challenge.title}`);
        challenge.status = CHALLENGE_STATUS.EXPIRED;
        expiredCount++;
      }
    }
    // Challenges past end date - only expire challenges that haven't been completed
    else if (!challenge.completed && endDate < now) {
      console.log(`Challenge expired (end date): ${challenge.title}`);
      challenge.status = CHALLENGE_STATUS.EXPIRED;
      expiredCount++;
    }
  });
  
  if (expiredCount > 0) {
    console.log(`Expired ${expiredCount} challenges`);
    await storageService.saveUserProgress(userProgress);
  }
  
  return expiredCount;
};

/**
 * Get active challenge IDs that may need to be reset based on cycling
 */
export const getChallengeIdsToReset = (
  userProgress: UserProgress,
  category: string,
  forceReset: boolean = false
): string[] => {
  // Get all challenge IDs for the specified category
  return Object.keys(userProgress.challenges).filter(id => {
    const challenge = userProgress.challenges[id];
    
    // Only consider challenges in the specified category
    if (challenge.category !== category) {
      return false;
    }
    
    // Don't reset challenges that have been completed but not claimed yet
    // This gives users time to claim their rewards
    if (challenge.completed && !challenge.claimed) {
      return false;
    }
    
    // If forcing reset, include all challenges in this category that aren't pending claim
    if (forceReset) {
      return true;
    }
    
    // Otherwise, only include expired challenges
    return challenge.status === CHALLENGE_STATUS.EXPIRED;
  });
};

/**
 * Ensure we have the right number of active challenges for each category
 * Respects cycle periods and will not add new challenges until the current cycle ends
 */
export const ensureChallengeCount = async (
  userProgress: UserProgress,
  challengeData: Record<string, any[]>
): Promise<number> => {
  const now = new Date();
  const today = dateUtils.today();
  let addedCount = 0;
  
  // Get the last check date to determine if cycles have ended
  const lastCheck = userProgress.lastDailyChallengeCheck || '1970-01-01';
  const lastCheckDate = lastCheck.split('T')[0];
  
  // Determine which categories are eligible for new challenges based on cycle resets
  const cycleEnded = {
    daily: today !== lastCheckDate, // Daily cycle ends at midnight
    weekly: dateUtils.shouldResetWeekly(lastCheck), // Weekly cycle ends on Sunday
    monthly: dateUtils.shouldResetMonthly(lastCheck), // Monthly cycle ends at month boundary
    special: false // Special challenges don't auto-reset (they're manually managed)
  };
  
  // Process each challenge category
  for (const category of Object.keys(CHALLENGE_LIMITS)) {
    // Skip if no challenge data exists for this category
    if (!challengeData[category] || !challengeData[category].length) {
      console.log(`No challenge data available for ${category} category`);
      continue;
    }
    
    // Determine if we should add challenges for this category based on cycle reset
    const hasCycleEnded = cycleEnded[category as keyof typeof cycleEnded] || false;
    
    // Count both active and completed-but-not-claimed challenges in this category
    const activeCount = Object.values(userProgress.challenges).filter(c => 
      c.category === category && 
      c.status !== CHALLENGE_STATUS.EXPIRED &&
      c.status !== CHALLENGE_STATUS.CLAIMED &&
      !c.completed
    ).length;
    
    const completedCount = Object.values(userProgress.challenges).filter(c => 
      c.category === category && 
      c.status !== CHALLENGE_STATUS.EXPIRED &&
      c.status !== CHALLENGE_STATUS.CLAIMED &&
      c.completed
    ).length;
    
    // Get total count of ongoing challenges (active + completed but not claimed)
    const totalOngoingCount = activeCount + completedCount;
    
    // Calculate how many new challenges we need, accounting for both active and completed
    const targetCount = CHALLENGE_LIMITS[category as keyof typeof CHALLENGE_LIMITS];
    
    // CRITICAL FIX: We should ONLY add new challenges if:
    // 1. The cycle has ended AND we don't have enough challenges, OR
    // 2. This is the first time initializing (no challenges at all)
    // We should NOT add new challenges just because a user claimed some
    let neededCount = 0;
    const initializing = Object.values(userProgress.challenges).filter(c => c.category === category).length === 0;
    
    if (hasCycleEnded) {
      // Cycle has ended, so we can add new challenges up to the target count
      neededCount = Math.max(0, targetCount - totalOngoingCount);
      console.log(`${category} cycle has ended, need ${neededCount} new challenges to reach target ${targetCount}`);
    } else if (initializing) {
      // No challenges at all for this category - initial app state
      neededCount = targetCount;
      console.log(`Initializing ${category} challenges for the first time, need ${neededCount}`);
    } else {
      // Cycle hasn't ended, don't add new challenges regardless of how many were claimed
      neededCount = 0;
      console.log(`${category} cycle hasn't ended yet, not adding new challenges even if some were claimed`);
    }
    
    // Get category-specific message
    const cycleInfo = category === 'daily' ? 'today' : 
                      category === 'weekly' ? 'this week' :
                      category === 'monthly' ? 'this month' : 'for this period';
    
    if (neededCount <= 0) {
      console.log(`No new ${category} challenges needed (${activeCount} active + ${completedCount} completed = ${totalOngoingCount}/${targetCount} ${cycleInfo})`);
      
      // Even if we don't need new challenges, we should invalidate the cache for this category
      // to ensure any UI updates reflect the latest state
      cacheUtils.invalidateChallengeCache(category);
      
      continue;
    }
    
    console.log(`Adding ${neededCount} new ${category} challenges (${activeCount} active + ${completedCount} completed = ${totalOngoingCount}/${targetCount} ${cycleInfo})`);
    
    // Get available challenges (filter out ones we've used recently)
    let availableChallenges = challengeData[category].filter(c => 
      !recentChallenges[category]?.includes(c.id)
    );
    
    // Fall back to all challenges if we're running low on options
    if (availableChallenges.length < neededCount) {
      console.log(`Not enough unique challenges available, using full set`);
      availableChallenges = challengeData[category];
      // Clear recent history in this case to avoid getting stuck
      recentChallenges[category] = [];
    }
    
    // Randomize selection
    availableChallenges.sort(() => Math.random() - 0.5);
    
    // Add new challenges up to the needed count
    for (let i = 0; i < neededCount && i < availableChallenges.length; i++) {
      const challengeTemplate = availableChallenges[i];
      
      // Generate a new challenge from template
      const challenge = ChallengeFactory.createFromTemplate(challengeTemplate, category);
      
      // Track to avoid repetition
      trackUsedChallenge(challengeTemplate.id, category);
      
      // Add to user progress
      userProgress.challenges[challenge.id] = challenge;
      addedCount++;
      
      console.log(`Added new ${category} challenge: ${challenge.title}`);
    }
    
    // Invalidate the cache for this category since we've added new challenges
    cacheUtils.invalidateChallengeCache(category);
  }
  
  if (addedCount > 0) {
    // Update last check time if any challenges were added
    userProgress.lastDailyChallengeCheck = now.toISOString();
    await storageService.saveUserProgress(userProgress);
  }
  
  return addedCount;
};

/**
 * Refresh challenges based on time periods and user progress
 */
export const refreshChallenges = async (userProgress: UserProgress): Promise<void> => {
  const now = new Date();
  const today = dateUtils.today();
  const lastCheck = userProgress.lastDailyChallengeCheck || '1970-01-01';
  const lastCheckDate = lastCheck.split('T')[0];
  
  console.log(`Refreshing challenges - last check: ${lastCheckDate}, today: ${today}`);

  // First, make sure all expired challenges are properly marked
  const expiredCount = await expireChallenges(userProgress);
  if (expiredCount > 0) {
    console.log(`Marked ${expiredCount} challenges as expired`);
  }
  
  // Count challenges by category and status to determine what to do next
  const challengeCounts = getChallengeCountsByStatus(userProgress);
  
  // Log current state
  console.log('Current challenge counts:', 
    Object.entries(challengeCounts.byCategory).map(([cat, counts]) => 
      `${cat}: ${counts.active} active, ${counts.completed} completed, ${counts.claimed} claimed`
    ).join(', ')
  );
  
  // Determine if cycles have ended and require reset
  const resetDaily = today !== lastCheckDate;
  const resetWeekly = dateUtils.shouldResetWeekly(lastCheck);
  const resetMonthly = dateUtils.shouldResetMonthly(lastCheck);
  
  console.log(`Cycle reset checks - Daily: ${resetDaily}, Weekly: ${resetWeekly}, Monthly: ${resetMonthly}`);
  
  let madeChanges = false;
  
  // Handle daily challenge reset
  if (resetDaily) {
    console.log('New day detected, checking daily challenges');
    
    // If we have no active challenges (all completed/claimed or expired), reset them
    const noActiveDaily = challengeCounts.byCategory.daily.active === 0;
    const allClaimed = challengeCounts.byCategory.daily.completed === 0 && 
                       challengeCounts.byCategory.daily.active === 0;
    
    if (noActiveDaily || allClaimed) {
      console.log('Resetting daily challenges - no active challenges or all are claimed');
      
      // Remove old daily challenges that are not pending claim (completed but not claimed)
      const dailyIds = Object.keys(userProgress.challenges).filter(id => {
        const challenge = userProgress.challenges[id];
        return challenge.category === 'daily' && 
               (challenge.status === CHALLENGE_STATUS.EXPIRED || 
                challenge.status === CHALLENGE_STATUS.CLAIMED || 
                !challenge.completed);
      });
      
      // Remove the challenges
      dailyIds.forEach(id => {
        delete userProgress.challenges[id];
      });
      
      console.log(`Removed ${dailyIds.length} old daily challenges`);
      
      // Invalidate daily challenge cache
      cacheUtils.invalidateChallengeCache('daily');
      madeChanges = true;
    }
  }
  
  // Handle weekly challenge reset
  if (resetWeekly) {
    console.log('New week detected, checking weekly challenges');
    
    // If we have no active challenges (all completed/claimed or expired), reset them
    const noActiveWeekly = challengeCounts.byCategory.weekly.active === 0;
    const allClaimed = challengeCounts.byCategory.weekly.completed === 0 && 
                       challengeCounts.byCategory.weekly.active === 0;
    
    if (noActiveWeekly || allClaimed) {
      console.log('Resetting weekly challenges - no active challenges or all are claimed');
      
      // Remove old weekly challenges that are not pending claim (completed but not claimed)
      const weeklyIds = Object.keys(userProgress.challenges).filter(id => {
        const challenge = userProgress.challenges[id];
        return challenge.category === 'weekly' && 
               (challenge.status === CHALLENGE_STATUS.EXPIRED || 
                challenge.status === CHALLENGE_STATUS.CLAIMED || 
                !challenge.completed);
      });
      
      // Remove the challenges
      weeklyIds.forEach(id => {
        delete userProgress.challenges[id];
      });
      
      console.log(`Removed ${weeklyIds.length} old weekly challenges`);
      
      // Invalidate weekly challenge cache
      cacheUtils.invalidateChallengeCache('weekly');
      madeChanges = true;
    }
  }
  
  // Handle monthly challenge reset
  if (resetMonthly) {
    console.log('New month detected, checking monthly challenges');
    
    // If we have no active challenges (all completed/claimed or expired), reset them
    const noActiveMonthly = challengeCounts.byCategory.monthly.active === 0;
    const allClaimed = challengeCounts.byCategory.monthly.completed === 0 && 
                       challengeCounts.byCategory.monthly.active === 0;
    
    if (noActiveMonthly || allClaimed) {
      console.log('Resetting monthly challenges - no active challenges or all are claimed');
      
      // Remove old monthly challenges that are not pending claim (completed but not claimed)
      const monthlyIds = Object.keys(userProgress.challenges).filter(id => {
        const challenge = userProgress.challenges[id];
        return challenge.category === 'monthly' && 
               (challenge.status === CHALLENGE_STATUS.EXPIRED || 
                challenge.status === CHALLENGE_STATUS.CLAIMED || 
                !challenge.completed);
      });
      
      // Remove the challenges
      monthlyIds.forEach(id => {
        delete userProgress.challenges[id];
      });
      
      console.log(`Removed ${monthlyIds.length} old monthly challenges`);
      
      // Invalidate monthly challenge cache
      cacheUtils.invalidateChallengeCache('monthly');
      madeChanges = true;
    }
  }
  
  // Update cycle check timestamp if any changes were made
  if (madeChanges) {
    userProgress.lastDailyChallengeCheck = now.toISOString();
    await storageService.saveUserProgress(userProgress);
  }
  
  // Even if no cycle reset, ensure we have the right number of challenges
  const addedChallenges = await ensureChallengeCount(userProgress, CORE_CHALLENGES);
  if (addedChallenges > 0) {
    console.log(`Added ${addedChallenges} new challenges during refresh`);
    
    // Save changes if we added challenges
    userProgress.lastDailyChallengeCheck = now.toISOString();
    await storageService.saveUserProgress(userProgress);
  }
};

/**
 * Get all active challenges grouped by category
 */
export const getActiveChallenges = async (): Promise<Record<string, Challenge[]>> => {
  // Default result object with empty arrays for each category
  const result: Record<string, Challenge[]> = {
    daily: [],
    weekly: [],
    monthly: [],
    special: []
  };
  
  // Check cache for each category
  for (const category of Object.keys(result)) {
    // Try to get from cache first
    const cachedData = cacheUtils.getCachedChallenges(category);
    
    if (cachedData !== null) {
      result[category] = cachedData;
    } else {
      // If not in cache, we'll need to get from storage
      const userProgress = await storageService.getUserProgress();
      
      // Filter active challenges by category
      const challenges = Object.values(userProgress.challenges || {})
        .filter(challenge => 
          challenge.category === category && 
          challenge.status === CHALLENGE_STATUS.ACTIVE
        );
      
      // Store in result
      result[category] = challenges;
      
      // Cache for future use
      cacheUtils.setCachedChallenges(category, challenges);
    }
  }
  
  return result;
};

/**
 * Get all claimable challenges (completed but not claimed)
 */
export const getClaimableChallenges = async (): Promise<Challenge[]> => {
  // Try to get from cache first
  const cachedData = cacheUtils.getCachedChallenges('claimable');
  
  if (cachedData !== null) {
    return cachedData;
  }
  
  // If not in cache, get from storage
  const userProgress = await storageService.getUserProgress();
  
  const claimableChallenges = Object.values(userProgress.challenges || {})
    .filter(challenge => challenge.completed && !challenge.claimed);
  
  // Cache for future use
  cacheUtils.setCachedChallenges('claimable', claimableChallenges);
  
  return claimableChallenges;
};

/**
 * Claim a completed challenge
 */
export const claimChallenge = async (challengeId: string): Promise<{ 
  success: boolean; 
  xpEarned: number;
  message?: string;
  levelUp: boolean;
  newLevel: number;
}> => {
  const userProgress = await storageService.getUserProgress();
  
  // Check if challenge exists
  if (!userProgress.challenges || !userProgress.challenges[challengeId]) {
    return {
      success: false,
      xpEarned: 0,
      message: "Challenge not found",
      levelUp: false,
      newLevel: userProgress.level
    };
  }
  
  const challenge = userProgress.challenges[challengeId];
  
  // Check if challenge is completed but not yet claimed
  if (!challenge.completed) {
    return {
      success: false,
      xpEarned: 0,
      message: "Challenge is not completed",
      levelUp: false,
      newLevel: userProgress.level
    };
  }
  
  if (challenge.claimed) {
    return {
      success: false,
      xpEarned: 0,
      message: "Challenge already claimed",
      levelUp: false,
      newLevel: userProgress.level
    };
  }
  
  // Check if challenge has expired for claiming
  const now = new Date();
  let xpReduction = false;
  let xpEarned = challenge.xp;
  
  // If challenge has an expiry date, check it
  if (challenge.expiryDate) {
    const expiryDate = new Date(challenge.expiryDate);
    
    if (now > expiryDate) {
      // Challenge has expired, reduce XP by 50%
      xpEarned = Math.floor(challenge.xp * 0.5);
      xpReduction = true;
      console.log(`Challenge expired! Reducing XP reward by 50%: ${challenge.xp} -> ${xpEarned}`);
    }
  }
  
  // Mark challenge as claimed
  challenge.claimed = true;
  challenge.dateClaimed = now.toISOString();
  challenge.status = CHALLENGE_STATUS.CLAIMED;
  
  // Update history if available
  if (!challenge.history) {
    challenge.history = [];
  }
  
  challenge.history.push({
    completedDate: challenge.dateCompleted || now.toISOString(),
    claimedDate: now.toISOString(),
    xpEarned: xpEarned
  });
  
  // Invalidate caches for this category and claimable
  cacheUtils.invalidateChallengeCache(challenge.category);
  cacheUtils.invalidateChallengeCache('claimable');
  
  // Add XP to user
  const oldLevel = userProgress.level;
  const { newXp, newLevel, levelUp } = await levelManager.addXp(userProgress, xpEarned, `challenge:${challengeId}`);
  
  // IMPORTANT: Save user progress with the claimed challenge. Do NOT generate new challenges here
  // New challenges should only be generated when the cycle ends
  await storageService.saveUserProgress(userProgress);
  
  return {
    success: true,
    xpEarned,
    message: xpReduction ? "Challenge claimed with reduced XP (expired)" : "Challenge claimed successfully",
    levelUp,
    newLevel
  };
};

/**
 * Efficiently batch process challenge updates to avoid redundant status checks
 */
export const batchUpdateChallenges = async (
  userProgress: UserProgress, 
  forceStatusUpdate: boolean = false
): Promise<{ updatedCount: number; completedChallenges: Challenge[] }> => {
  let updatedCount = 0;
  const completedChallenges: Challenge[] = [];
  const allRoutines = await cacheUtils.getCachedRoutines(true); // Force refresh routines cache

  console.log(`Processing ${Object.keys(userProgress.challenges).length} challenges in batch update`);
  
  // Process all challenges in a single pass
  for (const id of Object.keys(userProgress.challenges)) {
    const challenge = userProgress.challenges[id];
    
    // Skip already claimed or expired challenges
    if (challenge.claimed || challenge.status === CHALLENGE_STATUS.EXPIRED) {
      continue;
    }
    
    try {
      // Only update progress for incomplete challenges
      if (!challenge.completed) {
        const beforeProgress = challenge.progress;
        const beforeCompleted = challenge.completed;
        
        // Update the challenge progress
        const updatedChallenge = await updateChallengeProgress(userProgress, challenge);
        userProgress.challenges[id] = updatedChallenge;
        
        // Check if progress changed or challenge was completed
        if (beforeProgress !== updatedChallenge.progress) {
          console.log(`Challenge ${updatedChallenge.title} progress updated: ${beforeProgress} -> ${updatedChallenge.progress}/${updatedChallenge.requirement}`);
          updatedCount++;
        }
        
        // If the challenge was just completed, add it to the list
        if (!beforeCompleted && updatedChallenge.completed) {
          console.log(`Challenge ${updatedChallenge.title} was just completed!`);
          completedChallenges.push(updatedChallenge);
        }
      }
      
      // Always update status for consistent UI
      userProgress.challenges[id] = updateChallengeStatus(userProgress.challenges[id]);
    } catch (error) {
      console.error(`Error updating challenge ${id}:`, error);
    }
  }
  
  if (updatedCount > 0) {
    console.log(`Updated ${updatedCount} challenges during batch update, ${completedChallenges.length} newly completed`);
  }
  
  return { updatedCount, completedChallenges };
};

/**
 * Update user challenges - combines refresh and batch update
 * This is the main function to call when processing a completed routine
 */
export const updateUserChallenges = async (userProgress: UserProgress): Promise<Challenge[]> => {
  console.log('Updating user challenges after routine completion');
  let completedChallenges: Challenge[] = [];
  
  try {
    // First make sure we have the latest user progress
    const latestProgress = await storageService.getUserProgress();
    
    // Merge statistics to ensure we have the latest data
    userProgress.statistics = {
      ...latestProgress.statistics,
      ...userProgress.statistics
    };
    
    // First expire any challenges that are past their end date
    await expireChallenges(userProgress);
    
    // Then batch update all challenge progress and statuses
    const { updatedCount, completedChallenges: newlyCompletedChallenges } = 
      await batchUpdateChallenges(userProgress, true);
    
    // Keep track of newly completed challenges
    completedChallenges = newlyCompletedChallenges;
    
    // Save progress after updating challenges
    if (updatedCount > 0 || completedChallenges.length > 0) {
      console.log(`Saving user progress after updating ${updatedCount} challenges`);
      await storageService.saveUserProgress(userProgress);
    }
    
    // Finally, ensure we have the right number of challenges for each category
    await ensureChallengeCount(userProgress, CORE_CHALLENGES);
    
    // Invalidate all challenge caches to make sure UI reflects latest state
    cacheUtils.invalidateChallengeCache();
    
    // Log final state of challenges
    const challengeCounts = getChallengeCountsByStatus(userProgress);
    console.log('Challenge counts after update:', 
      Object.entries(challengeCounts.byCategory).map(([cat, counts]) => 
        `${cat}: ${counts.active} active, ${counts.completed} completed, ${counts.claimed} claimed`
      ).join(', ')
    );
    
    // Return the list of completed challenges for notification purposes
    return completedChallenges;
  } catch (error) {
    console.error('Error in updateUserChallenges:', error);
    return [];
  }
};

/**
 * Helper function to get counts of challenges by status and category
 */
const getChallengeCountsByStatus = (userProgress: UserProgress) => {
  const result = {
    total: 0,
    active: 0,
    completed: 0,
    claimed: 0,
    expired: 0,
    byCategory: {
      daily: { active: 0, completed: 0, claimed: 0, expired: 0 },
      weekly: { active: 0, completed: 0, claimed: 0, expired: 0 },
      monthly: { active: 0, completed: 0, claimed: 0, expired: 0 },
      special: { active: 0, completed: 0, claimed: 0, expired: 0 }
    }
  };
  
  Object.values(userProgress.challenges).forEach(challenge => {
    const category = challenge.category as keyof typeof result.byCategory;
    result.total++;
    
    if (challenge.status === CHALLENGE_STATUS.ACTIVE) {
      result.active++;
      result.byCategory[category].active++;
    } else if (challenge.status === CHALLENGE_STATUS.COMPLETED) {
      result.completed++;
      result.byCategory[category].completed++;
    } else if (challenge.status === CHALLENGE_STATUS.CLAIMED) {
      result.claimed++;
      result.byCategory[category].claimed++;
    } else if (challenge.status === CHALLENGE_STATUS.EXPIRED) {
      result.expired++;
      result.byCategory[category].expired++;
    }
  });
  
  return result;
};
