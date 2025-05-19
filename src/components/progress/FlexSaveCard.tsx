import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ActivityIndicator, 
  Animated, 
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as flexSaveManager from '../../utils/progress/modules/flexSaveManager';
import * as streakManager from '../../utils/progress/modules/streakManager';
import { useFeatureAccess } from '../../hooks/progress/useFeatureAccess';
import { usePremium } from '../../context/PremiumContext';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';
import * as featureAccessUtils from '../../utils/featureAccessUtils';
import * as dateUtils from '../../utils/progress/modules/utils/dateUtils'

// Snowflake component for animation
const Snowflake = ({ x, y, size, duration, delay, rotation }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(translateY, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true
        }),
        Animated.timing(translateX, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true
        }),
        Animated.timing(rotate, {
          toValue: 1,
          duration: duration,
          useNativeDriver: true
        })
      ]),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        delay: duration - 300,
        useNativeDriver: true
      })
    ]).start();
  }, []);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${rotation}deg`]
  });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity,
        transform: [
          { translateY: translateY.interpolate({ inputRange: [0, 1], outputRange: [0, 60] }) },
          { translateX: translateX.interpolate({ inputRange: [0, 1], outputRange: [0, x > 0 ? 30 : -30] }) },
          { rotate: rotateInterpolate },
          { scale }
        ]
      }}
    >
      <MaterialCommunityIcons name="timer-sand" size={size} color="#90CAF9" />
    </Animated.View>
  );
};

interface FlexSaveCardProps {
  currentStreak: number;
  isDark?: boolean;
  isSunset?: boolean;
}

const FlexSaveCard: React.FC<FlexSaveCardProps> = ({ 
  currentStreak,
  isDark: propIsDark,
  isSunset: propIsSunset
}) => {
  const { theme, isDark: contextIsDark, isSunset: contextIsSunset } = useTheme();
  // Use the prop value if provided, otherwise fall back to context
  const isDark = propIsDark !== undefined ? propIsDark : contextIsDark;
  const isSunset = propIsSunset !== undefined ? propIsSunset : contextIsSunset;
  const [isLoading, setIsLoading] = useState(true);
  const [flexSaveCount, setFlexSaveCount] = useState(0);
  const [isStreakBroken, setIsStreakBroken] = useState(false);
  const [recentlySaved, setRecentlySaved] = useState(false);
  const [canSaveStreak, setCanSaveStreak] = useState(false);
  const [showSnowflakes, setShowSnowflakes] = useState(false);
  const [snowflakes, setSnowflakes] = useState([]);
  const [hasTodayActivity, setHasTodayActivity] = useState(false);
  const { canAccessFeature, meetsLevelRequirement, getRequiredLevel } = useFeatureAccess();
  const { isPremium } = usePremium();
  
  // Animation references
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const flexSaveCounterAnim = useRef(new Animated.Value(1)).current;
  
  // Screen dimensions for animations
  const { width } = Dimensions.get('window');
  
  // Cache for streak status
  const streakStatusCache = useRef({
    lastChecked: 0,
    data: null,
    ttl: 10000 // 10 seconds cache TTL
  });
  
  // Check flexSave data on mount
  useEffect(() => {
    loadFlexSaveData();
  }, []);
  
  // Update when streak changes
  useEffect(() => {
    console.log('Current streak changed to:', currentStreak);
    // Force a complete reload of data when streak changes
    loadFlexSaveData(true);
  }, [currentStreak]);
  
  // Listen for streak events from other components (like the FlexSavePrompt)
  useEffect(() => {
    // When a streak is saved via the prompt, update our local state
    const handleStreakSaved = (data: any) => {
      console.log('FlexSaveCard received streak saved event:', data);
      
      // Update our state to reflect the saved streak
      setRecentlySaved(true);
      setCanSaveStreak(false);
      
      // This was from another component, so show the snowflake effect for consistency
      if (data.flexSaveApplied) {
        createSnowflakeEffect();
      }
      
      // Refresh our data to get the latest streak flexSave count
      loadFlexSaveData(true);
    };
    
    // When a streak is intentionally broken, update our state
    const handleStreakBroken = (data: any) => {
      // Only handle user initiated resets (like from the prompt)
      if (data.userReset) {
        console.log('FlexSaveCard received user streak reset event');
        loadFlexSaveData(true);
      }
    };
    
    // Subscribe to events
    streakManager.streakEvents.on(streakManager.STREAK_SAVED_EVENT, handleStreakSaved);
    streakManager.streakEvents.on(streakManager.STREAK_BROKEN_EVENT, handleStreakBroken);
    
    // Clean up event listeners on unmount
    return () => {
      streakManager.streakEvents.off(streakManager.STREAK_SAVED_EVENT, handleStreakSaved);
      streakManager.streakEvents.off(streakManager.STREAK_BROKEN_EVENT, handleStreakBroken);
    };
  }, []); // Empty dependency array since we want this to run only once
  
  // Create snowflake effect
  const createSnowflakeEffect = () => {
    // Reduce the number of snowflakes from 12 to 8 for better performance
    const numSnowflakes = 8;
    const newSnowflakes = [];
    
    for (let i = 0; i < numSnowflakes; i++) {
      newSnowflakes.push({
        id: i,
        x: Math.random() * width * 0.8,
        y: -10 - Math.random() * 20,
        size: 14 + Math.random() * 10,
        duration: 1800 + Math.random() * 1000, // Slightly slower for smoother animation
        delay: Math.random() * 400,
        rotation: Math.random() * 360
      });
    }
    
    setSnowflakes(newSnowflakes);
    setShowSnowflakes(true);
    
    // Auto-hide after animation completes
    setTimeout(() => {
      setShowSnowflakes(false);
    }, 3500); // Give more time for animations to complete
  };
  
  // Load flexSave data
  const loadFlexSaveData = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      console.log('Loading streak flexSave data...', forceRefresh ? '(force refresh)' : '');
      
      // If this is an initial load (not after using a streak flexSave), check for monthly refill
      if (canAccessFeature('flex_saves') && !forceRefresh) {
        await flexSaveManager.refillFlexSaves();
      }
      
      // If we recently saved a streak, never load the data again 
      // This prevents overwriting our UI state with potentially inconsistent data
      if (recentlySaved && forceRefresh) {
        console.log('Skipping refresh as streak was recently saved');
        setIsLoading(false);
        return;
      }
      
      // Get direct confirmation from storage for current state
      const streakStatus = await streakManager.getStreakStatus();
      const count = streakStatus.flexSavesAvailable;
      
      // For additional validation, get the direct count from storage as well
      const directCount = await flexSaveManager.getFlexSavesAvailable();
      
      // If there's a mismatch, log it for debugging but use the streakManager's value
      if (count !== directCount) {
        console.log(`[FLEXSAVE DEBUG] Mismatch in flexSave counts: streakManager=${count}, direct=${directCount}, using streakManager value`);
      }
      
      // Only update the UI if we're not in a recently saved state
      if (!recentlySaved) {
        console.log(`Loaded flexSave count: ${count}/2`);
        setFlexSaveCount(count);
      } else {
        console.log(`Skipping UI update for streak flexSave count: ${count}/2`);
      }
      
      // Start animation
      startPulseAnimation();
      
      // Check if a streak flexSave was recently applied
      const wasUsedToday = await flexSaveManager.wasFlexSaveAppliedRecently();
      console.log('Was streak flexSave used recently?', wasUsedToday);
      
      // Only update recentlySaved if it's not already true
      if (!recentlySaved) {
        setRecentlySaved(wasUsedToday);
      }
      
      // Check if streak needs saving
      await checkStreakStatus();
    } catch (error) {
      console.error('Error loading streak flexSaveveveveveve data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check if streak is broken and should be saved
  const checkStreakStatus = async () => {
    try {
      // Check if we have a valid cache
      const now = Date.now();
      if (streakStatusCache.current.data && 
          now - streakStatusCache.current.lastChecked < streakStatusCache.current.ttl) {
        const cachedStatus = streakStatusCache.current.data;
        setIsStreakBroken(cachedStatus.streakBroken);
        setCanSaveStreak(cachedStatus.canSaveYesterdayStreak);
        
        // Start animations if streak is at risk
        if (cachedStatus.streakBroken && !recentlySaved) {
          startPulseAnimation();
          startRotateAnimation();
        }
        return;
      }
      
      // Get the legacy streak status for backward compatibility
      const status = await streakManager.getLegacyStreakStatus();
      
      // Also get the new streak status format for proper data
      const newStatus = await streakManager.getStreakStatus();
      
      // Check if streak is truly broken by checking the last 3 days
      const isTrulyBroken = await streakManager.isStreakBroken();
      console.log('Streak flexSaveveveve card - isTrulyBroken check:', isTrulyBroken);
      
      // CHECK FOR SPECIFIC MULTI-DAY GAP ISSUE
      // Get dates to check recent activity
      const todayStr = dateUtils.todayStringLocal();
      const yesterdayStr = dateUtils.yesterdayStringLocal()
      const twoDaysAgoStr = dateUtils.getDaysAgoString(2);
      
      // Get the sorted routine dates to check for gaps
      const routineDates = [...streakManager.streakCache.routineDates].sort().reverse();
      
      // Check if today has activity
      const hasTodayActivity = routineDates.includes(todayStr);
      
      // Check for activity on yesterday and two days ago
      const hasYesterdayActivity = routineDates.includes(yesterdayStr) || 
                                 streakManager.streakCache.flexSaveDates.includes(yesterdayStr);
      const hasTwoDaysAgoActivity = routineDates.includes(twoDaysAgoStr) || 
                                  streakManager.streakCache.flexSaveDates.includes(twoDaysAgoStr);
      
      // If there's no activity for yesterday AND no activity for two days ago, it's a multi-day gap
      const hasMultiDayGap = !hasYesterdayActivity && !hasTwoDaysAgoActivity;
      
     
      
      // Cache the result
      streakStatusCache.current = {
        lastChecked: now,
        data: status,
        ttl: 10000
      };
      
      // Update UI based on legacy status
      setIsStreakBroken(status.streakBroken);
      
      // Check if user has completed a routine today
      const todayActivity = newStatus.maintainedToday;
      setHasTodayActivity(todayActivity);
      
    
      
      // Current logic - prevents showing apply button if user did activity today
      const originalCanSave = status.canSaveYesterdayStreak && !isTrulyBroken && !todayActivity;
      
      // New logic - would allow applying flexSave even if there's activity today
      const newLogicCanSave = status.canSaveYesterdayStreak && !isTrulyBroken;
      

      
      // Only allow saving if:
      // 1. It's technically savable based on legacy status (missed only 1 day)
      // 2. AND we haven't missed more than 2 days (not truly broken)
      // 3. AND we don't have a multi-day gap
      // 4. Remove the restriction that prevents applying if user has completed a routine today
      //    This allows users to restore their previous streak even if they've already started a new one
      
      // When a streak is truly broken, we don't want to show the apply button
      // Also don't show if there's a multi-day gap
      setCanSaveStreak(
        status.canSaveYesterdayStreak && 
        !isTrulyBroken &&
        !hasMultiDayGap
      );
      
      // Start animations only if streak can actually be saved
      if (status.streakBroken && !recentlySaved && status.canSaveYesterdayStreak && !isTrulyBroken && !hasMultiDayGap) {
        startPulseAnimation();
        startRotateAnimation();
      }
      
      console.log(`FlexSaveCard: Retrieved streak status: ${status.streakBroken ? 'BROKEN' : 'ACTIVE'}, streak=${newStatus.currentStreak}, truly broken=${isTrulyBroken}, today activity=${todayActivity}`);
    } catch (error) {
      console.error('Error checking streak status in FlexSaveCard:', error);
    }
  };
  
  // Animation for pulse effect
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true
        })
      ])
    ).start();
  };
  
  const startRotateAnimation = () => {
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true
      })
    ).start();
  };
  
  const startShakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
  };
  
  // Animate the flexSave counter change
  const animateFlexSaveCountChange = (oldCount, newCount) => {
    // Scale down and up animation
    Animated.sequence([
      Animated.timing(flexSaveCounterAnim, {
        toValue: 0.7,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(flexSaveCounterAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(flexSaveCounterAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true
      })
    ]).start();
  };
  
  // Button pulse animation
  const pulseButton = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(buttonScaleAnim, {
          toValue: 1.05,
          duration: 600,
          useNativeDriver: true
        }),
        Animated.timing(buttonScaleAnim, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true
        })
      ])
    ).start();
  };
  
  // Handle applying a streak flexSave
  const handleApplyFlexSave = async () => {
    if (!canSaveStreak) {
      console.log('Cannot apply streak flexSave because canSaveStreak is false. Current conditions:', {
        streakBroken: isStreakBroken,
        hasTodayActivity,
        recentlySaved,
        flexSaveCount,
        currentStreak
      });
      return;
    }
    
    console.log('Applying streak flexSave with conditions:', {
      streakBroken: isStreakBroken,
      hasTodayActivity,
      recentlySaved,
      flexSaveCount,
      currentStreak
    });
    
    try {
      // Disable the button immediately to prevent double-tap
      setCanSaveStreak(false);
      
      // Trigger the snowflake animation
      createSnowflakeEffect();
      
      // Show loading indicator
      setIsLoading(true);
      
      // Scale down the button animation
      Animated.sequence([
        Animated.timing(buttonScaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true
        }),
        Animated.timing(buttonScaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true
        })
      ]).start();
      
      // Apply the streak flexSave with a small artificial delay
      // to ensure animations have time to play smoothly
      setTimeout(async () => {
        console.log('Calling applyFlexSave() from handleApplyFlexSave...');
        const result = await streakManager.applyFlexSave();
        
        console.log('Apply flexSave result:', result);
        
        if (result.success) {
          // Apply quick haptic feedback on success
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          
          // Update the flexSave count immediately with the result
          setFlexSaveCount(result.remainingFlexSaves);
          
          // Animate the flexSave counter to show it decreased
          Animated.sequence([
            Animated.timing(flexSaveCounterAnim, {
              toValue: 0.5,
              duration: 300,
              useNativeDriver: true
            }),
            Animated.timing(flexSaveCounterAnim, {
              toValue: 1.2,
              duration: 400,
              useNativeDriver: true
            }),
            Animated.timing(flexSaveCounterAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true
            })
          ]).start();
          
          // Set state to show saved message
          setRecentlySaved(true);
          setIsLoading(false);
        } else {
          console.error('Failed to apply streak flexSave');
          console.log('FlexSave apply failure details:', {
            currentStreak,
            flexSaveCount,
            remainingFlexSaves: result.remainingFlexSaves
          });
          // Show error feedback
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          setIsLoading(false);
        }
        
        // Reload streak status
        await checkStreakStatus();
      }, 400); // Small delay for smoother animation sequence
      
    } catch (error) {
      console.error('Error applying streak flexSave:', error);
      setIsLoading(false);
    }
  };
  
  // Get rotation interpolation
  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  // Update the saved message content for clarity and better UX
  const SavedMessage = () => (
    <View style={[
      styles.savedMessageContainer,
      { backgroundColor: isDark || isSunset ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)' }
    ]}>
      <Ionicons 
        name="shield-checkmark" 
        size={18} 
        color="#4CAF50" 
        style={styles.savedIcon}
      />
      <View>
        <Text style={[styles.savedMessageTitle, { color: isDark || isSunset ? '#81C784' : '#4CAF50' }]}>
          Streak Protected!
        </Text>
        <Text style={[styles.savedMessage, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
          Your {currentStreak}-day streak is safe! Complete a routine today to keep it going.
        </Text>
      </View>
    </View>
  );
  
  // Render locked state for non-premium users or users below required level
  if (!isPremium || !meetsLevelRequirement('flex_saves')) {
    // Double-check premium status using the more reliable method
    const checkFeatureAccess = async () => {
      const hasPremium = await featureAccessUtils.canAccessFeature('flex_saves');
      if (hasPremium && meetsLevelRequirement('flex_saves') && !isLoading) {
        // Force reload data with the correct premium status
        console.log('Premium status corrected, reloading streak flexSave data');
        loadFlexSaveData(true);
      }
    };
    
    // Call the async function
    checkFeatureAccess();

    return (
      <View style={[styles.container, { backgroundColor: isDark || isSunset ? theme.cardBackground : '#FFF' }]}>
        <View style={[styles.iconContainer, { backgroundColor: isDark || isSunset ? 'rgba(144, 202, 249, 0.1)' : '#E3F2FD' }]}>
          <MaterialCommunityIcons name="timer-sand" size={24} color={isDark ? '#90CAF9' : '#BDBDBD'} />
        </View>
        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: isDark || isSunset ? theme.text : '#333' }]}>Flex Saves</Text>
          <Text style={[styles.subtitle, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
            {!isPremium 
              ? 'Premium Feature' 
              : `Unlocks at Level ${getRequiredLevel('flex_saves')}`}
          </Text>
        </View>
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={18} color={isDark || isSunset ? 'rgba(255,255,255,0.5)' : '#BDBDBD'} />
        </View>
      </View>
    );
  }
  
  // If still loading
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark || isSunset ? theme.cardBackground : '#FFF' }]}>
        <View style={[styles.iconContainer, { backgroundColor: isDark || isSunset ? 'rgba(144, 202, 249, 0.1)' : '#E3F2FD' }]}>
          <MaterialCommunityIcons name="timer-sand" size={24} color={isDark ? '#90CAF9' : '#2196F3'} />
        </View>
        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: isDark || isSunset ? theme.text : '#333' }]}>Flex Saves</Text>
          <Text style={[styles.subtitle, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>Loading data...</Text>
        </View>
        <ActivityIndicator size="small" color={isDark || isSunset ? '#90CAF9' : '#2196F3'} />
      </View>
    );
  }
  
  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: isDark || isSunset ? theme.cardBackground : '#FFF',
          transform: [{ translateX: shakeAnim }]
        }
      ]}
    >
      {/* Snowflake animation overlay */}
      {showSnowflakes && (
        <View style={styles.snowflakeContainer}>
          {snowflakes.map(flake => (
            <Snowflake 
              key={flake.id}
              x={flake.x}
              y={flake.y}
              size={flake.size}
              duration={flake.duration}
              delay={flake.delay}
              rotation={flake.rotation}
            />
          ))}
        </View>
      )}
      
      <Animated.View 
        style={[
          styles.iconContainer, 
          { 
            backgroundColor: isDark || isSunset ? 'rgba(144, 202, 249, 0.1)' : '#E3F2FD',
            transform: [{ rotate }]
          }
        ]}
      >
        <MaterialCommunityIcons name="timer-sand" size={24} color={isDark ? '#90CAF9' : '#2196F3'} />
      </Animated.View>
      
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: isDark || isSunset ? theme.text : '#333' }]}>Flex Saves</Text>
          
          {/* Updated flexSaves counter with clear indicator */}
          <Animated.View style={[
            styles.flexSaveCounterContainer,
            { 
              backgroundColor: isDark || isSunset ? 'rgba(144, 202, 249, 0.2)' : '#E3F2FD',
              transform: [{ scale: flexSaveCounterAnim }]
            }
          ]}>
            <MaterialCommunityIcons 
              name="timer-sand" 
              size={16} 
              color={isDark || isSunset ? '#90CAF9' : '#2196F3'} 
              style={styles.flexSaveIcon}
            />
            <Text style={[
              styles.flexSaveCount, 
              { color: isDark || isSunset ? '#90CAF9' : '#2196F3' }
            ]}>
              {flexSaveCount}
              <Text style={styles.flexSaveCountMax}></Text>
            </Text>
          </Animated.View>
        </View>
        
        {recentlySaved ? (
          <>
            <SavedMessage />
            <Text style={[styles.flexSaveInfoText, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
              You have {flexSaveCount} Flex Save {flexSaveCount === 1 ? 'remaining' : 'remaining'}.
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.subtitle, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
              Missing a day won't break your streak! Your FlexSaves reset at the beginning of each month.
            </Text>
            
            {currentStreak >= 1 && !isStreakBroken && (
              <Text style={[styles.streakText, { color: isDark || isSunset ? '#81C784' : '#4CAF50' }]}>
                Current streak: {currentStreak} days
              </Text>
            )}
            
            {currentStreak >= 1 && isStreakBroken && (
              <Text style={[styles.streakText, { color: isDark || isSunset ? '#FF5722' : '#FF5722', fontStyle: 'italic' }]}>
                Previous streak: {currentStreak} days (inactive)
              </Text>
            )}
            
            {canSaveStreak && flexSaveCount > 0 && (
              <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
                <TouchableOpacity
                  style={[
                    styles.applyButton,
                    { backgroundColor: isDark || isSunset ? '#90CAF9' : '#2196F3' }
                  ]}
                  onPress={handleApplyFlexSave}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name="shield-outline" 
                    size={18} 
                    color="#FFF" 
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.applyButtonText}>Apply Flex Save</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
            
            {isStreakBroken && !canSaveStreak && currentStreak === 0 && (
              <View style={styles.warningContainer}>
                <Ionicons name="alert-circle-outline" size={18} color={isDark || isSunset ? '#FFB74D' : '#FF9800'} style={{ marginRight: 6 }} />
                <Text style={[styles.warningText, { color: isDark || isSunset ? '#FFB74D' : '#FF9800' }]}>
                  Streak reset: You missed 2+ days. Flex saves only work for 1-day gaps.
                </Text>
              </View>
            )}
            
            {isStreakBroken && !canSaveStreak && currentStreak > 0 && (
              <View style={styles.warningContainer}>
                <Ionicons name="alert-circle-outline" size={18} color={isDark || isSunset ? '#FF5722' : '#FF5722'} style={{ marginRight: 6 }} />
                <Text style={[styles.warningText, { color: isDark || isSunset ? '#FF5722' : '#FF5722' }]}>
                  Streak broken: It's been more than 2 days since your last activity. Your streak will reset when you next complete a routine.
                </Text>
              </View>
            )}
            
          
            
            {!canSaveStreak && !isStreakBroken && !hasTodayActivity && currentStreak > 0 && (
              <Text style={[styles.explainerText, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
                Flex saves apply when you've missed a day of activity.
              </Text>
            )}
          </>
        )}
        
        {/* FlexSave count indicator pills at the bottom */}
        <View style={styles.flexSaveCounterPills}>
          <View style={[
            styles.flexSavePill, 
            { 
              backgroundColor: flexSaveCount >= 1 
                ? (isDark || isSunset ? 'rgba(144, 202, 249, 0.5)' : '#2196F3') 
                : (isDark || isSunset ? 'rgba(255, 255, 255, 0.1)' : '#E0E0E0') 
            }
          ]} />
          <View style={[
            styles.flexSavePill, 
            { 
              backgroundColor: flexSaveCount >= 2 
                ? (isDark || isSunset ? 'rgba(144, 202, 249, 0.5)' : '#2196F3') 
                : (isDark || isSunset ? 'rgba(255, 255, 255, 0.1)' : '#E0E0E0') 
            }
          ]} />
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden', // For the snowflake animation
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  streakText: {
    fontSize: 13,
    marginTop: 2,
    marginBottom: 8,
    fontWeight: '500',
  },
  flexSaveCounterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  flexSaveIcon: {
    marginRight: 4,
  },
  flexSaveCount: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  flexSaveCountMax: {
    fontWeight: 'normal',
    opacity: 0.7,
  },
  lockedContainer: {
    padding: 8,
  },
  applyButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 6,
    flexDirection: 'row',
  },
  applyButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  explainerText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  snowflakeContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    pointerEvents: 'none',
  },
  savedMessageContainer: {
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginRight: 10,
  },
  savedIcon: {
    marginRight: 8,
  },
  savedMessageTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 2,
  },
  savedMessage: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  flexSaveInfoText: {
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
  },
  flexSaveCounterPills: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexSavePill: {
    width: 26,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  warningText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  newStreakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  newStreakText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});

export default FlexSaveCard; 