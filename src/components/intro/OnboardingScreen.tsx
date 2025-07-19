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
  Easing,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as soundEffects from '../../utils/soundEffects';
import * as Haptics from 'expo-haptics';
import FitnessDisclaimer, { checkDisclaimerAccepted } from '../settings/notices/FitnessDisclaimer';

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
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'warning':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'error':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
  
  // New animation values for enhanced experience
  const iconScaleAnim = useRef(new Animated.Value(0)).current;
  const iconRotateAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const leftArrowPulse = useRef(new Animated.Value(1)).current;
  const rightArrowPulse = useRef(new Animated.Value(1)).current;
  
  // Particle animations for visual interest
  const particleAnims = useRef(
    Array.from({ length: 6 }, () => ({
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0)
    }))
  ).current;

  // Enhanced onboarding content with better messaging
  const pages = [
    {
      title: 'Welcome to FlexBreak',
      subtitle: 'Your personal stretching companion',
      description: 'Take quick breaks, stretch smart, and feel better throughout your day',
      icon: 'body-outline',
      gradient: ['#667eea', '#764ba2'],
      features: ['100+ stretches', 'Smart reminders', 'Personalized routines']
    },
    {
      title: 'Build Healthy Habits',
      subtitle: 'Track your progress daily',
      description: 'Earn XP, unlock achievements, and watch your flexibility improve',
      icon: 'trending-up-outline',
      gradient: ['#f093fb', '#f5576c'],
      features: ['Daily streaks', 'Level system', 'Achievement badges']
    },
    {
      title: 'Stretch Anywhere',
      subtitle: 'Designed for your lifestyle',
      description: 'Quick routines perfect for office, home, or on-the-go',
      icon: 'location-outline',
      gradient: ['#4facfe', '#00f2fe'],
      features: ['5-15 min routines', 'Little to no equipment needed', 'All fitness levels']
    },
    {
      title: 'Ready to Start?',
      subtitle: 'Your journey begins now',
      description: 'Join thousands improving their flexibility and wellbeing',
      icon: 'rocket-outline',
      gradient: ['#fa709a', '#fee140'],
      showButton: true,
      features: []
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
  
  // Float animation for icons
  const floatTranslate = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10]
  });

  // Initialize page animations
  useEffect(() => {
    startPageAnimations();
    startAutoAdvanceTimer();
    
    // Update progress bar
    Animated.timing(progressAnim, {
      toValue: (currentPage + 1) / pages.length,
      duration: 300,
      useNativeDriver: false,
      easing: Easing.out(Easing.ease)
    }).start();
    
    // Start arrow pulse animations
    startArrowAnimations();
    
    return () => {
      if (autoAdvanceTimer.current) {
        clearTimeout(autoAdvanceTimer.current);
      }
    };
  }, [currentPage]);
  
  const startArrowAnimations = () => {
    // Pulse animation for navigation arrows
    const createPulseAnimation = (animValue: Animated.Value) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease)
          }),
          Animated.timing(animValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.inOut(Easing.ease)
          })
        ])
      );
    };
    
    if (currentPage > 0) {
      createPulseAnimation(leftArrowPulse).start();
    }
    
    if (currentPage < pages.length - 1) {
      createPulseAnimation(rightArrowPulse).start();
    }
  };
  
  const startPageAnimations = () => {
    // Reset animations
    iconScaleAnim.setValue(0);
    iconRotateAnim.setValue(0);
    
    // Icon entrance animation
    Animated.parallel([
      Animated.spring(iconScaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 5,
        useNativeDriver: true
      }),
      Animated.timing(iconRotateAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5))
      })
    ]).start();
    
    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin)
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.sin)
        })
      ])
    ).start();
    
    // Particle animations
    particleAnims.forEach((particle, index) => {
      const delay = index * 200;
      const angle = (index * 60) * Math.PI / 180;
      const distance = 100 + Math.random() * 50;
      
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(particle.opacity, {
            toValue: 0.6,
            duration: 400,
            useNativeDriver: true
          }),
          Animated.spring(particle.scale, {
            toValue: 1,
            tension: 100,
            friction: 5,
            useNativeDriver: true
          }),
          Animated.timing(particle.translateX, {
            toValue: Math.cos(angle) * distance,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease)
          }),
          Animated.timing(particle.translateY, {
            toValue: Math.sin(angle) * distance,
            duration: 1000,
            useNativeDriver: true,
            easing: Easing.out(Easing.ease)
          })
        ]).start(() => {
          // Fade out
          Animated.timing(particle.opacity, {
            toValue: 0,
            duration: 800,
            delay: 500,
            useNativeDriver: true
          }).start();
        });
      }, delay);
    });
  };
  
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
    
    // Set new timer (5 seconds per screen for better reading) but don't auto-advance on last screen
    if (currentPage < pages.length - 1) {
      autoAdvanceTimer.current = setTimeout(() => {
        goToNextPage();
      }, 5000);
    }
  };

  const goToNextPage = () => {
    // Don't advance beyond the last page
    if (currentPage >= pages.length - 1) return;
    
    // Clear auto advance timer
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    
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
        toValue: -width * 0.3,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      })
    ]).start(() => {
      // Update page index
      setCurrentPage(currentPage + 1);
      
      // Reset animations
      slideAnim.setValue(width * 0.3);
      fadeAnim.setValue(0);
      
      // Fade in new content
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease)
        })
      ]).start();
    });
  };
  
  const goToPrevPage = () => {
    // Don't go back from first page
    if (currentPage <= 0) return;
    
    // Clear auto advance timer
    if (autoAdvanceTimer.current) {
      clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    
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
        toValue: width * 0.3,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease)
      })
    ]).start(() => {
      // Update page index
      setCurrentPage(currentPage - 1);
      
      // Reset animations
      slideAnim.setValue(-width * 0.3);
      fadeAnim.setValue(0);
      
      // Fade in new content
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease)
        })
      ]).start();
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
    // Animate button press
    Animated.sequence([
      Animated.timing(buttonScaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(buttonScaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
    
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
          colors={['#667eea', '#764ba2']}
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
      
      {/* Progress bar */}
      <View style={[styles.progressContainer, { top: insets.top + 10 }]}>
        <View style={styles.progressBar}>
          <Animated.View 
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                })
              }
            ]}
          />
        </View>
      </View>
      
      {/* Skip button */}
      <TouchableOpacity 
        style={[styles.skipButton, { top: insets.top + 10 }]} 
        onPress={handleSkip}
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
      
      {/* Main content area - no swipe/tap handling */}
      <View style={styles.contentWrapper}>
        {/* Floating particles */}
        <View style={styles.particlesContainer}>
          {particleAnims.map((particle, index) => (
            <Animated.View
              key={index}
              style={[
                styles.particle,
                {
                  opacity: particle.opacity,
                  transform: [
                    { translateX: particle.translateX },
                    { translateY: particle.translateY },
                    { scale: particle.scale }
                  ]
                }
              ]}
            />
          ))}
        </View>
        
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
          <Animated.View 
            style={[
              styles.iconContainer,
              {
                transform: [
                  { scale: iconScaleAnim },
                  { 
                    rotate: iconRotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  },
                  { translateY: floatTranslate }
                ]
              }
            ]}
          >
            <Ionicons name={currentPageData.icon as any} size={80} color="#FFFFFF" />
          </Animated.View>
          
          <Text style={styles.title}>{currentPageData.title}</Text>
          <Text style={styles.subtitle}>{currentPageData.subtitle}</Text>
          <Text style={styles.description}>{currentPageData.description}</Text>
          
          {/* Feature list */}
          {currentPageData.features.length > 0 && (
            <View style={styles.featuresContainer}>
              {currentPageData.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <Ionicons name="checkmark-circle" size={20} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          )}
          
          {currentPageData.showButton && (
            <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
              <TouchableOpacity 
                style={styles.startButton}
                onPress={handleStartStretching}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#FFFFFF', '#F0F0F0']}
                  style={styles.startButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                >
                  <Text style={styles.startButtonText}>Start Stretching</Text>
                  <Ionicons name="arrow-forward" size={20} color="#667eea" style={{ marginLeft: 8 }} />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
      </View>
      
      {/* Page indicators with tap navigation */}
      <View style={[styles.paginationContainer, { bottom: insets.bottom + 30 }]}>
        {pages.map((_, index) => (
          <TouchableOpacity 
            key={index}
            style={[
              styles.paginationDot,
              index === currentPage && styles.paginationDotActive
            ]}
            onPress={() => {
              // Allow direct navigation to specific pages by tapping dots
              if (index !== currentPage) {
                triggerHaptic('light');
                setCurrentPage(index);
              }
            }}
          />
        ))}
      </View>
      
      {/* Navigation arrows - more prominent */}
      {currentPage > 0 && (
        <Animated.View 
          style={[
            styles.navArrowContainer, 
            styles.navArrowLeft,
            { transform: [{ scale: leftArrowPulse }] }
          ]}
        >
          <TouchableOpacity 
            style={styles.navArrowButton}
            onPress={goToPrevPage}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      )}
      
      {currentPage < pages.length - 1 && (
        <Animated.View 
          style={[
            styles.navArrowContainer, 
            styles.navArrowRight,
            { transform: [{ scale: rightArrowPulse }] }
          ]}
        >
          <TouchableOpacity 
            style={styles.navArrowButton}
            onPress={goToNextPage}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-forward" size={32} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      )}
      
      {/* Fitness Disclaimer Modal */}
      <FitnessDisclaimer
        visible={showDisclaimerModal}
        onAccept={handleDisclaimerAccepted}
        onCancel={() => {
          setShowDisclaimerModal(false);
          triggerHaptic('light');
        }}
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
  progressContainer: {
    position: 'absolute',
    left: 20,
    right: 80,
    height: 4,
    zIndex: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 2,
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
  contentWrapper: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  particlesContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  contentContainer: {
    width: width * 0.85,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 20,
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  description: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  featuresContainer: {
    marginBottom: 30,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    marginLeft: 10,
  },
  startButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 30,
  },
  startButtonText: {
    color: '#667eea',
    fontSize: 18,
    fontWeight: 'bold',
  },
  paginationContainer: {
    flexDirection: 'row',
    position: 'absolute',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    marginHorizontal: 6,
  },
  paginationDotActive: {
    backgroundColor: 'white',
    width: 24,
    borderRadius: 12,
  },
  navArrowContainer: {
    position: 'absolute',
    top: '50%',
    marginTop: -25,
    zIndex: 10,
  },
  navArrowLeft: {
    left: 5,
  },
  navArrowRight: {
    right: 5,
  },
  navArrowButton: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Loader styles
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#667eea',
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