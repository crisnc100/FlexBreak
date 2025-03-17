import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useProgressSystem from '../../hooks/useProgressSystem';
import * as rewardManager from '../../utils/progress/rewardManager';

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
    isPremiumOnly: true
  },
  {
    id: 'custom_reminders',
    title: 'Custom Reminders',
    description: 'Set personalized reminders with custom messages',
    icon: 'notifications-outline',
    levelRequired: 3,
    isPremiumOnly: true
  },
  {
    id: 'xp_boost',
    title: 'XP Boost',
    description: 'Get a 2x boost in XP for your daily streak',
    icon: 'flash-outline',
    levelRequired: 4,
    isPremiumOnly: true
  },
  {
    id: 'custom_routines',
    title: 'Custom Routines',
    description: 'Create and save your own personalized stretching routines',
    icon: 'create-outline',
    levelRequired: 5,
    isPremiumOnly: true
  },
  {
    id: 'streak_freezes',
    title: 'Streak Freezes',
    description: 'Miss a day, keep your streak—perfect for busy schedules',
    icon: 'snow-outline',
    levelRequired: 6,
    isPremiumOnly: true
  },
  {
    id: 'premium_stretches',
    title: 'Premium Stretches',
    description: 'Access to 15+ premium stretching exercises',
    icon: 'fitness-outline',
    levelRequired: 7,
    isPremiumOnly: true
  },
  {
    id: 'desk_break_boost',
    title: 'Desk Break Boost',
    description: 'Stretch in quick 15-sec bursts—3 fast routines!',
    icon: 'desktop-outline',
    levelRequired: 8,
    isPremiumOnly: true
  },
  {
    id: 'focus_area_mastery',
    title: 'Focus Area Mastery',
    description: 'Get ultimate focus badges for your favorite areas',
    icon: 'star-outline',
    levelRequired: 9,
    isPremiumOnly: true
  },
];

// Reward card component
const RewardCard = ({ reward, userLevel, onPress }) => {
  const isUnlocked = userLevel >= reward.levelRequired;

  // Convert icon name to outline version for Ionicons
  const iconName = reward.icon.includes('-outline') 
    ? reward.icon 
    : `${reward.icon}-outline`;

  return (
    <TouchableOpacity
      style={[styles.rewardCard, !isUnlocked && styles.rewardLocked]}
      onPress={() => onPress(reward, isUnlocked)}
    >
      <View style={styles.rewardHeader}>
        <View style={[styles.rewardIconContainer, isUnlocked && styles.rewardIconContainerUnlocked]}>
          <Ionicons
            name={iconName}
            size={24}
            color={isUnlocked ? '#FFFFFF' : '#999'}
          />
        </View>

        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>Level {reward.levelRequired}</Text>
        </View>
      </View>

      <Text style={[styles.rewardTitle, !isUnlocked && styles.rewardLockedText]}>
        {reward.title}
      </Text>

      <Text style={styles.rewardDescription}>
        {reward.description}
      </Text>

      {!isUnlocked && (
        <View style={styles.lockContainer}>
          <Ionicons name="lock-closed" size={16} color="#999" />
          <Text style={styles.lockText}>
            Unlock at Level {reward.levelRequired}
          </Text>
        </View>
      )}

      {isUnlocked && (
        <TouchableOpacity style={styles.useButton}>
          <Text style={styles.useButtonText}>Use</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const Rewards: React.FC<RewardsProps> = ({
  userLevel,
  isPremium,
  onUpgradeToPremium
}) => {
  // Get user progress data to display XP
  const { userProgress } = useProgressSystem();
  const [rewards, setRewards] = useState(FALLBACK_REWARDS);
  const [loading, setLoading] = useState(true);
  
  // Load rewards from the reward manager
  useEffect(() => {
    const loadRewards = async () => {
      try {
        setLoading(true);
        const allRewards = await rewardManager.getAllRewards();
        
        if (allRewards && allRewards.length > 0) {
          // Convert rewards to the format expected by the component
          const formattedRewards = allRewards.map(reward => ({
            ...reward,
            isPremiumOnly: true // All rewards require premium
          }));
          setRewards(formattedRewards);
        }
      } catch (error) {
        console.error('Error loading rewards:', error);
        // Fall back to the static rewards array
        setRewards(FALLBACK_REWARDS);
      } finally {
        setLoading(false);
      }
    };
    
    loadRewards();
  }, []);
  
  // Handle reward press
  const handleRewardPress = (reward, isUnlocked) => {
    if (!isPremium && reward.isPremiumOnly) {
      // Show premium upgrade prompt
      onUpgradeToPremium();
      return;
    }

    if (isUnlocked) {
      // Navigate to the feature or show a modal with details
      console.log('Using reward:', reward.title);
    } else {
      // Show information about how to unlock
      console.log('Need to reach level', reward.levelRequired, 'to unlock', reward.title);
    }
  };

  // Filter rewards to show
  const availableRewards = rewards.filter(reward =>
    isPremium || !reward.isPremiumOnly || reward.levelRequired <= userLevel
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading rewards...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.title}>Rewards</Text>
        
        {/* Improved level and XP display */}
        <View style={styles.levelBadgeContainer}>
          <View style={styles.levelBadgeInner}>
            <Ionicons name="trophy" size={22} color="#4CAF50" />
            <View style={styles.levelTextContainer}>
              <Text style={styles.levelValue}>{userLevel}</Text>
              <Text style={styles.levelLabel}>LEVEL</Text>
            </View>
          </View>
          
          {userProgress && (
            <View style={styles.xpBadge}>
              <Ionicons name="flash" size={16} color="#FFD700" />
              <Text style={styles.xpText}>{userProgress.totalXP} XP</Text>
            </View>
          )}
        </View>
      </View>

      {!isPremium && (
        <View style={styles.premiumBanner}>
          <Ionicons name="star" size={24} color="#FFD700" />
          <Text style={styles.premiumText}>
            Upgrade to Premium to unlock all rewards
          </Text>
          <TouchableOpacity
            style={styles.upgradeButton}
            onPress={onUpgradeToPremium}
          >
            <Text style={styles.upgradeButtonText}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.rewardsContainer}>
        {availableRewards.map(reward => (
          <RewardCard
            key={reward.id}
            reward={reward}
            userLevel={userLevel}
            onPress={handleRewardPress}
          />
        ))}
      </View>

      <View style={styles.comingSoonContainer}>
        <Text style={styles.comingSoonTitle}>Coming Soon</Text>
        <Text style={styles.comingSoonText}>
          More rewards and features are being developed. Stay tuned!
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  // New styles for improved level badge
  levelBadgeContainer: {
    backgroundColor: '#F2F8F2',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
    overflow: 'hidden',
    padding: 6,
  },
  levelBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  levelTextContainer: {
    marginLeft: 8,
    alignItems: 'center',
  },
  levelValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  levelLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#4CAF50',
    letterSpacing: 1,
  },
  premiumBanner: {
    backgroundColor: '#FFF9C4',
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD600',
  },
  premiumText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  upgradeButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  upgradeButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rewardsContainer: {
    paddingHorizontal: 16,
  },
  rewardCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  rewardLocked: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rewardIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardIconContainerUnlocked: {
    backgroundColor: '#4CAF50',
  },
  levelBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  levelText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  rewardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  rewardLockedText: {
    color: '#999',
  },
  rewardDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  lockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockText: {
    fontSize: 12,
    color: '#999',
    marginLeft: 4,
  },
  useButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  useButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  comingSoonContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  comingSoonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 14,
    color: '#666',
  },
  xpBadge: {
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFD600',
  },
  xpText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF8F00',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
  },
});

export default Rewards;