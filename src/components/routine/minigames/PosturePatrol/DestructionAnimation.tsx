import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface DestructionAnimationProps {
  x: number;
  y: number;
  score: number;
  onComplete: () => void;
  isCorrect: boolean;
}

export const DestructionAnimation: React.FC<DestructionAnimationProps> = ({
  x,
  y,
  score,
  onComplete,
  isCorrect,
}) => {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef(
    Array.from({ length: 6 }, () => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(1),
      scale: new Animated.Value(1),
    }))
  ).current;

  useEffect(() => {
    // Start all animations simultaneously
    const animations = [
      // Main explosion scale and fade
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.5,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      
      // Score popup
      Animated.sequence([
        Animated.delay(100),
        Animated.timing(scoreAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(scoreAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
      
      // Particle explosion
      ...particleAnims.map((particle, index) => {
        const angle = (index * 360) / particleAnims.length;
        const distance = 40;
        const endX = Math.cos((angle * Math.PI) / 180) * distance;
        const endY = Math.sin((angle * Math.PI) / 180) * distance;
        
        return Animated.parallel([
          Animated.timing(particle.x, {
            toValue: endX,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(particle.y, {
            toValue: endY,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(200),
            Animated.timing(particle.opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(particle.scale, {
              toValue: 1.5,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(particle.scale, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]),
        ]);
      }),
    ];

    Animated.parallel(animations).start(() => {
      onComplete();
    });
  }, []);

  return (
    <View style={[styles.container, { left: x - 50, top: y - 50 }]}>
      {/* Central explosion effect */}
      <Animated.View
        style={[
          styles.explosion,
          {
            transform: [{ scale: scaleAnim }],
            opacity: fadeAnim,
          },
        ]}
      >
        {isCorrect ? (
          // Victory explosion with stars
          <>
            <Ionicons name="star" size={40} color="#FFD700" />
            <Ionicons name="flash" size={30} color="#FFA500" style={styles.overlayIcon} />
          </>
        ) : (
          // Miss animation with warning
          <Ionicons name="warning" size={50} color="#FF4444" />
        )}
      </Animated.View>

      {/* Score popup */}
      <Animated.View
        style={[
          styles.scorePopup,
          {
            opacity: scoreAnim,
            transform: [
              { 
                translateY: scoreAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -30],
                }) 
              },
              { scale: scoreAnim },
            ],
          },
        ]}
      >
        <Text style={[styles.scoreText, { color: isCorrect ? "#4CAF50" : "#FF4444" }]}>
          {isCorrect ? `+${score}` : "Miss!"}
        </Text>
      </Animated.View>

      {/* Particles */}
      {particleAnims.map((particle, index) => (
        <Animated.View
          key={index}
          style={[
            styles.particle,
            {
              opacity: particle.opacity,
              transform: [
                { translateX: particle.x },
                { translateY: particle.y },
                { scale: particle.scale },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.particleDot,
              { backgroundColor: isCorrect ? "#4CAF50" : "#FF4444" },
            ]}
          />
        </Animated.View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  explosion: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayIcon: {
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
  },
  scorePopup: {
    position: 'absolute',
    top: -20,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  particle: {
    position: 'absolute',
  },
  particleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});