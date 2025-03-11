import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Define rewards that users can unlock at different levels
const REWARDS = [
  {
    id: 'custom_routines',
    title: 'Custom Routines',
    description: 'Create and save your own personalized stretching routines',
    icon: 'create-outline',
    levelRequired: 2,
    isPremiumOnly: true
  },
  {
    id: 'advanced_analytics',
    title: 'Advanced Analytics',
    description: 'Gain deeper insights into your stretching patterns and progress',
    icon: 'analytics-outline',
    levelRequired: 3,
    isPremiumOnly: true
  },
  {
    id: 'exclusive_stretches',
    title: 'Exclusive Stretches',
    description: 'Access to 15+ premium stretching exercises',
    icon: 'fitness-outline',
    levelRequired: 4,
    isPremiumOnly: true
  },
  {
    id: 'routine_sharing',
    title: 'Routine Sharing',
    description: 'Share your favorite routines with friends and colleagues',
    icon: 'share-social-outline',
    levelRequired: 5,
    isPremiumOnly: true
  },
  {
    id: 'dark_theme',
    title: 'Dark Theme',
    description: 'Enable a sleek dark mode for comfortable evening stretching',
    icon: 'moon-outline',
    levelRequired: 6,
    isPremiumOnly: true
  },
  {
    id: 'custom_reminders',
    title: 'Custom Reminders',
    description: 'Set personalized reminders with custom messages',
    icon: 'notifications-outline',
    levelRequired: 7,
    isPremiumOnly: true
  },
  {
    id: 'expert_guidance',
    title: 'Expert Guidance',
    description: 'Access to video tutorials from professional trainers',
    icon: 'videocam-outline',
    levelRequired: 8,
    isPremiumOnly: true
  },
  {
    id: 'priority_support',
    title: 'Priority Support',
    description: 'Get priority customer support and feature requests',
    icon: 'headset-outline',
    levelRequired: 9,
    isPremiumOnly: true
  },
  {
    id: 'beta_features',
    title: 'Beta Features',
    description: 'Early access to upcoming features and improvements',
    icon: 'flask-outline',
    levelRequired: 10,
    isPremiumOnly: true
  }
];

// Reward card component
const RewardCard = ({ reward, userLevel, onPress }) => {
  const isUnlocked = userLevel >= reward.levelRequired;
  
  return (
    <TouchableOpacity 
      style={[styles.rewardCard, !isUnlocked && styles.rewardLocked]}
      onPress={() => onPress(reward, isUnlocked)}
    >
      <View style={styles.rewardHeader}>
        <View style={[styles.rewardIconContainer, isUnlocked && styles.rewardIconContainerUnlocked]}>
          <Ionicons 
            name={reward.icon} 
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

interface RewardsProps {
  userLevel: number;
  isPremium: boolean;
  onUpgradeToPremium: () => void;
}

const Rewards: React.FC<RewardsProps> = ({
  userLevel,
  isPremium,
  onUpgradeToPremium
}) => {
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
  const availableRewards = REWARDS.filter(reward => 
    isPremium || !reward.isPremiumOnly || reward.levelRequired <= userLevel
  );
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rewards</Text>
        <Text style={styles.subtitle}>
          Unlock special features as you level up
        </Text>
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
});

export default Rewards; 