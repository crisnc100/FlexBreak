import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Animated, 
  Easing 
} from 'react-native';
import * as xpBoostManager from '../../utils/progress/modules/xpBoostManager';
import * as storageService from '../../services/storageService';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

// Create a fallback rewardManager if the module is not available
const mockRewardManager = {
  isRewardUnlocked: async (rewardId: string): Promise<boolean> => {
    console.log('Using mock rewardManager.isRewardUnlocked', rewardId);
    const userProgress = await storageService.getUserProgress();
    const reward = userProgress.rewards && userProgress.rewards[rewardId];
    return reward ? reward.unlocked : false;
  }
};

// Try to import the actual rewardManager, use mock as fallback
let rewardManager: typeof mockRewardManager;
try {
  // Dynamic import for rewardManager
  rewardManager = require('../../utils/progress/modules/rewardManager');
} catch (e) {
  console.warn('Could not import rewardManager, using mock instead', e);
  rewardManager = mockRewardManager;
}

// Cache for XP boost data
const boostDataCache = {
  lastUpdate: 0,
  isActive: false,
  availableBoosts: 0,
  formattedTime: '',
  isRewardUnlocked: false,
  cacheExpiry: 10000, // 10 seconds cache
};

interface XpBoostCardProps {
  onActivate?: () => void;
}

const XpBoostCard: React.FC<XpBoostCardProps> = ({ onActivate }) => {
  const { theme } = useTheme();
  const [isActive, setIsActive] = useState(false);
  const [formattedTime, setFormattedTime] = useState('');
  const [availableBoosts, setAvailableBoosts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [message, setMessage] = useState('');
  const [isRewardUnlocked, setIsRewardUnlocked] = useState(false);
  const [userLevel, setUserLevel] = useState(1);
  const [wasValidated, setWasValidated] = useState(false);
  const [showActivationAnimation, setShowActivationAnimation] = useState(false);
  
  // Animation references
  const lightningScale = useRef(new Animated.Value(0)).current;
  const lightningOpacity = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Cache timestamp ref to avoid stale values in callbacks
  const cacheTimestampRef = useRef(0);
  
  const refreshData = async (force = false) => {
    try {
      const now = Date.now();
      
      // Use cache if available and not forcing refresh
      if (!force && now - boostDataCache.lastUpdate < boostDataCache.cacheExpiry) {
        console.log('Using cached XP boost data');
        setIsActive(boostDataCache.isActive);
        setAvailableBoosts(boostDataCache.availableBoosts);
        setFormattedTime(boostDataCache.formattedTime);
        setIsRewardUnlocked(boostDataCache.isRewardUnlocked);
        setLoading(false);
        return;
      }
      
      // Get user progress to check level
      const userProgress = await storageService.getUserProgress();
      setUserLevel(userProgress.level || 1);
      
      // Check if XP boost reward is unlocked
      const isUnlocked = await rewardManager.isRewardUnlocked('xp_boost');
      setIsRewardUnlocked(isUnlocked);
      boostDataCache.isRewardUnlocked = isUnlocked;
      
      // Validate XP boost reward to ensure boosts are granted
      if (isUnlocked && !wasValidated) {
        if (typeof xpBoostManager.validateXpBoostReward === 'function') {
          const validationResult = await xpBoostManager.validateXpBoostReward();
          setWasValidated(true);
          
          if (validationResult.boostsAdded > 0) {
            setMessage(`${validationResult.boostsAdded} XP boosts were added to your account!`);
          }
        }
      }
      
      // Check XP boost status
      const { isActive: active, data } = await xpBoostManager.checkXpBoostStatus();
      setIsActive(active);
      boostDataCache.isActive = active;
      
      // Get available boosts
      if (typeof xpBoostManager.getAvailableBoosts === 'function') {
        const boosts = await xpBoostManager.getAvailableBoosts();
        setAvailableBoosts(boosts);
        boostDataCache.availableBoosts = boosts;
      } else {
        console.warn('getAvailableBoosts function not available');
        setAvailableBoosts(0);
        boostDataCache.availableBoosts = 0;
      }
      
      // If active, calculate and format remaining time
      if (active) {
        if (typeof xpBoostManager.getRemainingXpBoostTime === 'function') {
          const timeMs = await xpBoostManager.getRemainingXpBoostTime();
          const timeFormatted = xpBoostManager.formatRemainingTime(timeMs);
          setFormattedTime(timeFormatted);
          boostDataCache.formattedTime = timeFormatted;
        }
      }
      
      // Update cache timestamp
      boostDataCache.lastUpdate = now;
      cacheTimestampRef.current = now;
      
      setLoading(false);
    } catch (error) {
      console.error('Error checking XP boost status', error);
      setLoading(false);
      setMessage('Error loading XP boost data. Please try again.');
    }
  };
  
  useEffect(() => {
    // Load initial data
    refreshData();
    
    // Set up timer to refresh remaining time every minute
    const timer = isActive 
      ? setInterval(async () => {
          if (typeof xpBoostManager.getRemainingXpBoostTime === 'function') {
            const timeMs = await xpBoostManager.getRemainingXpBoostTime();
            const timeFormatted = xpBoostManager.formatRemainingTime(timeMs);
            setFormattedTime(timeFormatted);
            boostDataCache.formattedTime = timeFormatted;
            
            // If boost just expired, refresh all data
            if (timeMs <= 0) {
              refreshData(true);
            }
          }
        }, 60000) 
      : null;
    
    // Clean up timer
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isActive]);
  
  // Animation for XP boost activation
  const playActivationAnimation = () => {
    setShowActivationAnimation(true);
    
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start();
    
    // Pre-load animation values to avoid lag
    requestAnimationFrame(() => {
      // Lightning strike animation with more dramatic effect
      Animated.sequence([
        // First show the glow
        Animated.timing(glowOpacity, {
          toValue: 0.9,
          duration: 250,
          useNativeDriver: true,
          easing: Easing.ease,
        }),
        // Then strike with lightning
        Animated.parallel([
          Animated.timing(lightningScale, {
            toValue: 1.2, // Make it bigger for more impact
            duration: 500,
            useNativeDriver: true,
            easing: Easing.out(Easing.back(2)), // More dramatic bounce
          }),
          Animated.timing(lightningOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
        // Hold for a moment
        Animated.delay(800),
        // Fade out
        Animated.parallel([
          Animated.timing(lightningOpacity, {
            toValue: 0,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        // Reset animation values
        setTimeout(() => {
          lightningScale.setValue(0);
          lightningOpacity.setValue(0);
          glowOpacity.setValue(0);
          setShowActivationAnimation(false);
        }, 100); // Small delay to ensure animation completes
      });
    });
  };
  
  const handleActivate = async () => {
    if (isActive || availableBoosts <= 0 || activating) return;
    
    setActivating(true);
    setMessage('');
    
    try {
      // Start animation immediately for instant feedback
      playActivationAnimation();
      
      // Use Promise.all to ensure animation has time to start
      // before API call potentially completes quickly
      const [result] = await Promise.all([
        xpBoostManager.activateXpBoost(),
        // Add minimal delay to ensure animation is visible
        new Promise(resolve => setTimeout(resolve, 500))
      ]);
      
      if (result.success) {
        // Refresh status after activation
        setMessage(result.message || 'XP Boost activated successfully!');
        await refreshData(true);
        
        // Call onActivate callback if provided
        if (onActivate) onActivate();
      } else {
        // Display error message
        setMessage(result.message);
      }
    } catch (error) {
      console.error('Error activating XP boost', error);
      setMessage('Failed to activate XP boost. Please try again.');
    } finally {
      // Delay setting activating to false to avoid UI jank during animation
      setTimeout(() => {
        setActivating(false);
      }, 1500); // Ensure animation completes before allowing new activation
    }
  };
  
  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }
  
  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
      {/* Animation Overlay */}
      {showActivationAnimation && (
        <Animated.View style={[
          styles.animationOverlay,
          { opacity: glowOpacity }
        ]}>
          <Animated.View style={[
            styles.lightningContainer,
            {
              transform: [
                { scale: lightningScale },
                { translateY: lightningScale.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-150, 0]
                })}
              ],
              opacity: lightningOpacity
            }
          ]}>
            {/* Lightning bolt with glow */}
            <View style={styles.lightningGlow}>
              <Ionicons name="flash" size={130} color="rgba(255, 255, 255, 0.7)" />
            </View>
            <Ionicons name="flash" size={120} color="#FFC107" />
          </Animated.View>
        </Animated.View>
      )}
      
      <View style={styles.headerRow}>
        <Ionicons name="flash" size={24} color={theme.accent} />
        <Text style={[styles.title, { color: theme.text }]}>XP Boost</Text>
      </View>
      
      {isActive ? (
        <View style={styles.content}>
          <Text style={[styles.activeText, { color: theme.accent }]}>
            2x XP Boost Active!
          </Text>
          <Text style={[styles.timeText, { color: theme.textSecondary }]}>
            Time remaining: {formattedTime}
          </Text>
          <Text style={[styles.smallText, { color: theme.textSecondary }]}>
            All XP earned is doubled while active
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          {!isRewardUnlocked ? (
            <>
              <Text style={[styles.boostText, { color: theme.text }]}>
                {userLevel < 4 
                  ? `Unlock XP Boosts at level 4!` 
                  : `XP Boost reward unlocked but not initialized`}
              </Text>
              <Text style={[styles.descText, { color: theme.textSecondary }]}>
                {userLevel < 4 
                  ? `You're level ${userLevel}. Keep going to unlock 2x XP boosts!` 
                  : `Please restart the app to claim your XP boosts`}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.boostText, { color: theme.text }]}>
                {availableBoosts > 0 
                  ? `You have ${availableBoosts} XP boost stack${availableBoosts !== 1 ? 's' : ''} available!` 
                  : 'No XP boosts available'}
              </Text>
              <Text style={[styles.descText, { color: theme.textSecondary }]}>
                {availableBoosts > 0 
                  ? `Each boost doubles all XP earned for 72 hours` 
                  : `Complete more challenges to earn additional XP boosts!`}
              </Text>
            </>
          )}
          
          {message ? (
            <Text style={[styles.messageText, { 
              color: message.includes('Error') || message.includes('Failed') ? 'red' : theme.accent 
            }]}>
              {message}
            </Text>
          ) : null}
          
          <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={[
                styles.activateButton,
                { 
                  backgroundColor: availableBoosts > 0 ? theme.accent : theme.border,
                  opacity: availableBoosts > 0 ? 1 : 0.5
                }
              ]}
              onPress={handleActivate}
              disabled={activating || availableBoosts <= 0}
            >
              {activating ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.buttonText}>
                  {availableBoosts > 0 ? 'Activate Boost' : 'No Boosts Available'}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    overflow: 'hidden',
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  content: {
    alignItems: 'center',
  },
  activeText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 16,
    marginBottom: 8,
  },
  smallText: {
    fontSize: 14,
    textAlign: 'center',
  },
  boostText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  descText: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  activateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 180,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  animationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderRadius: 12,
  },
  lightningContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  lightningGlow: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },
});

export default XpBoostCard; 