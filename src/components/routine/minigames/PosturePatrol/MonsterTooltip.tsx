import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MonsterType } from './types';

interface MonsterTooltipProps {
  x: number;
  y: number;
  monsterType: MonsterType;
  onComplete: () => void;
}

export const MonsterTooltip: React.FC<MonsterTooltipProps> = ({
  x,
  y,
  monsterType,
  onComplete,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;

  useEffect(() => {
    // Slide in and fade in
    const showAnimation = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);

    // Wait then fade out
    const hideAnimation = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 20,
        duration: 300,
        useNativeDriver: true,
      }),
    ]);

    showAnimation.start(() => {
      setTimeout(() => {
        hideAnimation.start(() => {
          onComplete();
        });
      }, 2000); // Show for 2 seconds
    });
  }, []);

  const getMonsterInfo = (type: MonsterType) => {
    switch (type) {
      case 'tech_neck':
        return {
          problem: 'Forward Head Posture',
          icon: 'phone-portrait',
          color: '#FF6B6B',
          tip: 'Affects neck & shoulders from screen time'
        };
      case 'desk_hunch':
        return {
          problem: 'Rounded Shoulders',
          icon: 'desktop',
          color: '#4ECDC4',
          tip: 'Chest caves in, shoulders roll forward'
        };
      case 'slouch_slump':
        return {
          problem: 'Curved Spine',
          icon: 'chair',
          color: '#45B7D1',
          tip: 'Poor sitting creates back pain'
        };
      case 'lean_twist':
        return {
          problem: 'Spinal Misalignment',
          icon: 'trending-down',
          color: '#96CEB4',
          tip: 'Crooked posture strains muscles'
        };
    }
  };

  const info = getMonsterInfo(monsterType);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          left: x - 100,
          top: y - 60,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          borderColor: info.color,
          shadowColor: info.color,
        },
      ]}
    >
      {/* Pointing arrow */}
      <View style={[styles.arrow, { borderTopColor: info.color }]} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name={info.icon as any} size={16} color={info.color} />
          <Text style={[styles.problemText, { color: info.color }]}>
            {info.problem}
          </Text>
        </View>
        
        <Text style={styles.tipText}>
          {info.tip}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 200,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    elevation: 6,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    pointerEvents: 'none',
  },
  arrow: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  content: {
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  problemText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tipText: {
    fontSize: 10,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 14,
  },
});