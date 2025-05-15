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
    requestedPositions = ['Standing', 'Sitting', 'Lying'];
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

  // Debug logging
  console.log(`[DEBUG] Generating routine for area: ${area}, position: ${position}, duration: ${duration}`);
  console.log(`[DEBUG] Total stretches: ${stretches.length}`);
  console.log(`[DEBUG] Filtered by area, premium status, and demo availability: ${filteredStretches.length}`);
  console.log(`[DEBUG] Premium stretches unlocked: ${premiumUnlocked}`);
  console.log(`[DEBUG] Dynamic Flow: ${isDynamicFlow}`);
  console.log(`[DEBUG] Transition duration: ${transitionDuration || 0} seconds`);
  
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
  
  console.log(`[DEBUG] Final routine: ${routine.length} stretches, total duration: ${totalDuration}s`);
  console.log(`[DEBUG] Routine positions: ${routine.filter(s => !('isTransition' in s)).map(s => (s as Stretch).position).join(', ')}`);
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
  const premiumStretches = stretches.filter(stretch => 
    stretch.premium && 
    stretch.hasDemo === true // Only include stretches with demo videos
  );
  
  if (premiumStretches.length <= sampleSize) {
    return premiumStretches;
  }
  
  return shuffleArray(premiumStretches).slice(0, sampleSize);
};

// Keyword mappings for body areas
const bodyAreaKeywords: Record<string, BodyArea> = {
  'neck': 'Neck',
  'back': 'Lower Back',
  'upper back': 'Upper Back & Chest',
  'lower back': 'Lower Back',
  'shoulder': 'Shoulders & Arms',
  'shoulders': 'Shoulders & Arms',
  'arm': 'Shoulders & Arms',
  'arms': 'Shoulders & Arms',
  'leg': 'Hips & Legs',
  'legs': 'Hips & Legs',
  'hip': 'Hips & Legs',
  'hips': 'Hips & Legs',
  'chest': 'Upper Back & Chest',
  'whole': 'Full Body',
  'full': 'Full Body',
  'body': 'Full Body',
};

// Keyword mappings for issues
const issueKeywords: Record<string, IssueType> = {
  'stiff': 'stiffness',
  'tight': 'stiffness',
  'tense': 'stiffness',
  'pain': 'pain',
  'hurt': 'pain',
  'sore': 'pain',
  'ache': 'pain',
  'tired': 'tiredness',
  'fatigue': 'tiredness',
  'exhausted': 'tiredness',
  'flexible': 'flexibility',
  'stretch': 'flexibility',
};

// Activity keywords that indicate non-desk activity
const activityKeywords = [
  'run', 'running', 'jog', 'jogging',
  'workout', 'exercise', 'training',
  'gym', 'sports', 'practice',
  'bike', 'cycling', 'ride',
];

// Position keywords - added to help parse user intent for position
const positionKeywords: Record<string, Position> = {
  'stand': 'Standing',
  'standing': 'Standing',
  'upright': 'Standing',
  'sit': 'Sitting',
  'sitting': 'Sitting',
  'chair': 'Sitting',
  'seated': 'Sitting',
  'lie': 'Lying',
  'lying': 'Lying',
  'floor': 'Lying',
  'mat': 'Lying',
  'bed': 'Lying',
  'ground': 'Lying',
  'down': 'Lying'
};

export const parseUserInput = (input: string): SmartRoutineInput => {
  // Define keywords for different body areas with more synonyms and variations
  const areaKeywords: { [key: string]: BodyArea } = {
    // Neck
    'neck': 'Neck',
    'throat': 'Neck',
    'cervical': 'Neck',
    
    // Shoulders & Arms
    'shoulder': 'Shoulders & Arms',
    'deltoid': 'Shoulders & Arms',
    'arm': 'Shoulders & Arms',
    'elbow': 'Shoulders & Arms',
    'wrist': 'Shoulders & Arms',
    'hand': 'Shoulders & Arms',
    'finger': 'Shoulders & Arms',
    'bicep': 'Shoulders & Arms',
    'tricep': 'Shoulders & Arms',
    'forearm': 'Shoulders & Arms',
    
    // Upper Back & Chest
    'upper back': 'Upper Back & Chest',
    'thoracic': 'Upper Back & Chest',
    'chest': 'Upper Back & Chest',
    'pectoral': 'Upper Back & Chest',
    'pec': 'Upper Back & Chest',
    'trap': 'Upper Back & Chest',
    'traps': 'Upper Back & Chest',
    'trapezius': 'Upper Back & Chest',
    'posture': 'Upper Back & Chest',
    'slouch': 'Upper Back & Chest',
    
    // Lower Back
    'lower back': 'Lower Back',
    'lumbar': 'Lower Back',
    'spine': 'Lower Back',
    'back pain': 'Lower Back',
    'sciatic': 'Lower Back',
    'sciatica': 'Lower Back',
    
    // Hips & Legs
    'hip': 'Hips & Legs',
    'leg': 'Hips & Legs',
    'thigh': 'Hips & Legs',
    'quad': 'Hips & Legs',
    'quadricep': 'Hips & Legs',
    'hamstring': 'Hips & Legs',
    'calf': 'Hips & Legs',
    'calves': 'Hips & Legs',
    'knee': 'Hips & Legs',
    'ankle': 'Hips & Legs',
    'foot': 'Hips & Legs',
    'feet': 'Hips & Legs',
    'toe': 'Hips & Legs',
    'glute': 'Hips & Legs',
    'gluteal': 'Hips & Legs',
    'piriformis': 'Hips & Legs',
    'it band': 'Hips & Legs',
    'iliotibial': 'Hips & Legs',
    
    // Full Body
    'full': 'Full Body',
    'body': 'Full Body',
    'whole': 'Full Body',
    'entire': 'Full Body',
    'all over': 'Full Body',
    'everything': 'Full Body',
    'head to toe': 'Full Body',
  };

  // Keywords for issues with more variations and context
  const issueKeywords: { [key: string]: IssueType } = {
    // Stiffness
    'stiff': 'stiffness',
    'tight': 'stiffness',
    'tense': 'stiffness',
    'rigid': 'stiffness',
    'restricted': 'stiffness',
    'limited': 'stiffness',
    'stuck': 'stiffness',
    'lock': 'stiffness',
    'locked': 'stiffness',
    'knot': 'stiffness',
    'knotted': 'stiffness',
    'cramped': 'stiffness',
    
    // Pain
    'pain': 'pain',
    'ache': 'pain',
    'hurt': 'pain',
    'sore': 'pain',
    'tender': 'pain',
    'discomfort': 'pain',
    'irritation': 'pain',
    'sharp': 'pain',
    'shooting': 'pain',
    'throbbing': 'pain',
    'burning': 'pain',
    
    // Tiredness
    'tired': 'tiredness',
    'fatigue': 'tiredness',
    'exhaust': 'tiredness',
    'worn': 'tiredness',
    'drained': 'tiredness',
    'lethargic': 'tiredness',
    'sluggish': 'tiredness',
    'weary': 'tiredness',
    'weak': 'tiredness',
    'recover': 'tiredness',
    'recovery': 'tiredness',
    'rest': 'tiredness',
    
    // Flexibility
    'stretch': 'flexibility',
    'flexible': 'flexibility',
    'mobility': 'flexibility',
    'loosen': 'flexibility',
    'limber': 'flexibility',
    'supple': 'flexibility',
    'agile': 'flexibility',
    'range of motion': 'flexibility',
    'rom': 'flexibility',
  };

  // Keywords for activities with more variations
  const activityKeywords: { [key: string]: string } = {
    // Running
    'running': 'running',
    'run': 'running',
    'jogging': 'running',
    'jog': 'running',
    'sprint': 'running',
    
    // Cycling
    'cycling': 'cycling',
    'cycle': 'cycling',
    'biking': 'cycling',
    'bike': 'cycling',
    'spinning': 'cycling',
    
    // Swimming
    'swimming': 'swimming',
    'swim': 'swimming',
    'pool': 'swimming',
    
    // General workouts
    'workout': 'working out',
    'exercise': 'working out',
    'training': 'working out',
    'gym': 'working out',
    'cardio': 'working out',
    'weights': 'working out',
    'lifting': 'weight lifting',
    'lift': 'weight lifting',
    'strength': 'weight lifting',
    
    // Other activities
    'yoga': 'yoga',
    'pilates': 'pilates',
    'hiking': 'hiking',
    'hike': 'hiking',
    'walking': 'walking',
    'walk': 'walking',
    'tennis': 'tennis',
    'golf': 'golf',
    'basketball': 'basketball',
    'soccer': 'soccer',
    'football': 'football',
    'hockey': 'hockey',
    'baseball': 'baseball',
    'volleyball': 'volleyball',
    'climbing': 'climbing',
    'dance': 'dancing',
    'dancing': 'dancing',
    
    // Computer/desk related 
    'sitting': 'sitting',
    'computer': 'desk work',
    'desk': 'desk work',
    'typing': 'desk work',
    'coding': 'desk work',
    'gaming': 'gaming',
    'driving': 'driving',
    'commuting': 'commuting',
  };

  // Specific contexts to help with disambiguating
  const contextPatterns: { [key: string]: { area?: BodyArea, issue?: IssueType, activity?: string, position?: Position } } = {
    'hunched over': { area: 'Upper Back & Chest', issue: 'stiffness' },
    'slumped': { area: 'Upper Back & Chest', issue: 'stiffness' },
    'rounded shoulders': { area: 'Upper Back & Chest', issue: 'stiffness' },
    'text neck': { area: 'Neck', issue: 'stiffness' },
    'tech neck': { area: 'Neck', issue: 'stiffness' },
    'poor posture': { area: 'Upper Back & Chest', issue: 'stiffness' },
    'desk job': { activity: 'desk work', position: 'Sitting' },
    'office work': { activity: 'desk work', position: 'Sitting' },
    'woke up': { issue: 'stiffness' },
    'morning': { issue: 'stiffness' },
    'before bed': { issue: 'tiredness', position: 'Lying' },
    'quick stretch': { issue: 'flexibility' },
    'cool down': { issue: 'tiredness' },
    'warm up': { issue: 'flexibility' },
    'at my desk': { position: 'Sitting' },
    'on the floor': { position: 'Lying' },
    'standing up': { position: 'Standing' },
    'standing desk': { position: 'Standing' },
  };

  const lowercaseInput = input.toLowerCase();
  console.log('Parsing input:', lowercaseInput);

  // Find body areas
  const parsedArea: BodyArea[] = [];
  Object.entries(areaKeywords).forEach(([keyword, area]) => {
    if (lowercaseInput.includes(keyword)) {
      if (!parsedArea.includes(area)) {
        parsedArea.push(area);
      }
    }
  });

  // Find issue types
  let parsedIssue: IssueType | null = null;
  Object.entries(issueKeywords).forEach(([keyword, issue]) => {
    if (lowercaseInput.includes(keyword)) {
      parsedIssue = issue;
    }
  });

  // Find activities
  let parsedActivity: string | null = null;
  for (const [keyword, activity] of Object.entries(activityKeywords)) {
    if (lowercaseInput.includes(keyword)) {
      parsedActivity = activity;
      break;
    }
  }
  
  // Find preferred position
  let parsedPosition: Position | null = null;
  for (const [keyword, position] of Object.entries(positionKeywords)) {
    if (lowercaseInput.includes(keyword)) {
      parsedPosition = position;
      break;
    }
  }

  // Check for specific context patterns
  for (const [pattern, context] of Object.entries(contextPatterns)) {
    if (lowercaseInput.includes(pattern)) {
      if (context.area && !parsedArea.includes(context.area)) {
        parsedArea.push(context.area);
      }
      if (context.issue && !parsedIssue) {
        parsedIssue = context.issue;
      }
      if (context.activity && !parsedActivity) {
        parsedActivity = context.activity;
      }
      if (context.position && !parsedPosition) {
        parsedPosition = context.position;
      }
    }
  }

  // Fallbacks if we couldn't determine key information
  if (parsedArea.length === 0) {
    // Default to Full Body if no specific area is mentioned
    parsedArea.push('Full Body');
  }

  // If no specific issue is mentioned, try to infer from other clues
  if (!parsedIssue) {
    if (parsedActivity) {
      // If they mentioned an activity but no issue, assume flexibility
      parsedIssue = 'flexibility';
    } else if (lowercaseInput.includes('all day') || 
               lowercaseInput.includes('long time') || 
               lowercaseInput.includes('hours')) {
      // If they mentioned sitting/working for a long time, assume stiffness
      parsedIssue = 'stiffness';
    } else {
      // Default fallback
      parsedIssue = 'stiffness';
    }
  }
  
  // Default position based on activity or other clues
  if (!parsedPosition) {
    // If they mention desk work or sitting, default to sitting position
    if (parsedActivity === 'desk work' || lowercaseInput.includes('desk') || 
        lowercaseInput.includes('sitting') || lowercaseInput.includes('chair')) {
      parsedPosition = 'Sitting';
    } else if (parsedActivity === 'yoga' || lowercaseInput.includes('floor') || 
               lowercaseInput.includes('mat') || lowercaseInput.includes('lying')) {
      parsedPosition = 'Lying';
    } else {
      parsedPosition = 'Standing';
    }
  }

  console.log('Parsed results:', {
    parsedArea,
    parsedIssue,
    parsedActivity,
    parsedPosition
  });

  return {
    rawInput: input,
    parsedArea,
    parsedIssue,
    parsedActivity,
    parsedPosition,
  };
};

export const generateRoutineConfig = (
  input: SmartRoutineInput,
  selectedIssue: IssueType,
  selectedDuration: Duration,
  transitionDuration?: number
): SmartRoutineConfig => {
  // Determine body areas - ensure we're working with valid BodyArea types
  const areas: BodyArea[] = input.parsedArea && input.parsedArea.length > 0 ? 
    input.parsedArea as BodyArea[] : ['Full Body' as BodyArea];
  
  console.log('Generating routine for areas:', areas);
  
  // Determine stretch position based on issue and input
  let position: Position;
  
  // If the user specified a position in their input, use that
  if (input.parsedPosition) {
    position = input.parsedPosition;
  } else if (selectedIssue === 'pain') {
    // For pain, prefer sitting or lying positions
    position = Math.random() > 0.5 ? 'Sitting' : 'Lying';
  } else if (selectedIssue === 'stiffness') {
    // For stiffness, prefer standing or sitting
    position = Math.random() > 0.5 ? 'Standing' : 'Sitting';
  } else if (selectedIssue === 'tiredness') {
    // For tiredness, prefer lying positions
    position = 'Lying';
  } else {
    // Default for flexibility or other issues
    position = 'Standing';
  }
  
  // Determine if routine should be desk-friendly
  const isDeskFriendly = !input.parsedActivity;
  
  console.log(`Generated config: position=${position}, duration=${selectedDuration}, desk-friendly=${isDeskFriendly}, transition=${transitionDuration || 0}s`);
  
  return {
    areas,
    duration: selectedDuration,
    position,
    issueType: selectedIssue,
    isDeskFriendly,
    postActivity: input.parsedActivity,
    transitionDuration
  };
};

export const selectStretches = (
  config: SmartRoutineConfig,
  availableStretches: Stretch[],
): (Stretch | TransitionPeriod)[] => {
  // Filter stretches by area and demo availability first
  let filtered = availableStretches.filter(stretch =>
    config.areas.some(area => stretch.tags.includes(area)) &&
    stretch.hasDemo === true // Only include stretches with demo videos
  );
  
  // Then filter by position if not set to "All"
  if (config.position !== 'All') {
    const positionFiltered = filtered.filter(stretch => stretch.position === config.position);

    if (positionFiltered.length > 0) {
      // Always use only the stretches that match the requested position.
      filtered = positionFiltered;
    } else {
      // As an absolute fallback (no stretches with the requested position), keep previous filtered list
      // but log the situation for debugging. This prevents the routine from being empty.
      console.warn(`[WARN] No stretches found for position ${config.position}. Falling back to any position.`);
    }
  }
  
  // If no stretches match the criteria, fall back to any position for these areas
  if (filtered.length === 0) {
    console.log('No stretches found for specific area and position combination, falling back to any position');
    filtered = availableStretches.filter(stretch =>
      config.areas.some(area => stretch.tags.includes(area)) &&
      stretch.hasDemo === true // Only include stretches with demo videos
    );
  }
  
  // If still no matches, use Full Body stretches
  if (filtered.length === 0) {
    console.log('No stretches found for areas, falling back to Full Body');
    filtered = availableStretches.filter(stretch =>
      stretch.tags.includes('Full Body') &&
      stretch.hasDemo === true // Only include stretches with demo videos
    );
  }
  
  // Final fallback - just use any stretches with demos
  if (filtered.length === 0) {
    console.log('Using all stretches with demos as fallback');
    filtered = availableStretches.filter(stretch => 
      stretch.hasDemo === true
    );
  }
  
  // If desk-friendly is required, prioritize those stretches
  if (config.isDeskFriendly) {
    // Just prioritize non-bilateral stretches, don't filter out completely
    const deskFriendly = filtered.filter(stretch => !stretch.bilateral);
    if (deskFriendly.length > 0) {
      filtered = deskFriendly;
    }
  }
  
  // Prioritize stretches that match the requested position (if not "All")
  if (config.position !== 'All') {
    // Sort the filtered stretches so that the ones matching the requested position come first
    filtered.sort((a, b) => {
      if (a.position === config.position && b.position !== config.position) return -1;
      if (a.position !== config.position && b.position === config.position) return 1;
      return 0;
    });
  }
  
  // Shuffle the filtered stretches
  filtered = shuffleArray(filtered);
  
  // Calculate target duration based on selected duration
  // Use the appropriate range: 5 mins (3-5 mins), 10 mins (6-10 mins), 15 mins (11-15 mins)
  const selectedDuration = parseInt(config.duration);
  let minDuration: number;
  let maxDuration: number;
  
  switch (selectedDuration) {
    case 5:
      minDuration = 3 * 60; // 3 minutes in seconds
      maxDuration = 5 * 60; // 5 minutes in seconds
      break;
    case 10:
      minDuration = 6 * 60; // 6 minutes in seconds
      maxDuration = 10 * 60; // 10 minutes in seconds
      break;
    case 15:
      minDuration = 11 * 60; // 11 minutes in seconds
      maxDuration = 15 * 60; // 15 minutes in seconds
      break;
    default:
      // For any other duration, use 80-100% of the requested time
      minDuration = selectedDuration * 60 * 0.8;
      maxDuration = selectedDuration * 60;
  }
  
  // Select stretches to fill the time
  const selectedItems: (Stretch | TransitionPeriod)[] = [];
  let currentDuration = 0;
  
  // First pass: try to get at least to the minimum duration
  for (const stretch of filtered) {
    if (currentDuration >= minDuration) break;
    
    // Add transition before the stretch if needed (except for the first stretch)
    if (config.transitionDuration && config.transitionDuration > 0 && selectedItems.length > 0) {
      const transition: TransitionPeriod = {
        id: `transition-${selectedItems.length}`,
        name: "Transition",
        description: "Get ready for the next stretch",
        duration: config.transitionDuration,
        isTransition: true
      };
      
      selectedItems.push(transition);
      currentDuration += config.transitionDuration;
    }
    
    const stretchDuration = stretch.bilateral ? stretch.duration * 2 : stretch.duration;
    selectedItems.push(stretch);
    currentDuration += stretchDuration;
  }
  
  // Second pass: add more stretches if we're below max duration and have more available
  if (currentDuration < maxDuration) {
    for (const stretch of filtered) {
      // Skip stretches we've already added
      if (selectedItems.some(item => !('isTransition' in item) && (item as Stretch).id === stretch.id)) continue;
      
      const stretchDuration = stretch.bilateral ? stretch.duration * 2 : stretch.duration;
      
      // Account for transition time if needed
      const transitionTime = config.transitionDuration && config.transitionDuration > 0 ? config.transitionDuration : 0;
      const totalTimeNeeded = stretchDuration + transitionTime;
      
      // Only add if it doesn't push us far beyond the max duration
      if (currentDuration + totalTimeNeeded <= maxDuration * 1.1) {
        // Add transition before the stretch
        if (transitionTime > 0) {
          const transition: TransitionPeriod = {
            id: `transition-${selectedItems.length}`,
            name: "Transition",
            description: "Get ready for the next stretch",
            duration: transitionTime,
            isTransition: true
          };
          
          selectedItems.push(transition);
          currentDuration += transitionTime;
        }
        
        selectedItems.push(stretch);
        currentDuration += stretchDuration;
      }
      
      if (currentDuration >= maxDuration) break;
    }
  }
  
  // Make sure we have at least one stretch
  if (selectedItems.filter(item => !('isTransition' in item)).length === 0 && filtered.length > 0) {
    selectedItems.push(filtered[0]);
  }
  
  console.log(`Selected ${selectedItems.filter(item => !('isTransition' in item)).length} stretches for smart routine (${Math.round(currentDuration/60)} minutes)`);
  console.log(`Selected positions: ${selectedItems.filter(item => !('isTransition' in item)).map(s => (s as Stretch).position).join(', ')}`);
  console.log(`Added ${selectedItems.filter(item => 'isTransition' in item).length} transition periods (${config.transitionDuration || 0}s each)`);
  
  return selectedItems;
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