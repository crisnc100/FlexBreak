import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SubscriptionModal from '../SubscriptionModal';

interface PremiumLockProps {
  onOpenSubscription: () => void;
  subscriptionModalVisible: boolean;
  onCloseSubscription: () => void;
}

const PremiumLock: React.FC<PremiumLockProps> = ({
  onOpenSubscription,
  subscriptionModalVisible,
  onCloseSubscription
}) => {
  return (
    <View style={styles.premiumContainer}>
      <Ionicons name="stats-chart" size={80} color="#CCCCCC" />
      <Text style={styles.premiumTitle}>Track Your Progress</Text>
      <Text style={styles.premiumSubtitle}>
        Unlock detailed stats, streaks, and insights with Premium
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
  },
  premiumFeatures: {
    width: '100%',
    marginBottom: 32,
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
  },
  premiumButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PremiumLock; 