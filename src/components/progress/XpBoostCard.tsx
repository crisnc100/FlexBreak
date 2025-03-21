import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as xpBoostManager from '../../utils/progress/xpBoostManager';
import { useFeatureAccess } from '../../hooks/progress/useFeatureAccess';
import { usePremium } from '../../context/PremiumContext';

interface XpBoostCardProps {
  onActivateBoost: () => void;
}

const XpBoostCard: React.FC<XpBoostCardProps> = ({ onActivateBoost }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [boostActive, setBoostActive] = useState(false);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [formattedTime, setFormattedTime] = useState('0h 0m');
  const { canAccessFeature, meetsLevelRequirement, getRequiredLevel } = useFeatureAccess();
  const { isPremium } = usePremium();
  
  // Check if boost is active on mount
  useEffect(() => {
    checkBoostStatus();
    
    // Set up interval to update remaining time
    const interval = setInterval(() => {
      if (boostActive) {
        updateRemainingTime();
      }
    }, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [boostActive]);
  
  // Check boost status
  const checkBoostStatus = async () => {
    setIsLoading(true);
    try {
      const { isActive, data } = await xpBoostManager.checkXpBoostStatus();
      setBoostActive(isActive);
      
      if (isActive) {
        updateRemainingTime();
      }
    } catch (error) {
      console.error('Error checking XP boost status:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update remaining time
  const updateRemainingTime = async () => {
    try {
      const timeMs = await xpBoostManager.getXpBoostRemainingTime();
      setRemainingTime(timeMs);
      setFormattedTime(xpBoostManager.formatRemainingTime(timeMs));
      
      // If boost just expired, update status
      if (timeMs <= 0 && boostActive) {
        setBoostActive(false);
      }
    } catch (error) {
      console.error('Error updating remaining time:', error);
    }
  };
  
  // Handle activating a boost
  const handleActivateBoost = async () => {
    if (!canAccessFeature('xp_boost')) {
      return;
    }
    
    setIsLoading(true);
    try {
      await xpBoostManager.activateXpBoost();
      setBoostActive(true);
      updateRemainingTime();
      onActivateBoost();
    } catch (error) {
      console.error('Error activating XP boost:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Render locked state for non-premium users or users below required level
  if (!isPremium || !meetsLevelRequirement('xp_boost')) {
    return (
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <Ionicons name="flash" size={24} color="#BDBDBD" />
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>XP Boost</Text>
          <Text style={styles.subtitle}>
            {!isPremium 
              ? 'Premium Feature' 
              : `Unlocks at Level ${getRequiredLevel('xp_boost')}`}
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
          <Ionicons name="flash" size={24} color="#FF9800" />
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>XP Boost</Text>
          <Text style={styles.subtitle}>Loading boost status...</Text>
        </View>
        <ActivityIndicator size="small" color="#FF9800" />
      </View>
    );
  }
  
  // Render active boost
  if (boostActive) {
    return (
      <View style={[styles.container, styles.activeContainer]}>
        <View style={[styles.iconContainer, styles.activeIconContainer]}>
          <Ionicons name="flash" size={24} color="#FFF" />
        </View>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>2x XP Boost Active!</Text>
          <Text style={styles.subtitle}>
            Time remaining: {formattedTime}
          </Text>
        </View>
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>2x</Text>
        </View>
      </View>
    );
  }
  
  // Render inactive boost (can be activated)
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="flash" size={24} color="#FF9800" />
      </View>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>XP Boost</Text>
        <Text style={styles.subtitle}>Double your XP for 24 hours</Text>
      </View>
      <TouchableOpacity 
        style={styles.activateButton}
        onPress={handleActivateBoost}
      >
        <Text style={styles.activateText}>Activate</Text>
      </TouchableOpacity>
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
  activeContainer: {
    backgroundColor: '#FFF9E6',
    borderColor: '#FFD54F',
    borderWidth: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF8E1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activeIconContainer: {
    backgroundColor: '#FF9800',
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
  activateButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  activateText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  statusContainer: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  lockedContainer: {
    padding: 8,
  },
});

export default XpBoostCard; 