import React, { useRef, useEffect } from 'react';
import { Animated, View, StyleSheet, Dimensions, Easing } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface TimeRewindProps {
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  rotation: number;
  maxY: number;
  color?: string;
  targetX?: number;
  targetY?: number;
}

interface VortexProps {
  visible: boolean;
  size?: number;
  color?: string;
  duration?: number;
}

// Array of time-related icons for a more varied and interesting animation
const TIME_ICONS = [
  'clock-outline',
  'timer-outline',
  'history',
  'replay',
  'calendar-clock',
  'timer-sand'  // hourglass
];

// Screen dimensions for vortex effect
const { width, height } = Dimensions.get('window');
const centerX = width / 2;
const centerY = height / 2;

// TimeRewind component for the individual elements that spiral toward the center
const TimeRewind: React.FC<TimeRewindProps> = ({ 
  x, 
  y, 
  size, 
  duration, 
  delay, 
  rotation,
  maxY,
  color = '#2196F3',
  targetX,
  targetY
}) => {
  // Create animated values
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const animatedX = useRef(new Animated.Value(x)).current;
  const animatedY = useRef(new Animated.Value(y)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  
  // Calculate distance to center for spiral effect
  const distanceToCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
  
  // Determine angle to center (for spiral calculation)
  const angleToCenter = Math.atan2(y - centerY, x - centerX);
  
  // Select a random icon from our array for variety
  const iconName = TIME_ICONS[Math.floor(Math.random() * TIME_ICONS.length)];
  
  // Calculate a dynamic speed based on distance to center
  const speedFactor = 0.5 + (distanceToCenter / Math.max(width, height));
  const actualDuration = duration * speedFactor;

  const destX = targetX !== undefined ? targetX : width * 0.52;
  const destY = targetY !== undefined ? targetY : height * 0.45;

  useEffect(() => {
    // Create a floating and spiraling animation toward the center
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        // Fade in
        Animated.timing(opacity, {
          toValue: 0.9,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.cubic)
        }),
        
        // Grow slightly as it appears
        Animated.timing(scale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.5))
        }),
        
        // Spiral toward center
        Animated.timing(animatedX, {
          toValue: destX,
          duration: actualDuration,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic)
        }),
        
        Animated.timing(animatedY, {
          toValue: destY,
          duration: actualDuration,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic)
        }),
        
        // Rotate counter-clockwise (reverse time effect)
        Animated.timing(rotate, {
          toValue: 8, // Multiple full rotations
          duration: actualDuration,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.cubic)
        })
      ]),
      
      // Zoom and fade out at center to complete the "sucked into a time vortex" effect
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic)
        }),
        Animated.timing(scale, {
          toValue: 0.1,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.in(Easing.cubic)
        })
      ])
    ]).start();
  }, []);

  // For counter-clockwise rotation animation
  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 8],
    outputRange: ['0deg', '-2880deg'] // 8 full counter-clockwise rotations
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        opacity,
        zIndex: 1000,
        transform: [
          { translateX: animatedX },
          { translateY: animatedY },
          { rotate: rotateInterpolate },
          { scale }
        ]
      }}
    >
      <MaterialCommunityIcons 
        name={iconName} 
        size={size} 
        color={color} 
      />
    </Animated.View>
  );
};

// Vortex component for the central swirling effect
const Vortex: React.FC<VortexProps> = ({ 
  visible, 
  size = 100, 
  color = '#2196F3',
  duration = 2000
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.1)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const shrink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Reset animations if shown again
      opacity.setValue(0);
      scale.setValue(0.1);
      rotate.setValue(0);
      shrink.setValue(1);
      
      // Create the vortex animation sequence
      Animated.sequence([
        // Appear and start spinning
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0.9,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.out(Easing.cubic)
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 700,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(1.7))
          }),
          Animated.timing(rotate, {
            toValue: 8,
            duration: duration,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.cubic)
          })
        ]),
        
        // Shrink and fade for collapse effect
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.in(Easing.cubic)
          }),
          Animated.timing(shrink, {
            toValue: 0.1,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.in(Easing.cubic)
          })
        ])
      ]).start();
    }
  }, [visible]);
  
  // Counter-clockwise rotation for time reversal effect
  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 8],
    outputRange: ['0deg', '-2880deg'] 
  });
  
  if (!visible) return null;
  
  return (
    <View style={styles.vortexContainer}>
      {/* Outer rotating circle */}
      <Animated.View
        style={[
          styles.vortexCircle,
          {
            opacity,
            borderColor: color,
            width: size * 1.2,
            height: size * 1.2,
            transform: [
              { rotate: rotateInterpolate },
              { scale: Animated.multiply(scale, shrink) }
            ]
          }
        ]}
      />
      
      {/* Inner counter-rotating circle */}
      <Animated.View
        style={[
          styles.vortexInnerCircle,
          {
            opacity: Animated.multiply(opacity, 0.8),
            borderColor: color,
            width: size * 0.9,
            height: size * 0.9,
            transform: [
              { rotate: Animated.multiply(rotate, 1.5).interpolate({
                  inputRange: [0, 12],
                  outputRange: ['0deg', '4320deg']
                }) 
              },
              { scale: Animated.multiply(scale, shrink) }
            ]
          }
        ]}
      />
      
      {/* Central icon */}
      <Animated.View
        style={[
          styles.vortexCenter,
          {
            opacity: Animated.multiply(opacity, 1.3),
            transform: [
              { scale: Animated.multiply(scale, shrink) }
            ]
          }
        ]}
      >
        <MaterialCommunityIcons
          name="clock-time-four"
          size={size * 0.4}
          color={color}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  vortexContainer: {
    position: 'absolute',
    zIndex: 1010,
    left: '58%',
    top: '62%',
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -50 }, { translateY: -50 }]
  },
  vortexCircle: {
    position: 'absolute',
    borderWidth: 4,
    borderStyle: 'dashed',
    borderRadius: 500,
  },
  vortexInnerCircle: {
    position: 'absolute',
    borderWidth: 3,
    borderStyle: 'dotted',
    borderRadius: 500,
  },
  vortexCenter: {
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export { TimeRewind, Vortex }; 