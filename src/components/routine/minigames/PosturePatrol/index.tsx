import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import * as haptics from '../../../../utils/haptics';

// Import game modules
import { PostureFigure, GameState, MonsterType, DestructionEffect } from './types';
import { 
  GAME_DURATION, 
  WAVE_DURATION, 
  CORE_STRETCHES, 
  SCORING, 
  TENSION,
  POSITIONS 
} from './constants';
import {
  getWaveConfig,
  getRandomMonsterType,
  calculateSpeedBonus,
  getMonsterSpeed,
  getRandomizedSpawnDelay,
  calculateFinalScore,
  getMovementPattern
} from './utils';
import { startFigureAnimation } from './animations';
import { SimpleActionButtons, ActionType } from './SimpleActionButtons';
import { GameHUD } from './GameHUD';
import { DestructionAnimation } from './DestructionAnimation';
import { DamageAnimation } from './DamageAnimation';
import { MonsterTooltip } from './MonsterTooltip';

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
  
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    gameActive: false,
    timeLeft: GAME_DURATION,
    currentWave: 1,
    score: 0,
    tensionLevel: 0,
    figures: [],
    selectedFigure: null,
    lastSpawnTime: 0,
    waveStartTime: 0,
    fullBodyCooldown: 0,
    dynamicFlowCooldown: 0,
  });

  // Animation effects
  const [destructionEffects, setDestructionEffects] = useState<DestructionEffect[]>([]);
  const [damageEffects, setDamageEffects] = useState<{id: string, x: number, y: number, monsterType: string}[]>([]);
  const [tooltipEffects, setTooltipEffects] = useState<{id: string, x: number, y: number, monsterType: MonsterType}[]>([]);

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(true);
  const [selectedMonsterInfo, setSelectedMonsterInfo] = useState<MonsterType | null>(null);

  // Game stats for tracking
  const [gameStats, setGameStats] = useState({
    totalHits: 0,
    correctHits: 0,
    perfectWaves: 0,
    speedBonuses: 0,
    monstersDefeated: {
      tech_neck: 0,
      desk_hunch: 0,
      slouch_slump: 0,
      lean_twist: 0,
    },
  });

  const [waveStartTension, setWaveStartTension] = useState(0);

  // Refs for timers and state
  const gameTimerRef = useRef<NodeJS.Timeout>();
  const spawnTimerRef = useRef<NodeJS.Timeout>();
  const waveTimerRef = useRef<NodeJS.Timeout>();
  const cardRefreshTimerRef = useRef<NodeJS.Timeout>();
  const gameStateRef = useRef(gameState);

  // Update ref when state changes
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Start the game
  const startGame = () => {
    const now = Date.now();
    
    setGameState({
      gameActive: true,
      timeLeft: GAME_DURATION,
      currentWave: 1,
      score: 0,
      tensionLevel: 0,
      figures: [],
      selectedFigure: null,
      lastSpawnTime: now,
      waveStartTime: now,
      fullBodyCooldown: 0,
      dynamicFlowCooldown: 0,
    });

    setDestructionEffects([]);
    setDamageEffects([]);
    setTooltipEffects([]);

    setGameStats({
      totalHits: 0,
      correctHits: 0,
      perfectWaves: 0,
      speedBonuses: 0,
      monstersDefeated: {
        tech_neck: 0,
        desk_hunch: 0,
        slouch_slump: 0,
        lean_twist: 0,
      },
    });

    setWaveStartTension(0);
    
    // Start game timer
    gameTimerRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.timeLeft <= 1) {
          endGame();
          return { ...prev, timeLeft: 0 };
        }
        return { ...prev, timeLeft: prev.timeLeft - 1 };
      });
    }, 1000);

    // Start wave progression
    waveTimerRef.current = setInterval(() => {
      setGameState(prev => {
        const newWave = prev.currentWave + 1;
        if (newWave > 3) {
          endGame();
          return prev;
        }
        
        // Check if previous wave was perfect
        if (prev.tensionLevel === waveStartTension) {
          setGameStats(stats => ({
            ...stats,
            perfectWaves: stats.perfectWaves + 1
          }));
        }
        
        setWaveStartTension(prev.tensionLevel);
        
        return { 
          ...prev, 
          currentWave: newWave,
          waveStartTime: Date.now()
        };
      });
    }, WAVE_DURATION * 1000);

    // Start cooldown timer for special abilities
    cardRefreshTimerRef.current = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        fullBodyCooldown: Math.max(0, prev.fullBodyCooldown - 1),
        dynamicFlowCooldown: Math.max(0, prev.dynamicFlowCooldown - 1),
        lastUpdate: Date.now(),
      }));
    }, 1000); // Update every 1 second for cooldown display
  };

  // Handle spawning with useEffect to avoid stale state
  useEffect(() => {
    if (!gameState.gameActive) return;

    const scheduleSpawn = () => {
      const currentState = gameStateRef.current;
      const config = getWaveConfig(currentState.currentWave);
      const baseDelay = config.spawnRate;
      const randomizedDelay = getRandomizedSpawnDelay(baseDelay);
      
      spawnTimerRef.current = setTimeout(() => {
        if (gameStateRef.current.gameActive) {
          spawnFigure();
          scheduleSpawn(); // Schedule next spawn
        }
      }, randomizedDelay);
    };

    // Start spawning after a short delay
    const initialSpawnTimer = setTimeout(() => {
      if (gameStateRef.current.gameActive) {
        spawnFigure();
        scheduleSpawn();
      }
    }, 1000);

    return () => {
      clearTimeout(initialSpawnTimer);
      if (spawnTimerRef.current) {
        clearTimeout(spawnTimerRef.current);
      }
    };
  }, [gameState.gameActive, gameState.currentWave]);

  // Spawn a new figure
  const spawnFigure = () => {
    console.log('🎮 Attempting to spawn figure...');
    setGameState(prev => {
      if (!prev.gameActive) {
        console.log('🎮 Game not active, skipping spawn');
        return prev;
      }
      
      const monsterType = getRandomMonsterType(prev.currentWave);
      const { speed, isFast } = getMonsterSpeed(prev.currentWave);
      const movementPattern = getMovementPattern(monsterType);
      const spawnTime = Date.now();
      
      console.log('🎮 Creating figure:', monsterType, 'with pattern:', movementPattern.type);
      
      const newFigure: PostureFigure = {
        id: spawnTime.toString(),
        type: monsterType,
        position: new Animated.ValueXY({
          x: Math.random() * (width - POSITIONS.MONSTER_SIZE) + POSITIONS.MONSTER_SIZE / 2,
          y: -POSITIONS.MONSTER_SIZE
        }),
        speed: speed / movementPattern.speed, // Adjust speed based on pattern
        isActive: true,
        isFast,
        spawnTime,
        movementPattern,
      };

      // Start animation for the new figure
      setTimeout(() => {
        startFigureAnimation(newFigure, handleFigureReachedDesk);
      }, 100);
      
      return {
        ...prev,
        figures: [...prev.figures, newFigure],
        lastSpawnTime: spawnTime
      };
    });
  };

  
  // Handle when figure reaches the desk
  const handleFigureReachedDesk = (figure: PostureFigure) => {
    if (figure.isActive) {
      // Add damage animation at defending figure position
      const currentTime = Date.now();
      const damageEffect = {
        id: `damage_${currentTime}`,
        x: width / 2, // Center of screen where defending figure is
        y: height - 250, // Position near defending figure
        monsterType: figure.type
      };
      
      setDamageEffects(prev => [...prev, damageEffect]);
      
      setGameState(prev => {
        const newTension = prev.tensionLevel + TENSION.MONSTER_DAMAGE;
        
        if (newTension >= TENSION.MAX_TENSION) {
          endGame();
        }
        
        return {
          ...prev,
          tensionLevel: newTension,
          figures: prev.figures.filter(f => f.id !== figure.id)
        };
      });
    }
  };

  // Handle figure tap
  const handleFigureTap = (figure: PostureFigure, event: any) => {
    if (!gameState.gameActive || !figure.isActive) return;
    
    haptics.light();
    
    // Show educational tooltip about the monster
    const currentTime = Date.now();
    const figurePosition = {
      x: figure.position.x._value || 0,
      y: figure.position.y._value || 0
    };
    
    const tooltipEffect = {
      id: `tooltip_${currentTime}`,
      x: figurePosition.x,
      y: figurePosition.y,
      monsterType: figure.type
    };
    
    setTooltipEffects(prev => [...prev, tooltipEffect]);
    
    setGameState(prev => ({
      ...prev,
      selectedFigure: figure
    }));
  };

  // Handle action selection for simplified button system
  const handleActionSelect = (action: ActionType) => {
    console.log('🎮 Action selected:', action, 'selectedFigure:', gameState.selectedFigure?.type);
    
    if (!gameState.selectedFigure) {
      console.log('🎮 No figure selected');
      haptics.light();
      return;
    }
    
    const currentTime = Date.now();
    
    // Check if special actions are on cooldown
    if (action === 'full_body' && gameState.fullBodyCooldown > 0) {
      haptics.light();
      return;
    }
    if (action === 'dynamic_flow' && gameState.dynamicFlowCooldown > 0) {
      haptics.light();
      return;
    }
    
    // Determine if action is correct for the monster type
    const getCorrectAction = (monsterType: string): ActionType => {
      switch (monsterType) {
        case 'tech_neck': return 'neck';
        case 'desk_hunch': return 'upper_back_chest';
        case 'slouch_slump': return 'lower_back';
        case 'lean_twist': return 'hips_legs';
        default: return 'neck';
      }
    };
    
    const correctAction = getCorrectAction(gameState.selectedFigure.type);
    const isCorrect = action === correctAction || action === 'full_body' || action === 'dynamic_flow';
    
    // Update game stats
    setGameStats(prev => ({
      ...prev,
      totalHits: prev.totalHits + 1,
      correctHits: prev.correctHits + (isCorrect ? 1 : 0),
    }));
    
    if (isCorrect) {
      haptics.medium();
      
      // Calculate score with bonuses
      let points = SCORING.CORRECT_HIT;
      const speedBonus = calculateSpeedBonus(gameState.selectedFigure.spawnTime, currentTime);
      
      // Add bonus for special actions
      if (action === 'dynamic_flow') {
        points += 50; // Extra bonus for dynamic flow
      } else if (action === 'full_body') {
        points += 25; // Moderate bonus for full body
      }
      
      points += speedBonus;
      
      if (speedBonus > 0) {
        setGameStats(prev => ({
          ...prev,
          speedBonuses: prev.speedBonuses + 1
        }));
      }
      
      // Update monster defeat stats
      setGameStats(prev => ({
        ...prev,
        monstersDefeated: {
          ...prev.monstersDefeated,
          [gameState.selectedFigure!.type]: prev.monstersDefeated[gameState.selectedFigure!.type] + 1
        }
      }));
      
      // Add destruction animation
      const figure = gameState.selectedFigure;
      const figurePosition = {
        x: figure.position.x._value || 0,
        y: figure.position.y._value || 0
      };
      
      const newDestructionEffect: DestructionEffect = {
        id: `destruction_${currentTime}`,
        x: figurePosition.x,
        y: figurePosition.y,
        score: points,
        isCorrect: true
      };
      
      setDestructionEffects(prev => [...prev, newDestructionEffect]);
      
      // Mark figure as inactive and remove it
      gameState.selectedFigure.isActive = false;
      
      // Update state with new cooldowns for special actions
      let newCooldowns = {};
      if (action === 'full_body') {
        newCooldowns = { fullBodyCooldown: 15 }; // 15 second cooldown
      } else if (action === 'dynamic_flow') {
        newCooldowns = { dynamicFlowCooldown: 25 }; // 25 second cooldown
      }
      
      setGameState(prev => ({
        ...prev,
        score: prev.score + points,
        figures: prev.figures.filter(f => f.id !== prev.selectedFigure!.id),
        selectedFigure: null,
        ...newCooldowns
      }));
    } else {
      haptics.light();
      
      // Wrong selection - show miss animation
      const figure = gameState.selectedFigure;
      const figurePosition = {
        x: figure.position.x._value || 0,
        y: figure.position.y._value || 0
      };
      
      const missEffect: DestructionEffect = {
        id: `miss_${currentTime}`,
        x: figurePosition.x,
        y: figurePosition.y,
        score: 0,
        isCorrect: false
      };
      
      setDestructionEffects(prev => [...prev, missEffect]);
      
      // Wrong selection - figure continues moving
      setGameState(prev => ({
        ...prev,
        selectedFigure: null
      }));
    }
  };

  // Handle animation completions
  const handleDestructionComplete = (effectId: string) => {
    setDestructionEffects(prev => prev.filter(effect => effect.id !== effectId));
  };

  const handleDamageComplete = (effectId: string) => {
    setDamageEffects(prev => prev.filter(effect => effect.id !== effectId));
  };

  const handleTooltipComplete = (effectId: string) => {
    setTooltipEffects(prev => prev.filter(effect => effect.id !== effectId));
  };

  // End the game
  const endGame = () => {
    setGameState(prev => ({ ...prev, gameActive: false }));
    
    // Clear all timers
    if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    if (waveTimerRef.current) clearInterval(waveTimerRef.current);
    if (cardRefreshTimerRef.current) clearInterval(cardRefreshTimerRef.current);
    
    // Calculate final score with bonuses
    const finalScore = calculateFinalScore(
      gameState.score,
      gameStats.perfectWaves,
      gameStats.speedBonuses
    );
    
    // Calculate XP based on final score (25-100 XP range)
    const xp = Math.min(100, Math.max(25, Math.floor(finalScore * 1.5)));
    
    setTimeout(() => {
      onGameComplete(finalScore, xp);
    }, 1500);
  };

  // Get figure image
  const getFigureImage = (type: PostureFigure['type']) => {
    const images = {
      tech_neck: require('../../../../../assets/images/miniGames/techNeck.png'),
      desk_hunch: require('../../../../../assets/images/miniGames/deskHunch2.png'),
      slouch_slump: require('../../../../../assets/images/miniGames/slouchSlump.png'),
      lean_twist: require('../../../../../assets/images/miniGames/leanTwist.png')
    };
    return images[type];
  };

  // Get figure color
  const getFigureColor = (type: PostureFigure['type']) => {
    const colors = {
      tech_neck: '#FF6B6B',
      desk_hunch: '#4ECDC4',
      slouch_slump: '#45B7D1',
      lean_twist: '#96CEB4'
    };
    return colors[type];
  };

  // Get monster info for tutorial
  const getMonsterInfo = (type: MonsterType) => {
    const info = {
      tech_neck: {
        problem: 'Forward head posture from screen time',
        stretches: ['Neck Side Stretch', 'Chin Tucks'],
        tip: 'Keep your ears over your shoulders!'
      },
      desk_hunch: {
        problem: 'Rounded shoulders & caved chest',
        stretches: ['Chest Stretch', 'Chest Opener'],
        tip: 'Open up that chest and pull shoulders back!'
      },
      slouch_slump: {
        problem: 'Curved spine & poor sitting posture',
        stretches: ['Back Extension', 'Upper Back Stretch'],
        tip: 'Sit tall with natural spine curves!'
      },
      lean_twist: {
        problem: 'Crooked sitting & twisted spine',
        stretches: ['Spinal Twist', 'Torso Twist'],
        tip: 'Keep your body centered and aligned!'
      }
    };
    return info[type];
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (waveTimerRef.current) clearInterval(waveTimerRef.current);
      if (cardRefreshTimerRef.current) clearInterval(cardRefreshTimerRef.current);
    };
  }, []);

  // Simplified tutorial screen component
  const renderTutorial = () => (
    <View style={styles.startScreen}>
      <View style={[styles.iconContainer, { backgroundColor: theme.accent + '20' }]}>
        <Ionicons name="shield" size={48} color={theme.accent} />
      </View>
      
      <Text style={[styles.title, { color: theme.text }]}>
        Posture Patrol
      </Text>
      
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        Tap bad posture monsters and select the right stretch to defeat them!
      </Text>

      <View style={styles.monstersPreview}>
        <Text style={[styles.monstersTitle, { color: theme.text }]}>
          Know Your Enemies:
        </Text>
        
        <View style={styles.monstersGrid}>
          <TouchableOpacity 
            style={styles.monsterPreview}
            onPress={() => setSelectedMonsterInfo('tech_neck')}
            activeOpacity={0.7}
          >
            <View style={[styles.monsterImageContainer, { shadowColor: '#FF6B6B' }]}>
              <Image 
                source={require('../../../../../assets/images/miniGames/techNeck.png')}
                style={styles.monsterPreviewImage}
                resizeMode="cover"
              />
            </View>
            <Text style={[styles.monsterPreviewName, { color: theme.textSecondary }]}>
              Tech Neck
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.monsterPreview}
            onPress={() => setSelectedMonsterInfo('desk_hunch')}
            activeOpacity={0.7}
          >
            <View style={[styles.monsterImageContainer, { shadowColor: '#4ECDC4' }]}>
              <Image 
                source={require('../../../../../assets/images/miniGames/deskHunch2.png')}
                style={styles.monsterPreviewImage}
                resizeMode="cover"
              />
            </View>
            <Text style={[styles.monsterPreviewName, { color: theme.textSecondary }]}>
              Desk Hunch
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.monsterPreview}
            onPress={() => setSelectedMonsterInfo('slouch_slump')}
            activeOpacity={0.7}
          >
            <View style={[styles.monsterImageContainer, { shadowColor: '#45B7D1' }]}>
              <Image 
                source={require('../../../../../assets/images/miniGames/slouchSlump.png')}
                style={styles.monsterPreviewImage}
                resizeMode="cover"
              />
            </View>
            <Text style={[styles.monsterPreviewName, { color: theme.textSecondary }]}>
              Slouch Slump
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.monsterPreview}
            onPress={() => setSelectedMonsterInfo('lean_twist')}
            activeOpacity={0.7}
          >
            <View style={[styles.monsterImageContainer, { shadowColor: '#96CEB4' }]}>
              <Image 
                source={require('../../../../../assets/images/miniGames/leanTwist.png')}
                style={styles.monsterPreviewImage}
                resizeMode="cover"
              />
            </View>
            <Text style={[styles.monsterPreviewName, { color: theme.textSecondary }]}>
              Lean Twist
            </Text>
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.tapHint, { color: theme.textSecondary }]}>
          👆 Tap monsters to learn more
        </Text>
      </View>

      <View style={styles.quickTips}>
        <Text style={[styles.tipText, { color: theme.textSecondary }]}>
          💡 Green stretches are most effective
        </Text>
        <Text style={[styles.tipText, { color: theme.textSecondary }]}>
          ⚡ Quick reactions earn bonus points
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
          <Text style={styles.playButtonText}>Start Game</Text>
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
        <>
          {renderTutorial()}
          
          {/* Monster Info Modal */}
          {selectedMonsterInfo && (
            <Modal
              visible={true}
              transparent
              animationType="fade"
              onRequestClose={() => setSelectedMonsterInfo(null)}
            >
              <TouchableOpacity 
                style={styles.infoModalOverlay}
                activeOpacity={1}
                onPress={() => setSelectedMonsterInfo(null)}
              >
                <TouchableOpacity 
                  style={[styles.infoModal, { backgroundColor: theme.cardBackground }]}
                  activeOpacity={1}
                  onPress={() => {}} // Prevent modal close when tapping inside
                >
                  <View style={styles.infoModalHeader}>
                    <View style={[styles.infoMonsterImageContainer, { shadowColor: getFigureColor(selectedMonsterInfo) }]}>
                      <Image 
                        source={getFigureImage(selectedMonsterInfo)}
                        style={styles.infoMonsterImage}
                        resizeMode="cover"
                      />
                    </View>
                    <Text style={[styles.infoMonsterTitle, { color: theme.text }]}>
                      {selectedMonsterInfo.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Text>
                    
                    <TouchableOpacity 
                      style={styles.infoCloseButton}
                      onPress={() => setSelectedMonsterInfo(null)}
                    >
                      <Ionicons name="close" size={24} color={theme.textSecondary} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.infoContent}>
                    <View style={styles.infoSection}>
                      <Text style={[styles.infoSectionTitle, { color: theme.accent }]}>
                        😰 The Problem:
                      </Text>
                      <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                        {getMonsterInfo(selectedMonsterInfo).problem}
                      </Text>
                    </View>

                    <View style={styles.infoSection}>
                      <Text style={[styles.infoSectionTitle, { color: '#4CAF50' }]}>
                        💪 Defeat With:
                      </Text>
                      {getMonsterInfo(selectedMonsterInfo).stretches.map((stretch, index) => (
                        <Text key={index} style={[styles.stretchItem, { color: theme.textSecondary }]}>
                          • {stretch}
                        </Text>
                      ))}
                    </View>

                    <View style={styles.infoSection}>
                      <Text style={[styles.infoSectionTitle, { color: theme.accent }]}>
                        💡 Pro Tip:
                      </Text>
                      <Text style={[styles.infoTip, { color: theme.text }]}>
                        {getMonsterInfo(selectedMonsterInfo).tip}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          )}
        </>
      ) : (
        // Game screen
        <View style={styles.gameScreen}>
          {/* Game HUD */}
          <GameHUD
            currentWave={gameState.currentWave}
            timeLeft={gameState.timeLeft}
            score={gameState.score}
            tensionLevel={gameState.tensionLevel}
          />

          {/* Game field */}
          <View style={styles.gameField}>
            {/* Defending Figure at Desk */}
            <View style={styles.deskArea}>
              <Image 
                source={require('../../../../../assets/images/miniGames/defendingFigure2.png')}
                style={styles.defendingFigure}
                resizeMode="contain"
              />
            </View>

            {/* Posture figures */}
            {gameState.figures.map((figure, index) => {
              return (
                <Animated.View
                  key={figure.id}
                  style={[
                    styles.figure,
                    {
                      left: figure.position.x,
                      top: figure.position.y,
                    }
                  ]}
                >
                  <TouchableOpacity
                    style={styles.figureTouch}
                    onPress={(event) => handleFigureTap(figure, event)}
                  >
                    <Image 
                      source={getFigureImage(figure.type)}
                      style={styles.figureImage}
                      resizeMode="contain"
                    />
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {/* Simple Action Buttons */}
          <SimpleActionButtons
            selectedFigure={gameState.selectedFigure}
            onActionSelect={handleActionSelect}
            fullBodyCooldown={gameState.fullBodyCooldown}
            dynamicFlowCooldown={gameState.dynamicFlowCooldown}
          />

          {/* Animation Effects */}
          {destructionEffects.map((effect) => (
            <DestructionAnimation
              key={effect.id}
              x={effect.x}
              y={effect.y}
              score={effect.score}
              isCorrect={effect.isCorrect}
              onComplete={() => handleDestructionComplete(effect.id)}
            />
          ))}

          {damageEffects.map((effect) => (
            <DamageAnimation
              key={effect.id}
              x={effect.x}
              y={effect.y}
              monsterType={effect.monsterType}
              onComplete={() => handleDamageComplete(effect.id)}
            />
          ))}

          {tooltipEffects.map((effect) => (
            <MonsterTooltip
              key={effect.id}
              x={effect.x}
              y={effect.y}
              monsterType={effect.monsterType}
              onComplete={() => handleTooltipComplete(effect.id)}
            />
          ))}
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
  instructions: {
    marginBottom: 32,
  },
  instructionText: {
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
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
  gameField: {
    flex: 1,
    position: 'relative',
  },
  deskArea: {
    position: 'absolute',
    bottom: 250, // Moved higher to avoid button overlap
    left: width / 2 - 60, // Centered for larger size
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  defendingFigure: {
    width: 150, // Made bigger (was POSITIONS.DEFENDING_FIGURE_SIZE which is 80)
    height: 150,
  },
  figure: {
    position: 'absolute',
    width: POSITIONS.MONSTER_SIZE,
    height: POSITIONS.MONSTER_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  figureTouch: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  figureImage: {
    width: POSITIONS.MONSTER_SIZE - 10,
    height: POSITIONS.MONSTER_SIZE - 10,
  },
  // Tutorial/Start screen styles
  monstersPreview: {
    marginVertical: 20,
    alignItems: 'center',
  },
  monstersTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  monstersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
  monsterPreview: {
    alignItems: 'center',
    width: 80,
    marginBottom: 8,
  },
  monsterImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    backgroundColor: '#FFFFFF',
    marginBottom: 6,
  },
  monsterPreviewImage: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
  },
  monsterPreviewName: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  tapHint: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  quickTips: {
    alignItems: 'center',
    marginBottom: 24,
  },
  tipText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  // Monster Info Modal styles
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoModal: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  infoModalHeader: {
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    position: 'relative',
  },
  infoMonsterImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  infoMonsterImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  infoMonsterTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  infoCloseButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  infoContent: {
    padding: 20,
    paddingTop: 0,
  },
  infoSection: {
    marginBottom: 16,
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
  stretchItem: {
    fontSize: 14,
    marginBottom: 2,
    paddingLeft: 8,
  },
  infoTip: {
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});