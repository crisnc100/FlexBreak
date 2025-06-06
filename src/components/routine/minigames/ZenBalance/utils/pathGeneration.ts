import { PathPoint, BalanceCategory, GAME_MESSAGES } from '../constants';
import { GAME_CONFIG, SCREEN_WIDTH } from '../constants';

/**
 * Generate a point along the flowing path at a given progress (0-1)
 */
export const generatePathPoint = (progress: number): PathPoint => {
  const y = GAME_CONFIG.START_Y - (progress * (GAME_CONFIG.START_Y - GAME_CONFIG.END_Y));
  
  // ENHANCED: More exciting path with multiple waves and variation
  const baseWave = Math.sin(progress * GAME_CONFIG.PATH_FREQUENCY * Math.PI);
  const secondaryWave = Math.sin(progress * GAME_CONFIG.PATH_FREQUENCY * 2.5 * Math.PI) * 0.4;
  const tertiaryWave = Math.sin(progress * GAME_CONFIG.PATH_FREQUENCY * 4 * Math.PI) * 0.2;
  
  // Varying amplitude that gets more interesting in the middle
  const amplitudeVariation = 0.7 + 0.6 * Math.sin(progress * 3 * Math.PI);
  
  // Combine waves for more exciting path
  const combinedWave = (baseWave + secondaryWave + tertiaryWave) * amplitudeVariation;
  
  const x = SCREEN_WIDTH / 2 + (combinedWave * GAME_CONFIG.PATH_AMPLITUDE);
  
  return { x, y };
};

/**
 * Get the center of the path at a specific progress point
 */
export const getPathCenterAt = (progress: number): PathPoint => {
  return generatePathPoint(progress);
};

/**
 * Calculate if the orb is centered on the path
 */
export const isOrbCentered = (orbX: number, orbY: number, pathProgress: number): boolean => {
  const pathCenter = getPathCenterAt(pathProgress);
  const distance = Math.sqrt(
    Math.pow(orbX - pathCenter.x, 2) + Math.pow(orbY - pathCenter.y, 2)
  );
  return distance <= GAME_CONFIG.PATH_WIDTH;
};

/**
 * Calculate distance from orb to path center
 */
export const getDistanceFromPath = (orbX: number, orbY: number, pathProgress: number): number => {
  const pathCenter = getPathCenterAt(pathProgress);
  return Math.sqrt(
    Math.pow(orbX - pathCenter.x, 2) + Math.pow(orbY - pathCenter.y, 2)
  );
};

/**
 * Generate serenity color based on current level - like flowing water
 */
export const getSerenityColor = (serenityLevel: number): string => {
  const intensity = serenityLevel;
  // More aqua/teal colors for water-like flow
  const blue = Math.floor(120 + (135 * intensity)); // 120-255
  const green = Math.floor(180 + (75 * intensity)); // 180-255
  const red = Math.floor(20 + (80 * intensity)); // 20-100
  return `rgba(${red}, ${green}, ${blue}, ${0.2 + (0.8 * intensity)})`;
};

/**
 * Generate path glow color - bright flowing energy
 */
export const getPathGlowColor = (isCentered: boolean, serenityLevel: number): string => {
  if (isCentered) {
    // Golden/white glow when centered
    const intensity = serenityLevel;
    return `rgba(255, ${220 + (35 * intensity)}, ${100 + (155 * intensity)}, ${0.6 + (0.4 * intensity)})`;
  } else {
    // Soft blue glow when off-center
    return `rgba(100, 150, 255, 0.3)`;
  }
};

/**
 * Calculate visual effects based on centering
 */
export const calculateVisualEffects = (
  isCentered: boolean, 
  distanceFromPath: number, 
  offPathTime: number
) => {
  const maxDistance = GAME_CONFIG.PATH_WIDTH * 2;
  const distanceRatio = Math.min(distanceFromPath / maxDistance, 1);
  
  return {
    // Ripple effect when off path
    rippleOpacity: isCentered ? 0 : Math.sin(offPathTime * 0.01) * 0.3 + 0.3,
    
    // Fog opacity increases with distance from path
    fogOpacity: isCentered ? 0 : distanceRatio * GAME_CONFIG.FOG_OPACITY_MAX,
    
    // Orb dimming when off path
    orbDimming: isCentered ? 1 : Math.max(0.4, 1 - (distanceRatio * 0.6)),
    
    // Show completion symbol at end
    showCompletionSymbol: false
  };
};

/**
 * Determine balance category based on centered time percentage
 */
export const getBalanceCategory = (centeredTimePercentage: number): BalanceCategory => {
  if (centeredTimePercentage >= GAME_CONFIG.FULL_BALANCE_THRESHOLD) {
    return BalanceCategory.FULL_BALANCE;
  } else if (centeredTimePercentage >= GAME_CONFIG.PARTIAL_BALANCE_THRESHOLD) {
    return BalanceCategory.PARTIAL_BALANCE;
  } else {
    return BalanceCategory.RESTLESS;
  }
};

/**
 * Get completion message based on balance category
 */
export const getCompletionMessage = (category: BalanceCategory): string => {
  switch (category) {
    case BalanceCategory.FULL_BALANCE:
      return GAME_MESSAGES.COMPLETION.FULL_BALANCE;
    case BalanceCategory.PARTIAL_BALANCE:
      return GAME_MESSAGES.COMPLETION.PARTIAL_BALANCE;
    case BalanceCategory.RESTLESS:
      return GAME_MESSAGES.COMPLETION.RESTLESS;
    default:
      return GAME_MESSAGES.COMPLETION.PARTIAL_BALANCE;
  }
};

/**
 * Get completion symbol based on balance category
 */
export const getCompletionSymbol = (category: BalanceCategory): string => {
  switch (category) {
    case BalanceCategory.FULL_BALANCE:
      return 'flower'; // Lotus/blossoming
    case BalanceCategory.PARTIAL_BALANCE:
      return 'leaf'; // Growing tree
    case BalanceCategory.RESTLESS:
      return 'sunny'; // Sunrise - new beginning
    default:
      return 'leaf';
  }
};

/**
 * Calculate XP earned based on performance with balance categories
 */
export const calculateXP = (centeredTime: number, serenityLevel: number, gameDuration: number): number => {
  let xpEarned = GAME_CONFIG.BASE_XP;
  
  // Calculate centered time percentage
  const centeredPercentage = centeredTime / gameDuration;
  const balanceCategory = getBalanceCategory(centeredPercentage);
  
  // Category-based bonus
  switch (balanceCategory) {
    case BalanceCategory.FULL_BALANCE:
      xpEarned += GAME_CONFIG.MAX_CENTERED_BONUS; // Full bonus
      break;
    case BalanceCategory.PARTIAL_BALANCE:
      xpEarned += Math.floor(GAME_CONFIG.MAX_CENTERED_BONUS * 0.7); // 70% bonus
      break;
    case BalanceCategory.RESTLESS:
      xpEarned += Math.floor(GAME_CONFIG.MAX_CENTERED_BONUS * 0.3); // 30% bonus
      break;
  }
  
  // Serenity bonus - based on final serenity level
  const serenityBonus = Math.min(GAME_CONFIG.MAX_SERENITY_BONUS, Math.floor(serenityLevel * 25));
  xpEarned += serenityBonus;
  
  // Cap at max XP
  return Math.min(GAME_CONFIG.MAX_XP, xpEarned);
};

/**
 * Update orb position based on tilt and current state
 */
export const updateOrbPosition = (
  currentPosition: { x: number; y: number },
  horizontalOffset: number,
  pathProgress: number,
  testMode: boolean = false
): { x: number; y: number } => {
  if (testMode) {
    // Test mode: simulate gentle swaying motion
    const time = Date.now() / 1000;
    const sway = Math.sin(time * 0.5) * 50;
    return {
      x: SCREEN_WIDTH / 2 + sway,
      y: SCREEN_WIDTH * 0.6
    };
  }

  // Normal mode: orb flows along the path, user controls horizontal offset
  const pathCenter = getPathCenterAt(pathProgress);
  
  return {
    x: Math.max(40, Math.min(SCREEN_WIDTH - 40, pathCenter.x + horizontalOffset)),
    y: pathCenter.y
  };
}; 