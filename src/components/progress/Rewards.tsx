import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as rewardManager from '../../utils/progress/modules/rewardManager';
import { Reward } from '../../utils/progress/types';
import RewardCard from './RewardCard';
import { useTheme, ThemeType } from '../../context/ThemeContext';
import PremiumLock from './PremiumLock';
import CORE_REWARDS from '../../data/rewards.json';
import { ThemedText } from '../common';

// Fallback rewards data in case loading fails
const FALLBACK_REWARDS = CORE_REWARDS.map(reward => ({
  ...reward,
  icon: reward.icon + (reward.icon.includes('-outline') ? '' : '-outline'),
  unlocked: false
}));

// Component props
interface RewardsProps {
  userLevel: number;
  isPremium: boolean;
  onUpgradeToPremium: () => void;
}

const Rewards: React.FC<RewardsProps> = ({ userLevel, isPremium, onUpgradeToPremium }) => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { theme, isDark, themeType, toggleTheme, setThemeType } = useTheme();
  const [refreshKey, setRefreshKey] = useState(0); // Add refresh key to force re-render
  
  // Load rewards when component mounts
  useEffect(() => {
    loadRewards();
  }, []);
  
  // Also reload rewards when the theme changes to update UI
  useEffect(() => {
    loadRewards();
  }, [isDark]);
  
  // Load rewards data from storage
  const loadRewards = async () => {
    setIsLoading(true);
    try {
      // Clean up any duplicate rewards before loading
      await rewardManager.cleanupDuplicateRewards();
      
      // Get rewards from reward manager
      const allRewards = await rewardManager.getAllRewards();
      
      // If rewards exist, use them
      if (allRewards && allRewards.length > 0) {
        // Don't override descriptions - use the ones from rewards.json
        
        // Find the dark theme reward (keep the unlocked one if available)
        const darkThemeReward = allRewards.find(reward => 
          reward.id === 'dark_theme' && reward.unlocked
        ) || allRewards.find(reward => 
          reward.id === 'dark_theme'
        );
        
        
        // Filter out all dark theme rewards
        const otherRewards = allRewards.filter(reward => reward.id !== 'dark_theme');
        
        // Create the final rewards list with dark theme first (if exists)
        let finalRewards = [...otherRewards];
        if (darkThemeReward) {
          finalRewards.unshift(darkThemeReward);
        }
        
        // Sort rewards by level required
        finalRewards.sort((a, b) => a.levelRequired - b.levelRequired);
        
        console.log('Rewards loaded, dark theme is', isDark ? 'ACTIVE' : 'INACTIVE');
        setRewards(finalRewards);
      } else {
        // Use fallback rewards as a last resort
        const convertedRewards = FALLBACK_REWARDS.map(reward => {
          return {
            ...reward,
            unlocked: userLevel >= reward.levelRequired
          };
        });
        
        setRewards(convertedRewards);
      }
    } catch (error) {
      console.error('Error loading rewards:', error);
      
      // Use fallback rewards on error
      const convertedRewards = FALLBACK_REWARDS.map(reward => {
        return {
          ...reward,
          unlocked: userLevel >= reward.levelRequired
        };
      });
      setRewards(convertedRewards);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a direct function to call toggleTheme and update UI
  const directThemeToggle = useCallback(() => {
    console.log('DIRECT THEME TOGGLE - NO ALERTS, NO CHECKS');
    
    // Do exactly what the settings screen does - bypass toggleTheme
    if (isDark) {
      // Go to light theme DIRECTLY
      setThemeType('light');
    } else {
      // Go to dark theme DIRECTLY
      setThemeType('dark');
    }
    
    // Force refresh immediately
    setRefreshKey(prev => prev + 1);
  }, [isDark, setThemeType]);
  
  // Handle pressing on a reward card - Now with a stable callback handler that won't break rules of hooks
  const handleRewardPress = useCallback((reward: Reward) => {
    // Check if reward is unlocked or if the user meets level requirements
    const isUnlocked = reward.unlocked || userLevel >= reward.levelRequired;
    
    // If reward is locked, show premium upsell or level requirement message
    if (!isUnlocked) {
      if (!isPremium && reward.levelRequired > 0) {
        // Show premium upsell
        console.log('Premium upsell for locked reward:', reward.title);
        onUpgradeToPremium?.();
      } else {
        // Show level requirement message
        Alert.alert(
          'Reward Locked',
          `You need to reach level ${reward.levelRequired} to unlock this reward!`,
          [{ text: 'OK' }]
        );
      }
      return;
    }
    
    // Handle different reward types
    switch (reward.type) {
      case 'theme':
      case 'app_feature': // handle both types since rewards.json might have app_feature
        // Toggle dark theme if it's the dark theme reward
        if (reward.id === 'dark_theme') {
          // DIRECTLY SET THEME - no alerts, no conditions, no logs
          setThemeType(isDark ? 'light' : 'dark');
        }
        break;
        
      case 'boost':
        // Handle boost rewards
        Alert.alert(
          'Use Boost?',
          `Would you like to activate your ${reward.title}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Activate', 
              onPress: () => {
                // Implement boost activation logic here
                console.log('Activating boost:', reward.title);
                Alert.alert('Boost Activated', `Your ${reward.title} is now active!`);
              } 
            }
          ]
        );
        break;
        
      default:
        // For other reward types, just show information
        Alert.alert(
          reward.title,
          reward.description,
          [{ text: 'Close' }]
        );
    }
  }, [isPremium, onUpgradeToPremium, setThemeType, userLevel, isDark]);
  
  // Render premium lock if user is not premium
  if (!isPremium) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.headerText, { color: theme.text }]}>Premium Rewards</Text>
        <Text style={[styles.headerDescription, { color: theme.textSecondary }]}>
          Unlock these powerful features as you level up with premium!
        </Text>
        
        <PremiumLock 
          onOpenSubscription={onUpgradeToPremium}
          subscriptionModalVisible={false}
          onCloseSubscription={() => {}}
          totalXP={0}
          level={userLevel}
        />
      </View>
    );
  }
  
  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.text }]}>Loading rewards...</Text>
      </View>
    );
  }
  
  // Render the rewards with the refresh key to force re-render when theme changes
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]} key={refreshKey}>
      <Text style={[styles.headerText, { color: theme.text }]}>Premium Rewards</Text>
      <Text style={[styles.headerDescription, { color: theme.textSecondary }]}>
        Unlock powerful features as you level up!
      </Text>
      
      <View style={styles.rewardsContainer}>
        {rewards.map((reward) => (
          <RewardCard
            key={`${reward.id}-${refreshKey}`}
            reward={reward}
            isPremium={isPremium}
            userLevel={userLevel}
            onPress={() => handleRewardPress(reward)}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 14,
    marginBottom: 20,
  },
  rewardsContainer: {
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  }
});

export default Rewards;