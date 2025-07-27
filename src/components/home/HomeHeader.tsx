import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, Animated, TouchableWithoutFeedback, Platform, Easing } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';
import { KEYS } from '../../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { gamificationEvents } from '../../hooks/progress/useGamification';

interface HomeHeaderProps {
  title?: string;
  subtitle?: string;
}

/**
 * Enhanced header component for the home screen with modern styling
 * Shows "Pro" badge only for premium users
 */
const HomeHeader: React.FC<HomeHeaderProps> = ({
  title = 'FlexBreak',
  subtitle = 'Stretch. Relax. Work Better.'
}) => {
  const { theme, isDark } = useTheme();
  const { isPremium } = usePremium();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const logoPulse = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const fingerTapAnim = useRef(new Animated.Value(0)).current;
  const fingerOpacityAnim = useRef(new Animated.Value(0)).current;
  const touchX = useRef(new Animated.Value(50)).current;
  const touchY = useRef(new Animated.Value(50)).current;
  const touchScale = useRef(new Animated.Value(0)).current;
  const touchOpacity = useRef(new Animated.Value(0)).current;
  const touchRotate = useRef(new Animated.Value(0)).current;
  const [animationInProgress, setAnimationInProgress] = useState(false);
  const [aiWellnessEnabled, setAiWellnessEnabled] = useState(false);
  const [hasShownTapHint, setHasShownTapHint] = useState(false);
  const [hintShowCount, setHintShowCount] = useState(0);
  const [lastHintDate, setLastHintDate] = useState<number | null>(null);
  const [hasUsedFlexChat, setHasUsedFlexChat] = useState(false);
  
  // Check if AI wellness is enabled - check on mount and when screen is focused
  const checkAiWellness = async () => {
    const enabled = await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED);
    console.log('[HomeHeader] AI Wellness enabled:', enabled);
    setAiWellnessEnabled(enabled === 'true');
  };
  
  useEffect(() => {
    checkAiWellness();
  }, []);
  
  // Re-check when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      checkAiWellness();
    }, [])
  );
  
  // Listen for premium status changes
  useEffect(() => {
    const handlePremiumChange = () => {
      console.log('[HomeHeader] Premium status changed, rechecking...');
      checkAiWellness();
    };
    
    // Listen for premium upgrade events
    gamificationEvents.on('PREMIUM_STATUS_CHANGED', handlePremiumChange);
    gamificationEvents.on('SUBSCRIPTION_UPDATED', handlePremiumChange);
    
    return () => {
      gamificationEvents.off('PREMIUM_STATUS_CHANGED', handlePremiumChange);
      gamificationEvents.off('SUBSCRIPTION_UPDATED', handlePremiumChange);
    };
  }, []);
  
  // Check if it's Wednesday for free users
  const isWednesday = new Date().getDay() === 3;
  const canAccessFlexChat = aiWellnessEnabled && (isPremium || isWednesday);
  //console.log('[HomeHeader] Can access FlexChat:', canAccessFlexChat, { aiWellnessEnabled, isPremium, isWednesday });
  
  // Check tap hint display logic
  useEffect(() => {
    const checkTapHint = async () => {
      try {
        // Check if user has ever used FlexChat
        const hasUsed = await AsyncStorage.getItem('@flexchat_used');
        setHasUsedFlexChat(hasUsed === 'true');
        
        // If they've used it, never show hint again
        if (hasUsed === 'true') {
          setHasShownTapHint(true);
          console.log('[HomeHeader] User has used FlexChat, not showing hint');
          return;
        }
        
        // Get hint show count
        const countStr = await AsyncStorage.getItem('@flexchat_hint_count');
        const count = countStr ? parseInt(countStr, 10) : 0;
        setHintShowCount(count);
        
        // Get last hint date
        const lastDateStr = await AsyncStorage.getItem('@flexchat_hint_last_date');
        const lastDate = lastDateStr ? parseInt(lastDateStr, 10) : null;
        setLastHintDate(lastDate);
        
        // Determine if we should show hint
        const now = Date.now();
        const oneWeek = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
        
        let shouldShow = false;
        
        if (count < 1) {
          // Show for first time
          shouldShow = true;
        } else if (lastDate && (now - lastDate) > oneWeek) {
          // Show if it's been more than a week and they haven't used it
          shouldShow = true;
        }
        
        setHasShownTapHint(!shouldShow);
        console.log('[HomeHeader] Tap hint check:', { hasUsed, count, lastDate, shouldShow, daysSinceLastShow: lastDate ? (now - lastDate) / (24 * 60 * 60 * 1000) : 'never' });
      } catch (error) {
        console.error('[HomeHeader] Error checking tap hint:', error);
      }
    };
    checkTapHint();
  }, []);
  
  // Unique touch indicator animation - repeats 3 times
  useEffect(() => {
    console.log('[HomeHeader] Touch animation check:', { canAccessFlexChat, hasShownTapHint });
    
    if (canAccessFlexChat && !hasShownTapHint) {
      console.log('[HomeHeader] Starting touch animation sequence');
      
      let animationCount = 0;
      const maxAnimations = 3;
      
      const runSingleAnimation = () => {
        animationCount++;
        console.log(`[HomeHeader] Running animation ${animationCount} of ${maxAnimations}`);
        
        // Reset initial positions
        touchX.setValue(50);
        touchY.setValue(50);
        touchScale.setValue(0);
        touchOpacity.setValue(0);
        
        // Animated hand that appears to touch the logo
        Animated.sequence([
          // Wait before showing (shorter for subsequent animations)
          Animated.delay(animationCount === 1 ? 2000 : 4000),
          // Hand slides in from bottom right
          Animated.parallel([
            Animated.timing(touchOpacity, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(touchScale, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(touchX, {
              toValue: -10,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(touchY, {
              toValue: -10,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
          // Pause at logo
          Animated.delay(400),
          // Single tap animation
          Animated.parallel([
            Animated.sequence([
              Animated.timing(touchScale, {
                toValue: 0.85,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(touchScale, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
            ]),
            // Logo reacts to touch
            Animated.sequence([
              Animated.timing(logoPulse, {
                toValue: 0.92,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.spring(logoPulse, {
                toValue: 1,
                friction: 5,
                tension: 100,
                useNativeDriver: true,
              }),
            ]),
          ]),
          // Hand moves away
          Animated.parallel([
            Animated.timing(touchOpacity, {
              toValue: 0,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(touchX, {
              toValue: 60,
              duration: 600,
              useNativeDriver: true,
            }),
            Animated.timing(touchY, {
              toValue: 60,
              duration: 600,
              useNativeDriver: true,
            }),
          ]),
        ]).start(async () => {
          if (animationCount < maxAnimations) {
            // Run next animation
            runSingleAnimation();
          } else {
            // All animations completed
            console.log('[HomeHeader] All touch animations completed');
            
            // Update count and date
            const newCount = hintShowCount + 1;
            await AsyncStorage.setItem('@flexchat_hint_count', newCount.toString());
            await AsyncStorage.setItem('@flexchat_hint_last_date', Date.now().toString());
            
            // Mark as shown for this session
            setHasShownTapHint(true);
          }
        });
      };
      
      // Start the first animation
      runSingleAnimation();
      
      return () => {
        // Stop animations when unmounting
        touchOpacity.stopAnimation();
        touchX.stopAnimation();
        touchY.stopAnimation();
        touchScale.stopAnimation();
      };
    }
  }, [canAccessFlexChat, hasShownTapHint, hintShowCount]);
  
  // Subtle breathing effect when available
  useEffect(() => {
    if (canAccessFlexChat) {
      const breathingAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(logoPulse, {
            toValue: 1.02,
            duration: 2500,
            useNativeDriver: true,
          }),
          Animated.timing(logoPulse, {
            toValue: 1,
            duration: 2500,
            useNativeDriver: true,
          }),
        ])
      );
      
      breathingAnimation.start();
      
      return () => {
        breathingAnimation.stop();
        logoPulse.setValue(1);
      };
    }
  }, [canAccessFlexChat]);

  const handleLogoPress = () => {
    if (animationInProgress) return;
    
    console.log('[HomeHeader] Logo pressed, canAccessFlexChat:', canAccessFlexChat, 'aiWellnessEnabled:', aiWellnessEnabled);
    
    // Check if we should open FlexChat
    if (canAccessFlexChat && (global as any).openFlexChat) {
      // Special haptic feedback for FlexChat
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      setAnimationInProgress(true);
      
      // Mind-blowing press animation
      Animated.parallel([
        // Scale with overshoot
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 0.85,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 3,
            tension: 100,
            useNativeDriver: true,
          })
        ]),
        // Quick flash effect
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start(async () => {
        setAnimationInProgress(false);
        
        // Mark that user has used FlexChat
        if (!hasUsedFlexChat) {
          await AsyncStorage.setItem('@flexchat_used', 'true');
          setHasUsedFlexChat(true);
          console.log('[HomeHeader] Marked FlexChat as used - hints will no longer show');
        }
        
        // Open FlexChat after animation
        (global as any).openFlexChat();
      });
    } else {
      // Normal bounce animation
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      setAnimationInProgress(true);
      
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1.05,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 30,
          useNativeDriver: true,
        })
      ]).start(() => {
        setAnimationInProgress(false);
      });
    }
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <TouchableWithoutFeedback onPress={handleLogoPress}>
          <Animated.View 
            style={[
              styles.logoContainer,
              {
                transform: [
                  { scale: scaleAnim },
                  { scale: logoPulse } // Add subtle pulse when FlexChat available
                ]
              }
            ]}
          >
            <Image 
              source={require('../../../assets/images/potentialLogo2.png')} 
              style={styles.logoImage}
            />
            
            
            {/* Animated touch indicator */}
            {canAccessFlexChat && !hasShownTapHint && (
              <Animated.View 
                style={[
                  styles.touchIndicator,
                  {
                    opacity: touchOpacity,
                    transform: [
                      { scale: touchScale },
                      { translateX: touchX },
                      { translateY: touchY },
                    ]
                  }
                ]}
                pointerEvents="none"
              >
                <Text style={styles.touchEmoji}>👆</Text>
              </Animated.View>
            )}
            
            {/* Glow effect on press */}
            {canAccessFlexChat && (
              <Animated.View 
                style={[
                  styles.glowEffect,
                  {
                    opacity: glowAnim,
                  }
                ]}
                pointerEvents="none"
              />
            )}
          </Animated.View>
        </TouchableWithoutFeedback>
        
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.text }]}>
            {title}
            {isPremium && <Text style={styles.highlight}> Pro</Text>}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {subtitle}
          </Text>
          {/* Show availability info */}
          {aiWellnessEnabled && (
            <Text style={[styles.availabilityText, { color: theme.textSecondary }]}>
              {isPremium 
                ? '✨ AI Coach available daily' 
                : isWednesday 
                  ? '✨ AI Coach available today!' 
                  : ''
              }
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    paddingTop: 4,
    paddingHorizontal: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoContainer: {
    width: 72,
    height: 72,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  logoImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    borderRadius: 12,
    backgroundColor: 'transparent'
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  highlight: {
    color: '#4CAF50',
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  availabilityText: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  tapIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  touchIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    zIndex: 10,
  },
  touchEmoji: {
    fontSize: 32,
    transform: [{ rotate: '20deg' }],
  },
  glowEffect: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#4ade80',
    transform: [{ scale: 1.2 }],
    zIndex: -1,
  }
});

export default HomeHeader; 