import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as haptics from '../../../utils/haptics';
import { useTheme } from '../../../context/ThemeContext';

const { width } = Dimensions.get('window');

// Import existing level up component to reuse
import LevelUpDisplay from '../tabs/LevelUpDisplay';

interface AchievementMomentsProps {
  levelUp?: any;
  unlockedAchievements: any[];
  showLevelUp: boolean;
  isDark: boolean;
  isSunset: boolean;
  onMomentsComplete: () => void;
}

export const AchievementMoments: React.FC<AchievementMomentsProps> = ({
  levelUp,
  unlockedAchievements,
  showLevelUp,
  isDark,
  isSunset,
  onMomentsComplete
}) => {
  const { theme } = useTheme();
  
  // Animation values
  const containerFadeIn = useRef(new Animated.Value(0)).current;
  const achievementSlideIn = useRef(new Animated.Value(100)).current;
  const levelUpScale = useRef(new Animated.Value(0.7)).current;  // Start smaller for bigger impact
  const confettiOpacity = useRef(new Animated.Value(0)).current;
  
  // Confetti particles
  const confettiAnimations = useRef(
    Array.from({ length: 12 }, () => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      rotate: new Animated.Value(0),
      opacity: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    startAchievementSequence();
  }, []);

  const startAchievementSequence = () => {
    // Step 1: Container fades in
    Animated.timing(containerFadeIn, {
      toValue: 1,
      duration: 400,  // Slightly longer for smoother feel
      useNativeDriver: true,
    }).start();

    // Step 2: Show level up if applicable
    if (showLevelUp) {
      setTimeout(() => {
        startLevelUpCelebration();
      }, 300);  // Slightly longer delay
    }

    // Step 3: Show achievements
    if (unlockedAchievements.length > 0) {
      setTimeout(() => {
        startAchievementReveal();
      }, showLevelUp ? 2000 : 500);  // More breathing room
    }

    // Complete after all animations
    const totalDuration = showLevelUp ? 3800 : 2200;  // Adjusted for new timing
    setTimeout(() => {
      onMomentsComplete();
    }, totalDuration);
  };

  const startLevelUpCelebration = () => {
    // Strong haptic for level up
    haptics.heavy();
    
    // Level up scale animation - bigger impact
    Animated.sequence([
      Animated.spring(levelUpScale, {
        toValue: 1.15,  // Bigger scale for more impact
        tension: 80,    // Slower, more dramatic
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.spring(levelUpScale, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();

    // Start confetti celebration
    setTimeout(() => {
      startConfettiCelebration();
    }, 600);  // Slightly longer delay
  };

  const startConfettiCelebration = () => {
    // Show confetti
    Animated.timing(confettiOpacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();

    // Animate confetti particles
    const confettiPromises = confettiAnimations.map((particle, index) => {
      // Random starting position at top
      const startX = (Math.random() - 0.5) * 300;
      const endX = startX + (Math.random() - 0.5) * 200;
      const endY = 400 + Math.random() * 200;
      const rotations = 2 + Math.random() * 3;

      return Animated.parallel([
        Animated.timing(particle.translateX, {
          toValue: endX,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(particle.translateY, {
          toValue: endY,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(particle.rotate, {
          toValue: rotations,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        })
      ]);
    });

    Animated.parallel(confettiPromises).start();
  };

  const startAchievementReveal = () => {
    haptics.medium();
    
    Animated.spring(achievementSlideIn, {
      toValue: 0,
      tension: 90,   // Slightly slower for smoother feel
      friction: 8,
      useNativeDriver: true,
    }).start();
  };

  const getAchievementIcon = (achievement: any) => {
    // Map achievement types to icons
    const iconMap: { [key: string]: string } = {
      streak: 'flame',
      routine: 'fitness',
      consistency: 'calendar',
      milestone: 'trophy',
      default: 'star'
    };
    
    return iconMap[achievement.type] || iconMap.default;
  };

  // Theme-aware achievement colors
  const getAchievementColors = () => {
    if (isDark || isSunset) {
      return {
        containerBg: 'rgba(255, 215, 0, 0.15)',
        containerBorder: 'rgba(255, 215, 0, 0.4)',
        titleColor: '#FFD700',
        cardBg: 'rgba(255, 255, 255, 0.15)',
        iconBg: 'rgba(255, 215, 0, 0.25)',
        nameColor: '#FFFFFF',
        descColor: 'rgba(255, 255, 255, 0.85)',
        moreColor: 'rgba(255, 215, 0, 0.8)'
      };
    } else {
      // Light mode - stronger colors for better contrast
      return {
        containerBg: 'rgba(255, 193, 7, 0.1)',
        containerBorder: 'rgba(255, 152, 0, 0.3)',
        titleColor: '#FF8F00',  // Darker orange for better contrast
        cardBg: 'rgba(255, 152, 0, 0.08)',
        iconBg: 'rgba(255, 152, 0, 0.15)',
        nameColor: '#E65100',   // Dark orange
        descColor: 'rgba(69, 90, 100, 0.8)',  // Dark gray
        moreColor: 'rgba(255, 152, 0, 0.8)'
      };
    }
  };

  const achievementColors = getAchievementColors();

  return (
    <Animated.View 
      style={[
        styles.container, 
        { opacity: containerFadeIn }
      ]}
    >
      {/* Confetti particles for level up */}
      {showLevelUp && (
        <Animated.View style={[styles.confettiContainer, { opacity: confettiOpacity }]}>
          {confettiAnimations.map((particle, index) => (
            <Animated.View
              key={index}
              style={[
                styles.confettiParticle,
                {
                  left: '50%',
                  top: 0,
                  transform: [
                    { translateX: particle.translateX },
                    { translateY: particle.translateY },
                    { 
                      rotate: particle.rotate.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      })
                    }
                  ],
                  opacity: particle.opacity,
                }
              ]}
            >
              <View style={[
                styles.confettiPiece,
                { backgroundColor: index % 3 === 0 ? '#FFD700' : index % 3 === 1 ? '#FF6B6B' : '#4ECDC4' }
              ]} />
            </Animated.View>
          ))}
        </Animated.View>
      )}

      {/* Level Up Display - reuse existing component with bigger scale */}
      {showLevelUp && levelUp && (
        <Animated.View style={[
          styles.levelUpContainer,
          { transform: [{ scale: levelUpScale }] }
        ]}>
          <LevelUpDisplay
            oldLevel={levelUp.oldLevel}
            newLevel={levelUp.newLevel}
            isDark={isDark}
            isSunset={isSunset}
            isSimulated={false}
            rewards={levelUp.rewards || []}
            animValues={{
              levelUpAnim: new Animated.Value(1),
              levelUpScale: new Animated.Value(1)
            }}
          />
        </Animated.View>
      )}

      {/* Achievement Reveals - improved contrast */}
      {unlockedAchievements.length > 0 && (
        <Animated.View style={[
          styles.achievementsContainer,
          { 
            transform: [{ translateY: achievementSlideIn }],
            backgroundColor: achievementColors.containerBg,
            borderColor: achievementColors.containerBorder,
          }
        ]}>
          <View style={styles.achievementsHeader}>
            <Ionicons name="trophy" size={24} color={achievementColors.titleColor} />
            <Text style={[styles.achievementsTitle, { color: achievementColors.titleColor }]}>
              New Achievement{unlockedAchievements.length > 1 ? 's' : ''}!
            </Text>
          </View>

          {unlockedAchievements.slice(0, 3).map((achievement, index) => (
            <View key={index} style={[styles.achievementCard, { backgroundColor: achievementColors.cardBg }]}>
              <View style={[styles.achievementIcon, { backgroundColor: achievementColors.iconBg }]}>
                <Ionicons 
                  name={getAchievementIcon(achievement) as any}
                  size={20} 
                  color={achievementColors.titleColor} 
                />
              </View>
              <View style={styles.achievementInfo}>
                <Text style={[styles.achievementName, { color: achievementColors.nameColor }]}>
                  {achievement.name || achievement.title}
                </Text>
                <Text style={[styles.achievementDescription, { color: achievementColors.descColor }]}>
                  {achievement.description}
                </Text>
              </View>
            </View>
          ))}

          {unlockedAchievements.length > 3 && (
            <Text style={[styles.moreAchievements, { color: achievementColors.moreColor }]}>
              +{unlockedAchievements.length - 3} more achievement{unlockedAchievements.length - 3 > 1 ? 's' : ''}
            </Text>
          )}
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width,
    minHeight: 400,  
    position: 'relative',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  confettiParticle: {
    position: 'absolute',
  },
  confettiPiece: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  levelUpContainer: {
    marginBottom: 24,  
    width: width,     // Full screen width for maximum presence
    paddingHorizontal: 0,  // No padding for maximum use of space
  },
  achievementsContainer: {
    width: width - 32,           // Full width minus some margin
    maxWidth: 600,               // Max width for larger screens
    borderRadius: 24,    
    padding: 32,             // Increased padding for more generous spacing
    borderWidth: 2,      
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 8 },    // Stronger shadow
    shadowOpacity: 0.25,      // More visible shadow
    shadowRadius: 20,        // Larger shadow radius
    elevation: 15,           // Higher elevation for more prominence
  },
  achievementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,        // Increased from 20 for more breathing room
  },
  achievementsTitle: {
    fontSize: 24,            // Increased from 22 for more prominence
    fontWeight: 'bold',
    marginLeft: 8,
  },
  achievementCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,        // Larger radius from 14
    padding: 20,             // Increased padding from 16
    marginBottom: 16,        // Increased spacing from 12
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 3 },     // Stronger shadow
    shadowOpacity: 0.15,     // More visible
    shadowRadius: 6,         // Larger radius
    elevation: 4,
  },
  achievementIcon: {
    width: 48,               // Larger from 44
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 20,         // More space from 16
  },
  achievementInfo: {
    flex: 1,
  },
  achievementName: {
    fontSize: 18,            // Increased from 17
    fontWeight: '600',
    marginBottom: 6,         // More space from 4
  },
  achievementDescription: {
    fontSize: 14,            // Increased from 13
    lineHeight: 20,          // Better line height from 18
  },
  moreAchievements: {
    textAlign: 'center',
    fontSize: 16,            // Increased from 15
    fontStyle: 'italic',
    marginTop: 16,           // More space from 12
  },
}); 