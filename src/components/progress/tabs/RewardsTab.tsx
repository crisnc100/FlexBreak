import React from 'react';
import { View, StyleSheet } from 'react-native';
import Rewards from '../Rewards';
import XpBoostCard from '../XpBoostCard';
import PremiumLock from '../PremiumLock';

interface RewardsTabProps {
  isPremium: boolean;
  progressSystemData: any;
  handleUpgradeToPremium: () => void;
  handleActivateXpBoost: () => void;
  subscriptionModalVisible: boolean;
  onCloseSubscription: () => void;
}

/**
 * Rewards tab content component for the Progress Screen
 */
export const RewardsTab: React.FC<RewardsTabProps> = ({
  isPremium,
  progressSystemData,
  handleUpgradeToPremium,
  handleActivateXpBoost,
  subscriptionModalVisible,
  onCloseSubscription
}) => {
  return !isPremium ? (
    <PremiumLock
      onOpenSubscription={handleUpgradeToPremium}
      subscriptionModalVisible={subscriptionModalVisible}
      onCloseSubscription={onCloseSubscription}
      totalXP={progressSystemData?.totalXP || 0}
      level={progressSystemData?.level || 1}
    />
  ) : (
    <View style={styles.container}>
      {/* Include XP Boost card at the top of rewards tab */}
      <XpBoostCard onActivateBoost={handleActivateXpBoost} />
      
      {/* Existing rewards section */}
      <Rewards
        userLevel={progressSystemData?.level || 1}
        isPremium={isPremium}
        onUpgradeToPremium={handleUpgradeToPremium}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  }
});

export default RewardsTab; 