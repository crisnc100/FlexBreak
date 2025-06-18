import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as haptics from '../../utils/haptics';

const { width } = Dimensions.get('window');

interface MiniGameAchievementNotificationProps {
  visible: boolean;
  achievement: {
    title: string;
    description: string;
    xp: number;
    badgeImage: any;
  } | null;
  onHide?: () => void;
}

export const MiniGameAchievementNotification: React.FC<MiniGameAchievementNotificationProps> = ({
  visible,
  achievement,
  onHide,
}) => {
  const translateY = useRef(new Animated.Value(-200)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && achievement) {
      // Trigger haptic feedback
      haptics.success();

      // Animate in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          damping: 15,
          stiffness: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide after 3.5 seconds
      const timer = setTimeout(() => {
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
          onHide?.();
        });
      }, 3500);

      return () => clearTimeout(timer);
    }
  }, [visible, achievement]);

  if (!visible || !achievement) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
      pointerEvents="none"
    >
      <LinearGradient
        colors={['#1a1a1a', '#2a2a2a']}
        style={styles.notification}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Golden accent bar */}
        <LinearGradient
          colors={['#FFD700', '#FFA500']}
          style={styles.accentBar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />

        <View style={styles.content}>
          {/* Badge */}
          <View style={styles.badgeContainer}>
            <Image
              source={achievement.badgeImage}
              style={styles.badge}
              resizeMode="contain"
            />
          </View>

          {/* Text content */}
          <View style={styles.textContainer}>
            <View style={styles.header}>
              <Ionicons name="trophy" size={16} color="#FFD700" />
              <Text style={styles.unlockText}>NEW BADGE UNLOCKED!</Text>
            </View>
            <Text style={styles.title}>{achievement.title}</Text>
            <Text style={styles.description}>{achievement.description}</Text>
          </View>

          {/* XP */}
          <View style={styles.xpContainer}>
            <Text style={styles.xpText}>+{achievement.xp}</Text>
            <Text style={styles.xpLabel}>XP</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 999,
    alignItems: 'center',
  },
  notification: {
    width: width - 32,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  accentBar: {
    height: 4,
    width: '100%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  badgeContainer: {
    marginRight: 12,
  },
  badge: {
    width: 56,
    height: 56,
  },
  textContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  unlockText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFD700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  description: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  xpContainer: {
    alignItems: 'center',
    marginLeft: 12,
  },
  xpText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFD700',
  },
  xpLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFD700',
    opacity: 0.8,
  },
});

export default MiniGameAchievementNotification;