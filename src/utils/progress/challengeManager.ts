import { Challenge, UserProgress, ChallengeClaimResult, ChallengeUpdateResult, CHALLENGE_STATUS } from './types';
import * as storageService from '../../services/storageService';
import * as xpManager from './xpManager';

// Constants
const CHALLENGE_DURATIONS = {
  daily: 24,     // 24 hours
  weekly: 168,   // 7 days
  monthly: 720,  // 30 days
  special: 336   // 14 days
} as const;

const REDEMPTION_PERIODS = {
  daily: 12,     // 12 hours to redeem after completion
  weekly: 72,    // 3 days to redeem after completion
  monthly: 168,  // 7 days to redeem after completion
  special: 168   // 7 days to redeem after completion
} as const;

const DAILY_LIMITS = {
  MAX_CHALLENGES: 3,
  MAX_XP: 150
} as const;

// Types
type ChallengeData = {
  area?: string;
  duration?: number;
  timeOfDay?: number;
  isWeekend?: boolean;
  isFirstOfDay?: boolean;
  routinesCompleted?: number;
  uniqueAreas?: string[];
  totalMinutes?: number;
};

type ChallengeHandler = (challenge: Challenge, data: ChallengeData) => {
  shouldUpdate: boolean;
  incrementAmount: number;
};

// Challenge Handlers Map
const challengeHandlers: Record<string, ChallengeHandler> = {
  streak: (challenge, data) => ({
    shouldUpdate: true,
    incrementAmount: data.routinesCompleted || 0
  }),
  
  routine_count: (challenge, data) => ({
    shouldUpdate: true,
    incrementAmount: 1
  }),
  
  total_minutes: (challenge, data) => ({
    shouldUpdate: !!data.duration,
    incrementAmount: data.duration || 0
  }),
  
  daily_minutes: (challenge, data) => ({
    shouldUpdate: !!data.duration,
    incrementAmount: data.duration || 0
  }),
  
  area_variety: (challenge, data) => {
    if (!data.area) return { shouldUpdate: false, incrementAmount: 0 };
    const uniqueAreas = new Set(data.uniqueAreas || []);
    const previousCount = uniqueAreas.size;
    uniqueAreas.add(data.area);
    return {
      shouldUpdate: uniqueAreas.size > previousCount,
      incrementAmount: uniqueAreas.size > previousCount ? 1 : 0
    };
  },
  
  specific_area: (challenge, data) => ({
    shouldUpdate: !!data.area && challenge.area === data.area,
    incrementAmount: 1
  }),
  
  time_of_day: (challenge, data) => {
    if (!data.timeOfDay || !challenge.timeRange) return { shouldUpdate: false, incrementAmount: 0 };
    return {
      shouldUpdate: data.timeOfDay >= challenge.timeRange.start && data.timeOfDay < challenge.timeRange.end,
      incrementAmount: 1
    };
  },
  
  weekend_days: (challenge, data) => ({
    shouldUpdate: !!data.isWeekend,
    incrementAmount: 1
  })
};

// Helper Functions
function updateProgress(challenge: Challenge, currentValue: number, requirement: number): boolean {
  const newProgress = Math.min(currentValue, requirement);
  if (newProgress !== challenge.progress) {
    challenge.progress = newProgress;
    challenge.completed = newProgress >= requirement;
    if (challenge.completed) {
      challenge.dateCompleted = new Date().toISOString();
    }
    return true;
  }
  return false;
}

function isWithinRedemptionPeriod(challenge: Challenge): boolean {
  const now = new Date();
  
  // Add debug logging
  console.log(`Checking redemption period for ${challenge.title}:
    Now: ${now.toISOString()}
    Challenge End Date: ${challenge.endDate}
    Challenge Completed: ${challenge.completed}
    Completion Date: ${challenge.dateCompleted}
    Challenge Type: ${challenge.type}
  `);
  
  // Special handling for streak challenges - they should always be claimable when completed
  if (challenge.type === 'streak' && challenge.completed) {
    console.log('Streak challenge is completed, allowing claim');
    return true;
  }
  
  // If the challenge isn't completed, check against the challenge duration
  if (!challenge.completed) {
    const endDate = new Date(challenge.endDate);
    const isWithin = now < endDate;
    console.log(`Challenge not completed, checking against end date:
      End Date: ${endDate.toISOString()}
      Is Within: ${isWithin}
    `);
    return isWithin;
  }
  
  // For completed challenges, check against the redemption period
  try {
    if (!challenge.dateCompleted) {
      console.log('Challenge marked as completed but no completion date found, using current time');
      challenge.dateCompleted = now.toISOString();
    }
    
    const completedDate = new Date(challenge.dateCompleted);
    const redemptionHours = REDEMPTION_PERIODS[challenge.category as keyof typeof REDEMPTION_PERIODS];
    const redemptionMs = redemptionHours * 60 * 60 * 1000;
    
    const timeElapsed = now.getTime() - completedDate.getTime();
    const hoursLeft = (redemptionMs - timeElapsed) / (1000 * 60 * 60);
    
    console.log(`Checking completed challenge redemption:
      Completed Date: ${completedDate.toISOString()}
      Redemption Hours: ${redemptionHours}
      Hours Left: ${hoursLeft.toFixed(1)}
      Is Within Period: ${timeElapsed <= redemptionMs}
      Challenge Type: ${challenge.type}
    `);
    
    // For streak challenges, be more lenient with redemption period
    if (challenge.type === 'streak') {
      // Double the redemption period for streak challenges
      return timeElapsed <= (redemptionMs * 2);
    }
    
    return timeElapsed <= redemptionMs;
  } catch (error) {
    console.error('Error checking redemption period:', error);
    // If there's an error with date handling, default to allowing the claim
    return true;
  }
}

async function getRoutinesCompletedToday(): Promise<number> {
  const routines = await storageService.getAllRoutines();
  const today = new Date().toISOString().split('T')[0];
  
  return routines.filter(routine => {
    const routineDate = new Date(routine.date).toISOString().split('T')[0];
    return routineDate === today;
  }).length;
}

async function canClaimDailyChallenge(
  challenge: Challenge,
  userProgress: UserProgress
): Promise<{ canClaim: boolean; message?: string }> {
  const today = new Date().toISOString().split('T')[0];
  
  // Check daily limits
  const dailyChallengesClaimed = userProgress.xpHistory?.filter(entry => 
    entry.source === 'challenge' && 
    entry.timestamp.includes(today)
  ).length || 0;
  
  if (dailyChallengesClaimed >= DAILY_LIMITS.MAX_CHALLENGES) {
    return { canClaim: false, message: 'Daily challenge limit reached (max 3 per day)' };
  }
  
  const dailyXpFromChallenges = userProgress.xpHistory?.filter(entry => 
    entry.source === 'challenge' && 
    entry.timestamp.includes(today)
  ).reduce((total, entry) => total + (entry.amount || 0), 0) || 0;
  
  if (dailyXpFromChallenges >= DAILY_LIMITS.MAX_XP) {
    return { canClaim: false, message: 'Daily challenge XP limit reached (max 150 XP per day)' };
  }
  
  // Check for similar challenge type already claimed
  const similarChallengesClaimedToday = userProgress.xpHistory?.filter(entry => 
    entry.source === 'challenge' && 
    entry.timestamp.includes(today) &&
    entry.details?.includes(`daily_${challenge.type}`)
  ).length || 0;
  
  if (similarChallengesClaimedToday > 0) {
    return { canClaim: false, message: `You've already claimed a similar daily challenge today` };
  }
  
  // Check for routines completed today for daily challenges
  if (challenge.category === 'daily') {
    const routinesCompletedToday = await getRoutinesCompletedToday();
    if (routinesCompletedToday === 0) {
      return { canClaim: false, message: 'Complete a stretching routine today to claim this challenge' };
    }
  }
  
  return { canClaim: true };
}

// Exported Functions
export async function getActiveChallenges(): Promise<{
  daily: Challenge[];
  weekly: Challenge[];
  monthly: Challenge[];
  special: Challenge[];
}> {
  const userProgress = await storageService.getUserProgress();
  const now = new Date();
  
  const allChallenges = Object.values(userProgress.challenges || {});
  const activeChallenges = allChallenges.filter(challenge => 
    new Date(challenge.endDate) > now
  );
  
  return {
    daily: activeChallenges.filter(c => c.category === 'daily'),
    weekly: activeChallenges.filter(c => c.category === 'weekly'),
    monthly: activeChallenges.filter(c => c.category === 'monthly'),
    special: activeChallenges.filter(c => c.category === 'special')
  };
}

export async function getClaimableChallenges(): Promise<Challenge[]> {
  const userProgress = await storageService.getUserProgress();
  const allChallenges = Object.values(userProgress.challenges || {});
  
  return allChallenges.filter(challenge => 
    challenge.completed && !challenge.claimed
  );
}

export async function getExpiredClaimableChallenges(): Promise<Challenge[]> {
  const userProgress = await storageService.getUserProgress();
  const now = new Date();
  const allChallenges = Object.values(userProgress.challenges || {});
  
  return allChallenges.filter(challenge => 
    challenge.completed && 
    !challenge.claimed && 
    new Date(challenge.endDate) < now
  );
}

export async function claimChallenge(challengeId: string): Promise<ChallengeClaimResult> {
  try {
    const userProgress = await storageService.getUserProgress();
    const challenge = userProgress.challenges[challengeId];
    
    if (!challenge) {
      return {
        success: false,
        message: 'Challenge not found',
        progress: userProgress,
        xpEarned: 0
      };
    }
    
    // Debug logging for streak challenges
    if (challenge.type === 'streak') {
      console.log(`Attempting to claim streak challenge:
        Title: ${challenge.title}
        Completed: ${challenge.completed}
        Completion Date: ${challenge.dateCompleted}
        Current Streak: ${userProgress.statistics.currentStreak}
        Required Streak: ${challenge.requirement}
      `);
    }
    
    // Verify challenge is completed and not already claimed
    if (!challenge.completed || challenge.claimed) {
      return {
        success: false,
        message: challenge.claimed ? 'Challenge already claimed' : 'Challenge not completed',
        progress: userProgress,
        xpEarned: 0
      };
    }
    
    // Special handling for streak challenges
    if (challenge.type === 'streak') {
      // Ensure completion date is set for streak challenges
      if (!challenge.dateCompleted) {
        challenge.dateCompleted = new Date().toISOString();
        console.log('Set missing completion date for streak challenge:', challenge.dateCompleted);
      }
    }
    
    // Check if challenge is still within redemption period
    if (!isWithinRedemptionPeriod(challenge)) {
      return {
        success: false,
        message: 'Challenge redemption period has expired',
        progress: userProgress,
        xpEarned: 0,
        xpReduction: true
      };
    }
    
    // For daily challenges, check additional claiming rules
    if (challenge.category === 'daily') {
      const { canClaim, message } = await canClaimDailyChallenge(challenge, userProgress);
      if (!canClaim) {
          return {
            success: false,
          message: message || 'Cannot claim challenge',
          progress: userProgress,
          xpEarned: 0
        };
      }
    }
    
    // Get the actual XP value from the challenge
    const xpToAward = challenge.xp;
    
    // Mark challenge as claimed
    challenge.claimed = true;
    challenge.dateClaimed = new Date().toISOString();
    userProgress.challenges[challengeId] = challenge;
    
    // Add XP - using the correct function name addXP with all required arguments
    const xpResult = await xpManager.addXP(xpToAward, 'challenge', `From ${challenge.title} (${challenge.category}_${challenge.type})`, userProgress);
    
    // Save updated progress
    await storageService.saveUserProgress(xpResult.progress);
    
    // Log the XP award for debugging
    console.log(`Successfully claimed challenge "${challenge.title}":
      XP Awarded: ${xpToAward}
      Type: ${challenge.type}
      Category: ${challenge.category}
    `);
    
        return {
          success: true,
      message: `Successfully claimed ${challenge.title} for ${xpToAward} XP!`,
      progress: xpResult.progress,
      xpEarned: xpToAward
    };
  } catch (error) {
    console.error('Error claiming challenge:', error);
      return {
        success: false,
      message: 'Error claiming challenge',
      progress: await storageService.getUserProgress(),
        xpEarned: 0
      };
  }
}

export async function processRoutineForChallenges(
  routine: any,
  userProgress: UserProgress
): Promise<ChallengeUpdateResult> {
  const data: ChallengeData = {
    area: routine.area,
    duration: routine.duration,
    timeOfDay: new Date(routine.timestamp).getHours(),
    isWeekend: [0, 6].includes(new Date(routine.timestamp).getDay()),
    isFirstOfDay: true,
    routinesCompleted: userProgress.statistics.currentStreak, // Use current streak for streak challenges
    uniqueAreas: [...new Set(userProgress.statistics.uniqueAreas)],
    totalMinutes: routine.duration
  };
  
  let updatedAny = false;
  
  Object.values(userProgress.challenges).forEach(challenge => {
    if (challenge.claimed || challenge.completed || new Date(challenge.endDate) < new Date()) {
      return;
    }
    
    // Special handling for streak challenges
    if (challenge.type === 'streak') {
      const currentStreak = userProgress.statistics.currentStreak;
      if (currentStreak >= challenge.requirement && !challenge.completed) {
        challenge.completed = true;
        challenge.dateCompleted = new Date().toISOString();
        challenge.progress = currentStreak;
        updatedAny = true;
        console.log(`Streak challenge "${challenge.title}" completed with streak of ${currentStreak} days`);
      }
      return;
    }
    
    const handler = challengeHandlers[challenge.type];
    if (handler) {
      const { shouldUpdate, incrementAmount } = handler(challenge, data);
      if (shouldUpdate) {
        const wasUpdated = updateProgress(
          challenge,
          challenge.progress + incrementAmount,
          challenge.requirement
        );
        updatedAny = updatedAny || wasUpdated;
      }
    }
  });
  
  if (updatedAny) {
    await storageService.saveUserProgress(userProgress);
  }
  
  return {
    progress: userProgress,
    updatedChallenges: Object.values(userProgress.challenges).filter(c => c.completed && !c.claimed)
  };
}

/**
 * Generate new challenges for a specific category or all categories
 */
export async function generateChallenges(
  category: 'daily' | 'weekly' | 'monthly' | 'special' | 'all' = 'all'
): Promise<UserProgress> {
  const userProgress = await storageService.getUserProgress();
  const now = new Date();
  
  // Keep existing active challenges that shouldn't be regenerated
  const existingChallenges = { ...userProgress.challenges };
  const activeChallenges: Record<string, Challenge> = {};
  
  Object.entries(existingChallenges).forEach(([id, challenge]) => {
    if (
      (category !== 'all' && challenge.category !== category) ||
      (new Date(challenge.endDate) > now && challenge.completed)
    ) {
      activeChallenges[id] = challenge;
    }
  });
  
  // Generate new challenges based on category
  const newChallenges: Record<string, Challenge> = { ...activeChallenges };
  
  // Helper function to create a challenge
  const createChallenge = (template: any, endDate: Date): Challenge => ({
    ...template,
    id: `${template.id}_${now.getTime()}`,
        progress: 0,
        completed: false,
        claimed: false,
        startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    category: template.category || category,
    timeRange: template.timeRange
  });
  
  // Generate challenges for each category
  if (category === 'all' || category === 'daily') {
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    
    // Add 2 random daily challenges
    const dailyTemplates = getDailyChallengeTemplates();
    const selectedDaily = shuffleArray(dailyTemplates).slice(0, 2);
    selectedDaily.forEach(template => {
      const challenge = createChallenge(template, endDate);
      newChallenges[challenge.id] = challenge;
    });
  }
  
  if (category === 'all' || category === 'weekly') {
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 7);
    endDate.setHours(23, 59, 59, 999);
    
    // Add 2-3 random weekly challenges
    const weeklyTemplates = getWeeklyChallengeTemplates();
    const selectedWeekly = shuffleArray(weeklyTemplates).slice(0, Math.floor(Math.random() * 2) + 2);
    selectedWeekly.forEach(template => {
      const challenge = createChallenge(template, endDate);
      newChallenges[challenge.id] = challenge;
    });
  }
  
  if (category === 'all' || category === 'monthly') {
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 30);
    endDate.setHours(23, 59, 59, 999);
    
    // Add 2 random monthly challenges
    const monthlyTemplates = getMonthlyChallengeTemplates();
    const selectedMonthly = shuffleArray(monthlyTemplates).slice(0, 2);
    selectedMonthly.forEach(template => {
      const challenge = createChallenge(template, endDate);
      newChallenges[challenge.id] = challenge;
    });
  }
  
  if (category === 'all' || category === 'special') {
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 14);
    endDate.setHours(23, 59, 59, 999);
    
    // Add 1 random special challenge
    const specialTemplates = getSpecialChallengeTemplates();
    const selectedSpecial = shuffleArray(specialTemplates)[0];
    const challenge = createChallenge(selectedSpecial, endDate);
    newChallenges[challenge.id] = challenge;
  }
  
  // Save and return updated progress
  const updatedProgress = {
    ...userProgress,
    challenges: newChallenges
  };
  
  await storageService.saveUserProgress(updatedProgress);
  return updatedProgress;
}

/**
 * Handle expired challenges and generate new ones as needed
 */
export async function handleExpiredChallenges(): Promise<UserProgress> {
  const userProgress = await storageService.getUserProgress();
  const now = new Date();
  
  // Check each challenge for expiration
  const challenges = { ...userProgress.challenges };
  let needNewChallenges = {
    daily: true,
    weekly: true,
    monthly: true,
    special: true
  };
  
  Object.entries(challenges).forEach(([id, challenge]) => {
    const endDate = new Date(challenge.endDate);
    
    // Mark as expired if end date has passed and not completed
    if (endDate < now && !challenge.completed) {
      challenges[id] = {
        ...challenge,
        status: CHALLENGE_STATUS.EXPIRED
      };
    }
    
    // Check if we have active challenges for each category
    if (endDate > now) {
      needNewChallenges[challenge.category as keyof typeof needNewChallenges] = false;
    }
  });
  
  // Generate new challenges for categories that need them
  let updatedProgress = {
    ...userProgress,
    challenges
  };
  
  for (const [category, needed] of Object.entries(needNewChallenges)) {
    if (needed) {
      updatedProgress = await generateChallenges(category as 'daily' | 'weekly' | 'monthly' | 'special');
    }
  }
  
  return updatedProgress;
}

/**
 * Force update daily challenges based on completed routines
 */
export async function forceUpdateDailyChallengesWithRoutines(): Promise<UserProgress> {
  const userProgress = await storageService.getUserProgress();
  const routinesCompletedToday = await getRoutinesCompletedToday();
  
  if (routinesCompletedToday === 0) {
    return userProgress;
  }
  
  let updatedAny = false;
  const challenges = { ...userProgress.challenges };
  
  // Update daily challenges that should be completed
  Object.values(challenges).forEach(challenge => {
    if (
      challenge.category === 'daily' &&
      !challenge.claimed &&
      !challenge.completed &&
      new Date(challenge.endDate) > new Date()
    ) {
      // For routine count challenges
      if (challenge.type === 'routine_count') {
        const wasUpdated = updateProgress(challenge, routinesCompletedToday, challenge.requirement);
        updatedAny = updatedAny || wasUpdated;
      }
    }
  });
  
  if (updatedAny) {
    const updatedProgress = {
    ...userProgress,
    challenges
  };
    await storageService.saveUserProgress(updatedProgress);
    return updatedProgress;
  }
  
  return userProgress;
}

/**
 * Check for challenges that are close to expiring and mark them
 */
export async function checkExpiringChallenges(): Promise<UserProgress> {
  const userProgress = await storageService.getUserProgress();
  const now = new Date();
  let hasUpdates = false;

  // Check each challenge for expiration warning
  Object.values(userProgress.challenges).forEach(challenge => {
    const endDate = new Date(challenge.endDate);
    const timeLeft = endDate.getTime() - now.getTime();
    const hoursLeft = timeLeft / (1000 * 60 * 60);
    
    // Set warning thresholds based on challenge category
    const warningThresholds = {
      daily: 4,     // 4 hours for daily challenges
      weekly: 24,   // 24 hours for weekly challenges
      monthly: 48,  // 48 hours for monthly challenges
      special: 24   // 24 hours for special challenges
    };
    
    const shouldWarn = !challenge.claimed && 
                      !challenge.completed && 
                      hoursLeft > 0 && 
                      hoursLeft <= warningThresholds[challenge.category as keyof typeof warningThresholds];
    
    // Only update if the warning status has changed
    if (shouldWarn !== !!challenge.expiryWarning) {
      userProgress.challenges[challenge.id].expiryWarning = shouldWarn;
      hasUpdates = true;
    }
  });

  if (hasUpdates) {
    await storageService.saveUserProgress(userProgress);
  }

  return userProgress;
}

// Helper functions for challenge templates
function shuffleArray<T>(array: T[]): T[] {
  return [...array].sort(() => Math.random() - 0.5);
}

function getDailyChallengeTemplates() {
  return [
  {
    id: 'daily_any',
    title: 'Daily Stretch',
    description: 'Complete any stretch routine today',
    type: 'routine_count',
    requirement: 1,
    xp: 25
  },
  {
    id: 'daily_minutes',
    title: 'Extended Session',
    description: 'Complete 5 minutes of stretching today',
    type: 'daily_minutes',
    requirement: 5,
    xp: 30
  },
  {
    id: 'daily_morning',
    title: 'Morning Flexibility',
    description: 'Complete a routine before noon',
    type: 'time_of_day',
    timeRange: { start: 5, end: 12 },
    requirement: 1,
    xp: 35
    }
    // Add more daily challenge templates as needed
  ];
}

function getWeeklyChallengeTemplates() {
  return [
  {
    id: 'weekly_variety',
    title: 'Variety Pack',
    description: 'Stretch 3 different body areas this week',
    type: 'area_variety',
    requirement: 3,
    xp: 75
  },
  {
    id: 'weekly_routines',
    title: 'Weekly Dedication',
    description: 'Complete 5 stretching routines this week',
    type: 'routine_count',
    requirement: 5,
    xp: 100
    }
    // Add more weekly challenge templates as needed
  ];
}

function getMonthlyChallengeTemplates() {
  return [
  {
    id: 'monthly_streak',
    title: 'Consistency Champion',
    description: 'Maintain a 7-day streak',
    type: 'streak',
    requirement: 7,
      xp: 200,
      category: 'monthly'
  },
  {
    id: 'monthly_minutes',
    title: 'Stretch Master',
    description: 'Complete 60 minutes of total stretching this month',
    type: 'total_minutes',
    requirement: 60,
      xp: 250,
      category: 'monthly'
    }
  ];
}

function getSpecialChallengeTemplates() {
  return [
  {
    id: 'special_weekend',
    title: 'Weekend Warrior',
    description: 'Complete a routine on both Saturday and Sunday',
    type: 'weekend_days',
    requirement: 2,
    xp: 150
  },
  {
    id: 'special_early',
    title: 'Early Bird',
    description: 'Complete a routine before 8 AM',
    type: 'time_of_day',
    timeRange: { start: 5, end: 8 },
    requirement: 1,
    xp: 100
    }
    // Add more special challenge templates as needed
  ];
}