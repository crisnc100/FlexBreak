/**
 * App-specific context for the AI wellness coach
 * Helps the AI give relevant, personalized advice about FlexBreak features
 */

export interface AppFeatureContext {
  // Core features the AI should know about
  features: {
    stretches: string;
    premium: string;
    minigames: string;
    weather: string;
    certifiedTrainer: string;
  };
  
  // User's current status (dynamically loaded from real data)
  userProgress?: {
    level: number;
    currentStreak: number;
    totalRoutines: number;
    favoriteBodyArea?: string; // most stretched body area
    xpToNextLevel?: number;
  };
  
  // Premium status for feature suggestions
  isPremium: boolean;
}

export const BASE_APP_CONTEXT = {
  features: {
    stretches: "FlexBreak offers 100+ office-friendly stretches with a toggle for limited space",
    routines: "Choose from 5, 10, or 15-minute guided routines",
    premium: "Premium features unlock by leveling up - reach level 9 to unlock everything!",
    minigames: "Earn XP with 4 mini-games: Wellness True/False, Reaction Tap, Posture Patrol, and Work-Life Balance",
    weather: "FREE weather-based notifications available in Settings for everyone",
    creator: "Created by Cristian Ortega, a certified personal trainer"
  },
  
  // XP System
  xpSystem: {
    dailyStretch: "Complete one stretch daily to earn XP",
    routineXP: "5-min routines: 30 XP, 10-min: 60 XP, 15-min: 90 XP",
    miniGames: "Play wellness mini-games for bonus XP",
    levelUp: "Level up to unlock new features (max level 9)"
  },
  
  // Level unlocks
  levelUnlocks: {
    2: "Dark Mode theme",
    3: "Custom Reminders",
    4: "XP Boosts",
    5: "Custom Routines",
    6: "Flex Saves (streak protection)",
    7: "Premium Stretches",
    8: "Desk Break Boost (fast optimal stretches)",
    9: "Stretch Playlists (max level!)"
  }
};

/**
 * Build dynamic context based on user's current state
 */
export function buildUserProgressContext(
  level: number = 1,
  streak: number = 0,
  totalRoutines: number = 0,
  favoriteArea?: string,
  currentXP: number = 0
): AppFeatureContext['userProgress'] {
  return {
    level,
    currentStreak: streak,
    totalRoutines,
    favoriteBodyArea: favoriteArea,
    xpToNextLevel: calculateXPToNextLevel(level, currentXP)
  };
}

/**
 * Calculate XP needed for next level based on real level system
 */
function calculateXPToNextLevel(currentLevel: number, currentXP: number = 0): number {
  // Level thresholds from the actual game
  const LEVELS = [
    { level: 1, xpRequired: 0 },
    { level: 2, xpRequired: 250 },
    { level: 3, xpRequired: 500 },
    { level: 4, xpRequired: 750 },
    { level: 5, xpRequired: 1200 },
    { level: 6, xpRequired: 1800 },
    { level: 7, xpRequired: 2500 },
    { level: 8, xpRequired: 3200 },
    { level: 9, xpRequired: 4000 },
    { level: 10, xpRequired: 5000 },
  ];
  
  const nextLevel = LEVELS.find(l => l.level === currentLevel + 1);
  if (nextLevel) {
    return nextLevel.xpRequired - currentXP;
  }
  
  // For levels beyond 10, use 1000 XP per level
  const lastDefinedLevel = LEVELS[LEVELS.length - 1];
  const xpForNextLevel = lastDefinedLevel.xpRequired + 1000 * (currentLevel + 1 - lastDefinedLevel.level);
  return xpForNextLevel - currentXP;
}

/**
 * Build context string for AI prompt
 */
export function buildAppContextForAI(
  userProgress?: AppFeatureContext['userProgress'],
  isPremium: boolean = false
): string {
  let context = "\n\nApp Info: ";
  
  // Add user progress
  if (userProgress) {
    context += `User is level ${userProgress.level}`;
    
    if (userProgress.currentStreak > 0) {
      context += ` with a ${userProgress.currentStreak}-day streak`;
    }
    
    if (userProgress.totalRoutines > 0) {
      context += `, completed ${userProgress.totalRoutines} total stretches`;
    }
    
    if (userProgress.favoriteBodyArea) {
      context += `, focuses on ${userProgress.favoriteBodyArea} stretches`;
    }
    
    context += ". ";
  }
  
  // Add feature context based on user input
  context += "FlexBreak has 100+ office stretches, offline wellness mini-games for XP. ";
  
  // Add level-specific context
  if (userProgress && userProgress.level < 9) {
    const nextUnlock = BASE_APP_CONTEXT.levelUnlocks[userProgress.level + 1];
    if (nextUnlock) {
      context += `Next unlock at level ${userProgress.level + 1}: ${nextUnlock}. `;
    }
  } else if (userProgress && userProgress.level >= 9) {
    context += "User has reached max level 9 with all features unlocked! ";
  }
  
  context += "Weather notifications are FREE. Created by Cristian Ortega, certified personal trainer. Max level is 9.";
  
  return context;
}

/**
 * Get smart feature suggestions based on user input
 */
export function getSmartSuggestion(userInput: string, userProgress?: AppFeatureContext['userProgress'], isPremium: boolean = false): string | null {
  const input = userInput.toLowerCase();
  
  // Context-aware suggestions
  if (input.includes('bored') || input.includes('fun')) {
    return "Try our mini-games! Posture Patrol is great for a quick break and earns you XP.";
  }
  
  // Time-based routine suggestions
  if (input.includes('quick') || input.includes('fast') || input.includes('5 min')) {
    return "Try a 5-minute routine for a quick 30 XP boost! Perfect for busy days.";
  }
  
  if (input.includes('15 min') || input.includes('long')) {
    return "Go for a 15-minute routine to earn 90 XP - great for a proper stretch session!";
  }
  
  if (input.includes('xp') && (input.includes('earn') || input.includes('get'))) {
    return "Earn XP fast: 5-min routine = 30 XP, 10-min = 60 XP, 15-min = 90 XP, plus mini-games!";
  }
  
  if (input.includes('streak') && userProgress?.currentStreak === 0) {
    return "Start your streak today! Just 2 stretches earns you daily XP.";
  }
  
  if (input.includes('level') && userProgress) {
    if (userProgress.level >= 9) {
      return `You've reached the max level 9! You have all features unlocked - enjoy your stretch playlists!`;
    }
    const nextUnlock = BASE_APP_CONTEXT.levelUnlocks[userProgress.level + 1];
    return `You're level ${userProgress.level}! ${userProgress.xpToNextLevel} XP until level ${userProgress.level + 1} which unlocks ${nextUnlock}.`;
  }
  
  if (input.includes('weather') && !isPremium) {
    return "Weather notifications are FREE! Enable them in Settings for weather-based stretch suggestions.";
  }
  
  if (input.includes('dark') && userProgress && userProgress.level < 2) {
    return "Dark mode unlocks at level 2! You need " + (250 - (userProgress.totalRoutines * 10)) + " more XP.";
  }
  
  if (input.includes('remind') && userProgress && userProgress.level < 3) {
    return "Custom reminders unlock at level 3! Keep stretching to level up.";
  }
  
  if (input.includes('playlist') && userProgress && userProgress.level < 9) {
    return "Stretch playlists unlock at level 9 - the ultimate achievement! You're currently level " + userProgress.level + ".";
  }
  
  if (input.includes('streak') && input.includes('save') && userProgress && userProgress.level < 6) {
    return "Flex Saves (streak protection) unlocks at level 6! Keep going!";
  }
  
  if (userProgress?.favoriteBodyArea && input.includes(userProgress.favoriteBodyArea)) {
    return `I noticed you focus on ${userProgress.favoriteBodyArea} stretches. Try the ${userProgress.favoriteBodyArea} Relief routine!`;
  }
  
  // Creator/founder questions
  if (input.includes('who created') || input.includes('who made') || input.includes('founder') || input.includes('creator')) {
    return "FlexBreak was created by Cristian Ortega, a certified personal trainer who wanted to help office workers stay healthy and productive!";
  }
  
  if (input.includes('cristian') || input.includes('ortega')) {
    return "Yes! Cristian Ortega is the founder and a certified personal trainer who designed all the stretches to be office-friendly.";
  }
  
  return null;
}