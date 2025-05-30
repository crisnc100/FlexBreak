import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  Platform,
  Vibration
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as soundEffects from '../../utils/soundEffects';
import * as streakManager from '../../utils/progress/modules/streakManager';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete: () => void;
  userLevel: number;
  userStreak: number;
  isMissedStreak?: boolean;
  onSaveStreak?: () => void;
}

// Helper function for haptic feedback
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
  try {
    // Use expo-haptics when available (most devices)
    if (Platform.OS === 'ios') {
      switch (type) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } else if (Platform.OS === 'android') {
      // Android pattern durations
      switch (type) {
        case 'light':
          Vibration.vibrate(10);
          break;
        case 'medium':
          Vibration.vibrate(20);
          break;
        case 'heavy':
          Vibration.vibrate(30);
          break;
        case 'success':
          Vibration.vibrate([0, 50, 50, 50]);
          break;
        case 'warning':
          Vibration.vibrate([0, 50, 100, 50]);
          break;
        case 'error':
          Vibration.vibrate([0, 50, 30, 50, 30, 50]);
          break;
      }
    }
  } catch (error) {
    // Fallback to basic vibration if haptics fail
    Vibration.vibrate(15);
  }
};

const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  userLevel = 1,
  userStreak = 0,
  isMissedStreak = false,
  onSaveStreak
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const breatheAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [isStreakBroken, setIsStreakBroken] = useState(false);
  const [validatedStreak, setValidatedStreak] = useState(userStreak);

  // Validate streak status on mount
  useEffect(() => {
    const validateStreakStatus = async () => {
      try {
        // Initialize streak manager if needed
        if (!streakManager.streakCache.initialized) {
          await streakManager.initializeStreak();
        }
        
        // Check if streak is broken
        const isBroken = await streakManager.isStreakBroken();
        setIsStreakBroken(isBroken);
        
        // Get validated streak from streak manager
        const streakStatus = await streakManager.getStreakStatus();
        setValidatedStreak(isBroken ? 0 : streakStatus.currentStreak);
        
        console.log('SplashScreen: Validated streak status', {
          isStreakBroken: isBroken,
          originalStreak: userStreak,
          validatedStreak: isBroken ? 0 : streakStatus.currentStreak
        });
      } catch (error) {
        console.error('Error validating streak:', error);
        // Fall back to passed streak value
        setValidatedStreak(userStreak);
      }
    };
    
    validateStreakStatus();
  }, [userStreak]);

  // Start animations when component mounts
  useEffect(() => {
    // Provide a gentle haptic feedback on app startup
    setTimeout(() => {
      triggerHaptic('medium');
    }, 100);

    // Intro animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5))
      })
    ]).start();

    // Breathing animation (continuous)
    Animated.loop(
      Animated.sequence([
        Animated.timing(breatheAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin)
        }),
        Animated.timing(breatheAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin)
        })
      ])
    ).start();
    
    // Add a more pronounced pulse effect
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease)
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease)
        })
      ])
    ).start();

    // Play intro sound with a 1.5 second delay
    setTimeout(() => {
      soundEffects.playSlowIntroSound();
    }, 1500);

    // Auto-dismiss after 3 seconds
    const timer = setTimeout(() => {
      handleComplete();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleComplete = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
      easing: Easing.in(Easing.ease)
    }).start(() => {
      onComplete();
    });
  };

  // If onSaveStreak is included, add haptic feedback there too
  const handleSaveStreak = () => {
    // Provide confirmation haptic feedback
    triggerHaptic('success');
    
    // Call the provided handler
    if (onSaveStreak) {
      onSaveStreak();
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <LinearGradient
        colors={['#4776E6', '#8E54E9']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      <Animated.View 
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              { translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0]
                })
              }
            ]
          }
        ]}
      >
        {/* App logo */}
        <Animated.View 
          style={[
            styles.logoContainer,
            {
              transform: [
                { scale: Animated.multiply(breatheAnim, pulseAnim) }
              ]
            }
          ]}
        >
          <Ionicons name="fitness" size={80} color="#FFFFFF" />
        </Animated.View>
        
        {/* App name */}
        <Text style={styles.appName}>FlexBreak</Text>
        
        {/* User streak & level info */}
        {validatedStreak > 0 && !isStreakBroken && (
          <View style={styles.streakContainer}>
            <Ionicons name="flame" size={24} color="#FF9500" />
            <Text style={styles.streakText}>Day {validatedStreak} Streak</Text>
          </View>
        )}
        
        {isStreakBroken && validatedStreak === 0 && userStreak > 0 && (
          <View style={[styles.streakContainer, {backgroundColor: 'rgba(255, 87, 34, 0.2)'}]}>
            <Ionicons name="flame-outline" size={24} color="#FF5722" />
            <Text style={styles.streakText}>New Streak Starting</Text>
          </View>
        )}
        
    
        
        <View style={styles.levelContainer}>
          <Ionicons name="trophy" size={20} color="#FFD700" />
          <Text style={styles.levelText}>Level {userLevel}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  background: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  contentContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 10,
  },
  streakText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  levelText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  missedStreakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 10,
  },
  missedStreakText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  }
});

export default SplashScreen; 