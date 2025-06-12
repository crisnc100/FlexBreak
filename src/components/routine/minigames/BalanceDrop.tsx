import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import * as haptics from '../../../utils/haptics';

const { width, height } = Dimensions.get('window');

interface BalanceDropProps {
  onGameComplete: (score: number, xpEarned: number) => void;
  onSkip: () => void;
  context?: 'routine' | 'home';
}

interface Block {
  id: number;
  x: number;
  y: Animated.Value;
  type: 'work' | 'wellness';
  icon: string;
  label: string;
  color: string;
  weight: number;
  isDragging: boolean;
  opacity: Animated.Value;
}

const WORK_ITEMS = [
  { icon: 'laptop-outline', label: 'Laptop', weight: 3, color: '#FF6B6B' },
  { icon: 'mail-outline', label: 'Email', weight: 2, color: '#FFA500' },
  { icon: 'people-outline', label: 'Meeting', weight: 2, color: '#FF8C00' },
  { icon: 'time-outline', label: 'Deadline', weight: 3, color: '#FF7F50' },
  { icon: 'document-text-outline', label: 'Report', weight: 2, color: '#FF6347' },
  { icon: 'call-outline', label: 'Calls', weight: 2, color: '#FF4500' },
  { icon: 'briefcase-outline', label: 'Work', weight: 3, color: '#DC143C' },
];

const WELLNESS_ITEMS = [
  { icon: 'cafe-outline', label: 'Coffee', weight: 2, color: '#4CAF50' },
  { icon: 'water-outline', label: 'Water', weight: 2, color: '#00BCD4' },
  { icon: 'moon-outline', label: 'Sleep', weight: 3, color: '#3F51B5' },
  { icon: 'restaurant-outline', label: 'Lunch', weight: 2, color: '#009688' },
  { icon: 'heart-outline', label: 'Exercise', weight: 3, color: '#E91E63' },
  { icon: 'home-outline', label: 'Home', weight: 3, color: '#2196F3' },
  { icon: 'person-outline', label: 'Me Time', weight: 2, color: '#00ACC1' },
];

const BLOCK_SIZE = 80;
const SEESAW_WIDTH = width * 0.8;
const SEESAW_HEIGHT = 30;
const GROUND_Y = height - 120;
const SEESAW_Y = height * 0.65;

export const BalanceDrop: React.FC<BalanceDropProps> = ({
  onGameComplete,
  onSkip,
  context = 'routine',
}) => {
  const { theme } = useTheme();
  
  // Game state
  const [showInstructions, setShowInstructions] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [balance, setBalance] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [streak, setStreak] = useState(0);
  
  // Refs
  const blockIdRef = useRef(0);
  const spawnIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const seesawRotation = useRef(new Animated.Value(0)).current;
  const animationsRef = useRef<{ [key: number]: Animated.CompositeAnimation }>({});
  
  // Start game
  const startGame = () => {
    console.log('Starting Balance Drop game...');
    setShowInstructions(false);
    setIsPaused(false);
    setTimeLeft(60);
    setScore(0);
    setBlocks([]);
    setBalance(0);
    setGameComplete(false);
    setMultiplier(1);
    setStreak(0);
    
    // Start spawning blocks immediately
    setTimeout(() => {
      console.log('Beginning block spawning...');
      startSpawning();
    }, 100); // Small delay to ensure state is updated
  };
  
  // Game timer
  useEffect(() => {
    if (gameComplete || timeLeft <= 0 || showInstructions || isPaused) return;
    
    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timeLeft, gameComplete, showInstructions, isPaused]);
  
  // Check game over conditions
  useEffect(() => {
    if (timeLeft <= 0 && !gameComplete && !showInstructions) {
      endGame();
    }
  }, [timeLeft, gameComplete, showInstructions]);
  
  // Update seesaw rotation based on balance
  useEffect(() => {
    const tiltAngle = (balance / 100) * 30;
    
    Animated.spring(seesawRotation, {
      toValue: tiltAngle,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
    
    // Check if too tilted
    if (Math.abs(balance) > 70) {
      endGame();
    }
    
    // Update multiplier
    if (Math.abs(balance) <= 30) {
      setMultiplier(2);
    } else if (Math.abs(balance) <= 50) {
      setMultiplier(1.5);
    } else {
      setMultiplier(1);
    }
  }, [balance]);
  
  // Start spawning blocks
  const startSpawning = () => {
    console.log('startSpawning called');
    
    // Clear any existing interval
    if (spawnIntervalRef.current) {
      clearInterval(spawnIntervalRef.current);
    }
    
    // Spawn first block immediately
    spawnBlock();
    
    // Then spawn regularly
    const spawnRate = getDifficultySettings().spawnRate;
    console.log('Setting spawn interval with rate:', spawnRate);
    
    spawnIntervalRef.current = setInterval(() => {
      console.log('Interval triggered - isPaused:', isPaused, 'gameComplete:', gameComplete);
      if (!isPaused && !gameComplete) {
        spawnBlock();
      }
    }, spawnRate);
  };
  
  // Update spawn rate based on difficulty
  useEffect(() => {
    if (spawnIntervalRef.current && !isPaused && !gameComplete && !showInstructions) {
      clearInterval(spawnIntervalRef.current);
      const spawnRate = getDifficultySettings().spawnRate;
      spawnIntervalRef.current = setInterval(() => {
        if (!isPaused && !gameComplete) {
          spawnBlock();
        }
      }, spawnRate);
    }
  }, [timeLeft]);
  
  // Get difficulty settings
  const getDifficultySettings = () => {
    const elapsed = 60 - timeLeft;
    
    if (elapsed < 15) {
      return { spawnRate: 2500, fallDuration: 5000 };
    } else if (elapsed < 30) {
      return { spawnRate: 2000, fallDuration: 4500 };
    } else if (elapsed < 45) {
      return { spawnRate: 1500, fallDuration: 4000 };
    } else {
      return { spawnRate: 1000, fallDuration: 3500 };
    }
  };
  
  // Spawn a single block
  const spawnBlock = () => {
    if (gameComplete || showInstructions) return;
    
    const isWork = Math.random() < 0.5;
    const items = isWork ? WORK_ITEMS : WELLNESS_ITEMS;
    const item = items[Math.floor(Math.random() * items.length)];
    
    const id = blockIdRef.current++;
    const startX = Math.random() * (width - BLOCK_SIZE - 40) + 20;
    
    const newBlock: Block = {
      id,
      x: startX,
      y: new Animated.Value(0), // Start at top of screen instead of off-screen
      type: isWork ? 'work' : 'wellness',
      icon: item.icon,
      label: item.label,
      color: item.color,
      weight: item.weight,
      isDragging: false,
      opacity: new Animated.Value(1),
    };
    
    console.log('Spawning block:', { id, icon: item.icon, label: item.label, x: startX });
    
    setBlocks(prev => [...prev, newBlock]);
    
    // Animate falling
    const fallAnimation = Animated.timing(newBlock.y, {
      toValue: GROUND_Y,
      duration: getDifficultySettings().fallDuration,
      useNativeDriver: false,
    });
    
    animationsRef.current[id] = fallAnimation;
    
    fallAnimation.start(({ finished }) => {
      if (finished && !newBlock.isDragging) {
        handleBlockHitGround(id);
      }
      delete animationsRef.current[id];
    });
  };
  
  // Handle block hit ground
  const handleBlockHitGround = (blockId: number) => {
    setScore(prev => Math.max(0, prev - 20));
    setStreak(0);
    haptics.heavy();
    
    // Random side affects balance more dramatically
    const randomSide = Math.random() < 0.5 ? -1 : 1;
    setBalance(prev => prev + randomSide * 15);
    
    // Fade out and remove block
    const block = blocks.find(b => b.id === blockId);
    if (block) {
      Animated.timing(block.opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setBlocks(prev => prev.filter(b => b.id !== blockId));
      });
    }
  };
  
  // Handle block drop on seesaw
  const handleBlockDrop = (block: Block, dropX: number, dropY: number) => {
    // Stop falling animation
    if (animationsRef.current[block.id]) {
      animationsRef.current[block.id].stop();
      delete animationsRef.current[block.id];
    }
    
    // Check if dropped on seesaw
    const seesawLeft = (width - SEESAW_WIDTH) / 2;
    const seesawRight = seesawLeft + SEESAW_WIDTH;
    const seesawTop = SEESAW_Y - 50;
    const seesawBottom = SEESAW_Y + 50;
    
    if (dropX >= seesawLeft && dropX <= seesawRight && 
        dropY >= seesawTop && dropY <= seesawBottom) {
      
      // Determine which side
      const center = width / 2;
      const droppedOnWork = dropX < center;
      const isCorrect = (droppedOnWork && block.type === 'work') || 
                       (!droppedOnWork && block.type === 'wellness');
      
      // Update score
      if (isCorrect) {
        const points = 10 * multiplier;
        setScore(prev => prev + Math.round(points));
        setStreak(prev => prev + 1);
        haptics.light();
      } else {
        setScore(prev => Math.max(0, prev - 5));
        setStreak(0);
        haptics.medium();
      }
      
      // Update balance
      const balanceChange = block.weight * (droppedOnWork ? -1 : 1) * 5;
      setBalance(prev => Math.max(-100, Math.min(100, prev + balanceChange)));
      
      // Remove block with fade
      Animated.timing(block.opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setBlocks(prev => prev.filter(b => b.id !== block.id));
      });
    } else {
      // Continue falling if not on seesaw
      block.isDragging = false;
      const currentY = block.y._value;
      const remainingDistance = GROUND_Y - currentY;
      const remainingTime = (remainingDistance / (GROUND_Y + BLOCK_SIZE)) * 3000;
      
      const continueAnimation = Animated.timing(block.y, {
        toValue: GROUND_Y,
        duration: Math.max(500, remainingTime),
        useNativeDriver: false,
      });
      
      animationsRef.current[block.id] = continueAnimation;
      
      continueAnimation.start(({ finished }) => {
        if (finished) {
          handleBlockHitGround(block.id);
        }
        delete animationsRef.current[block.id];
      });
    }
  };
  
  // Create pan responder for block
  const createPanResponder = (block: Block) => {
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      
      onPanResponderGrant: () => {
        block.isDragging = true;
        block.y.stopAnimation();
        haptics.light();
      },
      
      onPanResponderMove: (_, gestureState) => {
        // Update block position based on gesture
        const currentY = block.y._value || 0;
        block.y.setValue(currentY + gestureState.dy);
      },
      
      onPanResponderRelease: (_, gestureState) => {
        const dropX = block.x + BLOCK_SIZE / 2;
        const dropY = block.y._value + gestureState.dy + BLOCK_SIZE / 2;
        handleBlockDrop(block, dropX, dropY);
      },
    });
  };
  
  // End game
  const endGame = () => {
    if (gameComplete) return;
    
    setGameComplete(true);
    setIsPaused(true);
    
    // Stop spawning
    if (spawnIntervalRef.current) {
      clearInterval(spawnIntervalRef.current);
      spawnIntervalRef.current = null;
    }
    
    // Stop all animations
    Object.values(animationsRef.current).forEach(anim => anim.stop());
    animationsRef.current = {};
    
    // Calculate XP
    const baseXP = Math.min(100, Math.max(25, Math.floor(score / 10)));
    const balanceBonus = Math.abs(balance) <= 30 ? 20 : 0;
    const totalXP = baseXP + balanceBonus;
    
    haptics.heavy();
    
    setTimeout(() => {
      onGameComplete(score, totalXP);
    }, 1500);
  };
  
  // Toggle pause
  const togglePause = () => {
    setIsPaused(!isPaused);
    if (isPaused) {
      // Resume spawning
      startSpawning();
    } else {
      // Stop spawning
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current);
        spawnIntervalRef.current = null;
      }
      // Pause all animations
      blocks.forEach(block => {
        block.y.stopAnimation();
      });
    }
  };
  
  // Get balance status
  const getBalanceStatus = () => {
    if (Math.abs(balance) <= 30) return { text: '⚖️ Balanced', color: '#4CAF50' };
    if (balance < -50) return { text: '💼 Work Heavy!', color: '#FF6B6B' };
    if (balance > 50) return { text: '😴 Too Relaxed!', color: '#FFA500' };
    return { text: '⚠️ Tilting...', color: theme.accent };
  };
  
  // Render block
  const renderBlock = (block: Block) => {
    const panResponder = createPanResponder(block);
    
    return (
      <Animated.View
        key={block.id}
        {...panResponder.panHandlers}
        style={[
          styles.block,
          {
            backgroundColor: block.color,
            left: block.x,
            top: block.y,
            opacity: block.opacity,
          },
        ]}
      >
        <Ionicons name={block.icon as any} size={36} color="#FFFFFF" />
        <Text style={styles.blockText}>{block.label}</Text>
      </Animated.View>
    );
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current);
      }
      Object.values(animationsRef.current).forEach(anim => anim.stop());
    };
  }, []);
  
  if (showInstructions) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.instructionsContainer}>
          <Text style={[styles.title, { color: theme.text }]}>Balance Drop</Text>
          
          <View style={[styles.instructionCard, { backgroundColor: theme.cardBackground }]}>
            <Ionicons name="scale" size={48} color={theme.accent} />
            <Text style={[styles.instructionTitle, { color: theme.text }]}>
              Maintain Work-Life Balance!
            </Text>
            <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
              Drag falling blocks to the correct side of the seesaw
            </Text>
          </View>
          
          <View style={styles.instructionsGrid}>
            <View style={[styles.instructionItem, { backgroundColor: theme.cardBackground }]}>
              <View style={[styles.miniBlock, { backgroundColor: '#FF6B6B' }]}>
                <Ionicons name="briefcase-outline" size={20} color="#FFF" />
              </View>
              <Text style={[styles.instructionLabel, { color: theme.text }]}>
                Work items go LEFT
              </Text>
            </View>
            
            <View style={[styles.instructionItem, { backgroundColor: theme.cardBackground }]}>
              <View style={[styles.miniBlock, { backgroundColor: '#4CAF50' }]}>
                <Ionicons name="heart-outline" size={20} color="#FFF" />
              </View>
              <Text style={[styles.instructionLabel, { color: theme.text }]}>
                Wellness items go RIGHT
              </Text>
            </View>
          </View>
          
          <View style={styles.rulesContainer}>
            <Text style={[styles.ruleText, { color: theme.textSecondary }]}>
              ⚡ Keep the seesaw balanced for bonus points
            </Text>
            <Text style={[styles.ruleText, { color: theme.textSecondary }]}>
              ❌ -20 points if blocks hit the ground
            </Text>
            <Text style={[styles.ruleText, { color: theme.textSecondary }]}>
              ⏱️ Game ends if balance tips too far!
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.startButton, { backgroundColor: theme.accent }]}
            onPress={startGame}
          >
            <Text style={styles.startButtonText}>Start Game</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
            <Text style={[styles.skipButtonText, { color: theme.textSecondary }]}>
              Skip
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
  
  if (gameComplete) {
    const balanceMessage = Math.abs(balance) <= 30
      ? "Excellent balance! You've mastered work-life harmony."
      : balance < -30
      ? "Remember: All work and no play makes for burnout!"
      : "Don't forget - productivity needs purpose too!";
    
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.completionContainer}>
          <Ionicons name="trophy" size={60} color={theme.accent} />
          
          <Text style={[styles.completionTitle, { color: theme.text }]}>
            Game Complete!
          </Text>
          
          <Text style={[styles.finalScore, { color: theme.accent }]}>
            Final Score: {score}
          </Text>
          
          <View style={[styles.messageCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.balanceMessage, { color: theme.text }]}>
              {balanceMessage}
            </Text>
          </View>
          
          <Text style={[styles.xpText, { color: theme.textSecondary }]}>
            Calculating XP...
          </Text>
        </View>
      </View>
    );
  }
  
  const balanceStatus = getBalanceStatus();
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
        <TouchableOpacity onPress={onSkip} style={styles.exitButton}>
          <Ionicons name="close" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
        
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={20} color={theme.text} />
          <Text style={[styles.timerText, { color: theme.text }]}>
            {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
          </Text>
        </View>
        
        <TouchableOpacity onPress={togglePause} style={styles.pauseButton}>
          <Ionicons 
            name={isPaused ? 'play' : 'pause'} 
            size={24} 
            color={theme.textSecondary} 
          />
        </TouchableOpacity>
      </View>
      
      {/* Score and Status */}
      <View style={styles.statusContainer}>
        <View style={[styles.scoreCard, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Score</Text>
          <Text style={[styles.scoreText, { color: theme.text }]}>{score}</Text>
          {multiplier > 1 && (
            <View style={[styles.multiplierBadge, { backgroundColor: theme.accent }]}>
              <Text style={styles.multiplierText}>x{multiplier}</Text>
            </View>
          )}
        </View>
        
        <View style={[styles.balanceCard, { backgroundColor: balanceStatus.color + '20' }]}>
          <Text style={[styles.balanceText, { color: balanceStatus.color }]}>
            {balanceStatus.text}
          </Text>
        </View>
      </View>
      
      {/* Streak indicator */}
      {streak > 2 && (
        <View style={[styles.streakIndicator, { backgroundColor: theme.accent + '20' }]}>
          <Text style={[styles.streakText, { color: theme.accent }]}>
            🔥 {streak} Streak!
          </Text>
        </View>
      )}
      
      {/* Game Area */}
      <View style={styles.gameArea}>
        {/* Debug info */}
        <View style={[styles.debugInfo, { backgroundColor: theme.cardBackground + '80' }]}>
          <Text style={[styles.debugText, { color: theme.text }]}>
            Blocks: {blocks.length} | Spawning: {spawnIntervalRef.current ? 'Yes' : 'No'}
          </Text>
          <TouchableOpacity
            style={[styles.manualSpawnButton, { backgroundColor: theme.accent }]}
            onPress={() => {
              console.log('Manual spawn button pressed');
              spawnBlock();
            }}
          >
            <Text style={styles.manualSpawnText}>Manual Spawn</Text>
          </TouchableOpacity>
        </View>
        
        {/* Falling blocks */}
        {blocks.map(renderBlock)}
        
        {/* Seesaw */}
        <View style={[styles.seesawContainer, { top: SEESAW_Y }]}>
          <Animated.View
            style={[
              styles.seesaw,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
                transform: [{ 
                  rotate: seesawRotation.interpolate({
                    inputRange: [-30, 30],
                    outputRange: ['-30deg', '30deg'],
                  })
                }],
              },
            ]}
          >
            <View style={[styles.seesawHalf, styles.seesawWork]}>
              <Text style={[styles.seesawLabel, { color: '#FF6B6B' }]}>WORK</Text>
            </View>
            <View style={styles.seesawDivider} />
            <View style={[styles.seesawHalf, styles.seesawWellness]}>
              <Text style={[styles.seesawLabel, { color: '#4CAF50' }]}>WELLNESS</Text>
            </View>
          </Animated.View>
          
          <View style={[styles.pivot, { backgroundColor: theme.textSecondary }]} />
          <View style={[styles.pivotBase, { backgroundColor: theme.textSecondary }]} />
        </View>
        
        {/* Ground line */}
        <View style={[styles.ground, { backgroundColor: theme.border }]}>
          <Text style={[styles.groundText, { color: theme.textSecondary }]}>
            Miss = -20 points!
          </Text>
        </View>
      </View>
      
      {/* Pause overlay */}
      {isPaused && (
        <View style={styles.pauseOverlay}>
          <View style={[styles.pauseCard, { backgroundColor: theme.cardBackground }]}>
            <Ionicons name="pause-circle" size={48} color={theme.accent} />
            <Text style={[styles.pauseText, { color: theme.text }]}>Game Paused</Text>
            <TouchableOpacity
              style={[styles.resumeButton, { backgroundColor: theme.accent }]}
              onPress={togglePause}
            >
              <Text style={styles.resumeButtonText}>Resume</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Instructions
  instructionsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 20,
  },
  instructionCard: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  instructionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  instructionText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  instructionsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  instructionItem: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  miniBlock: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionLabel: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  rulesContainer: {
    marginBottom: 30,
    gap: 8,
  },
  ruleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  startButton: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 16,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  skipButton: {
    padding: 12,
  },
  skipButtonText: {
    fontSize: 14,
  },
  
  // Game Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 40,
  },
  exitButton: {
    padding: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timerText: {
    fontSize: 20,
    fontWeight: '700',
  },
  pauseButton: {
    padding: 8,
  },
  
  // Status
  statusContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 16,
  },
  scoreCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '700',
  },
  multiplierBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  multiplierText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  balanceCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Streak
  streakIndicator: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Game Area
  gameArea: {
    flex: 1,
    position: 'relative',
  },
  
  // Seesaw
  seesawContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  seesaw: {
    width: SEESAW_WIDTH,
    height: SEESAW_HEIGHT,
    borderRadius: 15,
    borderWidth: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  seesawHalf: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  seesawWork: {
    backgroundColor: '#FF6B6B15',
  },
  seesawWellness: {
    backgroundColor: '#4CAF5015',
  },
  seesawDivider: {
    width: 3,
    backgroundColor: '#666',
  },
  seesawLabel: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  pivot: {
    position: 'absolute',
    bottom: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignSelf: 'center',
  },
  pivotBase: {
    position: 'absolute',
    bottom: -30,
    width: 60,
    height: 15,
    borderRadius: 8,
    alignSelf: 'center',
  },
  
  // Ground
  ground: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    height: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groundText: {
    position: 'absolute',
    bottom: 5,
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Blocks
  block: {
    position: 'absolute',
    width: BLOCK_SIZE,
    height: BLOCK_SIZE,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  blockText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  
  // Completion
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 16,
  },
  finalScore: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 24,
  },
  messageCard: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  balanceMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  xpText: {
    fontSize: 18,
    fontWeight: '600',
  },
  
  // Pause overlay
  pauseOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 16,
  },
  pauseText: {
    fontSize: 20,
    fontWeight: '600',
  },
  resumeButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  resumeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Debug styles
  debugInfo: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    padding: 8,
    borderRadius: 8,
    zIndex: 1000,
  },
  debugText: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
  manualSpawnButton: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'center',
  },
  manualSpawnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});