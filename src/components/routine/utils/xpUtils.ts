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
  // Only create a simulated level-up if:
  // 1. XP boost is active
  // 2. No real level-up data was provided
  // 3. We received a substantial amount of XP that might reasonably cause a level-up
  if (hasXpBoost && !levelUp && xpEarned >= 50) {
    // Calculate unboosted XP amount for better estimation
    const originalXp = Math.floor(xpEarned / 2);
    
    // More reasonable level estimation based on XP amounts
    // Most users level up around 250-500 XP intervals in early levels
    const baseLevel = Math.max(1, Math.floor(originalXp / 40));
    
    // Only show simulated level-up for reasonable XP values
    const isLikelyToLevelUp = 
      (baseLevel <= 3 && originalXp >= 40) || // Lower levels level up more easily
      (baseLevel <= 5 && originalXp >= 60) || // Mid levels need more XP
      originalXp >= 100; // Higher levels need significant XP
    
    if (isLikelyToLevelUp) {
      // Create a plausible level-up scenario - move up one level
      return {
        simulatedLevelUp: true,
        oldLevel: baseLevel,
        newLevel: baseLevel + 1,
        rewards: [
          {
            id: 'xp_boost_reward',
            name: 'XP Boost Bonus',
            description: 'Your XP boost helped you level up faster!',
            type: 'feature'
          }
        ]
      };
    }
  }
  
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