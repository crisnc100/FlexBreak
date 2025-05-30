import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  StatusBar,
  Platform,
  GestureResponderEvent,
  PanResponder,
  Easing,
  Vibration
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as soundEffects from '../../utils/soundEffects';
import * as Haptics from 'expo-haptics';
import FitnessDisclaimer, { checkDisclaimerAccepted } from '../notices/FitnessDisclaimer';

const { width, height } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

// Helper function for haptic feedback that gracefully falls back
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

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onComplete }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [showLoader, setShowLoader] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const autoAdvanceTimer = useRef<NodeJS.Timeout | null>(null);
  const insets = useSafeAreaInsets();
  
  // Animation values for loading animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  
  // Track touch position for swipe detection
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  
  // Pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // Store the initial touch position
        touchStartX.current = evt.nativeEvent.pageX;
        
        // Clear auto advance timer when user starts interacting
        if (autoAdvanceTimer.current) {
          clearTimeout(autoAdvanceTimer.current);
          autoAdvanceTimer.current = null;
        }
      },
      onPanResponderMove: (evt) => {
        // Update the current touch position
        touchEndX.current = evt.nativeEvent.pageX;
      },
      onPanResponderRelease: () => {
        // Calculate the swipe distance
        const swipeDistance = touchEndX.current - touchStartX.current;
        const threshold = width * 0.2; // 20% of screen width
        
        if (swipeDistance < -threshold) {
          // Swiped left -> go to next page
          goToNextPage();
        } else if (swipeDistance > threshold) {
          // Swiped right -> go to previous page
          goToPrevPage();
        } else {
          // Reset auto advance timer if swipe wasn't far enough
          startAutoAdvanceTimer();
        }
      },
    })
  ).current;

  // Onboarding content
  const pages = [
    {
      title: 'Stretch smarter, feel better',
      subtitle: 'Daily routines for your body.',
      icon: 'body-outline',
      gradient: ['#4776E6', '#8E54E9']
    },
    {
      title: 'Build streaks, unlock rewards',
      subtitle: 'Over 100 stretches to explore.',
      icon: 'trophy-outline',
      gradient: ['#00B4DB', '#0083B0']
    },
    {
      title: 'Ready?',
      subtitle: 'Start your first stretch now!',
      icon: 'fitness-outline',
      gradient: ['#56ab2f', '#a8e063'],
      showButton: true
    }
  ];

  // Spin animation interpolation
  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  // Rotation animation interpolation
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: ['0deg', '72deg', '144deg', '216deg', '288deg']
  });

  // Handle auto-advancing to next page
  useEffect(() => {
    startAutoAdvanceTimer();
    
    return () => {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
      }
    };
  }, [currentPage]);
  
  // Starting loading animations
  const startLoadingAnimations = () => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease)
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.8,
          duration: 600,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease)
        })
      ])
    ).start();
    
    // Spin animation
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
        easing: Easing.linear
      })
    ).start();
    
    // Rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 4,
        duration: 3000,
        useNativeDriver: true,
        easing: Easing.inOut(Easing.cubic)
      })
    ).start();
  };

  const startAutoAdvanceTimer = () => {
    // Clear any existing timer
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
    }
    
    // Set new timer (3 seconds per screen) but don't auto-advance on last screen
    if (currentPage < pages.length - 1) {
      autoAdvanceTimer.current = setTimeout(() => {
        goToNextPage();
      }, 3000);
    }
  };

  const goToNextPage = () => {
    // Don't advance beyond the last page
    if (currentPage >= pages.length - 1) return;
    
    // Provide haptic feedback
    triggerHaptic('light');
    
    // Play click sound when changing pages
    soundEffects.playClickSound();
    
    // Animate the transition
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      // Update page index
      setCurrentPage(currentPage + 1);
      
      // Reset animations
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      
      // Fade in new content
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
    });
  };
  
  const goToPrevPage = () => {
    // Don't go back from first page
    if (currentPage <= 0) return;
    
    // Provide haptic feedback
    triggerHaptic('light');
    
    // Play click sound when changing pages
    soundEffects.playClickSound();
    
    // Animate the transition (sliding from left)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 300,
        useNativeDriver: true
      })
    ]).start(() => {
      // Update page index
      setCurrentPage(currentPage - 1);
      
      // Reset animations
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
      
      // Fade in new content
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }).start();
    });
  };

  const handleSkip = async () => {
    // Provide haptic feedback
    triggerHaptic('medium');
    
    soundEffects.playClickSound();
    
    // Check if disclaimer has been accepted
    const isDisclaimerAccepted = await checkDisclaimerAccepted();
    
    if (!isDisclaimerAccepted) {
      // Show disclaimer modal if not yet accepted
      setShowDisclaimerModal(true);
      return;
    }
    
    // If disclaimer is accepted, proceed with completion
    handleComplete();
  };

  const handleComplete = () => {
    // Animate out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true
    }).start(() => {
      onComplete();
    });
  };

  const handleStartStretching = async () => {
    // Provide haptic feedback - stronger for main action
    triggerHaptic('success');
    
    // Check if disclaimer has been accepted
    const isDisclaimerAccepted = await checkDisclaimerAccepted();
    
    if (!isDisclaimerAccepted) {
      // Show disclaimer modal if not yet accepted
      setShowDisclaimerModal(true);
      return;
    }
    
    // Play intro sound when user clicks Start Stretching
    soundEffects.playIntroSound();
    
    // Show loading animation
    setShowLoader(true);
    
    // Start loading animations
    startLoadingAnimations();
    
    // Delay transition to match the intro sound
    setTimeout(() => {
      handleComplete();
    }, 1000); // Adjust timing to match the sound effect duration
  };

  // Handle disclaimer acceptance
  const handleDisclaimerAccepted = () => {
    // Provide haptic feedback for acceptance
    triggerHaptic('success');
    
    setShowDisclaimerModal(false);
    
    // Proceed with the normal flow after acceptance
    soundEffects.playIntroSound();
    setShowLoader(true);
    startLoadingAnimations();
    
    setTimeout(() => {
      handleComplete();
    }, 1000);
  };

  // Current page content
  const currentPageData = pages[currentPage];

  // Render loading animation
  const renderLoader = () => {
    return (
      <View style={styles.loaderContainer}>
        <LinearGradient
          colors={['#4776E6', '#8E54E9']}
          style={styles.background}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        
        <Animated.View 
          style={[
            styles.loaderInner,
            {
              transform: [
                { scale: pulseAnim },
                { rotate: spin }
              ]
            }
          ]}
        >
          {/* Animated dots */}
          <Animated.View 
            style={[
              styles.loaderOrbit,
              { transform: [{ rotate }] }
            ]}
          >
            {[...Array(5)].map((_, i) => (
              <View 
                key={i} 
                style={[
                  styles.loaderDot,
                  { 
                    transform: [
                      { rotate: `${i * 72}deg` },
                      { translateX: 50 }
                    ]
                  }
                ]}
              />
            ))}
          </Animated.View>
          
          <Animated.View style={styles.loaderCenter}>
            <Ionicons name="fitness" size={36} color="#FFF" />
          </Animated.View>
        </Animated.View>
        
        <Text style={styles.loaderText}>Starting your journey...</Text>
      </View>
    );
  };

  // Show loader if it's active
  if (showLoader) {
    return renderLoader();
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <LinearGradient
        colors={currentPageData.gradient as any}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      
      {/* Skip button */}
      <TouchableOpacity 
        style={[styles.skipButton, { top: insets.top + 10 }]} 
        onPress={handleSkip}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
      
      {/* Left tap area for going back */}
      {currentPage > 0 && (
        <TouchableOpacity 
          style={styles.leftTapArea}
          activeOpacity={0.7}
          onPress={goToPrevPage}
        />
      )}
      
      {/* Right tap area for going forward */}
      {currentPage < pages.length - 1 && (
        <TouchableOpacity 
          style={styles.rightTapArea}
          activeOpacity={0.7}
          onPress={goToNextPage}
        />
      )}
      
      {/* Swipeable content area */}
      <View 
        style={styles.swipeContainer}
        {...panResponder.panHandlers}
      >
        {/* Page content */}
        <Animated.View 
          style={[
            styles.contentContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }]
            }
          ]}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={currentPageData.icon as any} size={80} color="#FFFFFF" />
          </View>
          
          <Text style={styles.title}>{currentPageData.title}</Text>
          <Text style={styles.subtitle}>{currentPageData.subtitle}</Text>
          
          {currentPageData.showButton && (
            <TouchableOpacity 
              style={styles.startButton}
              onPress={handleStartStretching}
            >
              <Text style={styles.startButtonText}>Start Stretching</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </View>
      
      {/* Page indicators */}
      <View style={styles.paginationContainer}>
        {pages.map((_, index) => (
          <TouchableOpacity 
            key={index}
            style={[
              styles.paginationDot,
              index === currentPage && styles.paginationDotActive
            ]}
            onPress={() => {
              // Allow direct navigation to specific pages by tapping dots
              if (index > currentPage) {
                // Navigate forward
                setCurrentPage(index);
              } else if (index < currentPage) {
                // Navigate backward
                setCurrentPage(index);
              }
            }}
          />
        ))}
      </View>
      
      {/* Fitness Disclaimer Modal */}
      <FitnessDisclaimer
        visible={showDisclaimerModal}
        onAccept={handleDisclaimerAccepted}
      />
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
  skipButton: {
    position: 'absolute',
    right: 20,
    padding: 10,
    zIndex: 10,
  },
  skipText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  swipeContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    width: width * 0.8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 40,
  },
  startButton: {
    backgroundColor: 'white',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
  },
  startButtonText: {
    color: '#4776E6',
    fontSize: 18,
    fontWeight: 'bold',
  },
  paginationContainer: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 50,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    marginHorizontal: 6,
  },
  paginationDotActive: {
    backgroundColor: 'white',
    width: 20,
    borderRadius: 10,
  },
  leftTapArea: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: width * 0.15, // 15% of screen width
    zIndex: 5,
  },
  rightTapArea: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: width * 0.15, // 15% of screen width
    zIndex: 5,
  },
  // Loader styles
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#4776E6',
    width: '100%',
    height: '100%',
  },
  loaderInner: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderCenter: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
  },
  loaderOrbit: {
    width: 120,
    height: 120,
    position: 'absolute',
  },
  loaderDot: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFF',
    top: 53,
    left: 53,
  },
  loaderText: {
    marginTop: 40,
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default OnboardingScreen; 