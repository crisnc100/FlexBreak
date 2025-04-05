import { BodyArea, Duration } from '../../../types';

export type XpBreakdownItem = {
  source: string;
  amount: number;
  description: string;
};

export type RewardItem = {
  id: string;
  name: string;
  description: string;
  type: 'feature' | 'item' | 'cosmetic';
};

export type Achievement = {
  id: string;
  title: string;
  description: string;
  xp: number;
  icon?: string;
};

export type LevelUpData = {
  oldLevel: number;
  newLevel: number;
  rewards?: RewardItem[];
  unlockedAchievements?: Achievement[];
};

export type CompletedRoutineProps = {
  area: BodyArea;
  duration: Duration;
  isPremium: boolean;
  xpEarned?: number;
  xpBreakdown?: XpBreakdownItem[];
  levelUp?: LevelUpData;
  isXpBoosted?: boolean;
  onShowDashboard: () => void;
  onNavigateHome: () => void;
  onOpenSubscription: () => void;
};

export type AchievementType = Achievement & {
  completed: boolean;
  dateCompleted?: string;
}; 