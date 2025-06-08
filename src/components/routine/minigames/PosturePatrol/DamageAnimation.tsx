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

interface DamageAnimationProps {
  x: number;
  y: number;
  onComplete: () => void;
  monsterType: string;
}

export const DamageAnimation: React.FC<DamageAnimationProps> = ({
  x,
  y,
  onComplete,
  monsterType,
}) => {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Damage shake animation
    const shakeAnimation = Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]);

    // Scale pulse for impact
    const scaleAnimation = Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]);

    // Fade out
    const fadeAnimation = Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    });

    Animated.parallel([
      shakeAnimation,
      scaleAnimation,
    ]).start(() => {
      fadeAnimation.start(() => {
        onComplete();
      });
    });
  }, []);

  const getDamageMessage = (type: string) => {
    switch (type) {
      case 'tech_neck':
        return 'Neck strain worsens!';
      case 'desk_hunch':
        return 'Shoulders hunching!';
      case 'slouch_slump':
        return 'Back pain increases!';
      case 'lean_twist':
        return 'Spine misalignment!';
      default:
        return 'Posture damaged!';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: x - 75,
          top: y - 40,
          opacity: fadeAnim,
          transform: [
            { translateX: shakeAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      {/* Damage icon */}
      <View style={styles.iconContainer}>
        <Ionicons name="skull" size={30} color="#FF4444" />
        <Ionicons name="flash" size={20} color="#FF6B6B" style={styles.flashIcon} />
      </View>

      {/* Damage message */}
      <Text style={styles.damageText}>
        {getDamageMessage(monsterType)}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 150,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
    backgroundColor: 'rgba(255, 68, 68, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  flashIcon: {
    position: 'absolute',
    top: -5,
    right: -8,
  },
  damageText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});