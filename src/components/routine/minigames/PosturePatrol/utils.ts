import { MonsterType, StretchId, WaveConfig, MovementPattern, StretchCard } from './types';
import { 
  WAVE_MONSTERS, 
  SPAWN_RATES, 
  FAST_MONSTER_CHANCE, 
  CORE_STRETCHES,
  SPAWN_VARIANCE,
  MONSTER_SPEEDS,
  MOVEMENT_PATTERNS,
  CARD_SYSTEM
} from './constants';

/**
 * Get wave configuration for a specific wave number
 */
export const getWaveConfig = (waveNumber: number): WaveConfig => {
  const monsters = WAVE_MONSTERS[waveNumber as keyof typeof WAVE_MONSTERS] || WAVE_MONSTERS[3];
  
  let spawnRate: number;
  switch (waveNumber) {
    case 1: spawnRate = SPAWN_RATES.WAVE_1; break;
    case 2: spawnRate = SPAWN_RATES.WAVE_2; break;
    case 3: spawnRate = SPAWN_RATES.WAVE_3; break;
    default: spawnRate = SPAWN_RATES.WAVE_3; break;
  }

  return {
    monsters,
    spawnRate,
    fastMonsterChance: waveNumber === 3 ? FAST_MONSTER_CHANCE : 0,
  };
};

/**
 * Get random monster type for current wave
 */
export const getRandomMonsterType = (waveNumber: number): MonsterType => {
  const config = getWaveConfig(waveNumber);
  const randomIndex = Math.floor(Math.random() * config.monsters.length);
  return config.monsters[randomIndex];
};

/**
 * Check if a stretch is effective against a monster type
 */
export const isStretchEffective = (stretchId: StretchId, monsterType: MonsterType): boolean => {
  const stretch = CORE_STRETCHES.find(s => s.id === stretchId);
  return stretch ? stretch.effectiveAgainst.includes(monsterType) : false;
};

/**
 * Get all stretches effective against a monster type
 */
export const getEffectiveStretches = (monsterType: MonsterType): StretchId[] => {
  return CORE_STRETCHES
    .filter(stretch => stretch.effectiveAgainst.includes(monsterType))
    .map(stretch => stretch.id);
};

/**
 * Calculate speed bonus based on reaction time
 */
export const calculateSpeedBonus = (spawnTime: number, selectionTime: number): number => {
  const reactionTime = selectionTime - spawnTime;
  
  // Speed bonus for selections under 2 seconds
  if (reactionTime < 2000) {
    return 5; // Quick reaction bonus
  }
  
  return 0;
};

/**
 * Get monster speed based on wave and random chance
 */
export const getMonsterSpeed = (waveNumber: number): { speed: number; isFast: boolean } => {
  const config = getWaveConfig(waveNumber);
  const isFast = Math.random() < config.fastMonsterChance;
  
  return {
    speed: isFast ? MONSTER_SPEEDS.FAST : MONSTER_SPEEDS.NORMAL,
    isFast,
  };
};

/**
 * Add randomization to spawn timing
 */
export const getRandomizedSpawnDelay = (baseDelay: number): number => {
  const variance = (Math.random() - 0.5) * 2 * SPAWN_VARIANCE; // ±500ms
  return Math.max(100, baseDelay + variance); // Minimum 100ms delay
};

/**
 * Calculate final score with bonuses
 */
export const calculateFinalScore = (
  baseScore: number,
  perfectWaves: number,
  speedBonuses: number
): number => {
  const perfectWaveBonus = perfectWaves * 25;
  const speedBonusPoints = speedBonuses * 5;
  
  return baseScore + perfectWaveBonus + speedBonusPoints;
};

/**
 * Get stretch name by ID
 */
export const getStretchName = (stretchId: StretchId): string => {
  const stretch = CORE_STRETCHES.find(s => s.id === stretchId);
  return stretch ? stretch.name : 'Unknown Stretch';
};

/**
 * Get stretch icon by ID
 */
export const getStretchIcon = (stretchId: StretchId): string => {
  const stretch = CORE_STRETCHES.find(s => s.id === stretchId);
  return stretch ? stretch.icon : 'help-outline';
};

/**
 * Generate educational tip based on missed stretches
 */
export const generateEducationalTip = (missedMonsters: MonsterType[]): string => {
  const monsterTips = {
    tech_neck: "Try neck stretches to combat forward head posture from screen time!",
    desk_hunch: "Chest and shoulder stretches help open up rounded shoulders.",
    slouch_slump: "Back extension stretches counteract slouching and poor posture.",
    lean_twist: "Spinal twists help realign twisted sitting positions.",
  };

  if (missedMonsters.length === 0) {
    return "Great job! You correctly identified all posture problems.";
  }

  const mostMissed = missedMonsters[0];
  return monsterTips[mostMissed];
};

/**
 * Check if wave was completed perfectly (no monsters reached desk)
 */
export const isWavePerfect = (waveStartTension: number, currentTension: number): boolean => {
  return waveStartTension === currentTension;
};

/**
 * Get movement pattern for a monster type
 */
export const getMovementPattern = (monsterType: MonsterType): MovementPattern => {
  return MOVEMENT_PATTERNS[monsterType];
};

/**
 * Initialize stretch cards deck
 */
export const initializeStretchCards = (): StretchCard[] => {
  // Select a random subset of stretches for the deck
  const shuffled = [...CORE_STRETCHES].sort(() => Math.random() - 0.5);
  const selectedCards = shuffled.slice(0, CARD_SYSTEM.DECK_SIZE);
  
  return selectedCards.map(stretch => ({
    id: stretch.id,
    name: stretch.name,
    icon: stretch.icon,
    effectiveAgainst: stretch.effectiveAgainst,
    cooldown: stretch.cooldown,
    charges: stretch.maxCharges,
    maxCharges: stretch.maxCharges,
    lastUsed: 0,
  }));
};

/**
 * Check if a card is available (not on cooldown and has charges)
 */
export const isCardAvailable = (card: StretchCard, currentTime: number): boolean => {
  if (card.charges <= 0) return false;
  
  const timeSinceLastUse = (currentTime - card.lastUsed) / 1000; // Convert to seconds
  return timeSinceLastUse >= card.cooldown;
};

/**
 * Use a stretch card
 */
export const useStretchCard = (card: StretchCard, currentTime: number): StretchCard => {
  return {
    ...card,
    charges: card.charges - 1,
    lastUsed: currentTime,
  };
};

/**
 * Get remaining cooldown time for a card
 */
export const getCardCooldownRemaining = (card: StretchCard, currentTime: number): number => {
  if (card.charges <= 0) return Infinity; // No charges left
  
  const timeSinceLastUse = (currentTime - card.lastUsed) / 1000;
  const remaining = card.cooldown - timeSinceLastUse;
  return Math.max(0, remaining);
};

/**
 * Recharge all cards (restore charges over time)
 */
export const rechargeCards = (cards: StretchCard[], deltaTime: number): StretchCard[] => {
  // This could be expanded to gradually restore charges over time
  // For now, we just handle cooldowns in the main component
  return cards;
};