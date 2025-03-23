import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { saveIsPremium } from '../services/storageService';
import { usePremium } from '../context/PremiumContext';
import { useFeatureAccess, PREMIUM_STATUS_CHANGED } from '../hooks/progress/useFeatureAccess';
import { useGamification } from '../hooks/progress/useGamification';
import * as rewardManager from '../utils/progress/rewardManager';
import * as storageService from '../services/storageService';
import { gamificationEvents, REWARD_UNLOCKED_EVENT } from '../hooks/progress/useGamification';
import { useTheme } from '../context/ThemeContext';

interface SubscriptionModalProps {
  visible: boolean;
  onClose: () => void;
  onSubscribe?: () => void;
}

export default function SubscriptionModal({ visible, onClose, onSubscribe }: SubscriptionModalProps) {
  // Use the global premium context
  const { setPremiumStatus, refreshPremiumStatus } = usePremium();
  const { refreshAccess } = useFeatureAccess();
  const { level, refreshData } = useGamification();
  const { refreshTheme } = useTheme();

  const handleSubscribe = async () => {
    try {
      console.log('Starting subscription process...');
      
      // First, get current user progress
      const currentProgress = await storageService.getUserProgress();
      console.log(`Current user level: ${currentProgress.level}`);
      
      // Initialize rewards if they don't exist
      if (!currentProgress.rewards || Object.keys(currentProgress.rewards).length === 0) {
        currentProgress.rewards = rewardManager.initializeRewards();
        await storageService.saveUserProgress({
          ...currentProgress,
          rewards: rewardManager.initializeRewards()
        });
      }
      
      // Manually unlock dark theme if level is sufficient
      if (currentProgress.level >= 2) {
        if (currentProgress.rewards?.dark_theme && !currentProgress.rewards.dark_theme.unlocked) {
          await rewardManager.unlockReward('dark_theme');
          console.log('Dark theme manually unlocked due to sufficient level');
        }
      }
      
      // Only then update premium status
      await setPremiumStatus(true);
      console.log('Premium status updated');
      
      // Emit event for premium status change
      gamificationEvents.emit(PREMIUM_STATUS_CHANGED);
      console.log('Premium status changed event emitted');
      
      // Force update rewards based on current level
      const { updatedProgress, newlyUnlocked } = await rewardManager.updateRewards(currentProgress);
      console.log(`Updating rewards for level ${updatedProgress.level}, unlocked ${newlyUnlocked.length} rewards`);
      
      // Save the updated progress
      await storageService.saveUserProgress(updatedProgress);
      
      // Allow context updates to propagate
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Refresh premium status
      await refreshPremiumStatus();
      
      // Emit reward unlocked event if any rewards were unlocked
      if (newlyUnlocked.length > 0) {
        gamificationEvents.emit(REWARD_UNLOCKED_EVENT, newlyUnlocked);
        console.log('Unlocked rewards:', newlyUnlocked.map(r => r.title).join(', '));
      }
      
      // Refresh feature access to reflect newly unlocked features
      await refreshAccess();
      
      // Refresh theme context
      refreshTheme();
      
      // Refresh gamification data to ensure everything is in sync
      await refreshData();
      
      // Make sure settings are applied immediately
      await rewardManager.isRewardUnlocked('dark_theme').then(isUnlocked => {
        console.log('Dark theme status after unlock process:', isUnlocked ? 'UNLOCKED' : 'LOCKED');
      });
      
      // Allow state changes to take effect
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Call the onSubscribe callback if provided (for backward compatibility)
      if (onSubscribe) {
        onSubscribe();
      }
      
      onClose();
      
      // Show what features were unlocked in the success message
      if (newlyUnlocked.length > 0) {
        alert(`Subscription successful! You now have premium access.\n\nUnlocked features:\n${newlyUnlocked.map(r => `- ${r.title}`).join('\n')}`);
      } else {
        alert('Subscription successful! You now have premium access.');
      }
    } catch (error) {
      console.error('Error during subscription:', error);
      alert('There was an error processing your subscription. Please try again.');
    }
  };

  const handleRestore = () => {
    // In a real app, this would check for existing purchases
    alert('No previous purchases found.');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          
          <Text style={styles.modalHeader}>Go Premium</Text>
          
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.benefitText}>Track your progress</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.benefitText}>Set daily reminders</Text>
            </View>
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.benefitText}>Save favorite stretches</Text>
            </View>
          </View>
          
          <Text style={styles.priceText}>$4.99/month</Text>
          
          <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe}>
            <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.restoreLink} onPress={handleRestore}>
            <Text style={styles.restoreLinkText}>Restore Purchase</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  modalHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 24,
  },
  benefitsList: {
    width: '100%',
    marginBottom: 24,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  priceText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 24,
  },
  subscribeButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  subscribeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  restoreLink: {
    padding: 8,
  },
  restoreLinkText: {
    fontSize: 12,
    color: '#666',
  },
}); 