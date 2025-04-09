import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
  StatusBar,
  Image,
  TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as streakManager from '../../utils/progress/modules/streakManager';
import * as soundEffects from '../../utils/soundEffects';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onComplete: () => void;
  userLevel: number;
  userStreak: number;
  isMissedStreak: boolean;
  onSaveStreak?: () => Promise<void>;
}

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
  const [showStreakPrompt, setShowStreakPrompt] = useState(isMissedStreak);

  // Start animations when component mounts
  useEffect(() => {
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

    // Auto-dismiss after 3 seconds if no streak prompt
    if (!isMissedStreak) {
      const timer = setTimeout(() => {
        handleComplete();
      }, 3000);

      return () => clearTimeout(timer);
    }
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

  const handleSaveStreak = async () => {
    // Play sound effect for streak freeze
    soundEffects.playStreakFreezeSound();
    
    // Call the streak save function
    if (onSaveStreak) {
      await onSaveStreak();
    }
    
    // Hide the prompt
    setShowStreakPrompt(false);
    
    // Auto dismiss after saving
    setTimeout(handleComplete, 1000);
  };

  const handleSkipSaveStreak = () => {
    // Play sound effect
    soundEffects.playClickSound();
    
    // Hide the prompt and dismiss
    setShowStreakPrompt(false);
    handleComplete();
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
        {userStreak > 0 && (
          <View style={styles.streakContainer}>
            <Ionicons name="flame" size={24} color="#FF9500" />
            <Text style={styles.streakText}>Day {userStreak} Streak</Text>
          </View>
        )}
        
        <View style={styles.levelContainer}>
          <Ionicons name="trophy" size={20} color="#FFD700" />
          <Text style={styles.levelText}>Level {userLevel}</Text>
        </View>
      </Animated.View>
      
      {/* Streak save prompt */}
      {showStreakPrompt && (
        <Animated.View 
          style={[
            styles.promptContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [50, 0]
                })
              }]
            }
          ]}
        >
          <Text style={styles.promptTitle}>Save your streak?</Text>
          <Text style={styles.promptText}>
            You missed yesterday's stretch. Use a streak freeze to maintain your {userStreak} day streak?
          </Text>
          
          <View style={styles.promptButtons}>
            <TouchableOpacity 
              style={[styles.promptButton, styles.declineButton]}
              onPress={handleSkipSaveStreak}
            >
              <Text style={styles.declineButtonText}>No Thanks</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.promptButton, styles.saveButton]}
              onPress={handleSaveStreak}
            >
              <Text style={styles.saveButtonText}>Save Streak</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
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
  promptContainer: {
    position: 'absolute',
    bottom: 100,
    width: width * 0.85,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  promptTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  promptText: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  promptButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  promptButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    flex: 1,
    marginHorizontal: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#4776E6',
  },
  declineButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default SplashScreen; 