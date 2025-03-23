import { Challenge, UserProgress, ChallengeClaimResult, ChallengeUpdateResult, CHALLENGE_STATUS } from './types';
import * as storageService from '../../services/storageService';
import * as xpManager from './xpManager';

/**
 * Gets active challenges that are not expired
 * @returns Active challenges categorized by type
 */
export const getActiveChallenges = async (): Promise<{
  daily: Challenge[];
  weekly: Challenge[];
  monthly: Challenge[];
  special: Challenge[];
}> => {
  const userProgress = await storageService.getUserProgress();
  const now = new Date();
  
  // Filter challenges that are still active (not expired)
  const allChallenges = Object.values(userProgress.challenges || {});
  const activeChallenges = allChallenges.filter(challenge => 
    new Date(challenge.endDate) > now
  );
  
  // Group by category
  return {
    daily: activeChallenges.filter(c => c.category === 'daily'),
    weekly: activeChallenges.filter(c => c.category === 'weekly'),
    monthly: activeChallenges.filter(c => c.category === 'monthly'),
    special: activeChallenges.filter(c => c.category === 'special')
  };
};

/**
 * Gets completed challenges that can be claimed
 * @returns Claimable challenges
 */
export const getClaimableChallenges = async (): Promise<Challenge[]> => {
  const userProgress = await storageService.getUserProgress();
  const allChallenges = Object.values(userProgress.challenges || {});
  
  return allChallenges.filter(challenge => 
    challenge.completed && !challenge.claimed
  );
};

/**
 * Gets expired challenges that were completed but not claimed
 * @returns Expired claimable challenges
 */
export const getExpiredClaimableChallenges = async (): Promise<Challenge[]> => {
  const userProgress = await storageService.getUserProgress();
  const now = new Date();
  const allChallenges = Object.values(userProgress.challenges || {});
  
  return allChallenges.filter(challenge => 
    challenge.completed && 
    !challenge.claimed && 
    new Date(challenge.endDate) < now
  );
};

/**
 * Claims a completed challenge to earn XP
 * @param challengeId ID of the challenge to claim
 * @returns Claim result with XP earned
 */
export const claimChallenge = async (
  challengeId: string
): Promise<ChallengeClaimResult> => {
  console.log(`Attempting to claim challenge: ${challengeId}`);
  try {
    // Get current user progress
    const userProgress = await storageService.getUserProgress();
    const { challenges } = userProgress;
    
    // Check if challenge exists
    if (!challenges[challengeId]) {
      console.log(`Challenge not found: ${challengeId}`);
      return {
        success: false,
        message: 'Challenge not found',
        progress: userProgress,
        xpEarned: 0
      };
    }
    
    // Get the challenge
    const challenge = challenges[challengeId];
    console.log(`Claiming challenge "${challenge.title}" (${challengeId}): progress=${challenge.progress}/${challenge.requirement}, completed=${challenge.completed}, claimed=${challenge.claimed}`);
    
    // Get today's date for daily challenge checks
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();
    
    // MODIFIED: Allow multiple challenge claims per day, but with restrictions by type
    if (challenge.category === 'daily') {
      // CHANGED: Check if a challenge of the SAME TYPE was already claimed today
      // This allows claiming different types of daily challenges (e.g., one routine_count and one time_of_day)
      const similarChallengesClaimedToday = userProgress.xpHistory?.filter(entry => 
        entry.source === 'challenge' && 
        entry.timestamp.includes(today) &&
        entry.details?.includes(`daily_${challenge.type}`) // Match only challenges of the same type
      ).length || 0;
      
      // Only restrict if a similar challenge was already claimed today
      if (similarChallengesClaimedToday > 0) {
        const challengeTypeDisplay = challenge.type.replace('_', ' ');
        console.log(`A daily challenge of type "${challengeTypeDisplay}" was already claimed today`);
        return {
          success: false,
          message: `You've already claimed a similar daily challenge today`,
          progress: userProgress,
          xpEarned: 0
        };
      }
      
      // Check if there's at least one routine completed today (required for all daily challenges)
      const routinesCompletedToday = await getRoutinesCompletedToday();
      if (routinesCompletedToday === 0) {
        console.log(`No routines completed today, cannot claim daily challenge`);
        return {
          success: false,
          message: 'Complete a stretching routine today to claim this challenge',
          progress: userProgress,
          xpEarned: 0
        };
      }
    }
    
    // Check if challenge is claimable
    if (!challenge.completed) {
      // ENHANCED LOGIC: Add more permissive conditions for claiming
      
      // Case 1: Any daily routine-related challenge 
      if (challenge.category === 'daily' && 
          (challenge.type === 'routine_count' || challenge.type.includes('routine'))) {
        
        // Get routines completed today
        const routinesCompletedToday = await getRoutinesCompletedToday();
        
        console.log(`Daily routine challenge: routines completed today = ${routinesCompletedToday}`);
        
        if (routinesCompletedToday > 0) {
          // Auto-complete the challenge since a routine was done today
          console.log(`Auto-completing daily challenge "${challenge.title}" because ${routinesCompletedToday} routines were completed today`);
          challenges[challengeId].completed = true;
          challenges[challengeId].progress = Math.max(challenge.progress, 1);
        } else {
          return {
            success: false,
            message: 'Complete a stretching routine today to claim this challenge',
            progress: userProgress,
            xpEarned: 0
          };
        }
      } 
      // Case 2: Any challenge with sufficient progress
      else if (challenge.progress >= challenge.requirement) {
        console.log(`Auto-completing challenge "${challenge.title}" because progress is sufficient: ${challenge.progress}/${challenge.requirement}`);
        challenges[challengeId].completed = true;
      }
      // Case 3: Not claimable yet
      else {
        console.log(`Challenge "${challenge.title}" not completed yet: ${challenge.progress}/${challenge.requirement}`);
        return {
          success: false,
          message: `Progress: ${challenge.progress}/${challenge.requirement}. Need more progress to claim.`,
          progress: userProgress,
          xpEarned: 0
        };
      }
    }
    
    if (challenge.claimed) {
      console.log(`Challenge "${challenge.title}" already claimed`);
      return {
        success: false,
        message: 'Challenge already claimed',
        progress: userProgress,
        xpEarned: 0
      };
    }
    
    // UPDATED: Check if challenge is expired but still within grace period
    const endDate = new Date(challenge.endDate);
    const completedDate = challenge.dateCompleted ? new Date(challenge.dateCompleted) : null;
    
    // Calculate grace periods by category (in hours)
    const gracePeriods = {
      daily: 12, // 12 hours grace period for daily challenges
      weekly: 48, // 2 days grace period for weekly challenges
      monthly: 72, // 3 days grace period for monthly challenges
      special: 48  // 2 days grace period for special challenges
    };
    
    // Calculate if challenge is expired but within grace period
    const isExpired = endDate < now;
    const gracePeriodHours = gracePeriods[challenge.category as keyof typeof gracePeriods] || 24;
    
    // If the challenge is completed, check against completion date
    // Otherwise, check against end date
    const referenceDate = completedDate || endDate;
    
    // Calculate grace period end time (in milliseconds)
    const gracePeriodMs = gracePeriodHours * 60 * 60 * 1000;
    const isWithinGracePeriod = now.getTime() - referenceDate.getTime() <= gracePeriodMs;
    
    if (isExpired && !isWithinGracePeriod) {
      console.log(`Challenge "${challenge.title}" expired on ${challenge.endDate} and grace period has passed`);
      
      // If it's a streak challenge, allow claiming with reduced XP
      if (challenge.type === 'streak') {
        const reducedXp = Math.floor(challenge.xp * 0.5); // 50% of original XP
        console.log(`Streak challenge - allowing claim with reduced XP: ${reducedXp} (original: ${challenge.xp})`);
        
        // Mark with reduced XP
        challenge.xp = reducedXp;
        
        // Add a note about the reduced XP
        const xpReductionNote = `Note: XP reduced because the challenge expired.`;
        return {
          success: true,
          message: `Claimed ${reducedXp} XP from "${challenge.title}". ${xpReductionNote}`,
          progress: userProgress,
          xpEarned: reducedXp,
          xpReduction: true
        };
      }
      
      return {
        success: false,
        message: 'Challenge expired and can no longer be claimed',
        progress: userProgress,
        xpEarned: 0
      };
    } else if (isExpired) {
      console.log(`Challenge "${challenge.title}" expired on ${challenge.endDate} but still within grace period of ${gracePeriodHours} hours`);
      // Continue with claiming, but notify user of grace period
    }
    
    // ADDED: Check for daily XP limit to prevent excessive XP farming
    // Up to 3 challenges can be claimed per day with a maximum of 150 XP total
    if (challenge.category === 'daily') {
      const dailyXpFromChallenges = userProgress.xpHistory?.filter(entry => 
        entry.source === 'challenge' && 
        entry.timestamp.includes(today)
      ).reduce((total, entry) => total + (entry.amount || 0), 0) || 0;
      
      const dailyChallengesClaimed = userProgress.xpHistory?.filter(entry => 
        entry.source === 'challenge' && 
        entry.timestamp.includes(today)
      ).length || 0;
      
      console.log(`Daily challenge XP so far: ${dailyXpFromChallenges}, challenges claimed today: ${dailyChallengesClaimed}`);
      
      // If already claimed 3 challenges today or earned 150+ XP from challenges today
      if (dailyChallengesClaimed >= 3) {
        console.log(`Already claimed ${dailyChallengesClaimed} challenges today, daily limit reached`);
        return {
          success: false,
          message: 'Daily challenge limit reached (max 3 per day)',
          progress: userProgress,
          xpEarned: 0
        };
      }
      
      if (dailyXpFromChallenges >= 150) {
        console.log(`Already earned ${dailyXpFromChallenges} XP from challenges today, XP limit reached`);
        return {
          success: false,
          message: 'Daily challenge XP limit reached (max 150 XP per day)',
          progress: userProgress,
          xpEarned: 0
        };
      }
    }
    
    // Mark as claimed
    const updatedChallenges = { ...challenges };
    updatedChallenges[challengeId] = {
      ...challenge,
      claimed: true,
      dateClaimed: new Date().toISOString()
    };
    
    // Build updated progress object
    let updatedProgress = {
      ...userProgress,
      challenges: updatedChallenges
    };
    
    // Award XP for the challenge
    console.log(`Awarding ${challenge.xp} XP for claiming challenge "${challenge.title}"`);
    const xpResult = await xpManager.addXP(
      challenge.xp,
      'challenge',
      `Claimed: ${challenge.title} (${challenge.category}_${challenge.type}_${challengeId})`, // Include challenge type and category in details
      updatedProgress
    );
    
    // Return the result with grace period message if applicable
    const graceMessage = isExpired ? ' (Claimed during grace period)' : '';
    console.log(`Successfully claimed challenge "${challenge.title}"${graceMessage}`);
    return {
      success: true,
      message: `Successfully claimed ${challenge.xp} XP from "${challenge.title}"${graceMessage}`,
      progress: xpResult.progress,
      xpEarned: challenge.xp
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
};

/**
 * Generate new challenges based on category
 * @param category Challenge category to generate (daily, weekly, monthly, special)
 * @returns Generated challenges
 */
export const generateChallenges = async (
  category: 'daily' | 'weekly' | 'monthly' | 'special' | 'all' = 'all'
): Promise<UserProgress> => {
  const userProgress = await storageService.getUserProgress();
  const now = new Date();
  
  // Get existing challenges
  const existingChallenges = { ...userProgress.challenges };
  
  // Filter out active, non-expired challenges we want to keep
  const activeChallenges: Record<string, Challenge> = {};
  Object.entries(existingChallenges).forEach(([id, challenge]) => {
    // Keep if:
    // 1. Not in the category we're regenerating
    // 2. Not expired
    // 3. Already completed (to preserve progress)
    if (
      (category !== 'all' && challenge.category !== category) ||
      (new Date(challenge.endDate) > now && challenge.completed)
    ) {
      activeChallenges[id] = challenge;
    }
  });
  
  // Generate new challenges
  const newChallenges: Record<string, Challenge> = { ...activeChallenges };
  
  // Generate dailies if needed
  if (category === 'all' || category === 'daily') {
    const dailyEndDate = new Date(now);
    dailyEndDate.setHours(23, 59, 59, 999);
    
    // Daily challenges - achievable within a day
    const dailyChallengePool: ChallengeTemplate[] = [
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
      },
      {
        id: 'daily_evening',
        title: 'Evening Relaxation',
        description: 'Complete a routine after 6 PM',
        type: 'time_of_day',
        timeRange: { start: 18, end: 23 },
        requirement: 1,
        xp: 35
      },
      {
        id: 'daily_back',
        title: 'Focus Area',
        description: 'Complete a routine for the back',
        type: 'specific_area',
        requirement: 1,
        xp: 40,
        area: 'back'
      }
    ];
    
    // Shuffle the pool and pick 2 challenges
    const shuffledDailies = [...dailyChallengePool].sort(() => 0.5 - Math.random());
    const selectedDailies = shuffledDailies.slice(0, 2);
    
    // Add the selected daily challenges
    selectedDailies.forEach(challenge => {
      const uniqueId = `${challenge.id}_${now.getTime()}`;
      newChallenges[uniqueId] = {
        ...challenge,
        id: uniqueId,
        progress: 0,
        completed: false,
        claimed: false,
        startDate: now.toISOString(),
        endDate: dailyEndDate.toISOString(),
        category: 'daily',
        timeRange: challenge.timeRange || undefined
      };
    });
  }
  
  // Generate weeklies if needed
  if (category === 'all' || category === 'weekly') {
    const weeklyEndDate = new Date(now);
    weeklyEndDate.setDate(weeklyEndDate.getDate() + 7);
    weeklyEndDate.setHours(23, 59, 59, 999);
    
    // Weekly challenges - achievable within a week
    const weeklyChallengePool: ChallengeTemplate[] = [
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
      },
      {
        id: 'weekly_minutes',
        title: 'Time Investment',
        description: 'Complete 30 minutes of total stretching this week',
        type: 'total_minutes',
        requirement: 30,
        xp: 100
      },
      {
        id: 'weekly_streak',
        title: 'Mini Streak',
        description: 'Maintain a 3-day stretching streak',
        type: 'streak',
        requirement: 3,
        xp: 125
      }
    ];
    
    // Shuffle the pool and pick 2-3 challenges
    const shuffledWeeklies = [...weeklyChallengePool].sort(() => 0.5 - Math.random());
    const selectedWeeklies = shuffledWeeklies.slice(0, Math.floor(Math.random() * 2) + 2); // 2-3 challenges
    
    // Add the selected weekly challenges
    selectedWeeklies.forEach(challenge => {
      const uniqueId = `${challenge.id}_${now.getTime()}`;
      newChallenges[uniqueId] = {
        ...challenge,
        id: uniqueId,
        progress: 0,
        completed: false,
        claimed: false,
        startDate: now.toISOString(),
        endDate: weeklyEndDate.toISOString(),
        category: 'weekly',
        timeRange: challenge.timeRange || undefined
      };
    });
  }
  
  // Generate monthlies if needed
  if (category === 'all' || category === 'monthly') {
    const monthlyEndDate = new Date(now);
    monthlyEndDate.setDate(monthlyEndDate.getDate() + 30);
    monthlyEndDate.setHours(23, 59, 59, 999);
    
    // Monthly challenges - more challenging but achievable within a month
    // Choose 2 random challenges from a pool of monthly challenges
    const monthlyChallengePool: ChallengeTemplate[] = [
      {
        id: 'monthly_streak',
        title: 'Consistency Champion',
        description: 'Maintain a 7-day streak',
        type: 'streak',
        requirement: 7,
        xp: 200
      },
      {
        id: 'monthly_minutes',
        title: 'Stretch Master',
        description: 'Complete 60 minutes of total stretching this month',
        type: 'total_minutes',
        requirement: 60,
        xp: 250
      },
      {
        id: 'monthly_routines',
        title: 'Dedicated Stretcher',
        description: 'Complete 15 stretching routines this month',
        type: 'routine_count',
        requirement: 15,
        xp: 250
      },
      {
        id: 'monthly_all_areas',
        title: 'Full Body Focus',
        description: 'Stretch all body areas at least once',
        type: 'area_variety',
        requirement: 6, // Assuming 6 total areas
        xp: 300
      },
      {
        id: 'monthly_specific_area_focus',
        title: 'Area Specialist',
        description: 'Complete 5 routines for the same body area',
        type: 'specific_area',
        requirement: 5,
        xp: 200,
        area: '' // Add empty area property that will be filled in later
      }
    ];
    
    // Shuffle the pool and pick 2 challenges
    const shuffledMonthlies = [...monthlyChallengePool].sort(() => 0.5 - Math.random());
    const selectedMonthlies = shuffledMonthlies.slice(0, 2);
    
    // Add the selected monthly challenges
    selectedMonthlies.forEach(challenge => {
      // For specific area challenges, randomly select an area
      let modifiedChallenge = { ...challenge };
      if (challenge.id === 'monthly_specific_area_focus') {
        const areas = ['neck', 'shoulders', 'back', 'hips', 'legs', 'full_body'];
        const randomArea = areas[Math.floor(Math.random() * areas.length)];
        modifiedChallenge = {
          ...challenge,
          area: randomArea,
          description: `Complete 5 routines for your ${randomArea.replace('_', ' ')}`
        };
      }
      
      const uniqueId = `${modifiedChallenge.id}_${now.getTime()}`;
      newChallenges[uniqueId] = {
        ...modifiedChallenge,
        id: uniqueId,
        progress: 0,
        completed: false,
        claimed: false,
        startDate: now.toISOString(),
        endDate: monthlyEndDate.toISOString(),
        category: 'monthly',
        timeRange: challenge.timeRange || undefined
      };
    });
  }
  
  // Generate special challenges if needed (these are more unique/fun challenges)
  if (category === 'all' || category === 'special') {
    const specialEndDate = new Date(now);
    specialEndDate.setDate(specialEndDate.getDate() + 14); // 2 weeks for special challenges
    specialEndDate.setHours(23, 59, 59, 999);
    
    // Special challenges - unique and interesting
    const specialChallengePool: ChallengeTemplate[] = [
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
      },
      {
        id: 'special_night',
        title: 'Night Owl',
        description: 'Complete a routine after 9 PM',
        type: 'time_of_day',
        timeRange: { start: 21, end: 24 },
        requirement: 1,
        xp: 100
      },
      {
        id: 'special_variety',
        title: 'Variety Week',
        description: 'Complete routines for 4 different body areas in a week',
        type: 'area_variety',
        requirement: 4,
        xp: 175
      }
    ];
    
    // Shuffle the pool and pick 1 challenge
    const shuffledSpecials = [...specialChallengePool].sort(() => 0.5 - Math.random());
    const selectedSpecial = shuffledSpecials[0];
    
    // Add the selected special challenge
    const uniqueId = `${selectedSpecial.id}_${now.getTime()}`;
    newChallenges[uniqueId] = {
      ...selectedSpecial,
      id: uniqueId,
      progress: 0,
      completed: false,
      claimed: false,
      startDate: now.toISOString(),
      endDate: specialEndDate.toISOString(),
      category: 'special',
      timeRange: selectedSpecial.timeRange || undefined
    };
  }
  
  // Create updated progress object
  const updatedProgress = {
    ...userProgress,
    challenges: newChallenges
  };
  
  // Save updated progress
  await storageService.saveUserProgress(updatedProgress);
  
  return updatedProgress;
};

/**
 * Checks for and handles expired challenges
 * @returns Updated user progress after handling expirations
 */
export const handleExpiredChallenges = async (): Promise<UserProgress> => {
  const userProgress = await storageService.getUserProgress();
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0); // Start of today
  
  // Get all challenges
  const challenges = { ...userProgress.challenges };
  
  // Track whether we need to generate new challenges
  let needNewDailies = true;
  let needNewWeeklies = true;
  let needNewMonthlies = true;
  let needNewSpecials = true;
  
  // Define cool-down periods for expired challenges before they can be reset (in days)
  const coolDownPeriods = {
    daily: 1,     // 1 day cooldown for daily challenges
    weekly: 3,     // 3 days cooldown for weekly challenges
    monthly: 7,    // 7 days cooldown for monthly challenges
    special: 3     // 3 days cooldown for special challenges
  };
  
  // Track updated challenges
  let updatedAny = false;
  
  // Check for active challenges in each category
  Object.entries(challenges).forEach(([id, challenge]) => {
    const endDate = new Date(challenge.endDate);
    
    // Skip already claimed challenges
    if (challenge.claimed) {
      return;
    }
    
    // Mark challenges as expired if end date is in the past
    if (endDate < now && !challenge.completed) {
      // For challenges with progress, mark them as expired
      challenges[id] = {
        ...challenge,
        status: CHALLENGE_STATUS.EXPIRED
      };
      updatedAny = true;
    }
    
    // Handle challenges that are completed but unclaimed and expired
    if (endDate < now && challenge.completed && !challenge.claimed) {
      const completionDate = challenge.dateCompleted ? new Date(challenge.dateCompleted) : endDate;
      
      // Calculate the grace period for this challenge category (from claimChallenge)
      const gracePeriods = {
        daily: 12, // 12 hours for daily
        weekly: 48, // 2 days for weekly
        monthly: 72, // 3 days for monthly
        special: 48  // 2 days for special
      };
      
      const gracePeriodHours = gracePeriods[challenge.category as keyof typeof gracePeriods] || 24;
      const gracePeriodMs = gracePeriodHours * 60 * 60 * 1000;
      
      // Check if grace period has passed
      if (now.getTime() - completionDate.getTime() > gracePeriodMs) {
        console.log(`Challenge "${challenge.title}" (${id}) expired and grace period passed`);
        
        // For streak challenges, determine if we should preserve the completed status but mark expired
        if (challenge.type === 'streak') {
          challenges[id] = {
            ...challenge,
            status: CHALLENGE_STATUS.EXPIRED,
            // Don't reset progress for streak challenges, just mark them as expired
          };
        } else {
          // For non-streak challenges, mark as expired and add to history
          challenges[id] = {
            ...challenge,
            status: CHALLENGE_STATUS.EXPIRED,
            // Record in history that this was completed but not claimed
            history: [...(challenge.history || []), {
              completedDate: challenge.dateCompleted || endDate.toISOString(),
              xpEarned: 0 // No XP earned since not claimed
            }]
          };
        }
        updatedAny = true;
      }
    }
    
    // Reset expired challenges that have been in cool-down long enough
    if (challenge.status === CHALLENGE_STATUS.EXPIRED) {
      // Calculate how long the challenge has been expired
      const expiryDate = new Date(challenge.endDate);
      const daysSinceExpiry = Math.floor((now.getTime() - expiryDate.getTime()) / (24 * 60 * 60 * 1000));
      
      const coolDownDays = coolDownPeriods[challenge.category as keyof typeof coolDownPeriods] || 1;
      
      // If it's been in cool-down long enough, reset it
      if (daysSinceExpiry >= coolDownDays) {
        console.log(`Resetting expired challenge "${challenge.title}" after ${daysSinceExpiry} days in cool-down`);
        
        // For streak challenges, create a fresh challenge with the same parameters
        if (challenge.type === 'streak') {
          // Calculate new dates for the challenge
          const newStartDate = new Date(now);
          let newEndDate;
          
          // Calculate end date based on category
          switch (challenge.category) {
            case 'daily':
              newEndDate = new Date(newStartDate);
              newEndDate.setDate(newEndDate.getDate() + 1);
              break;
            case 'weekly':
              newEndDate = new Date(newStartDate);
              newEndDate.setDate(newEndDate.getDate() + 7);
              break;
            case 'monthly':
              newEndDate = new Date(newStartDate);
              newEndDate.setDate(newEndDate.getDate() + 30);
              break;
            case 'special':
              newEndDate = new Date(newStartDate);
              newEndDate.setDate(newEndDate.getDate() + 14);
              break;
            default:
              newEndDate = new Date(newStartDate);
              newEndDate.setDate(newEndDate.getDate() + 7);
          }
          
          // Set to end of day
          newEndDate.setHours(23, 59, 59, 999);
          
          // Create a fresh challenge
          challenges[id] = {
            ...challenge,
            progress: 0,
            completed: false,
            startDate: newStartDate.toISOString(),
            endDate: newEndDate.toISOString(),
            status: CHALLENGE_STATUS.ACTIVE,
            dateCompleted: undefined // Clear completion date
          };
          
          console.log(`Reset streak challenge "${challenge.title}" with new end date ${newEndDate.toISOString()}`);
        } 
        // For non-streak challenges, just reset progress and dates
        else {
          // Calculate new dates for the challenge
          const newStartDate = new Date(now);
          let newEndDate;
          
          // Calculate end date based on category
          switch (challenge.category) {
            case 'daily':
              newEndDate = new Date(newStartDate);
              newEndDate.setDate(newEndDate.getDate() + 1);
              break;
            case 'weekly':
              newEndDate = new Date(newStartDate);
              newEndDate.setDate(newEndDate.getDate() + 7);
              break;
            case 'monthly':
              newEndDate = new Date(newStartDate);
              newEndDate.setDate(newEndDate.getDate() + 30);
              break;
            case 'special':
              newEndDate = new Date(newStartDate);
              newEndDate.setDate(newEndDate.getDate() + 14);
              break;
            default:
              newEndDate = new Date(newStartDate);
              newEndDate.setDate(newEndDate.getDate() + 7);
          }
          
          // Set to end of day
          newEndDate.setHours(23, 59, 59, 999);
          
          challenges[id] = {
            ...challenge,
            progress: 0,
            completed: false,
            startDate: newStartDate.toISOString(),
            endDate: newEndDate.toISOString(),
            status: CHALLENGE_STATUS.ACTIVE,
            dateCompleted: undefined // Clear completion date
          };
          
          console.log(`Reset challenge "${challenge.title}" with new end date ${newEndDate.toISOString()}`);
        }
        
        updatedAny = true;
        
        // Since we're resetting this challenge, we don't need a new one of this category
        switch (challenge.category) {
          case 'daily':
            needNewDailies = false;
            break;
          case 'weekly':
            needNewWeeklies = false;
            break;
          case 'monthly':
            needNewMonthlies = false;
            break;
          case 'special':
            needNewSpecials = false;
            break;
        }
      } else {
        console.log(`Challenge "${challenge.title}" still in cool-down: ${daysSinceExpiry}/${coolDownDays} days`);
      }
    }
    
    // Check if we have active challenges for each category
    if (challenge.status !== CHALLENGE_STATUS.EXPIRED && new Date(challenge.endDate) > now) {
      // This challenge is active (not expired)
      switch (challenge.category) {
        case 'daily':
          needNewDailies = false;
          break;
        case 'weekly':
          needNewWeeklies = false;
          break;
        case 'monthly':
          needNewMonthlies = false;
          break;
        case 'special':
          needNewSpecials = false;
          break;
      }
    }
  });
  
  // First, save any updates to expired challenges
  let updatedProgress = {
    ...userProgress,
    challenges
  };
  
  if (updatedAny) {
    console.log('Saving progress with updated challenge expirations');
    await storageService.saveUserProgress(updatedProgress);
  }
  
  // Generate new challenges as needed
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  
  // Check if daily challenges were already generated today
  const lastDailyGeneration = userProgress.lastUpdated ? new Date(userProgress.lastUpdated) : new Date(0);
  const shouldGenerateDailies = lastDailyGeneration < startOfDay && needNewDailies;
  
  // Generate new challenges as needed
  if (shouldGenerateDailies) {
    console.log('Generating new daily challenges');
    updatedProgress = await generateChallenges('daily');
  }
  
  if (needNewWeeklies) {
    console.log('Generating new weekly challenges');
    updatedProgress = await generateChallenges('weekly');
  }
  
  if (needNewMonthlies) {
    console.log('Generating new monthly challenges');
    updatedProgress = await generateChallenges('monthly');
  }
  
  if (needNewSpecials) {
    console.log('Generating new special challenges');
    updatedProgress = await generateChallenges('special');
  }
  
  // Update the last updated timestamp if any new challenges were generated
  if (shouldGenerateDailies || needNewWeeklies || needNewMonthlies || needNewSpecials) {
    updatedProgress = {
      ...updatedProgress,
      lastUpdated: now.toISOString()
    };
    await storageService.saveUserProgress(updatedProgress);
  }
  
  return updatedProgress;
};

// Function to generate new challenges
export const generateNewChallenges = (): Challenge[] => {
  const challenges: Challenge[] = [];
  const now = new Date();
  
  // Daily challenges
  const dailyChallenges = getRandomItems(dailyChallengePool, 2);
  dailyChallenges.forEach(challenge => {
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    
    challenges.push({
      ...challenge,
      progress: 0,
      completed: false,
      claimed: false,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      category: 'daily',
      timeRange: challenge.timeRange || undefined
    });
  });
  
  // Weekly challenges
  const weeklyChallenges = getRandomItems(weeklyChallengePool, 2);
  weeklyChallenges.forEach(challenge => {
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + (7 - endDate.getDay()));
    endDate.setHours(23, 59, 59, 999);
    
    challenges.push({
      ...challenge,
      progress: 0,
      completed: false,
      claimed: false,
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      category: 'weekly',
      timeRange: challenge.timeRange || undefined
    });
  });
  
  // Monthly challenges
  const monthlyChallenges = getRandomItems(monthlyChallengePool, 2);
  monthlyChallenges.forEach(challenge => {
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + 1, 0); // Last day of current month
    endDate.setHours(23, 59, 59, 999);
    
    // Handle specific area challenges
    if (challenge.id === 'monthly_specific_area_focus') {
      const areas = ['neck', 'shoulders', 'back', 'arms', 'legs', 'full_body'];
      const randomArea = areas[Math.floor(Math.random() * areas.length)];
      const areaDisplayNames: Record<string, string> = {
        neck: 'neck',
        shoulders: 'shoulders',
        back: 'back',
        arms: 'arms',
        legs: 'legs',
        full_body: 'full body'
      };
      
      challenges.push({
        ...challenge,
        area: randomArea,
        description: `Complete 5 routines for the ${areaDisplayNames[randomArea]}`,
        progress: 0,
        completed: false,
        claimed: false,
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
        category: 'monthly',
        timeRange: challenge.timeRange || undefined
      });
    } else {
      challenges.push({
        ...challenge,
        progress: 0,
        completed: false,
        claimed: false,
        startDate: now.toISOString(),
        endDate: endDate.toISOString(),
        category: 'monthly',
        timeRange: challenge.timeRange || undefined
      });
    }
  });
  
  // Special challenges - choose 1 random challenge
  const specialChallenge = getRandomItems(specialChallengePool, 1)[0];
  const endDate = new Date(now);
  endDate.setDate(endDate.getDate() + 7); // One week for special challenges
  endDate.setHours(23, 59, 59, 999);
  
  challenges.push({
    ...specialChallenge,
    progress: 0,
    completed: false,
    claimed: false,
    startDate: now.toISOString(),
    endDate: endDate.toISOString(),
    category: 'special',
    timeRange: specialChallenge.timeRange || undefined
  });
  
  return challenges;
};

// Helper function to get random items from an array
const getRandomItems = <T>(array: T[], count: number): T[] => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Interface for challenge templates
interface ChallengeTemplate {
  id: string;
  title: string;
  description: string;
  type: string;
  requirement: number;
  xp: number;
  timeRange?: { start: number; end: number };
  area?: string;
}

// Daily challenges - achievable within a day
const dailyChallengePool: ChallengeTemplate[] = [
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
  },
  {
    id: 'daily_evening',
    title: 'Evening Relaxation',
    description: 'Complete a routine after 6 PM',
    type: 'time_of_day',
    timeRange: { start: 18, end: 23 },
    requirement: 1,
    xp: 35
  },
  {
    id: 'daily_back',
    title: 'Focus Area',
    description: 'Complete a routine for the back',
    type: 'specific_area',
    requirement: 1,
    xp: 40,
    area: 'back'
  }
];

// Weekly challenges - achievable within a week
const weeklyChallengePool: ChallengeTemplate[] = [
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
  },
  {
    id: 'weekly_minutes',
    title: 'Time Investment',
    description: 'Complete 30 minutes of total stretching this week',
    type: 'total_minutes',
    requirement: 30,
    xp: 100
  },
  {
    id: 'weekly_streak',
    title: 'Mini Streak',
    description: 'Maintain a 3-day stretching streak',
    type: 'streak',
    requirement: 3,
    xp: 125
  }
];

// Monthly challenges - more challenging but achievable within a month
const monthlyChallengePool: ChallengeTemplate[] = [
  {
    id: 'monthly_streak',
    title: 'Consistency Champion',
    description: 'Maintain a 7-day streak',
    type: 'streak',
    requirement: 7,
    xp: 200
  },
  {
    id: 'monthly_minutes',
    title: 'Stretch Master',
    description: 'Complete 60 minutes of total stretching this month',
    type: 'total_minutes',
    requirement: 60,
    xp: 250
  },
  {
    id: 'monthly_routines',
    title: 'Dedicated Stretcher',
    description: 'Complete 15 stretching routines this month',
    type: 'routine_count',
    requirement: 15,
    xp: 250
  },
  {
    id: 'monthly_all_areas',
    title: 'Full Body Focus',
    description: 'Stretch all body areas at least once',
    type: 'area_variety',
    requirement: 6, // Assuming 6 total areas
    xp: 300
  },
  {
    id: 'monthly_specific_area_focus',
    title: 'Area Specialist',
    description: 'Complete 5 routines for the same body area',
    type: 'specific_area',
    requirement: 5,
    xp: 200,
    area: '' // Add empty area property that will be filled in later
  }
];

// Special challenges - unique and interesting
const specialChallengePool: ChallengeTemplate[] = [
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
  },
  {
    id: 'special_night',
    title: 'Night Owl',
    description: 'Complete a routine after 9 PM',
    type: 'time_of_day',
    timeRange: { start: 21, end: 24 },
    requirement: 1,
    xp: 100
  },
  {
    id: 'special_variety',
    title: 'Variety Week',
    description: 'Complete routines for 4 different body areas in a week',
    type: 'area_variety',
    requirement: 4,
    xp: 175
  }
];

/**
 * Process routine data to update challenge progress
 * @param routine Routine data
 * @param userProgress Current user progress
 * @returns Updated user progress with updated challenges
 */
export const processRoutineForChallenges = async (
  routine: any,
  userProgress: UserProgress
): Promise<ChallengeUpdateResult> => {
  console.log('Processing routine for challenges:', routine.id);
  
  // Extract relevant details from routine
  const area = routine.area || 'unknown';
  const duration = routine.duration || 0;
  const timestamp = routine.timestamp || new Date().toISOString();
  const routineDate = new Date(timestamp);
  const timeOfDay = routineDate.getHours();
  const isWeekend = routineDate.getDay() === 0 || routineDate.getDay() === 6;
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  const routineDay = routineDate.toISOString().split('T')[0];
  
  console.log(`Routine details: area=${area}, duration=${duration}, timeOfDay=${timeOfDay}, isWeekend=${isWeekend}`);
  
  // Check if this is the first routine of the day
  const isFirstOfDay = userProgress.xpHistory?.findIndex(entry => 
    entry.source === 'routine' && 
    entry.timestamp.includes(routineDay)
  ) === -1;
  
  console.log('Is first routine of the day:', isFirstOfDay);
  
  // PRE-PROCESSING: First, check if we need to force-update the daily challenge
  // This ensures daily challenges are updated immediately
  let anyDailyForceUpdated = false;
  Object.values(userProgress.challenges).forEach(challenge => {
    if (challenge.type === 'routine_count' && 
        challenge.requirement === 1 && 
        challenge.category === 'daily' &&
        !challenge.completed && 
        !challenge.claimed) {
      
      console.log(`Pre-processing: Daily challenge found - ${challenge.title} (${challenge.id})`);
      
      // Mark as in progress
      userProgress.challenges[challenge.id].progress = 1;
      userProgress.challenges[challenge.id].completed = true;
      // Record completion date
      userProgress.challenges[challenge.id].dateCompleted = new Date().toISOString();
      
      console.log(`Pre-processing: Force-marked daily challenge as completed: ${challenge.title}`);
      anyDailyForceUpdated = true;
    }
  });
  
  if (anyDailyForceUpdated) {
    console.log('Pre-processing: Force-updated at least one daily challenge to be complete');
  }
  
  // Update challenges based on routine
  let updatedProgress = updateChallengeProgress(
    userProgress,
    'routine_completed',
    {
      area,
      duration,
      timeOfDay,
      isWeekend,
      isFirstOfDay
    }
  );
  
  // Get list of updated challenges
  const updatedChallenges = getUpdatedChallenges(userProgress.challenges, updatedProgress.challenges);
  console.log('Updated challenges count:', updatedChallenges.length);
  
  // Record completion dates for newly completed challenges
  updatedChallenges.forEach(challenge => {
    // If the challenge was just completed, record the completion date
    if (challenge.completed && !userProgress.challenges[challenge.id].completed) {
      console.log(`Recording completion date for challenge ${challenge.id}`);
      updatedProgress.challenges[challenge.id].dateCompleted = new Date().toISOString();
    }
  });
  
  // POST-PROCESSING: Check ALL challenge types and see if any need to be force-updated
  // This ensures that any challenges that should be progressing ARE progressing
  
  // 1. Daily stretch challenges
  const dailyStretchChallenges = Object.values(updatedProgress.challenges).filter(
    c => c.type === 'routine_count' && c.requirement === 1 && c.category === 'daily'
  );
  
  console.log('Daily stretch challenges found:', dailyStretchChallenges.length);
  
  // Force-mark all daily routine_count challenges as completed if any routine was completed today
  if (dailyStretchChallenges.length > 0) {
    dailyStretchChallenges.forEach(challenge => {
      if (!challenge.completed) {
        console.log(`Force-marking daily challenge as completed: ${challenge.title} (${challenge.id})`);
        updatedProgress.challenges[challenge.id].progress = 1;
        updatedProgress.challenges[challenge.id].completed = true;
        // Record completion date
        updatedProgress.challenges[challenge.id].dateCompleted = new Date().toISOString();
      }
    });
  }
  
  // 2. Weekly routine_count challenges
  const weeklyRoutineChallenges = Object.values(updatedProgress.challenges).filter(
    c => c.type === 'routine_count' && c.category === 'weekly' && !c.completed
  );
  
  console.log('Weekly routine challenges found:', weeklyRoutineChallenges.length);
  
  // Ensure weekly challenges are progressing
  if (weeklyRoutineChallenges.length > 0) {
    let anyUpdated = false;
    weeklyRoutineChallenges.forEach(challenge => {
      // Check if this routine should count toward the challenge progress
      // For routine_count challenges, each routine counts as 1 progress unit
      const currentProgress = updatedProgress.challenges[challenge.id].progress;
      updatedProgress.challenges[challenge.id].progress = currentProgress + 1;
      
      console.log(`Updating weekly challenge: ${challenge.title} (${challenge.id}): ${currentProgress} -> ${currentProgress + 1}`);
      
      // Mark as completed if requirement met
      if (currentProgress + 1 >= challenge.requirement) {
        updatedProgress.challenges[challenge.id].completed = true;
        // Record completion date
        updatedProgress.challenges[challenge.id].dateCompleted = new Date().toISOString();
        console.log(`Weekly challenge now completed: ${challenge.title}`);
      }
      
      anyUpdated = true;
    });
    
    if (anyUpdated) {
      console.log('Updated weekly routine challenges');
    }
  }
  
  // Log all challenges' progress for debugging
  console.log('=== CHALLENGE PROGRESS SUMMARY ===');
  Object.values(updatedProgress.challenges).forEach(challenge => {
    if (!challenge.claimed && new Date(challenge.endDate) > new Date()) {
      console.log(`Challenge "${challenge.title}" (${challenge.id}): progress=${challenge.progress}/${challenge.requirement}, completed=${challenge.completed}, category=${challenge.category}, type=${challenge.type}`);
    }
  });
  console.log('=== END CHALLENGE PROGRESS SUMMARY ===');
  
  // Save updated progress
  await storageService.saveUserProgress(updatedProgress);
  console.log('Saved updated progress after challenge processing');
  
  return {
    progress: updatedProgress,
    updatedChallenges
  };
};

/**
 * Updates challenge progress based on user activity
 * @param progress Current user progress
 * @param activityType Type of activity performed
 * @param details Additional details about the activity
 * @returns Updated progress with challenge updates
 */
export const updateChallengeProgress = (
  progress: UserProgress,
  activityType: string,
  details: {
    area?: string;
    duration?: number;
    timeOfDay?: number;
    isWeekend?: boolean;
    isFirstOfDay?: boolean;
  }
): UserProgress => {
  console.log(`Updating challenge progress for activity: ${activityType}`);
  
  const updatedProgress = { ...progress };
  const challenges = Object.values(updatedProgress.challenges);
  const now = new Date();
  
  // For logging
  let updatedChallengeCount = 0;
  let completedChallengeCount = 0;
  
  // Filter for active challenges only
  const activeChallenges = challenges.filter(challenge => {
    const endDate = new Date(challenge.endDate);
    return !challenge.completed && !challenge.claimed && endDate >= now;
  });
  
  console.log(`Found ${activeChallenges.length} active challenges to update`);
  
  // Update progress for each active challenge based on activity type
  activeChallenges.forEach(challenge => {
    let shouldUpdate = false;
    let incrementAmount = 0;
    
    switch (challenge.type) {
      case 'routine_count':
        // Any routine counts
        shouldUpdate = activityType === 'routine_completed';
        incrementAmount = 1;
        console.log(`Routine count challenge "${challenge.title}": shouldUpdate=${shouldUpdate}`);
        break;
        
      case 'total_minutes':
      case 'daily_minutes':
        // Track minutes of stretching
        shouldUpdate = activityType === 'routine_completed' && !!details.duration;
        incrementAmount = details.duration || 0;
        console.log(`Minutes challenge "${challenge.title}": shouldUpdate=${shouldUpdate}, incrementAmount=${incrementAmount}`);
        break;
        
      case 'streak':
        // Streak challenges are updated separately by the streak system
        console.log(`Streak challenge "${challenge.title}": handled separately`);
        break;
        
      case 'area_variety':
        // Track unique areas stretched
        if (activityType === 'routine_completed' && details.area) {
          const uniqueAreas = new Set(updatedProgress.statistics.uniqueAreas);
          const previousCount = uniqueAreas.size;
          uniqueAreas.add(details.area);
          
          // If we've added a new area, increment the challenge
          if (uniqueAreas.size > previousCount) {
            shouldUpdate = true;
            incrementAmount = 1;
            console.log(`Area variety challenge "${challenge.title}": new area added - ${details.area}`);
          } else {
            console.log(`Area variety challenge "${challenge.title}": area already counted - ${details.area}`);
          }
        }
        break;
        
      case 'specific_area':
        // Track routines for a specific area
        if (activityType === 'routine_completed' && details.area) {
          // If the challenge has a specific area requirement
          if (challenge.area && challenge.area === details.area) {
            shouldUpdate = true;
            incrementAmount = 1;
            console.log(`Specific area challenge "${challenge.title}": matches required area ${challenge.area}`);
          } else {
            console.log(`Specific area challenge "${challenge.title}": area mismatch - required ${challenge.area}, got ${details.area}`);
          }
        }
        break;
        
      case 'time_of_day':
        // Track routines completed at specific times
        if (activityType === 'routine_completed' && details.timeOfDay !== undefined) {
          const { timeRange } = challenge;
          if (timeRange && details.timeOfDay >= timeRange.start && details.timeOfDay < timeRange.end) {
            shouldUpdate = true;
            incrementAmount = 1;
            console.log(`Time of day challenge "${challenge.title}": time matches range ${timeRange.start}-${timeRange.end}`);
          } else if (timeRange) {
            console.log(`Time of day challenge "${challenge.title}": time outside range ${timeRange.start}-${timeRange.end}, got ${details.timeOfDay}`);
          }
        }
        break;
        
      case 'weekend_days':
        // Track routines completed on weekends
        if (activityType === 'routine_completed' && details.isWeekend) {
          // Check if we've already counted this day
          const today = new Date().toISOString().split('T')[0];
          const challengeData = challenge.data || {};
          const trackedDays = challengeData.trackedDays || [];
          
          if (!trackedDays.includes(today)) {
            shouldUpdate = true;
            incrementAmount = 1;
            console.log(`Weekend challenge "${challenge.title}": new weekend day counted`);
            
            // Update the tracked days
            updatedProgress.challenges[challenge.id].data = {
              ...challengeData,
              trackedDays: [...trackedDays, today]
            };
          } else {
            console.log(`Weekend challenge "${challenge.title}": day already counted`);
          }
        }
        break;
        
      default:
        console.log(`Unknown challenge type for "${challenge.title}": ${challenge.type}`);
        break;
    }
    
    // Update challenge progress if needed
    if (shouldUpdate) {
      updatedChallengeCount++;
      const currentProgress = updatedProgress.challenges[challenge.id].progress;
      const newProgress = Math.min(currentProgress + incrementAmount, challenge.requirement);
      updatedProgress.challenges[challenge.id].progress = newProgress;
      
      console.log(`Updated challenge "${challenge.title}": progress ${currentProgress} -> ${newProgress} (requirement: ${challenge.requirement})`);
      
      // Check if challenge is now completed
      if (newProgress >= challenge.requirement) {
        updatedProgress.challenges[challenge.id].completed = true;
        completedChallengeCount++;
        
        // Log for debugging
        console.log(`Challenge completed: ${challenge.title} (${challenge.id})`);
      }
    }
  });
  
  // For any routine_count daily challenges with a requirement of 1, ensure they're marked as completed
  // This is a failsafe to ensure dailies are properly marked
  if (activityType === 'routine_completed') {
    challenges.forEach(challenge => {
      if (challenge.type === 'routine_count' && 
          challenge.requirement === 1 && 
          challenge.category === 'daily' &&
          challenge.progress >= 1 && 
          !challenge.completed) {
        
        console.log(`Force-completing daily challenge that meets requirements: ${challenge.title} (${challenge.id})`);
        updatedProgress.challenges[challenge.id].completed = true;
        completedChallengeCount++;
      }
    });
  }
  
  // Log summary for debugging
  if (updatedChallengeCount > 0) {
    console.log(`Updated ${updatedChallengeCount} challenges, completed ${completedChallengeCount}`);
  } else {
    console.log('No challenges were updated');
  }
  
  return updatedProgress;
};

/**
 * Helper function to get challenges that were updated
 * @param originalChallenges Original challenges state
 * @param updatedChallenges Updated challenges state
 * @returns Array of challenges that were updated
 */
const getUpdatedChallenges = (
  originalChallenges: Record<string, Challenge>,
  updatedChallenges: Record<string, Challenge>
): Challenge[] => {
  const result: Challenge[] = [];
  
  Object.entries(updatedChallenges).forEach(([id, challenge]) => {
    const original = originalChallenges[id];
    
    // If progress has changed or completion status has changed
    if (
      original && 
      (challenge.progress !== original.progress || 
       challenge.completed !== original.completed)
    ) {
      result.push(challenge);
    }
  });
  
  return result;
};

/**
 * Update streak-based challenges
 * @param currentStreak Current user streak value
 * @param userProgress User progress object
 * @returns Updated user progress with updated streak challenges
 */
export const updateStreakChallenges = (
  currentStreak: number,
  userProgress: UserProgress
): UserProgress => {
  const updatedProgress = { ...userProgress };
  const challenges = Object.values(updatedProgress.challenges);
  const now = new Date();
  
  // Filter for active streak challenges
  const activeStreakChallenges = challenges.filter(challenge => {
    const endDate = new Date(challenge.endDate);
    return !challenge.completed && 
           !challenge.claimed && 
           endDate >= now && 
           challenge.type === 'streak';
  });
  
  // Update each streak challenge
  activeStreakChallenges.forEach(challenge => {
    // Set progress to current streak
    const newProgress = Math.min(currentStreak, challenge.requirement);
    updatedProgress.challenges[challenge.id].progress = newProgress;
    
    // Check if challenge is now completed
    if (newProgress >= challenge.requirement) {
      updatedProgress.challenges[challenge.id].completed = true;
    }
  });
  
  return updatedProgress;
};

/**
 * Gets all challenges with a given status
 * @param status Desired challenge status
 * @returns Challenges with the specified status
 */
export const getChallengesByStatus = async (
  status: CHALLENGE_STATUS
): Promise<Challenge[]> => {
  const userProgress = await storageService.getUserProgress();
  const now = new Date();
  const allChallenges = Object.values(userProgress.challenges || {});
  
  switch (status) {
    case CHALLENGE_STATUS.ACTIVE:
      return allChallenges.filter(challenge => 
        !challenge.completed && 
        !challenge.claimed && 
        new Date(challenge.endDate) > now
      );
      
    case CHALLENGE_STATUS.COMPLETED:
      return allChallenges.filter(challenge => 
        challenge.completed && 
        !challenge.claimed && 
        new Date(challenge.endDate) > now
      );
      
    case CHALLENGE_STATUS.CLAIMED:
      return allChallenges.filter(challenge => 
        challenge.claimed
      );
      
    case CHALLENGE_STATUS.EXPIRED:
      return allChallenges.filter(challenge => 
        new Date(challenge.endDate) < now &&
        !challenge.claimed
      );
      
    default:
      return [];
  }
};

/**
 * Gets challenges that are close to completion
 * @param threshold Percentage threshold (0-100) for considering a challenge close to completion
 * @returns Challenges that are close to completion
 */
export const getNearlyChallenges = async (threshold = 75): Promise<Challenge[]> => {
  const userProgress = await storageService.getUserProgress();
  const now = new Date();
  const allChallenges = Object.values(userProgress.challenges || {});
  
  // Filter for active challenges close to completion
  return allChallenges.filter(challenge => {
    const endDate = new Date(challenge.endDate);
    const progressPercent = (challenge.progress / challenge.requirement) * 100;
    
    return !challenge.completed && 
           !challenge.claimed && 
           endDate > now &&
           progressPercent >= threshold &&
           progressPercent < 100;
  });
};

/**
 * Reset challenge progress for challenges that should reset (like daily challenges)
 * @param category Category of challenges to reset
 * @returns Updated user progress after reset
 */
export const resetChallengeProgress = async (
  category: 'daily' | 'weekly' | 'monthly' | 'special' | 'all' = 'all'
): Promise<UserProgress> => {
  const userProgress = await storageService.getUserProgress();
  const challenges = { ...userProgress.challenges };
  const today = new Date().toISOString().split('T')[0];
  let hasChanges = false;
  
  Object.entries(challenges).forEach(([id, challenge]) => {
    // Skip if not in the target category or already reset today
    if (
      (category !== 'all' && challenge.category !== category) ||
      (challenge.lastResetDate === today)
    ) {
      return;
    }
    
    // Reset progress for uncompleted challenges
    if (!challenge.completed && !challenge.claimed) {
      challenges[id] = {
        ...challenge,
        progress: 0,
        lastResetDate: today
      };
      hasChanges = true;
    }
  });
  
  if (hasChanges) {
    const updatedProgress = {
      ...userProgress,
      challenges
    };
    await storageService.saveUserProgress(updatedProgress);
    return updatedProgress;
  }
  
  return userProgress;
};

/**
 * Check for challenges that are about to expire and mark them for user notification
 * @param daysWarning Number of days before expiry to trigger warning
 * @returns Updated user progress with expiry warnings
 */
export const checkExpiringChallenges = async (daysWarning = 1): Promise<UserProgress> => {
  const userProgress = await storageService.getUserProgress();
  const now = new Date();
  const warningThreshold = new Date(now);
  warningThreshold.setDate(warningThreshold.getDate() + daysWarning);
  
  // Get all challenges
  const challenges = { ...userProgress.challenges };
  let hasUpdates = false;
  
  // Check for challenges about to expire
  Object.entries(challenges).forEach(([id, challenge]) => {
    const endDate = new Date(challenge.endDate);
    
    // If challenge is not completed, not claimed, and about to expire
    if (
      !challenge.claimed &&
      endDate > now &&
      endDate <= warningThreshold
    ) {
      // If challenge has progress but isn't completed, mark it with expiry warning
      if (!challenge.completed && challenge.progress > 0) {
        if (!challenge.expiryWarning) {
          challenges[id] = {
            ...challenge,
            expiryWarning: true
          };
          hasUpdates = true;
        }
      }
      // If challenge is completed but not claimed, also mark with expiry warning
      else if (challenge.completed && !challenge.claimed) {
        if (!challenge.expiryWarning) {
          challenges[id] = {
            ...challenge,
            expiryWarning: true
          };
          hasUpdates = true;
        }
      }
    } else if (challenge.expiryWarning && (challenge.claimed || endDate <= now || endDate > warningThreshold)) {
      // Remove expiry warning if challenge is now claimed, expired, or no longer close to expiry
      challenges[id] = {
        ...challenge,
        expiryWarning: false
      };
      hasUpdates = true;
    }
  });
  
  // Only save if we made changes
  if (hasUpdates) {
    const updatedProgress = {
      ...userProgress,
      challenges
    };
    await storageService.saveUserProgress(updatedProgress);
    return updatedProgress;
  }
  
  return userProgress;
};

// Add a new function to force update daily challenges based on completed routines
/**
 * Force updates all daily routine challenges based on completed routines
 * This is a direct fix for challenges not being properly marked as completed
 * @returns Updated user progress
 */
export const forceUpdateDailyChallengesWithRoutines = async (): Promise<UserProgress> => {
  console.log('Force updating daily challenges based on completed routines');
  
  // Get current user progress
  const userProgress = await storageService.getUserProgress();
  
  // Check if there are no daily challenges - generate them if needed
  const dailyChallenges = Object.values(userProgress.challenges).filter(challenge => 
    challenge.category === 'daily' &&
    new Date(challenge.endDate) > new Date() // Not expired
  );
  
  if (dailyChallenges.length === 0) {
    console.log('No active daily challenges found, generating new ones');
    // Generate new daily challenges
    const updatedProgress = await generateChallenges('daily');
    // Continue with the updated progress
    return updatedProgress;
  }
  
  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];
  
  // FIXED: Get ALL routines to calculate more metrics
  const allRoutines = await storageService.getAllRoutines();
  
  // For daily challenges - today's routines
  const todayRoutines = allRoutines.filter(routine => {
    const routineDate = new Date(routine.date).toISOString().split('T')[0];
    return routineDate === today;
  });
  const routinesCompletedToday = todayRoutines.length;
  console.log(`Routines completed today: ${routinesCompletedToday}`);
  
  // FIXED: Calculate total minutes for today
  const totalMinutesToday = todayRoutines.reduce((total, routine) => 
    total + (parseInt(routine.duration) || 0), 0);
  console.log(`Total minutes today: ${totalMinutesToday}`);
  
  // FIXED: Calculate unique areas for today
  const uniqueAreasToday = [...new Set(todayRoutines.map(r => r.area))];
  console.log(`Unique areas today: ${uniqueAreasToday.length} (${uniqueAreasToday.join(', ')})`);
  
  // For weekly challenges - this week's routines  
  const startOfWeek = new Date();
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Start of week (Sunday)
  startOfWeek.setHours(0, 0, 0, 0);
  
  const weekRoutines = allRoutines.filter(routine => {
    const routineDate = new Date(routine.date);
    return routineDate >= startOfWeek;
  });
  const completedRoutinesThisWeek = weekRoutines.length;
  
  // FIXED: Calculate weekly minutes and areas
  const totalMinutesThisWeek = weekRoutines.reduce((total, routine) => 
    total + (parseInt(routine.duration) || 0), 0);
  const uniqueAreasThisWeek = [...new Set(weekRoutines.map(r => r.area))];
  
  console.log(`Completed routines this week: ${completedRoutinesThisWeek}`);
  console.log(`Total minutes this week: ${totalMinutesThisWeek}`);
  console.log(`Unique areas this week: ${uniqueAreasThisWeek.length} (${uniqueAreasThisWeek.join(', ')})`);
  
  // For monthly challenges
  const startOfMonth = new Date();
  startOfMonth.setDate(1); // First day of current month
  startOfMonth.setHours(0, 0, 0, 0);
  
  const monthRoutines = allRoutines.filter(routine => {
    const routineDate = new Date(routine.date);
    return routineDate >= startOfMonth;
  });
  const completedRoutinesThisMonth = monthRoutines.length;
  
  // FIXED: Calculate monthly minutes and areas
  const totalMinutesThisMonth = monthRoutines.reduce((total, routine) => 
    total + (parseInt(routine.duration) || 0), 0);
  const uniqueAreasThisMonth = [...new Set(monthRoutines.map(r => r.area))];
  
  console.log(`Completed routines this month: ${completedRoutinesThisMonth}`);
  console.log(`Total minutes this month: ${totalMinutesThisMonth}`);
  console.log(`Unique areas this month: ${uniqueAreasThisMonth.length} (${uniqueAreasThisMonth.join(', ')})`);
  
  // Find all daily routine challenges
  const dailyRoutineChallenges = Object.values(userProgress.challenges).filter(challenge => 
    challenge.category === 'daily' && 
    challenge.type === 'routine_count' &&
    !challenge.claimed &&
    new Date(challenge.endDate) > new Date() // Not expired
  );
  
  console.log(`Found ${dailyRoutineChallenges.length} daily routine challenges`);
  
  // Check for challenges already claimed today (to prevent duplicates)
  const challengesClaimedToday = userProgress.xpHistory?.filter(entry => 
    entry.source === 'challenge' && 
    entry.timestamp.includes(today)
  ) || [];
  
  // MODIFIED: Track both the challenge IDs and their types
  const claimedChallengeInfo = challengesClaimedToday.map(entry => {
    // Extract challenge ID from details like "Claimed: Daily Stretch (daily_routine_count_123456)"
    const match = entry.details?.match(/\(([^)]+)\)/);
    if (match) {
      const parts = match[1].split('_');
      // Format: category_type_id for new format 
      // Old format might just have the ID, so handle both cases
      if (parts.length >= 3) {
        return {
          id: parts.slice(2).join('_'), // Get the ID part
          category: parts[0],
          type: parts[1]
        };
      } else {
        return { id: match[1], category: null, type: null };
      }
    }
    return null;
  }).filter(Boolean);
  
  // Extract just the IDs for backward compatibility
  const claimedChallengeIds = claimedChallengeInfo.map(info => info.id);
  
  // Get types claimed today
  const claimedChallengeTypes = claimedChallengeInfo
    .filter(info => info.category === 'daily')
    .map(info => info.type)
    .filter(Boolean);
  
  console.log(`Challenges already claimed today: ${claimedChallengeIds.length}`);
  console.log(`Daily challenge types already claimed today: ${claimedChallengeTypes.join(', ')}`);
  
  // Count daily challenges claimed today for the limit
  const dailyChallengesClaimed = claimedChallengeInfo.filter(info => 
    info.category === 'daily'
  ).length;
  
  // Calculate total XP from challenges claimed today
  const dailyXpFromChallenges = challengesClaimedToday.reduce(
    (total, entry) => total + (entry.amount || 0), 0
  ) || 0;
  
  console.log(`Daily challenges claimed today: ${dailyChallengesClaimed}, total XP: ${dailyXpFromChallenges}`);
  
  // FIXED: Add the updatedAny variable declaration back
  let updatedAny = false;
  
  // If any routines were completed today, ensure daily challenges reflect that progress
  if (routinesCompletedToday > 0) {
    console.log(`User has completed ${routinesCompletedToday} routines today, updating daily challenges`);
    
    // For daily challenges, mark them as completed if at least one routine is done today
    // This is linked to the first routine of the day
    dailyRoutineChallenges.forEach(challenge => {
      console.log(`Checking challenge: ${challenge.title} (${challenge.id})`);
      
      // MODIFIED: Skip if this exact challenge was already claimed
      if (claimedChallengeIds.includes(challenge.id)) {
        console.log(`Challenge ${challenge.id} already claimed today, skipping`);
        return;
      }
      
      // ADDED: Skip if we've already claimed a challenge of this type today
      if (claimedChallengeTypes.includes(challenge.type)) {
        console.log(`A challenge of type "${challenge.type}" was already claimed today, skipping ${challenge.id}`);
        return;
      }
      
      // ADDED: Skip if we've hit the daily challenge limit
      if (dailyChallengesClaimed >= 3) {
        console.log(`Already claimed ${dailyChallengesClaimed} challenges today (limit: 3), skipping ${challenge.id}`);
        return;
      }
      
      // ADDED: Skip if we've hit the daily XP limit
      if (dailyXpFromChallenges >= 150) {
        console.log(`Already earned ${dailyXpFromChallenges} XP from challenges today (limit: 150), skipping ${challenge.id}`);
        return;
      }
      
      if (!challenge.completed) {
        console.log(`Marking challenge ${challenge.id} as completed`);
        userProgress.challenges[challenge.id].progress = Math.min(routinesCompletedToday, challenge.requirement);
        
        // Only mark as completed if the progress meets the requirement
        if (userProgress.challenges[challenge.id].progress >= challenge.requirement) {
          userProgress.challenges[challenge.id].completed = true;
        }
        updatedAny = true;
      } else {
        console.log(`Challenge ${challenge.id} already marked as completed`);
      }
    });
    
    // FIXED: Add support for total_minutes challenges
    // Get daily minutes-based challenges
    const dailyMinutesChallenges = Object.values(userProgress.challenges).filter(challenge => 
      challenge.category === 'daily' && 
      (challenge.type === 'total_minutes' || challenge.type === 'daily_minutes') &&
      !challenge.claimed &&
      new Date(challenge.endDate) > new Date() // Not expired
    );
    
    console.log(`Found ${dailyMinutesChallenges.length} daily minutes-based challenges`);
    
    dailyMinutesChallenges.forEach(challenge => {
      console.log(`Checking minutes challenge: ${challenge.title} (${challenge.id})`);
      
      // Apply the same checks as routine_count challenges
      if (claimedChallengeIds.includes(challenge.id)) {
        console.log(`Challenge ${challenge.id} already claimed today, skipping`);
        return;
      }
      
      if (claimedChallengeTypes.includes(challenge.type)) {
        console.log(`A challenge of type "${challenge.type}" was already claimed today, skipping ${challenge.id}`);
        return;
      }
      
      if (dailyChallengesClaimed >= 3) {
        console.log(`Already claimed ${dailyChallengesClaimed} challenges today (limit: 3), skipping ${challenge.id}`);
        return;
      }
      
      if (dailyXpFromChallenges >= 150) {
        console.log(`Already earned ${dailyXpFromChallenges} XP from challenges today (limit: 150), skipping ${challenge.id}`);
        return;
      }
      
      // Update progress based on actual minutes
      const newProgress = Math.min(totalMinutesToday, challenge.requirement);
      if (newProgress !== challenge.progress) {
        console.log(`Updating minutes challenge ${challenge.title} progress: ${challenge.progress} → ${newProgress}`);
        userProgress.challenges[challenge.id].progress = newProgress;
        updatedAny = true;
      }
      
      // Mark as completed if requirement is met
      if (newProgress >= challenge.requirement && !challenge.completed) {
        console.log(`Minutes challenge ${challenge.title} now completed`);
        userProgress.challenges[challenge.id].completed = true;
        updatedAny = true;
      }
    });
    
    // FIXED: Add support for area_variety challenges
    // Get daily area variety challenges
    const dailyAreaChallenges = Object.values(userProgress.challenges).filter(challenge => 
      challenge.category === 'daily' && 
      challenge.type === 'area_variety' &&
      !challenge.claimed &&
      new Date(challenge.endDate) > new Date() // Not expired
    );
    
    console.log(`Found ${dailyAreaChallenges.length} daily area variety challenges`);
    
    dailyAreaChallenges.forEach(challenge => {
      console.log(`Checking area variety challenge: ${challenge.title} (${challenge.id})`);
      
      // Apply the same checks as other challenges
      if (claimedChallengeIds.includes(challenge.id)) {
        console.log(`Challenge ${challenge.id} already claimed today, skipping`);
        return;
      }
      
      if (claimedChallengeTypes.includes(challenge.type)) {
        console.log(`A challenge of type "${challenge.type}" was already claimed today, skipping ${challenge.id}`);
        return;
      }
      
      if (dailyChallengesClaimed >= 3) {
        console.log(`Already claimed ${dailyChallengesClaimed} challenges today (limit: 3), skipping ${challenge.id}`);
        return;
      }
      
      if (dailyXpFromChallenges >= 150) {
        console.log(`Already earned ${dailyXpFromChallenges} XP from challenges today (limit: 150), skipping ${challenge.id}`);
        return;
      }
      
      // Update progress based on unique areas
      const newProgress = Math.min(uniqueAreasToday.length, challenge.requirement);
      if (newProgress !== challenge.progress) {
        console.log(`Updating area variety challenge ${challenge.title} progress: ${challenge.progress} → ${newProgress}`);
        userProgress.challenges[challenge.id].progress = newProgress;
        updatedAny = true;
      }
      
      // Mark as completed if requirement is met
      if (newProgress >= challenge.requirement && !challenge.completed) {
        console.log(`Area variety challenge ${challenge.title} now completed`);
        userProgress.challenges[challenge.id].completed = true;
        updatedAny = true;
      }
    });
    
    // Check other challenges like area-specific and time-based challenges
    Object.values(userProgress.challenges).forEach(challenge => {
      if (challenge.category === 'daily' && 
          !challenge.claimed && 
          challenge.progress > 0 &&
          challenge.progress >= challenge.requirement &&
          !challenge.completed) {
        
        // MODIFIED: Add the same checks for type and limits here
        // Skip if this exact challenge was already claimed
        if (claimedChallengeIds.includes(challenge.id)) {
          return;
        }
        
        // Skip if we've already claimed a challenge of this type today
        if (claimedChallengeTypes.includes(challenge.type)) {
          console.log(`A challenge of type "${challenge.type}" was already claimed today, skipping ${challenge.id}`);
          return;
        }
        
        // Skip if we've hit the daily challenge limit
        if (dailyChallengesClaimed >= 3) {
          console.log(`Already claimed ${dailyChallengesClaimed} challenges today (limit: 3), skipping ${challenge.id}`);
          return;
        }
        
        // Skip if we've hit the daily XP limit
        if (dailyXpFromChallenges >= 150) {
          console.log(`Already earned ${dailyXpFromChallenges} XP from challenges today (limit: 150), skipping ${challenge.id}`);
          return;
        }
        
        console.log(`Marking completed daily challenge ${challenge.title} as completed`);
        userProgress.challenges[challenge.id].completed = true;
        updatedAny = true;
      }
    });
  }
  
  // FIXED: Use the variables calculated earlier instead of recalculating
  console.log(`Completed routines this week: ${completedRoutinesThisWeek}`);
  console.log(`Completed routines this month: ${completedRoutinesThisMonth}`);
  
  // Update weekly routine count challenges with the ACTUAL count
  const weeklyRoutineChallenges = Object.values(userProgress.challenges).filter(challenge => 
    challenge.category === 'weekly' && 
    challenge.type === 'routine_count' &&
    !challenge.claimed &&
    new Date(challenge.endDate) > new Date() // Not expired
  );
  
  weeklyRoutineChallenges.forEach(challenge => {
    console.log(`Updating weekly challenge ${challenge.title} progress`);
    
    // For routine_count challenges, update to actual count
    if (challenge.type === 'routine_count') {
      const newProgress = Math.min(completedRoutinesThisWeek, challenge.requirement);
      if (newProgress !== challenge.progress) {
        userProgress.challenges[challenge.id].progress = newProgress;
        console.log(`Updated weekly challenge progress to ${newProgress}/${challenge.requirement}`);
        updatedAny = true;
      }
      
      if (newProgress >= challenge.requirement && !challenge.completed) {
        console.log(`Weekly challenge ${challenge.title} now completed`);
        userProgress.challenges[challenge.id].completed = true;
        updatedAny = true;
      }
    }
  });
  
  // FIXED: Add support for weekly minutes challenges
  const weeklyMinutesChallenges = Object.values(userProgress.challenges).filter(challenge => 
    challenge.category === 'weekly' && 
    (challenge.type === 'total_minutes' || challenge.type === 'weekly_minutes') &&
    !challenge.claimed &&
    new Date(challenge.endDate) > new Date() // Not expired
  );
  
  weeklyMinutesChallenges.forEach(challenge => {
    console.log(`Updating weekly minutes challenge ${challenge.title} progress`);
    
    const newProgress = Math.min(totalMinutesThisWeek, challenge.requirement);
    if (newProgress !== challenge.progress) {
      userProgress.challenges[challenge.id].progress = newProgress;
      console.log(`Updated weekly minutes challenge progress to ${newProgress}/${challenge.requirement}`);
      updatedAny = true;
    }
    
    if (newProgress >= challenge.requirement && !challenge.completed) {
      console.log(`Weekly minutes challenge ${challenge.title} now completed`);
      userProgress.challenges[challenge.id].completed = true;
      updatedAny = true;
    }
  });
  
  // FIXED: Add support for weekly area variety challenges
  const weeklyAreaChallenges = Object.values(userProgress.challenges).filter(challenge => 
    challenge.category === 'weekly' && 
    challenge.type === 'area_variety' &&
    !challenge.claimed &&
    new Date(challenge.endDate) > new Date() // Not expired
  );
  
  weeklyAreaChallenges.forEach(challenge => {
    console.log(`Updating weekly area variety challenge ${challenge.title} progress`);
    
    const newProgress = Math.min(uniqueAreasThisWeek.length, challenge.requirement);
    if (newProgress !== challenge.progress) {
      userProgress.challenges[challenge.id].progress = newProgress;
      console.log(`Updated weekly area variety challenge progress to ${newProgress}/${challenge.requirement}`);
      updatedAny = true;
    }
    
    if (newProgress >= challenge.requirement && !challenge.completed) {
      console.log(`Weekly area variety challenge ${challenge.title} now completed`);
      userProgress.challenges[challenge.id].completed = true;
      updatedAny = true;
    }
  });
  
  // Update monthly challenges with the ACTUAL count
  const monthlyChallenges = Object.values(userProgress.challenges).filter(challenge => 
    challenge.category === 'monthly' && 
    challenge.type === 'routine_count' &&
    !challenge.claimed &&
    new Date(challenge.endDate) > new Date() // Not expired
  );
  
  monthlyChallenges.forEach(challenge => {
    console.log(`Updating monthly challenge ${challenge.title} progress`);
    
    // For routine_count challenges, update to actual count
    if (challenge.type === 'routine_count') {
      const newProgress = Math.min(completedRoutinesThisMonth, challenge.requirement);
      if (newProgress !== challenge.progress) {
        userProgress.challenges[challenge.id].progress = newProgress;
        console.log(`Updated monthly challenge progress to ${newProgress}/${challenge.requirement}`);
        updatedAny = true;
      }
      
      if (newProgress >= challenge.requirement && !challenge.completed) {
        console.log(`Monthly challenge ${challenge.title} now completed`);
        userProgress.challenges[challenge.id].completed = true;
        updatedAny = true;
      }
    }
  });
  
  // FIXED: Add support for monthly minutes challenges
  const monthlyMinutesChallenges = Object.values(userProgress.challenges).filter(challenge => 
    challenge.category === 'monthly' && 
    (challenge.type === 'total_minutes' || challenge.type === 'monthly_minutes') &&
    !challenge.claimed &&
    new Date(challenge.endDate) > new Date() // Not expired
  );
  
  monthlyMinutesChallenges.forEach(challenge => {
    console.log(`Updating monthly minutes challenge ${challenge.title} progress`);
    
    const newProgress = Math.min(totalMinutesThisMonth, challenge.requirement);
    if (newProgress !== challenge.progress) {
      userProgress.challenges[challenge.id].progress = newProgress;
      console.log(`Updated monthly minutes challenge progress to ${newProgress}/${challenge.requirement}`);
      updatedAny = true;
    }
    
    if (newProgress >= challenge.requirement && !challenge.completed) {
      console.log(`Monthly minutes challenge ${challenge.title} now completed`);
      userProgress.challenges[challenge.id].completed = true;
      updatedAny = true;
    }
  });
  
  // FIXED: Add support for monthly area variety challenges
  const monthlyAreaChallenges = Object.values(userProgress.challenges).filter(challenge => 
    challenge.category === 'monthly' && 
    challenge.type === 'area_variety' &&
    !challenge.claimed &&
    new Date(challenge.endDate) > new Date() // Not expired
  );
  
  monthlyAreaChallenges.forEach(challenge => {
    console.log(`Updating monthly area variety challenge ${challenge.title} progress`);
    
    const newProgress = Math.min(uniqueAreasThisMonth.length, challenge.requirement);
    if (newProgress !== challenge.progress) {
      userProgress.challenges[challenge.id].progress = newProgress;
      console.log(`Updated monthly area variety challenge progress to ${newProgress}/${challenge.requirement}`);
      updatedAny = true;
    }
    
    if (newProgress >= challenge.requirement && !challenge.completed) {
      console.log(`Monthly area variety challenge ${challenge.title} now completed`);
      userProgress.challenges[challenge.id].completed = true;
      updatedAny = true;
    }
  });
  
  // FIXED: Update streak challenges based on current streak
  // Get the current streak from user statistics
  const currentStreak = userProgress.statistics.currentStreak;
  console.log(`Current streak for streak challenges: ${currentStreak} days`);
  
  // Find all streak challenges
  const streakChallenges = Object.values(userProgress.challenges).filter(challenge => 
    challenge.type === 'streak' &&
    !challenge.claimed &&
    new Date(challenge.endDate) > new Date() // Not expired
  );
  
  console.log(`Found ${streakChallenges.length} active streak challenges`);
  
  streakChallenges.forEach(challenge => {
    console.log(`Updating streak challenge ${challenge.title} progress`);
    
    // Set progress to current streak (capped at requirement)
    const newProgress = Math.min(currentStreak, challenge.requirement);
    if (newProgress !== challenge.progress) {
      userProgress.challenges[challenge.id].progress = newProgress;
      console.log(`Updated streak challenge progress to ${newProgress}/${challenge.requirement}`);
      updatedAny = true;
    }
    
    // Mark as completed if streak meets requirement
    if (newProgress >= challenge.requirement && !challenge.completed) {
      console.log(`Streak challenge ${challenge.title} now completed`);
      userProgress.challenges[challenge.id].completed = true;
      updatedAny = true;
    }
  });
  
  // Save progress if any changes were made
  if (updatedAny) {
    console.log('Saving updated challenge progress');
    await storageService.saveUserProgress(userProgress);
  } else {
    console.log('No challenge updates needed');
  }
  
  return userProgress;
};

/**
 * Get the number of routines completed today
 * @returns Number of routines completed today
 */
async function getRoutinesCompletedToday(): Promise<number> {
  const routines = await storageService.getAllRoutines();
  const today = new Date().toISOString().split('T')[0];
  
  return routines.filter(routine => {
    const routineDate = new Date(routine.date).toISOString().split('T')[0];
    return routineDate === today;
  }).length;
}

/**
 * Get the number of routines completed this week
 * @returns Number of routines completed this week
 */
async function getRoutinesCompletedThisWeek(): Promise<number> {
  const routines = await storageService.getAllRoutines();
  const now = new Date();
  
  // Create date for the beginning of the week (Sunday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  return routines.filter(routine => {
    const routineDate = new Date(routine.date);
    return routineDate >= startOfWeek;
  }).length;
}

/**
 * Get the number of routines completed this month
 * @returns Number of routines completed this month
 */
async function getRoutinesCompletedThisMonth(): Promise<number> {
  const routines = await storageService.getAllRoutines();
  const now = new Date();
  
  // Create date for the beginning of the month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  return routines.filter(routine => {
    const routineDate = new Date(routine.date);
    return routineDate >= startOfMonth;
  }).length;
}

/**
 * Handle streak reset by disabling streak-related challenges
 * This keeps the challenges but marks them as failed when the streak is broken
 */
export const handleStreakReset = async (): Promise<UserProgress> => {
  console.log('Handling streak reset in challenges');
  
  try {
    // Get current user progress
    const userProgress = await storageService.getUserProgress();
    let challengesUpdated = false;
    
    // Make sure activeChallenges exists and is an array
    if (!userProgress.challenges || !Array.isArray(userProgress.challenges)) {
      console.log('No active challenges found or activeChallenges is not an array');
      // Initialize the array if it doesn't exist
      userProgress.challenges = {};
      return userProgress;
    }
    
    // Clone the challenges array
    const updatedChallenges = [...Object.values(userProgress.challenges)];
    
    // Find all streak-related active challenges
    const streakChallenges = updatedChallenges.filter(challenge => 
      challenge.type === 'streak' && 
      challenge.status === 'active'
    );
    
    console.log(`Found ${streakChallenges.length} streak-related active challenges`);
    
    // Mark streak challenges as failed
    if (streakChallenges.length > 0) {
      updatedChallenges.forEach(challenge => {
        if (challenge.type === 'streak' && challenge.status === 'active') {
          challenge.status = 'failed';
          challenge.failureReason = 'Streak broken';
          challengesUpdated = true;
          console.log(`Marked challenge as failed: ${challenge.title}`);
        }
      });
      
      // Create updated progress object
      const updatedProgress = {
        ...userProgress,
        activeChallenges: updatedChallenges
      };
      
      // Save to storage
      await storageService.saveUserProgress(updatedProgress);
      console.log('Saved updated challenges with failed streak challenges');
      
      return updatedProgress;
    }
    
    return userProgress;
  } catch (error) {
    console.error('Error handling streak reset for challenges:', error);
    return await storageService.getUserProgress();
  }
}; 