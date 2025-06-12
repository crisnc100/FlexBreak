import { Animated } from 'react-native';

export type MonsterType = 'tech_neck' | 'desk_hunch' | 'slouch_slump' | 'lean_twist' | 'boss_posture';

export type PadType = 'neck_relief_pad' | 'hip_hop_platform' | 'chest_quest_pad' | 'armory_arc';

// Enhanced pad configuration interface with optional special abilities
export interface PadConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  cost: number;
  damage: number;
  range: number;
  fireRate: number;
  description: string;
  image: any;
  // Special abilities (optional)
  techNeckBonus?: number;
  splashRadius?: number;
  splashDamage?: number;
  armorPiercing?: boolean;
  dotDamage?: number;
  dotDuration?: number;
  piercing?: boolean;
  undodgeable?: boolean;
}

// Removed StretchId - no longer needed for tower defense

export interface Monster {
  id: string;
  type: MonsterType;
  hp: number;
  maxHp: number;
  speed: number; // milliseconds to complete path
  value: number; // energy reward when killed
  currentWaypointIndex: number;
  pathProgress: number; // 0 to 1
  position: { x: number; y: number };
  pixelPosition: Animated.ValueXY;
  animation?: Animated.CompositeAnimation;
  slowEffect?: number; // 0 to 1 (percentage slow)
  isBoss?: boolean;
  // DoT effects
  dotDamage?: number;
  dotDuration?: number;
  dotAppliedTime?: number;
}

// Removed MovementPattern - monsters follow fixed path

export interface PlacedPad {
  slotId: number;
  padType: PadType;
  level: number;
  lastFired: number;
}

export interface Projectile {
  id: string;
  fromPad: number; // slot id
  target: string; // monster id
  position: Animated.ValueXY;
  type: PadType;
}

export interface GameState {
  gameActive: boolean;
  timeLeft: number;
  currentWave: number;
  score: number;
  hearts: number;
  energy: number;
  monsters: Monster[];
  placedPads: PlacedPad[];
  projectiles: Projectile[];
  lastSpawnTime: number;
  waveStartTime: number;
  lastEnergyGain: number;
  gamePhase: 'prepare' | 'tutorial' | 'wave' | 'boss' | 'results';
  monstersSpawned: number;
  bossSpawned: boolean;
  bossHitHalf: boolean;
}

// Removed BuildSlot - using BUILD_SLOTS constant instead

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

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  damage: number;
  color: string;
  effectiveness: 'super' | 'effective' | 'normal' | 'resisted' | 'heavy_resisted';
}

export interface RangeIndicator {
  slotId: number;
  padType: PadType;
  range: number;
}