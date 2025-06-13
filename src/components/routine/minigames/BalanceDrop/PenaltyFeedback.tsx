import React, { useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useTheme } from '../../../../context/ThemeContext';
import { styles } from './styles';

interface PenaltyFeedbackProps {
  message: string;
  onComplete: () => void;
}

export const PenaltyFeedback: React.FC<PenaltyFeedbackProps> = ({
  message,
  onComplete,
}) => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();

    // Animate out after delay
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onComplete();
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [fadeAnim, slideAnim, onComplete]);

  return (
    <Animated.View
      style={[
        styles.penaltyFeedback,
        {
          backgroundColor: '#FF6B6B',
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <Text style={styles.penaltyText}>{message}</Text>
      <Text style={styles.penaltySubtext}>-1.5 hours!</Text>
    </Animated.View>
  );
};