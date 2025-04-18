import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  Animated, 
  Dimensions,
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../../context/ThemeContext';
import * as streakManager from '../../utils/progress/modules/streakManager';
import * as streakFreezeManager from '../../utils/progress/modules/streakFreezeManager';
import * as storageService from '../../services/storageService';
import { LinearGradient } from 'expo-linear-gradient';
import { usePremium } from '../../context/PremiumContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Snowflake component that animates from a central source outward with various effects
const Snowflake: React.FC<{
  x: number;
  y: number;
  delay: number;
  duration: number;
  scale: number;
}> = ({ x, y, delay, duration, scale }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const positionY = useRef(new Animated.Value(0)).current;
  const positionX = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    // Sequence of animations for each snowflake
    Animated.sequence([
      // Delay the start of each snowflake animation
      Animated.delay(delay),
      // Start all animations in parallel
      Animated.parallel([
        // Fade in quickly then fade out
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: duration * 0.2,
          useNativeDriver: true,
        }),
        // Move in a random horizontal direction
        Animated.timing(positionX, {
          toValue: (Math.random() - 0.5) * 120,
          duration: duration,
          easing: Easing.out(Easing.circle),
          useNativeDriver: true,
        }),
        // Move upward then downward in a natural motion
        Animated.timing(positionY, {
          toValue: Math.random() * 160 - 80,
          duration: duration,
          easing: Easing.out(Easing.circle),
          useNativeDriver: true,
        }),
        // Rotate snowflake during movement
        Animated.timing(rotateAnim, {
          toValue: Math.random() > 0.5 ? 1 : -1,
          duration: duration,
          useNativeDriver: true,
        }),
        // Scale up then gradually down
        Animated.timing(scaleAnim, {
          toValue: scale,
          duration: duration * 0.3,
          useNativeDriver: true,
        }),
      ]),
      // Fade out at the end
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: duration * 0.3,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  const rotation = rotateAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-180deg', '180deg'],
  });
  
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity: fadeAnim,
        transform: [
          { translateX: positionX },
          { translateY: positionY },
          { rotate: rotation },
          { scale: scaleAnim },
        ],
      }}
    >
      <Ionicons name="snow-outline" size={Math.random() * 10 + 10} color="#90CAF9" />
    </Animated.View>
  );
};

interface StreakFreezePromptProps {
  onClose?: () => void;
}

const StreakFreezePrompt: React.FC<StreakFreezePromptProps> = ({ onClose }) => {
  const { theme, isDark } = useTheme();
  const { isPremium } = usePremium();
  const [visible, setVisible] = useState(false);
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    freezesAvailable: 0
  });
  const [showSnowflakes, setShowSnowflakes] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [snowflakePositions, setSnowflakePositions] = useState<Array<{x: number, y: number, delay: number, duration: number, scale: number}>>([]);
  const [userProgress, setUserProgress] = useState(null);
  const [hasTodayActivity, setHasTodayActivity] = useState(false);
  const [canSaveStreak, setCanSaveStreak] = useState(false);
  
  // Animation refs
  const slideAnim = useRef(new Animated.Value(400)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const successSlideAnim = useRef(new Animated.Value(400)).current;
  const successOpacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  // Screen dimensions for positioning
  const { width, height } = Dimensions.get('window');
  
  // Rate limiting for streak prompt - key constants
  const PROMPT_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours between prompts
  const MAX_PROMPTS_PER_DAY = 3; // Maximum 3 prompts per day
  const PROMPT_KEY = 'last_streak_prompt_time';
  const PROMPT_COUNT_KEY = 'streak_prompt_count_today';
  
  // Get user progress on component mount
  useEffect(() => {
    const loadUserProgress = async () => {
      try {
        const progress = await storageService.getUserProgress();
        setUserProgress(progress);
      } catch (error) {
        console.error('Error loading user progress:', error);
      }
    };
    
    loadUserProgress();
  }, []);
  
  // Snow sparkle effect
  const createSnowflakeEffect = () => {
    const positions = [];
    const centerX = width / 2;
    const centerY = height / 2 - 100; // Position based on modal center
    
    // Create 24 random snowflakes
    for (let i = 0; i < 24; i++) {
      positions.push({
        x: centerX - 50 + Math.random() * 100,
        y: centerY - 50 + Math.random() * 100,
        delay: Math.random() * 300,
        duration: 1000 + Math.random() * 1500,
        scale: 0.5 + Math.random() * 1.5
      });
    }
    
    setSnowflakePositions(positions);
    setShowSnowflakes(true);
    
    // Hide snowflakes after animation completes
    setTimeout(() => {
      setShowSnowflakes(false);
    }, 3000);
  };
  
  // Check if we can show the prompt based on rate limiting
  const canShowPrompt = async () => {
    try {
      // Get the last time the prompt was shown
      const lastPromptTimeStr = await AsyncStorage.getItem(PROMPT_KEY);
      const lastPromptTime = lastPromptTimeStr ? parseInt(lastPromptTimeStr, 10) : 0;
      
      // Get the count of prompts shown today
      const todayStartTime = new Date();
      todayStartTime.setHours(0, 0, 0, 0);
      
      // Reset the count if it's from a previous day
      const countStr = await AsyncStorage.getItem(PROMPT_COUNT_KEY);
      let promptCount = 0;
      let countDate = 0;
      
      if (countStr) {
        const countData = JSON.parse(countStr);
        promptCount = countData.count || 0;
        countDate = countData.date || 0;
      }
      
      // If the count is from a previous day, reset it
      if (countDate < todayStartTime.getTime()) {
        promptCount = 0;
      }
      
      // Check if we're within the cooldown period
      const now = Date.now();
      const timeSinceLastPrompt = now - lastPromptTime;
      
      // We can show if:
      // 1. We haven't shown it today yet OR
      // 2. It's been long enough since the last prompt AND
      // 3. We haven't exceeded the maximum number of prompts for today
      const canShow = 
        (lastPromptTimeStr === null) || 
        (timeSinceLastPrompt > PROMPT_COOLDOWN_MS && promptCount < MAX_PROMPTS_PER_DAY);
      
      console.log('Streak prompt rate limiting check:', {
        lastPromptTime: new Date(lastPromptTime).toLocaleString(),
        timeSinceLastPrompt: Math.floor(timeSinceLastPrompt / 1000 / 60) + ' minutes',
        promptCount,
        canShow
      });
      
      return canShow;
    } catch (error) {
      console.error('Error checking prompt rate limits:', error);
      return true; // Default to showing if there's an error
    }
  };
  
  // Update the prompt count and last shown time
  const updatePromptRateLimits = async () => {
    try {
      const now = Date.now();
      await AsyncStorage.setItem(PROMPT_KEY, now.toString());
      
      // Get current count for today
      const todayStartTime = new Date();
      todayStartTime.setHours(0, 0, 0, 0);
      
      const countStr = await AsyncStorage.getItem(PROMPT_COUNT_KEY);
      let promptCount = 0;
      let countDate = todayStartTime.getTime();
      
      if (countStr) {
        const countData = JSON.parse(countStr);
        // Only use the count if it's from today
        if (countData.date >= todayStartTime.getTime()) {
          promptCount = countData.count || 0;
        }
      }
      
      // Increment the count
      promptCount += 1;
      
      // Save the new count
      await AsyncStorage.setItem(PROMPT_COUNT_KEY, JSON.stringify({
        count: promptCount,
        date: countDate
      }));
      
      console.log('Updated streak prompt rate limits:', {
        lastShownTime: new Date(now).toLocaleString(),
        todayCount: promptCount
      });
    } catch (error) {
      console.error('Error updating prompt rate limits:', error);
    }
  };
  
  // Check if streak is broken and prompt user
  const checkStreak = async () => {
    try {
      // Always get a fresh premium status directly from storage
      const directPremiumCheck = await storageService.getIsPremium();
      
      console.log('StreakFreezePrompt - Direct premium check:', directPremiumCheck);
      
      // Initialize streak if needed
      if (!streakManager.streakCache.initialized) {
        await streakManager.initializeStreak();
      }
      
      // Get the streak status
      const status = await streakManager.getStreakStatus();
      
      // Get freeze availability
      const freezeAvailable = await streakFreezeManager.isFreezeAvailable();
      
      // Get legacy streak status for backwards compatibility
      const legacyStatus = await streakManager.getLegacyStreakStatus();
      
      // Check if streak is truly broken by checking the last 3 days
      const isTrulyBroken = await streakManager.isStreakBroken();
      
      // Check if user has completed a routine today
      const todayActivity = status.maintainedToday;
      setHasTodayActivity(todayActivity);
      
      console.log('Streak freeze prompt check:', {
        uiStreak: status.currentStreak,
        legacyStreakBroken: legacyStatus.streakBroken,
        canSaveYesterday: legacyStatus.canSaveYesterdayStreak,
        isTrulyBroken,
        todayActivity,
        freezesAvailable: status.freezesAvailable
      });

      // The key check should be canSaveYesterdayStreak from legacyStatus
      // This applies even when the UI still shows a streak number
      // This is what StreakFreezeCard uses as the primary check
      const hadMeaningfulStreak = status.currentStreak >= 3 || userProgress?.statistics?.bestStreak >= 3;
      const canSave = legacyStatus.canSaveYesterdayStreak && !isTrulyBroken && !todayActivity;
      
      setCanSaveStreak(canSave);
      
      // Show prompt if:
      // 1. There are streak freezes available
      // 2. User had a meaningful streak (3+ days)
      // 3. We can save yesterday's streak (missing activity yesterday)
      // 4. Streak is not truly broken (not missing more than 2 days)
      // 5. No activity today (can't save after starting new streak)
      // 6. Rate limiting allows it
      if (status.freezesAvailable > 0 && hadMeaningfulStreak && freezeAvailable && canSave) {
        // First check if we should show the prompt based on rate limiting
        const shouldShow = await canShowPrompt();
        
        if (!shouldShow) {
          console.log('Not showing streak prompt due to rate limiting');
          return;
        }
        
        // Show and track the prompt
        updatePromptRateLimits();
        
        setStreakData({
          currentStreak: status.currentStreak,
          freezesAvailable: status.freezesAvailable
        });
        
        // Start rotation animation for snowflake icon
        Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 8000,
            useNativeDriver: true,
          })
        ).start();
        
        // Show the prompt
        setVisible(true);
        
        // Vibrate to get user attention
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        
        // Animate in
        Animated.parallel([
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
          })
        ]).start();

        // Auto-dismiss after 2 minutes if user doesn't interact with it
        const autoDismissTimeout = setTimeout(() => {
          if (visible) {
            console.log('Auto-dismissing streak prompt after timeout');
            handleClose();
          }
        }, 2 * 60 * 1000); // 2 minutes
      } else {
        console.log('Not showing streak prompt - conditions not met:', {
          freezesAvailable: status.freezesAvailable,
          currentStreak: status.currentStreak,
          hadMeaningfulStreak,
          isTrulyBroken,
          todayActivity,
          canSave
        });
      }
    } catch (error) {
      console.error('Error checking streak status:', error);
    }
  };
  
  // Listen for streak broken events
  useEffect(() => {
    // Check streak status on mount
    checkStreak();
    
    // Subscribe to streak broken event
    const handleStreakBroken = async (data: any) => {
      // Simply call our centralized check function
      await checkStreak();
    };
    
    streakManager.streakEvents.on(streakManager.STREAK_BROKEN_EVENT, handleStreakBroken);
    
    // Cleanup listener
    return () => {
      streakManager.streakEvents.off(streakManager.STREAK_BROKEN_EVENT, handleStreakBroken);
    };
  }, []);
  
  // Get rotation transform
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  // Handle use streak freeze
  const handleUseStreakFreeze = async () => {
    // Create snowflake particle effect
    createSnowflakeEffect();
    
    // Shake and pulse animation for feedback
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
    
    // Animate out the prompt content
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
    
    // Provide haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    // Save streak with freeze using the new implementation
    const result = await streakManager.applyFreeze();
    
    if (result.success) {
      console.log('Streak saved with freeze!');
      
      // Emit the streak saved event so other components can refresh
      streakManager.streakEvents.emit(streakManager.STREAK_SAVED_EVENT, {
        currentStreak: streakData.currentStreak,
        freezeApplied: true
      });
      
      // Show success message
      setShowSuccess(true);
      
      // Animate in the success message
      Animated.parallel([
        Animated.timing(successSlideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true
        }),
        Animated.timing(successOpacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        })
      ]).start();
      
      // Wait for animation to complete
      setTimeout(() => {
        handleClose();
      }, 2500);
    } else {
      console.log('Failed to save streak with freeze.');
      handleClose();
    }
  };
  
  // Handle let streak break (user declines using a freeze)
  const handleLetStreakBreak = async () => {
    // Animate out
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 50,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
    
    // Provide haptic feedback
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    
    try {
      // No need to call letStreakBreak anymore as we've optimized the flow
      // The streak is already broken if this prompt is shown
      console.log('User declined to use streak freeze');
      
      // Just emit an event for any listeners
      streakManager.streakEvents.emit(streakManager.STREAK_BROKEN_EVENT, {
        currentStreak: 0,
        previousStreak: streakData.currentStreak
      });
      
      setTimeout(() => {
        setVisible(false);
        if (onClose) onClose();
      }, 300);
    } catch (error) {
      console.error('Error handling streak break:', error);
      setVisible(false);
    }
  };
  
  // Handle close
  const handleClose = () => {
    // Reset animations
    successOpacityAnim.setValue(0);
    successSlideAnim.setValue(400);
    
    // Animate out
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 300,
        useNativeDriver: true
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      })
    ]).start(() => {
      setVisible(false);
      setShowSuccess(false);
      if (onClose) onClose();
    });
  };
  
  return (
    <Modal
      visible={visible && isPremium}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View 
        style={[
          styles.modalBackground, 
          { backgroundColor: isDark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)' }
        ]}
      >
        {/* Snowflake particle effect */}
        {showSnowflakes && snowflakePositions.map((pos, index) => (
          <Snowflake 
            key={index}
            x={pos.x}
            y={pos.y}
            delay={pos.delay}
            duration={pos.duration}
            scale={pos.scale}
          />
        ))}
        
        {/* Success message */}
        {showSuccess && (
          <Animated.View 
            style={[
              styles.successContainer,
              {
                opacity: successOpacityAnim,
                transform: [{ translateY: successSlideAnim }]
              }
            ]}
          >
            <LinearGradient
              colors={['#2196F3', '#4CAF50']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.successGradient}
            >
              <Ionicons name="checkmark-circle" size={40} color="#FFFFFF" />
              <Text style={styles.successTitle}>Streak Saved!</Text>
              <Text style={styles.successMessage}>
                Your {streakData.currentStreak}-day streak is preserved. Complete a routine today to continue your streak!
              </Text>
            </LinearGradient>
          </Animated.View>
        )}
        
        {/* Main prompt */}
        <Animated.View 
          style={[
            styles.container, 
            { 
              backgroundColor: isDark ? theme.cardBackground : '#FFF',
              transform: [
                { translateY: slideAnim },
                { scale: scaleAnim }
              ],
              opacity: opacityAnim
            }
          ]}
        >
          <View style={styles.header}>
            <Animated.View style={{ transform: [{ rotate }] }}>
              <Ionicons 
                name="snow" 
                size={28} 
                color={isDark ? '#90CAF9' : theme.accent} 
              />
            </Animated.View>
            <Text style={[styles.title, { color: theme.text }]}>Streak at Risk!</Text>
          </View>
          
          <View style={styles.content}>
            <Text style={[styles.message, { color: theme.text }]}>
              {hasTodayActivity ? (
                "You've already completed a routine today! Your streak will start fresh."
              ) : canSaveStreak ? (
                `You missed yesterday's exercise and your ${streakData.currentStreak}-day streak is at risk. Use a streak freeze to preserve your progress!`
              ) : (
                `Your ${streakData.currentStreak}-day streak can't be saved because you've missed more than one day.`
              )}
            </Text>
            
            <View style={[
              styles.freezeInfo, 
              { 
                backgroundColor: isDark 
                  ? 'rgba(144, 202, 249, 0.1)' 
                  : 'rgba(144, 202, 249, 0.2)' 
              }
            ]}>
              <Ionicons 
                name="information-circle" 
                size={20} 
                color={isDark ? '#90CAF9' : theme.accent} 
              />
              <Text style={[styles.freezeText, { color: theme.text }]}>
                {canSaveStreak ? (
                  `You have ${streakData.freezesAvailable} streak ${streakData.freezesAvailable === 1 ? 'freeze' : 'freezes'} available.`
                ) : hasTodayActivity ? (
                  "Complete today's routine to start a new streak!"
                ) : (
                  "Streak freezes only work for 1-day gaps. Complete a routine today to start fresh!"
                )}
              </Text>
            </View>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.denyButton,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEEEEE' }
              ]}
              onPress={handleLetStreakBreak}
            >
              <Text style={[
                styles.buttonText,
                { color: isDark ? 'rgba(255,255,255,0.7)' : '#757575' }
              ]}>
                {hasTodayActivity ? 'Got it' : 'No thanks'}
              </Text>
            </TouchableOpacity>
            
            {canSaveStreak && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.acceptButton,
                  { backgroundColor: theme.accent }
                ]}
                onPress={handleUseStreakFreeze}
              >
                <Text style={styles.buttonText}>
                  Use Streak Freeze
                </Text>
                <Text style={styles.buttonBadge}>
                  {streakData.freezesAvailable}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  container: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 16,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  content: {
    padding: 16,
  },
  message: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  freezeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  freezeText: {
    marginLeft: 8,
    fontSize: 14,
    flex: 1,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    flexDirection: 'row',
  },
  denyButton: {
    backgroundColor: '#EEEEEE',
  },
  acceptButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonBadge: {
    marginLeft: 4,
    backgroundColor: '#FFFFFF',
    color: '#2196F3',
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
    lineHeight: 20,
    overflow: 'hidden',
  },
  snowflakeContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  successContainer: {
    width: '85%',
    maxWidth: 340,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  successGradient: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
  },
  successMessage: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  }
});

export default StreakFreezePrompt; 