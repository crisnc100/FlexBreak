import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Reward } from '../../utils/progress/types';
import { useTheme } from '../../context/ThemeContext';
import * as storageService from '../../services/storageService';
import { useState, useEffect } from 'react';

interface RewardCardProps {
  reward: Reward;
  onPress: () => void;
  isPremium: boolean;
  userLevel: number;
}

const RewardCard: React.FC<RewardCardProps> = ({ reward, onPress, isPremium, userLevel }) => {
  const { theme, isDark } = useTheme();
  const [realUserLevel, setRealUserLevel] = useState(userLevel);
  
  // Get the actual user level from storage
  useEffect(() => {
    const loadRealUserLevel = async () => {
      try {
        const userProgress = await storageService.getUserProgress();
        const level = userProgress?.level || 1;
        console.log(`Direct level check for ${reward.id}: ${level}`);
        setRealUserLevel(level);
      } catch (error) {
        console.error('Error getting real user level:', error);
      }
    };
    
    loadRealUserLevel();
  }, [reward.id]);
  
  // Add a direct console log for rewards component props
  console.log(`RewardCard rendered: ${reward.id}
  - Component userLevel: ${userLevel}
  - Real user level: ${realUserLevel}`);
  
  // Check if reward is dark theme and it's unlocked (to show active state)
  const isDarkThemeReward = reward.id === 'dark_theme';
  const isDarkThemeActive = isDarkThemeReward && isDark;
  
  // Get icon color based on reward type
  const getIconColor = () => {
    switch (reward.id) {
      case 'dark_theme':
        return isDark ? '#BB86FC' : '#673AB7'; // Purple - brighter in dark mode
      case 'custom_reminders':
        return '#2196F3'; // Blue
      case 'xp_boost':
        return '#FF9800'; // Orange
      case 'custom_routines':
        return '#4CAF50'; // Green
      case 'streak_freezes':
        return '#00BCD4'; // Cyan
      case 'premium_stretches':
        return '#F44336'; // Red
      case 'desk_break_boost':
        return '#009688'; // Teal
      case 'focus_area_mastery':
        return '#FFC107'; // Amber
      default:
        return '#673AB7'; // Default purple
    }
  };
  
  // Get icon name based on reward type
  const getIconName = () => {
    // For dark theme, show filled icon when active, outline when inactive but unlocked
    if (isDarkThemeReward) {
      if (isDark) return 'moon'; // Dark theme is active
      return reward.unlocked ? 'moon-outline' : 'lock-closed-outline';
    }
    
    // Special case for streak freezes
    if (reward.id === 'streak_freezes') {
      return realUserLevel >= 6 ? 'snow' : 'snow-outline';
    }
    
    // Base icon from the reward data
    let iconName = reward.icon || 'star';
    
    // Add outline suffix if not unlocked
    if (!reward.unlocked) {
      // If icon already has -outline, don't add it again
      if (!iconName.includes('-outline')) {
        iconName = `${iconName}-outline`;
      }
    }
    
    return iconName;
  };
  
  // Get reward status text
  const getStatusText = () => {
    // Special case for streak_freezes
    if (reward.id === 'streak_freezes') {
      return realUserLevel >= 6 ? 'Unlocked' : 'Unlocks at Level 6';
    }
    
    if (!isPremium) return 'Premium Only';
    if (reward.unlocked) return 'Unlocked';
    return `Unlocks at Level ${reward.levelRequired}`;
  };
  
  // Get status color
  const getStatusColor = () => {
    // Special case for streak_freezes
    if (reward.id === 'streak_freezes') {
      return realUserLevel >= 6 ? '#4CAF50' : '#757575';
    }
    
    if (!isPremium) return '#FF9800';
    if (reward.unlocked) return '#4CAF50';
    return '#757575';
  };
  
  // Get badge text for active toggleable features
  const getBadgeText = () => {
    if (isDarkThemeReward) {
      if (isDark) return 'Active';
      if (reward.unlocked || realUserLevel >= reward.levelRequired) return 'Tap to Enable';
      return null;
    }
    if (reward.id === 'xp_boost' && reward.unlocked) return '2x XP';
    return null;
  };
  
  // Explicitly track if streak freezes should be shown as unlocked
  const isStreakFreezeUnlocked = reward.id === 'streak_freezes' && realUserLevel >= 6;
  
  // Log the status for streak freezes to help debug
  if (reward.id === 'streak_freezes') {
    console.log(`Streak Freezes Card Status:
    - Provided userLevel: ${userLevel}
    - Real user level: ${realUserLevel} 
    - Unlocked in data: ${reward.unlocked}
    - isStreakFreezeUnlocked: ${isStreakFreezeUnlocked}
    - isEnabled: ${isStreakFreezeUnlocked || (isPremium && reward.unlocked)}
    - Status Text: ${getStatusText()}
    - Icon: ${getIconName()}`);
  }
  
  // Determine if reward is enabled
  const isEnabled = reward.id === 'streak_freezes'
    ? isStreakFreezeUnlocked // Special case: streak freezes only needs level 6+
    : (isPremium && (reward.unlocked || (isDarkThemeReward && realUserLevel >= reward.levelRequired)));
  
  // Direct handler for reward press - no unnecessary alerts
  const handleRewardPress = () => {
    // Special check for streak_freezes (level 6 requirement)
    if (reward.id === 'streak_freezes') {
      if (realUserLevel < 6) {
        return; // Don't allow interaction if under level 6
      }
      // Allow interaction if level 6+
    }

    // Only call handler if reward is enabled
    if (isEnabled) {
      // Just directly call parent handler - no alert, no message
      console.log(`DIRECTLY calling parent handler for reward: ${reward.id}`);
      onPress();
    }
  };
  
  // Force streak_freezes to have correct unlocked status based on user level
  const effectiveUnlocked = reward.id === 'streak_freezes'
    ? realUserLevel >= 6 
    : reward.unlocked;
  
  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { 
          backgroundColor: theme.cardBackground,
          borderColor: isEnabled ? (isDarkThemeReward && isDark ? '#BB86FC' : theme.accent + '40') : theme.border,
          opacity: isEnabled ? 1 : 0.8
        },
        isDarkThemeReward && isDark && styles.activeContainer
      ]}
      onPress={handleRewardPress}
      activeOpacity={0.4}
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
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text }]}>
            {reward.title}
          </Text>
          
          {getBadgeText() && (
            <View style={[styles.activeBadge, { backgroundColor: getIconColor() + '20' }]}>
              <Text style={[styles.activeBadgeText, { color: getIconColor() }]}>
                {getBadgeText()}
              </Text>
            </View>
          )}
        </View>
        
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {reward.description}
        </Text>
        
        <View style={[styles.statusContainer, { backgroundColor: getStatusColor() + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusText()}
          </Text>
        </View>
      </View>
      
      {isEnabled && (
        <View style={styles.actionContainer}>
          <Ionicons 
            name={
              isDarkThemeReward 
                ? (isDark ? 'checkmark-circle' : 'chevron-forward') 
                : isStreakFreezeUnlocked 
                  ? 'chevron-forward'
                  : 'chevron-forward'
            } 
            size={20} 
            color={theme.accent} 
          />
        </View>
      )}
      
      {!isEnabled && (
        <View style={styles.lockContainer}>
          {!isPremium && reward.id !== 'streak_freezes' ? (
            <Text style={styles.premiumBadge}>Premium</Text>
          ) : reward.id === 'streak_freezes' ? (
            realUserLevel < 6 ? <Text style={styles.levelBadge}>Level 6</Text> : null
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  activeBadge: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  activeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
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