import { useState, useEffect, useRef } from 'react';
import { Monster, GameState, PlacedPad } from '../types';
import { 
  WAVE_CONFIG,
  PAD_CONFIG,
  ENERGY_CONFIG,
  BUILD_SLOTS,
  GAME_GRID,
  generateRandomWaves,
  getUpgradeCost,
  getSellValue,
  UPGRADE_CONFIG
} from '../constants';
import {
  createMonster,
  updateMonsterPosition,
  hasMonsterReachedDefender,
  findMonstersInRange,
  canPadFire,
  calculateDamage,
  calculateFinalScore,
  getDamageColor,
  findMonstersInSplashRadius,
  applyDotEffect,
  processDotEffects,
  gridToPixel
} from '../utils';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

interface GameStats {
  totalKills: number;
  padsBuilt: number;
  upgradesMade: number;
  energyEarned: number;
}

export const useGameLogic = (
  onGameComplete: (score: number, xp: number) => void,
  onSkip: () => void
) => {
  // Initialize tower defense game state
  const [gameState, setGameState] = useState<GameState>({
    gameActive: false,
    timeLeft: WAVE_CONFIG.prepare.duration,
    currentWave: -1,
    score: 0,
    hearts: 3,
    energy: ENERGY_CONFIG.STARTING,
    monsters: [],
    placedPads: [],
    projectiles: [],
    lastSpawnTime: 0,
    waveStartTime: 0,
    lastEnergyGain: 0,
    gamePhase: 'prepare',
    monstersSpawned: 0,
    bossSpawned: false,
    bossHitHalf: false,
  });

  // Game UI state
  const [selectedPadType, setSelectedPadType] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [showTutorial, setShowTutorial] = useState(true);
  const [showUpgradeMenu, setShowUpgradeMenu] = useState(false);
  const [gamePaused, setGamePaused] = useState(false);
  const [showExitAlert, setShowExitAlert] = useState(false);
  const [showWaveAnnouncement, setShowWaveAnnouncement] = useState(false);
  const [showQuickStartGuide, setShowQuickStartGuide] = useState(false);
  const [showResultsScreen, setShowResultsScreen] = useState(false);
  const [gameResults, setGameResults] = useState<{
    finalScore: number;
    xpEarned: number;
    isVictory: boolean;
  } | null>(null);

  // Track unlocked pads per wave
  const [unlockedPads, setUnlockedPads] = useState<Set<string>>(new Set(['neck_relief_pad']));

  // Stretch effects state
  const [stretchEffects, setStretchEffects] = useState<Array<{
    id: string;
    type: string;
    fromX: number;
    fromY: number;
    toX: number;
    toY: number;
    onComplete: () => void;
  }>>([]);

  // Damage numbers for visual feedback (performance optimized)
  const [damageNumbers, setDamageNumbers] = useState<Array<{
    id: string;
    x: number;
    y: number;
    damage: number;
    color: string;
    effectiveness: string;
  }>>([]);

  // Cache for performance optimization
  const gameAreaCacheRef = useRef({
    gameWidth: 0,
    offsetX: 0,
    offsetY: 120,
  });

  // Initialize cache
  useEffect(() => {
    const gameWidth = GAME_GRID.COLS * GAME_GRID.CELL_SIZE;
    gameAreaCacheRef.current = {
      gameWidth,
      offsetX: (width - gameWidth) / 2,
      offsetY: 120,
    };
  }, []);

  // Range indicator for pad placement
  const [showRangeIndicator, setShowRangeIndicator] = useState<{
    slotId: number;
    padType: string;
    range: number;
  } | null>(null);

  // Game stats for tracking
  const [gameStats, setGameStats] = useState<GameStats>({
    totalKills: 0,
    padsBuilt: 0,
    upgradesMade: 0,
    energyEarned: 0,
  });

  // Refs for timers and state
  const gameTimerRef = useRef<NodeJS.Timeout>();
  const spawnTimerRef = useRef<NodeJS.Timeout>();
  const energyTimerRef = useRef<NodeJS.Timeout>();
  const gameLoopRef = useRef<NodeJS.Timeout>();
  const gameStateRef = useRef(gameState);
  const gamePausedRef = useRef(gamePaused);
  const showWaveAnnouncementRef = useRef(showWaveAnnouncement);
  const lastFrameTime = useRef<number>(Date.now());

  // Update refs when state changes
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    gamePausedRef.current = gamePaused;
  }, [gamePaused]);

  useEffect(() => {
    showWaveAnnouncementRef.current = showWaveAnnouncement;
  }, [showWaveAnnouncement]);

  return {
    // State
    gameState,
    setGameState,
    selectedPadType,
    setSelectedPadType,
    selectedSlot,
    setSelectedSlot,
    showTutorial,
    setShowTutorial,
    showUpgradeMenu,
    setShowUpgradeMenu,
    gamePaused,
    setGamePaused,
    showExitAlert,
    setShowExitAlert,
    showWaveAnnouncement,
    setShowWaveAnnouncement,
    showQuickStartGuide,
    setShowQuickStartGuide,
    showResultsScreen,
    setShowResultsScreen,
    gameResults,
    setGameResults,
    unlockedPads,
    setUnlockedPads,
    stretchEffects,
    setStretchEffects,
    damageNumbers,
    setDamageNumbers,
    showRangeIndicator,
    setShowRangeIndicator,
    gameStats,
    setGameStats,
    
    // Refs
    gameAreaCacheRef,
    gameTimerRef,
    spawnTimerRef,
    energyTimerRef,
    gameLoopRef,
    gameStateRef,
    gamePausedRef,
    showWaveAnnouncementRef,
    lastFrameTime,
  };
};