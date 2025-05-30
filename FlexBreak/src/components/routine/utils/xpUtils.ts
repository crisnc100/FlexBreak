import { XpBreakdownItem } from '../types/completedRoutine.types';

/**
 * Detects if XP boost is active from breakdown items or explicit flag
 */
export const detectXpBoost = (xpBreakdown: XpBreakdownItem[], isXpBoosted?: boolean): boolean => {
  return !!isXpBoosted || 
    xpBreakdown.some(item => 
      item.description.includes('XP Boost Applied') || 
      item.description.includes('2x XP')
    );
};

/**
 * Calculates the original (unboosted) XP amount
 */
export const calculateOriginalXp = (
  xpEarned: number, 
  hasXpBoost: boolean,
  xpBreakdown: XpBreakdownItem[]
): number => {
  if (!hasXpBoost) return xpEarned;
  
  // Default to dividing by 2 (standard boost), but check the descriptions for other multipliers
  let boostMultiplier = 2;
  
  for (const item of xpBreakdown) {
    if (item.description.includes('XP Boost Applied')) {
      // Extract the multiplier from the description if possible
      const matches = item.description.match(/(\d+(?:\.\d+)?)x XP Boost Applied/);
      if (matches && matches[1]) {
        boostMultiplier = parseFloat(matches[1]);
        break;
      }
    }
  }
  
  return Math.floor(xpEarned / boostMultiplier);
};

/**
 * Simulates a potential level-up based on XP earned with a boost
 */
export const simulateLevelUpWithBoost = (
  hasXpBoost: boolean,
  levelUp: any,
  xpEarned: number
) => {
  // Don't simulate level-ups based on XP boost alone
  // This prevents false level-up displays when only XP boost is active
  return null;
};

/**
 * Determines whether to show the level-up UI
 */
export const shouldShowLevelUp = (levelUp: any): boolean => {
  return !!levelUp && 
    typeof levelUp === 'object' && 
    'oldLevel' in levelUp &&
    'newLevel' in levelUp &&
    Number.isFinite(levelUp.oldLevel) &&
    Number.isFinite(levelUp.newLevel) &&
    levelUp.oldLevel < levelUp.newLevel;
};

/**
 * Calculates level display values
 */
export const calculateLevelDisplay = (
  levelUp: any,
  simulatedLevelData: any,
  xpEarned: number
) => {
  // Estimate a realistic user level range based on earned XP
  const estimatedBaseLevel = Math.max(5, Math.ceil(xpEarned / 50));
  
  // Get level numbers with sensible defaults
  const oldLevel = levelUp?.oldLevel ?? simulatedLevelData?.oldLevel ?? estimatedBaseLevel;
  const newLevel = levelUp?.newLevel ?? simulatedLevelData?.newLevel ?? (oldLevel + 1);
  
  return { oldLevel, newLevel };
}; 