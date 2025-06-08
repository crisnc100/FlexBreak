// Game constants for Posture Patrol
export const GAME_DURATION = 90; // 90 seconds total
export const WAVE_DURATION = 30; // 30 seconds per wave
export const WAVES_COUNT = 3;

// Spawn rates (milliseconds between spawns)
export const SPAWN_RATES = {
  WAVE_1: 3000,   // Every 3 seconds
  WAVE_2: 2500,   // Every 2.5 seconds  
  WAVE_3: 2000,   // Every 2 seconds
};

// Speed settings (animation duration in ms)
export const MONSTER_SPEEDS = {
  NORMAL: 12000,  // 12 seconds to reach desk
  FAST: 8000,     // 8 seconds to reach desk (Wave 3 only)
};

// Fast monster probability in Wave 3
export const FAST_MONSTER_CHANCE = 0.3; // 30%

// Spawn timing randomization (±500ms)
export const SPAWN_VARIANCE = 500;

// Monster types available per wave
export const WAVE_MONSTERS = {
  1: ['tech_neck'],
  2: ['tech_neck', 'desk_hunch'],
  3: ['tech_neck', 'desk_hunch', 'slouch_slump', 'lean_twist'],
} as const;

// Stretch to monster mapping
export const STRETCH_MONSTER_MAPPING = {
  // Neck stretches for Tech Neck
  'neck_side_stretch': ['tech_neck'],
  'chin_tucks': ['tech_neck'],
  
  // Chest/Shoulder stretches for Desk Hunch
  'doorway_chest_stretch': ['desk_hunch'],
  'chest_opener': ['desk_hunch'],
  
  // Back extension stretches for Slouch Slump
  'upper_back_extension': ['slouch_slump'],
  'seated_upper_back_stretch': ['slouch_slump'],
  
  // Spinal twist stretches for Lean Twist
  'seated_spinal_twist': ['lean_twist'],
  'standing_torso_twist': ['lean_twist'],
} as const;

// Core stretches for card deck system
export const CORE_STRETCHES = [
  {
    id: 'neck_side_stretch',
    name: 'Neck Side Stretch',
    icon: 'person-outline',
    effectiveAgainst: ['tech_neck'],
    stretchId: 75, // From stretches.ts
    cooldown: 5, // 5 seconds
    maxCharges: 3,
  },
  {
    id: 'chin_tucks',
    name: 'Chin Tucks',
    icon: 'arrow-back-outline',
    effectiveAgainst: ['tech_neck'],
    stretchId: 87, // From stretches.ts
    cooldown: 4, // 4 seconds
    maxCharges: 4,
  },
  {
    id: 'doorway_chest_stretch',
    name: 'Chest Stretch',
    icon: 'expand-outline',
    effectiveAgainst: ['desk_hunch'],
    stretchId: 43, // From stretches.ts
    cooldown: 6, // 6 seconds
    maxCharges: 3,
  },
  {
    id: 'chest_opener',
    name: 'Chest Opener',
    icon: 'open-outline',
    effectiveAgainst: ['desk_hunch'],
    stretchId: 46, // From stretches.ts
    cooldown: 5, // 5 seconds
    maxCharges: 3,
  },
  {
    id: 'upper_back_extension',
    name: 'Back Extension',
    icon: 'chevron-up-outline',
    effectiveAgainst: ['slouch_slump'],
    stretchId: 42, // From stretches.ts
    cooldown: 7, // 7 seconds
    maxCharges: 2,
  },
  {
    id: 'seated_upper_back_stretch',
    name: 'Upper Back Stretch',
    icon: 'fitness-outline',
    effectiveAgainst: ['slouch_slump'],
    stretchId: 49, // From stretches.ts
    cooldown: 6, // 6 seconds
    maxCharges: 3,
  },
  {
    id: 'seated_spinal_twist',
    name: 'Spinal Twist',
    icon: 'refresh-outline',
    effectiveAgainst: ['lean_twist'],
    stretchId: 39, // From stretches.ts
    cooldown: 5, // 5 seconds
    maxCharges: 3,
  },
  {
    id: 'standing_torso_twist',
    name: 'Torso Twist',
    icon: 'sync-outline',
    effectiveAgainst: ['lean_twist'],
    stretchId: 104, // From stretches.ts
    cooldown: 4, // 4 seconds
    maxCharges: 4,
  },
] as const;

// Card system constants
export const CARD_SYSTEM = {
  DECK_SIZE: 6, // Show 6 cards at a time
  RECHARGE_RATE: 0.5, // Cards recharge every 0.5 seconds when on cooldown
} as const;

// Scoring
export const SCORING = {
  CORRECT_HIT: 10,
  SPEED_BONUS: 5,     // Extra points for quick selection
  PERFECT_WAVE_BONUS: 25, // Bonus for completing wave without damage
};

// Health/Tension
export const TENSION = {
  MONSTER_DAMAGE: 20,  // Tension increase when monster reaches desk
  MAX_TENSION: 100,    // Game over threshold
};

// Movement patterns for each monster type
export const MOVEMENT_PATTERNS = {
  tech_neck: {
    type: 'straight',
    speed: 1.2, // Fast movement (tech addiction)
    wobble: 0,
  },
  desk_hunch: {
    type: 'wobble',
    speed: 1.0, // Medium speed
    wobble: 15, // Slight side-to-side movement
  },
  slouch_slump: {
    type: 'pause',
    speed: 0.8, // Slowest movement (laziness)
    pauseCount: 2, // Number of pauses
    pauseDuration: 800, // How long each pause lasts
  },
  lean_twist: {
    type: 'zigzag',
    speed: 1.1, // Medium-fast speed
    zigzagAmplitude: 30, // How far left/right it moves
    zigzagFrequency: 3, // Number of direction changes
  },
} as const;

// UI positioning
export const POSITIONS = {
  DESK_BOTTOM_OFFSET: 80,
  DEFENDING_FIGURE_SIZE: 100, // Increased from 80
  MONSTER_SIZE: 70, // Increased from 50
  RADIAL_MENU_SIZE: 300, // Increased for better UX
  MENU_OPTION_SIZE: 60, // Increased for easier tapping
};