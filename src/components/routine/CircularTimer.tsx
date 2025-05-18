import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface CircularTimerProps {
  progress: Animated.Value;
  timeRemaining: number;
  diameter?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  textColor?: string;
  isDark?: boolean;
  isSunset?: boolean;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CircularTimer: React.FC<CircularTimerProps> = ({
  progress,
  timeRemaining,
  diameter = 100,
  strokeWidth = 8,
  color = '#4CAF50',
  backgroundColor = '#E0E0E0',
  textColor = '#333',
  isDark = false,
  isSunset = false
}) => {
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Animated value for seconds text
  const [prevTime, setPrevTime] = useState(timeRemaining);
  const textOpacity = useRef(new Animated.Value(1)).current;
  const textScale = useRef(new Animated.Value(1)).current;

  // Format time as minutes and seconds
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}:${secs < 10 ? '0' : ''}${secs}` : `${secs}`;
  };

  // Animate the seconds text when it changes
  useEffect(() => {
    if (prevTime !== timeRemaining) {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(textOpacity, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease)
          }),
          Animated.timing(textScale, {
            toValue: 0.85,
            duration: 100,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease)
          })
        ]),
        Animated.parallel([
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
            easing: Easing.in(Easing.ease)
          }),
          Animated.timing(textScale, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
            easing: Easing.in(Easing.bounce)
          })
        ])
      ]).start();
      setPrevTime(timeRemaining);
    }
  }, [timeRemaining, prevTime, textOpacity, textScale]);

  // Determine color based on progress
  const progressInterpolatedColor = progress.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [color, color, color]
  });

  // Calculate stroke dash offset based on progress with safeguards
  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
    extrapolate: 'clamp'
  });

  return (
    <View style={[styles.circularTimerContainer, { width: diameter, height: diameter }]}>
      <Svg width={diameter} height={diameter}>
        {/* Background Circle */}
        <Circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={isDark || isSunset ? 'rgba(255,255,255,0.15)' : backgroundColor}
          fill="transparent"
        />
        {/* Progress Circle */}
        <AnimatedCircle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={progressInterpolatedColor}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          rotation="-90"
          origin={`${diameter / 2}, ${diameter / 2}`}
        />
      </Svg>
      <View style={styles.circularTimerTextContainer}>
        <Animated.Text
          style={[
            styles.circularTimerText,
            {
              color: isDark || isSunset ? '#FFFFFF' : textColor,
              opacity: textOpacity,
              transform: [{ scale: textScale }]
            }
          ]}
        >
          {formatTime(timeRemaining)}
        </Animated.Text>
        <Text style={[styles.circularTimerLabel, { color: isDark || isSunset ? '#FFFFFF' : textColor }]}>
          sec
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  circularTimerContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center'
  },
  circularTimerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center'
  },
  circularTimerText: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  circularTimerLabel: {
    fontSize: 12,
    marginTop: -3,
    textAlign: 'center',
    opacity: 0.7
  }
});

export default CircularTimer; 