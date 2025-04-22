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
  try {
    console.log(`Enhancing routine with ${routine.length} items`);
    
    // Create a deep copy to avoid mutating the original objects
    const enhancedRoutine = routine.map(item => {
      // Create a clean copy with all properties preserved
      const copy = {...item};
      
      // Skip rest periods
      if ('isRest' in copy) {
        return copy;
      }
      
      // Fix the image property if needed
      if ((copy as Stretch).image) {
        // If image is a required local asset (number type), keep it as is
        if (typeof (copy as Stretch).image === 'number') {
          // Leave the image untouched as it's a local asset
          console.log(`Preserving local image asset for: ${(copy as Stretch).name}`);
        }
        // Check if image is an object with uri property
        else if (typeof (copy as Stretch).image === 'object' && (copy as Stretch).image !== null) {
          const imageObj = (copy as Stretch).image as any;
          
          // If it has a uri property that's a string, validate/fix it
          if (imageObj.uri && typeof imageObj.uri === 'string') {
            // Replace spaces with plus signs in the URI
            if (imageObj.uri.includes(' ')) {
              imageObj.uri = imageObj.uri.replace(/ /g, '+');
            }
            
            // Ensure URI is properly encoded for placeholder
            if (imageObj.uri.includes('placeholder.com')) {
              const textPart = imageObj.uri.split('text=')[1];
              if (textPart && !textPart.includes('%')) {
                imageObj.uri = imageObj.uri.split('text=')[0] + 'text=' + encodeURIComponent(decodeURIComponent(textPart));
              }
            }
          } else {
            // If no uri property, create a fallback
            (copy as Stretch).image = { 
              uri: `https://via.placeholder.com/350x350/FF9800/FFFFFF?text=${encodeURIComponent((copy as Stretch).name || 'Stretch')}` 
            };
          }
        } else {
          // If image is not an object or number, create a valid image object
          (copy as Stretch).image = { 
            uri: `https://via.placeholder.com/350x350/FF9800/FFFFFF?text=${encodeURIComponent((copy as Stretch).name || 'Stretch')}` 
          };
        }
      } else {
        // If no image property at all, create one
        (copy as Stretch).image = { 
          uri: `https://via.placeholder.com/350x350/FF9800/FFFFFF?text=${encodeURIComponent((copy as Stretch).name || 'Stretch')}` 
        };
      }
      
      // For premium stretches, add VIP badge
      if ((copy as Stretch).premium) {
        // Create a level-based badge color
        let vipBadgeColor = '#FFD700'; // Default gold
        if ((copy as Stretch).level === 'advanced') {
          vipBadgeColor = '#FF5722'; // Deep orange for advanced
        } else if ((copy as Stretch).level === 'intermediate') {
          vipBadgeColor = '#FF9800'; // Orange for intermediate
        }
        
        return {
          ...copy,
          isPremium: true,
          vipBadgeColor
        };
      }
      
      // Regular stretches - ensure no properties are lost
      return copy;
    });
    
    console.log(`Enhanced routine complete with ${enhancedRoutine.length} items`);
    return enhancedRoutine;
  } catch (error) {
    console.error('Error enhancing routine with premium info:', error);
    // If enhancement fails, return the original routine
    return routine;
  }
};

/**
 * Get a sample of premium stretches for rewards preview
 * @param count Number of premium stretches to get
 * @returns Array of enhanced premium stretches
 */
export const getPremiumStretchesPreview = async (count: number = 15): Promise<(Stretch & { isPremium: boolean; vipBadgeColor: string })[]> => {
  const premiumStretches = await rewardManager.getSamplePremiumStretches(count);
  
  // Ensure we have a reasonable number of stretches - make duplicates if needed
  let enhancedStretches = premiumStretches.map(stretch => ({
    ...stretch,
    isPremium: true,
    vipBadgeColor: stretch.level === 'advanced' ? '#FF5722' : 
                   stretch.level === 'intermediate' ? '#FF9800' : '#FFD700',
  }));
  
  // If we don't have enough stretches, generate more varied ones to reach desired count
  if (enhancedStretches.length < count && enhancedStretches.length > 0) {
    console.log(`Not enough premium stretches (only ${enhancedStretches.length}, needed ${count}), generating more`);
    
    // Define body areas and levels for variety
    const bodyAreas = ['Full Body', 'Lower Back', 'Upper Back & Chest', 'Neck', 'Hips & Legs', 'Shoulders & Arms'] as const;
    const levels = ['beginner', 'intermediate', 'advanced'] as const;
    
    while (enhancedStretches.length < count) {
      // Get a base stretch to modify
      const originalIndex = enhancedStretches.length % premiumStretches.length;
      const original = premiumStretches[originalIndex];
      
      // Modify to create a new unique stretch
      const newLevel = levels[Math.floor(Math.random() * levels.length)];
      const newArea = bodyAreas[Math.floor(Math.random() * bodyAreas.length)];
      const suffixes = [
        'Deep Stretch', 'Extension', 'Dynamic Hold', 'Release', 'Mobility',
        'Pro Technique', 'Advanced Release', 'Power Hold', 'Flexibility', 'VIP'
      ];
      const newSuffix = suffixes[Math.floor(Math.random() * suffixes.length)];
      
      enhancedStretches.push({
        ...original,
        id: `${original.id}-premium-${enhancedStretches.length}`,
        name: `${newArea} ${newSuffix}`,
        level: newLevel,
        tags: [newArea], // Keep only valid BodyArea tags
        isPremium: true,
        vipBadgeColor: newLevel === 'advanced' ? '#FF5722' : 
                       newLevel === 'intermediate' ? '#FF9800' : '#FFD700',
      });
    }
  }
  
  return enhancedStretches;
};

/**
 * Check if the user has access to premium stretches
 */
export const hasPremiumStretchAccess = async (): Promise<boolean> => {
  return await rewardManager.isRewardUnlocked('premium_stretches');
};

/**
 * Filter stretches based on premium access
 * This removes premium stretches if the user doesn't have access
 */
export const filterPremiumStretches = async (
  stretches: Stretch[], 
  includeLockedPremium: boolean = false
): Promise<Stretch[]> => {
  // If we should include all stretches (for preview purposes), return all
  if (includeLockedPremium) {
    return stretches;
  }
  
  // Check if user has premium access
  const hasPremiumAccess = await hasPremiumStretchAccess();
  
  // If user has premium access, return all stretches
  if (hasPremiumAccess) {
    return stretches;
  }
  
  // Otherwise filter out premium stretches
  return stretches.filter(stretch => !isPremiumStretch(stretch));
};

/**
 * Filter stretches based on level and premium access
 * @param stretches Array of stretches to filter
 * @param level Level to filter by ('beginner', 'intermediate', 'advanced', or 'all')
 * @param includeLockedPremium Whether to include premium stretches even if the user doesn't have access
 * @returns Filtered array of stretches
 */
export const filterStretchesByLevel = async (
  stretches: Stretch[],
  level: string = 'all',
  includeLockedPremium: boolean = false
): Promise<Stretch[]> => {
  // First filter by premium status
  const premiumFiltered = await filterPremiumStretches(stretches, includeLockedPremium);
  
  // If level is 'all', return all stretches that passed the premium filter
  if (level === 'all') {
    return premiumFiltered;
  }
  
  // Otherwise, filter by the specified level
  return premiumFiltered.filter(stretch => stretch.level === level);
};

/**
 * Enhance a stretch with premium indicator information
 * Used when displaying stretches in the UI
 */
export const enhanceWithPremiumInfo = async (
  stretch: Stretch,
  includeLockedInfo: boolean = true
): Promise<Stretch & { isPremium: boolean; isLocked: boolean }> => {
  const hasPremiumAccess = await hasPremiumStretchAccess();
  const isPremium = isPremiumStretch(stretch);
  const isLocked = isPremium && !hasPremiumAccess;
  
  return {
    ...stretch,
    isPremium,
    isLocked: includeLockedInfo ? isLocked : false
  };
};

/**
 * Get premium stretches for preview in the rewards section
 */
export const getPremiumStretchesForPreview = async (
  allStretches: Stretch[],
  count: number = 5
): Promise<(Stretch & { isPremium: boolean; isLocked: boolean })[]> => {
  // Filter to only premium stretches
  const premiumStretches = allStretches.filter(isPremiumStretch);
  
  // Shuffle the array to get random premium stretches
  const shuffled = [...premiumStretches].sort(() => 0.5 - Math.random());
  
  // Take the requested number of stretches
  const selectedStretches = shuffled.slice(0, Math.min(count, shuffled.length));
  
  // Enhance each stretch with premium info
  const enhanced = await Promise.all(
    selectedStretches.map(stretch => enhanceWithPremiumInfo(stretch, true))
  );
  
  return enhanced;
}; 