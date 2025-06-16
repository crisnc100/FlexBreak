import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DropFeedbackProps {
  type: 'success' | 'error' | 'skip';
  position: { x: number; y: number };
  onComplete: () => void;
}

export const DropFeedback: React.FC<DropFeedbackProps> = ({ type, position, onComplete }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animate in
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: -30,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start(() => {
      onComplete();
    });
  }, []);

  const getContent = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          color: '#4CAF50',
          text: 'Nice!',
        };
      case 'error':
        return {
          icon: 'close-circle',
          color: '#FF6B6B',
          text: 'Wrong side!',
        };
      case 'skip':
        return {
          icon: 'hand-right',
          color: '#2196F3',
          text: 'Let Go!',
        };
    }
  };

  const { icon, color, text } = getContent();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: position.x - 50,
          top: position.y - 50,
          transform: [
            { scale: scaleAnim },
            { translateY: translateY },
          ],
          opacity: opacityAnim,
        },
      ]}
      pointerEvents="none"
    >
      <View style={[styles.circle, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon as any} size={48} color={color} />
        <Text style={[styles.text, { color }]}>{text}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  circle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
});