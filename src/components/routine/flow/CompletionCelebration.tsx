import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';

const { width } = Dimensions.get('window');

interface CompletionCelebrationProps {
  onComplete: () => void;
}

export const CompletionCelebration: React.FC<CompletionCelebrationProps> = ({
  onComplete
}) => {
  const { theme } = useTheme();
  
  // Animation values
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const checkmarkRotate = useRef(new Animated.Value(0)).current;
  const textFadeIn = useRef(new Animated.Value(0)).current;
  const particleAnimations = useRef(
    Array.from({ length: 8 }, () => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    // Start the celebration sequence
    startCelebrationSequence();
  }, []);

  const startCelebrationSequence = () => {
    // Step 1: Checkmark bounce in with rotation and better easing
    Animated.sequence([
      Animated.parallel([
        Animated.spring(checkmarkScale, {
          toValue: 1.3,      // Slightly bigger for more impact
          tension: 80,       // More dramatic spring
          friction: 4,       // Less friction for bouncier feel
          useNativeDriver: true,
        }),
        Animated.timing(checkmarkRotate, {
          toValue: 1,
          duration: 500,     // Slightly longer rotation
          useNativeDriver: true,
        })
      ]),
      // Settle to normal size with smoother easing
      Animated.spring(checkmarkScale, {
        toValue: 1,
        tension: 120,      // Adjusted for smoother settle
        friction: 8,
        useNativeDriver: true,
      })
    ]).start();

    // Step 2: Text fade in after checkmark settles with better timing
    setTimeout(() => {
      Animated.timing(textFadeIn, {
        toValue: 1,
        duration: 400,     // Slightly longer fade
        useNativeDriver: true,
      }).start();
    }, 700);             // More delay for better sequencing

    // Step 3: Particle burst animation with better timing
    setTimeout(() => {
      startParticleBurst();
    }, 500);             // Slightly later for better coordination

    // Complete after total animation time with adjusted duration
    setTimeout(() => {
      onComplete();
    }, 1600);            // Increased from 1200 for better pacing
  };

  const startParticleBurst = () => {
    const particleAnimationPromises = particleAnimations.map((particle, index) => {
      // Calculate burst direction (radial)
      const angle = (index / particleAnimations.length) * Math.PI * 2;
      const distance = 120 + Math.random() * 80; // Much larger spread for full screen
      const endX = Math.cos(angle) * distance;
      const endY = Math.sin(angle) * distance;

      return Animated.parallel([
        Animated.timing(particle.translateX, {
          toValue: endX,
          duration: 1000,   // Longer animation for more elegance
          useNativeDriver: true,
        }),
        Animated.timing(particle.translateY, {
          toValue: endY,
          duration: 1000,   // Longer animation
          useNativeDriver: true,
        }),
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: 1000,   // Longer fade out
          useNativeDriver: true,
        }),
        Animated.timing(particle.scale, {
          toValue: 0.2,     // Smaller end scale for smoother disappear
          duration: 1000,   // Longer scaling
          useNativeDriver: true,
        })
      ]);
    });

    Animated.parallel(particleAnimationPromises).start();
  };

  return (
    <View style={styles.container}>
      {/* Particle burst elements */}
      {particleAnimations.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              transform: [
                { translateX: particle.translateX },
                { translateY: particle.translateY },
                { scale: particle.scale }
              ],
              opacity: particle.opacity,
            }
          ]}
        >
          <Ionicons 
            name={index % 2 === 0 ? "star" : "sparkles"} 
            size={16} 
            color={theme.accent} 
          />
        </Animated.View>
      ))}

      {/* Main checkmark */}
      <Animated.View
        style={[
          styles.checkmarkContainer,
          {
            transform: [
              { scale: checkmarkScale },
              { 
                rotate: checkmarkRotate.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '360deg']
                })
              }
            ]
          }
        ]}
      >
        <View style={[styles.checkmarkBg, { backgroundColor: theme.success + '20' }]}>
          <Ionicons name="checkmark-circle" size={100} color={theme.success} />
        </View>
      </Animated.View>

      {/* Celebration text */}
      <Animated.View style={[styles.textContainer, { opacity: textFadeIn }]}>
        <Text style={[styles.celebrationText, { color: theme.text }]}>
          Routine Complete!
        </Text>
        <Text style={[styles.celebrationSubtext, { color: theme.textSecondary }]}>
          Great job! 🎉
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    width: width,
    height: 400,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  particle: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -8,  // Half of icon size (16/2) to center properly
    marginTop: -8,   // Half of icon size (16/2) to center properly
    zIndex: 10,
  },
  checkmarkContainer: {
    marginBottom: 30,
  },
  checkmarkBg: {
    borderRadius: 60,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  celebrationText: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  celebrationSubtext: {
    fontSize: 18,
    textAlign: 'center',
  },
}); 