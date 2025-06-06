import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as haptics from '../../utils/haptics';
import { useTheme } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';
import { playCompletionSound, playLevelUpSound } from '../../utils/soundEffects';
import { getData, setData, KEYS } from '../../services/storageService';
import ActionButtons from './tabs/ActionButtons';

// Import new micro-interaction components
import { CompletionCelebration } from './flow/CompletionCelebration';
import { XPRevealCard } from './flow/XPRevealCard';
import { AchievementMoments } from './flow/AchievementMoments';
import { SummaryTransition } from './flow/SummaryTransition';
import { MiniGamePopup } from './MiniGamePopup';

interface RoutineCompletionFlowProps {
  // Existing props from CompletedRoutine
  area: string;
  duration: string;
  isPremium: boolean;
  xpEarned?: number;
  xpBreakdown?: any[];
  levelUp?: any;
  isXpBoosted?: boolean;
  savedStretches?: any[];
  unlockedAchievements?: any[];
  onShowDashboard: () => void;
  onNavigateHome: () => void;
  onOpenSubscription: () => void;
  onSaveToFavorites: () => void;
  onSmartPick: () => void;
  onNewRoutine: () => void;
}

type FlowStep = 'celebration' | 'xp-reveal' | 'achievements' | 'summary';

export const RoutineCompletionFlow: React.FC<RoutineCompletionFlowProps> = ({
  area,
  duration,
  isPremium,
  xpEarned = 0,
  xpBreakdown = [],
  levelUp,
  isXpBoosted,
  savedStretches = [],
  unlockedAchievements = [],
  onShowDashboard,
  onNavigateHome,
  onOpenSubscription,
  onSaveToFavorites,
  onSmartPick,
  onNewRoutine,
}) => {
  const { theme, isDark, isSunset } = useTheme();
  const [currentStep, setCurrentStep] = useState<FlowStep>('celebration');
  const [isFlowComplete, setIsFlowComplete] = useState(false);
  
  // Mini-game popup state
  const [showMiniGamePopup, setShowMiniGamePopup] = useState(false);
  const [miniGameXp, setMiniGameXp] = useState(0);

  // Animation values for step transitions
  const stepOpacity = useRef(new Animated.Value(1)).current;
  const stepTranslateY = useRef(new Animated.Value(0)).current;

  // Calculate derived data (reusing existing logic)
  const hasXpBoost = isXpBoosted || xpBreakdown.some(item => item.source?.includes('boost'));
  const showLevelUp = levelUp && (levelUp.oldLevel !== levelUp.newLevel);
  const routineLength = savedStretches.length;
  const hasAchievements = unlockedAchievements.length > 0 || showLevelUp;


  // Play completion sound on mount
  useEffect(() => {
    playCompletionSound();
  }, []);

  // Trigger mini-game popup when summary step is reached
  useEffect(() => {
    if (currentStep === 'summary') {
      console.log('🎮 POPUP: Summary step reached, showing popup in 1 second');
      const timer = setTimeout(() => {
        checkAndShowMiniGamePopup();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  // Check if user can access mini-games and show popup after flow completes
  const checkAndShowMiniGamePopup = async () => {
    try {
      console.log('🎮 POPUP: checkAndShowMiniGamePopup called');
      const today = new Date().toDateString();
      const lastPlayDate = await getData(KEYS.MINIGAMES.LAST_PLAYED_DATE, '');
      const playedToday = lastPlayDate === today;
      
      console.log('🎮 POPUP: isPremium:', isPremium);
      console.log('🎮 POPUP: playedToday:', playedToday);
      console.log('🎮 POPUP: lastPlayDate:', lastPlayDate);
      
      // Premium users: Always show popup after routines
      // Free users: Only 1 mini-game per day
      if (isPremium || !playedToday) {
        console.log('🎮 POPUP: Showing mini-game popup');
        setShowMiniGamePopup(true);
      } else {
        console.log('🎮 POPUP: NOT showing mini-game popup - free user already played today');
      }
    } catch (error) {
      console.error('Error checking mini-game access:', error);
    }
  };

  // Step timing configuration
  const stepTimings = {
    celebration: 2200,  // Increased from 1800 for more deliberate feel
    xpReveal: 3200,     // Increased from 2800 for better XP impact
    achievements: showLevelUp ? 4500 : 3000,  // More time for achievements to land
    summary: 0 // User controlled
  };

  // Auto-advance through steps
  useEffect(() => {
    if (currentStep === 'summary') return;

    const timer = setTimeout(() => {
      transitionToNextStep();
    }, stepTimings[currentStep]);

    return () => clearTimeout(timer);
  }, [currentStep]);

  // Simple step order
  const getStepOrder = (): FlowStep[] => {
    return ['celebration', 'xp-reveal', 'achievements', 'summary'];
  };

  const transitionToNextStep = () => {
    Animated.parallel([
      Animated.timing(stepOpacity, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(stepTranslateY, {
        toValue: -30,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start(() => {
      const stepOrder = getStepOrder();
      const currentIndex = stepOrder.indexOf(currentStep);
      const nextStep = stepOrder[currentIndex + 1];
      
      if (nextStep) {
        setCurrentStep(nextStep);
        
        // Play level up sound when transitioning to achievements step
        if (nextStep === 'achievements' && showLevelUp) {
          playLevelUpSound();
        }
        
        // Trigger mini-game popup when reaching summary
        if (nextStep === 'summary') {
          console.log('🎮 POPUP: Reached summary, will show mini-game popup in 1 second');
          setTimeout(() => {
            console.log('🎮 POPUP: Calling checkAndShowMiniGamePopup()');
            checkAndShowMiniGamePopup();
          }, 1000); // Show popup 1 second after summary appears
        }
        
        // Reset animation values and animate in
        stepTranslateY.setValue(40);
        stepOpacity.setValue(0);
        
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(stepOpacity, {
              toValue: 1,
              duration: 500,
              useNativeDriver: true,
            }),
            Animated.spring(stepTranslateY, {
              toValue: 0,
              tension: 70,
              friction: 8,
              useNativeDriver: true,
            })
          ]).start();
        }, 150);
      }
    });
  };

  const skipToEnd = () => {
    setCurrentStep('summary');
    setIsFlowComplete(true);
    stepOpacity.setValue(1);
    stepTranslateY.setValue(0);
    
    // Show mini-game popup after a brief delay
    setTimeout(() => {
      checkAndShowMiniGamePopup();
    }, 500);
  };

  const handleMiniGameXpEarned = (xp: number) => {
    setMiniGameXp(xp);
    console.log(`Mini-game XP earned: ${xp}`);
    // TODO: Add XP to user's total (integrate with XP system)
  };

  const handleCloseMiniGamePopup = () => {
    setShowMiniGamePopup(false);
  };

  const renderCurrentStep = () => {
    const animatedStyle = {
      opacity: stepOpacity,
      transform: [{ translateY: stepTranslateY }]
    };

    switch (currentStep) {
      case 'celebration':
        return (
          <Animated.View style={[styles.stepContainer, animatedStyle]}>
            <CompletionCelebration
              onComplete={() => {
                haptics.heavy();
                // Step will auto-advance via useEffect
              }}
            />
          </Animated.View>
        );

      case 'xp-reveal':
        return (
          <Animated.View style={[styles.stepContainer, animatedStyle]}>
            <XPRevealCard
              xpEarned={xpEarned}
              xpBreakdown={xpBreakdown}
              hasXpBoost={hasXpBoost}
              theme={theme}
              isDark={isDark}
              isSunset={isSunset}
              onRevealComplete={() => {
                haptics.medium();
                // Step will auto-advance via useEffect
              }}
            />
          </Animated.View>
        );

      case 'achievements':
        if (!hasAchievements) {
          // Skip to summary if no achievements
          setCurrentStep('summary');
          return null;
        }
        
        return (
          <Animated.View style={[styles.stepContainer, animatedStyle]}>
            <AchievementMoments
              levelUp={levelUp}
              unlockedAchievements={unlockedAchievements}
              showLevelUp={showLevelUp}
              isDark={isDark}
              isSunset={isSunset}
              onMomentsComplete={() => {
                if (showLevelUp) {
                  haptics.heavy();
                  // Add extra pause for level up
                  setTimeout(() => {
                    // Step will auto-advance via useEffect
                  }, 500);
                }
              }}
            />
          </Animated.View>
        );

      case 'summary':
        return (
          <Animated.View style={[styles.stepContainer, animatedStyle]}>
            <SummaryTransition
              area={area}
              duration={duration}
              routineLength={routineLength}
              xpEarned={xpEarned + miniGameXp}
              hasXpBoost={hasXpBoost}
              theme={theme}
              onTransitionComplete={() => {
                setIsFlowComplete(true);
              }}
            />
            
       
            {/* Action Buttons - reuse existing component */}
            <ActionButtons
              isPremium={isPremium}
              showAnyLevelUp={false} // Summary view, compact layout
              theme={theme}
              onSaveToFavorites={onSaveToFavorites}
              onSmartPick={onSmartPick}
              onNewRoutine={onNewRoutine}
              onOpenSubscription={onOpenSubscription}
            />
            
            {/* Tap to continue hint */}
            <View style={styles.tapIndicatorContainer}>
              <Ionicons name="finger-print-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.tapIndicatorText, { color: theme.textSecondary }]}>
                Tap anywhere to continue
              </Text>
            </View>
          </Animated.View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Skip button for power users */}
      {currentStep !== 'summary' && (
        <View style={styles.skipContainer}>
          <Text 
            style={[styles.skipText, { color: theme.textSecondary }]}
            onPress={skipToEnd}
          >
            Skip
          </Text>
        </View>
      )}

      {/* Main content area */}
      <View style={styles.contentContainer}>
        {renderCurrentStep()}
      </View>

      {/* Progress indicator */}
      {currentStep !== 'summary' && (
        <View style={styles.progressContainer}>
          <ProgressDots 
            currentStep={currentStep} 
            theme={theme}
            hasAchievements={hasAchievements}
          />
        </View>
      )}

      {/* Mini-game popup */}
      <MiniGamePopup
        visible={showMiniGamePopup}
        onClose={handleCloseMiniGamePopup}
        onXpEarned={handleMiniGameXpEarned}
        isPremium={isPremium}
      />
    </View>
  );
};

// Progress dots component
const ProgressDots: React.FC<{
  currentStep: FlowStep;
  theme: any;
  hasAchievements: boolean;
}> = ({ currentStep, theme, hasAchievements }) => {
  const steps = hasAchievements 
    ? ['celebration', 'xp-reveal', 'achievements', 'summary']
    : ['celebration', 'xp-reveal', 'summary'];
  
  return (
    <View style={styles.dotsContainer}>
      {steps.map((step, index) => {
        const isActive = step === currentStep;
        const isCompleted = steps.indexOf(currentStep) > index;
        
        return (
          <View
            key={step}
            style={[
              styles.dot,
              {
                backgroundColor: isActive || isCompleted 
                  ? theme.accent 
                  : theme.textSecondary + '40'
              }
            ]}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 0,
  },
  skipContainer: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  skipText: {
    fontSize: 16,
    opacity: 0.7,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,  // Remove horizontal padding for full width
  },
  stepContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    paddingBottom: 30,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tapIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    opacity: 0.7,
  },
  tapIndicatorText: {
    fontSize: 12,
    marginLeft: 6,
  },
});

export default RoutineCompletionFlow; 