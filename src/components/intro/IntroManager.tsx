import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import OnboardingScreen from './OnboardingScreen';
import SplashScreen from './SplashScreen';
import * as streakManager from '../../utils/progress/modules/streakManager';
import { useGamification } from '../../hooks/progress/useGamification';

// Key for storing the first-time user flag
const FIRST_TIME_USER_KEY = 'app_first_time_user';

interface IntroManagerProps {
  onComplete: () => void;
}

const IntroManager: React.FC<IntroManagerProps> = ({ onComplete }) => {
  const [isFirstTimeUser, setIsFirstTimeUser] = useState<boolean | null>(null);
  const [isMissedStreak, setIsMissedStreak] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const { level, totalXP } = useGamification();
  const [userStreak, setUserStreak] = useState(0);
  
  // Fade animation for transitioning to main app
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Check if this is a first-time user and get streak info
  useEffect(() => {
    const checkFirstTimeUser = async () => {
      try {
        // Check if the user has opened the app before
        const firstTimeFlag = await AsyncStorage.getItem(FIRST_TIME_USER_KEY);
        
        // Get streak status
        const streakStatus = await streakManager.checkStreakStatus();
        setUserStreak(streakStatus.currentStreak);
        
        // Check if streak is broken and can be saved
        setIsMissedStreak(streakStatus.canSaveYesterdayStreak);
        
        // If first time flag doesn't exist, this is a first-time user
        setIsFirstTimeUser(firstTimeFlag === null);
      } catch (error) {
        console.error('Error checking first-time user status:', error);
        // Default to non-first-time user in case of error
        setIsFirstTimeUser(false);
      }
    };
    
    checkFirstTimeUser();
  }, []);

  // Perform the fade out and transition to main app
  const performFadeTransition = () => {
    setIsTransitioning(true);
    
    // Animate fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 400,
      useNativeDriver: true,
    }).start(() => {
      // When animation completes, call onComplete to show main app
      onComplete();
    });
  };

  // Handle onboarding complete for first-time users
  const handleOnboardingComplete = async () => {
    try {
      // Store the first-time flag so we don't show onboarding again
      await AsyncStorage.setItem(FIRST_TIME_USER_KEY, 'false');
      
      // Transition with fade effect
      performFadeTransition();
    } catch (error) {
      console.error('Error saving first-time user status:', error);
      onComplete();
    }
  };

  // Handle saving the streak
  const handleSaveStreak = async () => {
    try {
      // Call the streak manager to save the streak
      const success = await streakManager.saveStreakWithFreeze();
      
      if (success) {
        console.log('Streak saved successfully');
      } else {
        console.error('Failed to save streak');
      }
    } catch (error) {
      console.error('Error saving streak:', error);
    }
  };

  // Handle splash screen completion
  const handleSplashComplete = () => {
    performFadeTransition();
  };

  // If still determining first-time status, show nothing (loading)
  if (isFirstTimeUser === null) {
    return <View style={styles.container} />;
  }

  // Show the appropriate intro screen with fade transition
  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {isFirstTimeUser ? (
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      ) : (
        <SplashScreen
          onComplete={handleSplashComplete}
          userLevel={level}
          userStreak={userStreak}
          isMissedStreak={isMissedStreak}
          onSaveStreak={handleSaveStreak}
        />
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  }
});

export default IntroManager; 