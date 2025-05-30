import { Stretch, RestPeriod, TransitionPeriod } from '../../types';
import stretches from '../../data/stretches';

// The IDs for the desk break boost stretches as specified in the requirements
const DESK_BREAK_BOOST_STRETCH_IDS = [
  42, 46, 54, 56, 62, 65, 66, 81, 83, 91, 100, 113, 92, 114, 53, 34, 15, 74
];

// Group stretches by area for balanced selection
const STRETCH_CATEGORIES = {
  upperBody: [42, 46, 54, 56, 62, 53], // Upper back, chest, shoulders
  arms: [65, 66], // Wrists, arms
  neck: [81, 83, 91, 92], // Neck stretches
  fullBody: [100, 113, 114] // Full body, stand/chair stretches
};

/**
 * Shuffles an array using Fisher-Yates algorithm
 */
const shuffleArray = <T>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

/**
 * Generates a quick Desk Break Boost routine using the predefined stretches
 * These are optimal stretches for desk office workers that can be done quickly
 * @param transitionDuration Optional duration for transition periods between stretches (in seconds)
 * @returns Array of stretches and transition periods in the Desk Break Boost routine
 */
export const generateDeskBreakBoostRoutine = (transitionDuration?: number): (Stretch | RestPeriod | TransitionPeriod)[] => {
  // Get all available stretches from our predefined list
  const availableStretches = stretches.filter(stretch => 
    DESK_BREAK_BOOST_STRETCH_IDS.includes(typeof stretch.id === 'string' ? parseInt(stretch.id, 10) : stretch.id)
  );
  
  // Randomly decide how many stretches to include (4-6)
  const numberOfStretches = Math.floor(Math.random() * 3) + 4; // 4, 5, or 6
  
  // Create a balanced routine with stretches from different body areas
  const selectedStretchesIds: number[] = [];
  
  // Always include at least one stretch from each category
  Object.values(STRETCH_CATEGORIES).forEach(categoryIds => {
    const shuffledCategory = shuffleArray(categoryIds);
    selectedStretchesIds.push(shuffledCategory[0]);
  });
  
  // Fill the remaining slots with random stretches
  const remainingSlots = numberOfStretches - selectedStretchesIds.length;
  if (remainingSlots > 0) {
    // Get IDs not already selected
    const remainingIds = DESK_BREAK_BOOST_STRETCH_IDS.filter(id => 
      !selectedStretchesIds.includes(id)
    );
    
    // Shuffle and take what we need
    const shuffledRemaining = shuffleArray(remainingIds);
    for (let i = 0; i < Math.min(remainingSlots, shuffledRemaining.length); i++) {
      selectedStretchesIds.push(shuffledRemaining[i]);
    }
  }
  
  // Shuffle the final selection to randomize the order
  const shuffledFinalIds = shuffleArray(selectedStretchesIds);
  
  // Get the actual stretch objects
  const selectedStretches = shuffledFinalIds
    .map(id => availableStretches.find(s => 
      (typeof s.id === 'string' ? parseInt(s.id, 10) : s.id) === id
    ))
    .filter(Boolean) as Stretch[];
  
  // For bilateral stretches that require choosing one side, randomly pick a side
  const routineStretches = selectedStretches.map(stretch => {
    // For stretches that are bilateral and have longer durations,
    // we'll pick just one side to focus on for brevity
    if (stretch.bilateral && (stretch.id === 100 || stretch.id === 115 || stretch.id === 92)) {
      return {
        ...stretch,
        description: stretch.description.replace('per side', '(one side only)'),
        duration: stretch.duration, // Keep duration the same (no doubling)
        bilateral: false // Mark as non-bilateral for this quick routine
      };
    }
    
    // Return the stretch as is
    return stretch;
  });

  // If transition duration is specified, add transition periods between stretches
  const routineWithTransitions: (Stretch | RestPeriod | TransitionPeriod)[] = [];
  
  if (transitionDuration && transitionDuration > 0) {
    // Add stretches with transitions in between
    routineStretches.forEach((stretch, index) => {
      // Add the stretch
      routineWithTransitions.push(stretch);
      
      // Add a transition after each stretch except the last one
      if (index < routineStretches.length - 1) {
        const transition: TransitionPeriod = {
          id: `transition-${index}`,
          name: "Transition",
          description: "Get ready for the next stretch",
          duration: transitionDuration,
          isTransition: true
        };
        
        routineWithTransitions.push(transition);
      }
    });
    
    console.log(`Generated desk break boost routine with ${routineStretches.length} stretches and ${routineWithTransitions.length - routineStretches.length} transitions`);
    return routineWithTransitions;
  }

  console.log(`Generated desk break boost routine with ${routineStretches.length} stretches`);
  return routineStretches;
};

/**
 * Checks if Desk Break Boost is available based on user level
 * @param userLevel Current user level
 * @returns Boolean indicating if the feature is available
 */
export const isDeskBreakBoostAvailable = (userLevel: number): boolean => {
  return userLevel >= 8;
}; 