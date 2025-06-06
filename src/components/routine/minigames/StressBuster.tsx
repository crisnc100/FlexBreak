import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import * as haptics from '../../../utils/haptics';
import { playCorrectSound, playIncorrectSound } from '../../../utils/soundEffects';

const { width, height } = Dimensions.get('window');

interface StressBusterProps {
  onGameComplete: (score: number, xpEarned: number) => void;
  onSkip: () => void;
  context?: 'routine' | 'home'; // Add context prop
}

interface Worker {
  id: string;
  x: number;
  y: number;
  hasGoodPosture: boolean;
  size: number;
  opacity: Animated.Value;
  scale: Animated.Value;
  showTime: number; // How long this worker will be visible
}

export const StressBuster: React.FC<StressBusterProps> = ({
  onGameComplete,
  onSkip,
  context = 'routine', // Default to routine for backward compatibility
}) => {
  const { theme } = useTheme();
  
  // Game state
  const [showInstructions, setShowInstructions] = useState(true);
  const [timeLeft, setTimeLeft] = useState(45); // 45 seconds
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [gameComplete, setGameComplete] = useState(false);
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [imagesPreloaded, setImagesPreloaded] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showExitAlert, setShowExitAlert] = useState(false);
  
  // Game refs - safer game area with margins to prevent off-screen spawning
  const gameArea = useRef({ width: width - 60, height: height * 0.6 }); // More margin, smaller height
  const workerSpawnTimer = useRef<NodeJS.Timeout>();
  const workerId = useRef(0);
  
  // Preload images on mount
  useEffect(() => {
    preloadImages();
  }, []);

  const preloadImages = async () => {
    try {
      console.log('🎮 Starting image preload...');
      
      // React Native compatible approach - just prefetch
      const goodWorkerUri = Image.resolveAssetSource(require('../../../../assets/images/goodWorker1.png')).uri;
      const tiredWorkerUri = Image.resolveAssetSource(require('../../../../assets/images/tiredWorker1.png')).uri;
      
      // Prefetch both images with timeout
      await Promise.race([
        Promise.all([
          Image.prefetch(goodWorkerUri),
          Image.prefetch(tiredWorkerUri),
        ]),
        new Promise(resolve => setTimeout(resolve, 1000)), // Max 1 second wait
      ]);
      
      console.log('🎮 Images preloaded successfully');
      setImagesPreloaded(true);
    } catch (error) {
      console.error('Error preloading images:', error);
      setImagesPreloaded(true); // Continue anyway after 1 second max
    }
  };

  // Game timer
  useEffect(() => {
    if (gameComplete || timeLeft <= 0 || showInstructions || isPaused) return;
    
    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timeLeft, gameComplete, showInstructions, isPaused]);
  
  // Auto-complete when time runs out
  useEffect(() => {
    if (timeLeft <= 0 && !gameComplete) {
      completeGame();
    }
  }, [timeLeft, gameComplete]);
  
  // Start spawning workers
  useEffect(() => {
    if (!gameComplete && !showInstructions && imagesPreloaded && !isPaused) {
      startWorkerSpawning();
    }
    
    return () => {
      if (workerSpawnTimer.current) {
        clearInterval(workerSpawnTimer.current);
      }
    };
  }, [gameComplete, showInstructions, imagesPreloaded, isPaused]);
  
  // Remove workers that have disappeared
  useEffect(() => {
    const cleanup = setInterval(() => {
      setWorkers(prev => prev.filter(worker => 
        Date.now() - worker.showTime < 2500 // Remove after 2.5 seconds - more time to see images
      ));
    }, 100);
    
    return () => clearInterval(cleanup);
  }, []);
  
  const startWorkerSpawning = () => {
    const updateSpawnRate = () => {
      if (workerSpawnTimer.current) {
        clearInterval(workerSpawnTimer.current);
      }
      
      if (!gameComplete && timeLeft > 0) {
        // Faster spawning as time decreases - more challenging toward the end
        const timeProgress = (45 - timeLeft) / 45; // 0 to 1
        const baseInterval = 1000; // Start at 1 second
        const minInterval = 400; // End at 0.4 seconds
        const spawnInterval = baseInterval - (timeProgress * (baseInterval - minInterval));
        const randomVariation = Math.random() * 400; // Add some randomness
        
        workerSpawnTimer.current = setTimeout(() => {
          spawnWorker();
          updateSpawnRate(); // Recursively update for next spawn
        }, spawnInterval + randomVariation);
      }
    };
    
    updateSpawnRate();
  };
  
  const spawnWorker = () => {
    const id = (workerId.current++).toString();
    
    // Make it more challenging as time decreases
    const timeProgress = (45 - timeLeft) / 45; // 0 to 1 as time progresses
    const goodPostureChance = 0.4 + (timeProgress * 0.3); // 40% to 70% good posture as game progresses
    const hasGoodPosture = Math.random() < goodPostureChance;
    
    // Larger sizes for better visibility, less variation for consistency
    const baseSize = 75 - (timeProgress * 15); // 75px down to 60px - bigger for visibility
    const size = baseSize + Math.random() * 5; // Less randomness, more consistent sizing
    
    // Ensure workers spawn within safe bounds
    const safeX = Math.max(10, Math.min(gameArea.current.width - size - 10, Math.random() * (gameArea.current.width - size)));
    const safeY = Math.max(10, Math.min(gameArea.current.height - size - 10, Math.random() * (gameArea.current.height - size)));
    
    const worker: Worker = {
      id,
      x: safeX,
      y: safeY,
      hasGoodPosture,
      size,
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5),
      showTime: Date.now(),
    };
    
    setWorkers(prev => [...prev, worker]);
    
    // Animate worker appearance
    Animated.parallel([
      Animated.timing(worker.opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(worker.scale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Auto-remove worker after 2.5 seconds - more time to see images
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(worker.opacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(worker.scale, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }, 2500);
  };
  
  const handleWorkerTap = (worker: Worker) => {
    const reactionTime = Date.now() - worker.showTime;
    
    if (worker.hasGoodPosture) {
      // Correct tap - good posture worker
      setScore(prev => prev + 1);
      setReactionTimes(prev => [...prev, reactionTime]);
      haptics.success();
      playCorrectSound(); // Good posture = correct sound
      
      // Positive feedback animation
      Animated.sequence([
        Animated.timing(worker.scale, {
          toValue: 1.3,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(worker.scale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Wrong tap - poor posture worker
      setMisses(prev => prev + 1);
      haptics.error();
      playIncorrectSound(); // Poor posture = incorrect sound
      
      // Negative feedback animation
      Animated.sequence([
        Animated.timing(worker.scale, {
          toValue: 0.7,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(worker.scale, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    
    // Remove worker from list
    setWorkers(prev => prev.filter(w => w.id !== worker.id));
  };
  
  const startGame = () => {
    setShowInstructions(false);
    haptics.light();
  };

  const handleSkipPress = () => {
    if (showInstructions) {
      // If in instructions, just exit directly
      onSkip();
    } else {
      // If in game, pause and show confirmation
      setIsPaused(true);
      setShowExitAlert(true);
      haptics.light();
    }
  };

  const confirmExit = () => {
    setShowExitAlert(false);
    setIsPaused(false);
    haptics.medium();
    onSkip();
  };

  const cancelExit = () => {
    setShowExitAlert(false);
    setIsPaused(false);
    haptics.light();
  };

  const completeGame = () => {
    setGameComplete(true);
    
    if (workerSpawnTimer.current) {
      clearInterval(workerSpawnTimer.current);
    }
    
    // Calculate XP: Base 25 XP for playing
    let xpEarned = 25;
    
    // Accuracy bonus (max 40 XP)
    const totalAttempts = score + misses;
    const accuracy = totalAttempts > 0 ? score / totalAttempts : 0;
    xpEarned += Math.floor(accuracy * 40);
    
    // Speed bonus (max 35 XP) - based on average reaction time
    if (reactionTimes.length > 0) {
      const avgReactionTime = reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length;
      const speedBonus = Math.max(0, 35 - Math.floor(avgReactionTime / 50)); // Faster = more XP
      xpEarned += speedBonus;
    }
    
    // Cap at 100 XP max
    xpEarned = Math.min(100, xpEarned);
    
    haptics.heavy();
    onGameComplete(score, xpEarned);
  };
  
  // Instructions screen
  if (showInstructions) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.instructionsScreen}>
          {/* Skip button at top */}
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.skipFromInstructions} onPress={handleSkipPress}>
              <Text style={[context === 'home' ? styles.skipTextHome : styles.skipText, { color: theme.textSecondary }]}>
                Skip Game
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.instructionsContent}>
            <Text style={[styles.instructionsTitle, { color: theme.text }]}>
              Posture Recognition Game
            </Text>
            <Text style={[styles.instructionsSubtitle, { color: theme.textSecondary }]}>
              Tap workers with GOOD posture!
            </Text>
            
            {!imagesPreloaded && (
              <View style={styles.loadingContainer}>
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                  Loading images...
                </Text>
              </View>
            )}
            
            {/* Example images to help users understand */}
            {imagesPreloaded && (
              <View style={styles.examplesContainer}>
                <View style={styles.exampleItem}>
                  <View style={[styles.exampleImageContainer, { borderColor: '#4CAF50' }]}>
                    <Image 
                      source={require('../../../../assets/images/goodWorker1.png')}
                      style={styles.exampleImage}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={[styles.exampleLabel, { color: '#4CAF50' }]}>TAP THIS</Text>
                  <Text style={[styles.exampleDescription, { color: theme.textSecondary }]}>
                    Good Posture
                  </Text>
                </View>
                
                <View style={styles.exampleItem}>
                  <View style={[styles.exampleImageContainer, { borderColor: '#F44336' }]}>
                    <Image 
                      source={require('../../../../assets/images/tiredWorker1.png')}
                      style={styles.exampleImage}
                      resizeMode="contain"
                    />
                  </View>
                  <Text style={[styles.exampleLabel, { color: '#F44336' }]}>AVOID THIS</Text>
                  <Text style={[styles.exampleDescription, { color: theme.textSecondary }]}>
                    Poor Posture
                  </Text>
                </View>
              </View>
            )}
            
            <View style={styles.instructionsDetails}>
              <Text style={[styles.instructionsText, { color: theme.textSecondary }]}>
                • Workers will appear randomly on screen{'\n'}
                • You have 45 seconds{'\n'}
                • Look for good vs poor posture{'\n'}
                • Tap only the workers with good posture!
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[
                styles.startButton, 
                { 
                  backgroundColor: imagesPreloaded ? theme.accent : theme.border,
                  opacity: imagesPreloaded ? 1 : 0.5 
                }
              ]}
              onPress={startGame}
              disabled={!imagesPreloaded}
            >
              <Text style={styles.startButtonText}>
                {imagesPreloaded ? 'Start Game' : 'Loading...'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (gameComplete) {
    const accuracy = (score + misses) > 0 ? Math.round((score / (score + misses)) * 100) : 0;
    const avgReactionTime = reactionTimes.length > 0 
      ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
      : 0;
    
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.completionContainer}>
          <Ionicons name="flash" size={60} color={theme.accent} />
          <Text style={[styles.completionTitle, { color: theme.text }]}>
            Posture Pro!
          </Text>
          <Text style={[styles.completionScore, { color: theme.text }]}>
            Score: {score}
          </Text>
          <Text style={[styles.completionAccuracy, { color: theme.textSecondary }]}>
            Accuracy: {accuracy}%
          </Text>
          {avgReactionTime > 0 && (
            <Text style={[styles.completionReaction, { color: theme.textSecondary }]}>
              Avg Reaction: {avgReactionTime}ms
            </Text>
          )}
        </View>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={context === 'home' ? styles.statsRowHome : styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Score</Text>
            <Text style={[styles.statValue, { color: theme.accent }]}>{score}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Time</Text>
            <Text style={[styles.statValue, { color: timeLeft <= 10 ? '#FF4444' : theme.accent }]}>
              {timeLeft}s
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Misses</Text>
            <Text style={[styles.statValue, { color: '#FF4444' }]}>{misses}</Text>
          </View>
        </View>
        
        {/* Pause indicator */}
        {isPaused && (
          <View style={styles.pauseIndicator}>
            <Text style={[styles.pauseText, { color: theme.accent }]}>⏸ PAUSED</Text>
          </View>
        )}
      </View>
      
      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={[styles.instructions, { color: theme.text }]}>
          Tap workers with good posture!
        </Text>
        <Text style={[styles.subInstructions, { color: theme.textSecondary }]}>
          Recognize and reward proper workplace posture
        </Text>
      </View>
      
      {/* Game Area */}
      <View style={[styles.gameArea, { borderColor: theme.border }]}>
        {workers.map(worker => (
          <TouchableOpacity
            key={worker.id}
            style={[
              styles.worker,
              {
                left: worker.x,
                top: worker.y,
                width: worker.size,
                height: worker.size,
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
                borderWidth: 2,
              }
            ]}
            onPress={() => handleWorkerTap(worker)}
            activeOpacity={0.8}
          >
            <Animated.View 
              style={[
                styles.workerContent,
                {
                  opacity: worker.opacity,
                  transform: [{ scale: worker.scale }],
                }
              ]}
            >
              {worker.hasGoodPosture ? (
                <Image 
                  source={require('../../../../assets/images/goodWorker1.png')}
                  style={styles.workerImage}
                  resizeMode="contain"
                />
              ) : (
                <Image 
                  source={require('../../../../assets/images/tiredWorker1.png')}
                  style={styles.workerImage}
                  resizeMode="contain"
                />
              )}
              
              {/* Subtle corner indicator - not too obvious */}
              <View style={[
                styles.postureIndicator,
                {
                  backgroundColor: worker.hasGoodPosture 
                    ? 'rgba(76, 175, 80, 0.3)' // Subtle green
                    : 'rgba(244, 67, 54, 0.3)', // Subtle red
                }
              ]} />
            </Animated.View>
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Skip/Pause Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkipPress}>
        <Text style={[context === 'home' ? styles.skipTextHome : styles.skipText, { color: theme.textSecondary }]}>
          {isPaused ? 'Resume Game' : 'Pause Game'}
        </Text>
      </TouchableOpacity>

      {/* Exit Confirmation Alert */}
      {showExitAlert && (
        <View style={styles.alertOverlay}>
          <View style={[styles.alertContainer, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.alertTitle, { color: theme.text }]}>
              Exit Game?
            </Text>
            <Text style={[styles.alertMessage, { color: theme.textSecondary }]}>
              You'll lose your current progress and miss out on bonus XP.
            </Text>
            <View style={styles.alertButtons}>
              <TouchableOpacity 
                style={[styles.alertButton, styles.cancelButton]} 
                onPress={cancelExit}
              >
                <Text style={[styles.alertButtonText, { color: theme.text }]}>
                  Continue Playing
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.alertButton, styles.confirmButton]} 
                onPress={confirmExit}
              >
                <Text style={styles.confirmButtonText}>
                  Exit Game
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10, // Reduced padding for more space
  },
  header: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statsRowHome: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 50, // Larger margin for home context
  },
  pauseIndicator: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  pauseText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: 4,
  },
  instructionsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  instructions: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  subInstructions: {
    fontSize: 14,
    textAlign: 'center',
  },
  gameArea: {
    flex: 1,
    borderWidth: 2,
    borderRadius: 12,
    borderStyle: 'dashed',
    position: 'relative',
    marginBottom: 10,
    marginHorizontal: 30, // Add horizontal margin to match spawn area
    minHeight: height * 0.5, // Reduce height to match spawn area
  },
  worker: {
    position: 'absolute',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  workerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  workerImage: {
    width: '90%',
    height: '90%',
  },
  postureIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  skipTextHome: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 25, // Extra margin for home context
  },
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 20,
    marginBottom: 10,
  },
  completionScore: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 5,
  },
  completionAccuracy: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  completionReaction: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Instructions screen styles
  instructionsScreen: {
    flex: 1,
    padding: 20,
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  instructionsContent: {
    flex: 1,
    justifyContent: 'center',
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionsSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
  },
  examplesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  exampleItem: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 10,
  },
  exampleImageContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
  },
  exampleImage: {
    width: 60,
    height: 60,
  },
  exampleLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  exampleDescription: {
    fontSize: 12,
    textAlign: 'center',
  },
  instructionsDetails: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  startButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  skipFromInstructions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 6,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  // Alert overlay styles
  alertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  alertContainer: {
    width: width * 0.85,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  alertMessage: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  alertButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  alertButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(128, 128, 128, 0.2)',
  },
  confirmButton: {
    backgroundColor: '#F44336',
  },
  alertButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});