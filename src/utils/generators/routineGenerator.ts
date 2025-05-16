import stretches from '../../data/stretches';
import { BodyArea, Duration, Stretch, Position, RestPeriod, TransitionPeriod, IssueType, SmartRoutineInput, SmartRoutineConfig } from '../../types';
import * as rewardManager from '../progress/modules/rewardManager';

export const generateRoutine = async (
  area: BodyArea,
  duration: Duration,
  position: Position,
  customStretches?: (Stretch | RestPeriod)[],
  transitionDuration?: number
): Promise<(Stretch | RestPeriod | TransitionPeriod)[]> => {
  // Check if premium stretches are unlocked
  const premiumUnlocked = await rewardManager.isRewardUnlocked('premium_stretches');
  
  // If custom stretches are provided, use them instead of generating a routine
  if (customStretches && customStretches.length > 0) {
    console.log(`[DEBUG] Using ${customStretches.length} custom items for routine`);
    
    // Convert duration to seconds
    const durationMinutes = parseInt(duration, 10);
    const totalSeconds = durationMinutes * 60;
    
    // Calculate total time of custom stretches
    let totalCustomTime = 0;
    const routineWithCustom: (Stretch | RestPeriod | TransitionPeriod)[] = [];
    
    // Add all custom stretches first with transitions if specified
    for (let i = 0; i < customStretches.length; i++) {
      const item = customStretches[i];
      
      // Calculate time for the item
      const itemTime = 'isRest' in item ? 
        item.duration : 
        (item.bilateral ? item.duration * 2 : item.duration);
      
      totalCustomTime += itemTime;
      
      // Add the item to the routine
      routineWithCustom.push(item);
      
      // Add transition after each stretch except the last one
      if (transitionDuration && transitionDuration > 0 && i < customStretches.length - 1) {
        const transition: TransitionPeriod = {
          id: `transition-${i}`,
          name: "Transition",
          description: "Get ready for the next stretch",
          duration: transitionDuration,
          isTransition: true
        };
        
        routineWithCustom.push(transition);
        totalCustomTime += transitionDuration;
      }
    }
    
    // If custom stretches don't fill the duration, add complementary stretches
    if (totalCustomTime < totalSeconds) {
      console.log(`[DEBUG] Custom items only cover ${totalCustomTime}s of ${totalSeconds}s. Adding complementary stretches.`);
      
      // Filter by area and exclude already selected stretches
      const selectedIds = customStretches
        .filter(item => !('isRest' in item))
        .map(item => (item as Stretch).id);
      
      // Filter stretches by area and premium status
      let availableStretches = stretches.filter(stretch => 
        !selectedIds.includes(stretch.id) && 
        (stretch.tags.includes(area) || 
         (area === 'Full Body' && stretch.tags.some(tag => tag !== 'Full Body'))) &&
        (!stretch.premium || premiumUnlocked) && // Filter out premium stretches if not unlocked
        stretch.hasDemo === true // Only include stretches with demo videos
      );
      
      // Shuffle available stretches
      availableStretches = shuffleArray(availableStretches);
      
      // Add stretches until we fill the duration
      let remainingTime = totalSeconds - totalCustomTime;
      
      for (const stretch of availableStretches) {
        // Calculate stretch time (double for bilateral)
        const stretchTime = stretch.bilateral ? stretch.duration * 2 : stretch.duration;
        
        // Account for transition time if needed
        const totalTimeNeeded = stretchTime + (transitionDuration && transitionDuration > 0 && routineWithCustom.length > 0 ? transitionDuration : 0);
        
        // Skip if adding this stretch exceeds total time
        if (totalTimeNeeded > remainingTime) continue;
        
        // Add transition before the stretch if needed
        if (transitionDuration && transitionDuration > 0 && routineWithCustom.length > 0) {
          const transition: TransitionPeriod = {
            id: `transition-${routineWithCustom.length}`,
            name: "Transition",
            description: "Get ready for the next stretch",
            duration: transitionDuration,
            isTransition: true
          };
          
          routineWithCustom.push(transition);
          remainingTime -= transitionDuration;
        }
        
        // Create the stretch entry
        routineWithCustom.push(stretch);
        remainingTime -= stretchTime;
        
        // Break if we've filled the time
        if (remainingTime <= 0) break;
      }
    }
    
    console.log(`[DEBUG] Final custom routine: ${routineWithCustom.length} items`);
    return routineWithCustom;
  }
  
  // Standard routine generation (no custom stretches)
  // Convert duration to seconds
  const durationMinutes = parseInt(duration, 10);
  const totalSeconds = durationMinutes * 60;

  // For Dynamic Flow, we always want all positions
  const isDynamicFlow = area === 'Dynamic Flow';
  
  // Parse position parameter - Handle 'All' or comma-separated list like 'Sitting,Standing'
  let requestedPositions: Position[] = [];
  
  if (position === 'All' || isDynamicFlow) {
    // All positions
    requestedPositions = ['Standing', 'Sitting', 'Lying', "All"];
  } else if (position === 'Sitting,Standing') {
    // Office-friendly: only sitting and standing positions
    requestedPositions = ['Sitting', 'Standing'];
  } else {
    // Single position or custom comma-separated positions
    requestedPositions = position.split(',').map(p => p.trim()) as Position[];
  }

  const singlePositionRequested = requestedPositions.length === 1;

  // Rough estimate: aim for ~35-45 s per stretch including transition
  const avgStretchBlock = 30 + (transitionDuration || 0); // 30 s stretch + transition

  // Stretch count ranges per duration bucket
  const stretchRangeMap: Record<number, { min: number; max: number }> = {
    5: { min: 3, max: 4 },
    10: { min: 6, max: 8 },
    15: { min: 11, max: 15 }
  };

  const { min: minStretches, max: maxStretches } = stretchRangeMap[durationMinutes] || { min: 3, max: Math.max(4, Math.ceil(totalSeconds / avgStretchBlock)) };

  console.log(`[DEBUG] Calculated maxStretches=${maxStretches}`);

  // Filter logic for Dynamic Flow vs regular areas
  let filteredStretches = stretches.filter(stretch => {
    // Always filter by premium status and demo availability
    const hasPremiumAccess = !stretch.premium || premiumUnlocked;
    const hasDemo = stretch.hasDemo === true;
    
    // For Dynamic Flow, only include stretches with the Dynamic Flow tag
    if (isDynamicFlow) {
      return stretch.tags.includes('Dynamic Flow') && hasPremiumAccess && hasDemo;
    }
    
    // For regular areas
    return (stretch.tags.includes(area) || 
           (area === 'Full Body' && stretch.tags.some(tag => tag !== 'Full Body'))) &&
           hasPremiumAccess && hasDemo;
  });
  
  const standingCount = filteredStretches.filter(s => s.position === 'Standing').length;
  const sittingCount = filteredStretches.filter(s => s.position === 'Sitting').length;
  const lyingCount = filteredStretches.filter(s => s.position === 'Lying').length;
  
  console.log(`[DEBUG] Available stretches by position - Standing: ${standingCount}, Sitting: ${sittingCount}, Lying: ${lyingCount}`);

  // For Dynamic Flow, don't filter by position
  let selectedStretches: Stretch[];
  if (isDynamicFlow) {
    selectedStretches = filteredStretches;
    console.log(`[DEBUG] Dynamic Flow selected, using all ${selectedStretches.length} dynamic stretches`);
  } else {
    // Filter stretches by requested positions for regular routines
    selectedStretches = filteredStretches.filter(
      stretch => requestedPositions.includes(stretch.position)
    );
    
    console.log(`[DEBUG] Selected ${selectedStretches.length} stretches for positions: ${requestedPositions.join(', ')}`);
    
    // If we have fewer than 3 stretches, add more from other positions as fallback
    if (selectedStretches.length < 3) {
      console.log(`[DEBUG] Not enough stretches (${selectedStretches.length}) for the requested positions. Adding complementary stretches.`);
      const needed = 3 - selectedStretches.length;
      const otherStretches = shuffleArray(filteredStretches.filter(s => !requestedPositions.includes(s.position)));
      const extras = otherStretches.slice(0, needed);
      selectedStretches = [...selectedStretches, ...extras];
      console.log(`[DEBUG] Added ${extras.length} complementary stretches from other positions to reach minimum count`);
    }
  }

  // Shuffle the selected stretches
  selectedStretches = shuffleArray(selectedStretches).slice(0, maxStretches);
  
  console.log(`[DEBUG] After shuffling and limiting: ${selectedStretches.length} stretches`);

  // Build routine dynamically
  let routine: (Stretch | TransitionPeriod)[] = [];
  let totalDuration = 0;
  let indexPtr = 0;

  // Helper for adding a stretch and (optionally) a *following* transition period
  const pushStretch = (stretch: Stretch) => {
    const stretchTime = stretch.bilateral ? stretch.duration * 2 : stretch.duration;

    // Check if we have room for the stretch itself
    if (totalDuration + stretchTime > totalSeconds) return false;

    // Add the stretch first
    routine.push({
      ...stretch,
      duration: stretchTime,
      description: stretch.bilateral
        ? (stretch.description.startsWith('Hold')
            ? stretch.description
            : `${stretch.description.split('Hold')[0].trim()} Hold for ${stretch.duration} seconds per side.`)
        : stretch.description
    });
    totalDuration += stretchTime;

    // Decide whether to add a transition afterwards
    if (transitionDuration && transitionDuration > 0) {
      // Only add if we still have budget for it (leave 3-second buffer)
      if (totalDuration + transitionDuration < totalSeconds - 3) {
        routine.push({
          id: `transition-${routine.length}`,
          name: 'Transition',
          description: 'Get ready for the next stretch',
          duration: transitionDuration,
          isTransition: true
        } as TransitionPeriod);
        totalDuration += transitionDuration;
      }
    }

    return true;
  };

  // Repeat through list until we fill time or iterations exceed safe limit
  const maxIterations = 50; // safety guard
  let iterations = 0;
  while (totalDuration < totalSeconds * 0.95 && iterations < maxIterations) {
    const stretch = selectedStretches[indexPtr % selectedStretches.length];
    // prevent immediate duplicate
    if (routine.length > 0) {
      const lastStretch = routine[routine.length - 1];
      if (!('isTransition' in lastStretch) && (lastStretch as Stretch).id === stretch.id) {
        // skip duplicate by moving pointer
        indexPtr++;
        iterations++;
        continue;
      }
    }

    if (!pushStretch(stretch)) break;

    // Stop if we've reached the target stretch count (transitions not counted)
    const stretchCount = routine.filter(item => !('isTransition' in item)).length;
    if (stretchCount >= maxStretches) {
      console.log(`[DEBUG] Reached max stretch count (${stretchCount}/${maxStretches}), stopping fill loop.`);
      break;
    }

    indexPtr++;
    iterations++;
  }
  
  // If we didn't reach the minimum stretch count, duplicate existing stretches (prioritising primary position) until we do.
  let currentStretchCount = routine.filter(item => !('isTransition' in item)).length;
  if (currentStretchCount < minStretches && selectedStretches.length > 0) {
    console.log(`[DEBUG] Only ${currentStretchCount} stretches after fill, need at least ${minStretches}. Adding duplicates to meet minimum.`);

    const primaryPoolDup = shuffleArray(selectedStretches);
    let dupIndex = 0;
    while (currentStretchCount < minStretches && dupIndex < primaryPoolDup.length) {
      const stretch = primaryPoolDup[dupIndex];
      if (pushStretch(stretch)) {
        currentStretchCount++;
      }
      dupIndex++;
    }
  }
  
  // If we couldn't add any stretches, add at least one
  if (routine.length === 0 && selectedStretches.length > 0) {
    // Prioritize adding a stretch in the requested position if available
    let stretchToAdd = selectedStretches[0];
    
    if (requestedPositions.length === 1) {
      const preferredPositionStretch = selectedStretches.find(s => s.position === requestedPositions[0]);
      if (preferredPositionStretch) {
        stretchToAdd = preferredPositionStretch;
      }
    }
    
    const stretchTime = Math.min(
      stretchToAdd.bilateral ? stretchToAdd.duration * 2 : stretchToAdd.duration,
      totalSeconds
    );
    
    const stretchEntry = {
      ...stretchToAdd,
      duration: stretchTime,
      description: stretchToAdd.bilateral 
        ? `${stretchToAdd.description.split('Hold')[0].trim()} Hold for ${Math.floor(stretchTime/2)} seconds per side.` 
        : stretchToAdd.description
    };
    
    routine.push(stretchEntry);
  }
  
  // Remove trailing transition if routine ends with one (no following stretch)
  if (routine.length > 0 && 'isTransition' in routine[routine.length - 1]) {
    const lastTransition = routine.pop() as TransitionPeriod;
    totalDuration -= lastTransition.duration;
    console.log('[DEBUG] Removed trailing transition at end of routine');
  }
  
  // FINAL SAFETY: strip any stretches whose position somehow slipped outside requestedPositions
  // Only apply this filter for non-Dynamic Flow routines
  if (!isDynamicFlow) {
    routine = routine.filter(item => {
      if ('isTransition' in item) return true;
      return requestedPositions.includes((item as Stretch).position);
    });
  }
  

  return routine;
};

/**
 * Shuffles an array using the Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

/**
 * Get a sample of premium stretches to preview
 * This function returns 5 random premium stretches for users to try in the rewards screen
 */
export const getRandomPremiumStretches = (sampleSize: number = 5): Stretch[] => {
  const premiumStretches = stretches.filter(stretch => 
    stretch.premium && 
    stretch.hasDemo === true // Only include stretches with demo videos
  );
  
  if (premiumStretches.length <= sampleSize) {
    return premiumStretches;
  }
  
  return shuffleArray(premiumStretches).slice(0, sampleSize);
};



/**
 * Helper function to mark an MP4 file as a video source
 * This helps the stretchImage component determine whether to render
 * a Video component or an Image component
 */
export function markAsVideo(source: any): any {
  if (typeof source === 'string') {
    return { uri: source, __video: true };
  } else if (source && typeof source === 'object' && 'uri' in source) {
    return { ...source, __video: true };
  } else if (typeof source === 'number') {
    // Handle number type (asset reference from require())
    // Don't convert to URI object, just add the __video flag to the original
    return { __video: true, __asset: source };
  } else {
    console.warn('Invalid source for markAsVideo, must be a string, number, or {uri: string}');
    // Return a placeholder if needed
    return { uri: '', __video: true };
  }
}