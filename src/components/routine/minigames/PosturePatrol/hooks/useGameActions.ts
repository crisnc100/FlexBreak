import { useCallback } from 'react';
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
import * as haptics from '../../../../../utils/haptics';
import { Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

export const useGameActions = (
  gameState: GameState,
  setGameState: React.Dispatch<React.SetStateAction<GameState>>,
  gameStats: any,
  setGameStats: any,
  unlockedPads: Set<string>,
  setUnlockedPads: any,
  stretchEffects: any,
  setStretchEffects: any,
  damageNumbers: any,
  setDamageNumbers: any,
  showRangeIndicator: any,
  setShowRangeIndicator: any,
  selectedPadType: string | null,
  setSelectedPadType: any,
  selectedSlot: number | null,
  setSelectedSlot: any,
  setShowUpgradeMenu: any,
  setShowTutorial: any,
  setGamePaused: any,
  setShowExitAlert: any,
  setShowWaveAnnouncement: any,
  setShowQuickStartGuide: any,
  setShowResultsScreen: any,
  setGameResults: any,
  gameAreaCacheRef: any,
  gameTimerRef: any,
  spawnTimerRef: any,
  energyTimerRef: any,
  gameLoopRef: any,
  gameStateRef: any,
  gamePausedRef: any,
  showWaveAnnouncementRef: any,
  lastFrameTime: any,
  onGameComplete: (score: number, xp: number) => void,
  onSkip: () => void
) => {
  // Minimal damage numbers for feedback
  const addDamageNumber = useCallback((x: number, y: number, damage: number, color: string, effectiveness: string) => {
    // Only show damage for significant hits
    if (damage < 5) return;
    
    const damageNumberId = `damage_${Date.now()}_${Math.random()}`;
    
    setDamageNumbers((prev: any) => {
      // Only show 1 damage number at a time
      if (prev.length > 0) return prev;
      
      return [{
        id: damageNumberId,
        x,
        y,
        damage,
        color,
        effectiveness
      }];
    });
    
    // Quick removal
    setTimeout(() => {
      setDamageNumbers([]);
    }, 400);
  }, [setDamageNumbers]);

  // Game loop for updates (fast and smooth)
  const updateGameLoop = useCallback(() => {
    const now = Date.now();
    const deltaTime = now - lastFrameTime.current;
    
    // Skip frame if deltaTime is too small (performance optimization)
    if (deltaTime < 16) return; // Update at 60 FPS
    
    lastFrameTime.current = now;

    setGameState(prev => {
      // Batch all game state updates for performance
      let batchedUpdates: Partial<GameState> = {};
      
      // Update all monster positions for smooth movement
      const updatedMonsters = prev.monsters.map(monster => {
        // Skip dead monsters
        if (monster.hp <= 0) return monster;
        
        // Update all monsters for smooth movement
        return updateMonsterPosition(monster, deltaTime);
      });
      
      // Skip boss minion spawning for performance
      let newMonsters = updatedMonsters;

      // Check for monsters reaching defender
      const monstersReachingDefender = newMonsters.filter(hasMonsterReachedDefender);
      let newHearts = prev.hearts;
      
      monstersReachingDefender.forEach((monster) => {
        // Bosses take 2 lives, normal monsters take 1
        const livesLost = monster.isBoss ? 2 : 1;
        newHearts -= livesLost;
      });

      // Remove monsters that reached defender
      const activeMonsters = newMonsters.filter(monster => !hasMonsterReachedDefender(monster));

      // Handle pad firing
      handlePadFiring(prev, activeMonsters, now);

      // Remove dead monsters
      const livingMonsters = activeMonsters.filter(monster => monster.hp > 0);

      // Check game over
      if (newHearts <= 0) {
        setTimeout(() => endGame(), 500);
      }

      // Return batched updates
      return {
        ...prev,
        monsters: livingMonsters,
        hearts: newHearts,
        ...batchedUpdates
      };
    });
  }, [addDamageNumber, gameAreaCacheRef]);

  // Handle pad firing logic (back to checking all pads)
  const handlePadFiring = useCallback((gameState: GameState, monsters: Monster[], now: number) => {
    const { offsetX, offsetY } = gameAreaCacheRef.current;
    
    gameState.placedPads.forEach(pad => {
      if (canPadFire(pad, now)) {
        const targets = findMonstersInRange(pad, monsters);
        if (targets.length > 0) {
          const target = targets[0];
          pad.lastFired = now;

          const slot = BUILD_SLOTS.find(s => s.id === pad.slotId);
          if (slot) {
            const fromPos = gridToPixel(slot.gridX, slot.gridY);
            const toPos = gridToPixel(target.position.x, target.position.y);
            
            // Create stretch effect animation
            const effectId = `effect_${Date.now()}_${Math.random()}`;
            const newEffect = {
              id: effectId,
              type: pad.padType,
              fromX: offsetX + fromPos.x,
              fromY: offsetY + fromPos.y,
              toX: offsetX + toPos.x,
              toY: offsetY + toPos.y,
              onComplete: () => handlePadHit(effectId, pad, target, offsetX + toPos.x, offsetY + toPos.y),
            };
            
            setStretchEffects((prev: any) => [...prev, newEffect]);
          }
        }
      }
    });
  }, [gameAreaCacheRef, handlePadHit]);

  // Handle pad hit logic (with stretch effects)
  const handlePadHit = useCallback((effectId: string, pad: PlacedPad, target: Monster, x: number, y: number) => {
    setStretchEffects((prev: any) => prev.filter((e: any) => e.id !== effectId));
    
    // Calculate damage with enhanced system
    const damageResult = calculateDamage(pad, target);
    const finalDamage = damageResult.damage;
    
    // Show minimal damage feedback
    addDamageNumber(x, y, finalDamage, getDamageColor(damageResult.effectiveness), damageResult.effectiveness);
    
    setGameState(prevState => {
      const updatedMonsters = prevState.monsters.map(monster => {
        if (monster.id === target.id) {
          let updatedMonster = { ...monster };
          
          // Apply direct damage
          updatedMonster.hp = Math.max(0, updatedMonster.hp - finalDamage);
          
          // Apply special effects with upgrade bonuses
          const padConfig = PAD_CONFIG[pad.padType];
          const upgradeConfig = UPGRADE_CONFIG[pad.padType];
          const levelConfig = upgradeConfig.levels[pad.level];
          
          // Apply DoT for Chest Quest Pad with upgrade multiplier
          if (padConfig.dotDamage && padConfig.dotDuration) {
            const dotMultiplier = levelConfig.dotMultiplier || 1.0;
            const enhancedDotDamage = padConfig.dotDamage * dotMultiplier;
            const enhancedDotDuration = padConfig.dotDuration * dotMultiplier;
            updatedMonster = applyDotEffect(updatedMonster, enhancedDotDamage, enhancedDotDuration);
          }
          
          return updatedMonster;
        }
        return monster;
      });

      // Handle splash damage with upgrade bonuses
      let finalMonsters = updatedMonsters;
      const padConfig = PAD_CONFIG[pad.padType];
      const upgradeConfig = UPGRADE_CONFIG[pad.padType];
      const levelConfig = upgradeConfig.levels[pad.level];
      
      if (padConfig.splashRadius && padConfig.splashDamage) {
        const splashMultiplier = levelConfig.splashMultiplier || 1.0;
        const enhancedSplashRadius = padConfig.splashRadius * splashMultiplier;
        const splashTargets = findMonstersInSplashRadius(target, updatedMonsters, enhancedSplashRadius);
        finalMonsters = updatedMonsters.map(monster => {
          if (splashTargets.find(t => t.id === monster.id)) {
            const splashDamage = Math.floor(finalDamage * padConfig.splashDamage!);
            return { ...monster, hp: Math.max(0, monster.hp - splashDamage) };
          }
          return monster;
        });
      }

      // Check if target was killed
      const targetAfterDamage = finalMonsters.find(m => m.id === target.id);
      const wasKilled = targetAfterDamage && targetAfterDamage.hp <= 0;

      return {
        ...prevState,
        monsters: finalMonsters,
        energy: wasKilled ? Math.min(ENERGY_CONFIG.MAX_ENERGY, prevState.energy + target.value) : prevState.energy,
        score: wasKilled ? prevState.score + target.value * 10 : prevState.score,
      };
    });

    // Update stats if monster was killed
    if (target.hp - finalDamage <= 0) {
      setGameStats((prevStats: any) => ({
        ...prevStats,
        totalKills: prevStats.totalKills + 1,
      }));
    }
  }, [setStretchEffects, setDamageNumbers, setGameState, setGameStats]);

  // End the game with enhanced results
  const endGame = useCallback(() => {
    // Clear all timers
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (energyTimerRef.current) clearInterval(energyTimerRef.current);
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    
    // Calculate enhanced score with bonuses
    const baseScore = gameState.score;
    const heartsRemaining = gameState.hearts;
    const wavesSurvived = gameState.currentWave + 1;
    const perfectDefense = heartsRemaining === 3;
    
    // Calculate bonuses
    const survivalBonus = heartsRemaining * 10;
    const waveBonus = wavesSurvived * 15;
    const perfectBonus = perfectDefense ? 50 : 0;
    const killBonus = gameStats.totalKills * 5;
    
    const finalScore = baseScore + survivalBonus + waveBonus + perfectBonus + killBonus;
    
    // Enhanced XP calculation
    let xp = Math.floor(finalScore * 0.8); // Base XP from score
    xp += gameStats.totalKills * 2; // Bonus XP per kill
    xp += gameStats.padsBuilt * 3; // Bonus XP per pad built
    xp += gameStats.upgradesMade * 5; // Bonus XP per upgrade
    
    // Victory vs defeat XP
    const isVictory = gameState.currentWave >= 4 && heartsRemaining > 0;
    if (isVictory) {
      xp = Math.min(100, Math.max(75, xp)); // Victory: 75-100 XP
    } else {
      xp = Math.min(50, Math.max(15, xp)); // Defeat: 15-50 XP
    }
    
    // Set results and show results screen
    setGameResults({
      finalScore,
      xpEarned: xp,
      isVictory
    });
    
    setGameState(prev => ({ ...prev, gameActive: false, gamePhase: 'results' }));
    setShowResultsScreen(true);
  }, [gameState, gameStats, gameTimerRef, spawnTimerRef, energyTimerRef, gameLoopRef, setGameResults, setGameState, setShowResultsScreen]);

  // Handle results screen continue
  const handleResultsContinue = useCallback(() => {
    // This will be passed as a prop to the results screen
  }, []);

  return {
    addDamageNumber,
    updateGameLoop,
    handlePadFiring,
    handlePadHit,
    endGame,
    handleResultsContinue,
  };
};