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
import { Ionicons } from '@expo/vector-icons';
import * as streakFreezeManager from '../../utils/progress/modules/streakFreezeManager';
import * as streakManager from '../../utils/progress/modules/streakManager';
import { useFeatureAccess } from '../../hooks/progress/useFeatureAccess';
import { usePremium } from '../../context/PremiumContext';
import { useTheme } from '../../context/ThemeContext';
import * as Haptics from 'expo-haptics';

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
      <Ionicons name="snow-outline" size={size} color="#90CAF9" />
    </Animated.View>
  );
};

interface StreakFreezeCardProps {
  currentStreak: number;
  isDark?: boolean;
}

const StreakFreezeCard: React.FC<StreakFreezeCardProps> = ({ 
  currentStreak,
  isDark: propIsDark 
}) => {
  const { theme, isDark: contextIsDark } = useTheme();
  // Use the prop value if provided, otherwise fall back to context
  const isDark = propIsDark !== undefined ? propIsDark : contextIsDark;
  const [isLoading, setIsLoading] = useState(true);
  const [freezeCount, setFreezeCount] = useState(0);
  const [isStreakBroken, setIsStreakBroken] = useState(false);
  const [recentlySaved, setRecentlySaved] = useState(false);
  const [canSaveStreak, setCanSaveStreak] = useState(false);
  const [showSnowflakes, setShowSnowflakes] = useState(false);
  const [snowflakes, setSnowflakes] = useState([]);
  const { canAccessFeature, meetsLevelRequirement, getRequiredLevel } = useFeatureAccess();
  const { isPremium } = usePremium();
  
  // Animation references
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const buttonScaleAnim = useRef(new Animated.Value(1)).current;
  const freezeCounterAnim = useRef(new Animated.Value(1)).current;
  
  // Screen dimensions for animations
  const { width } = Dimensions.get('window');
  
  // Check freeze data on mount
  useEffect(() => {
    loadFreezeData();
  }, []);
  
  // Update when streak changes
  useEffect(() => {
    console.log('Current streak changed to:', currentStreak);
    // Force a complete reload of data when streak changes
    loadFreezeData(true);
  }, [currentStreak]);
  
  // Create snowflake effect
  const createSnowflakeEffect = () => {
    const numSnowflakes = 12;
    const newSnowflakes = [];
    
    for (let i = 0; i < numSnowflakes; i++) {
      newSnowflakes.push({
        id: i,
        x: Math.random() * width * 0.8,
        y: -10 - Math.random() * 20,
        size: 14 + Math.random() * 10,
        duration: 1500 + Math.random() * 1000,
        delay: Math.random() * 500,
        rotation: Math.random() * 360
      });
    }
    
    setSnowflakes(newSnowflakes);
    setShowSnowflakes(true);
    
    // Auto-hide after animation completes
    setTimeout(() => {
      setShowSnowflakes(false);
    }, 3000);
  };
  
  // Load freeze data
  const loadFreezeData = async (forceRefresh = false) => {
    setIsLoading(true);
    try {
      console.log('Loading streak freeze data...', forceRefresh ? '(force refresh)' : '');
      
      // If this is an initial load (not after using a streak freeze), check for monthly refill
      if (canAccessFeature('streak_freezes') && !forceRefresh) {
        await streakFreezeManager.refillMonthlyStreakFreezes();
      }
      
      // If we recently saved a streak, never load the data again 
      // This prevents overwriting our UI state with potentially inconsistent data
      if (recentlySaved && forceRefresh) {
        console.log('Skipping refresh as streak was recently saved');
        setIsLoading(false);
        return;
      }
      
      // Get the current count of streak freezes
      const count = await streakFreezeManager.getStreakFreezeCount();
      
      // Only update the UI if we're not in a recently saved state
      if (!recentlySaved) {
        console.log(`Loaded freeze count: ${count}/2`);
        setFreezeCount(count);
      } else {
        console.log(`Skipping UI update for streak freeze count: ${count}/2`);
      }
      
      // Start animation
      startPulseAnimation();
      
      // Check if a streak freeze was recently applied
      const wasUsedToday = await streakFreezeManager.wasStreakFreezeUsedForCurrentDay();
      console.log('Was streak freeze used today?', wasUsedToday);
      
      // Only update recentlySaved if it's not already true
      if (!recentlySaved) {
        setRecentlySaved(wasUsedToday);
      }
      
      // Check if streak needs saving
      await checkStreakStatus();
    } catch (error) {
      console.error('Error loading streak freeze data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check if streak is broken and needs saving
  const checkStreakStatus = async () => {
    try {
      // Force reset the streakBreakNotificationShown flag to ensure proper testing
      streakManager.resetNotificationFlag();
      
      const status = await streakManager.checkStreakStatus();
      
      console.log('Streak freeze card - status check:', status);
      
      // Can save if either the streak is broken OR if yesterday's streak can be saved
      setIsStreakBroken(status.streakBroken);
      setCanSaveStreak(status.streakBroken || status.canSaveYesterdayStreak);
      
      // Start button animation if we can save a streak
      if (status.streakBroken || status.canSaveYesterdayStreak) {
        console.log('Streak can be saved, starting button animation');
        pulseButton();
      }
    } catch (error) {
      console.error('Error checking streak status:', error);
    }
  };
  
  // Animation for pulse effect
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();
    
    // Also start rotation animation for snowflake
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 6000,
        useNativeDriver: true
      })
    ).start();
  };
  
  // Shake animation for denied action
  const startShakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
    
    // Provide haptic feedback for denied action
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };
  
  // Animate the freeze counter change
  const animateFreezeCountChange = (oldCount, newCount) => {
    // Scale down and up animation
    Animated.sequence([
      Animated.timing(freezeCounterAnim, {
        toValue: 0.7,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(freezeCounterAnim, {
        toValue: 1.2,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.timing(freezeCounterAnim, {
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
  
  // Handle applying a streak freeze
  const handleApplyStreakFreeze = async () => {
    if (!canSaveStreak || freezeCount <= 0) {
      startShakeAnimation();
      return;
    }
    
    // Stop button animation
    buttonScaleAnim.stopAnimation();
    buttonScaleAnim.setValue(1);
    
    try {
      setIsLoading(true);
      
      // Start snowflake animation
      createSnowflakeEffect();
      
      // Store the original count for UI animation
      const originalCount = freezeCount;
      const expectedNewCount = Math.max(0, originalCount - 1);
      
      // Immediately update UI for better responsiveness
      setFreezeCount(expectedNewCount);
      
      // Animate the freeze count change
      animateFreezeCountChange(originalCount, expectedNewCount);
      
      // Apply the streak freeze
      console.log(`Applying streak freeze. Current count: ${originalCount}, Expected new count: ${expectedNewCount}`);
      const success = await streakManager.saveStreakWithFreeze();
      
      if (success) {
        console.log('Streak freeze applied successfully');
        
        // Provide haptic feedback for success
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Force the UI to maintain the expected count regardless of what comes back from storage
        // This ensures consistency in the UI after applying the streak freeze
        console.log('Maintaining UI streak freeze count at:', expectedNewCount);
        
        // Update UI state
        setRecentlySaved(true);
        setCanSaveStreak(false);
        
        // Persist the expected count to ensure it's visible
        setFreezeCount(expectedNewCount);
      } else {
        console.error('Failed to apply streak freeze');
        
        // Revert the UI back to original count on failure
        setFreezeCount(originalCount);
        animateFreezeCountChange(expectedNewCount, originalCount);
        
        // Show error animation
        startShakeAnimation();
      }
    } catch (error) {
      console.error('Error applying streak freeze:', error);
      startShakeAnimation();
    } finally {
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
      { backgroundColor: isDark ? 'rgba(76, 175, 80, 0.1)' : 'rgba(76, 175, 80, 0.05)' }
    ]}>
      <Ionicons 
        name="shield-checkmark" 
        size={18} 
        color="#4CAF50" 
        style={styles.savedIcon}
      />
      <View>
        <Text style={[styles.savedMessageTitle, { color: isDark ? '#81C784' : '#4CAF50' }]}>
          Streak Protected!
        </Text>
        <Text style={[styles.savedMessage, { color: isDark ? theme.textSecondary : '#666' }]}>
          Your {currentStreak}-day streak is safe! Complete a routine today to keep it going.
        </Text>
      </View>
    </View>
  );
  
  // Render locked state for non-premium users or users below required level
  if (!isPremium || !meetsLevelRequirement('streak_freezes')) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? theme.cardBackground : '#FFF' }]}>
        <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(144, 202, 249, 0.1)' : '#E3F2FD' }]}>
          <Ionicons name="snow" size={24} color={isDark ? '#90CAF9' : '#BDBDBD'} />
        </View>
        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: isDark ? theme.text : '#333' }]}>Streak Freezes</Text>
          <Text style={[styles.subtitle, { color: isDark ? theme.textSecondary : '#666' }]}>
            {!isPremium 
              ? 'Premium Feature' 
              : `Unlocks at Level ${getRequiredLevel('streak_freezes')}`}
          </Text>
        </View>
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={18} color={isDark ? 'rgba(255,255,255,0.5)' : '#BDBDBD'} />
        </View>
      </View>
    );
  }
  
  // If still loading
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? theme.cardBackground : '#FFF' }]}>
        <View style={[styles.iconContainer, { backgroundColor: isDark ? 'rgba(144, 202, 249, 0.1)' : '#E3F2FD' }]}>
          <Ionicons name="snow" size={24} color={isDark ? '#90CAF9' : '#2196F3'} />
        </View>
        <View style={styles.contentContainer}>
          <Text style={[styles.title, { color: isDark ? theme.text : '#333' }]}>Streak Freezes</Text>
          <Text style={[styles.subtitle, { color: isDark ? theme.textSecondary : '#666' }]}>Loading data...</Text>
        </View>
        <ActivityIndicator size="small" color={isDark ? '#90CAF9' : '#2196F3'} />
      </View>
    );
  }
  
  return (
    <Animated.View 
      style={[
        styles.container, 
        { 
          backgroundColor: isDark ? theme.cardBackground : '#FFF',
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
            backgroundColor: isDark ? 'rgba(144, 202, 249, 0.1)' : '#E3F2FD',
            transform: [{ rotate }]
          }
        ]}
      >
        <Ionicons name="snow" size={24} color={isDark ? '#90CAF9' : '#2196F3'} />
      </Animated.View>
      
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: isDark ? theme.text : '#333' }]}>Streak Freezes</Text>
          
          {/* Updated freezes counter with clear indicator */}
          <Animated.View style={[
            styles.freezeCounterContainer,
            { 
              backgroundColor: isDark ? 'rgba(144, 202, 249, 0.2)' : '#E3F2FD',
              transform: [{ scale: freezeCounterAnim }]
            }
          ]}>
            <Ionicons 
              name="snow" 
              size={16} 
              color={isDark ? '#90CAF9' : '#2196F3'} 
              style={styles.freezeIcon}
            />
            <Text style={[
              styles.freezeCount, 
              { color: isDark ? '#90CAF9' : '#2196F3' }
            ]}>
              {freezeCount}
              <Text style={styles.freezeCountMax}></Text>
            </Text>
          </Animated.View>
        </View>
        
        {recentlySaved ? (
          <>
            <SavedMessage />
            <Text style={[styles.freezeInfoText, { color: isDark ? theme.textSecondary : '#666' }]}>
              You have {freezeCount} streak {freezeCount === 1 ? 'freeze' : 'freezes'} remaining.
            </Text>
          </>
        ) : (
          <>
            <Text style={[styles.subtitle, { color: isDark ? theme.textSecondary : '#666' }]}>
              Missing a day won't break your streak! Your streak freezes reset at the beginning of each month.
            </Text>
            
            {currentStreak >= 1 && (
              <Text style={[styles.streakText, { color: isDark ? '#81C784' : '#4CAF50' }]}>
                Current streak: {currentStreak} days
              </Text>
            )}
            
            {canSaveStreak && freezeCount > 0 && (
              <Animated.View style={{ transform: [{ scale: buttonScaleAnim }] }}>
                <TouchableOpacity
                  style={[
                    styles.applyButton,
                    { backgroundColor: isDark ? '#90CAF9' : '#2196F3' }
                  ]}
                  onPress={handleApplyStreakFreeze}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name="shield-outline" 
                    size={18} 
                    color="#FFF" 
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.applyButtonText}>Apply Streak Freeze</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
            
            {!canSaveStreak && !isStreakBroken && currentStreak > 0 && (
              <Text style={[styles.explainerText, { color: isDark ? theme.textSecondary : '#666' }]}>
                Streak freezes apply when you've missed a day of activity.
              </Text>
            )}
          </>
        )}
        
        {/* Freeze count indicator pills at the bottom */}
        <View style={styles.freezeCounterPills}>
          <View style={[
            styles.freezePill, 
            { 
              backgroundColor: freezeCount >= 1 
                ? (isDark ? 'rgba(144, 202, 249, 0.5)' : '#2196F3') 
                : (isDark ? 'rgba(255, 255, 255, 0.1)' : '#E0E0E0') 
            }
          ]} />
          <View style={[
            styles.freezePill, 
            { 
              backgroundColor: freezeCount >= 2 
                ? (isDark ? 'rgba(144, 202, 249, 0.5)' : '#2196F3') 
                : (isDark ? 'rgba(255, 255, 255, 0.1)' : '#E0E0E0') 
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
  freezeCounterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  freezeIcon: {
    marginRight: 4,
  },
  freezeCount: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  freezeCountMax: {
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
  freezeInfoText: {
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
  },
  freezeCounterPills: {
    flexDirection: 'row',
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  freezePill: {
    width: 26,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 3,
  },
});

export default StreakFreezeCard; 