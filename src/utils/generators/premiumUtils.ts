import { Stretch, RestPeriod } from '../../types';
import * as rewardManager from '../progress/modules/rewardManager';
import { markAsVideo } from './routineGenerator';

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
      // Skip rest periods with minimal copy
      if ('isRest' in item) {
        return { ...item };
      }
      
      // For stretches, create a fresh copy first
      const copy = { ...item } as Stretch;
      
      // Handle image in a safe way
      try {
        if (copy.image) {
          // If image is a number (local asset), keep it as is
          if (typeof copy.image === 'number') {
            // Leave it untouched
          }
          // For objects, we need to be careful
          else if (typeof copy.image === 'object' && copy.image !== null) {
            const imgObj = copy.image as any;
            
            // For video marked objects, create a new object with same properties
            if (imgObj.__video === true) {
              // Create a safe copy that preserves the __video flag
              const newImgObj: any = {};
              // Copy all keys except uri (which might be frozen)
              Object.keys(imgObj).forEach(key => {
                if (key !== 'uri') {
                  newImgObj[key] = imgObj[key];
                }
              });
              
              // If there's a uri, handle it separately
              if (imgObj.uri && typeof imgObj.uri === 'string') {
                newImgObj.uri = imgObj.uri;
              }
              
              // __asset needs special handling
              if (imgObj.__asset !== undefined) {
                newImgObj.__asset = imgObj.__asset;
              }
              
              copy.image = newImgObj;
            }
            // For regular image objects with URI
            else if (imgObj.uri && typeof imgObj.uri === 'string') {
              // Create a new image object with the processed URI
              let processedUri = imgObj.uri;
              
              // Clean up the URI if needed
              if (processedUri.includes(' ')) {
                processedUri = processedUri.replace(/ /g, '+');
              }
              
              // Handle placeholder URIs
              if (processedUri.includes('placeholder.com') && processedUri.includes('text=')) {
                const textPart = processedUri.split('text=')[1];
                if (textPart && !textPart.includes('%')) {
                  processedUri = processedUri.split('text=')[0] + 'text=' + encodeURIComponent(decodeURIComponent(textPart));
                }
              }
              
              copy.image = { uri: processedUri };
            }
            // Default case - create a fallback image
            else {
              copy.image = { 
                uri: `https://via.placeholder.com/350x350/FF9800/FFFFFF?text=${encodeURIComponent(copy.name || 'Stretch')}` 
              };
            }
          }
          // Default case for non-object, non-number
          else {
            copy.image = { 
              uri: `https://via.placeholder.com/350x350/FF9800/FFFFFF?text=${encodeURIComponent(copy.name || 'Stretch')}` 
            };
          }
        }
        // If no image at all
        else {
          copy.image = { 
            uri: `https://via.placeholder.com/350x350/FF9800/FFFFFF?text=${encodeURIComponent(copy.name || 'Stretch')}` 
          };
        }
      } catch (imageError) {
        console.warn(`Error processing image for stretch ${copy.name}:`, imageError);
        // Provide a fallback image
        copy.image = { 
          uri: `https://via.placeholder.com/350x350/FF0000/FFFFFF?text=${encodeURIComponent('Error: ' + (copy.name || 'Stretch'))}` 
        };
      }
      
      // For premium stretches, add VIP badge
      if (copy.premium) {
        // Create a level-based badge color
        let vipBadgeColor = '#FFD700'; // Default gold
        if (copy.level === 'advanced') {
          vipBadgeColor = '#FF5722'; // Deep orange for advanced
        } else if (copy.level === 'intermediate') {
          vipBadgeColor = '#FF9800'; // Orange for intermediate
        }
        
        return {
          ...copy,
          isPremium: true,
          vipBadgeColor
        };
      }
      
      // Regular stretches
      return copy;
    });
    
    console.log(`Enhanced routine complete with ${enhancedRoutine.length} items`);
    return enhancedRoutine;
  } catch (error) {
    console.error('Error enhancing routine with premium info:', error);
    // If enhancement fails, return a defensive copy of the original routine
    return routine.map(item => ({...item}));
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
  let enhancedStretches = premiumStretches.map(stretch => {
    // Create a copy with premium info
    const enhancedStretch = {
      ...stretch,
      isPremium: true,
      vipBadgeColor: stretch.level === 'advanced' ? '#FF5722' : 
                     stretch.level === 'intermediate' ? '#FF9800' : '#FFD700',
    };
    
    // Ensure image is properly marked as video if it's a video source
    if (enhancedStretch.image) {
      // Check if image already has __video flag
      if (typeof enhancedStretch.image === 'object' && 
          enhancedStretch.image !== null && 
          !(enhancedStretch.image as any).__video) {
        
        // Check if it's a MP4 or MOV file
        if (typeof enhancedStretch.image === 'object' && 
            'uri' in enhancedStretch.image && 
            typeof enhancedStretch.image.uri === 'string' && 
            (enhancedStretch.image.uri.toLowerCase().endsWith('.mp4') || 
             enhancedStretch.image.uri.toLowerCase().endsWith('.mov'))) {
          enhancedStretch.image = markAsVideo(enhancedStretch.image);
        }
      }
    }
    
    return enhancedStretch;
  });
  
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
      
      // Create a new stretch with the same image but marked as video if needed
      const newStretch = {
        ...original,
        id: `${original.id}-premium-${enhancedStretches.length}`,
        name: `${newArea} ${newSuffix}`,
        level: newLevel,
        tags: [newArea], // Keep only valid BodyArea tags
        isPremium: true,
        vipBadgeColor: newLevel === 'advanced' ? '#FF5722' : 
                       newLevel === 'intermediate' ? '#FF9800' : '#FFD700',
      };
      
      // Ensure video is properly marked
      if (newStretch.image && typeof newStretch.image === 'object') {
        // Try to use markAsVideo if it's not already marked
        if (!(newStretch.image as any).__video) {
          newStretch.image = markAsVideo(newStretch.image);
        }
      }
      
      enhancedStretches.push(newStretch);
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