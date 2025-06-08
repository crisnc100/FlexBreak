import { Animated } from 'react-native';

export type MonsterType = 'tech_neck' | 'desk_hunch' | 'slouch_slump' | 'lean_twist';

export type StretchId = 
  | 'neck_side_stretch'
  | 'chin_tucks'
  | 'doorway_chest_stretch' 
  | 'chest_opener'
  | 'upper_back_extension'
  | 'seated_upper_back_stretch'
  | 'seated_spinal_twist'
  | 'standing_torso_twist';

export interface PostureFigure {
  id: string;
  type: MonsterType;
  position: Animated.ValueXY;
  speed: number;
  isActive: boolean;
  isFast: boolean;
  spawnTime: number; // For speed bonus calculation
  movementPattern: MovementPattern;
}

export interface MovementPattern {
  type: 'straight' | 'wobble' | 'pause' | 'zigzag';
  speed: number;
  wobble?: number;
  pauseCount?: number;
  pauseDuration?: number;
  zigzagAmplitude?: number;
  zigzagFrequency?: number;
}

export interface StretchOption {
  id: StretchId;
  name: string;
  icon: string;
  effectiveAgainst: MonsterType[];
  stretchId: number; // ID from stretches.ts
}

export interface StretchCard {
  id: StretchId;
  name: string;
  icon: string;
  effectiveAgainst: MonsterType[];
  cooldown: number; // in seconds
  charges: number; // remaining uses
  maxCharges: number; // total charges available
  lastUsed: number; // timestamp when last used
}

export interface GameState {
  gameActive: boolean;
  timeLeft: number;
  currentWave: number;
  score: number;
  tensionLevel: number;
  figures: PostureFigure[];
  selectedFigure: PostureFigure | null;
  lastSpawnTime: number;
  waveStartTime: number;
  fullBodyCooldown: number;
  dynamicFlowCooldown: number;
  lastUpdate?: number; // For triggering cooldown updates
}

export interface WaveConfig {
  monsters: MonsterType[];
  spawnRate: number;
  fastMonsterChance: number;
}

export interface GameStats {
  totalHits: number;
  correctHits: number;
  perfectWaves: number;
  speedBonuses: number;
  monstersDefeated: { [key in MonsterType]: number };
}

export interface DestructionEffect {
  id: string;
  x: number;
  y: number;
  score: number;
  isCorrect: boolean;
}