import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import * as xpBoostManager from '../../utils/progress/modules/xpBoostManager';
import * as rewardManager from '../../utils/progress/modules/rewardManager';
import * as storageService from '../../services/storageService';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

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
  const [wasValidated, setWasValidated] = useState(false);
  
  const refreshData = async () => {
    try {
      // Get user progress to check level
      const userProgress = await storageService.getUserProgress();
      setUserLevel(userProgress.level || 1);
      
      // Check if XP boost reward is unlocked
      const isUnlocked = await rewardManager.isRewardUnlocked('xp_boost');
      setIsRewardUnlocked(isUnlocked);
      
      // Validate XP boost reward to ensure boosts are granted
      if (isUnlocked && !wasValidated) {
        const validationResult = await xpBoostManager.validateXpBoostReward();
        setWasValidated(true);
        
        if (validationResult.boostsAdded > 0) {
          setMessage(`${validationResult.boostsAdded} XP boosts were added to your account!`);
        }
      }
      
      // Check XP boost status
      const { isActive: active, data } = await xpBoostManager.checkXpBoostStatus();
      setIsActive(active);
      
      // Get available boosts
      const boosts = await xpBoostManager.getAvailableBoosts();
      setAvailableBoosts(boosts);
      
      // If active, calculate and format remaining time
      if (active) {
        const timeMs = await xpBoostManager.getXpBoostRemainingTime();
        setFormattedTime(xpBoostManager.formatRemainingTime(timeMs));
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error checking XP boost status', error);
      setLoading(false);
    }
  };
  
  useEffect(() => {
    // Load initial data
    refreshData();
    
    // Set up timer to refresh remaining time every minute
    const timer = isActive 
      ? setInterval(async () => {
          const timeMs = await xpBoostManager.getXpBoostRemainingTime();
          setFormattedTime(xpBoostManager.formatRemainingTime(timeMs));
          
          // If boost just expired, refresh all data
          if (timeMs <= 0) {
            refreshData();
          }
        }, 60000) 
      : null;
    
    // Clean up timer
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isActive]);
  
  const handleActivate = async () => {
    if (isActive || availableBoosts <= 0) return;
    
    setActivating(true);
    setMessage('');
    
    try {
      const result = await xpBoostManager.activateXpBoost();
      
      if (result.success) {
        // Refresh status after activation
        setMessage(result.message);
        await refreshData();
        
        // Call onActivate callback if provided
        if (onActivate) onActivate();
      } else {
        // Display error message
        setMessage(result.message);
      }
    } catch (error) {
      console.error('Error activating XP boost', error);
      setMessage('Failed to activate XP boost. Please try again.');
    } finally {
      setActivating(false);
    }
  };
  
  if (loading) {
    return (
      <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }
  
  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.headerRow}>
        <Ionicons name="flash" size={24} color={theme.accent} />
        <Text style={[styles.title, { color: theme.text }]}>XP Boost</Text>
      </View>
      
      {isActive ? (
        <View style={styles.content}>
          <Text style={[styles.activeText, { color: theme.accent }]}>
            2x XP Boost Active!
          </Text>
          <Text style={[styles.timeText, { color: theme.textSecondary }]}>
            Time remaining: {formattedTime}
          </Text>
          <Text style={[styles.smallText, { color: theme.textSecondary }]}>
            All XP earned is doubled while active
          </Text>
        </View>
      ) : (
        <View style={styles.content}>
          {!isRewardUnlocked ? (
            <>
              <Text style={[styles.boostText, { color: theme.text }]}>
                {userLevel < 4 
                  ? `Unlock XP Boosts at level 4!` 
                  : `XP Boost reward unlocked but not initialized`}
              </Text>
              <Text style={[styles.descText, { color: theme.textSecondary }]}>
                {userLevel < 4 
                  ? `You're level ${userLevel}. Keep going to unlock 2x XP boosts!` 
                  : `Please restart the app to claim your XP boosts`}
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.boostText, { color: theme.text }]}>
                {availableBoosts > 0 
                  ? `You have ${availableBoosts} XP boost stack${availableBoosts !== 1 ? 's' : ''} available!` 
                  : 'No XP boosts available'}
              </Text>
              <Text style={[styles.descText, { color: theme.textSecondary }]}>
                {availableBoosts > 0 
                  ? `Each boost doubles all XP earned for 72 hours` 
                  : `Complete more challenges to earn additional XP boosts!`}
              </Text>
            </>
          )}
          
          {message ? (
            <Text style={[styles.messageText, { 
              color: message.includes('Error') || message.includes('Failed') ? 'red' : theme.accent 
            }]}>
              {message}
            </Text>
          ) : null}
          
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
                {availableBoosts > 0 ? 'Activate Boost' : 'No Boosts Available'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}
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
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  content: {
    alignItems: 'center',
  },
  activeText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  boostText: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  timeText: {
    fontSize: 16,
    marginBottom: 8,
  },
  descText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  smallText: {
    fontSize: 14,
  },
  messageText: {
    fontSize: 14,
    marginVertical: 8,
    textAlign: 'center',
  },
  activateButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 8,
    minWidth: 150,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  }
});

export default XpBoostCard; 