/**
 * @deprecated Use useGamification().refreshData() instead
 * 
 * This hook automatically refreshes challenge data when the challenges tab is active.
 * It's recommended to use useGamification().refreshData() directly instead.
 */
import { useEffect } from 'react';
import { TabType } from './useProgressTabManagement';
import { useGamification } from './useGamification';

export function useChallengeUpdater(
  activeTab: TabType,
  isProgressSystemLoading: boolean,
  _getAllRoutines: () => Promise<any[]>,
  _updateChallengesWithRoutines: (routines: any[]) => Promise<any>,
  _refreshUserProgress: () => Promise<void>
) {
  // Use the gamification hook directly
  const { refreshData } = useGamification();
  
  // Show deprecation warning
  useEffect(() => {
    console.warn(
      'useChallengeUpdater is deprecated. Use useGamification().refreshData() directly instead. ' +
      'This hook will be removed in a future update.'
    );
  }, []);
  
  // Refresh challenges when tab is selected
  useEffect(() => {
    if (activeTab === 'challenges' && !isProgressSystemLoading) {
      console.log('Challenges tab selected, refreshing challenge data');
      
      // Simply use the centralized refreshData function
      refreshData().catch(error => {
        console.error('Error refreshing challenge data:', error);
      });
    }
  }, [activeTab, isProgressSystemLoading, refreshData]);

  // Return nothing - this hook is purely for side effects
  return null;
} 