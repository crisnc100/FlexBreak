import { BodyArea, Duration, ProgressEntry, StretchLevel } from '../../types';
import * as rewardManager from '../progress/modules/rewardManager';
import stretches from '../../data/stretches';
import * as dateUtils from '../progress/modules/utils/dateUtils';

// Type for routine recommendation
export interface RoutineRecommendation {
  area: BodyArea;
  duration: Duration;
  level: StretchLevel;
  reason: string;
  isPremiumEnabled?: boolean;
}

// Get available body areas (areas that have stretches with demos)
function getAvailableBodyAreas(): BodyArea[] {
  const areasWithDemos = new Set<BodyArea>();
  
  stretches.forEach(stretch => {
    if (stretch.hasDemo === true) {
      stretch.tags.forEach(tag => {
        if (tag !== 'Full Body') {
          areasWithDemos.add(tag as BodyArea);
        }
      });
    }
  });
  
  // Check if Full Body has any demos
  const hasFullBodyDemos = stretches.some(stretch => 
    stretch.hasDemo === true && 
    stretch.tags.includes('Full Body')
  );
  
  if (hasFullBodyDemos) {
    areasWithDemos.add('Full Body');
  }
  
  return Array.from(areasWithDemos);
}

// Define beginner-friendly sequence for new users (Phase 1)
// This will be dynamically filtered based on available demos
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

// Get filtered default routines sequence (only those with demo videos)
function getFilteredDefaultSequence(): RoutineRecommendation[] {
  const availableAreas = getAvailableBodyAreas();
  return DEFAULT_ROUTINE_SEQUENCE.filter(routine => 
    availableAreas.includes(routine.area)
  );
}

// Get total routine count for a specific body area
function getAreaRoutineCount(routines: ProgressEntry[], area: BodyArea): number {
  return routines.filter(routine => routine.area === area).length;
}

// Get routine count for today
function getTodayRoutineCount(routines: ProgressEntry[]): number {
  const todayStr = dateUtils.todayStringLocal();
  
  return routines.filter(routine => {
    const routineDateStr = dateUtils.toDateString(routine.date);
    return routineDateStr === todayStr;
  }).length;
}

// Get most common area from user history that has demo videos
function getMostUsedArea(routines: ProgressEntry[]): BodyArea | null {
  if (routines.length === 0) return null;
  
  const areaCounts: Record<string, number> = {};
  const availableAreas = getAvailableBodyAreas();
  
  routines.forEach(routine => {
    if (availableAreas.includes(routine.area as BodyArea)) {
      if (!areaCounts[routine.area]) {
        areaCounts[routine.area] = 0;
      }
      areaCounts[routine.area]++;
    }
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

// Get least used area from user history that has demo videos
function getLeastUsedArea(routines: ProgressEntry[]): BodyArea | null {
  if (routines.length === 0) return null;
  
  // Get areas that have stretches with demo videos
  const availableAreas = getAvailableBodyAreas();
  
  // Count occurrences of each area
  const areaCounts: Record<string, number> = {};
  availableAreas.forEach(area => {
    areaCounts[area] = 0;
  });
  
  routines.forEach(routine => {
    if (availableAreas.includes(routine.area as BodyArea)) {
      areaCounts[routine.area]++;
    }
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
  
  // Check if the area has stretches with demos
  const availableAreas = getAvailableBodyAreas();
  if (!availableAreas.includes(area)) {
    return false;
  }
  
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
  
  // Get available body areas that have stretches with demo videos
  const availableAreas = getAvailableBodyAreas();
  
  // Log available areas for debugging
  console.log(`[DEBUG] Areas with demo videos: ${availableAreas.join(', ')}`);
  
  // Get filtered default sequence
  const filteredDefaultSequence = getFilteredDefaultSequence();
  
  // Phase 1: Default Mode (0-4 Routines)
  if (routines.length < 5) {
    if (filteredDefaultSequence.length === 0) {
      // If no default routines have demos, create a fallback recommendation
      const fallbackArea = availableAreas.length > 0 ? availableAreas[0] : 'Full Body';
      return {
        area: fallbackArea,
        duration: '5',
        level: 'beginner',
        reason: 'Here\'s a routine to get you started',
        isPremiumEnabled: premiumEnabled
      };
    }
    
    const index = Math.min(routines.length, filteredDefaultSequence.length - 1);
    const recommendation = filteredDefaultSequence[index];
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
    
    // Fallback to any available area if no least used area
    const fallbackArea = availableAreas.length > 0 ? availableAreas[0] : 'Full Body';
    
    return {
      area: leastUsedArea || fallbackArea,
      duration: preferredDuration,
      level: 'beginner',
      reason: `You've already done ${todayRoutineCount} routine${todayRoutineCount > 1 ? 's' : ''} today! Try this ${leastUsedArea || fallbackArea} routine for more variety.`,
      isPremiumEnabled: premiumEnabled
    };
  }
  
  // PROGRESSION: Otherwise, suggest progression in a popular area
  const mostUsedArea = getMostUsedArea(routines);
  
  // If no most used area or it doesn't have demo videos, use any available area
  const targetArea = mostUsedArea || (availableAreas.length > 0 ? availableAreas[0] : 'Full Body');
  
  const readyForProgression = isReadyForProgression(routines, targetArea);
  const preferredDuration = getAverageDuration(routines);
  
  if (readyForProgression) {
    return {
      area: targetArea,
      duration: preferredDuration,
      level: 'intermediate', // Suggest moving up to intermediate
      reason: `You've mastered ${targetArea} stretches! Try this intermediate routine to challenge yourself.`,
      isPremiumEnabled: premiumEnabled
    };
  }
  
  // Default recommendation if no other condition is met
  return {
    area: targetArea,
    duration: preferredDuration,
    level: 'beginner',
    reason: `Based on your history, here's a ${targetArea} routine that's just right for you today.`,
    isPremiumEnabled: premiumEnabled
  };
} 