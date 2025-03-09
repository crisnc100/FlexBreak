import stretches from '../data/stretches';
import { BodyArea, Duration, Stretch, StretchLevel } from '../types';

/**
 * Generates a stretching routine based on user preferences
 * @param area The body area to focus on
 * @param duration The duration of the routine in minutes
 * @param level The user's flexibility level
 * @returns An array of stretches for the routine
 */
export const generateRoutine = (
  area: BodyArea,
  duration: Duration,
  level: StretchLevel
): Stretch[] => {
  // Convert duration string to number
  const durationMinutes = parseInt(duration, 10);
  
  // Filter stretches by area
  let filteredStretches = stretches.filter(stretch => 
    stretch.tags.includes(area) || 
    (area === 'Full Body' && stretch.tags.some(tag => tag !== 'Full Body'))
  );
  
  // Apply level-based filtering with smart selection
  let levelFilteredStretches: Stretch[] = [];
  
  switch(level) {
    case 'beginner':
      // Beginners only get beginner stretches
      levelFilteredStretches = filteredStretches.filter(stretch => 
        stretch.level === 'beginner'
      );
      break;
      
    case 'intermediate':
      // Intermediates get mostly intermediate stretches with some beginner ones
      const intermediateStretches = filteredStretches.filter(stretch => 
        stretch.level === 'intermediate'
      );
      
      const beginnerForIntermediate = filteredStretches.filter(stretch => 
        stretch.level === 'beginner'
      );
      
      // Aim for 70% intermediate, 30% beginner
      const intermediateCount = Math.ceil(durationMinutes * 0.7);
      const beginnerCount = Math.floor(durationMinutes * 0.3);
      
      // Shuffle and take the appropriate number from each level
      levelFilteredStretches = [
        ...shuffleArray(intermediateStretches).slice(0, intermediateCount),
        ...shuffleArray(beginnerForIntermediate).slice(0, beginnerCount)
      ];
      break;
      
    case 'advanced':
      // Advanced users get a mix of all levels, with emphasis on advanced
      const advancedStretches = filteredStretches.filter(stretch => 
        stretch.level === 'advanced'
      );
      
      const intermediateForAdvanced = filteredStretches.filter(stretch => 
        stretch.level === 'intermediate'
      );
      
      const beginnerForAdvanced = filteredStretches.filter(stretch => 
        stretch.level === 'beginner'
      );
      
      // Aim for 60% advanced, 30% intermediate, 10% beginner
      const advancedCount = Math.ceil(durationMinutes * 0.6);
      const intermediateForAdvancedCount = Math.floor(durationMinutes * 0.3);
      const beginnerForAdvancedCount = Math.floor(durationMinutes * 0.1);
      
      // Shuffle and take the appropriate number from each level
      levelFilteredStretches = [
        ...shuffleArray(advancedStretches).slice(0, advancedCount),
        ...shuffleArray(intermediateForAdvanced).slice(0, intermediateForAdvancedCount),
        ...shuffleArray(beginnerForAdvanced).slice(0, beginnerForAdvancedCount)
      ];
      break;
  }
  
  // If we don't have enough stretches of the right level, add some from other levels
  if (levelFilteredStretches.length < durationMinutes) {
    const remainingCount = durationMinutes - levelFilteredStretches.length;
    const existingIds = new Set(levelFilteredStretches.map(s => s.id));
    
    // Get stretches we haven't already selected
    const additionalStretches = filteredStretches
      .filter(stretch => !existingIds.has(stretch.id))
      .slice(0, remainingCount);
    
    levelFilteredStretches = [...levelFilteredStretches, ...additionalStretches];
  }
  
  // Shuffle the stretches to randomize the routine
  const shuffledStretches = shuffleArray(levelFilteredStretches);
  
  // Take only as many stretches as needed for the duration
  // Each stretch is roughly 1 minute (including transition time)
  return shuffledStretches.slice(0, durationMinutes);
};

/**
 * Shuffles an array using the Fisher-Yates algorithm
 * @param array The array to shuffle
 * @returns A new shuffled array
 */
function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
} 