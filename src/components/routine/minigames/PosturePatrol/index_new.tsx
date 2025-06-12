import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import * as haptics from '../../../../utils/haptics';

// Import tower defense components
import { MazePath } from './MazePath';
import { EnergyBank } from './EnergyBank';
import { HeartDisplay } from './HeartDisplay';
import { StretchEffects } from './StretchEffects';

// Import game modules
import { Monster, GameState, MonsterType, PlacedPad, Projectile } from './types';
import { 
  WAVE_CONFIG,
  MONSTER_CONFIG,
  PAD_CONFIG,
  ENERGY_CONFIG,
  PATH_WAYPOINTS,
  BUILD_SLOTS,
  GAME_GRID,
  POSITIONS,
  SCORING,
  generateRandomWaves
} from './constants';
import {
  createMonster,
  getPositionAlongPath,
  gridToPixel,
  updateMonsterPosition,
  hasMonsterReachedDefender,
  findMonstersInRange,
  canPadFire,
  calculateDamage,
  getUpgradeCost,
  getSellRefund,
  calculateFinalScore
} from './utils';

const { width, height } = Dimensions.get('window');

interface PosturePatrolProps {
  onGameComplete: (score: number, xp: number) => void;
  onSkip: () => void;
  context?: string;
}

export const PosturePatrol: React.FC<PosturePatrolProps> = ({
  onGameComplete,
  onSkip,
  context = 'routine'
}) => {
  const { theme } = useTheme();
  
  // Initialize tower defense game state
  const [gameState, setGameState] = useState<GameState>({
    gameActive: false,
    timeLeft: WAVE_CONFIG.prepare.duration,
    currentWave: -1, // Start at -1 for prepare phase
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

  // Game stats for tracking
  const [gameStats, setGameStats] = useState({
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
  const lastFrameTime = useRef<number>(Date.now());

  // Update ref when state changes
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Update pad unlocks based on current wave
  useEffect(() => {
    if (gameState.currentWave >= 1) {
      const waveConfig = WAVE_CONFIG[gameState.currentWave];
      if (waveConfig && waveConfig.unlockedPad) {
        setUnlockedPads(prev => new Set([...prev, waveConfig.unlockedPad]));
      }
    }
  }, [gameState.currentWave]);

  // Game loop for updates
  const updateGameLoop = () => {
    const now = Date.now();
    const deltaTime = now - lastFrameTime.current;
    lastFrameTime.current = now;

    setGameState(prev => {
      // Update monster positions
      const updatedMonsters = prev.monsters.map(monster => 
        updateMonsterPosition(monster, deltaTime)
      );

      // Check for monsters reaching defender
      const monstersReachingDefender = updatedMonsters.filter(hasMonsterReachedDefender);
      let newHearts = prev.hearts;
      
      monstersReachingDefender.forEach(() => {
        newHearts -= 1;
      });

      // Remove monsters that reached defender
      const activeMonsters = updatedMonsters.filter(monster => !hasMonsterReachedDefender(monster));

      // Handle pad firing
      const updatedPads = [...prev.placedPads];
      const newProjectiles = [...prev.projectiles];

      updatedPads.forEach(pad => {
        if (canPadFire(pad, now)) {
          const targets = findMonstersInRange(pad, activeMonsters);
          if (targets.length > 0) {
            // Fire at first target
            const target = targets[0];
            pad.lastFired = now;

            // Create stretch effect animation
            const slot = BUILD_SLOTS.find(s => s.id === pad.slotId);
            if (slot) {
              const gameWidth = GAME_GRID.COLS * GAME_GRID.CELL_SIZE;
              const offsetX = (width - gameWidth) / 2;
              const offsetY = 170;
              
              const fromPos = gridToPixel(slot.gridX, slot.gridY);
              const toPos = gridToPixel(target.position.x, target.position.y);
              
              const effectId = `effect_${Date.now()}_${Math.random()}`;
              const newEffect = {
                id: effectId,
                type: pad.padType,
                fromX: offsetX + fromPos.x,
                fromY: offsetY + fromPos.y,
                toX: offsetX + toPos.x,
                toY: offsetY + toPos.y,
                onComplete: () => {
                  setStretchEffects(prev => prev.filter(e => e.id !== effectId));
                  
                  // Deal damage when effect reaches target
                  const damage = calculateDamage(pad);
                  
                  setGameState(prevState => {
                    const updatedMonsters = prevState.monsters.map(monster => {
                      if (monster.id === target.id) {
                        const newHp = Math.max(0, monster.hp - damage);
                        return { ...monster, hp: newHp };
                      }
                      return monster;
                    });

                    // Check if target was killed
                    const targetAfterDamage = updatedMonsters.find(m => m.id === target.id);
                    const wasKilled = targetAfterDamage && targetAfterDamage.hp <= 0;

                    return {
                      ...prevState,
                      monsters: updatedMonsters,
                      energy: wasKilled ? Math.min(ENERGY_CONFIG.MAX_ENERGY, prevState.energy + target.value) : prevState.energy,
                      score: wasKilled ? prevState.score + SCORING.MONSTER_KILL : prevState.score,
                    };
                  });

                  // Update stats if monster was killed
                  const targetAfterDamage = target.hp - damage;
                  if (targetAfterDamage <= 0) {
                    setGameStats(prevStats => ({
                      ...prevStats,
                      totalKills: prevStats.totalKills + 1,
                    }));
                  }
                }
              };
              
              setStretchEffects(prev => [...prev, newEffect]);
            }
          }
        }
      });

      // Remove dead monsters
      const livingMonsters = activeMonsters.filter(monster => monster.hp > 0);

      // Check game over
      if (newHearts <= 0) {
        setTimeout(() => endGame(), 500);
      }

      return {
        ...prev,
        monsters: livingMonsters,
        hearts: newHearts,
        placedPads: updatedPads,
        projectiles: newProjectiles,
      };
    });
  };

  // Start a new wave
  const startWave = (waveNumber: number) => {
    const waveConfig = WAVE_CONFIG[waveNumber];
    if (!waveConfig) return;

    setGameState(prev => ({
      ...prev,
      monstersSpawned: 0,
      bossSpawned: false,
      bossHitHalf: false,
      waveStartTime: Date.now(),
    }));

    // Tutorial wave auto-places a pad
    if (waveNumber === 0 && waveConfig.autoPlacePad) {
      setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          placedPads: [...prev.placedPads, {
            slotId: waveConfig.autoPlacePad.slot,
            padType: waveConfig.autoPlacePad.type as any,
            level: 1,
            lastFired: 0,
          }],
        }));
      }, 2000); // 2 seconds into tutorial
    }

    // Start spawning monsters
    if (waveConfig.monsters) {
      setTimeout(() => startMonsterSpawning(waveNumber), 1000);
    } else if (waveConfig.boss) {
      setTimeout(() => spawnBoss(), 2000);
    }
  };

  // Start monster spawning for a wave
  const startMonsterSpawning = (waveNumber: number) => {
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
  };

  // Spawn boss monster
  const spawnBoss = () => {
    const bossConfig = WAVE_CONFIG[4].boss;
    if (!bossConfig) return;

    const boss = createMonster(bossConfig.type as MonsterType, 4);
    boss.hp = bossConfig.hp;
    boss.maxHp = bossConfig.hp;
    boss.speed = bossConfig.speed;
    boss.isBoss = true;

    setGameState(prev => ({
      ...prev,
      monsters: [...prev.monsters, boss],
      bossSpawned: true,
    }));
  };

  // Start the game
  const startGame = () => {
    // Generate new random waves for this playthrough
    const newWaves = generateRandomWaves();
    Object.assign(WAVE_CONFIG, newWaves);
    
    const now = Date.now();
    
    setGameState(prev => ({
      ...prev,
      gameActive: true,
      timeLeft: WAVE_CONFIG.prepare.duration,
      currentWave: -1, // Prepare phase
      gamePhase: 'prepare',
      lastEnergyGain: now,
      waveStartTime: now,
      monsters: [],
      placedPads: [],
      projectiles: [],
      monstersSpawned: 0,
      bossSpawned: false,
      bossHitHalf: false,
    }));

    setGameStats({
      totalKills: 0,
      padsBuilt: 0,
      upgradesMade: 0,
      energyEarned: 0,
    });
    
    // Start main game timer
    gameTimerRef.current = setInterval(() => {
      if (gamePaused) return;
      
      setGameState(prev => {
        if (prev.timeLeft <= 1) {
          // Move to next wave/phase
          if (prev.currentWave === -1) {
            // Move from prepare to tutorial (wave 0)
            startWave(0);
            return { ...prev, timeLeft: WAVE_CONFIG[0].duration, currentWave: 0, gamePhase: 'tutorial' };
          } else if (prev.currentWave === 0) {
            // Move from tutorial to wave 1
            startWave(1);
            return { ...prev, timeLeft: WAVE_CONFIG[1].duration, currentWave: 1, gamePhase: 'wave' };
          } else if (prev.currentWave >= 1 && prev.currentWave <= 2) {
            // Move to next wave
            const nextWave = prev.currentWave + 1;
            startWave(nextWave);
            return { ...prev, timeLeft: WAVE_CONFIG[nextWave].duration, currentWave: nextWave, gamePhase: 'wave' };
          } else if (prev.currentWave === 3) {
            // Move to boss wave
            startWave(4);
            return { ...prev, timeLeft: WAVE_CONFIG[4].duration, currentWave: 4, gamePhase: 'boss' };
          } else {
            // Game complete
            endGame();
            return prev;
          }
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    // Start energy trickle timer
    energyTimerRef.current = setInterval(() => {
      if (gamePaused) return;
      
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

    // Start game loop for monster movement and combat
    gameLoopRef.current = setInterval(() => {
      if (gamePaused || !gameStateRef.current.gameActive) return;
      updateGameLoop();
    }, 16); // 60 FPS
  };

  // Handle build slot press
  const handleSlotPress = (slotId: number) => {
    const existingPad = gameState.placedPads.find(p => p.slotId === slotId);
    
    if (existingPad) {
      // Show upgrade/sell menu
      setSelectedSlot(slotId);
      setShowUpgradeMenu(true);
      return;
    }

    if (!selectedPadType) return;
    
    const padConfig = PAD_CONFIG[selectedPadType];
    if (!padConfig || gameState.energy < padConfig.cost) return;
    if (!unlockedPads.has(selectedPadType)) return;

    haptics.medium();
    
    // Place pad and deduct energy
    const newPad: PlacedPad = {
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
  };

  // Handle pad selection from inventory
  const handlePadSelect = (padType: string) => {
    const padConfig = PAD_CONFIG[padType];
    if (!padConfig || gameState.energy < padConfig.cost) return;
    if (!unlockedPads.has(padType)) return;
    
    setSelectedPadType(selectedPadType === padType ? null : padType);
    haptics.light();
  };

  // End the game
  const endGame = () => {
    setGameState(prev => ({ ...prev, gameActive: false, gamePhase: 'results' }));
    
    // Clear all timers
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (energyTimerRef.current) clearInterval(energyTimerRef.current);
    if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    
    // Calculate final score
    const finalScore = calculateFinalScore(gameState.score, gameState.hearts);
    const xp = Math.min(100, Math.max(25, Math.floor(finalScore * 1.5)));
    
    setTimeout(() => {
      onGameComplete(finalScore, xp);
    }, 1500);
  };

  // Get figure image
  const getFigureImage = (type: MonsterType) => {
    const images = {
      tech_neck: require('../../../../../assets/images/miniGames/techNeck.png'),
      desk_hunch: require('../../../../../assets/images/miniGames/deskHunch2.png'),
      slouch_slump: require('../../../../../assets/images/miniGames/slouchSlump.png'),
      lean_twist: require('../../../../../assets/images/miniGames/leanTwist.png'),
      boss_posture: require('../../../../../assets/images/miniGames/deskHunch1.png'), // Placeholder
    };
    return images[type];
  };

  // Get wave description
  const getWaveDescription = (wave: number) => {
    const descriptions = {
      1: 'Early swarm incoming',
      2: 'Mixed assault wave',
      3: 'Heavy resistance',
      4: 'Boss battle!'
    };
    return descriptions[wave] || 'Unknown wave';
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (energyTimerRef.current) clearInterval(energyTimerRef.current);
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, []);

  // Enhanced tutorial screen with monster and pad showcase
  const renderTutorial = () => (
    <View style={styles.startScreen}>
      <View style={[styles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
        <Ionicons name="construct" size={48} color={theme.accent} />
      </View>
      
      <Text style={[styles.title, { color: theme.text }]}>
        Posture Defense
      </Text>
      
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        Build stretch pads to defend against bad posture monsters!
      </Text>

      {/* Monster Showcase */}
      <View style={styles.showcaseSection}>
        <Text style={[styles.showcaseTitle, { color: theme.accent }]}>
          👾 Posture Monsters
        </Text>
        <View style={styles.monsterShowcase}>
          <View style={styles.showcaseItem}>
            <Image 
              source={require('../../../../../assets/images/miniGames/techNeck.png')}
              style={styles.showcaseImage}
              resizeMode="contain"
            />
            <Text style={[styles.showcaseLabel, { color: theme.text }]}>Tech Neck</Text>
          </View>
          <View style={styles.showcaseItem}>
            <Image 
              source={require('../../../../../assets/images/miniGames/slouchSlump.png')}
              style={styles.showcaseImage}
              resizeMode="contain"
            />
            <Text style={[styles.showcaseLabel, { color: theme.text }]}>Slouch Slump</Text>
          </View>
          <View style={styles.showcaseItem}>
            <Image 
              source={require('../../../../../assets/images/miniGames/deskHunch2.png')}
              style={styles.showcaseImage}
              resizeMode="contain"
            />
            <Text style={[styles.showcaseLabel, { color: theme.text }]}>Desk Hunch</Text>
          </View>
          <View style={styles.showcaseItem}>
            <Image 
              source={require('../../../../../assets/images/miniGames/leanTwist.png')}
              style={styles.showcaseImage}
              resizeMode="contain"
            />
            <Text style={[styles.showcaseLabel, { color: theme.text }]}>Lean Twist</Text>
          </View>
        </View>
      </View>

      {/* Stretch Pad Showcase */}
      <View style={styles.showcaseSection}>
        <Text style={[styles.showcaseTitle, { color: theme.success }]}>
          🧘 Stretch Pads
        </Text>
        <View style={styles.padShowcase}>
          {Object.values(PAD_CONFIG).map(pad => (
            <View key={pad.id} style={styles.showcaseItem}>
              <View style={[styles.padPreview, { backgroundColor: pad.color + '40' }]}>
                <Image 
                  source={pad.image}
                  style={styles.showcasePadImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={[styles.showcaseLabel, { color: theme.text }]}>
                {pad.name.replace(' Pad', '')}
              </Text>
              <Text style={[styles.showcaseCost, { color: pad.color }]}>
                {pad.cost}⚡
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.quickTips}>
        <Text style={[styles.tipText, { color: theme.textSecondary }]}>
          🎯 Place pads on strategic positions to defend
        </Text>
        <Text style={[styles.tipText, { color: theme.textSecondary }]}>
          ⚡ Energy: +1 every 6s, +1 per kill
        </Text>
        <Text style={[styles.tipText, { color: theme.textSecondary }]}>
          💖 3 hearts - don't let monsters reach the defender!
        </Text>
      </View>
      
      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.playButton, { backgroundColor: theme.accent }]}
          onPress={() => {
            setShowTutorial(false);
            startGame();
          }}
        >
          <Text style={styles.playButtonText}>Start Defense</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
        >
          <Text style={[styles.skipButtonText, { color: theme.textSecondary }]}>
            Skip
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {showTutorial ? (
        renderTutorial()
      ) : (
        // Tower Defense Game Screen
        <View style={styles.gameScreen}>
          {/* Maze Path Background */}
          <MazePath />

          {/* Clean Top HUD Bar */}
          <View style={[styles.topHudBar, { backgroundColor: 'rgba(0,0,0,0.85)' }]}>
            {/* Left Section - Wave Info */}
            <View style={styles.hudSection}>
              <Text style={[styles.compactWaveText, { 
                color: gameState.gamePhase === 'boss' ? '#FF4444' :
                       gameState.gamePhase === 'prepare' ? '#4ECDC4' :
                       gameState.gamePhase === 'tutorial' ? '#FFD700' :
                       theme.accent
              }]}>
                {gameState.gamePhase === 'prepare' ? '🏗️ Setup' :
                 gameState.gamePhase === 'tutorial' ? '📚 Tutorial' :
                 gameState.gamePhase === 'boss' ? '👹 Boss' :
                 `⚔️ Wave ${gameState.currentWave}`}
              </Text>
            </View>

            {/* Center Section - Resources */}
            <View style={styles.hudSectionCenter}>
              <EnergyBank energy={gameState.energy} />
              <View style={styles.verticalSeparator} />
              <HeartDisplay hearts={gameState.hearts} />
            </View>

            {/* Right Section - Timer & Score */}
            <View style={styles.hudSectionRight}>
              <Text style={[styles.compactTimeText, { color: theme.accent }]}>
                {gameState.timeLeft}s
              </Text>
              <Text style={[styles.compactScoreText, { color: theme.textSecondary }]}>
                {gameState.score}
              </Text>
            </View>
          </View>

          {/* Simple Tutorial Tooltip */}
          {gameState.gamePhase === 'prepare' && (
            <View style={[styles.simpleTooltip, { backgroundColor: theme.accent + 'E6' }]}>
              <Text style={[styles.tooltipText, { color: 'white' }]}>
                🎯 Select stretch pads below → Tap build slots to place → Defend the figure!
              </Text>
            </View>
          )}

          {/* Monsters */}
          {gameState.monsters.map((monster) => {
            const gameWidth = GAME_GRID.COLS * GAME_GRID.CELL_SIZE;
            const offsetX = (width - gameWidth) / 2;
            const offsetY = 170;
            const pixelPos = gridToPixel(monster.position.x, monster.position.y);
            
            return (
              <View
                key={monster.id}
                style={[
                  styles.monster,
                  {
                    left: offsetX + pixelPos.x - POSITIONS.MONSTER_SIZE / 2,
                    top: offsetY + pixelPos.y - POSITIONS.MONSTER_SIZE / 2,
                  }
                ]}
              >
                <Image 
                  source={getFigureImage(monster.type)}
                  style={styles.monsterImage}
                  resizeMode="contain"
                />
                {/* HP Bar */}
                <View style={styles.hpBarContainer}>
                  <View 
                    style={[
                      styles.hpBar, 
                      { 
                        width: `${(monster.hp / monster.maxHp) * 100}%`,
                        backgroundColor: monster.isBoss ? '#FF4444' : theme.accent
                      }
                    ]} 
                  />
                </View>
              </View>
            );
          })}

          {/* Build Slots with Placed Pads */}
          {BUILD_SLOTS.map(slot => {
            const gameWidth = GAME_GRID.COLS * GAME_GRID.CELL_SIZE;
            const offsetX = (width - gameWidth) / 2;
            const offsetY = 170;
            const pixelPos = gridToPixel(slot.gridX, slot.gridY);
            const placedPad = gameState.placedPads.find(p => p.slotId === slot.id);
            
            return (
              <TouchableOpacity
                key={slot.id}
                style={[
                  styles.buildSlot,
                  {
                    left: offsetX + pixelPos.x - POSITIONS.BUILD_SLOT_SIZE / 2,
                    top: offsetY + pixelPos.y - POSITIONS.BUILD_SLOT_SIZE / 2,
                    backgroundColor: placedPad ? PAD_CONFIG[placedPad.padType].color + '40' : 'rgba(255,255,255,0.1)',
                    borderColor: placedPad ? PAD_CONFIG[placedPad.padType].color : theme.accent,
                  }
                ]}
                onPress={() => handleSlotPress(slot.id)}
              >
                {placedPad ? (
                  <>
                    <Image 
                      source={PAD_CONFIG[placedPad.padType].image}
                      style={styles.padImage}
                      resizeMode="contain"
                    />
                    <View style={styles.levelBadge}>
                      <Text style={styles.levelText}>Lv.{placedPad.level}</Text>
                    </View>
                  </>
                ) : (
                  <Text style={[styles.slotLabel, { color: theme.accent }]}>
                    {slot.label}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Pad Inventory */}
          <View style={styles.padInventory}>
            {Object.values(PAD_CONFIG).map(pad => {
              const isUnlocked = unlockedPads.has(pad.id);
              const canAfford = gameState.energy >= pad.cost;
              const isSelected = selectedPadType === pad.id;
              
              return (
                <TouchableOpacity
                  key={pad.id}
                  style={[
                    styles.padButton,
                    {
                      backgroundColor: isSelected ? pad.color + '40' : theme.cardBackground,
                      borderColor: isSelected ? pad.color : theme.border,
                      opacity: isUnlocked && canAfford ? 1 : 0.5,
                    }
                  ]}
                  onPress={() => isUnlocked && canAfford ? handlePadSelect(pad.id) : null}
                  disabled={!isUnlocked || !canAfford}
                >
                  <Image source={pad.image} style={styles.padIcon} resizeMode="contain" />
                  <Text style={[styles.padCost, { color: theme.text }]}>
                    {pad.cost}⚡
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Stretch Effects */}
          <StretchEffects effects={stretchEffects} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  startScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  quickTips: {
    alignItems: 'center',
    marginBottom: 24,
  },
  tipText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
  buttons: {
    width: '100%',
    gap: 12,
  },
  playButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  playButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  gameScreen: {
    flex: 1,
  },
  topHudBar: {
    position: 'absolute',
    top: 40,
    left: 8,
    right: 8,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 16,
    zIndex: 10,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  hudSection: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  hudSectionCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  hudSectionRight: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  verticalSeparator: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  compactWaveText: {
    fontSize: 16,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  compactTimeText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  compactScoreText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  simpleTooltip: {
    position: 'absolute',
    bottom: 170,
    left: 12,
    right: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    zIndex: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  tooltipText: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  monster: {
    position: 'absolute',
    width: POSITIONS.MONSTER_SIZE,
    height: POSITIONS.MONSTER_SIZE,
    alignItems: 'center',
  },
  monsterImage: {
    width: POSITIONS.MONSTER_SIZE,
    height: POSITIONS.MONSTER_SIZE,
  },
  hpBarContainer: {
    width: POSITIONS.MONSTER_SIZE,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginTop: 2,
  },
  hpBar: {
    height: '100%',
    borderRadius: 2,
  },
  buildSlot: {
    position: 'absolute',
    width: POSITIONS.BUILD_SLOT_SIZE,
    height: POSITIONS.BUILD_SLOT_SIZE,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  padImage: {
    width: POSITIONS.PAD_SIZE,
    height: POSITIONS.PAD_SIZE,
  },
  levelBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
  },
  slotLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  padInventory: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    padding: 8,
  },
  padButton: {
    width: 60,
    height: 60,
    borderRadius: 8,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  padIcon: {
    width: 40,
    height: 40,
  },
  padCost: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  showcaseSection: {
    marginBottom: 16,
    width: '100%',
  },
  showcaseTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  monsterShowcase: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  padShowcase: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 8,
  },
  showcaseItem: {
    alignItems: 'center',
    minWidth: 60,
  },
  showcaseImage: {
    width: 40,
    height: 40,
    marginBottom: 4,
  },
  showcasePadImage: {
    width: 30,
    height: 30,
  },
  padPreview: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  showcaseLabel: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
  showcaseCost: {
    fontSize: 8,
    fontWeight: 'bold',
    marginTop: 2,
  },
});