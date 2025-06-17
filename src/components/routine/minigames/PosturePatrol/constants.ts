import { PadType, PadConfig } from './types';

// Game constants for Posture Patrol Tower Defense
export const GAME_DURATION = 100; // ~100 seconds total game time

// Wave configuration
// Wave templates for randomization
export const WAVE_TEMPLATES = {
  prepare: { duration: 8, phase: 'prepare' },
  0: { // Tutorial wave - always the same
    duration: 10,
    monsters: [{ type: 'tech_neck', count: 2, spawnDelay: 3000 }],
    phase: 'tutorial'
  },
  1: [
    // Wave 1 variants - early game
    {
      monsters: [
        { type: 'tech_neck', count: 9, spawnDelay: 2500 },
        { type: 'slouch_slump', count: 5, spawnDelay: 4000 }
      ]
    },
    {
      monsters: [
        { type: 'tech_neck', count: 11, spawnDelay: 2000 },
        { type: 'slouch_slump', count: 7, spawnDelay: 3000 }
      ]
    },
    {
      monsters: [
        { type: 'tech_neck', count: 8, spawnDelay: 3000 }
      ]
    }
  ],
  2: [
    // Wave 2 variants - medium difficulty
    {
      monsters: [
        { type: 'tech_neck', count: 10, spawnDelay: 2200 },
        { type: 'slouch_slump', count: 8, spawnDelay: 2800 },
        { type: 'desk_hunch', count: 5, spawnDelay: 4000 }
      ]
    },
    {
      monsters: [
        { type: 'slouch_slump', count: 9, spawnDelay: 2500 },
        { type: 'desk_hunch', count: 6, spawnDelay: 3500 }
      ]
    },
    {
      monsters: [
        { type: 'tech_neck', count: 12, spawnDelay: 1800 },
        { type: 'desk_hunch', count: 7, spawnDelay: 3000 }
      ]
    }
  ],
  3: [
    // Wave 3 variants - high difficulty
    {
      monsters: [
        { type: 'lean_twist', count: 11, spawnDelay: 2000 },
        { type: 'desk_hunch', count: 9, spawnDelay: 2500 },
        { type: 'slouch_slump', count: 7, spawnDelay: 3000 }
      ]
    },
    {
      monsters: [
        { type: 'desk_hunch', count: 10, spawnDelay: 2200 },
        { type: 'lean_twist', count: 9, spawnDelay: 2400 }
      ]
    },
    {
      monsters: [
        { type: 'tech_neck', count: 14, spawnDelay: 1600 },
        { type: 'lean_twist', count: 11, spawnDelay: 2000 }
      ]
    }
  ],
  4: { // Boss wave - always the same
    duration: 25,
    boss: {
      type: 'boss_posture',
      hp: 120,
      speed: 15000,
      minionsAt50: ['tech_neck', 'slouch_slump']
    },
    bossMinions: { // Spawn 3 random faster minions after boss
      count: 3,
      delay: 5000, // 5 seconds after boss spawn
      speedMultiplier: 1.5, // 50% faster than normal
      types: ['tech_neck', 'slouch_slump', 'desk_hunch', 'lean_twist'] // Random from these
    },
    phase: 'boss'
  }
};

// Function to generate randomized wave configuration
export const generateRandomWaves = () => {
  const newConfig = {
    prepare: WAVE_TEMPLATES.prepare,
    0: WAVE_TEMPLATES[0]
  };

  // Base properties for each wave
  const baseWaveProps = {
    1: { duration: 25, unlockedPad: 'hip_hop_platform', phase: 'wave' },
    2: { duration: 25, unlockedPad: 'chest_quest_pad', phase: 'wave' },
    3: { duration: 25, unlockedPad: 'armory_arc', phase: 'wave' }
  };

  // Randomly select wave variants
  [1, 2, 3].forEach(waveNum => {
    const templates = WAVE_TEMPLATES[waveNum];
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    // Ensure duration is preserved from baseWaveProps
    newConfig[waveNum] = { ...randomTemplate, ...baseWaveProps[waveNum] };
  });

  // Boss wave
  newConfig[4] = WAVE_TEMPLATES[4];

  return newConfig;
};

// Initial wave config (randomized each game)
export let WAVE_CONFIG = generateRandomWaves();

// Energy system
export const ENERGY_CONFIG = {
  STARTING: 3,
  TRICKLE_RATE: 6000, // 1 energy every 6 seconds
  KILL_REWARD: 1,
  MAX_ENERGY: 10
};

// Monster HP and rewards (increased for better challenge)
export const MONSTER_CONFIG = {
  tech_neck: { hp: 25, speed: 8000, value: 1 },
  slouch_slump: { hp: 35, speed: 10000, value: 1 },
  desk_hunch: { hp: 45, speed: 9000, value: 2 },
  lean_twist: { hp: 30, speed: 7000, value: 1 },
  boss_posture: { hp: 120, speed: 15000, value: 5 }
};

// Upgrade configurations for each pad (3 levels max)
export const UPGRADE_CONFIG = {
  neck_relief_pad: {
    name: 'Neck Relief Pad',
    levels: {
      1: { name: 'Basic Stretch', description: 'Simple neck relief', cost: 0 },
      2: { name: 'Ergonomic Headrest', description: '+50% damage, +25% range', cost: 1, damageMultiplier: 1.5, rangeMultiplier: 1.25 },
      3: { name: 'Professional Therapy', description: '+100% damage, +50% range', cost: 2, damageMultiplier: 2.0, rangeMultiplier: 1.5 }
    }
  },
  hip_hop_platform: {
    name: 'Hip-Hop Platform',
    levels: {
      1: { name: 'Basic Platform', description: 'Simple hip stretch', cost: 0 },
      2: { name: 'Dance Studio Setup', description: '+50% splash radius, +25% damage', cost: 2, damageMultiplier: 1.25, splashMultiplier: 1.5 },
      3: { name: 'Professional Stage', description: '+100% splash radius, +50% damage', cost: 3, damageMultiplier: 1.5, splashMultiplier: 2.0 }
    }
  },
  chest_quest_pad: {
    name: 'Chest Quest Pad',
    levels: {
      1: { name: 'Basic Breathing', description: 'Simple chest stretch', cost: 0 },
      2: { name: 'Breathing Coach', description: '+50% DoT duration, +25% damage', cost: 1, damageMultiplier: 1.25, dotMultiplier: 1.5 },
      3: { name: 'Wellness Master', description: '+100% DoT duration, +50% damage', cost: 2, damageMultiplier: 1.5, dotMultiplier: 2.0 }
    }
  },
  armory_arc: {
    name: 'Armory Arc',
    levels: {
      1: { name: 'Basic Arc', description: 'Simple shoulder stretch', cost: 0 },
      2: { name: 'Military Precision', description: '+50% piercing, +25% damage', cost: 3, damageMultiplier: 1.25, piercingImproved: true },
      3: { name: 'Elite Training', description: '+100% piercing, +50% damage', cost: 4, damageMultiplier: 1.5, piercingImproved: true }
    }
  }
};

// Function to calculate upgrade cost (60% of original pad cost per level)
export const getUpgradeCost = (padType: PadType, currentLevel: number): number => {
  const baseCost = PAD_CONFIG[padType].cost;
  return Math.ceil(baseCost * 0.6);
};

// Function to calculate sell value (70% of total investment)
export const getSellValue = (padType: PadType, level: number): number => {
  const baseCost = PAD_CONFIG[padType].cost;
  let totalInvestment = baseCost;
  
  // Add upgrade costs
  for (let i = 2; i <= level; i++) {
    totalInvestment += getUpgradeCost(padType, i - 1);
  }
  
  return Math.floor(totalInvestment * 0.7);
};

// Pad configurations with enhanced abilities
export const PAD_CONFIG: Record<PadType, PadConfig> = {
  neck_relief_pad: {
    id: 'neck_relief_pad',
    name: 'Neck Relief Pad',
    icon: 'radio-button-on',
    color: '#FF6B6B',
    cost: 2,
    damage: 8,
    range: 60, // Short range specialist
    fireRate: 2.0, // Faster targeting
    techNeckBonus: 3, // 3x damage multiplier vs Tech Neck
    description: '3× damage vs Tech Neck! Very short range, rapid fire.',
    image: require('../../../../../assets/images/miniGames/headspaceHalo1.png')
  },
  hip_hop_platform: {
    id: 'hip_hop_platform',
    name: 'Hip-Hop Platform',
    icon: 'square',
    color: '#96CEB4',
    cost: 3,
    damage: 12,
    range: 95, // Medium range AOE
    fireRate: 0.5, // Slower wind-up
    splashRadius: 50, // Area damage
    splashDamage: 0.6, // 60% damage to nearby enemies
    description: 'Area damage, medium range. Energy efficient vs groups.',
    image: require('../../../../../assets/images/miniGames/hipHopPlatform.png')
  },
  chest_quest_pad: {
    id: 'chest_quest_pad',
    name: 'Chest Quest Pad',
    icon: 'shield',
    color: '#4ECDC4',
    cost: 2,
    damage: 6,
    range: 120, // Long range anti-tank
    fireRate: 1.2,
    armorPiercing: true, // Ignores armor
    dotDamage: 2, // Damage over time per second
    dotDuration: 3, // Duration in seconds
    description: 'Armor piercing + DoT. Long range anti-tank specialist.',
    image: require('../../../../../assets/images/miniGames/chestQuestPad.png')
  },
  armory_arc: {
    id: 'armory_arc',
    name: 'Armory Arc',
    icon: 'triangle',
    color: '#9B59B6',
    cost: 5, // More expensive
    damage: 15,
    range: 180, // Extreme range sniper
    fireRate: 0.6,
    piercing: true, // Line piercing
    undodgeable: true, // Can't be dodged
    description: 'Extreme range piercing beam. Can\'t be dodged by Lean Twist.',
    image: require('../../../../../assets/images/miniGames/armoryArc.png')
  }
};

// Scoring
export const SCORING = {
  MONSTER_KILL: 10,
  WAVE_COMPLETE: 50,
  PERFECT_DEFENSE: 100, // No hearts lost
  BOSS_DEFEAT: 200
};

// Game dimensions and grid
export const GAME_GRID = {
  COLS: 10,
  ROWS: 16, // Increased height for taller game area
  CELL_SIZE: 35, // pixels per grid cell - sized to fit all screen widths
};

// Define the zigzag path waypoints (grid coordinates)
export const PATH_WAYPOINTS = [
  // Start at spawn (top center)
  { x: 5, y: 0 }, // S - Spawn point
  { x: 5, y: 1 },
  { x: 5, y: 2 },
  { x: 5, y: 3 },
  
  // First turn right
  { x: 6, y: 3 },
  { x: 7, y: 3 },
  { x: 8, y: 3 },
  { x: 9, y: 3 },
  
  // Turn down
  { x: 9, y: 4 },
  { x: 9, y: 5 },
  { x: 9, y: 6 },
  
  // Turn left
  { x: 8, y: 6 },
  { x: 7, y: 6 },
  { x: 6, y: 6 },
  { x: 5, y: 6 },
  { x: 4, y: 6 },
  { x: 3, y: 6 },
  { x: 2, y: 6 },
  { x: 1, y: 6 },
  { x: 0, y: 6 },
  
  // Turn down
  { x: 0, y: 7 },
  { x: 0, y: 8 },
  { x: 0, y: 9 },
  
  // Final turn right to defender
  { x: 1, y: 9 },
  { x: 2, y: 9 },
  { x: 3, y: 9 },
  { x: 4, y: 9 },
  { x: 5, y: 9 },
  
  // Continue down through taller game area
  { x: 5, y: 10 },
  { x: 5, y: 11 },
  { x: 5, y: 12 },
  { x: 5, y: 13 },
  { x: 5, y: 14 },
  { x: 5, y: 15 }, // Defender position (bottom of taller grid)
];

// Build slot positions (strategic points along the path) 
export const BUILD_SLOTS = [
  { id: 0, label: 'First Line', gridX: 7, gridY: 2, description: 'Early interception' },
  { id: 1, label: 'Corner Guard', gridX: 8, gridY: 5, description: 'Controls the turn' },
  { id: 2, label: 'Mid Defense', gridX: 3, gridY: 5, description: 'Center battlefield' },
  { id: 3, label: 'Choke Point', gridX: 1, gridY: 8, description: 'Narrow passage' },
  { id: 4, label: 'Last Stand', gridX: 7, gridY: 13, description: 'Final protection' },
];

// Monster resistance system
export const MONSTER_RESISTANCES = {
  tech_neck: {
    neck_relief_pad: 3.0,    // 3x damage (weakness)
    hip_hop_platform: 0.5,   // 0.5x damage (resistant)
    chest_quest_pad: 0.5,    // 0.5x damage (resistant)
    armory_arc: 0.5         // 0.5x damage (resistant)
  },
  slouch_slump: {
    neck_relief_pad: 0.7,    // 0.7x damage (resistant to single target)
    hip_hop_platform: 2.0,   // 2x damage (weakness to splash)
    chest_quest_pad: 1.0,    // Normal damage
    armory_arc: 1.0         // Normal damage
  },
  desk_hunch: {
    neck_relief_pad: 0.3,    // 0.3x damage (heavily armored)
    hip_hop_platform: 0.3,   // 0.3x damage (heavily armored)
    chest_quest_pad: 2.0,    // 2x damage (armor piercing weakness)
    armory_arc: 1.0         // Normal damage
  },
  lean_twist: {
    neck_relief_pad: 0.7,    // 0.7x damage (can dodge)
    hip_hop_platform: 0.7,   // 0.7x damage (can dodge)
    chest_quest_pad: 0.7,    // 0.7x damage (can dodge)
    armory_arc: 1.5         // 1.5x damage (can't dodge piercing)
  },
  boss_posture: {
    neck_relief_pad: 0.5,    // Boss has 50% damage resistance to all pads
    hip_hop_platform: 0.5,
    chest_quest_pad: 0.5,
    armory_arc: 0.5
  }
};

// Damage effectiveness colors
export const DAMAGE_COLORS = {
  SUPER_EFFECTIVE: '#00FF00', // Green - 2x or more
  EFFECTIVE: '#90EE90',       // Light green - 1.5x-2x
  NORMAL: '#FFFFFF',          // White - 0.8x-1.5x
  RESISTED: '#FFA500',        // Orange - 0.5x-0.8x
  HEAVILY_RESISTED: '#FF0000' // Red - less than 0.5x
};

// UI positioning
export const POSITIONS = {
  MONSTER_SIZE: 40,
  DEFENDER_SIZE: 60,
  PAD_SIZE: 50,
  BUILD_SLOT_SIZE: 60,
};