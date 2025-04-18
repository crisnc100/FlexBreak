import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Animated 
} from 'react-native';
import * as xpBoostManager from '../../utils/progress/modules/xpBoostManager';
import * as storageService from '../../services/storageService';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

// Create a fallback rewardManager if the module is not available
const mockRewardManager = {
  isRewardUnlocked: async (rewardId: string): Promise<boolean> => {
    const userProgress = await storageService.getUserProgress();
    const reward = userProgress.rewards && userProgress.rewards[rewardId];
    return reward ? reward.unlocked : false;
  }
};

// Try to import the actual rewardManager, use mock as fallback
let rewardManager: typeof mockRewardManager;
try {
  rewardManager = require('../../utils/progress/modules/rewardManager');
} catch (e) {
  console.warn('Could not import rewardManager, using mock instead', e);
  rewardManager = mockRewardManager;
}

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
  
  // Animation references
  const buttonScale = useRef(new Animated.Value(1)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  
  // Memoize card background color
  const cardBackgroundColor = useMemo(() => 
    isActive ? 'rgba(255, 193, 7, 0.15)' : theme.cardBackground
  , [isActive, theme.cardBackground]);
  
  const refreshData = async (force = false) => {
    try {
      // Fade out content before loading new data
      if (!loading) {
        Animated.timing(contentOpacity, {
          toValue: 0.4,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
      
      // Get user progress to check level
      const userProgress = await storageService.getUserProgress();
      setUserLevel(userProgress.level || 1);
      
      // Check if XP boost reward is unlocked
      const isUnlocked = await rewardManager.isRewardUnlocked('xp_boost');
      setIsRewardUnlocked(isUnlocked);
      
      // Check XP boost status and get available boosts in parallel
      const [statusResult, boostCount] = await Promise.all([
        xpBoostManager.checkXpBoostStatus(),
        typeof xpBoostManager.getAvailableBoosts === 'function' 
          ? xpBoostManager.getAvailableBoosts() 
          : Promise.resolve(0)
      ]);
      
      const { isActive: active, data } = statusResult;
      setIsActive(active);
      setAvailableBoosts(boostCount);
      
      // If active, calculate and format remaining time
      if (active && typeof xpBoostManager.getRemainingXpBoostTime === 'function') {
        const timeMs = await xpBoostManager.getRemainingXpBoostTime();
        const timeFormatted = xpBoostManager.formatRemainingTime(timeMs);
        setFormattedTime(timeFormatted);
      }
      
      setLoading(false);
      
      // Fade in the content after data is loaded
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
      
    } catch (error) {
      console.error('Error checking XP boost status', error);
      setLoading(false);
      setMessage('Error loading XP boost data');
      
      // Fade in the content even on error
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }
  };
  
  useEffect(() => {
    // Load initial data
    refreshData();
    
    // Set up timer to refresh remaining time every minute when active
    const timer = isActive ? setInterval(async () => {
      if (typeof xpBoostManager.getRemainingXpBoostTime === 'function') {
        const timeMs = await xpBoostManager.getRemainingXpBoostTime();
        
        // Only update if time is different to avoid re-renders
        const newTimeFormatted = xpBoostManager.formatRemainingTime(timeMs);
        if (newTimeFormatted !== formattedTime) {
          setFormattedTime(newTimeFormatted);
        }
        
        // If boost just expired, refresh all data
        if (timeMs <= 0 && isActive) {
          refreshData(true);
        }
      }
    }, 60000) : null;
    
    // Clean up timer
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isActive, formattedTime]);
  
  const handleActivate = async () => {
    if (isActive || availableBoosts <= 0 || activating) return;
    
    setActivating(true);
    
    // Button press animation
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
    
    try {
      const result = await xpBoostManager.activateXpBoost();
      
      if (result.success) {
        setMessage('XP Boost activated!');
        
        // Fade out before refreshing data
        Animated.timing(contentOpacity, {
          toValue: 0.5,
          duration: 200,
          useNativeDriver: true,
        }).start(async () => {
          await refreshData(true);
          if (onActivate) onActivate();
        });
      } else {
        setMessage(result.message || 'Failed to activate boost');
        setActivating(false);
      }
    } catch (error) {
      console.error('Error activating XP boost', error);
      setMessage('Failed to activate boost');
      setActivating(false);
      
      // Ensure content is fully visible
      Animated.timing(contentOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };
  
  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.accent} size="small" />
        </View>
      );
    }
    
    if (isActive) {
      return (
        <View style={styles.activeContent}>
          <View style={styles.glowIcon}>
            <Ionicons name="flash" size={30} color="#FFC107" />
          </View>
          <Text style={[styles.activeText, { color: theme.accent }]}>
            2x XP Boost Active
          </Text>
          <Text style={[styles.timeText, { color: theme.textSecondary }]}>
            {formattedTime} remaining
          </Text>
        </View>
      );
    }
    
    if (!isRewardUnlocked) {
      return (
        <View style={styles.inactiveContent}>
          <Text style={[styles.boostText, { color: theme.text }]}>
            {userLevel < 4 ? 'Unlock at level 4' : 'Boost Unlocked'}
          </Text>
          <Text style={[styles.descText, { color: theme.textSecondary }]}>
            {userLevel < 4 
              ? `You're level ${userLevel}. Keep going!` 
              : 'Restart app to claim your boosts'}
          </Text>
        </View>
      );
    }
    
    return (
      <View style={styles.inactiveContent}>
        <Text style={[styles.boostText, { color: theme.text }]}>
          {availableBoosts > 0 
            ? `${availableBoosts} Boost${availableBoosts !== 1 ? 's' : ''} Available` 
            : 'No Boosts Available'}
        </Text>
        {message ? (
          <Text style={[styles.messageText, { 
            color: message.includes('Error') || message.includes('Failed') 
              ? '#f44336' : theme.accent 
          }]}>
            {message}
          </Text>
        ) : (
          <Text style={[styles.descText, { color: theme.textSecondary }]}>
            {availableBoosts > 0 
              ? 'Double all XP for 72 hours' 
              : 'Complete challenges to earn boosts'}
          </Text>
        )}
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
                {availableBoosts > 0 ? 'Activate' : 'No Boosts'}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };
  
  return (
    <View style={[
      styles.card, 
      { backgroundColor: cardBackgroundColor }
    ]}>
      <View style={styles.headerRow}>
        <Ionicons 
          name="flash" 
          size={22} 
          color={isActive ? "#FFC107" : theme.accent} 
        />
        <Text style={[styles.title, { color: theme.text }]}>
          XP Boost
        </Text>
      </View>
      
      <Animated.View style={[
        styles.contentContainer,
        { opacity: contentOpacity }
      ]}>
        {renderContent()}
      </Animated.View>
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
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  contentContainer: {
    minHeight: 100,
    justifyContent: 'center',
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  inactiveContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  glowIcon: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  activeText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 16,
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
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  activateButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 140,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  }
});

export default XpBoostCard; 