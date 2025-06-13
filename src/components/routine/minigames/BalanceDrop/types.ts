import { Animated } from 'react-native';

export interface BalanceDropProps {
  onGameComplete: (score: number, xpEarned: number) => void;
  onSkip: () => void;
  context?: 'routine' | 'home';
}

export interface ItemData {
  icon: string;
  label: string;
  weight: 1 | 2 | 3 | 4 | 5; // Added heavy weights
  timeCost: number; // Hours consumed
  timeRestore?: number; // Some activities might give you more efficient time
  category: ItemCategory;
  isDual?: boolean; // Can go to either side
  dualTimeCost?: { work: number; life: number }; // Different costs for each side
  isCritical?: boolean; // Must be placed correctly
}

export type ItemCategory = 'work' | 'family' | 'wellness' | 'hobbies' | 'goals' | 'social';

export interface Item {
  id: string;
  type: 'life' | 'work';  // Simplified to life vs work for balance
  category: ItemCategory;
  data: ItemData;
  position: Animated.ValueXY;
  opacity: Animated.Value;
  scale: Animated.Value;
  isUrgent: boolean;
  urgencyTimer?: number;
  isDual?: boolean; // Can be placed on either side
  isCritical?: boolean; // Must be placed correctly
}

export interface Round {
  number: number;
  duration: number;
  spawnRate: number;
  fallSpeed: number;
  itemCount: number;
  urgentItemChance: number;
  startingBalanceRange: { min: number; max: number };
  maxLetGo?: number; // Maximum number of items that can be let go
  heavyItemChance?: number; // Chance of spawning heavy items (weight 4-5)
  dualItemChance?: number; // Chance of spawning dual items
  criticalItemChance?: number; // Chance of spawning critical items
}

export type GameState = 'menu' | 'tutorial' | 'playing' | 'roundComplete' | 'gameOver';

export interface GameStats {
  score: number;
  roundScore: number;
  correctPlacements: number;
  urgentItemsHandled: number;
  missedUrgentItems: number;
  perfectBalanceCount: number;
}

export interface ComboInfo {
  type: string;
  count: number;
}