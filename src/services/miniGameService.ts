import { getData, setData, KEYS } from './storageService';
import { getUserProgress, saveUserProgress } from './storageService';
import { updateMiniGameAchievements } from '../utils/progress/modules/achievementManager';
import { processCompletedMiniGame } from '../utils/progress/gameEngine';

// Mini-game types
export enum MiniGameType {
  WELLNESS_TRIVIA = 'wellness_trivia',
  STRESS_BUSTER = 'stress_buster',
  POSTURE_PATROL = 'desk_balance',
  BALANCE_DROP = 'balance_drop',
}

// Mini-game info
export interface MiniGameInfo {
  id: MiniGameType;
  name: string;
  description: string;
  duration: number; // in seconds
  minXP: number;
  maxXP: number;
}

// All available mini-games
export const MINI_GAMES: Record<MiniGameType, MiniGameInfo> = {
  [MiniGameType.WELLNESS_TRIVIA]: {
    id: MiniGameType.WELLNESS_TRIVIA,
    name: 'Wellness True/False',
    description: 'Test your workplace wellness knowledge',
    duration: 60,
    minXP: 25,
    maxXP: 100,
  },
  [MiniGameType.STRESS_BUSTER]: {
    id: MiniGameType.STRESS_BUSTER,
    name: 'Stress Buster',
    description: 'Tap stressed workers to help them relax',
    duration: 45,
    minXP: 25,
    maxXP: 100,
  },
  [MiniGameType.POSTURE_PATROL]: {
    id: MiniGameType.POSTURE_PATROL,
    name: 'Posture Patrol',
    description: 'Protect your desk from bad posture monsters',
    duration: 60,
    minXP: 25,
    maxXP: 100,
  },
  [MiniGameType.BALANCE_DROP]: {
    id: MiniGameType.BALANCE_DROP,
    name: 'Balance Drop',
    description: 'Drag falling work and wellness items to the correct sides of the scale.',
    duration: 90,
    minXP: 25,
    maxXP: 100,
  },
};

// Check if user can play mini-games
export async function canPlayMiniGame(isPremium: boolean): Promise<boolean> {
  try {
    const today = new Date().toDateString();
    const lastPlayDate = await getData(KEYS.MINIGAMES.LAST_PLAYED_DATE, '');
    
    // Premium users can always play
    if (isPremium) {
      return true;
    }
    
    // Free users: check if they already played today
    return lastPlayDate !== today;
  } catch (error) {
    console.error('Error checking mini-game access:', error);
    return false;
  }
}

// Get available games for user
export async function getAvailableGames(isPremium: boolean): Promise<MiniGameInfo[]> {
  if (isPremium) {
    // Premium users get all 4 games
    return Object.values(MINI_GAMES);
  } else {
    // Free users get all 4 games too (but popup will randomly select one)
    return Object.values(MINI_GAMES);
  }
}

// Record that a mini-game was played
export async function recordMiniGamePlayed(
  gameType: MiniGameType,
  score: number,
  xpEarned: number,
  isPerfectScore: boolean
): Promise<any> {
  try {
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    
    // Get previous last played date for streak tracking
    const lastPlayDate = await getData(KEYS.MINIGAMES.LAST_PLAYED_DATE, '');
    
    // Update last played date
    await setData(KEYS.MINIGAMES.LAST_PLAYED_DATE, today);
    
    // Update total games played
    const totalGames = await getData(KEYS.MINIGAMES.TOTAL_GAMES_PLAYED, 0);
    await setData(KEYS.MINIGAMES.TOTAL_GAMES_PLAYED, totalGames + 1);
    
    // Update perfect scores if applicable
    if (isPerfectScore) {
      const perfectScores = await getData(KEYS.MINIGAMES.PERFECT_SCORES, 0);
      await setData(KEYS.MINIGAMES.PERFECT_SCORES, perfectScores + 1);
    }
    
    // Update consecutive days tracking
    let consecutiveDays = await getData(KEYS.MINIGAMES.CONSECUTIVE_DAYS, 0);
    
    if (lastPlayDate === yesterday) {
      // Continuing streak
      consecutiveDays += 1;
    } else if (lastPlayDate === today) {
      // Already played today, don't increment
    } else {
      // Streak broken or first play
      consecutiveDays = 1;
    }
    
    await setData(KEYS.MINIGAMES.CONSECUTIVE_DAYS, consecutiveDays);
    
    // Update achievement progress
    const userProgress = await getUserProgress();
    
    // Map game types to achievement types
    let achievementGameType: 'posture_patrol' | 'stress_buster' | 'balance_drop' | 'trivia';
    switch (gameType) {
      case MiniGameType.POSTURE_PATROL:
        achievementGameType = 'posture_patrol';
        break;
      case MiniGameType.STRESS_BUSTER:
        achievementGameType = 'stress_buster';
        break;
      case MiniGameType.BALANCE_DROP:
        achievementGameType = 'balance_drop';
        break;
      case MiniGameType.WELLNESS_TRIVIA:
        achievementGameType = 'trivia';
        break;
      default:
        return; // Unknown game type
    }
    
    await updateMiniGameAchievements(userProgress, achievementGameType, isPerfectScore);
    
    // Process the mini-game completion and add XP to user's total
    const result = await processCompletedMiniGame(gameType, score, xpEarned, isPerfectScore);
    
    console.log(`Mini-game recorded: ${gameType}, Score: ${score}, XP: ${result.totalXpEarned}, Perfect: ${isPerfectScore}`);
    
    // Return the result for UI updates (level up notifications, etc.)
    return result;
  } catch (error) {
    console.error('Error recording mini-game:', error);
  }
}

// Get mini-game statistics
export async function getMiniGameStats() {
  try {
    const [totalGames, perfectScores, consecutiveDays, triviaCorrect, bestReactionTime] = 
      await Promise.all([
        getData(KEYS.MINIGAMES.TOTAL_GAMES_PLAYED, 0),
        getData(KEYS.MINIGAMES.PERFECT_SCORES, 0),
        getData(KEYS.MINIGAMES.CONSECUTIVE_DAYS, 0),
        getData(KEYS.MINIGAMES.TRIVIA_CORRECT_COUNT, 0),
        getData(KEYS.MINIGAMES.BEST_REACTION_TIME, 0),
      ]);
    
    return {
      totalGamesPlayed: totalGames,
      perfectScores: perfectScores,
      consecutiveDays: consecutiveDays,
      triviaCorrectAnswers: triviaCorrect,
      bestReactionTime: bestReactionTime,
    };
  } catch (error) {
    console.error('Error getting mini-game stats:', error);
    return {
      totalGamesPlayed: 0,
      perfectScores: 0,
      consecutiveDays: 0,
      triviaCorrectAnswers: 0,
      bestReactionTime: 0,
    };
  }
}

// Update trivia statistics
export async function updateTriviaStats(correctAnswers: number): Promise<void> {
  try {
    const currentCorrect = await getData(KEYS.MINIGAMES.TRIVIA_CORRECT_COUNT, 0);
    await setData(KEYS.MINIGAMES.TRIVIA_CORRECT_COUNT, currentCorrect + correctAnswers);
  } catch (error) {
    console.error('Error updating trivia stats:', error);
  }
}

// Update reaction time if it's a new best
export async function updateBestReactionTime(reactionTime: number): Promise<boolean> {
  try {
    const currentBestTime = await getData(KEYS.MINIGAMES.BEST_REACTION_TIME, 999999);
    
    if (reactionTime < currentBestTime) {
      await setData(KEYS.MINIGAMES.BEST_REACTION_TIME, reactionTime);
      return true; // New best time!
    }
    
    return false;
  } catch (error) {
    console.error('Error updating reaction time:', error);
    return false;
  }
}