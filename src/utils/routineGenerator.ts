import stretches from '../data/stretches';
import { BodyArea, Duration, Stretch, StretchLevel } from '../types';

export const generateRoutine = (
  area: BodyArea,
  duration: Duration,
  level: StretchLevel
): Stretch[] => {
  // Convert duration to seconds
  const durationMinutes = parseInt(duration, 10);
  const totalSeconds = durationMinutes * 60;

  // Define max stretch counts
  const maxStretches = { 5: 7, 10: 12, 15: 16 }[durationMinutes] || Math.ceil(durationMinutes / 1.7);

  // Filter by area
  let filteredStretches = stretches.filter(stretch => 
    stretch.tags.includes(area) || 
    (area === 'Full Body' && stretch.tags.some(tag => tag !== 'Full Body'))
  );

  // Filter by level
  filteredStretches = filteredStretches.filter(stretch => {
    if (level === 'beginner') return stretch.level === 'beginner';
    if (level === 'intermediate') return stretch.level === 'beginner' || stretch.level === 'intermediate';
    if (level === 'advanced') return true; // All levels
  });

  // Shuffle for randomness
  const shuffledStretches = shuffleArray(filteredStretches);

  // Build routine dynamically
  let routine = [];
  let totalDuration = 0;
  for (const stretch of shuffledStretches) {
    if (routine.length >= maxStretches) break;

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