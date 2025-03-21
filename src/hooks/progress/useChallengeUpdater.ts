import { useEffect } from 'react';
import { TabType } from './useProgressTabManagement';
import * as challengeManager from '../../utils/progress/challengeManager';

/**
 * Custom hook to update challenges when the challenges tab is active
 */
export function useChallengeUpdater(
  activeTab: TabType,
  isProgressSystemLoading: boolean,
  getAllRoutines: () => Promise<any[]>,
  updateChallengesWithRoutines: (routines: any[]) => Promise<any>,
  refreshUserProgress: () => Promise<void>
) {
  useEffect(() => {
    if (activeTab === 'challenges' && !isProgressSystemLoading) {
      console.log('Challenges tab selected, refreshing challenge data');
      
      const refreshChallengeData = async () => {
        try {
          console.log('Force-refreshing challenge data');
          
          // Get all routines to ensure challenges are updated based on latest data
          const allRoutines = await getAllRoutines();
          console.log(`Retrieved all routines: ${allRoutines.length}`);
          
          // Force refresh user progress first
          await refreshUserProgress();
          
          // Force update daily challenges based on completed routines
          await challengeManager.forceUpdateDailyChallengesWithRoutines();
          
          // Force update challenges with latest routine data
          const result = await updateChallengesWithRoutines(allRoutines);
          
          // Log the updated challenges
          if (result && 'updatedChallenges' in result && result.updatedChallenges) {
            console.log(`Successfully updated ${result.updatedChallenges.length} challenges`);
            
            // Log any daily routine challenges
            const dailyRoutineChallenges = result.updatedChallenges.filter(
              (c: any) => c.type === 'routine_count' && c.requirement === 1 && c.category === 'daily'
            );
            
            if (dailyRoutineChallenges.length > 0) {
              console.log('Daily routine challenges found:');
              dailyRoutineChallenges.forEach((c: any) => {
                console.log(`- ${c.title}: progress=${c.progress}/${c.requirement}, completed=${c.completed}, claimed=${c.claimed}`);
              });
            }
          }
        } catch (error) {
          console.error('Error refreshing challenge data:', error);
        }
      };
      
      refreshChallengeData();
    }
  }, [activeTab, isProgressSystemLoading, getAllRoutines, updateChallengesWithRoutines, refreshUserProgress]);

  // Return nothing - this hook is purely for side effects
  return null;
} 