import stretches from '../data/stretches';
import { BodyArea, Duration, RoutineParams, Stretch, StretchLevel } from '../types';

export const generateRoutine = (params: RoutineParams): Stretch[] => {
  const { area, duration, level } = params;
  
  // Convert duration string to number
  const durationMinutes = parseInt(duration);
  
  // Filter stretches by area and level
  let filteredStretches = stretches.filter(stretch => 
    stretch.tags.includes(area) && stretch.level === level
  );
  
  // If not enough stretches, include stretches from one level below
  if (filteredStretches.length < 3 && level !== 'beginner') {
    const lowerLevel: StretchLevel = level === 'advanced' ? 'intermediate' : 'beginner';
    const additionalStretches = stretches.filter(stretch => 
      stretch.tags.includes(area) && stretch.level === lowerLevel
    );
    filteredStretches = [...filteredStretches, ...additionalStretches];
  }
  
  // Shuffle the filtered stretches
  const shuffled = [...filteredStretches].sort(() => 0.5 - Math.random());
  
  // Select stretches to fit within the requested duration
  const selectedStretches: Stretch[] = [];
  let totalDuration = 0;
  const targetDuration = durationMinutes * 60; // Convert minutes to seconds
  
  for (const stretch of shuffled) {
    if (totalDuration + stretch.duration <= targetDuration) {
      selectedStretches.push(stretch);
      totalDuration += stretch.duration;
    }
    
    if (totalDuration >= targetDuration * 0.9) {
      break; // Stop when we've reached at least 90% of the target duration
    }
  }
  
  return selectedStretches;
}; 