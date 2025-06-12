import { MonsterType, Monster, PlacedPad, DamageNumber } from './types';
import { 
  WAVE_CONFIG,
  MONSTER_CONFIG,
  PAD_CONFIG,
  PATH_WAYPOINTS,
  GAME_GRID,
  BUILD_SLOTS,
  MONSTER_RESISTANCES,
  DAMAGE_COLORS,
  UPGRADE_CONFIG
} from './constants';

/**
 * Convert grid coordinates to pixel coordinates
 */
export const gridToPixel = (gridX: number, gridY: number) => ({
  x: gridX * GAME_GRID.CELL_SIZE + GAME_GRID.CELL_SIZE / 2,
  y: gridY * GAME_GRID.CELL_SIZE + GAME_GRID.CELL_SIZE / 2,
});

/**
 * Get monster position along path based on progress (0-1)
 */
export const getPositionAlongPath = (progress: number): { x: number; y: number; waypointIndex: number } => {
  const totalWaypoints = PATH_WAYPOINTS.length - 1;
  const exactIndex = progress * totalWaypoints;
  const currentIndex = Math.floor(exactIndex);
  const nextIndex = Math.min(currentIndex + 1, totalWaypoints);
  const segmentProgress = exactIndex - currentIndex;
  
  const current = PATH_WAYPOINTS[currentIndex];
  const next = PATH_WAYPOINTS[nextIndex];
  
  return {
    x: current.x + (next.x - current.x) * segmentProgress,
    y: current.y + (next.y - current.y) * segmentProgress,
    waypointIndex: currentIndex
  };
};

/**
 * Create a monster for the current wave
 */
export const createMonster = (type: MonsterType, waveNumber: number): Monster => {
  const config = MONSTER_CONFIG[type];
  const id = `monster_${Date.now()}_${Math.random()}`;
  
  return {
    id,
    type,
    hp: config.hp,
    maxHp: config.hp,
    speed: config.speed,
    value: config.value,
    currentWaypointIndex: 0,
    pathProgress: 0,
    position: { x: PATH_WAYPOINTS[0].x, y: PATH_WAYPOINTS[0].y },
    pixelPosition: null as any, // Will be set in component
    isBoss: type === 'boss_posture'
  };
};

/**
 * Calculate distance between two points
 */
export const calculateDistance = (p1: { x: number; y: number }, p2: { x: number; y: number }): number => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Find monsters in range of a pad
 */
export const findMonstersInRange = (pad: PlacedPad, monsters: Monster[]): Monster[] => {
  const slot = BUILD_SLOTS.find(s => s.id === pad.slotId);
  if (!slot) return [];
  
  const padConfig = PAD_CONFIG[pad.padType];
  const upgradeConfig = UPGRADE_CONFIG[pad.padType];
  const levelConfig = upgradeConfig.levels[pad.level];
  const padPos = { x: slot.gridX, y: slot.gridY };
  
  // Apply upgrade range multiplier
  const rangeMultiplier = levelConfig.rangeMultiplier || 1.0;
  const range = (padConfig.range / GAME_GRID.CELL_SIZE) * rangeMultiplier;
  
  return monsters.filter(monster => {
    if (monster.hp <= 0) return false;
    const distance = calculateDistance(padPos, monster.position);
    return distance <= range;
  });
};

/**
 * Calculate damage with upgrades and type advantages
 */
export const calculateDamage = (pad: PlacedPad, targetMonster: Monster): { damage: number; effectiveness: 'super' | 'effective' | 'normal' | 'resisted' | 'heavy_resisted' } => {
  const padConfig = PAD_CONFIG[pad.padType];
  const upgradeConfig = UPGRADE_CONFIG[pad.padType];
  const levelConfig = upgradeConfig.levels[pad.level];
  
  // Apply upgrade damage multiplier
  const damageMultiplier = levelConfig.damageMultiplier || 1.0;
  const baseDamage = padConfig.damage * damageMultiplier;
  
  // Get resistance multiplier
  const resistances = MONSTER_RESISTANCES[targetMonster.type];
  const resistanceMultiplier = resistances[pad.padType] || 1.0;
  
  // Apply special bonuses
  let finalMultiplier = resistanceMultiplier;
  
  // Tech Neck bonus for Neck Relief Pad
  if (pad.padType === 'neck_relief_pad' && targetMonster.type === 'tech_neck' && padConfig.techNeckBonus) {
    finalMultiplier = padConfig.techNeckBonus;
  }
  
  // Apply dodge chance for Lean Twist (except for undodgeable attacks)
  if (targetMonster.type === 'lean_twist' && !padConfig.undodgeable) {
    // 30% chance to dodge
    if (Math.random() < 0.3) {
      return { damage: 0, effectiveness: 'resisted' };
    }
  }
  
  const finalDamage = Math.floor(baseDamage * finalMultiplier);
  
  // Determine effectiveness for color coding
  let effectiveness: 'super' | 'effective' | 'normal' | 'resisted' | 'heavy_resisted';
  if (finalMultiplier >= 2.0) effectiveness = 'super';
  else if (finalMultiplier >= 1.5) effectiveness = 'effective';
  else if (finalMultiplier >= 0.8) effectiveness = 'normal';
  else if (finalMultiplier >= 0.5) effectiveness = 'resisted';
  else effectiveness = 'heavy_resisted';
  
  return { damage: finalDamage, effectiveness };
};

/**
 * Apply slow effect to monster
 */
export const applySlowEffect = (monster: Monster, slowEffect: number): Monster => {
  return {
    ...monster,
    slowEffect: Math.max(monster.slowEffect || 0, slowEffect)
  };
};

/**
 * Apply damage over time effect
 */
export const applyDotEffect = (monster: Monster, dotDamage: number, duration: number): Monster => {
  return {
    ...monster,
    dotDamage: dotDamage,
    dotDuration: duration,
    dotAppliedTime: Date.now()
  };
};

/**
 * Process damage over time effects
 */
export const processDotEffects = (monster: Monster, deltaTime: number): { monster: Monster; dotDamage: number } => {
  if (!monster.dotDuration || monster.dotDuration <= 0) {
    return { monster, dotDamage: 0 };
  }
  
  const dotDamageThisTick = (monster.dotDamage || 0) * (deltaTime / 1000);
  const newDuration = Math.max(0, monster.dotDuration - deltaTime / 1000);
  
  return {
    monster: {
      ...monster,
      hp: Math.max(0, monster.hp - dotDamageThisTick),
      dotDuration: newDuration
    },
    dotDamage: dotDamageThisTick
  };
};

/**
 * Get damage color based on effectiveness
 */
export const getDamageColor = (effectiveness: string): string => {
  switch (effectiveness) {
    case 'super': return DAMAGE_COLORS.SUPER_EFFECTIVE;
    case 'effective': return DAMAGE_COLORS.EFFECTIVE;
    case 'normal': return DAMAGE_COLORS.NORMAL;
    case 'resisted': return DAMAGE_COLORS.RESISTED;
    case 'heavy_resisted': return DAMAGE_COLORS.HEAVILY_RESISTED;
    default: return DAMAGE_COLORS.NORMAL;
  }
};

/**
 * Find monsters in splash radius
 */
export const findMonstersInSplashRadius = (
  center: Monster,
  allMonsters: Monster[],
  splashRadius: number
): Monster[] => {
  const radiusInGrid = splashRadius / GAME_GRID.CELL_SIZE;
  
  return allMonsters.filter(monster => {
    if (monster.id === center.id || monster.hp <= 0) return false;
    const distance = calculateDistance(center.position, monster.position);
    return distance <= radiusInGrid;
  });
};

/**
 * Find all monsters in a line from pad
 */
export const findMonstersInLine = (
  pad: PlacedPad,
  monsters: Monster[],
  direction: { x: number; y: number }
): Monster[] => {
  const slot = BUILD_SLOTS.find(s => s.id === pad.slotId);
  if (!slot) return [];
  
  const padPos = { x: slot.gridX, y: slot.gridY };
  const padConfig = PAD_CONFIG[pad.padType];
  const maxRange = padConfig.range / GAME_GRID.CELL_SIZE;
  
  return monsters.filter(monster => {
    if (monster.hp <= 0) return false;
    
    // Check if monster is roughly in line
    const toMonster = {
      x: monster.position.x - padPos.x,
      y: monster.position.y - padPos.y
    };
    
    const distance = calculateDistance(padPos, monster.position);
    if (distance > maxRange) return false;
    
    // Check angle alignment (within 15 degrees)
    const dot = (toMonster.x * direction.x + toMonster.y * direction.y) / 
                (Math.sqrt(toMonster.x * toMonster.x + toMonster.y * toMonster.y) * 
                 Math.sqrt(direction.x * direction.x + direction.y * direction.y));
    
    return dot > 0.96; // cos(15°) ≈ 0.96
  }).sort((a, b) => {
    // Sort by distance from pad
    const distA = calculateDistance(padPos, a.position);
    const distB = calculateDistance(padPos, b.position);
    return distA - distB;
  });
};

/**
 * Check if pad can fire (based on fire rate)
 */
export const canPadFire = (pad: PlacedPad, currentTime: number): boolean => {
  const padConfig = PAD_CONFIG[pad.padType];
  const fireRate = padConfig.fireRate * (1 + (pad.level - 1) * 0.25); // +25% per level
  const cooldown = 1000 / fireRate; // Convert to milliseconds between shots
  
  return currentTime - pad.lastFired >= cooldown;
};

/**
 * Get upgrade cost for a pad
 */
export const getUpgradeCost = (level: number): number => {
  return 2; // Fixed cost of 2 energy per upgrade
};

/**
 * Get sell refund amount
 */
export const getSellRefund = (pad: PlacedPad): number => {
  const padConfig = PAD_CONFIG[pad.padType];
  const totalInvested = padConfig.cost + (pad.level - 1) * 2;
  return Math.floor(totalInvested * 0.5); // 50% refund
};

/**
 * Update monster position based on time and speed
 */
export const updateMonsterPosition = (monster: Monster, deltaTime: number): Monster => {
  if (monster.hp <= 0) return monster;
  
  const speedMultiplier = 1 - (monster.slowEffect || 0);
  const progress = deltaTime / (monster.speed * speedMultiplier);
  const newProgress = Math.min(1, monster.pathProgress + progress);
  const newPosition = getPositionAlongPath(newProgress);
  
  return {
    ...monster,
    pathProgress: newProgress,
    position: { x: newPosition.x, y: newPosition.y },
    currentWaypointIndex: newPosition.waypointIndex,
    slowEffect: Math.max(0, (monster.slowEffect || 0) - deltaTime / 1000) // Decay slow effect
  };
};

/**
 * Check if monster has reached the defender
 */
export const hasMonsterReachedDefender = (monster: Monster): boolean => {
  return monster.pathProgress >= 1;
};

/**
 * Calculate final score
 */
export const calculateFinalScore = (baseScore: number, heartsRemaining: number): number => {
  return baseScore + (heartsRemaining * 100); // Bonus for hearts preserved
};

/**
 * Get spawn point position
 */
export const getSpawnPosition = () => PATH_WAYPOINTS[0];

/**
 * Get defender position  
 */
export const getDefenderPosition = () => PATH_WAYPOINTS[PATH_WAYPOINTS.length - 1];

/**
 * Check if position is valid for building
 */
export const isValidBuildPosition = (slotId: number): boolean => {
  return BUILD_SLOTS.some(slot => slot.id === slotId);
};