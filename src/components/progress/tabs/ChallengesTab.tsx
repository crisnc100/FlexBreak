import React, { useCallback } from 'react';
import { View } from 'react-native';
import { ChallengeList } from '../ChallengeList';
import { PremiumLockSimple } from '../PremiumLockSimple';
import { useRefresh } from '../../../context/RefreshContext';

interface ChallengesTabProps {
  isPremium: boolean;
  handleUpgradeToPremium: () => void;
}

/**
 * Challenges tab content component for the Progress Screen
 * Memoized to prevent unnecessary re-renders
 */
export const ChallengesTab: React.FC<ChallengesTabProps> = React.memo(({
  isPremium,
  handleUpgradeToPremium
}) => {
  console.log('ChallengesTab rendered');
  
  // Use the refresh context to properly handle refreshes
  const { isRefreshing, refreshProgress } = useRefresh();
  
  // Create a refresh handler that can be passed to ChallengeList
  const handleRefresh = useCallback(async () => {
    // Use the app's main refresh system
    await refreshProgress();
  }, [refreshProgress]);
  
  return (
    <View style={{ flex: 1 }}>
      {isPremium ? (
        <ChallengeList onRefresh={handleRefresh} />
      ) : (
        <PremiumLockSimple
          feature="Challenges"
          description="Complete daily, weekly, and monthly challenges to earn XP and track your progress."
          onUpgrade={handleUpgradeToPremium}
        />
      )}
    </View>
  );
});

export default ChallengesTab; 