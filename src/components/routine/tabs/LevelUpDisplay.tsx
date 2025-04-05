import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { RewardItem } from '../types/completedRoutine.types';

type LevelUpDisplayProps = {
  oldLevel: number;
  newLevel: number;
  isDark: boolean;
  isSimulated: boolean;
  rewards?: RewardItem[];
  animValues: {
    levelUpAnim: Animated.Value;
    levelUpScale: Animated.Value;
  };
};

const LevelUpDisplay: React.FC<LevelUpDisplayProps> = ({
  oldLevel,
  newLevel,
  isDark,
  isSimulated,
  rewards,
  animValues
}) => {
  // Render reward item with optional activate button
  const renderRewardItem = (reward: RewardItem, index: number) => {
    // Skip rendering if reward is invalid
    if (!reward) return null;
    
    let iconName = 'gift-outline';
    
    // Choose icon based on reward type
    switch (reward.type) {
      case 'feature':
        iconName = 'unlock-outline';
        break;
      case 'item':
        iconName = 'cube-outline';
        break;
      case 'cosmetic':
        iconName = 'color-palette-outline';
        break;
    }
    
    return (
      <View key={`reward-${index}`} style={styles.rewardItem}>
        <Ionicons name={iconName as any} size={20} color="#FFD700" />
        <View style={styles.rewardContent}>
          <Text style={styles.rewardName}>{reward.name || 'Reward'}</Text>
          <Text style={styles.rewardDescription}>{reward.description || 'New feature unlocked!'}</Text>
        </View>
      </View>
    );
  };

  return (
    <Animated.View style={[
      styles.levelUpContainer,
      isSimulated && styles.simulatedLevelUpContainer,
      {
        opacity: animValues.levelUpAnim,
        transform: [{ scale: animValues.levelUpScale }]
      }
    ]}>
      <LinearGradient
        colors={isDark ? 
          (isSimulated ? ['#ff6f00', '#ff9800'] : ['#1a237e', '#3949ab']) : 
          (isSimulated ? ['#ff9800', '#ffb74d'] : ['#3f51b5', '#7986cb'])
        }
        style={styles.levelUpGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.levelUpHeader}>
          <Ionicons 
            name={isSimulated ? "flash" : "trending-up"} 
            size={24} 
            color={isSimulated ? "#FFFFFF" : "#FFD700"} 
          />
          <Text style={styles.levelUpTitle}>
            {isSimulated ? 'XP Boost Level Up!' : 'Level Up!'}
          </Text>
        </View>
        
        <View style={styles.levelNumbers}>
          <View style={styles.levelCircle}>
            <Text style={styles.levelNumber}>{oldLevel}</Text>
          </View>
          <View style={styles.levelArrow}>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </View>
          <View style={[styles.levelCircle, styles.newLevelCircle]}>
            <Text style={styles.levelNumber}>{newLevel}</Text>
          </View>
        </View>
        
        {/* Show rewards if available */}
        {rewards && rewards.length > 0 && (
          <View style={styles.rewardsContainer}>
            <Text style={styles.rewardsTitle}>Rewards Unlocked</Text>
            {rewards.map((reward, index) => {
              // Only show the first reward in the UI to save space
              if (index > 0) return null;
              return renderRewardItem(reward, index);
            })}
            {rewards.length > 1 && (
              <Text style={[styles.rewardDescription, {textAlign: 'center', marginTop: 4}]}>
                +{rewards.length - 1} more {rewards.length - 1 === 1 ? 'reward' : 'rewards'}
              </Text>
            )}
          </View>
        )}
      </LinearGradient>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  levelUpContainer: {
    width: '100%',
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  simulatedLevelUpContainer: {
    position: 'relative',
    overflow: 'visible',
  },
  levelUpGradient: {
    padding: 12,
    borderRadius: 12,
  },
  levelUpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  levelUpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  levelNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  levelCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newLevelCircle: {
    backgroundColor: 'rgba(255,215,0,0.3)',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  levelNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  levelArrow: {
    marginHorizontal: 10,
  },
  rewardsContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  rewardsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  rewardContent: {
    marginLeft: 8,
    flex: 1,
  },
  rewardName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  rewardDescription: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.8,
  },
});

export default LevelUpDisplay; 