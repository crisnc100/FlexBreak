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

const { width } = Dimensions.get('window');

// Import existing XP components to reuse
import XpBreakdown from '../tabs/XpBreakdown';

interface XPRevealCardProps {
  xpEarned: number;
  xpBreakdown: any[];
  hasXpBoost: boolean;
  theme: any;
  isDark: boolean;
  isSunset: boolean;
  onRevealComplete: () => void;
}

export const XPRevealCard: React.FC<XPRevealCardProps> = ({
  xpEarned,
  xpBreakdown,
  hasXpBoost,
  theme,
  isDark,
  isSunset,
  onRevealComplete
}) => {
  // Animation values
  const cardSlideIn = useRef(new Animated.Value(50)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const xpCountValue = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0.5)).current;
  const orbsOpacity = useRef(new Animated.Value(0)).current;
  
  // Double boost specific animations
  const doubleBoostBadgeScale = useRef(new Animated.Value(0)).current;
  const doubleBoostBadgeRotate = useRef(new Animated.Value(0)).current;
  const shimmerTranslate = useRef(new Animated.Value(-100)).current;
  const lightningBoltsOpacity = useRef(new Animated.Value(0)).current;

  // XP orb animations
  const xpOrbAnimations = useRef(
    Array.from({ length: 5 }, () => ({
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.5),
    }))
  ).current;

  // Lightning bolt animations for double boost
  const lightningBoltAnimations = useRef(
    Array.from({ length: 6 }, () => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0.8),
      rotate: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    startXPRevealSequence();
  }, []);

  const startXPRevealSequence = () => {
    // Step 1: Card slides in with better easing
    Animated.parallel([
      Animated.timing(cardSlideIn, {
        toValue: 0,
        duration: 500,       // Slightly longer
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 500,       // Match the slide timing
        useNativeDriver: true,
      })
    ]).start();

    // Step 2: Start XP counting after card settles with more delay
    setTimeout(() => {
      startXPCounting();
    }, 400);              // Longer delay for more impact

    // Step 3: Show floating XP orbs slightly later
    setTimeout(() => {
      startXPOrbAnimation();
    }, 700);              // More staggered timing

    // Step 4: Start double boost effects if boost is active
    if (hasXpBoost) {
      setTimeout(() => {
        startDoubleBoostEffects();
      }, 300);
    }

    // Complete after animations with longer duration
    setTimeout(() => {
      onRevealComplete();
    }, 2600);             // Increased from 2000 for better pacing
  };

  const startXPCounting = () => {
    // Haptic feedback during counting with adjusted timing
    const hapticInterval = setInterval(() => {
      haptics.light();
    }, 200);              // Slightly slower haptic rhythm

    // Stop haptics when counting completes
    setTimeout(() => {
      clearInterval(hapticInterval);
      haptics.medium(); // Final haptic when counting completes
    }, 1500);             // Longer counting duration

    // Animated XP counter with smoother easing
    Animated.timing(xpCountValue, {
      toValue: xpEarned,
      duration: 1500,      // Longer counting duration
      useNativeDriver: false,
    }).start();

    // Glow pulse for boost effect with better timing
    if (hasXpBoost) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, {
            toValue: 1,
            duration: 800,    // Slower pulse for more elegance
            useNativeDriver: true,
          }),
          Animated.timing(glowPulse, {
            toValue: 0.5,
            duration: 800,
            useNativeDriver: true,
          })
        ])
      ).start();
    }
  };

  const startXPOrbAnimation = () => {
    // Show orbs container
    Animated.timing(orbsOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Animate each orb floating upward
    const orbAnimationPromises = xpOrbAnimations.map((orb, index) => {
      return new Promise(resolve => {
        setTimeout(() => {
          Animated.parallel([
            Animated.timing(orb.opacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(orb.scale, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(orb.translateY, {
              toValue: -60 - (index * 10),
              duration: 1000,
              useNativeDriver: true,
            })
          ]).start(() => {
            // Fade out at the end
            Animated.timing(orb.opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start(resolve);
          });
        }, index * 100); // Stagger orb animations
      });
    });

    Promise.all(orbAnimationPromises);
  };

  const startDoubleBoostEffects = () => {
    // 1. Double boost badge animation
    Animated.sequence([
      Animated.parallel([
        Animated.spring(doubleBoostBadgeScale, {
          toValue: 1.1,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(doubleBoostBadgeRotate, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        })
      ]),
      Animated.spring(doubleBoostBadgeScale, {
        toValue: 1,
        tension: 150,
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();

    // 2. Shimmer effect across the card
    shimmerTranslate.setValue(-100); // Reset position
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerTranslate, {
          toValue: 100,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerTranslate, {
          toValue: -100,
          duration: 0,
          useNativeDriver: true,
        })
      ])
    ).start();

    // 3. Lightning bolt animations
    setTimeout(() => {
      startLightningBoltsAnimation();
    }, 200);
  };

  const startLightningBoltsAnimation = () => {
    // Show lightning bolts container
    Animated.timing(lightningBoltsOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Animate each lightning bolt
    lightningBoltAnimations.forEach((bolt, index) => {
      const angle = (index / lightningBoltAnimations.length) * Math.PI * 2;
      const distance = 60 + Math.random() * 40;
      const endX = Math.cos(angle) * distance;
      const endY = Math.sin(angle) * distance;

      setTimeout(() => {
        Animated.parallel([
          Animated.timing(bolt.opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(bolt.scale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(bolt.translateX, {
            toValue: endX,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(bolt.translateY, {
            toValue: endY,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(bolt.rotate, {
            toValue: Math.random() > 0.5 ? 1 : -1,
            duration: 800,
            useNativeDriver: true,
          })
        ]).start(() => {
          // Fade out
          Animated.timing(bolt.opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();
        });
      }, index * 150); // Stagger the bolt animations
    });
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: cardOpacity,
          transform: [{ translateY: cardSlideIn }]
        }
      ]}
    >
      {/* Floating XP orbs */}
      <Animated.View style={[styles.orbsContainer, { opacity: orbsOpacity }]}>
        {xpOrbAnimations.map((orb, index) => (
          <Animated.View
            key={index}
            style={[
              styles.xpOrb,
              {
                left: `${20 + (index * 15)}%`,
                opacity: orb.opacity,
                transform: [
                  { translateY: orb.translateY },
                  { scale: orb.scale }
                ]
              }
            ]}
          >
            <Ionicons name="star" size={12} color={theme.accent} />
          </Animated.View>
        ))}
      </Animated.View>

      {/* Lightning bolts for double boost */}
      {hasXpBoost && (
        <Animated.View style={[styles.lightningContainer, { opacity: lightningBoltsOpacity }]}>
          {lightningBoltAnimations.map((bolt, index) => (
            <Animated.View
              key={index}
              style={[
                styles.lightningBolt,
                {
                  opacity: bolt.opacity,
                  transform: [
                    { translateX: bolt.translateX },
                    { translateY: bolt.translateY },
                    { scale: bolt.scale },
                    { 
                      rotate: bolt.rotate.interpolate({
                        inputRange: [-1, 1],
                        outputRange: ['-15deg', '15deg']
                      })
                    }
                  ]
                }
              ]}
            >
              <Ionicons name="flash" size={16} color={theme.accent} />
            </Animated.View>
          ))}
        </Animated.View>
      )}

      {/* Main XP display card */}
      <View style={[styles.xpCard, { backgroundColor: theme.cardBackground }]}>
        {hasXpBoost && (
          <>
            <Animated.View 
              style={[
                styles.boostGlow,
                { 
                  backgroundColor: theme.accent + '30',
                  opacity: glowPulse 
                }
              ]} 
            />
            {/* Shimmer effect for double boost */}
            <Animated.View 
              style={[
                styles.shimmerEffect,
                { 
                  transform: [{ translateX: shimmerTranslate }]
                }
              ]} 
            />
          </>
        )}

        {/* Double boost badge */}
        {hasXpBoost && (
          <Animated.View 
            style={[
              styles.doubleBoostBadge,
              { 
                backgroundColor: theme.accent,
                transform: [
                  { scale: doubleBoostBadgeScale },
                  { 
                    rotate: doubleBoostBadgeRotate.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }
                ]
              }
            ]}
          >
            <Text style={[styles.doubleBoostBadgeText, { color: theme.background }]}>
              2X
            </Text>
          </Animated.View>
        )}

        <View style={styles.xpHeader}>
          <Ionicons name="flash" size={24} color={theme.accent} />
          <Text style={[styles.xpLabel, { color: theme.text }]}>
            XP Earned
          </Text>
        </View>

        {/* Animated XP counter */}
        <View style={styles.xpCountContainer}>
          <Animated.Text 
            style={[
              styles.xpCount, 
              { 
                color: hasXpBoost ? theme.accent : theme.text,
                textShadowColor: hasXpBoost ? theme.accent + '40' : 'transparent'
              }
            ]}
          >
            {xpCountValue.interpolate({
              inputRange: [0, xpEarned || 1],
              outputRange: ['0', (xpEarned || 0).toString()],
              extrapolate: 'clamp'
            })}
          </Animated.Text>
          <Text style={[styles.xpSuffix, { color: hasXpBoost ? theme.accent : theme.textSecondary }]}>
            XP {hasXpBoost ? '⚡' : ''}
          </Text>
        </View>

        {/* Boost indicator */}
        {hasXpBoost && (
          <View style={styles.boostIndicator}>
            <Ionicons name="flash" size={16} color={theme.accent} />
            <Text style={[styles.boostText, { color: theme.accent }]}>
              ⚡ DOUBLE XP BOOST! ⚡
            </Text>
          </View>
        )}

        {/* XP Breakdown - reuse existing component */}
        {xpBreakdown.length > 0 && (
          <View style={styles.breakdownContainer}>
            <XpBreakdown
              xpBreakdown={xpBreakdown}
              unlockedAchievements={[]}
              hasXpBoost={hasXpBoost}
              showAnyLevelUp={false}
              theme={theme}
              isDark={isDark}
              isSunset={isSunset}
              animValues={{ shineAnim: new Animated.Value(0) }}
            />
          </View>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width,
    paddingHorizontal: 0,      // No padding for full width
    position: 'relative',
  },
  orbsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  xpOrb: {
    position: 'absolute',
    bottom: 100,
  },
  xpCard: {
    width: width - 32,         // Full width minus margin
    maxWidth: 600,             // Max width for larger screens
    borderRadius: 28,           // Larger radius
    padding: 36,               // Increased padding
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },    // Stronger shadow
    shadowOpacity: 0.2,       // More visible shadow
    shadowRadius: 20,          // Larger shadow radius
    elevation: 12,              // Higher elevation
    position: 'relative',
    overflow: 'hidden',
  },
  boostGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,          // Match card radius
  },
  xpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,          // Increased from 16
  },
  xpLabel: {
    fontSize: 20,              // Increased from 18
    fontWeight: '600',
    marginLeft: 8,
  },
  xpCountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 16,          // Increased from 12
  },
  xpCount: {
    fontSize: 52,              // Increased from 48 for more impact
    fontWeight: 'bold',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  xpSuffix: {
    fontSize: 20,              // Increased from 18
    fontWeight: '600',
    marginLeft: 8,
  },
  boostIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,          // Increased from 16
  },
  boostText: {
    fontSize: 15,              // Increased from 14
    fontWeight: '600',
    marginLeft: 4,
  },
  breakdownContainer: {
    width: '100%',
    marginTop: 20,             // Increased from 16
  },
  lightningContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightningBolt: {
    position: 'absolute',
  },
  shimmerEffect: {
    position: 'absolute',
    top: 0,
    left: -50,
    width: 100,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
    borderRadius: 28,
  },
  doubleBoostBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  doubleBoostBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
}); 