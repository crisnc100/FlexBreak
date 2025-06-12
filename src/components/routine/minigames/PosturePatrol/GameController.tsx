import React, { useEffect, useCallback } from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import { useGameActions } from './hooks/useGameActions';
import { GameRenderer } from './GameRenderer';
import { 
  WAVE_CONFIG,
  PAD_CONFIG,
  ENERGY_CONFIG,
  BUILD_SLOTS,
  generateRandomWaves,
  getUpgradeCost,
  getSellValue,
} from './constants';
import {
  createMonster,
} from './utils';
import * as haptics from '../../../../utils/haptics';

interface GameControllerProps {
  onGameComplete: (score: number, xp: number) => void;
  onSkip: () => void;
  context?: string;
}

export const GameController: React.FC<GameControllerProps> = ({
  onGameComplete,
  onSkip,
  context = 'routine'
}) => {
  const gameLogicState = useGameLogic(onGameComplete, onSkip);
  const {
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
    gameAreaCacheRef,
    gameTimerRef,
    spawnTimerRef,
    energyTimerRef,
    gameLoopRef,
    gameStateRef,
    gamePausedRef,
    showWaveAnnouncementRef,
    lastFrameTime,
  } = gameLogicState;

  const gameActions = useGameActions(
    gameState,
    setGameState,
    gameStats,
    setGameStats,
    unlockedPads,
    setUnlockedPads,
    stretchEffects,
    setStretchEffects,
    damageNumbers,
    setDamageNumbers,
    showRangeIndicator,
    setShowRangeIndicator,
    selectedPadType,
    setSelectedPadType,
    selectedSlot,
    setSelectedSlot,
    setShowUpgradeMenu,
    setShowTutorial,
    setGamePaused,
    setShowExitAlert,
    setShowWaveAnnouncement,
    setShowQuickStartGuide,
    setShowResultsScreen,
    setGameResults,
    gameAreaCacheRef,
    gameTimerRef,
    spawnTimerRef,
    energyTimerRef,
    gameLoopRef,
    gameStateRef,
    gamePausedRef,
    showWaveAnnouncementRef,
    lastFrameTime,
    onGameComplete,
    onSkip
  );

  const { updateGameLoop, endGame } = gameActions;

  // Update pad unlocks based on current wave
  useEffect(() => {
    if (gameState.currentWave >= 1) {
      const waveConfig = WAVE_CONFIG[gameState.currentWave];
      if (waveConfig && waveConfig.unlockedPad) {
        setUnlockedPads(prev => new Set([...prev, waveConfig.unlockedPad]));
      }
    }
  }, [gameState.currentWave, setUnlockedPads]);

  // Start a new wave
  const startWave = useCallback((waveNumber: number) => {
    const waveConfig = WAVE_CONFIG[waveNumber];
    if (!waveConfig) return;

    // Show wave announcement for all waves except prepare phase
    if (waveNumber >= 0) {
      setGamePaused(true);
      setShowWaveAnnouncement(true);
      // Component will auto-dismiss and call handleWaveAnnouncementComplete
    }

    setGameState(prev => ({
      ...prev,
      monstersSpawned: 0,
      bossSpawned: waveNumber === 4 ? false : prev.bossSpawned, // Reset for boss wave
      bossHitHalf: waveNumber === 4 ? false : prev.bossHitHalf, // Reset for boss wave
      waveStartTime: Date.now(),
    }));

    // No auto-placement - user must place pads manually

    // Start spawning monsters (after announcement)
    if (waveConfig.monsters) {
      setTimeout(() => startMonsterSpawning(waveNumber), waveNumber >= 0 ? 1700 : 1000);
    } else if (waveConfig.boss) {
      setTimeout(() => spawnBoss(), waveNumber >= 0 ? 1700 : 1500);
    }
  }, [setGamePaused, setShowWaveAnnouncement, setGameState]);

  // Handle wave announcement completion
  const handleWaveAnnouncementComplete = useCallback(() => {
    setShowWaveAnnouncement(false);
    setGamePaused(false);
    // Reset frame time to prevent monster position jumps after announcement
    lastFrameTime.current = Date.now();
  }, [setShowWaveAnnouncement, setGamePaused, lastFrameTime]);

  // Start monster spawning for a wave
  const startMonsterSpawning = useCallback((waveNumber: number) => {
    const waveConfig = WAVE_CONFIG[waveNumber];
    if (!waveConfig || !waveConfig.monsters) return;

    const spawnMonster = (monsterConfig: any) => {
      setGameState(prev => {
        if (prev.monstersSpawned >= monsterConfig.count) return prev;

        const monster = createMonster(monsterConfig.type, waveNumber);
        return {
          ...prev,
          monsters: [...prev.monsters, monster],
          monstersSpawned: prev.monstersSpawned + 1,
        };
      });
    };

    // Spawn monsters with delays
    waveConfig.monsters.forEach(monsterConfig => {
      let spawned = 0;
      const spawnInterval = setInterval(() => {
        if (spawned >= monsterConfig.count) {
          clearInterval(spawnInterval);
          return;
        }
        spawnMonster(monsterConfig);
        spawned++;
      }, monsterConfig.spawnDelay);
    });
  }, [setGameState]);

  // Spawn boss minions
  const spawnBossMinions = useCallback(() => {
    const bossMinionsConfig = WAVE_CONFIG[4].bossMinions;
    if (!bossMinionsConfig || !gameStateRef.current.gameActive) return;

    // Spawn random minions with increased speed
    for (let i = 0; i < bossMinionsConfig.count; i++) {
      setTimeout(() => {
        setGameState(prev => {
          if (!prev.gameActive || prev.currentWave !== 4) return prev;

          // Pick a random monster type
          const randomType = bossMinionsConfig.types[
            Math.floor(Math.random() * bossMinionsConfig.types.length)
          ];

          const minion = createMonster(randomType as any, 4);
          // Apply speed multiplier
          minion.speed = Math.floor(minion.speed / bossMinionsConfig.speedMultiplier);

          return {
            ...prev,
            monsters: [...prev.monsters, minion],
          };
        });
      }, i * 1000); // Stagger spawns by 1 second
    }
  }, [setGameState, gameStateRef]);

  // Spawn boss monster
  const spawnBoss = useCallback(() => {
    const bossConfig = WAVE_CONFIG[4].boss;
    const bossMinionsConfig = WAVE_CONFIG[4].bossMinions;
    if (!bossConfig) return;

    const boss = createMonster(bossConfig.type as any, 4);
    boss.hp = bossConfig.hp;
    boss.maxHp = bossConfig.hp;
    boss.speed = bossConfig.speed;
    boss.isBoss = true;

    setGameState(prev => ({
      ...prev,
      monsters: [...prev.monsters, boss],
      bossSpawned: true,
    }));

    // Schedule minion spawning after delay
    if (bossMinionsConfig) {
      setTimeout(() => {
        spawnBossMinions();
      }, bossMinionsConfig.delay);
    }
  }, [setGameState, spawnBossMinions]);

  // Handle pad upgrade
  const handlePadUpgrade = useCallback((slotId: number) => {
    const pad = gameState.placedPads.find(p => p.slotId === slotId);
    if (!pad || pad.level >= 3) return;
    
    const upgradeCost = getUpgradeCost(pad.padType, pad.level);
    if (gameState.energy < upgradeCost) return;
    
    setGameState(prev => ({
      ...prev,
      energy: prev.energy - upgradeCost,
      placedPads: prev.placedPads.map(p => 
        p.slotId === slotId ? { ...p, level: p.level + 1 } : p
      )
    }));
    
    setGameStats(prev => ({
      ...prev,
      upgradesMade: prev.upgradesMade + 1,
    }));
    
    setShowUpgradeMenu(false);
    setSelectedSlot(null);
  }, [gameState.placedPads, gameState.energy, setGameState, setGameStats, setShowUpgradeMenu, setSelectedSlot]);

  // Handle pad sell
  const handlePadSell = useCallback((slotId: number) => {
    const pad = gameState.placedPads.find(p => p.slotId === slotId);
    if (!pad) return;
    
    const sellValue = getSellValue(pad.padType, pad.level);
    
    setGameState(prev => ({
      ...prev,
      energy: Math.min(ENERGY_CONFIG.MAX_ENERGY, prev.energy + sellValue),
      placedPads: prev.placedPads.filter(p => p.slotId !== slotId)
    }));
    
    setShowUpgradeMenu(false);
    setSelectedSlot(null);
  }, [gameState.placedPads, setGameState, setShowUpgradeMenu, setSelectedSlot]);

  // Handle build slot press
  const handleSlotPress = useCallback((slotId: number) => {
    const existingPad = gameState.placedPads.find(p => p.slotId === slotId);
    
    if (existingPad) {
      setSelectedSlot(slotId);
      setShowUpgradeMenu(true);
      setShowRangeIndicator(null);
      return;
    }

    if (!selectedPadType) {
      if (showRangeIndicator?.slotId === slotId) {
        setShowRangeIndicator(null);
      }
      return;
    }
    
    const padConfig = PAD_CONFIG[selectedPadType];
    if (!padConfig || gameState.energy < padConfig.cost) return;
    if (!unlockedPads.has(selectedPadType)) return;

    haptics.medium();
    
    // Place pad and deduct energy
    const newPad = {
      slotId,
      padType: selectedPadType as any,
      level: 1,
      lastFired: 0,
    };

    setGameState(prev => ({
      ...prev,
      energy: prev.energy - padConfig.cost,
      placedPads: [...prev.placedPads, newPad],
    }));

    setGameStats(prev => ({
      ...prev,
      padsBuilt: prev.padsBuilt + 1,
    }));

    setSelectedPadType(null);
    setShowRangeIndicator(null);
  }, [gameState.placedPads, gameState.energy, selectedPadType, showRangeIndicator, unlockedPads, setSelectedSlot, setShowUpgradeMenu, setShowRangeIndicator, setGameState, setGameStats, setSelectedPadType]);

  // Handle pad selection from inventory
  const handlePadSelect = useCallback((padType: string) => {
    const padConfig = PAD_CONFIG[padType];
    if (!padConfig || gameState.energy < padConfig.cost) return;
    if (!unlockedPads.has(padType)) return;
    
    if (selectedPadType === padType) {
      setSelectedPadType(null);
      setShowRangeIndicator(null);
    } else {
      setSelectedPadType(padType);
      setShowRangeIndicator(null);
    }
    haptics.light();
  }, [gameState.energy, unlockedPads, selectedPadType, setSelectedPadType, setShowRangeIndicator]);

  // Handle skip button press during game
  const handleSkipPress = useCallback(() => {
    setGamePaused(true);
    setShowExitAlert(true);
    haptics.light();
  }, [setGamePaused, setShowExitAlert]);

  const confirmExit = useCallback(() => {
    setShowExitAlert(false);
    setGamePaused(false);
    haptics.medium();
    // Clear all timers
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (energyTimerRef.current) clearInterval(energyTimerRef.current);
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    onSkip();
  }, [setShowExitAlert, setGamePaused, gameTimerRef, spawnTimerRef, energyTimerRef, gameLoopRef, onSkip]);

  const cancelExit = useCallback(() => {
    setShowExitAlert(false);
    setGamePaused(false);
    // Reset frame time to prevent monster position jumps
    lastFrameTime.current = Date.now();
    haptics.light();
  }, [setShowExitAlert, setGamePaused, lastFrameTime]);

  // Handle results screen continue
  const handleResultsContinue = useCallback(() => {
    if (gameResults) {
      onGameComplete(gameResults.finalScore, gameResults.xpEarned);
    }
  }, [gameResults, onGameComplete]);

  // Smart skip functionality - skip tutorial with auto-placed pad and guidance
  const handleSmartSkip = useCallback(() => {
    // Generate new random waves for this playthrough
    const newWaves = generateRandomWaves();
    Object.assign(WAVE_CONFIG, newWaves);
    
    const now = Date.now();
    
    // Start directly in prepare phase with first pad auto-placed
    setGameState({
      gameActive: true,
      timeLeft: 8, // 8 second prepare phase
      currentWave: -1,
      score: 0,
      hearts: 3,
      energy: ENERGY_CONFIG.STARTING,
      gamePhase: 'prepare',
      lastEnergyGain: now,
      waveStartTime: now,
      monsters: [],
      placedPads: [{
        slotId: 0, // Auto-place first stretch pad
        padType: 'neck_relief_pad',
        level: 1,
        lastFired: 0,
      }],
      projectiles: [],
      monstersSpawned: 0,
      bossSpawned: false,
      bossHitHalf: false,
      lastSpawnTime: 0,
    });

    // Reset UI state
    setShowTutorial(false);
    setSelectedPadType(null);
    setSelectedSlot(null);
    setShowUpgradeMenu(false);
    setGamePaused(false);
    setShowExitAlert(false);
    setShowWaveAnnouncement(false);
    setStretchEffects([]);
    setDamageNumbers([]);
    setShowRangeIndicator(null);

    // Show quick start guide overlay
    setShowQuickStartGuide(true);
    setTimeout(() => setShowQuickStartGuide(false), 3000);

    // Reset unlocked pads to starting state
    setUnlockedPads(new Set(['neck_relief_pad']));

    setGameStats({
      totalKills: 0,
      padsBuilt: 1, // Count the auto-placed pad
      upgradesMade: 0,
      energyEarned: 0,
    });
    
    // Start main game timer (FIXED: use same logic as normal game)
    gameTimerRef.current = setInterval(() => {
      if (gamePausedRef.current) return; // Only pause for explicit game pause, not announcements
      
      setGameState(prev => {
        if (prev.timeLeft <= 1) {
          // Use same wave progression logic as normal game
          console.log(`Smart Skip: Wave ${prev.currentWave} ending, moving to next`);
          if (prev.currentWave === -1) {
            // Skip tutorial, go directly to wave 1
            startWave(1);
            const duration = WAVE_CONFIG[1]?.duration || 25;
            console.log(`Smart Skip: Starting wave 1, duration: ${duration}`);
            return { ...prev, timeLeft: duration, currentWave: 1, gamePhase: 'wave' };
          } else if (prev.currentWave >= 1 && prev.currentWave <= 2) {
            const nextWave = prev.currentWave + 1;
            startWave(nextWave);
            const duration = WAVE_CONFIG[nextWave]?.duration || 25;
            console.log(`Smart Skip: Starting wave ${nextWave}, duration: ${duration}`);
            return { ...prev, timeLeft: duration, currentWave: nextWave, gamePhase: 'wave' };
          } else if (prev.currentWave === 3) {
            startWave(4);
            const duration = WAVE_CONFIG[4]?.duration || 25;
            console.log(`Smart Skip: Starting boss wave, duration: ${duration}`);
            return { ...prev, timeLeft: duration, currentWave: 4, gamePhase: 'boss' };
          } else {
            console.log('Smart Skip: Game ending');
            endGame();
            return prev;
          }
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    // Start energy trickle timer
    energyTimerRef.current = setInterval(() => {
      if (gamePausedRef.current || showWaveAnnouncementRef.current) return;
      
      setGameState(prev => ({
        ...prev,
        energy: Math.min(ENERGY_CONFIG.MAX_ENERGY, prev.energy + 1),
        lastEnergyGain: Date.now(),
      }));
      
      setGameStats(prev => ({
        ...prev,
        energyEarned: prev.energyEarned + 1,
      }));
    }, ENERGY_CONFIG.TRICKLE_RATE);

    // Start game loop (60 FPS for smooth performance)
    gameLoopRef.current = setInterval(() => {
      if (gamePausedRef.current || showWaveAnnouncementRef.current || !gameStateRef.current.gameActive) return;
      updateGameLoop();
    }, 16); // 60 FPS
  }, [
    setGameState, setShowTutorial, setSelectedPadType, setSelectedSlot, setShowUpgradeMenu,
    setGamePaused, setShowExitAlert, setShowWaveAnnouncement, setStretchEffects, setDamageNumbers,
    setShowRangeIndicator, setShowQuickStartGuide, setUnlockedPads, setGameStats, gameTimerRef,
    energyTimerRef, gameLoopRef, gamePausedRef, showWaveAnnouncementRef, gameStateRef, startWave, updateGameLoop
  ]);

  // Start the game (normal tutorial flow)
  const startGame = useCallback(() => {
    // Generate new random waves for this playthrough
    const newWaves = generateRandomWaves();
    Object.assign(WAVE_CONFIG, newWaves);
    
    const now = Date.now();
    
    // Reset all game state for fresh start
    setGameState({
      gameActive: true,
      timeLeft: WAVE_CONFIG.prepare.duration,
      currentWave: -1,
      score: 0,
      hearts: 3,
      energy: ENERGY_CONFIG.STARTING,
      gamePhase: 'prepare',
      lastEnergyGain: now,
      waveStartTime: now,
      monsters: [],
      placedPads: [],
      projectiles: [],
      monstersSpawned: 0,
      bossSpawned: false,
      bossHitHalf: false,
      lastSpawnTime: 0,
    });

    // Reset UI state
    setSelectedPadType(null);
    setSelectedSlot(null);
    setShowUpgradeMenu(false);
    setGamePaused(false);
    setShowExitAlert(false);
    setShowWaveAnnouncement(false);
    setStretchEffects([]);
    setDamageNumbers([]);
    setShowRangeIndicator(null);

    // Reset unlocked pads to starting state
    setUnlockedPads(new Set(['neck_relief_pad']));

    setGameStats({
      totalKills: 0,
      padsBuilt: 0,
      upgradesMade: 0,
      energyEarned: 0,
    });
    
    // Start main game timer (FIXED: don't pause for wave announcements)
    gameTimerRef.current = setInterval(() => {
      if (gamePausedRef.current) return; // Only pause for explicit game pause, not announcements
      
      setGameState(prev => {
        if (prev.timeLeft <= 1) {
          // Move to next wave/phase
          console.log(`Wave ${prev.currentWave} ending, moving to next`); // Debug log
          if (prev.currentWave === -1) {
            startWave(0);
            const duration = WAVE_CONFIG[0]?.duration || 10;
            console.log(`Starting tutorial wave, duration: ${duration}`);
            return { ...prev, timeLeft: duration, currentWave: 0, gamePhase: 'tutorial' };
          } else if (prev.currentWave === 0) {
            startWave(1);
            const duration = WAVE_CONFIG[1]?.duration || 25;
            console.log(`Starting wave 1, duration: ${duration}`);
            return { ...prev, timeLeft: duration, currentWave: 1, gamePhase: 'wave' };
          } else if (prev.currentWave >= 1 && prev.currentWave <= 2) {
            const nextWave = prev.currentWave + 1;
            startWave(nextWave);
            const duration = WAVE_CONFIG[nextWave]?.duration || 25;
            console.log(`Starting wave ${nextWave}, duration: ${duration}`);
            return { ...prev, timeLeft: duration, currentWave: nextWave, gamePhase: 'wave' };
          } else if (prev.currentWave === 3) {
            startWave(4);
            const duration = WAVE_CONFIG[4]?.duration || 25;
            console.log(`Starting boss wave, duration: ${duration}`);
            return { ...prev, timeLeft: duration, currentWave: 4, gamePhase: 'boss' };
          } else {
            console.log('Game ending');
            endGame();
            return prev;
          }
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    // Start energy trickle timer
    energyTimerRef.current = setInterval(() => {
      if (gamePausedRef.current || showWaveAnnouncementRef.current) return;
      
      setGameState(prev => ({
        ...prev,
        energy: Math.min(ENERGY_CONFIG.MAX_ENERGY, prev.energy + 1),
        lastEnergyGain: Date.now(),
      }));
      
      setGameStats(prev => ({
        ...prev,
        energyEarned: prev.energyEarned + 1,
      }));
    }, ENERGY_CONFIG.TRICKLE_RATE);

    // Start game loop for monster movement and combat (60 FPS for smooth performance)
    gameLoopRef.current = setInterval(() => {
      if (gamePausedRef.current || showWaveAnnouncementRef.current || !gameStateRef.current.gameActive) return;
      updateGameLoop();
    }, 16); // 60 FPS
  }, [
    setGameState, setSelectedPadType, setSelectedSlot, setShowUpgradeMenu, setGamePaused,
    setShowExitAlert, setShowWaveAnnouncement, setStretchEffects, setDamageNumbers,
    setShowRangeIndicator, setUnlockedPads, setGameStats, gameTimerRef, energyTimerRef,
    gameLoopRef, gamePausedRef, showWaveAnnouncementRef, gameStateRef, startWave, endGame, updateGameLoop
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (energyTimerRef.current) clearInterval(energyTimerRef.current);
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [gameTimerRef, spawnTimerRef, energyTimerRef, gameLoopRef]);

  return (
    <GameRenderer
      // State props
      gameState={gameState}
      selectedPadType={selectedPadType}
      selectedSlot={selectedSlot}
      showTutorial={showTutorial}
      showUpgradeMenu={showUpgradeMenu}
      gamePaused={gamePaused}
      showExitAlert={showExitAlert}
      showWaveAnnouncement={showWaveAnnouncement}
      showQuickStartGuide={showQuickStartGuide}
      showResultsScreen={showResultsScreen}
      gameResults={gameResults}
      unlockedPads={unlockedPads}
      stretchEffects={stretchEffects}
      damageNumbers={damageNumbers}
      showRangeIndicator={showRangeIndicator}
      gameStats={gameStats}
      
      // Event handlers
      onStart={() => {
        setShowTutorial(false);
        startGame();
      }}
      onSmartSkip={handleSmartSkip}
      onSkip={onSkip}
      onSlotPress={handleSlotPress}
      onPadSelect={handlePadSelect}
      onPadUpgrade={handlePadUpgrade}
      onPadSell={handlePadSell}
      onSkipPress={handleSkipPress}
      onConfirmExit={confirmExit}
      onCancelExit={cancelExit}
      onWaveAnnouncementComplete={handleWaveAnnouncementComplete}
      onResultsContinue={handleResultsContinue}
      onUpgradeMenuClose={() => {
        setShowUpgradeMenu(false);
        setSelectedSlot(null);
      }}
    />
  );
};