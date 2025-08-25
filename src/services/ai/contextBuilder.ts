import AsyncStorage from '@react-native-async-storage/async-storage';
import { CONTEXT_TEMPLATE } from './core/promptManager';
import { buildAppContextForAI, buildUserProgressContext } from './config/appContext';

export interface UserContext {
  message: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  dayOfWeek: string;
  timestamp: string;
  userName?: string;
  recentPatterns?: string[];
  effectiveSolutions?: string[];
  isPremium?: boolean;
  isFirstInteraction?: boolean;
  detectedLanguage?: 'en' | 'es' | 'zh';
  appContext?: string; // New: app-specific context
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
      
      // Check if premium
      const isPremium = await AsyncStorage.getItem('@user_premium') === 'true';
      context.isPremium = isPremium;
      
      // Check if this is first interaction (greeting words in multiple languages)
      const greetings = [
        'hi', 'hello', 'hey', 'welcome', 'start',
        'hola', 'buenos', 'buenas',
        '你好', '您好', '嗨', '开始'
      ];
      context.isFirstInteraction = greetings.some(g => userInput.toLowerCase().includes(g));
      
      // Detect language from user input
      // First try to get language from Google Speech API (if voice was used)
      const googleDetectedLang = await AsyncStorage.getItem('@ai_wellness_detected_language');
      
      // Use unified language detection
      context.detectedLanguage = detectLanguage(userInput, googleDetectedLang || undefined);
      
      // Clear Google detection after use
      if (googleDetectedLang) {
        await AsyncStorage.removeItem('@ai_wellness_detected_language');
      }
      
      console.log('Language Detection:', { 
        input: userInput, 
        googleLang: googleDetectedLang,
        detected: context.detectedLanguage 
      });
      
      // Pattern tracking removed for MVP simplification
      // const patternsKey = `@ai_wellness_patterns_${userId}`;
      // const patternsData = await AsyncStorage.getItem(patternsKey);
      // if (patternsData) {
      //   const patterns = JSON.parse(patternsData);
      //   context.recentPatterns = patterns.slice(-3); // Last 3 patterns
      // }
      
      // const effectiveKey = `@ai_wellness_effective_${userId}`;
      // const effectiveData = await AsyncStorage.getItem(effectiveKey);
      // if (effectiveData) {
      //   const effective = JSON.parse(effectiveData);
      //   context.effectiveSolutions = effective.slice(-3); // Last 3 effective solutions
      // }
      
      // Load app-specific context
      try {
        // Get user progress data using storageService
        const { getUserProgress } = await import('../../services/storageService');
        const userProgress = await getUserProgress();
        
        // Get favorite body area from routinesByArea statistics
        let favoriteBodyArea: string | undefined;
        if (userProgress.statistics?.routinesByArea) {
          // Find the most used body area
          const bodyAreaEntries = Object.entries(userProgress.statistics.routinesByArea);
          if (bodyAreaEntries.length > 0) {
            favoriteBodyArea = bodyAreaEntries
              .sort(([,a], [,b]) => b - a)[0]?.[0];
          }
        }
        
        // Build progress context with real data
        const progressContext = buildUserProgressContext(
          userProgress.level || 1,
          userProgress.statistics?.currentStreak || 0,
          userProgress.statistics?.totalRoutines || 0,
          favoriteBodyArea,
          userProgress.totalXP || 0
        );
        
        // Create app context string
        context.appContext = buildAppContextForAI(progressContext, isPremium);
        
      } catch (appContextError) {
        console.log('Error loading app context:', appContextError);
        // Fallback to basic app context
        context.appContext = buildAppContextForAI(undefined, context.isPremium || false);
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
    pain: ['pain', 'hurt', 'ache', 'sore', '痛', '疼', '酸痛', '不舒服'],
    stress: ['stress', 'anxious', 'overwhelm', 'worry', '压力', '焦虑', '紧张', '担心'],
    fatigue: ['tired', 'exhausted', 'sleepy', 'fatigue', '累', '疲劳', '疲惫', '困'],
    focus: ['focus', 'concentrate', 'distract', '专注', '集中', '注意力'],
    positive: ['good', 'great', 'fine', 'well', '好', '很好', '不错', '棒']
  };
  
  // Check for exercise-related Chinese keywords
  if (input.includes('运动') || input.includes('锻炼') || input.includes('脚步')) {
    return 'general'; // Exercise questions fall under general category
  }
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerInput.includes(keyword))) {
      return category;
    }
  }
  
  return 'general';
};

export const detectLanguage = (input: string, googleLang?: string): 'en' | 'es' | 'zh' => {
  const lowerInput = input.toLowerCase();
  
  // Priority 1: Chinese characters (most reliable indicator)
  const chineseChars = /[\u4e00-\u9fff\u3400-\u4dbf]/;
  if (chineseChars.test(input)) {
    return 'zh';
  }
  
  // Priority 2: If Google detected a language, verify and trust it
  if (googleLang) {
    console.log(`Language Detection: Google detected ${googleLang}`);
    
    // Define language indicators with word boundaries to avoid partial matches
    const englishWords = [
      'hi', 'hello', 'hey', 'good', 'morning', 'afternoon', 'evening',
      'my', 'neck', 'back', 'pain', 'hurt', 'sore', 'tired', 'stress',
      'help', 'feel', 'feeling', 'better', 'worse', 'thanks', 'thank',
      'yes', 'no', 'okay', 'fine', 'great', 'bad', 'leg', 'arm',
      'had', 'lot', 'pizza', 'night', 'should', 'work', 'hard', 'next',
      'day', 'just', 'follow', 'normal', 'diet', 'exercise', 'workout'
    ];
    
    const spanishWords = [
      'hola', 'buenos', 'buenas', 'días', 'tardes', 'noches',
      'como', 'está', 'estoy', 'siento', 'tengo', 'dolor',
      'cansado', 'cansada', 'bien', 'mal', 'gracias',
      'duele', 'espalda', 'cuello', 'estómago', 'cabeza',
      'estrés', 'ansioso', 'fatiga', 'ejercicio', 'caminar',
      'ayuda', 'mejor', 'peor', 'mucho', 'poco'
    ];
    
    // Count word matches using word boundaries
    const englishMatches = englishWords.filter(word => 
      new RegExp(`\\b${word}\\b`, 'i').test(lowerInput)
    ).length;
    
    const spanishMatches = spanishWords.filter(word => 
      new RegExp(`\\b${word}\\b`, 'i').test(lowerInput)
    ).length;
    
    // Spanish question patterns
    const spanishPatterns = /\b(qué|cómo|cuándo|dónde|por qué|está|estoy|tengo|duele|me siento)\b/i;
    const hasSpanishPattern = spanishPatterns.test(lowerInput);
    
    // If Google says English and we have English words, trust it
    if (googleLang.startsWith('en') && englishMatches > 0) {
      return 'en';
    }
    
    // If Google says Spanish and we have Spanish indicators, trust it
    if (googleLang.startsWith('es') && (spanishMatches > 0 || hasSpanishPattern)) {
      return 'es';
    }
    
    // If Google says Chinese but no Chinese chars, check if it's actually English/Spanish
    if ((googleLang.startsWith('zh') || googleLang.startsWith('cmn')) && 
        (englishMatches === 0 && spanishMatches === 0)) {
      return 'zh';
    }
  }
  
  // Priority 3: Count indicators for each language (when no Google detection)
  const englishWords = [
    'hi', 'hello', 'hey', 'good', 'morning', 'afternoon', 'evening',
    'my', 'neck', 'back', 'pain', 'hurt', 'sore', 'tired', 'stress',
    'help', 'feel', 'feeling', 'better', 'worse', 'thanks', 'thank',
    'yes', 'no', 'okay', 'fine', 'great', 'bad', 'leg', 'arm'
  ];
  
  const spanishWords = [
    'hola', 'buenos', 'buenas', 'días', 'tardes', 'noches',
    'como', 'está', 'estoy', 'siento', 'tengo', 'dolor',
    'cansado', 'cansada', 'bien', 'mal', 'gracias',
    'duele', 'espalda', 'cuello', 'estómago', 'cabeza'
  ];
  
  const englishScore = englishWords.filter(word => 
    new RegExp(`\\b${word}\\b`, 'i').test(lowerInput)
  ).length;
  
  const spanishScore = spanishWords.filter(word => 
    new RegExp(`\\b${word}\\b`, 'i').test(lowerInput)
  ).length;
  
  // Spanish patterns for questions
  const spanishPatterns = /\b(qué|cómo|cuándo|dónde|por qué|está|estoy|tengo|duele|me siento)\b/i;
  const hasSpanishPattern = spanishPatterns.test(lowerInput);
  
  // Need at least 2 Spanish words OR 1 Spanish pattern + 1 Spanish word
  if (spanishScore >= 2 || (hasSpanishPattern && spanishScore >= 1)) {
    return 'es';
  }
  
  // If we have any English words, return English
  if (englishScore > 0) {
    return 'en';
  }
  
  // Default to English
  return 'en';
};