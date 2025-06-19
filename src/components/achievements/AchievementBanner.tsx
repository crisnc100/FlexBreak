import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import * as haptics from '../../utils/haptics';
import * as soundEffects from '../../utils/soundEffects';

const { width } = Dimensions.get('window');

interface AchievementBannerProps {
  visible: boolean;
  achievement: {
    title: string;
    description?: string;
    badgeImage?: any;
  } | null;
  onHide: () => void;
}

export const AchievementBanner: React.FC<AchievementBannerProps> = ({
  visible,
  achievement,
  onHide,
}) => {
  const { theme } = useTheme();
  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    if (visible && achievement) {
      // Play success sound and haptic
      soundEffects.playAchievementUnlockedSound();
      haptics.success();

      // Animate in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after 3 seconds
      const timer = setTimeout(() => {
        hideAnimation();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible, achievement]);

  const hideAnimation = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -200,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide();
      // Reset values
      translateY.setValue(-200);
      opacity.setValue(0);
      scale.setValue(0.8);
    });
  };

  if (!visible || !achievement) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={[theme.accent, theme.accent + 'DD']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Trophy Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="trophy" size={32} color="#FFFFFF" />
          </View>

          {/* Text Content */}
          <View style={styles.textContent}>
            <Text style={styles.title}>Badge Unlocked!</Text>
            <Text style={styles.achievementName}>{achievement.title}</Text>
          </View>
        </View>

        {/* Shine effect overlay */}
        <Animated.View
          style={[
            styles.shineOverlay,
            {
              opacity: opacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.3],
              }),
            },
          ]}
        />
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60, // Below status bar
    left: 20,
    right: 20,
    zIndex: 9999,
    elevation: 999,
  },
  gradient: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 2,
  },
  achievementName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shineOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'white',
  },
});