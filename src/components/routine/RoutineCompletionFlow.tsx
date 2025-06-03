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
import { playCompletionSound, playLevelUpSound } from '../../utils/soundEffects';
import ActionButtons from './tabs/ActionButtons';

// Import new micro-interaction components
import { CompletionCelebration } from './flow/CompletionCelebration';
import { XPRevealCard } from './flow/XPRevealCard';
import { AchievementMoments } from './flow/AchievementMoments';
import { SummaryTransition } from './flow/SummaryTransition';
import TryPremiumBanner from '../TryPremiumBanner';

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

  // Animation values for step transitions
  const stepOpacity = useRef(new Animated.Value(1)).current;
  const stepTranslateY = useRef(new Animated.Value(0)).current;

  // Calculate derived data (reusing existing logic)
  const hasXpBoost = isXpBoosted || xpBreakdown.some(item => item.source?.includes('boost'));
  const showLevelUp = levelUp && (levelUp.oldLevel !== levelUp.newLevel);
  const routineLength = savedStretches.length;
  const hasAchievements = unlockedAchievements.length > 0 || showLevelUp;


  // Play completion sound immediately when component mounts
  useEffect(() => {
    playCompletionSound();
  }, []);

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

  const transitionToNextStep = () => {
    Animated.parallel([
      Animated.timing(stepOpacity, {
        toValue: 0,
        duration: 400,     // Increased from 300 for more deliberate transitions
        useNativeDriver: true,
      }),
      Animated.timing(stepTranslateY, {
        toValue: -30,      
        duration: 400,     // Match opacity timing
        useNativeDriver: true,
      })
    ]).start(() => {
      // Move to next step
      const stepOrder: FlowStep[] = ['celebration', 'xp-reveal', 'achievements', 'summary'];
      const currentIndex = stepOrder.indexOf(currentStep);
      const nextStep = stepOrder[currentIndex + 1];
      
      if (nextStep) {
        setCurrentStep(nextStep);
        
        // Play level up sound when transitioning to achievements step
        if (nextStep === 'achievements' && showLevelUp) {
          playLevelUpSound();
        }
        
        // Reset animation values and animate in with better entrance
        stepTranslateY.setValue(40);  
        stepOpacity.setValue(0);
        
        // Longer delay for more deliberate pacing
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(stepOpacity, {
              toValue: 1,
              duration: 500,     // Increased from 400 for smoother entrance
              useNativeDriver: true,
            }),
            Animated.spring(stepTranslateY, {  
              toValue: 0,
              tension: 70,      // Slower spring for more elegance
              friction: 8,
              useNativeDriver: true,
            })
          ]).start();
        }, 150);              // Increased pause from 100ms
      }
    });
  };

  const skipToEnd = () => {
    setCurrentStep('summary');
    setIsFlowComplete(true);
    stepOpacity.setValue(1);
    stepTranslateY.setValue(0);
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
              xpEarned={xpEarned}
              hasXpBoost={hasXpBoost}
              theme={theme}
              onTransitionComplete={() => {
                setIsFlowComplete(true);
              }}
            />
            
            {/* Try Premium Banner - integrated into flow */}
            <TryPremiumBanner 
              context="completion"
              onPress={onOpenSubscription}
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