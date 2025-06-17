import { Animated } from 'react-native';

export interface BalanceDropProps {
  onGameComplete: (score: number, xpEarned: number) => void;
  onSkip: () => void;
  context?: 'routine' | 'home';
}

export interface LifeStats {
  career: number;      // 0-100 Career progress
  family: number;      // 0-100 Family happiness  
  health: number;      // 0-100 Physical health
  social: number;      // 0-100 Social connections
  stress: number;      // 0-100 Stress level
}

export interface StatEffect {
  stat: keyof LifeStats;
  change: number;
  message?: string; // Optional message to show
}

export interface ItemData {
  icon: string;
  label: string;
  description?: string; // Brief description of the situation
  weight: 1 | 2 | 3 | 4 | 5; // Visual size and balance impact
  energyCost: number; // Energy consumed (positive number)
  energyRestore?: number; // Energy restored after activity (for rest items)
  category: ItemCategory;
  isFlexible?: boolean; // Can go to either side
  flexibleEnergyCost?: { work: number; life: number }; // Different costs for each side
  effects?: {
    immediate?: StatEffect[]; // Applied when placed
    delayed?: StatEffect[]; // Applied next round
    skipPenalty?: StatEffect[]; // Applied if missed/skipped
    work?: { // Effects when placed on work side (for flexible items)
      immediate?: StatEffect[];
      delayed?: StatEffect[];
    };
    life?: { // Effects when placed on life side (for flexible items)
      immediate?: StatEffect[];
      delayed?: StatEffect[];
    };
  };
  isCritical?: boolean; // Can't be skipped without major penalty
}

export type ItemCategory = 'work' | 'family' | 'wellness' | 'hobbies' | 'goals' | 'social';

export interface Item {
  id: string;
  type: 'life' | 'work' | 'neutral';  // Neutral items don't affect balance
  category: ItemCategory;
  data: ItemData;
  position: Animated.ValueXY;
  opacity: Animated.Value;
  scale: Animated.Value;
  isFlexible?: boolean; // Can be placed on either side
}

export interface DayScenario {
  id: string;
  name: string;
  description: string;
  storyText?: string; // Narrative context for the scenario
  energyModifier: number; // Multiplier for starting energy (0.6 = 60% energy)
  workItemChance: number; // Chance of work items spawning
  essentialItemChance: number; // Chance of neutral essential items
  specialItems?: string[]; // Special items that spawn in this scenario
  stressEvents?: string[]; // Random events that can happen
  tips: string[]; // Helpful hints for the scenario
  statModifiers?: Partial<LifeStats>; // Starting stat adjustments for scenario
}

export interface Round {
  number: number;
  duration: number;
  spawnRate: number;
  fallSpeed: number;
  itemCount: number;
  startingBalanceRange: { min: number; max: number };
  maxSkips?: number; // Maximum number of items that can be skipped
  restItemChance?: number; // Chance of spawning energy-restoring items
  flexibleItemChance?: number; // Chance of spawning flexible items
  scenario?: DayScenario; // The daily scenario for this round
}

export type GameState = 'menu' | 'tutorial' | 'playing' | 'roundComplete' | 'gameOver';

export interface GameStats {
  score: number;
  roundScore: number;
  itemsPlaced: number;
  energyRestored: number;
  perfectBalanceCount: number;
  currentEnergy: number;
  correctPlacements: number;
  urgentItemsHandled: number;
  missedUrgentItems: number;
  lifeStats: LifeStats;
  decisions: {
    item: string;
    choice: 'work' | 'life' | 'skip';
    effects: StatEffect[];
  }[];
}

export interface ComboInfo {
  type: string;
  count: number;
}