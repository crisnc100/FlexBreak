import { BodyArea, Duration, ProgressEntry, StretchLevel } from '../types';
import * as rewardManager from './progress/modules/rewardManager';

// Type for routine recommendation
export interface RoutineRecommendation {
  area: BodyArea;
  duration: Duration;
  level: StretchLevel;
  reason: string;
  isPremiumEnabled?: boolean;
}

// Define beginner-friendly sequence for new users (Phase 1)
const DEFAULT_ROUTINE_SEQUENCE: RoutineRecommendation[] = [
  {
    area: 'Neck',
    duration: '5',
    level: 'beginner',
    reason: 'Start with an easy neck routine to get familiar with the app'
  },
  {
    area: 'Upper Back & Chest',
    duration: '5',
    level: 'beginner',
    reason: 'Relieve tension in your upper back with this beginner-friendly routine'
  },
  {
    area: 'Shoulders & Arms',
    duration: '10',
    level: 'beginner',
    reason: 'A slightly longer shoulder routine to build your stretching habit'
  },
  {
    area: 'Hips & Legs',
    duration: '5',
    level: 'beginner',
    reason: 'Give your lower body a break with this quick routine'
  },
  {
    area: 'Lower Back',
    duration: '10',
    level: 'beginner',
    reason: 'Try a lower back focus to improve your overall flexibility'
  }
];

// Get total routine count for a specific body area
function getAreaRoutineCount(routines: ProgressEntry[], area: BodyArea): number {
  return routines.filter(routine => routine.area === area).length;
}

// Get routine count for today
function getTodayRoutineCount(routines: ProgressEntry[]): number {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  return routines.filter(routine => {
    const routineDate = new Date(routine.date);
    const routineDateStr = routineDate.toISOString().split('T')[0];
    return routineDateStr === todayStr;
  }).length;
}

// Get most common area from user history
function getMostUsedArea(routines: ProgressEntry[]): BodyArea | null {
  if (routines.length === 0) return null;
  
  const areaCounts: Record<string, number> = {};
  
  routines.forEach(routine => {
    if (!areaCounts[routine.area]) {
      areaCounts[routine.area] = 0;
    }
    areaCounts[routine.area]++;
  });
  
  let maxCount = 0;
  let mostUsedArea: BodyArea | null = null;
  
  Object.entries(areaCounts).forEach(([area, count]) => {
    if (count > maxCount) {
      maxCount = count;
      mostUsedArea = area as BodyArea;
    }
  });
  
  return mostUsedArea;
}

// Get least used area from user history
function getLeastUsedArea(routines: ProgressEntry[]): BodyArea | null {
  if (routines.length === 0) return null;
  
  // All possible body areas
  const allAreas: BodyArea[] = [
    'Neck',
    'Shoulders & Arms',
    'Upper Back & Chest',
    'Lower Back',
    'Hips & Legs',
    'Full Body'
  ];
  
  // Count occurrences of each area
  const areaCounts: Record<string, number> = {};
  allAreas.forEach(area => {
    areaCounts[area] = 0;
  });
  
  routines.forEach(routine => {
    areaCounts[routine.area]++;
  });
  
  // Find the area with the minimum count
  let minCount = Infinity;
  let leastUsedArea: BodyArea | null = null;
  
  Object.entries(areaCounts).forEach(([area, count]) => {
    if (count < minCount) {
      minCount = count;
      leastUsedArea = area as BodyArea;
    }
  });
  
  return leastUsedArea;
}

// Get average routine duration
function getAverageDuration(routines: ProgressEntry[]): Duration {
  if (routines.length === 0) return '5';
  
  const totalMinutes = routines.reduce((sum, routine) => {
    return sum + parseInt(routine.duration, 10);
  }, 0);
  
  const averageMinutes = Math.round(totalMinutes / routines.length);
  
  // Map to available durations
  if (averageMinutes <= 5) return '5';
  if (averageMinutes <= 10) return '10';
  return '15';
}

// Check if user is ready for progression
function isReadyForProgression(routines: ProgressEntry[], area: BodyArea): boolean {
  if (!area) return false;
  
  // User is ready for progression if they've done at least 3 routines in the area
  const areaRoutineCount = getAreaRoutineCount(routines, area);
  return areaRoutineCount >= 3;
}

/**
 * Check if premium stretches are unlocked for the user
 * Premium stretches are unlocked at level 7
 * @returns Boolean indicating if premium stretches are available
 */
async function hasPremiumStretchesAccess(): Promise<boolean> {
  try {
    return await rewardManager.isRewardUnlocked('premium_stretches');
  } catch (error) {
    console.error('Error checking premium stretches access:', error);
    return false;
  }
}

/**
 * Generate a smart pick recommendation based on user history
 * @param routines User's routine history
 * @returns A personalized routine recommendation
 */
export async function generateSmartPick(routines: ProgressEntry[]): Promise<RoutineRecommendation> {
  // Check if premium stretches are unlocked (available at level 7)
  const premiumEnabled = await hasPremiumStretchesAccess();
  
  // Phase 1: Default Mode (0-4 Routines)
  if (routines.length < 5) {
    const index = Math.min(routines.length, DEFAULT_ROUTINE_SEQUENCE.length - 1);
    const recommendation = DEFAULT_ROUTINE_SEQUENCE[index];
    return {
      ...recommendation,
      isPremiumEnabled: premiumEnabled
    };
  }
  
  // Phase 2: Data-Driven Mode (5+ Routines)
  
  // Get today's routine count
  const todayRoutineCount = getTodayRoutineCount(routines);
  
  // VARIETY: If user has done multiple routines today, suggest a less-used area
  if (todayRoutineCount >= 1) {
    const leastUsedArea = getLeastUsedArea(routines);
    const preferredDuration = getAverageDuration(routines);
    
    return {
      area: leastUsedArea || 'Neck', // Fallback to Neck if no least used area
      duration: preferredDuration,
      level: 'beginner',
      reason: `You've already done ${todayRoutineCount} routine${todayRoutineCount > 1 ? 's' : ''} today! Try this ${leastUsedArea} routine for more variety.`,
      isPremiumEnabled: premiumEnabled
    };
  }
  
  // PROGRESSION: Otherwise, suggest progression in a popular area
  const mostUsedArea = getMostUsedArea(routines);
  const readyForProgression = isReadyForProgression(routines, mostUsedArea || 'Neck');
  const preferredDuration = getAverageDuration(routines);
  
  if (readyForProgression) {
    return {
      area: mostUsedArea || 'Neck',
      duration: preferredDuration,
      level: 'intermediate', // Suggest moving up to intermediate
      reason: `You've mastered ${mostUsedArea} stretches! Try this intermediate routine to challenge yourself.`,
      isPremiumEnabled: premiumEnabled
    };
  }
  
  // Default recommendation if no other condition is met
  return {
    area: mostUsedArea || 'Neck',
    duration: preferredDuration,
    level: 'beginner',
    reason: `Based on your history, here's a ${mostUsedArea} routine that's just right for you today.`,
    isPremiumEnabled: premiumEnabled
  };
} 