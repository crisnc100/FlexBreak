/**
 * Mini-game XP calculation utilities
 */

export enum PerformanceTier {
  POOR = 'poor',
  ALRIGHT = 'alright', 
  DECENT = 'decent',
  PERFECT = 'perfect'
}

export interface XPRange {
  min: number;
  max: number;
}

// XP ranges for each performance tier
export const XP_RANGES: Record<PerformanceTier, XPRange> = {
  [PerformanceTier.POOR]: { min: 15, max: 35 },
  [PerformanceTier.ALRIGHT]: { min: 35, max: 55 },
  [PerformanceTier.DECENT]: { min: 55, max: 80 },
  [PerformanceTier.PERFECT]: { min: 80, max: 100 }
};

/**
 * Get random XP within a performance tier
 */
export function getRandomXP(tier: PerformanceTier): number {
  const range = XP_RANGES[tier];
  return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
}

/**
 * Calculate performance tier for Stress Buster
 */
export function getStressBusterTier(score: number): PerformanceTier {
  if (score >= 20) return PerformanceTier.PERFECT;
  if (score >= 15) return PerformanceTier.DECENT;
  if (score >= 10) return PerformanceTier.ALRIGHT;
  return PerformanceTier.POOR;
}

/**
 * Calculate performance tier for Posture Patrol
 */
export function getPosturePatrolTier(waveReached: number, heartsRemaining: number, isVictory: boolean): PerformanceTier {
  console.log('[getPosturePatrolTier] waveReached:', waveReached, 'hearts:', heartsRemaining, 'victory:', isVictory);
  
  // Victory with hearts remaining is perfect
  if (isVictory && heartsRemaining > 0) {
    console.log('[getPosturePatrolTier] Returning PERFECT tier');
    return PerformanceTier.PERFECT;
  }
  
  // Reached wave 4 or kept 2+ hearts is decent
  if (waveReached >= 4 || heartsRemaining >= 2) {
    console.log('[getPosturePatrolTier] Returning DECENT tier');
    return PerformanceTier.DECENT;
  }
  
  // Reached wave 2-3 with any hearts is alright
  if (waveReached >= 2 && heartsRemaining > 0) {
    console.log('[getPosturePatrolTier] Returning ALRIGHT tier');
    return PerformanceTier.ALRIGHT;
  }
  
  // Otherwise poor
  console.log('[getPosturePatrolTier] Returning POOR tier');
  return PerformanceTier.POOR;
}

/**
 * Calculate performance tier for Balance Drop
 */
export function getBalanceDropTier(roundsCompleted: number, finalBalance: number, finalEnergy: number): PerformanceTier {
  // All rounds with high balance/energy is perfect
  if (roundsCompleted >= 5 && finalBalance >= 70 && finalEnergy >= 70) return PerformanceTier.PERFECT;
  
  // Round 4 with decent balance is decent
  if (roundsCompleted >= 4 && finalBalance >= 50) return PerformanceTier.DECENT;
  
  // Round 2-3 is alright
  if (roundsCompleted >= 2) return PerformanceTier.ALRIGHT;
  
  // Otherwise poor
  return PerformanceTier.POOR;
}

/**
 * Calculate performance tier for Wellness Trivia
 */
export function getWellnessTriviaTier(correctAnswers: number): PerformanceTier {
  if (correctAnswers === 5) return PerformanceTier.PERFECT;
  if (correctAnswers === 4) return PerformanceTier.DECENT;
  if (correctAnswers >= 2) return PerformanceTier.ALRIGHT;
  return PerformanceTier.POOR;
}

/**
 * Check if performance is perfect for achievement purposes
 */
export function isPerfectPerformance(tier: PerformanceTier): boolean {
  return tier === PerformanceTier.PERFECT;
}