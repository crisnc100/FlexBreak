import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';
import { useFeatureAccess } from '../../hooks/progress/useFeatureAccess';
import * as streakManager from '../../utils/progress/modules/streakManager';
import * as streakFreezeManager from '../../utils/progress/modules/streakFreezeManager';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

interface StreakDisplayProps {
  currentStreak: number;
  onPremiumPress?: () => void;
  onUpgradePress?: () => void;
}

const StreakDisplay: React.FC<StreakDisplayProps> = ({ 
  currentStreak = 0, 
  onPremiumPress,
  onUpgradePress
}) => {
  const { theme, isDark } = useTheme();
  const { isPremium } = usePremium();
  const { canAccessFeature, getUserLevel, getRequiredLevel } = useFeatureAccess();
  const [streakFreezeCount, setStreakFreezeCount] = useState(0);
  const [todayCompleted, setTodayCompleted] = useState(false);
  const [streakFreezeActive, setStreakFreezeActive] = useState(false);
  const [userLevel, setUserLevel] = useState(0);
  
  // Animation values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Screen dimensions
  const { width } = Dimensions.get('window');
  
  // Load data on mount
  useEffect(() => {
    loadStreakData();
    
    // Immediately run a separate check for streak freezes to avoid any circular dependencies
    const checkStreakFreezes = async () => {
      try {
        if (isPremium) {
          // Force a refresh from streakFreezeManager
          await streakFreezeManager.refillMonthlyStreakFreezes();
          const count = await streakFreezeManager.getStreakFreezeCount(true);
          setStreakFreezeCount(count);
        }
      } catch (error) {
        console.error('Error checking streak freezes:', error);
      }
    };
    
    checkStreakFreezes();
  }, [currentStreak, isPremium]);
  
  // Listen for streak events
  useEffect(() => {
    let isLoadingFromEvent = false;
    
    // Function to handle streak events
    const handleStreakEvent = (data: any) => {
      console.log('StreakDisplay received streak event:', data);
      
      // Prevent multiple rapid event handling by using a flag
      if (!isLoadingFromEvent) {
        isLoadingFromEvent = true;
        
        // Give a small delay to avoid multiple calls too close together
        setTimeout(() => {
          loadStreakData();
          isLoadingFromEvent = false;
        }, 100);
      }
    };
    
    // Special handler for streak saved events to update freeze count immediately
    const handleStreakSavedEvent = (data: any) => {
      console.log('StreakDisplay received streak saved event:', data);
      
      // If freezesRemaining is provided in the event data, use it directly
      if (data && data.freezesRemaining !== undefined) {
        console.log('Updating streak freeze count from event data:', data.freezesRemaining);
        setStreakFreezeCount(data.freezesRemaining);
        
        // Also set the streak freeze as active since it was just used
        setStreakFreezeActive(true);
      }
      
      // Still call the regular event handler
      handleStreakEvent(data);
    };
    
    // Subscribe to streak events
    streakManager.streakEvents.on(streakManager.STREAK_BROKEN_EVENT, handleStreakEvent);
    streakManager.streakEvents.on(streakManager.STREAK_MAINTAINED_EVENT, handleStreakEvent);
    
    // Use special handler for STREAK_SAVED_EVENT
    streakManager.streakEvents.on(streakManager.STREAK_SAVED_EVENT, handleStreakSavedEvent);
    
    // Clean up event listeners
    return () => {
      streakManager.streakEvents.off(streakManager.STREAK_BROKEN_EVENT, handleStreakEvent);
      streakManager.streakEvents.off(streakManager.STREAK_MAINTAINED_EVENT, handleStreakEvent);
      streakManager.streakEvents.off(streakManager.STREAK_SAVED_EVENT, handleStreakSavedEvent);
    };
  }, []); // Empty dependency array to only run once on mount
  
  // Load streak data
  const loadStreakData = async () => {
    try {
      // Get user level
      const level = await getUserLevel();
      setUserLevel(level);
      
      // Check if user has completed a routine today
      const status = await streakManager.checkStreakStatus();
      
      // Set today's activity status
      setTodayCompleted(status.hasTodayActivity);
      
      // If streak was just reset and there's activity today, we should show that the streak is restarting
      if (status.hasTodayActivity && currentStreak === 0) {
        // Streak is restarting today
      }
      
      // If we have a streak of 1 and there's activity today, silently try to fix any streak challenges
      if (status.hasTodayActivity && status.currentStreak === 1) {
        // Silently try to fix streak challenges without waiting
        streakManager.forceUpdateStreakChallenges()
          .catch(error => {
            console.error('Error fixing streak challenges from StreakDisplay:', error);
          });
      }
      
      // Check if streak freeze was used
      const wasFreezedUsed = await streakFreezeManager.wasStreakFreezeUsedForCurrentDay();
      setStreakFreezeActive(wasFreezedUsed);
      
      // Get streak freeze count for all premium users (even if below required level)
      if (isPremium) {
        const count = await streakFreezeManager.getStreakFreezeCount(true);
        setStreakFreezeCount(count);
      }
      
      // Start animations
      startPulseAnimation();
    } catch (error) {
      console.error('Error loading streak data:', error);
    }
  };
  
  // Start pulse animation
  const startPulseAnimation = () => {
    // Only pulse if streak is at risk and not completed today
    if (currentStreak > 0 && !todayCompleted) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
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
    }
  };
  
  // Tap animation
  const handleStreakTap = () => {
    // Provide haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Scale animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
  };
  
  // Handle premium button press
  const handlePremiumPress = () => {
    if (onPremiumPress) {
      onPremiumPress();
    }
  };
  
  // Render streak circles
  const renderStreakCircles = () => {
    // Maximum circles to show
    const maxCircles = 7;
    // Number of circles to show (capped at maxCircles)
    const circleCount = Math.min(currentStreak, maxCircles);
    
    // Create array of circles
    const circles = [];
    
    for (let i = 0; i < maxCircles; i++) {
      // Determine if this circle should be filled
      const isFilled = i < circleCount;
      
      circles.push(
        <View 
          key={i} 
          style={[
            styles.streakCircle,
            { 
              backgroundColor: isFilled 
                ? (isDark ? '#81C784' : '#4CAF50') 
                : (isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0'),
              borderColor: isFilled 
                ? (isDark ? '#81C784' : '#4CAF50') 
                : 'transparent',
            }
          ]}
        />
      );
    }
    
    return (
      <View style={styles.streakCircleContainer}>
        {circles}
      </View>
    );
  };
  
  // Determine streak status text and color
  const getStreakStatusInfo = () => {
    if (currentStreak === 0 && todayCompleted) {
      return {
        text: 'Starting new streak today!',
        color: isDark ? '#81C784' : '#4CAF50'
      };
    } else if (currentStreak === 0) {
      return {
        text: 'Start your streak today!',
        color: isDark ? theme.textSecondary : '#757575'
      };
    } else if (todayCompleted) {
      return {
        text: 'Completed today ✓',
        color: isDark ? '#81C784' : '#4CAF50'
      };
    } else if (streakFreezeActive) {
      return {
        text: 'Protected by streak freeze',
        color: isDark ? '#90CAF9' : '#2196F3'
      };
    } else {
      return {
        text: 'Complete today to maintain!',
        color: isDark ? '#FFB74D' : '#FF9800'
      };
    }
  };
  
  // Get streak status info
  const streakStatus = getStreakStatusInfo();
  
  // Check if user can access streak freezes
  const canAccessStreakFreezes = isPremium && userLevel >= getRequiredLevel('streak_freezes');
  
  // Always show the freeze count for premium users, even if they can't use them yet
  const showFreezeCount = isPremium;
  
  return (
    <Animated.View 
      style={[
        styles.container,
        {
          backgroundColor: isDark ? theme.cardBackground : '#FFF',
          transform: [
            { scale: scaleAnim }
          ]
        }
      ]}
    >
      {/* Top section with current streak and streak freeze info */}
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={handleStreakTap}
        style={styles.upperContainer}
      >
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={[
            styles.streakBadge,
            { backgroundColor: isDark ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 152, 0, 0.1)' }
          ]}>
            <Ionicons 
              name="flame" 
              size={24} 
              color={isDark ? '#FFB74D' : '#FF9800'} 
              style={styles.fireIcon}
            />
            <View>
              <Text style={[styles.streakText, { color: theme.text }]}>
                {currentStreak} Day Streak
              </Text>
              <Text style={[styles.streakStatus, { color: streakStatus.color }]}>
                {streakStatus.text}
              </Text>
            </View>
          </View>
        </Animated.View>
        
        {/* Streak freezes info for premium users with level 6+ */}
        {showFreezeCount ? (
          <View style={styles.freezeCountContainer}>
            <View style={[
              styles.freezeBadge,
              { backgroundColor: isDark ? 'rgba(144, 202, 249, 0.2)' : 'rgba(144, 202, 249, 0.1)' }
            ]}>
              <Ionicons name="snow" size={16} color={isDark ? '#90CAF9' : '#2196F3'} />
              <Text 
                style={[
                  styles.freezeCount, 
                  { color: isDark ? '#90CAF9' : '#2196F3' },
                  // Add a red color if count is 0 or user level is too low
                  (streakFreezeCount === 0 || userLevel < getRequiredLevel('streak_freezes')) 
                    ? { color: isDark ? '#EF5350' : '#F44336' } 
                    : null
                ]}
              >
                {streakFreezeCount}
              </Text>
            </View>
          </View>
        ) : userLevel >= 3 ? (
          <TouchableOpacity 
            style={[
              styles.upgradeButton,
              { backgroundColor: isDark ? 'rgba(144, 202, 249, 0.2)' : 'rgba(144, 202, 249, 0.1)' }
            ]}
            onPress={handlePremiumPress}
          >
            <Text style={[styles.upgradeText, { color: isDark ? '#90CAF9' : '#2196F3' }]}>
              {isPremium ? `Lv.${getRequiredLevel('streak_freezes')}+` : 'Premium'}
            </Text>
            <Ionicons 
              name="lock-closed" 
              size={12} 
              color={isDark ? '#90CAF9' : '#2196F3'} 
              style={styles.lockIcon}
            />
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
      
      {/* Streak visualization */}
      {renderStreakCircles()}
      
      {/* Streak freeze explanation for users close to unlocking it */}
      {isPremium && userLevel < getRequiredLevel('streak_freezes') && (
        <View style={styles.infoContainer}>
          <Text style={[styles.infoText, { color: isDark ? theme.textSecondary : '#757575' }]}>
            {`Streak freezes unlock at level ${getRequiredLevel('streak_freezes')} Premium. You're level ${userLevel}.`}
          </Text>
        </View>
      )}
      
      {/* Explanation for non-premium users */}
      {!isPremium && userLevel >= 3 && (
        <View style={styles.infoContainer}>
          <Text style={[styles.infoText, { color: isDark ? theme.textSecondary : '#757575' }]}>
            {'Streak freezes available with premium.'}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  upperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  fireIcon: {
    marginRight: 8,
  },
  streakText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  streakStatus: {
    fontSize: 12,
    marginTop: 2,
  },
  freezeCountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  freezeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  freezeCount: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius:
    12,
  },
  upgradeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  lockIcon: {
    marginLeft: 4,
  },
  streakCircleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  streakCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  infoContainer: {
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default StreakDisplay; 