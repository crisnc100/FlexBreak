import { Stretch, RestPeriod } from '../types';
import * as rewardManager from './progress/modules/rewardManager';

/**
 * Check if an item is a premium stretch
 * @param item The routine item to check
 * @returns True if the item is a premium stretch
 */
export const isPremiumStretch = (item: Stretch | RestPeriod): boolean => {
  if ('isRest' in item) {
    return false;
  }
  
  return !!item.premium;
};

/**
 * Enhance a stretch for display by adding VIP badge information
 * if it's a premium stretch
 * @param stretch The stretch to process
 * @returns The enhanced stretch with VIP badge info
 */
export const enhanceStretchWithPremiumInfo = (
  stretch: Stretch
): Stretch & { isPremium: boolean; vipBadgeColor?: string } => {
  return {
    ...stretch,
    isPremium: !!stretch.premium,
    vipBadgeColor: stretch.premium ? '#FFD700' : undefined, // Gold color for VIP stretches
  };
};

/**
 * Enhance a routine with premium information
 * @param routine The routine to enhance
 * @returns The enhanced routine with premium information
 */
export const enhanceRoutineWithPremiumInfo = async (
  routine: (Stretch | RestPeriod)[]
): Promise<(Stretch | RestPeriod & { isPremium?: boolean; vipBadgeColor?: string })[]> => {
  // Check if premium stretches are unlocked
  const premiumUnlocked = await rewardManager.isRewardUnlocked('premium_stretches');
  
  return routine.map(item => {
    if ('isRest' in item) {
      return item; // Rest periods are never premium
    }
    
    // Only add premium indicators if the premium reward is unlocked
    if (item.premium && premiumUnlocked) {
      return {
        ...item,
        isPremium: true,
        vipBadgeColor: '#FFD700', // Gold color for VIP stretches
      };
    }
    
    return {
      ...item,
      isPremium: false
    };
  });
};

/**
 * Get a sample of premium stretches for rewards preview
 * @param count Number of premium stretches to get
 * @returns Array of enhanced premium stretches
 */
export const getPremiumStretchesPreview = async (count: number = 5): Promise<(Stretch & { isPremium: boolean; vipBadgeColor: string })[]> => {
  const premiumStretches = await rewardManager.getSamplePremiumStretches(count);
  
  return premiumStretches.map(stretch => ({
    ...stretch,
    isPremium: true,
    vipBadgeColor: '#FFD700', // Gold color for VIP stretches
  }));
}; 