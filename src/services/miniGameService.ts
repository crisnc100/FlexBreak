import { getData, setData, KEYS } from './storageService';

// Mini-game types
export enum MiniGameType {
  WELLNESS_TRIVIA = 'wellness_trivia',
  STRESS_BUSTER = 'stress_buster',
  DESK_BALANCE = 'desk_balance',
  STRETCH_SEQUENCE = 'stretch_sequence',
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
  [MiniGameType.DESK_BALANCE]: {
    id: MiniGameType.DESK_BALANCE,
    name: 'Mindful Flow',
    description: 'Guide your inner light through mindful movement',
    duration: 60,
    minXP: 25,
    maxXP: 100,
  },
  [MiniGameType.STRETCH_SEQUENCE]: {
    id: MiniGameType.STRETCH_SEQUENCE,
    name: 'Stretch Sequence',
    description: 'Follow the stretch sequence',
    duration: 75,
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
    // Free users get 2 random games from the first 3 available
    const availableFreeGames = [
      MINI_GAMES[MiniGameType.WELLNESS_TRIVIA],
      MINI_GAMES[MiniGameType.STRESS_BUSTER],
      MINI_GAMES[MiniGameType.DESK_BALANCE],
    ];
    
    // Randomly shuffle and return 2 games
    const shuffled = availableFreeGames.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 2);
  }
}

// Record that a mini-game was played
export async function recordMiniGamePlayed(
  gameType: MiniGameType,
  score: number,
  xpEarned: number,
  isPerfectScore: boolean
): Promise<void> {
  try {
    const today = new Date().toDateString();
    
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
    
    // TODO: Update consecutive days tracking
    // TODO: Update achievement progress
    
    console.log(`Mini-game recorded: ${gameType}, Score: ${score}, XP: ${xpEarned}`);
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