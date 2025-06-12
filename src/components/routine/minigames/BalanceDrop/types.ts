import { Animated } from 'react-native';

export interface BalanceDropProps {
  onGameComplete: (score: number, xpEarned: number) => void;
  onSkip: () => void;
  context?: 'routine' | 'home';
}

export interface ItemData {
  icon: string;
  label: string;
  weight: 1 | 2 | 3;
  energyCost: number;
  energyRestore?: number;
  category: ItemCategory;
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
}

export interface Round {
  number: number;
  duration: number;
  spawnRate: number;
  fallSpeed: number;
  itemCount: number;
  urgentItemChance: number;
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