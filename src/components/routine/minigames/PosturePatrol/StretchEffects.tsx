import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../../../../context/ThemeContext';

const { width, height } = Dimensions.get('window');

interface StretchEffect {
  id: string;
  type: 'neck_relief_pad' | 'hip_hop_platform' | 'chest_quest_pad' | 'armory_arc';
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  onComplete: () => void;
}

interface StretchEffectsProps {
  effects: StretchEffect[];
}

export const StretchEffects: React.FC<StretchEffectsProps> = ({ effects }) => {
  const { theme } = useTheme();

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {effects.map(effect => (
        <StretchEffectAnimation
          key={effect.id}
          effect={effect}
          theme={theme}
        />
      ))}
    </View>
  );
};

interface StretchEffectAnimationProps {
  effect: StretchEffect;
  theme: any;
}

const StretchEffectAnimation: React.FC<StretchEffectAnimationProps> = ({ effect, theme }) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start the effect animation
    const animation = Animated.sequence([
      // Initial pulse at source
      Animated.timing(pulseValue, {
        toValue: 1.5,
        duration: 200,
        useNativeDriver: true,
      }),
      // Move towards target
      Animated.parallel([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: getEffectDuration(effect.type),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        effect.onComplete();
      }
    });

    return () => animation.stop();
  }, []);

  const interpolatedX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [effect.fromX, effect.toX],
  });

  const interpolatedY = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [effect.fromY, effect.toY],
  });

  const getEffectStyle = () => {
    switch (effect.type) {
      case 'neck_relief_pad':
        return {
          backgroundColor: '#FF6B6B',
          width: 8,
          height: 8,
          borderRadius: 4,
          shadowColor: '#FF6B6B',
          shadowOpacity: 0.8,
          shadowRadius: 8,
          elevation: 5,
        };
      case 'hip_hop_platform':
        return {
          backgroundColor: '#96CEB4',
          width: 12,
          height: 12,
          borderRadius: 6,
          shadowColor: '#96CEB4',
          shadowOpacity: 0.6,
          shadowRadius: 12,
          elevation: 5,
        };
      case 'chest_quest_pad':
        return {
          backgroundColor: '#4ECDC4',
          width: 6,
          height: 20,
          borderRadius: 3,
          shadowColor: '#4ECDC4',
          shadowOpacity: 0.7,
          shadowRadius: 10,
          elevation: 5,
        };
      case 'armory_arc':
        return {
          backgroundColor: '#9B59B6',
          width: 4,
          height: 40,
          borderRadius: 2,
          shadowColor: '#9B59B6',
          shadowOpacity: 0.9,
          shadowRadius: 15,
          elevation: 8,
        };
      default:
        return {
          backgroundColor: theme.accent,
          width: 8,
          height: 8,
          borderRadius: 4,
        };
    }
  };

  return (
    <>
      {/* Source pulse effect */}
      <Animated.View
        style={[
          styles.sourcePulse,
          {
            left: effect.fromX - 15,
            top: effect.fromY - 15,
            backgroundColor: getEffectColor(effect.type) + '40',
            transform: [{ scale: pulseValue }],
          }
        ]}
      />
      
      {/* Moving projectile */}
      <Animated.View
        style={[
          styles.projectile,
          getEffectStyle(),
          {
            transform: [
              { translateX: interpolatedX },
              { translateY: interpolatedY },
            ],
          },
        ]}
      />
      
      {/* Trail effect for some types */}
      {(effect.type === 'armory_arc' || effect.type === 'chest_quest_pad') && (
        <Animated.View
          style={[
            styles.trail,
            {
              backgroundColor: getEffectColor(effect.type) + '30',
              left: effect.fromX - 2,
              top: effect.fromY - 2,
              width: 4,
              height: Math.sqrt(
                Math.pow(effect.toX - effect.fromX, 2) + 
                Math.pow(effect.toY - effect.fromY, 2)
              ),
              transform: [
                { 
                  rotate: `${Math.atan2(
                    effect.toY - effect.fromY, 
                    effect.toX - effect.fromX
                  ) * (180 / Math.PI)}deg` 
                },
                { scaleX: animatedValue },
              ],
              transformOrigin: 'left center',
            },
          ]}
        />
      )}
    </>
  );
};

const getEffectColor = (type: string): string => {
  switch (type) {
    case 'neck_relief_pad': return '#FF6B6B';
    case 'hip_hop_platform': return '#96CEB4';
    case 'chest_quest_pad': return '#4ECDC4';
    case 'armory_arc': return '#9B59B6';
    default: return '#FFD700';
  }
};

const getEffectDuration = (type: string): number => {
  switch (type) {
    case 'neck_relief_pad': return 300; // Fast, precise
    case 'hip_hop_platform': return 600; // Slower, powerful
    case 'chest_quest_pad': return 400; // Medium speed
    case 'armory_arc': return 200; // Very fast beam
    default: return 400;
  }
};

const styles = StyleSheet.create({
  sourcePulse: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    opacity: 0.8,
  },
  projectile: {
    position: 'absolute',
  },
  trail: {
    position: 'absolute',
    opacity: 0.6,
  },
});