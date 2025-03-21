import React from 'react';
import { ChallengeList } from '../ChallengeList';
import { PremiumLockSimple } from '../PremiumLockSimple';

interface ChallengesTabProps {
  isPremium: boolean;
  handleUpgradeToPremium: () => void;
}

/**
 * Challenges tab content component for the Progress Screen
 */
export const ChallengesTab: React.FC<ChallengesTabProps> = ({
  isPremium,
  handleUpgradeToPremium
}) => {
  return isPremium ? (
    <ChallengeList />
  ) : (
    <PremiumLockSimple
      feature="Challenges"
      description="Complete daily, weekly, and monthly challenges to earn XP and track your progress."
      onUpgrade={handleUpgradeToPremium}
    />
  );
};

export default ChallengesTab; 