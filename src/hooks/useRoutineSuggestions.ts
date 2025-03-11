import { useState, useEffect } from 'react';
import { BodyArea, Duration, ProgressEntry } from '../types';
import { useRoutineStorage } from './useRoutineStorage';

interface RoutineSuggestion {
  id: string;
  title: string;
  description: string;
  area: BodyArea;
  duration: Duration;
  isPremium: boolean;
}

export function useRoutineSuggestions() {
  const { recentRoutines, isLoading } = useRoutineStorage();
  const [suggestions, setSuggestions] = useState<RoutineSuggestion[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      generateSuggestions(recentRoutines);
    }
  }, [recentRoutines, isLoading]);

  const generateSuggestions = (routines: ProgressEntry[]) => {
    setIsGeneratingSuggestions(true);
    
    try {
      // Create empty suggestions array
      const newSuggestions: RoutineSuggestion[] = [];
      
      // If no routines, suggest a basic routine
      if (routines.length === 0) {
        newSuggestions.push({
          id: 'beginner-neck',
          title: 'Quick Neck Relief',
          description: 'Perfect for beginners - gentle neck stretches to relieve tension',
          area: 'Neck',
          duration: '5',
          isPremium: false
        });
        newSuggestions.push({
          id: 'desk-shoulders',
          title: 'Desk Worker Shoulders',
          description: 'Popular routine for office workers - focuses on shoulder mobility',
          area: 'Shoulders & Arms',
          duration: '10',
          isPremium: false
        });
      } else {
        // Analyze routine history
        const areaFrequency: Record<BodyArea, number> = {
          'Hips & Legs': 0,
          'Lower Back': 0,
          'Upper Back & Chest': 0,
          'Shoulders & Arms': 0,
          'Neck': 0,
          'Full Body': 0
        };
        
        // Count frequency of each area
        routines.forEach(routine => {
          areaFrequency[routine.area]++;
        });
        
        // Find least exercised areas
        const sortedAreas = Object.entries(areaFrequency)
          .sort(([, countA], [, countB]) => countA - countB)
          .map(([area]) => area as BodyArea);
        
        // Suggest least exercised area
        if (sortedAreas.length > 0) {
          const leastExercisedArea = sortedAreas[0];
          newSuggestions.push({
            id: `new-${leastExercisedArea}`,
            title: `${leastExercisedArea} Focus`,
            description: `Try this routine to improve your ${leastExercisedArea} mobility`,
            area: leastExercisedArea,
            duration: '10',
            isPremium: true
          });
        }
        
        // Suggest most common area (user's favorite)
        const mostExercisedArea = Object.entries(areaFrequency)
          .sort(([, countA], [, countB]) => countB - countA)
          .map(([area]) => area as BodyArea)[0];
          
        newSuggestions.push({
          id: `favorite-${mostExercisedArea}`,
          title: 'Your Favorite Routine',
          description: `A ${mostExercisedArea} routine based on your history`,
          area: mostExercisedArea,
          duration: '10',
          isPremium: false
        });
        
        // Check if user prefers short or long routines
        const durationFrequency: Record<Duration, number> = {
          '5': 0,
          '10': 0,
          '15': 0
        };
        
        routines.forEach(routine => {
          durationFrequency[routine.duration]++;
        });
        
        const preferredDuration = Object.entries(durationFrequency)
          .sort(([, countA], [, countB]) => countB - countA)
          .map(([duration]) => duration as Duration)[0];
        
        // Add a suggestion with preferred duration but different area
        const differentArea = sortedAreas.find(area => area !== mostExercisedArea) || 'Lower Back';
        newSuggestions.push({
          id: `custom-${differentArea}-${preferredDuration}`,
          title: 'Personalized Length',
          description: `A ${differentArea} routine that matches your preferred duration`,
          area: differentArea,
          duration: preferredDuration,
          isPremium: true
        });
      }
      
      // Add a random suggestion for variety
      const randomAreas: BodyArea[] = ['Hips & Legs', 'Lower Back', 'Upper Back & Chest', 'Shoulders & Arms', 'Neck', 'Full Body'];
      const randomDurations: Duration[] = ['5', '10', '15'];
      
      const randomArea = randomAreas[Math.floor(Math.random() * randomAreas.length)];
      const randomDuration = randomDurations[Math.floor(Math.random() * randomDurations.length)];
      
      // Only add if not already suggested
      if (!newSuggestions.some(s => s.area === randomArea && s.duration === randomDuration)) {
        newSuggestions.push({
          id: `random-${randomArea}-${randomDuration}`,
          title: 'Try Something New',
          description: `A ${randomDuration} minute ${randomArea} routine for variety`,
          area: randomArea,
          duration: randomDuration,
          isPremium: false
        });
      }
      
      // Limit to 3 suggestions
      setSuggestions(newSuggestions.slice(0, 3));
    } catch (error) {
      console.error('Error generating suggestions:', error);
      // Fallback suggestion
      setSuggestions([{
        id: 'fallback-neck',
        title: 'Quick Neck Relief',
        description: 'A gentle routine to relieve neck tension',
        area: 'Neck',
        duration: '5',
        isPremium: false
      }]);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  return {
    suggestions,
    isLoading: isLoading || isGeneratingSuggestions,
    refreshSuggestions: () => generateSuggestions(recentRoutines)
  };
}