import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as rewardManager from '../../utils/progress/rewardManager';
import { Reward } from '../../utils/progress/types';
import RewardCard from './RewardCard';
import { useTheme } from '../../context/ThemeContext';
import PremiumLock from './PremiumLock';

// Define the props interface
interface RewardsProps {
  userLevel: number;
  isPremium: boolean;
  onUpgradeToPremium: () => void;
}

// Fallback rewards data in case loading fails
const FALLBACK_REWARDS = [
  {
    id: 'dark_theme',
    title: 'Dark Theme',
    description: 'Enable a sleek dark mode for comfortable evening stretching',
    icon: 'moon-outline',
    levelRequired: 2,
    isPremiumOnly: true,
    unlocked: false,
    type: 'app_feature'
  },
  {
    id: 'custom_reminders',
    title: 'Custom Reminders',
    description: 'Set personalized reminders with custom messages',
    icon: 'notifications-outline',
    levelRequired: 3,
    isPremiumOnly: true,
    unlocked: false,
    type: 'app_feature'
  },
  {
    id: 'xp_boost',
    title: 'XP Boost',
    description: 'Get a 2x boost in XP for your daily streak',
    icon: 'flash-outline',
    levelRequired: 4,
    isPremiumOnly: true,
    unlocked: false,
    type: 'app_feature'
  },
  {
    id: 'custom_routines',
    title: 'Custom Routines',
    description: 'Create and save your own personalized stretching routines',
    icon: 'create-outline',
    levelRequired: 5,
    isPremiumOnly: true,
    unlocked: false,
    type: 'app_feature'
  },
  {
    id: 'streak_freezes',
    title: 'Streak Freezes',
    description: 'Miss a day, keep your streak—perfect for busy schedules',
    icon: 'snow-outline',
    levelRequired: 6,
    isPremiumOnly: true,
    unlocked: false,
    type: 'app_feature'
  }
];

const Rewards: React.FC<RewardsProps> = ({ userLevel, isPremium, onUpgradeToPremium }) => {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { theme, isDark, themeType, setThemeType } = useTheme();
  
  // Load rewards when component mounts
  useEffect(() => {
    loadRewards();
  }, []);
  
  // Load rewards data from storage
  const loadRewards = async () => {
    setIsLoading(true);
    try {
      // Get rewards from reward manager
      const allRewards = await rewardManager.getAllRewards();
      
      // If rewards exist, use them
      if (allRewards && allRewards.length > 0) {
        // Sort by level required
        const sortedRewards = [...allRewards].sort((a, b) => a.levelRequired - b.levelRequired);
        setRewards(sortedRewards);
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
  
  // Handle reward press
  const handleRewardPress = (reward: Reward) => {
    // Handle different reward types
    switch (reward.id) {
      case 'dark_theme':
        // Toggle between light and dark modes
        setThemeType(isDark ? 'light' : 'dark');
        break;
      case 'custom_reminders':
        Alert.alert('Custom Reminders', 'You can now set custom reminder messages on the Home screen.');
        break;
      case 'xp_boost':
        Alert.alert('XP Boost', 'Check the Progress screen to activate your 2x XP boost!');
        break;
      case 'custom_routines':
        Alert.alert('Custom Routines', 'You can now create custom routines from the Home screen.');
        break;
      case 'streak_freezes':
        Alert.alert('Streak Freezes', 'You now have access to streak freezes. Check the Progress screen for details.');
        break;
      default:
        Alert.alert(reward.title, `You've unlocked ${reward.title}!`);
    }
  };
  
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
  
  // Filter rewards to show only the five important ones
  const filteredRewards = rewards.filter(reward => 
    ['dark_theme', 'custom_reminders', 'xp_boost', 'custom_routines', 'streak_freezes'].includes(reward.id)
  );
  
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.headerText, { color: theme.text }]}>Premium Rewards</Text>
      <Text style={[styles.headerDescription, { color: theme.textSecondary }]}>
        Unlock powerful features as you level up!
      </Text>
      
      <View style={styles.rewardsContainer}>
        {filteredRewards.map((reward) => (
          <RewardCard
            key={reward.id}
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