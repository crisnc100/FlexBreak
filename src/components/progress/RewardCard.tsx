import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Reward } from '../../utils/progress/types';
import { useTheme } from '../../context/ThemeContext';

interface RewardCardProps {
  reward: Reward;
  onPress: () => void;
  isPremium: boolean;
  userLevel: number;
}

const RewardCard: React.FC<RewardCardProps> = ({ reward, onPress, isPremium, userLevel }) => {
  const { theme, isDark } = useTheme();
  
  // Check if reward is dark theme and it's unlocked (to show active state)
  const isDarkThemeReward = reward.id === 'dark_theme';
  
  // Get icon color based on reward type
  const getIconColor = () => {
    if (isDarkThemeReward) return isDark ? '#BB86FC' : '#673AB7';
    if (reward.id === 'custom_reminders') return '#2196F3';
    if (reward.id === 'xp_boost') return '#FF9800';
    if (reward.id === 'custom_routines') return '#4CAF50';
    if (reward.id === 'streak_freezes') return '#00BCD4';
    return '#673AB7'; // Default for other rewards
  };
  
  // Get icon name based on reward type
  const getIconName = () => {
    if (isDarkThemeReward) return isDark ? 'moon' : 'moon-outline';
    if (reward.id === 'custom_reminders') return reward.unlocked ? 'notifications' : 'notifications-outline';
    if (reward.id === 'xp_boost') return reward.unlocked ? 'flash' : 'flash-outline';
    if (reward.id === 'custom_routines') return reward.unlocked ? 'create' : 'create-outline';
    if (reward.id === 'streak_freezes') return reward.unlocked ? 'snow' : 'snow-outline';
    return reward.icon || 'star-outline';
  };
  
  // Get reward status text
  const getStatusText = () => {
    if (!isPremium) return 'Premium Only';
    if (reward.unlocked) return 'Unlocked';
    return `Unlocks at Level ${reward.levelRequired}`;
  };
  
  // Get status color
  const getStatusColor = () => {
    if (!isPremium) return '#FF9800';
    if (reward.unlocked) return '#4CAF50';
    return '#757575';
  };
  
  // Determine if reward is enabled
  const isEnabled = reward.unlocked && isPremium;
  
  // Special handling for dark theme reward
  const handleRewardPress = () => {
    if (isEnabled) {
      onPress();
    }
  };
  
  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.cardBackground,
          borderColor: isEnabled ? theme.accent + '40' : theme.border,
          opacity: isEnabled ? 1 : 0.8
        },
        isDarkThemeReward && isDark && styles.activeContainer
      ]}
      onPress={handleRewardPress}
      disabled={!isEnabled}
    >
      <View style={[
        styles.iconContainer, 
        { backgroundColor: isEnabled ? getIconColor() + '20' : theme.backgroundLight }
      ]}>
        <Ionicons 
          name={getIconName() as any} 
          size={24} 
          color={getIconColor()} 
        />
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={[styles.title, { color: theme.text }]}>
          {reward.title}
          {isDarkThemeReward && isDark && ' (Active)'}
        </Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>{reward.description}</Text>
        
        <View style={[styles.statusContainer, { backgroundColor: getStatusColor() + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>
      
      {isEnabled && (
        <View style={styles.actionContainer}>
          <Ionicons 
            name={isDarkThemeReward ? (isDark ? 'checkmark-circle' : 'chevron-forward') : 'chevron-forward'} 
            size={20} 
            color={theme.accent} 
          />
        </View>
      )}
      
      {!isEnabled && (
        <View style={styles.lockContainer}>
          {!isPremium ? (
            <Text style={styles.premiumBadge}>Premium</Text>
          ) : !reward.unlocked ? (
            <Text style={styles.levelBadge}>Level {reward.levelRequired}</Text>
          ) : null}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activeContainer: {
    borderColor: '#673AB7',
    borderWidth: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 8,
  },
  statusContainer: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  actionContainer: {
    marginLeft: 12,
  },
  lockContainer: {
    marginLeft: 8,
  },
  premiumBadge: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '600',
    padding: 4,
    paddingHorizontal: 8,
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
  },
  levelBadge: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '600',
    padding: 4,
    paddingHorizontal: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
});

export default RewardCard; 