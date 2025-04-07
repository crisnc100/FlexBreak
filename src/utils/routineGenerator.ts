import stretches from '../data/stretches';
import { BodyArea, Duration, Stretch, StretchLevel, RestPeriod } from '../types';
import * as rewardManager from './progress/modules/rewardManager';

export const generateRoutine = async (
  area: BodyArea,
  duration: Duration,
  level: StretchLevel,
  customStretches?: (Stretch | RestPeriod)[]
): Promise<(Stretch | RestPeriod)[]> => {
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
    const routineWithCustom: (Stretch | RestPeriod)[] = [];
    
    // Add all custom stretches first
    for (const item of customStretches) {
      // Calculate time for the item
      const itemTime = 'isRest' in item ? 
        item.duration : 
        (item.bilateral ? item.duration * 2 : item.duration);
      
      totalCustomTime += itemTime;
      
      // Add the item to the routine
      routineWithCustom.push(item);
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
        (!stretch.premium || premiumUnlocked) // Filter out premium stretches if not unlocked
      );
      
      // Shuffle available stretches
      availableStretches = shuffleArray(availableStretches);
      
      // Add stretches until we fill the duration
      let remainingTime = totalSeconds - totalCustomTime;
      
      for (const stretch of availableStretches) {
        // Calculate stretch time (double for bilateral)
        const stretchTime = stretch.bilateral ? stretch.duration * 2 : stretch.duration;
        
        // Skip if adding this stretch exceeds total time
        if (stretchTime > remainingTime) continue;
        
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

  // Define max stretch counts
  const maxStretches = { 5: 7, 10: 12, 15: 16 }[durationMinutes] || Math.ceil(durationMinutes / 1.7);

  // Filter by area and premium status
  let filteredStretches = stretches.filter(stretch => 
    (stretch.tags.includes(area) || 
    (area === 'Full Body' && stretch.tags.some(tag => tag !== 'Full Body'))) &&
    (!stretch.premium || premiumUnlocked) // Filter out premium stretches if not unlocked
  );

  // Debug logging
  console.log(`[DEBUG] Generating routine for area: ${area}, level: ${level}, duration: ${duration}`);
  console.log(`[DEBUG] Total stretches: ${stretches.length}`);
  console.log(`[DEBUG] Filtered by area and premium status: ${filteredStretches.length}`);
  console.log(`[DEBUG] Premium stretches unlocked: ${premiumUnlocked}`);
  
  const advancedCount = filteredStretches.filter(s => s.level === 'advanced').length;
  const intermediateCount = filteredStretches.filter(s => s.level === 'intermediate').length;
  const beginnerCount = filteredStretches.filter(s => s.level === 'beginner').length;
  
  console.log(`[DEBUG] Available stretches by level - Advanced: ${advancedCount}, Intermediate: ${intermediateCount}, Beginner: ${beginnerCount}`);

  // Filter and mix stretches by level
  let selectedStretches: Stretch[] = [];
  
  if (level === 'beginner') {
    // Beginners only get beginner stretches
    selectedStretches = filteredStretches.filter(stretch => stretch.level === 'beginner');
    console.log(`[DEBUG] Selected ${selectedStretches.length} beginner stretches`);
  } 
  else if (level === 'intermediate') {
    // Intermediates get mostly intermediate stretches with some beginner ones
    const intermediateStretches = filteredStretches.filter(stretch => stretch.level === 'intermediate');
    const beginnerStretches = filteredStretches.filter(stretch => stretch.level === 'beginner');
    
    // Aim for 70% intermediate, 30% beginner
    const targetIntermediateCount = Math.ceil(maxStretches * 0.7);
    const targetBeginnerCount = Math.floor(maxStretches * 0.3);
    
    console.log(`[DEBUG] Intermediate - Target: ${targetIntermediateCount}, Available: ${intermediateStretches.length}`);
    console.log(`[DEBUG] Beginner - Target: ${targetBeginnerCount}, Available: ${beginnerStretches.length}`);
    
    // Shuffle and take the appropriate number from each level
    selectedStretches = [
      ...shuffleArray(intermediateStretches).slice(0, targetIntermediateCount),
      ...shuffleArray(beginnerStretches).slice(0, targetBeginnerCount)
    ];
    
    console.log(`[DEBUG] Selected ${selectedStretches.length} stretches for intermediate level`);
  } 
  else if (level === 'advanced') {
    // Advanced users get a mix of all levels, with emphasis on advanced
    const advancedStretches = filteredStretches.filter(stretch => stretch.level === 'advanced');
    const intermediateStretches = filteredStretches.filter(stretch => stretch.level === 'intermediate');
    const beginnerStretches = filteredStretches.filter(stretch => stretch.level === 'beginner');
    
    // FIXED: Prioritize advanced stretches - include ALL available advanced stretches first
    // Then fill the remaining slots with intermediate and beginner
    const availableAdvancedCount = advancedStretches.length;
    
    // Calculate how many more stretches we need after including all advanced
    const remainingSlots = Math.max(0, maxStretches - availableAdvancedCount);
    
    // Distribute remaining slots: 70% intermediate, 30% beginner
    const targetIntermediateCount = Math.ceil(remainingSlots * 0.7);
    const targetBeginnerCount = Math.floor(remainingSlots * 0.3);
    
    console.log(`[DEBUG] Advanced - Available: ${availableAdvancedCount} (using all)`);
    console.log(`[DEBUG] Remaining slots: ${remainingSlots}`);
    console.log(`[DEBUG] Intermediate - Target: ${targetIntermediateCount}, Available: ${intermediateStretches.length}`);
    console.log(`[DEBUG] Beginner - Target: ${targetBeginnerCount}, Available: ${beginnerStretches.length}`);
    
    // Include ALL advanced stretches first
    const selectedAdvanced = shuffleArray(advancedStretches);
    const selectedIntermediate = shuffleArray(intermediateStretches).slice(0, targetIntermediateCount);
    const selectedBeginner = shuffleArray(beginnerStretches).slice(0, targetBeginnerCount);
    
    console.log(`[DEBUG] Selected - Advanced: ${selectedAdvanced.length}, Intermediate: ${selectedIntermediate.length}, Beginner: ${selectedBeginner.length}`);
    
    selectedStretches = [
      ...selectedAdvanced,
      ...selectedIntermediate,
      ...selectedBeginner
    ];
    
    console.log(`[DEBUG] Selected ${selectedStretches.length} stretches for advanced level`);
  }

  // Shuffle the selected stretches, but ensure advanced stretches are prioritized if level is advanced
  if (level === 'advanced') {
    // For advanced level, keep advanced stretches at the beginning to ensure they're included
    const advancedStretches = selectedStretches.filter(s => s.level === 'advanced');
    const otherStretches = selectedStretches.filter(s => s.level !== 'advanced');
    
    selectedStretches = [
      ...shuffleArray(advancedStretches),
      ...shuffleArray(otherStretches)
    ];
  } else {
    selectedStretches = shuffleArray(selectedStretches);
  }
  
  // Limit to max stretches
  selectedStretches = selectedStretches.slice(0, maxStretches);
  
  console.log(`[DEBUG] After shuffle and limit: ${selectedStretches.length} stretches`);
  console.log(`[DEBUG] Final stretch levels: ${selectedStretches.map(s => s.level).join(', ')}`);

  // Build routine dynamically
  let routine = [];
  let totalDuration = 0;
  
  // FIXED: Prioritize advanced stretches in the routine
  // Sort selectedStretches to put advanced ones first if level is advanced
  if (level === 'advanced') {
    selectedStretches.sort((a, b) => {
      if (a.level === 'advanced' && b.level !== 'advanced') return -1;
      if (a.level !== 'advanced' && b.level === 'advanced') return 1;
      return 0;
    });
  }
  
  // First pass: add stretches until we reach the time limit
  for (const stretch of selectedStretches) {
    // Calculate stretch time (double for bilateral)
    const stretchTime = stretch.bilateral ? stretch.duration * 2 : stretch.duration;
    
    // Skip if adding this stretch exceeds total time
    if (totalDuration + stretchTime > totalSeconds) continue;
    
    // Create the stretch entry
    const stretchEntry = {
      ...stretch,
      duration: stretchTime, // Set total duration (doubled for bilateral)
      description: stretch.bilateral 
        ? `${stretch.description.split('Hold')[0].trim()} Hold for ${stretch.duration} seconds per side.` 
        : stretch.description // Keep original description for non-bilateral
    };
    
    routine.push(stretchEntry);
    totalDuration += stretchTime;
  }
  
  // If we couldn't add any stretches, add at least one
  if (routine.length === 0 && selectedStretches.length > 0) {
    // For advanced level, prioritize adding an advanced stretch if available
    let stretchToAdd = selectedStretches[0];
    
    if (level === 'advanced') {
      const advancedStretch = selectedStretches.find(s => s.level === 'advanced');
      if (advancedStretch) {
        stretchToAdd = advancedStretch;
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
  
  console.log(`[DEBUG] Final routine: ${routine.length} stretches, total duration: ${totalDuration}s`);
  console.log(`[DEBUG] Routine levels: ${routine.map(s => s.level).join(', ')}`);
  console.log(`[DEBUG] Premium stretches in routine: ${routine.filter(s => (s as Stretch).premium).length}`);

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
  const premiumStretches = stretches.filter(stretch => stretch.premium);
  
  if (premiumStretches.length <= sampleSize) {
    return premiumStretches;
  }
  
  return shuffleArray(premiumStretches).slice(0, sampleSize);
};