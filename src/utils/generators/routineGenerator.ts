import stretches from '../../data/stretches';
import { BodyArea, Duration, Stretch, StretchLevel, RestPeriod, IssueType, SmartRoutineInput, SmartRoutineConfig } from '../../types';
import * as rewardManager from '../progress/modules/rewardManager';

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

  // Filter by area, premium status and demo availability
  let filteredStretches = stretches.filter(stretch => 
    (stretch.tags.includes(area) || 
    (area === 'Full Body' && stretch.tags.some(tag => tag !== 'Full Body'))) &&
    (!stretch.premium || premiumUnlocked) && // Filter out premium stretches if not unlocked
    stretch.hasDemo === true // Only include stretches with demo videos
  );

  // Debug logging
  console.log(`[DEBUG] Generating routine for area: ${area}, level: ${level}, duration: ${duration}`);
  console.log(`[DEBUG] Total stretches: ${stretches.length}`);
  console.log(`[DEBUG] Filtered by area, premium status, and demo availability: ${filteredStretches.length}`);
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
  const contextPatterns: { [key: string]: { area?: BodyArea, issue?: IssueType, activity?: string } } = {
    'hunched over': { area: 'Upper Back & Chest', issue: 'stiffness' },
    'slumped': { area: 'Upper Back & Chest', issue: 'stiffness' },
    'rounded shoulders': { area: 'Upper Back & Chest', issue: 'stiffness' },
    'text neck': { area: 'Neck', issue: 'stiffness' },
    'tech neck': { area: 'Neck', issue: 'stiffness' },
    'poor posture': { area: 'Upper Back & Chest', issue: 'stiffness' },
    'desk job': { activity: 'desk work' },
    'office work': { activity: 'desk work' },
    'woke up': { issue: 'stiffness' },
    'morning': { issue: 'stiffness' },
    'before bed': { issue: 'tiredness' },
    'quick stretch': { issue: 'flexibility' },
    'cool down': { issue: 'tiredness' },
    'warm up': { issue: 'flexibility' },
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

  console.log('Parsed results:', {
    parsedArea,
    parsedIssue,
    parsedActivity
  });

  return {
    rawInput: input,
    parsedArea,
    parsedIssue,
    parsedActivity,
  };
};

export const generateRoutineConfig = (
  input: SmartRoutineInput,
  selectedIssue: IssueType,
  selectedDuration: Duration
): SmartRoutineConfig => {
  // Determine body areas - ensure we're working with valid BodyArea types
  const areas: BodyArea[] = input.parsedArea && input.parsedArea.length > 0 ? 
    input.parsedArea as BodyArea[] : ['Full Body' as BodyArea];
  
  console.log('Generating routine for areas:', areas);
  
  // Determine stretch level based on issue
  let level: StretchLevel;
  switch (selectedIssue) {
    case 'pain':
      level = 'beginner';
      break;
    case 'stiffness':
      level = Math.random() > 0.5 ? 'beginner' : 'intermediate';
      break;
    case 'tiredness':
      level = 'beginner';
      break;
    case 'flexibility':
      level = Math.random() > 0.5 ? 'intermediate' : 'advanced';
      break;
    default:
      level = 'beginner';
  }
  
  // Determine if routine should be desk-friendly
  const isDeskFriendly = !input.parsedActivity;
  
  console.log(`Generated config: level=${level}, duration=${selectedDuration}, desk-friendly=${isDeskFriendly}`);
  
  return {
    areas,
    duration: selectedDuration,
    level,
    issueType: selectedIssue,
    isDeskFriendly,
    postActivity: input.parsedActivity,
  };
};

export const selectStretches = (
  config: SmartRoutineConfig,
  availableStretches: Stretch[],
): Stretch[] => {
  // Filter stretches by area, level, and demo availability
  let filtered = availableStretches.filter(stretch =>
    config.areas.some(area => stretch.tags.includes(area)) &&
    stretch.level === config.level &&
    stretch.hasDemo === true // Only include stretches with demo videos
  );
  
  // If no stretches match the criteria, fall back to any stretches for these areas
  if (filtered.length === 0) {
    console.log('No stretches found for specific level, falling back to any level');
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
  
  // Shuffle the filtered stretches
  filtered.sort(() => Math.random() - 0.5);
  
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
  const selectedStretches: Stretch[] = [];
  let currentDuration = 0;
  
  // First pass: try to get at least to the minimum duration
  for (const stretch of filtered) {
    if (currentDuration >= minDuration) break;
    
    const stretchDuration = stretch.bilateral ? stretch.duration * 2 : stretch.duration;
    selectedStretches.push(stretch);
    currentDuration += stretchDuration;
  }
  
  // Second pass: add more stretches if we're below max duration and have more available
  if (currentDuration < maxDuration) {
    for (const stretch of filtered) {
      // Skip stretches we've already added
      if (selectedStretches.includes(stretch)) continue;
      
      const stretchDuration = stretch.bilateral ? stretch.duration * 2 : stretch.duration;
      
      // Only add if it doesn't push us far beyond the max duration
      if (currentDuration + stretchDuration <= maxDuration * 1.1) {
        selectedStretches.push(stretch);
        currentDuration += stretchDuration;
      }
      
      if (currentDuration >= maxDuration) break;
    }
  }
  
  // Make sure we have at least one stretch
  if (selectedStretches.length === 0 && filtered.length > 0) {
    selectedStretches.push(filtered[0]);
  }
  
  console.log(`Selected ${selectedStretches.length} stretches for smart routine (${Math.round(currentDuration/60)} minutes)`);
  return selectedStretches;
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