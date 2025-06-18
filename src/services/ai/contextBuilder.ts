import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONTEXT_TEMPLATE } from './promptTemplates';

export interface UserContext {
  message: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  dayOfWeek: string;
  timestamp: string;
  userName?: string;
  recentPatterns?: string[];
  effectiveSolutions?: string[];
}

export const buildUserContext = async (userInput: string, userId?: string): Promise<UserContext> => {
  const now = new Date();
  const hour = now.getHours();
  
  let timeOfDay: 'morning' | 'afternoon' | 'evening';
  if (hour < 12) timeOfDay = 'morning';
  else if (hour < 17) timeOfDay = 'afternoon';
  else timeOfDay = 'evening';
  
  const context: UserContext = {
    message: userInput,
    timeOfDay,
    dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
    timestamp: now.toISOString(),
  };
  
  // If we have a userId, try to get recent patterns and user name
  if (userId) {
    try {
      // Get user's name if stored
      const userName = await AsyncStorage.getItem('@ai_wellness_user_name');
      if (userName) {
        context.userName = userName;
      }
      
      const patternsKey = `@ai_wellness_patterns_${userId}`;
      const patternsData = await AsyncStorage.getItem(patternsKey);
      if (patternsData) {
        const patterns = JSON.parse(patternsData);
        context.recentPatterns = patterns.slice(-3); // Last 3 patterns
      }
      
      const effectiveKey = `@ai_wellness_effective_${userId}`;
      const effectiveData = await AsyncStorage.getItem(effectiveKey);
      if (effectiveData) {
        const effective = JSON.parse(effectiveData);
        context.effectiveSolutions = effective.slice(-3); // Last 3 effective solutions
      }
    } catch (error) {
      console.log('Error loading user context:', error);
    }
  }
  
  return context;
};

export const getTimeOfDayContext = (): string => {
  const hour = new Date().getHours();
  
  if (hour < 12) return CONTEXT_TEMPLATE.timeOfDay.morning;
  else if (hour < 17) return CONTEXT_TEMPLATE.timeOfDay.afternoon;
  else return CONTEXT_TEMPLATE.timeOfDay.evening;
};

export const categorizeInput = (input: string): string => {
  const lowerInput = input.toLowerCase();
  
  const categories = {
    pain: ['pain', 'hurt', 'ache', 'sore'],
    stress: ['stress', 'anxious', 'overwhelm', 'worry'],
    fatigue: ['tired', 'exhausted', 'sleepy', 'fatigue'],
    focus: ['focus', 'concentrate', 'distract'],
    positive: ['good', 'great', 'fine', 'well']
  };
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerInput.includes(keyword))) {
      return category;
    }
  }
  
  return 'general';
};