import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as streakFreezeManager from '../../utils/progress/streakFreezeManager';
import { useFeatureAccess } from '../../hooks/progress/useFeatureAccess';
import { usePremium } from '../../context/PremiumContext';

interface StreakFreezeCardProps {
  currentStreak: number;
}

const StreakFreezeCard: React.FC<StreakFreezeCardProps> = ({ currentStreak }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [freezeData, setFreezeData] = useState({
    available: 0,
    used: 0,
    lastGranted: null
  });
  const { canAccessFeature, meetsLevelRequirement, getRequiredLevel } = useFeatureAccess();
  const { isPremium } = usePremium();
  
  // Check freeze data on mount
  useEffect(() => {
    loadFreezeData();
  }, []);
  
  // Load freeze data
  const loadFreezeData = async () => {
    setIsLoading(true);
    try {
      // First check if a weekly freeze should be granted
      if (canAccessFeature('streak_freezes')) {
        const data = await streakFreezeManager.checkAndGrantWeeklyStreakFreeze();
        setFreezeData({
          available: data.available,
          used: data.used,
          lastGranted: data.lastGranted
        });
      } else {
        const data = await streakFreezeManager.getStreakFreezeData();
        setFreezeData({
          available: data.available,
          used: data.used,
          lastGranted: data.lastGranted
        });
      }
    } catch (error) {
      console.error('Error loading streak freeze data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format last granted date
  const formatLastGranted = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  // Calculate time until next freeze
  const calculateTimeUntilNextFreeze = () => {
    if (!freezeData.lastGranted) return 'Soon';
    
    const lastGranted = new Date(freezeData.lastGranted);
    const nextGrant = new Date(lastGranted.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();
    
    const daysUntil = Math.ceil((nextGrant.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    
    if (daysUntil <= 0) return 'Soon';
    if (daysUntil === 1) return 'Tomorrow';
    return `In ${daysUntil} days`;
  };
  
  // Render locked state for non-premium users or users below required level
  if (!isPremium || !meetsLevelRequirement('streak_freezes')) {
    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="snow" size={24} color="#BDBDBD" />
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Streak Freezes</Text>
          <Text style={styles.subtitle}>
            {!isPremium 
              ? 'Premium Feature' 
              : `Unlocks at Level ${getRequiredLevel('streak_freezes')}`}
          </Text>
        </View>
        <View style={styles.lockedContainer}>
          <Ionicons name="lock-closed" size={18} color="#BDBDBD" />
        </View>
      </View>
    );
  }
  
  // If still loading
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="snow" size={24} color="#2196F3" />
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>Streak Freezes</Text>
          <Text style={styles.subtitle}>Loading data...</Text>
        </View>
        <ActivityIndicator size="small" color="#2196F3" />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="snow" size={24} color="#2196F3" />
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Streak Freezes</Text>
        <Text style={styles.subtitle}>
          Missing a day won't break your streak! You have {freezeData.available} freeze{freezeData.available !== 1 ? 's' : ''} available.
        </Text>
        {currentStreak >= 3 && (
          <Text style={styles.streakText}>
            Your current streak of {currentStreak} days is protected!
          </Text>
        )}
      </View>
      <View style={styles.badgeContainer}>
        <Text style={styles.freezeBadge}>{freezeData.available}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  streakText: {
    fontSize: 13,
    color: '#4CAF50',
    marginTop: 4,
    fontWeight: '500',
  },
  badgeContainer: {
    marginLeft: 8,
  },
  freezeBadge: {
    backgroundColor: '#2196F3',
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    width: 28,
    height: 28,
    borderRadius: 14,
    textAlign: 'center',
    lineHeight: 28,
    overflow: 'hidden',
  },
  lockedContainer: {
    padding: 8,
  },
});

export default StreakFreezeCard; 