import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { saveIsPremium } from '../services/storageService';
import { usePremium } from '../context/PremiumContext';
import { useFeatureAccess, PREMIUM_STATUS_CHANGED } from '../hooks/progress/useFeatureAccess';
import { useGamification } from '../hooks/progress/useGamification';
import * as storageService from '../services/storageService';
import { gamificationEvents, REWARD_UNLOCKED_EVENT } from '../hooks/progress/useGamification';
import { useTheme } from '../context/ThemeContext';
import CORE_REWARDS from '../data/rewards.json';

/**
 * Helper function to initialize rewards from rewards.json
 */
const createInitialRewards = () => {
  // Convert array to object with id as keys
  return Object.fromEntries(
    CORE_REWARDS.map(reward => [
      reward.id, 
      { 
        ...reward, 
        unlocked: false,
        // Add uses property for rewards that should have them
        ...(reward.id === 'xp_boost' ? { initialUses: 2 } : {}),
        ...(reward.id === 'streak_freezes' ? { initialUses: 1 } : {})
      }
    ])
  );
};

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
      console.log(`Current user level: ${currentProgress?.level || 1}`);
      
      // Initialize rewards if they don't exist
      if (!currentProgress || !currentProgress.rewards || Object.keys(currentProgress.rewards).length === 0) {
        // Create initial rewards using our helper function
        const initialRewards = createInitialRewards();
          
        const updatedProgress = {
          ...(currentProgress || storageService.INITIAL_STATE.USER_PROGRESS),
          rewards: initialRewards
        };
        await storageService.saveUserProgress(updatedProgress);
      }
      
      // Manually unlock dark theme if level is sufficient
      if (currentProgress && currentProgress.level && currentProgress.level >= 2) {
        if (currentProgress.rewards?.dark_theme && !currentProgress.rewards.dark_theme.unlocked) {
          // Update dark theme property directly
          const updatedProgress = { ...currentProgress };
          updatedProgress.rewards.dark_theme.unlocked = true;
          await storageService.saveUserProgress(updatedProgress);
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
      const userProgress = await storageService.getUserProgress();
      
      // Update UI
      if (refreshPremiumStatus) await refreshPremiumStatus();
      if (refreshAccess) refreshAccess();
      if (refreshData) refreshData();
      if (refreshTheme) refreshTheme();
      
      // Close the modal
      if (onSubscribe) onSubscribe();
      onClose();
      
    } catch (error) {
      console.error('Error during subscription:', error);
      alert(`There was an error processing your subscription. Please try again.\nError during subscription: ${error}`);
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
              <Text style={styles.benefitText}>Unlock custom routines</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.benefitText}>Dark mode</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.benefitText}>XP Boost & Streak protection</Text>
            </View>
            
            <View style={styles.benefitItem}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.benefitText}>Premium stretches & features</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.subscribeButton} onPress={handleSubscribe}>
            <Text style={styles.subscribeText}>Subscribe Now</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
            <Text style={styles.restoreText}>Restore Purchase</Text>
          </TouchableOpacity>
          
          <Text style={styles.disclaimer}>
            Premium features unlock as you level up. Subscribe once to unlock them permanently.
          </Text>
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
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  modalHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  benefitsList: {
    width: '100%',
    marginVertical: 16,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  benefitText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#333',
  },
  subscribeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    marginTop: 16,
    alignItems: 'center',
    width: '100%',
  },
  subscribeText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  restoreButton: {
    marginTop: 16,
    padding: 8,
  },
  restoreText: {
    fontSize: 12,
    color: '#666',
  },
  disclaimer: {
    fontSize: 12,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
}); 