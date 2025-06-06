import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import * as haptics from '../../../../utils/haptics';

// Import modular components
import { 
  ZenBalanceProps, 
  GameState, 
  OrbState, 
  VisualEffects,
  BalanceCategory,
  GAME_CONFIG, 
  GAME_MESSAGES,
  SCREEN_WIDTH, 
  SCREEN_HEIGHT 
} from './constants';
import { useMotionTracking } from './hooks/useMotionTracking';
import { useAudioManager } from './hooks/useAudioManager';
import { 
  generatePathPoint, 
  getSerenityColor, 
  getPathGlowColor,
  calculateXP, 
  calculateVisualEffects,
  isOrbCentered,
  getPathCenterAt,
  getDistanceFromPath,
  getBalanceCategory,
  getCompletionMessage,
  getCompletionSymbol
} from './utils/pathGeneration';
import { styles } from './styles';

export const ZenBalance: React.FC<ZenBalanceProps> = ({
  onGameComplete,
  onSkip,
  context = 'routine',
}) => {
  const { theme } = useTheme();
  
  // Game state
  const [gameState, setGameState] = useState<GameState>({
    showInstructions: true,
    isCalibrating: false,
    gameActive: false,
    timeLeft: GAME_CONFIG.DURATION,
    score: 0,
    centeredTime: 0,
    gameComplete: false,
    showExitAlert: false,
    showIntroMessage: false,
    balanceCategory: BalanceCategory.PARTIAL_BALANCE,
  });

  // Orb and path state
  const [orbState, setOrbState] = useState<OrbState>({
    orbPosition: { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT * 0.8 },
    pathProgress: 0,
    isCentered: true,
    serenityLevel: 1,
    testModeActive: false,
    horizontalOffset: 0,
    offPathTime: 0,
  });

  // Visual effects state
  const [visualEffects, setVisualEffects] = useState<VisualEffects>({
    rippleOpacity: 0,
    fogOpacity: 0,
    orbDimming: 1,
    showCompletionSymbol: false,
  });

  // Hooks
  const { motionState, checkMotionAvailability, startCalibration, startMotionTracking, stopMotionTracking } = useMotionTracking();
  const { setupAudio, playAmbientSound, stopAmbientSound, updateAmbientVolume } = useAudioManager();

  // Refs
  const gameLoopInterval = useRef<NodeJS.Timeout>();
  const orbAnimationValue = useRef(new Animated.Value(1)).current;
  const breathPulse = useRef(new Animated.Value(1)).current;
  const introMessageOpacity = useRef(new Animated.Value(0)).current;
  const completionSymbolScale = useRef(new Animated.Value(0)).current;
  
  // NEW: Refs to track current state for game loop
  const currentGameState = useRef(gameState);
  const currentOrbState = useRef(orbState);
  const currentVisualEffects = useRef(visualEffects);

  // Update refs when state changes
  useEffect(() => {
    currentGameState.current = gameState;
  }, [gameState]);

  useEffect(() => {
    currentOrbState.current = orbState;
    console.log('🎮 MINDFUL: Orb state updated - progress:', orbState.pathProgress, 'position:', orbState.orbPosition, 'testMode:', orbState.testModeActive);
  }, [orbState]);

  useEffect(() => {
    currentVisualEffects.current = visualEffects;
  }, [visualEffects]);

  // Initialize game
  useEffect(() => {
    setupGame();
    return cleanup;
  }, []);

  const setupGame = async () => {
    console.log('🎮 MINDFUL: Setting up game...');
    await setupAudio();
    const motionResult = await checkMotionAvailability();
    console.log('🎮 MINDFUL: Motion availability check result:', motionResult);
    console.log('🎮 MINDFUL: Game setup complete');
  };

  const cleanup = () => {
    console.log('🎮 MINDFUL: Cleaning up game resources');
    if (gameLoopInterval.current) {
      clearInterval(gameLoopInterval.current);
    }
    stopMotionTracking();
    stopAmbientSound();
  };

  // Game timer
  useEffect(() => {
    if (!gameState.gameActive || gameState.timeLeft <= 0) return;
    
    const timer = setTimeout(() => {
      setGameState(prev => ({ ...prev, timeLeft: prev.timeLeft - 1 }));
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [gameState.timeLeft, gameState.gameActive]);

  // Auto-complete when time runs out
  useEffect(() => {
    if (gameState.timeLeft <= 0 && gameState.gameActive) {
      completeGame();
    }
  }, [gameState.timeLeft, gameState.gameActive]);

  const handleStartCalibration = async () => {
    console.log('🎮 MINDFUL: Starting calibration...');
    setGameState(prev => ({ ...prev, isCalibrating: true, showInstructions: false }));
    
    if (!motionState.motionAvailable) {
      console.log('🎮 MINDFUL: Motion not available - enabling test mode');
      setOrbState(prev => ({ ...prev, testModeActive: true }));
      setTimeout(startGame, 1000);
      return;
    }

    try {
      const calibrationResult = await startCalibration();
      console.log('🎮 MINDFUL: Calibration finished:', calibrationResult);
      setTimeout(startGame, 500);
    } catch (error) {
      console.log('🎮 MINDFUL: Calibration failed, enabling test mode:', error);
      setOrbState(prev => ({ ...prev, testModeActive: true }));
      setTimeout(startGame, 500);
    }
  };

  const startGame = () => {
    console.log('🎮 MINDFUL: Starting game...');
    
    // Set game state to active
    setGameState(prev => ({ 
      ...prev, 
      showIntroMessage: false, 
      gameActive: true,
      isCalibrating: false 
    }));
    
    console.log('🎮 MINDFUL: Game state set to active - starting components');
    haptics.light();
    
    // Start orb breathing animation
    startOrbAnimation();
    
    // Start motion tracking for horizontal control
    if (motionState.motionAvailable && !orbState.testModeActive) {
      console.log('🎮 MINDFUL: Starting motion tracking');
      startMotionTracking(handleTiltUpdate);
    } else {
      console.log('🎮 MINDFUL: Using test mode - no motion tracking');
    }
  };

  // NEW: Effect to start game loop when game becomes active
  useEffect(() => {
    if (gameState.gameActive && !gameLoopInterval.current) {
      console.log('🎮 MINDFUL: Game became active - starting game loop');
      gameLoopInterval.current = setInterval(updateGameState, GAME_CONFIG.UPDATE_INTERVAL);
    } else if (!gameState.gameActive && gameLoopInterval.current) {
      console.log('🎮 MINDFUL: Game became inactive - stopping game loop');
      clearInterval(gameLoopInterval.current);
      gameLoopInterval.current = undefined;
    }
  }, [gameState.gameActive]);

  const startOrbAnimation = () => {
    // Gentle breathing animation for the orb
    const breatheAnimation = () => {
      Animated.sequence([
        Animated.timing(orbAnimationValue, {
          toValue: 1.1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(orbAnimationValue, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (gameState.gameActive) breatheAnimation();
      });
    };
    breatheAnimation();

    // Breath pulsing for mindfulness
    const breathPulseAnimation = () => {
      Animated.sequence([
        Animated.timing(breathPulse, {
          toValue: 1.05,
          duration: 3000, // Slow inhale
          useNativeDriver: true,
        }),
        Animated.timing(breathPulse, {
          toValue: 1,
          duration: 3000, // Slow exhale
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (gameState.gameActive) breathPulseAnimation();
      });
    };
    breathPulseAnimation();
  };

  const handleTiltUpdate = (tilt: { x: number; y: number }) => {
    // User tilt only controls horizontal offset (left/right balance)
    const sensitivity = GAME_CONFIG.SENSITIVITY;
    const maxOffset = SCREEN_WIDTH * 0.25;
    
    const newHorizontalOffset = Math.max(
      -maxOffset, 
      Math.min(maxOffset, tilt.y * sensitivity)
    );
    
    setOrbState(prev => ({ ...prev, horizontalOffset: newHorizontalOffset }));
  };

  const updateGameState = () => {
    const currentGame = currentGameState.current;
    const currentOrb = currentOrbState.current;
    
    console.log('🎮 MINDFUL: updateGameState called, gameActive:', currentGame.gameActive);
    
    if (!currentGame.gameActive) {
      console.log('🎮 MINDFUL: updateGameState called but game not active');
      return;
    }
    
    console.log('🎮 MINDFUL: updateGameState running, current progress:', currentOrb.pathProgress);
    
    // 1. AUTOMATIC FORWARD PROGRESSION
    const newProgress = Math.min(1, currentOrb.pathProgress + GAME_CONFIG.PROGRESS_SPEED);
    console.log('🎮 MINDFUL: New progress:', newProgress);
    
    // 2. GET CURRENT PATH CENTER
    const pathCenter = getPathCenterAt(newProgress);
    console.log('🎮 MINDFUL: Path center:', pathCenter);
    
    // 3. CALCULATE ORB POSITION
    let newOrbX = pathCenter.x;
    let newOrbY = pathCenter.y;
    
    if (currentOrb.testModeActive) {
      // Test mode: gentle automatic swaying
      const time = Date.now() / 1000;
      const autoSway = Math.sin(time * 0.3) * 30;
      newOrbX = pathCenter.x + autoSway;
      console.log('🎮 MINDFUL: Test mode - auto sway:', autoSway);
    } else {
      // Normal mode: user controls horizontal offset
      newOrbX = pathCenter.x + currentOrb.horizontalOffset;
      console.log('🎮 MINDFUL: Normal mode - horizontal offset:', currentOrb.horizontalOffset);
    }
    
    // Keep orb within bounds
    newOrbX = Math.max(40, Math.min(SCREEN_WIDTH - 40, newOrbX));
    
    console.log('🎮 MINDFUL: New orb position:', { x: newOrbX, y: newOrbY });
    
    // 4. CHECK CENTERING AND CALCULATE DISTANCE
    const centered = isOrbCentered(newOrbX, newOrbY, newProgress);
    const distanceFromPath = getDistanceFromPath(newOrbX, newOrbY, newProgress);
    
    // 5. UPDATE VISUAL EFFECTS
    const newOffPathTime = centered ? 0 : currentOrb.offPathTime + GAME_CONFIG.UPDATE_INTERVAL;
    const effects = calculateVisualEffects(centered, distanceFromPath, newOffPathTime);
    setVisualEffects(effects);
    
    // 6. UPDATE SERENITY AND SCORING
    let newSerenityLevel = currentOrb.serenityLevel;
    let newScore = currentGame.score;
    let newCenteredTime = currentGame.centeredTime;
    
    if (centered) {
      newCenteredTime += 0.1;
      newScore += 2;
      newSerenityLevel = Math.min(1, currentOrb.serenityLevel + 0.02);
      
      // REDUCED: Very gentle haptic feedback only every 10 seconds when centered
      if (Math.floor(newCenteredTime) % 10 === 0 && Math.floor(newCenteredTime) !== Math.floor(currentGame.centeredTime)) {
        haptics.light();
      }
    } else {
      newSerenityLevel = Math.max(0.2, currentOrb.serenityLevel - 0.01);
      
      // REMOVED: No haptics when drifting to reduce overwhelm
    }
    
    // 7. UPDATE STATE - CRITICAL: Use functional updates to avoid race conditions
    console.log('🎮 MINDFUL: Updating orb state with new position and progress');
    setOrbState(prev => ({
      ...prev,
      orbPosition: { x: newOrbX, y: newOrbY },
      pathProgress: newProgress,
      isCentered: centered,
      serenityLevel: newSerenityLevel,
      offPathTime: newOffPathTime,
    }));
    
    setGameState(prev => ({
      ...prev,
      score: newScore,
      centeredTime: newCenteredTime,
    }));
    
    // 8. UPDATE AMBIENT AUDIO
    updateAmbientVolume(newSerenityLevel);
    
    // 9. END GAME WHEN PATH IS COMPLETE
    if (newProgress >= 1) {
      console.log('🎮 MINDFUL: Path complete, ending game');
      completeGame();
    }
  };

  const completeGame = () => {
    // Calculate balance category
    const centeredPercentage = gameState.centeredTime / GAME_CONFIG.DURATION;
    const balanceCategory = getBalanceCategory(centeredPercentage);
    
    setGameState(prev => ({ 
      ...prev, 
      gameComplete: true, 
      gameActive: false,
      balanceCategory 
    }));
    
    stopMotionTracking();
    
    if (gameLoopInterval.current) {
      clearInterval(gameLoopInterval.current);
    }
    
    // Show completion symbol animation
    setVisualEffects(prev => ({ ...prev, showCompletionSymbol: true }));
    Animated.spring(completionSymbolScale, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();
    
    // Calculate XP based on new system
    const xpEarned = calculateXP(gameState.centeredTime, orbState.serenityLevel, GAME_CONFIG.DURATION);
    
    haptics.heavy();
    onGameComplete(gameState.score, xpEarned);
  };

  const handleSkipPress = () => {
    if (gameState.showInstructions || gameState.isCalibrating) {
      onSkip();
    } else {
      setGameState(prev => ({ ...prev, showExitAlert: true }));
      haptics.light();
    }
  };

  const confirmExit = () => {
    setGameState(prev => ({ ...prev, showExitAlert: false, gameActive: false }));
    stopMotionTracking();
    haptics.medium();
    onSkip();
  };

  const cancelExit = () => {
    setGameState(prev => ({ ...prev, showExitAlert: false }));
    haptics.light();
  };

  const getBalanceCategoryColor = (category: BalanceCategory) => {
    switch (category) {
      case BalanceCategory.FULL_BALANCE:
        return '#4CAF50'; // Green
      case BalanceCategory.PARTIAL_BALANCE:
        return '#FF9800'; // Orange  
      case BalanceCategory.RESTLESS:
        return '#2196F3'; // Blue
      default:
        return theme.accent;
    }
  };

  const getBalanceCategoryLabel = (category: BalanceCategory) => {
    switch (category) {
      case BalanceCategory.FULL_BALANCE:
        return '🌕 Full Balance';
      case BalanceCategory.PARTIAL_BALANCE:
        return '🌗 Partial Balance';
      case BalanceCategory.RESTLESS:
        return '🌑 Restless Flow';
      default:
        return 'Balanced';
    }
  };

  // NEW: Effect to activate test mode if motion isn't working
  useEffect(() => {
    // Auto-enable test mode if motion data shows all zeros (indicating calibration issues)
    if (gameState.gameActive && 
        motionState.calibratedX === 0 && 
        motionState.calibratedY === 0 && 
        !orbState.testModeActive) {
      console.log('🎮 MINDFUL: Motion data is all zeros - enabling test mode');
      setOrbState(prev => ({ ...prev, testModeActive: true }));
    }
  }, [gameState.gameActive, motionState.calibratedX, motionState.calibratedY, orbState.testModeActive]);

  // REMOVED: Auto-force test mode timer - let motion tracking work properly

  // RENDER INSTRUCTIONS SCREEN
  if (gameState.showInstructions) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.instructionsScreen}>
          <View style={styles.topControls}>
            <TouchableOpacity style={styles.skipFromInstructions} onPress={handleSkipPress}>
              <Text style={[context === 'home' ? styles.skipTextHome : styles.skipText, { color: theme.textSecondary }]}>
                Skip Game
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.instructionsContent}>
            <Text style={[styles.instructionsTitle, { color: theme.text }]}>
              Mindful Flow
            </Text>
            <Text style={[styles.instructionsSubtitle, { color: theme.textSecondary }]}>
              Guide your inner light through mindful movement
            </Text>
            
            <View style={styles.instructionsDetails}>
              <Text style={[styles.instructionsText, { color: theme.textSecondary }]}>
                • Hold your phone comfortably{'\n'}
                • The orb flows forward automatically{'\n'}
                • Gently tilt left/right to keep it centered{'\n'}
                • Move slowly and mindfully{'\n'}
                • Find peace through gentle balance
              </Text>
            </View>
            
            <TouchableOpacity 
              style={[styles.startButton, { backgroundColor: theme.accent }]}
              onPress={handleStartCalibration}
            >
              <Text style={styles.startButtonText}>
                Begin Journey
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // RENDER CALIBRATION SCREEN
  if (gameState.isCalibrating) {
    const calibrationProgress = (motionState.calibrationSamples.length / GAME_CONFIG.CALIBRATION_SAMPLES) * 100;
    
    return (
      <View style={[styles.container, styles.calibrationContainer, { backgroundColor: theme.background }]}>
        <View style={styles.calibrationContent}>
          <Ionicons name="radio-button-on" size={80} color={theme.accent} />
          <Text style={[styles.calibrationTitle, { color: theme.text }]}>
            Finding Your Center
          </Text>
          <Text style={[styles.calibrationText, { color: theme.textSecondary }]}>
            Hold your phone in a comfortable, natural position...
          </Text>
          
          {motionState.motionAvailable && !orbState.testModeActive ? (
            <>
              <Text style={[styles.calibrationSubtext, { color: theme.textSecondary }]}>
                Calibrating motion sensors... {motionState.calibrationSamples.length}/{GAME_CONFIG.CALIBRATION_SAMPLES}
              </Text>
              <View style={styles.calibrationProgress}>
                <View style={[styles.calibrationProgressBar, { backgroundColor: theme.border }]}>
                  <View 
                    style={[
                      styles.calibrationProgressFill, 
                      { 
                        backgroundColor: theme.accent,
                        width: `${calibrationProgress}%`
                      }
                    ]} 
                  />
                </View>
              </View>
              <Text style={[styles.debugText, { color: theme.textSecondary }]}>
                Raw motion: β{Math.round(motionState.rawMotion.beta)}° γ{Math.round(motionState.rawMotion.gamma)}°
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.calibrationSubtext, { color: theme.textSecondary }]}>
                Using test mode - motion sensors not available
              </Text>
              <View style={styles.loadingDots}>
                <Animated.View style={[styles.dot, { backgroundColor: theme.accent }]} />
                <Animated.View style={[styles.dot, { backgroundColor: theme.accent }]} />
                <Animated.View style={[styles.dot, { backgroundColor: theme.accent }]} />
              </View>
            </>
          )}
        </View>
      </View>
    );
  }

  // RENDER COMPLETION SCREEN
  if (gameState.gameComplete) {
    const centerPercentage = Math.round((gameState.centeredTime / GAME_CONFIG.DURATION) * 100);
    const completionMessage = getCompletionMessage(gameState.balanceCategory);
    const symbolName = getCompletionSymbol(gameState.balanceCategory);
    
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.completionContainer}>
          <Ionicons name={symbolName as any} size={60} color={getBalanceCategoryColor(gameState.balanceCategory)} />
          <Text style={[styles.completionTitle, { color: theme.text }]}>
            Journey Complete
          </Text>
          
          {/* Balance Category Indicator */}
          <View style={[styles.balanceCategoryContainer, { backgroundColor: getBalanceCategoryColor(gameState.balanceCategory) + '20' }]}>
            <Text style={[styles.balanceCategoryText, { color: getBalanceCategoryColor(gameState.balanceCategory) }]}>
              {getBalanceCategoryLabel(gameState.balanceCategory)}
            </Text>
          </View>
          
          <Text style={[styles.completionScore, { color: theme.text }]}>
            Score: {gameState.score}
          </Text>
          <Text style={[styles.completionBalance, { color: theme.textSecondary }]}>
            Centered: {centerPercentage}% of journey
          </Text>
          <Text style={[styles.completionZen, { color: theme.textSecondary }]}>
            {completionMessage}
          </Text>
        </View>
      </View>
    );
  }

  // RENDER MAIN GAME SCREEN
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Stats */}
      <View style={styles.header}>
        <View style={context === 'home' ? styles.statsRowHome : styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Score</Text>
            <Text style={[styles.statValue, { color: theme.accent }]}>{gameState.score}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Time</Text>
            <Text style={[styles.statValue, { color: gameState.timeLeft <= 10 ? '#FF4444' : theme.accent }]}>
              {gameState.timeLeft}s
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Centered</Text>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              {Math.floor(gameState.centeredTime)}s
            </Text>
          </View>
        </View>
      </View>

      {/* Instructions */}
      <View style={context === 'home' ? styles.instructionsContainerHome : styles.instructionsContainer}>
        <Text style={[styles.instructions, { color: theme.text }]}>
          Gently guide the light along the flowing path
        </Text>
      </View>

      {/* Mindful Flow Area */}
      <View style={[styles.flowArea, { backgroundColor: getSerenityColor(orbState.serenityLevel) }]}>
        {/* Fog Overlay for off-path feedback */}
        {visualEffects.fogOpacity > 0 && (
          <View style={[styles.fogOverlay, { opacity: visualEffects.fogOpacity }]} />
        )}
        
        {/* Render the flowing path with enhanced glow */}
        <View style={styles.pathContainer}>
          {Array.from({ length: GAME_CONFIG.PATH_SEGMENTS }, (_, i) => {
            const progress = i / GAME_CONFIG.PATH_SEGMENTS;
            const point = generatePathPoint(progress);
            const isVisible = progress <= orbState.pathProgress + 0.3;
            const opacity = isVisible ? Math.max(0.3, 1 - Math.abs(progress - orbState.pathProgress) * 2) : 0;
            
            return (
              <View key={i}>
                {/* Main path segment */}
                <View
                  style={[
                    styles.pathSegment,
                    {
                      left: point.x - 15,
                      top: point.y - 15,
                      opacity,
                      backgroundColor: opacity > 0 ? getPathGlowColor(orbState.isCentered, orbState.serenityLevel) : 'transparent',
                    }
                  ]}
                />
                {/* Glow effect */}
                {opacity > 0.5 && (
                  <View
                    style={[
                      styles.pathSegmentGlow,
                      {
                        left: point.x - 20,
                        top: point.y - 20,
                        opacity: opacity * 0.5,
                        backgroundColor: getPathGlowColor(orbState.isCentered, orbState.serenityLevel),
                      }
                    ]}
                  />
                )}
              </View>
            );
          })}
        </View>
        
        {/* Ripple effect when off path */}
        {visualEffects.rippleOpacity > 0 && (
          <View
            style={[
              styles.rippleEffect,
              {
                left: orbState.orbPosition.x - 50,
                top: orbState.orbPosition.y - 50,
                opacity: visualEffects.rippleOpacity,
              }
            ]}
          />
        )}
        
        {/* Glowing Orb - ENHANCED VISIBILITY */}
        <Animated.View
          style={[
            styles.orb,
            {
              left: orbState.orbPosition.x - 20,
              top: orbState.orbPosition.y - 20,
              backgroundColor: orbState.isCentered ? '#4CAF50' : '#FF9800', // Bright colors
              shadowColor: orbState.isCentered ? '#4CAF50' : '#FF9800',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.8,
              shadowRadius: 15,
              elevation: 10,
              opacity: Math.max(0.8, visualEffects.orbDimming * orbState.serenityLevel), // Ensure minimum visibility
              transform: [
                { scale: orbAnimationValue },
                { scale: breathPulse }
              ],
            }
          ]}
        >
          <View style={[
            styles.orbInner, 
            { 
              backgroundColor: orbState.isCentered ? '#FFFFFF' : '#FFEB3B',
              opacity: 0.9
            }
          ]} />
        </Animated.View>
        
        {/* Completion Symbol */}
        {visualEffects.showCompletionSymbol && (
          <Animated.View
            style={[
              styles.completionSymbolContainer,
              {
                transform: [{ scale: completionSymbolScale }],
              }
            ]}
          >
            <Ionicons 
              name={getCompletionSymbol(gameState.balanceCategory) as any} 
              size={60} 
              color={getBalanceCategoryColor(gameState.balanceCategory)} 
            />
          </Animated.View>
        )}
        
        {/* Serenity Indicator */}
        <View style={styles.serenityIndicator}>
          <Text style={[styles.serenityText, { color: theme.text }]}>
            {orbState.isCentered ? '✨ In Flow' : '○ Find Center'}
          </Text>
          
          {/* DEBUG INFO */}
          <Text style={[styles.debugText, { color: theme.textSecondary }]}>
            GAME ACTIVE: {gameState.gameActive ? 'YES' : 'NO'}
          </Text>
          <Text style={[styles.debugText, { color: theme.textSecondary }]}>
            PROGRESS: {Math.round(orbState.pathProgress * 100)}%
          </Text>
          <Text style={[styles.debugText, { color: theme.textSecondary }]}>
            ORB POS: {Math.round(orbState.orbPosition.x)}, {Math.round(orbState.orbPosition.y)}
          </Text>
          <Text style={[styles.debugText, { color: theme.textSecondary }]}>
            PATH CENTER: {Math.round(getPathCenterAt(orbState.pathProgress).x)}, {Math.round(getPathCenterAt(orbState.pathProgress).y)}
          </Text>
          <Text style={[styles.debugText, { color: theme.textSecondary }]}>
            {orbState.testModeActive ? 'Test Mode Active' : 
             motionState.motionAvailable ? `Motion: β${Math.round(motionState.rawMotion.beta)}° γ${Math.round(motionState.rawMotion.gamma)}°` : 'No Motion Sensors'}
          </Text>
          <Text style={[styles.debugText, { color: theme.textSecondary }]}>
            {orbState.testModeActive ? 'Auto Balance' : `Offset: ${Math.round(orbState.horizontalOffset)}`}
          </Text>
          
          <View style={[styles.serenityBar, { backgroundColor: theme.border }]}>
            <View 
              style={[
                styles.serenityFill, 
                { 
                  backgroundColor: theme.accent,
                  width: `${orbState.serenityLevel * 100}%`
                }
              ]} 
            />
          </View>
        </View>
      </View>

      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkipPress}>
        <Text style={[context === 'home' ? styles.skipTextHome : styles.skipText, { color: theme.textSecondary }]}>
          Pause Game
        </Text>
      </TouchableOpacity>

      {/* Intro Message Overlay */}
      {gameState.showIntroMessage && (
        <Animated.View 
          style={[
            styles.introMessageOverlay,
            { opacity: introMessageOpacity }
          ]}
        >
          <Text style={styles.introMessage}>
            {GAME_MESSAGES.INTRO}
          </Text>
        </Animated.View>
      )}

      {/* Exit Confirmation Alert */}
      {gameState.showExitAlert && (
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