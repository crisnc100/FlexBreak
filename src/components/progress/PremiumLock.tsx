import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SubscriptionModal from '../SubscriptionModal';
import { useGamification, gamificationEvents, XP_UPDATED_EVENT } from '../../hooks/progress/useGamification';

interface PremiumLockProps {
  onOpenSubscription: () => void;
  subscriptionModalVisible: boolean;
  onCloseSubscription: () => void;
  totalXP?: number;
  level?: number;
}

const PremiumLock: React.FC<PremiumLockProps> = ({
  onOpenSubscription,
  subscriptionModalVisible,
  onCloseSubscription,
  totalXP: propsTotalXP,
  level: propsLevel
}) => {
  // Use the gamification hook to get live data
  const { totalXP: hookTotalXP, level: hookLevel, refreshData } = useGamification();
  
  // Use hook values if available, otherwise fallback to props (for backward compatibility)
  const totalXP = hookTotalXP || propsTotalXP || 0;
  const level = hookLevel || propsLevel || 1;
  
  // Listen for XP update events to refresh data
  useEffect(() => {
    console.log('Setting up XP update listener in PremiumLock');
    
    // Refresh data on mount
    refreshData();
    
    // Handle XP update events
    const handleXpUpdate = (data: any) => {
      console.log('PremiumLock: XP update detected', data);
      refreshData();
    };
    
    // Register the event listener
    gamificationEvents.on(XP_UPDATED_EVENT, handleXpUpdate);
    
    // Clean up
    return () => {
      gamificationEvents.off(XP_UPDATED_EVENT, handleXpUpdate);
    };
  }, [refreshData]);

  // Format XP with commas for better readability
  const formattedXP = totalXP.toLocaleString();

  return (
    <View style={styles.premiumContainer}>
      {/* XP Badge */}
      <View style={styles.xpContainer}>
        <View style={styles.xpBadge}>
          <Text style={styles.xpValue}>{formattedXP}</Text>
          <Text style={styles.xpLabel}>XP</Text>
        </View>
        <View style={styles.levelBadge}>
          <Text style={styles.levelValue}>Level {level}</Text>
        </View>
      </View>
      
      <Ionicons name="trophy" size={80} color="#FFD700" style={styles.trophyIcon} />
      <Text style={styles.premiumTitle}>Unlock Your Full Potential!</Text>
      <Text style={styles.premiumSubtitle}>
        You've earned {formattedXP} XP so far. Upgrade to Premium to track your progress and unlock exclusive features!
      </Text>
      
      <View style={styles.premiumFeatures}>
        <View style={styles.premiumFeatureItem}>
          <Ionicons name="calendar" size={24} color="#FF9800" />
          <Text style={styles.premiumFeatureText}>Track your stretching journey</Text>
        </View>
        <View style={styles.premiumFeatureItem}>
          <Ionicons name="analytics" size={24} color="#FF9800" />
          <Text style={styles.premiumFeatureText}>See area focus breakdown</Text>
        </View>
        <View style={styles.premiumFeatureItem}>
          <Ionicons name="trending-up" size={24} color="#FF9800" />
          <Text style={styles.premiumFeatureText}>Monitor your consistency</Text>
        </View>
        <View style={styles.premiumFeatureItem}>
          <Ionicons name="ribbon" size={24} color="#FF9800" />
          <Text style={styles.premiumFeatureText}>Earn achievements and rewards</Text>
        </View>
      </View>
      
      <TouchableOpacity 
        style={styles.premiumButton}
        onPress={onOpenSubscription}
      >
        <Text style={styles.premiumButtonText}>Upgrade to Premium</Text>
      </TouchableOpacity>
      
      <SubscriptionModal 
        visible={subscriptionModalVisible}
        onClose={onCloseSubscription}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  premiumContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  xpBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 50,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  xpValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  xpLabel: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: 'bold',
  },
  levelBadge: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  levelValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  trophyIcon: {
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  premiumSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
    lineHeight: 22,
  },
  premiumFeatures: {
    width: '100%',
    marginBottom: 32,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumFeatureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  premiumButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  premiumButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PremiumLock; 