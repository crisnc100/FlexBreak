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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as haptics from '../../utils/haptics';
import { useTheme } from '../../context/ThemeContext';
import * as streakManager from '../../utils/progress/modules/streakManager';
import * as flexSaveManager from '../../utils/progress/modules/flexSaveManager';
import * as storageService from '../../services/storageService';
import { LinearGradient } from 'expo-linear-gradient';
import { usePremium } from '../../context/PremiumContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as dateUtils from '../../utils/progress/modules/utils/dateUtils';
import { TimeRewind, Vortex } from '../../components/home/TimeRewind';

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
      <MaterialCommunityIcons name="timer-sand" size={Math.random() * 10 + 10} color="#2196F3" />
    </Animated.View>
  );
};

interface FlexSavePromptProps {
  onClose?: () => void;
}

const FlexSavePrompt: React.FC<FlexSavePromptProps> = ({ onClose }) => {
  const { theme, isDark, isSunset } = useTheme();
  const { isPremium } = usePremium();
  const [visible, setVisible] = useState(false);
  const [streakData, setStreakData] = useState({
    currentStreak: 0,
    flexSavesAvailable: 0
  });
  const [showTimeRewindEffect, setShowTimeRewindEffect] = useState(false);
  const [showVortex, setShowVortex] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [timeRewindElements, setTimeRewindElements] = useState<Array<{id: number, x: number, y: number, size: number, duration: number, delay: number, rotation: number, maxY: number}>>([]);
  const [userProgress, setUserProgress] = useState<any>(null);
  const [hasTodayActivity, setHasTodayActivity] = useState(false);
  const [canSaveStreak, setCanSaveStreak] = useState(false);
  
  // Animation refs
  const slideAnim = useRef(new Animated.Value(400)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const successSlideAnim = useRef(new Animated.Value(400)).current;
  const successOpacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const backgroundFlashOpacity = useRef(new Animated.Value(0)).current;
  
  // Screen dimensions for positioning
  const { width, height } = Dimensions.get('window');
  
  // Rate limiting for streak prompt - key constants
  const PROMPT_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours between prompts
  const MAX_PROMPTS_PER_DAY = 3; // Maximum 3 prompts per day
  const PROMPT_KEY = 'last_streak_prompt_time';
  const PROMPT_COUNT_KEY = 'streak_prompt_count_today';
  
  // Get user progress on component mount
  useEffect(() => {
    const loadUserProgressData = async () => {
      try {
        const progress = await storageService.getUserProgress();
        console.log('[PROMPT DEBUG] Loaded user progress at mount:', {
          level: progress?.level || 0,
          isPremium: await storageService.getIsPremium()
        });
        setUserProgress(progress);
        
        // Now check streak status after we have user progress
        checkStreak();
      } catch (error) {
        console.error('Error loading user progress:', error);
      }
    };
    
    loadUserProgressData();
  }, []);
  
  // Create TimeRewind effect for a dramatic time-rewind animation
  const createTimeRewindEffect = () => {
    // Reset animation values
    backgroundFlashOpacity.setValue(0);
    
    // Create rewind elements in a radial pattern
    const newElements = [];
    const screenWidth = width;
    const screenHeight = height;
    // Match the same vortex coordinates used in Vortex component (58% / 62%)
    const centerX = screenWidth * 0.58;
    const centerY = screenHeight * 0.62;
    
    // Number of elements to create
    const numElements = 24;
    
    // Create elements in a circular pattern
    for (let i = 0; i < numElements; i++) {
      // Calculate position on a circle
      const angle = (i / numElements) * Math.PI * 2;
      const radius = Math.min(screenWidth, screenHeight) * 0.45;
      
      // Position elements around the edge in a circle
      const startX = centerX + Math.cos(angle) * radius;
      const startY = centerY + Math.sin(angle) * radius;
      
      // Create varying sizes
      const sizeVariation = 0.7 + (Math.random() * 0.6);
      const baseSize = 20;
      
      newElements.push({
        id: i,
        x: startX,
        y: startY,
        size: baseSize * sizeVariation,
        duration: 2000 + Math.random() * 1500,
        delay: Math.random() * 800,
        rotation: 180 + Math.random() * 720,
        maxY: height
      });
    }
    
    // Add a visual vortex effect at the center
    setShowVortex(true);
    
    // Create a subtle background flash animation
    Animated.sequence([
      Animated.timing(backgroundFlashOpacity, {
        toValue: 0.3,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.timing(backgroundFlashOpacity, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic)
      })
    ]).start();
    
    setTimeRewindElements(newElements);
    setShowTimeRewindEffect(true);
    
    // Auto-hide after animation completes
    setTimeout(() => {
      setShowTimeRewindEffect(false);
      setShowVortex(false);
    }, 4000);
  };
  
  // Format the time since last prompt in a more readable way
  const formatTimeSinceLastPrompt = (ms: number): string => {
    const minutes = Math.floor(ms / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      const remainingMinutes = minutes % 60;
      return `${hours} hour${hours !== 1 ? 's' : ''} ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
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
      
    } catch (error) {
      console.error('Error updating prompt rate limits:', error);
    }
  };
  
  // Check if streak is broken and prompt user
  const checkStreak = async () => {
    try {
      // Always get fresh user progress from storage
      const freshUserProgress = await storageService.getUserProgress();
      setUserProgress(freshUserProgress);
      
      // Check if the user meets the level requirement (level 6)
      if (!freshUserProgress || freshUserProgress.level < 6) {
        return;
      }
      
      // Always get a fresh premium status directly from storage
      const directPremiumCheck = await storageService.getIsPremium();
      
      // Don't proceed if user is not premium
      if (!directPremiumCheck) {
        return;
      }
      
      // Initialize streak if needed
      if (!streakManager.streakCache.initialized) {
        await streakManager.initializeStreak();
      }
      
      // Get the streak status using the newer API
      const status = await streakManager.getStreakStatus();
      
      // Get legacy streak status for backcompat/additional checks
      const legacyStatus = await streakManager.getLegacyStreakStatus();
      
      // Get direct flexSave availability
      const flexSaveCount = await flexSaveManager.getFlexSaveCount();
      
      // Check if there's any recent activity within the past 2 weeks
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const twoWeeksAgoStr = dateUtils.formatDateYYYYMMDD(twoWeeksAgo);

      // Find most recent routine date
      const routineDates = [...streakManager.streakCache.routineDates].sort().reverse();
      const mostRecentRoutineDate = routineDates[0] || '';
      const hasRecentActivity = mostRecentRoutineDate >= twoWeeksAgoStr;
      
      // Check if streak is truly broken by checking the last 3 days
      const isTrulyBroken = await streakManager.isStreakBroken();
      
      // Check if user has completed a routine today
      const todayActivity = status.maintainedToday;
      setHasTodayActivity(todayActivity);
      
      // More detailed logs to debug today's activity issue
      const today = dateUtils.todayStringLocal();
      const yesterday = dateUtils.yesterdayStringLocal();
      
      // Check if the user has already completed a routine today
      const hasRoutineToday = await streakManager.hasRoutineToday();
      
      // Determine if user had a meaningful streak (3+) or recent activity
      const hadMeaningfulStreak = status.currentStreak >= 3 || freshUserProgress?.statistics?.bestStreak >= 3;
      
      // Even if not a meaningful streak, check for recent activity in the past 7 days
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoStr = dateUtils.formatDateYYYYMMDD(oneWeekAgo);

      // Find if there's any activity within the last week
      const hasRecentActivityLastWeek = routineDates.some(date => date >= oneWeekAgoStr);

      // Count this as valuable if there's been recent activity
      const hasValuableActivity = hadMeaningfulStreak || hasRecentActivityLastWeek;
      
      // Allow fixing streak if:
      // 1. Streak is 0 but there's recent activity OR streak > 0
      // 2. Yesterday doesn't have activity or flexSave
      // 3. Not truly broken (hasn't missed 3+ days)
      // 4. Flex Saves are available
      const canSaveFromLegacy = legacyStatus.canSaveYesterdayStreak;
      
      // Use matching logic from FlexSaveCard
      const canSave = canSaveFromLegacy && !isTrulyBroken;
      
      setCanSaveStreak(canSave);
      
      // PROMPT WILL APPEAR WHEN ALL THESE CONDITIONS ARE MET:
      // 1. Flex Saves are available (flexSaveCount > 0)
      // 2. User had a valuable streak/activity (meaningful streak or recent activity)
      // 3. Streak can be saved (only missed yesterday, not multiple days)
      // 4. User hasn't completed a routine today
      // 5. Rate limiting allows it (not shown too many times recently)
      if (flexSaveCount > 0 && hasValuableActivity && canSave && !todayActivity) {
        // Check rate limiting
        const shouldShow = await canShowPrompt();
        
        if (!shouldShow) {
          return;
        }
        
        // Update rate limits and proceed
        updatePromptRateLimits();
        
        // Set the streak data for display
        setStreakData({
          currentStreak: Math.max(status.currentStreak, freshUserProgress?.statistics?.bestStreak || 0),
          flexSavesAvailable: flexSaveCount
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
        haptics.warning();
        
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
            handleClose();
          }
        }, 2 * 60 * 1000); // 2 minutes
      }
    } catch (error) {
      console.error('Error checking streak status:', error);
    }
  };
  
  // Listen for streak broken events and updates
  useEffect(() => {
    // Subscribe to streak broken event
    const handleStreakBroken = async (data: any) => {
      // Simply call our centralized check function
      await checkStreak();
    };
    
    // Also subscribe to streak updated event to catch initialization
    const handleStreakUpdated = async (data: any) => {
      // Delayed check to ensure streak manager has fully initialized
      setTimeout(() => {
        checkStreak();
      }, 1000);
    };
    
    streakManager.streakEvents.on(streakManager.STREAK_BROKEN_EVENT, handleStreakBroken);
    streakManager.streakEvents.on('streak_updated', handleStreakUpdated);
    
    // Check again after a short delay to make sure initialization is complete
    setTimeout(() => {
      checkStreak();
    }, 2000);
    
    // Cleanup listener
    return () => {
      streakManager.streakEvents.off(streakManager.STREAK_BROKEN_EVENT, handleStreakBroken);
      streakManager.streakEvents.off('streak_updated', handleStreakUpdated);
    };
  }, []);
  
  // Get rotation transform
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  // Handle use streak flexSave
  const handleUseflexSave = async () => {  
    // Create snowflake particle effect
    createTimeRewindEffect();
    
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
    haptics.success();
    
    // Call the newer API to apply flexSave
    const result = await streakManager.applyFlexSave();
    
    if (result.success) {
      // Update the streakData with the new flexSave count from the result
      setStreakData(prevData => ({
        ...prevData,
        flexSavesAvailable: result.remainingFlexSaves
      }));
      
      // Emit the streak saved event so other components can refresh
      streakManager.streakEvents.emit(streakManager.STREAK_SAVED_EVENT, {
        currentStreak: streakData.currentStreak,
        flexSaveApplied: true,
        remainingFlexSaves: result.remainingFlexSaves
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
      console.error('Failed to save streak with flexSave.');
      
      // Provide error feedback
      haptics.error();
      
      // Close the prompt after a short delay
      setTimeout(() => {
        handleClose();
      }, 500);
    }
  };
  
  // Handle let streak break (user declines using a flexSave)
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
    haptics.warning();
    
    try {
      // No need to call letStreakBreak anymore as we've optimized the flow
      // The streak is already broken if this prompt is shown
      
      // IMPORTANT: DO NOT emit an event that marks the streak as permanently broken
      // Just close the modal without affecting streak flexSave availability
      
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
    
    // IMPORTANT: Do NOT emit a streak broken event when dismissing
    // This was causing streak flexSaves to become unavailable
    
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
  
  // Force check the streak status, bypassing rate limiting
  // This is exposed for easier testing
  const forceCheckStreak = async () => {
    try {
      // Always get fresh user progress from storage
      const freshUserProgress = await storageService.getUserProgress();
      setUserProgress(freshUserProgress);
      
      // Check if the user meets the level requirement (level 6)
      if (!freshUserProgress || freshUserProgress.level < 6) {
        return false;
      }
      
      // Also check premium status
      const directPremiumCheck = await storageService.getIsPremium();
      if (!directPremiumCheck) {
        return false;
      }
      
      // Initialize streak if needed
      if (!streakManager.streakCache.initialized) {
        await streakManager.initializeStreak();
      }
      
      // Get the streak status using the newer API
      const status = await streakManager.getStreakStatus();
      
      // Get legacy streak status for backcompat/additional checks
      const legacyStatus = await streakManager.getLegacyStreakStatus();
      
      // Check if streak is truly broken by checking the last 3 days
      const isTrulyBroken = await streakManager.isStreakBroken();
      
      // Check for recent activity
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneWeekAgoStr = dateUtils.formatDateYYYYMMDD(oneWeekAgo);

      // Find if there's any activity within the last week
      const routineDates = [...streakManager.streakCache.routineDates].sort().reverse();
      const hasRecentActivityLastWeek = routineDates.some(date => date >= oneWeekAgoStr);

      // Determine valuable activity
      const hadMeaningfulStreak = status.currentStreak >= 3 || await storageService.getUserProgress().then(progress => progress?.statistics?.bestStreak >= 3);
      const hasValuableActivity = hadMeaningfulStreak || hasRecentActivityLastWeek;
      
      // Use the same logic as regular checkStreak but bypass rate limiting
      const canSave = legacyStatus.canSaveYesterdayStreak && !isTrulyBroken;
      
      // PROMPT CONDITIONS (same as normal check but bypassing rate limiting):
      // 1. Flex Saves are available (status.flexSavesAvailable > 0)
      // 2. User had a valuable streak/activity (meaningful streak or recent activity)
      // 3. Streak can be saved (only missed yesterday, not multiple days)
      // 4. User hasn't completed a routine today
      if (status.flexSavesAvailable > 0 && hasValuableActivity && canSave && !status.maintainedToday) {
        // Set the streak data
        setStreakData({
          currentStreak: status.currentStreak || 3,
          flexSavesAvailable: status.flexSavesAvailable
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
        setCanSaveStreak(true);
        setVisible(true);
        
        // Haptic feedback
        haptics.warning();
        
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
        
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error in force checking streak:', error);
      return false;
    }
  };
  
  // Reset rate limiting data (for testing only)
  const resetRateLimiting = async () => {
    try {
      await AsyncStorage.removeItem(PROMPT_KEY);
      await AsyncStorage.removeItem(PROMPT_COUNT_KEY);
      return true;
    } catch (error) {
      console.error('Error resetting rate limiting data:', error);
      return false;
    }
  };
  
  // Expose testing functions globally
  if (typeof global !== 'undefined') {
    (global as any).forceFlexSavePrompt = forceCheckStreak;
    (global as any).resetStreakPromptRateLimits = resetRateLimiting;
  };
  
  return (
    <Modal
      visible={visible && isPremium && (userProgress?.level >= 6)}
      transparent={true}
      animationType="none"
      onRequestClose={handleClose}
    >
      <View 
        style={[
          styles.modalBackground, 
          { backgroundColor: isDark || isSunset ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.6)' }
        ]}
      >
        {/* Background flash effect */}
        <Animated.View 
          style={[
            StyleSheet.absoluteFill, 
            styles.backgroundFlash,
            { 
              opacity: backgroundFlashOpacity,
              backgroundColor: isDark || isSunset ? '#6C63FF' : '#2196F3'
            }
          ]} 
        />
        
        {/* TimeRewind particle effect */}
        {showTimeRewindEffect && (
          <View style={styles.timeRewindContainer} pointerEvents="none">
            {timeRewindElements.map(element => (
              <TimeRewind
                key={element.id}
                x={element.x}
                y={element.y}
                size={element.size}
                duration={element.duration}
                delay={element.delay}
                rotation={element.rotation}
                maxY={element.maxY}
                color={isDark || isSunset ? '#6C63FF' : '#2196F3'}
                targetX={width * 0.50}
                targetY={height * 0.58}
              />
            ))}
          </View>
        )}
        
        {/* Center vortex effect */}
        {showVortex && (
          <Vortex
            visible={showVortex}
            size={120}
            color={isDark || isSunset ? '#6C63FF' : '#2196F3'}
            duration={3000}
          />
        )}
        
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
              colors={['#2196F3', '#1976D2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.successGradient}
            >
              <Ionicons name="shield-checkmark" size={40} color="#FFFFFF" />
              <Text style={styles.successTitle}>Streak Saved!</Text>
              <Text style={styles.successMessage}>
                Your streak is preserved. Complete a routine today to continue your streak!
              </Text>
            </LinearGradient>
          </Animated.View>
        )}
        
        {/* Main prompt */}
        <Animated.View 
          style={[
            styles.container, 
            { 
              backgroundColor: isDark || isSunset ? theme.cardBackground : '#FFF',
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
              <MaterialCommunityIcons 
                name="timer-sand" 
                size={28} 
                color={'#2196F3'} 
              />
            </Animated.View>
            <Text style={[styles.title, { color: theme.text }]}>Flex Save</Text>
          </View>
          
          <View style={styles.content}>
            <Text style={[styles.message, { color: theme.text }]}>
              {canSaveStreak ? (
                `You missed yesterday's stretch and your streak is at risk. Use a Flex Save to preserve it!`
              ) : (
                `Your ${streakData.currentStreak}-day streak can't be saved because you've missed more than one day.`
              )}
            </Text>
            
            <View style={[
              styles.flexSaveInfo, 
              { 
                backgroundColor: isDark || isSunset 
                  ? 'rgba(33, 150, 243, 0.1)' 
                  : 'rgba(33, 150, 243, 0.1)' 
              }
            ]}>
              <Ionicons 
                name="information-circle" 
                size={20} 
                color={'#2196F3'} 
              />
              <Text style={[styles.flexSaveText, { color: theme.text }]}>
                {canSaveStreak ? (
                  `You have ${streakData.flexSavesAvailable} ${streakData.flexSavesAvailable === 1 ? 'Flex Save' : 'Flex Saves'} available.`
                ) : (
                  "Flex saves only work for 1-day gaps. Complete a routine today to start fresh!"
                )}
              </Text>
            </View>
          </View>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.denyButton,
                { backgroundColor: isDark || isSunset ? 'rgba(255,255,255,0.08)' : '#F5F5F5' }
              ]}
              onPress={handleLetStreakBreak}
            >
              <Text style={[
                styles.buttonText,
                { color: isDark || isSunset ? 'rgba(255,255,255,0.8)' : '#757575' }
              ]}>
                Not now
              </Text>
            </TouchableOpacity>
            
            {canSaveStreak && (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.acceptButton,
                  { backgroundColor: '#2196F3' }
                ]}
                onPress={handleUseflexSave}
              >
                <Text style={styles.buttonText}>
                  Use FlexSave
                </Text>
                <View style={styles.buttonBadgeContainer}>
                  <Text style={styles.buttonBadge}>
                    {streakData.flexSavesAvailable}
                  </Text>
                </View>
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
    width: '90%',
    maxWidth: 360,
    borderRadius: 20,
    backgroundColor: '#FFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
    paddingTop: 16,
  },
  message: {
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  flexSaveInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  flexSaveText: {
    marginLeft: 10,
    fontSize: 15,
    flex: 1,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    justifyContent: 'space-between',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    flexDirection: 'row',
  },
  denyButton: {
    backgroundColor: '#F5F5F5',
  },
  acceptButton: {
    backgroundColor: '#2196F3',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonBadgeContainer: {
    marginLeft: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonBadge: {
    color: '#2196F3',
    fontSize: 12,
    fontWeight: 'bold',
  },
  snowflakeContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  successContainer: {
    width: '90%',
    maxWidth: 360,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  successGradient: {
    padding: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
  },
  successMessage: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.95,
    lineHeight: 24,
  },
  backgroundFlash: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  timeRewindContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
    pointerEvents: 'none',
  },
});

export default FlexSavePrompt; 