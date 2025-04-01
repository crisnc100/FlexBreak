import { useState, useEffect, useCallback, useRef } from 'react';
import * as challengeManager from '../../utils/progress/challengeManager';
import { Challenge } from '../../utils/progress/types';
import { useGamification } from './useGamification';
import * as storageService from '../../services/storageService';

// Helper to debounce function calls
const debounce = (func: Function, wait: number) => {
  let timeout: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Cache timeout in milliseconds (30 seconds)
const CACHE_TIMEOUT = 30 * 1000;

export const useChallengeSystem = () => {
  const [loading, setLoading] = useState(true);
  const [activeChallenges, setActiveChallenges] = useState<{
    daily: Challenge[];
    weekly: Challenge[];
    monthly: Challenge[];
    special: Challenge[];
  }>({
    daily: [],
    weekly: [],
    monthly: [],
    special: []
  });
  
  const { refreshData } = useGamification();
  
  // Ref to track last refresh time to prevent too frequent refreshes
  const lastRefreshTime = useRef<number>(0);
  // Ref to hold pending refresh promise
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  // Track last category-specific refresh times
  const lastCategoryRefreshTimes = useRef<Record<string, number>>({
    daily: 0,
    weekly: 0,
    monthly: 0,
    special: 0
  });
  // Minimum time between refreshes in ms (300ms)
  const MIN_REFRESH_INTERVAL = 300;

  // Add missing state variable at the top of the hook
  const [isClaimingChallenge, setIsClaimingChallenge] = useState(false);

  // Load active challenges with optional category filter
  const loadActiveChallenges = useCallback(async (specificCategory?: 'daily' | 'weekly' | 'monthly' | 'special') => {
    if (!specificCategory) {
      setLoading(true);
    }
    
    try {
      const now = Date.now();
      
      // If we're requesting a specific category and it was recently refreshed, use cache
      if (specificCategory && 
          now - lastCategoryRefreshTimes.current[specificCategory] < CACHE_TIMEOUT) {
        console.log(`Using cached ${specificCategory} challenges (cache age: ${now - lastCategoryRefreshTimes.current[specificCategory]}ms)`);
        return;
      }
      
      console.log(`Loading ${specificCategory || 'all'} challenges...`);
      const challenges = await challengeManager.getActiveChallenges();
      
      if (specificCategory) {
        // Update only the specific category
        setActiveChallenges(prev => ({
          ...prev,
          [specificCategory]: challenges[specificCategory]
        }));
        // Update last refresh time for this category
        lastCategoryRefreshTimes.current[specificCategory] = now;
      } else {
        // Update all categories
        setActiveChallenges(challenges);
        // Update all category refresh times
        Object.keys(lastCategoryRefreshTimes.current).forEach(category => {
          lastCategoryRefreshTimes.current[category] = now;
        });
      }
    } catch (error) {
      console.error(`Error loading ${specificCategory || 'all'} challenges:`, error);
    } finally {
      if (!specificCategory) {
        setLoading(false);
      }
    }
  }, []);
  
  // Preload challenges for a specific tab without triggering loading state
  const preloadChallengesForTab = useCallback(async (category: 'daily' | 'weekly' | 'monthly' | 'special') => {
    const now = Date.now();
    // Only preload if cache is older than 5 seconds
    if (now - lastCategoryRefreshTimes.current[category] > 5000) {
      console.log(`Preloading ${category} challenges in background...`);
      try {
        await loadActiveChallenges(category);
      } catch (error) {
        console.error(`Error preloading ${category} challenges:`, error);
      }
    } else {
      console.log(`${category} challenges already fresh, skipping preload`);
    }
  }, [loadActiveChallenges]);
  
  // Modified refreshChallenges function with throttling and caching
  const refreshChallenges = useCallback(async (specificCategory?: 'daily' | 'weekly' | 'monthly' | 'special') => {
    // Check if a refresh is already pending
    if (refreshPromiseRef.current) {
      console.log('Challenge refresh already in progress, returning existing promise');
      return refreshPromiseRef.current;
    }
    
    // Check if we've refreshed too recently
    const now = Date.now();
    if (now - lastRefreshTime.current < MIN_REFRESH_INTERVAL) {
      console.log('Challenge refresh requested too soon, throttling');
      // Return a promise that resolves after the minimum interval
      return new Promise<void>(resolve => {
        setTimeout(() => {
          refreshChallenges(specificCategory).then(resolve);
        }, MIN_REFRESH_INTERVAL - (now - lastRefreshTime.current));
      });
    }
    
    // If it's a category-specific refresh and cache is fresh, use cached data
    if (specificCategory && 
        now - lastCategoryRefreshTimes.current[specificCategory] < CACHE_TIMEOUT) {
      console.log(`Using cached ${specificCategory} challenges (cache age: ${now - lastCategoryRefreshTimes.current[specificCategory]}ms)`);
      return Promise.resolve();
    }
    
    // Update last refresh time
    lastRefreshTime.current = now;
    
    // Execute the refresh
    try {
      if (!specificCategory) {
        setLoading(true);
      }
      
      console.log(`Refreshing ${specificCategory || 'all'} challenges and updating progress...`);
      
      // Create and store the refresh promise
      refreshPromiseRef.current = (async () => {
        try {
          // First synchronize routine counts with challenge progress
          console.log('Synchronizing routine counts with challenge progress');
          await syncChallengeProgress();
          
          // Then check for expiring challenges
          await challengeManager.checkExpiringChallenges();
          
          // Force update daily challenges based on completed routines
          await challengeManager.forceUpdateDailyChallengesWithRoutines();
          
          // Load challenges (specific category or all)
          await loadActiveChallenges(specificCategory);
          
          console.log(`${specificCategory || 'All'} challenge refresh complete`);
          
          // Update category refresh time
          if (specificCategory) {
            lastCategoryRefreshTimes.current[specificCategory] = Date.now();
          } else {
            // Update all category refresh times
            Object.keys(lastCategoryRefreshTimes.current).forEach(category => {
              lastCategoryRefreshTimes.current[category] = Date.now();
            });
          }
        } catch (error) {
          console.error(`Error refreshing ${specificCategory || 'all'} challenges:`, error);
          throw error; // Re-throw to propagate to caller
        } finally {
          if (!specificCategory) {
            setLoading(false);
          }
          // Clear the refresh promise reference
          refreshPromiseRef.current = null;
        }
      })();
      
      return refreshPromiseRef.current;
    } catch (error) {
      console.error(`Error initiating ${specificCategory || 'all'} challenge refresh:`, error);
      if (!specificCategory) {
        setLoading(false);
      }
      refreshPromiseRef.current = null;
      throw error;
    }
  }, [loadActiveChallenges]);

  // Claim a challenge reward
  const claimChallenge = useCallback(async (challengeId: string) => {
    try {
      setIsClaimingChallenge(true);
      
      // Find the challenge category from the ID for targeted refresh
      const category = findChallengeCategory(challengeId);
      
      // Don't pre-refresh challenges, as we already checked before initiating the claim
      // This reduces redundant refresh operations
      
      // Claim the challenge
      console.log(`Claiming challenge with ID: ${challengeId}`);
      const result = await challengeManager.claimChallenge(challengeId);
      
      if (result.success) {
        console.log(`Successfully claimed challenge for ${result.xpEarned} XP`);
        
        // Mark the challenge as claimed in the local state to avoid UI lag
        // This provides immediate feedback to the user
        setActiveChallenges(prev => {
          const updatedChallenges = { ...prev };
          
          // Only update the specific category if we know it
          if (category) {
            const categoryData = [...(prev[category] || [])];
            const challengeIndex = categoryData.findIndex(c => c.id === challengeId);
            
            if (challengeIndex !== -1) {
              // Create a new challenge object with claimed set to true
              const updatedChallenge = {
                ...categoryData[challengeIndex],
                claimed: true
              };
              
              // Update the challenge in the array
              categoryData[challengeIndex] = updatedChallenge;
              updatedChallenges[category] = categoryData;
            }
          } else {
            // If we don't know the category, check all categories
            Object.keys(prev).forEach(cat => {
              const categoryData = [...prev[cat]];
              const challengeIndex = categoryData.findIndex(c => c.id === challengeId);
              
              if (challengeIndex !== -1) {
                // Create a new challenge object with claimed set to true
                const updatedChallenge = {
                  ...categoryData[challengeIndex],
                  claimed: true
                };
                
                // Update the challenge in the array
                categoryData[challengeIndex] = updatedChallenge;
                updatedChallenges[cat] = categoryData;
              }
            });
          }
          
          return updatedChallenges;
        });
        
        // Schedule a background refresh to update with the latest data
        // This will happen after the UI shows the challenge as claimed
        setTimeout(() => {
          if (category) {
            refreshChallenges(category as 'daily' | 'weekly' | 'monthly' | 'special').catch(err => 
              console.error('Error refreshing challenges after claim:', err)
            );
          } else {
            // Refresh all challenges if we couldn't determine the category
            refreshChallenges().catch(err => 
              console.error('Error refreshing all challenges after claim:', err)
            );
          }
        }, 1000);
      }
      
      return result;
    } catch (error) {
      console.error('Error claiming challenge:', error);
      return {
        success: false,
        message: 'Error claiming challenge',
        xpEarned: 0,
        levelUp: false,
        newLevel: 1
      };
    } finally {
      setIsClaimingChallenge(false);
    }
  }, [refreshChallenges]);
  
  // Helper function to find a challenge's category from its ID
  const findChallengeCategory = useCallback((challengeId: string): string | null => {
    for (const category of Object.keys(activeChallenges)) {
      const found = activeChallenges[category]?.find(c => c.id === challengeId);
      if (found) {
        return category;
      }
    }
    return null;
  }, [activeChallenges]);
  
  // Use debounced version for updateChallengeProgress
  const updateChallengeDirect = useCallback(() => {
    console.log('Updating challenge progress after routine completion');
    
    // IMPROVED: First sync challenge progress with completed routines
    syncChallengeProgress()
      .then(() => {
        console.log('Challenge progress synced with routines');
        
        // Then refresh gamification data
        refreshData();
        
        // Then force-update challenges to ensure progress is tracked
        return challengeManager.forceUpdateDailyChallengesWithRoutines();
      })
      .then(() => {
        console.log('Challenges updated after routine completion');
        // Finally reload active challenges to refresh the UI
        return loadActiveChallenges();
      })
      .catch(error => {
        console.error('Error updating challenges after routine:', error);
      });
  }, [refreshData, loadActiveChallenges]);
  
  // Create a debounced version of updateChallengeProgress
  const updateChallengeProgress = useCallback(
    debounce(updateChallengeDirect, 300),
    [updateChallengeDirect]
  );

  // Load challenges on first render
  useEffect(() => {
    loadActiveChallenges();
  }, [loadActiveChallenges]);

  // Add a function to sync challenge progress with actual routine counts
  const syncChallengeProgress = async () => {
    try {
      console.log('Starting challenge progress synchronization');
      
      // Get all routines
      const allRoutines = await storageService.getAllRoutines();
      console.log(`Found ${allRoutines.length} total routines for progress sync`);
      
      // Calculate time periods
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      
      // Count routines for today
      const todayRoutines = allRoutines.filter(routine => {
        const routineDate = new Date(routine.date).toISOString().split('T')[0];
        return routineDate === today;
      });
      
      // Count routines for this week
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
      startOfWeek.setHours(0, 0, 0, 0);
      
      const weekRoutines = allRoutines.filter(routine => {
        const routineDate = new Date(routine.date);
        return routineDate >= startOfWeek;
      });
      
      // Improved weekly minutes calculation with better logging
      // For week
      console.log(`Weekly minutes calculation details:`);
      console.log(`Start of week: ${startOfWeek.toISOString()}`);
      console.log(`Found ${weekRoutines.length} routines for this week`);
      
      // Reduce logging to improve performance
      if (weekRoutines.length > 0) {
        console.log(`First weekly routine: ${weekRoutines[0].area || 'Unknown'}, date: ${weekRoutines[0].date}, duration: ${weekRoutines[0].duration || 0} minutes`);
        console.log(`Last weekly routine: ${weekRoutines[weekRoutines.length-1].area || 'Unknown'}, date: ${weekRoutines[weekRoutines.length-1].date}, duration: ${weekRoutines[weekRoutines.length-1].duration || 0} minutes`);
      }
      
      const weekMinutes = weekRoutines.reduce((total, routine) => {
        const routineDuration = parseInt(routine.duration) || 0;
        return total + routineDuration;
      }, 0);
      
      console.log(`Total weekly minutes calculated: ${weekMinutes}`);
      
      // Count routines for this month
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthRoutines = allRoutines.filter(routine => {
        const routineDate = new Date(routine.date);
        return routineDate >= startOfMonth;
      });
      
      console.log(`Routine counts - Today: ${todayRoutines.length}, Week: ${weekRoutines.length}, Month: ${monthRoutines.length}`);
      
      // FIXED: Calculate total minutes for different time periods
      // For today
      const todayMinutes = todayRoutines.reduce((total, routine) => 
        total + (parseInt(routine.duration) || 0), 0);
        
      // For month
      const monthMinutes = monthRoutines.reduce((total, routine) => 
        total + (parseInt(routine.duration) || 0), 0);
      
      console.log(`Total minutes - Today: ${todayMinutes}, Week: ${weekMinutes}, Month: ${monthMinutes}`);
      
      // FIXED: Calculate unique body areas
      const uniqueAreasToday = [...new Set(todayRoutines.map(r => r.area))];
      const uniqueAreasWeek = [...new Set(weekRoutines.map(r => r.area))];
      const uniqueAreasMonth = [...new Set(monthRoutines.map(r => r.area))];
      
      console.log(`Unique areas - Today: ${uniqueAreasToday.length}, Week: ${uniqueAreasWeek.length}, Month: ${uniqueAreasMonth.length}`);
      console.log(`Week areas: ${uniqueAreasWeek.join(', ')}`);
      
      // Get current user progress
      const userProgress = await storageService.getUserProgress();
      let hasUpdates = false;
      
      // Reduce logging to improve performance
      console.log('Updating challenge progress from routine data...');
      
      // Update daily routine challenges
      Object.values(userProgress.challenges).forEach(challenge => {
        if (challenge.category === 'daily' && 
            !challenge.claimed &&
            new Date(challenge.endDate) > now) {
          
          // Update routine count challenges
          if (challenge.type === 'routine_count') {
            const correctProgress = Math.min(todayRoutines.length, challenge.requirement);
            if (challenge.progress !== correctProgress) {
              console.log(`Fixing daily challenge "${challenge.title}" progress: ${challenge.progress} → ${correctProgress}`);
              userProgress.challenges[challenge.id].progress = correctProgress;
              hasUpdates = true;
            }
            
            // Mark as completed if progress meets requirement
            if (correctProgress >= challenge.requirement && !challenge.completed) {
              console.log(`Marking daily challenge "${challenge.title}" as completed`);
              userProgress.challenges[challenge.id].completed = true;
              hasUpdates = true;
            }
          }
          
          // FIXED: Update total minutes challenges
          if (challenge.type === 'total_minutes' || challenge.type === 'daily_minutes') {
            const correctProgress = Math.min(todayMinutes, challenge.requirement);
            
            // Update the progress
            if (challenge.progress !== correctProgress) {
              console.log(`Fixing daily minutes challenge "${challenge.title}" progress: ${challenge.progress} → ${correctProgress}`);
              userProgress.challenges[challenge.id].progress = correctProgress;
              hasUpdates = true;
            }
            
            // FIXED: Only mark as completed if progress exactly meets or exceeds requirement
            if (correctProgress >= challenge.requirement && !challenge.completed) {
              console.log(`Marking daily minutes challenge "${challenge.title}" as completed`);
              userProgress.challenges[challenge.id].completed = true;
              hasUpdates = true;
            }
          }
        }
      });
      
      // Update weekly routine challenges
      Object.values(userProgress.challenges).forEach(challenge => {
        if (challenge.category === 'weekly' && 
            !challenge.claimed &&
            new Date(challenge.endDate) > now) {
          
          // Special debugging for Time Investment challenge
          if (challenge.title.includes('Time Investment') || challenge.description.includes('30 minutes')) {
        
          }
          
          // Update routine count challenges
          if (challenge.type === 'routine_count') {
            const correctProgress = Math.min(weekRoutines.length, challenge.requirement);
            if (challenge.progress !== correctProgress) {
              console.log(`Fixing weekly challenge "${challenge.title}" progress: ${challenge.progress} → ${correctProgress}`);
              userProgress.challenges[challenge.id].progress = correctProgress;
              hasUpdates = true;
            }
            
            // Mark as completed if progress meets requirement
            if (correctProgress >= challenge.requirement && !challenge.completed) {
              console.log(`Marking weekly challenge "${challenge.title}" as completed`);
              userProgress.challenges[challenge.id].completed = true;
              hasUpdates = true;
            }
          }
          
          // FIXED: Update total minutes challenges
          if (challenge.type === 'total_minutes' || challenge.type === 'weekly_minutes') {
            // For time investment challenge, fix any incorrect progress
            const correctProgress = Math.min(weekMinutes, challenge.requirement);
            
            if (challenge.title.includes('Time Investment') || challenge.description.includes('30 minutes')) {
              console.log(`Correcting "Time Investment" progress: ${challenge.progress} → ${correctProgress}`);
            }
            
            // Update the progress
            if (challenge.progress !== correctProgress) {
              console.log(`Fixing weekly minutes challenge "${challenge.title}" progress: ${challenge.progress} → ${correctProgress}`);
              userProgress.challenges[challenge.id].progress = correctProgress;
              hasUpdates = true;
            }
            
            // FIXED: Only mark as completed if progress exactly meets or exceeds requirement
            if (correctProgress >= challenge.requirement && !challenge.completed) {
              console.log(`Marking weekly minutes challenge "${challenge.title}" as completed`);
              userProgress.challenges[challenge.id].completed = true;
              hasUpdates = true;
            } else if (correctProgress < challenge.requirement && challenge.completed) {
              // If progress is now less than requirement but was previously marked completed, fix it
              console.log(`Un-marking weekly minutes challenge "${challenge.title}" as completed`);
              userProgress.challenges[challenge.id].completed = false;
              hasUpdates = true;
            }
            
            // Extra check for Time Investment challenge
            if (challenge.title.includes('Time Investment') || challenge.description.includes('30 minutes')) {
              console.log(`After update - Progress: ${userProgress.challenges[challenge.id].progress}/${challenge.requirement}`);
              console.log(`After update - Completed: ${userProgress.challenges[challenge.id].completed}`);
            }
          }
          
          // FIXED: Update area variety challenges
          if (challenge.type === 'area_variety') {
            const correctProgress = Math.min(uniqueAreasWeek.length, challenge.requirement);
            if (challenge.progress !== correctProgress) {
              console.log(`Fixing weekly area variety challenge "${challenge.title}" progress: ${challenge.progress} → ${correctProgress} (areas: ${uniqueAreasWeek.join(', ')})`);
              userProgress.challenges[challenge.id].progress = correctProgress;
              hasUpdates = true;
            }
            
            // Mark as completed if progress meets requirement
            if (correctProgress >= challenge.requirement && !challenge.completed) {
              console.log(`Marking weekly area variety challenge "${challenge.title}" as completed`);
              userProgress.challenges[challenge.id].completed = true;
              hasUpdates = true;
            }
          }
        }
      });
      
      // Update monthly routine challenges
      Object.values(userProgress.challenges).forEach(challenge => {
        if (challenge.category === 'monthly' && 
            !challenge.claimed &&
            new Date(challenge.endDate) > now) {
          
          // Update routine count challenges
          if (challenge.type === 'routine_count') {
            const correctProgress = Math.min(monthRoutines.length, challenge.requirement);
            if (challenge.progress !== correctProgress) {
              console.log(`Fixing monthly challenge "${challenge.title}" progress: ${challenge.progress} → ${correctProgress}`);
              userProgress.challenges[challenge.id].progress = correctProgress;
              hasUpdates = true;
            }
            
            // Mark as completed if progress meets requirement
            if (correctProgress >= challenge.requirement && !challenge.completed) {
              console.log(`Marking monthly challenge "${challenge.title}" as completed`);
              userProgress.challenges[challenge.id].completed = true;
              hasUpdates = true;
            }
          }
          
          // FIXED: Update total minutes challenges 
          if (challenge.type === 'total_minutes' || challenge.type === 'monthly_minutes') {
            const correctProgress = Math.min(monthMinutes, challenge.requirement);
            
            // Update the progress
            if (challenge.progress !== correctProgress) {
              console.log(`Fixing monthly minutes challenge "${challenge.title}" progress: ${challenge.progress} → ${correctProgress}`);
              userProgress.challenges[challenge.id].progress = correctProgress;
              hasUpdates = true;
            }
            
            // FIXED: Only mark as completed if progress exactly meets or exceeds requirement
            if (correctProgress >= challenge.requirement && !challenge.completed) {
              console.log(`Marking monthly minutes challenge "${challenge.title}" as completed`);
              userProgress.challenges[challenge.id].completed = true;
              hasUpdates = true;
            } else if (correctProgress < challenge.requirement && challenge.completed) {
              // If progress is now less than requirement but was previously marked completed, fix it
              console.log(`Un-marking monthly minutes challenge "${challenge.title}" as completed`);
              userProgress.challenges[challenge.id].completed = false;
              hasUpdates = true;
            }
          }
          
          // FIXED: Update area variety challenges
          if (challenge.type === 'area_variety') {
            const correctProgress = Math.min(uniqueAreasMonth.length, challenge.requirement);
            if (challenge.progress !== correctProgress) {
              console.log(`Fixing monthly area variety challenge "${challenge.title}" progress: ${challenge.progress} → ${correctProgress}`);
              userProgress.challenges[challenge.id].progress = correctProgress;
              hasUpdates = true;
            }
            
            // Mark as completed if progress meets requirement
            if (correctProgress >= challenge.requirement && !challenge.completed) {
              console.log(`Marking monthly area variety challenge "${challenge.title}" as completed`);
              userProgress.challenges[challenge.id].completed = true;
              hasUpdates = true;
            }
          }
        }
      });
      
      // IMPROVED: Check for challenges that should be completed based on specific conditions
      // For example, "Complete a routine before noon" challenge
      const beforeNoonChallenge = Object.values(userProgress.challenges).find(c => 
        c.description.includes('before noon') && 
        c.category === 'daily' && 
        !c.claimed && 
        new Date(c.endDate) > now
      );
      
      if (beforeNoonChallenge) {
        // Check if any of today's routines were completed before noon
        const hasBeforeNoonRoutine = todayRoutines.some(routine => {
          const routineTime = new Date(routine.date);
          return routineTime.getHours() < 12;
        });
        
        if (hasBeforeNoonRoutine && beforeNoonChallenge.progress !== 1) {
          console.log(`Marking "before noon" challenge as completed`);
          userProgress.challenges[beforeNoonChallenge.id].progress = 1;
          userProgress.challenges[beforeNoonChallenge.id].completed = true;
          hasUpdates = true;
        }
      }
      
      // FIXED: Update streak challenges
      // Get all streak challenges
      const streakChallenges = Object.values(userProgress.challenges).filter(challenge => 
        challenge.type === 'streak' &&
        !challenge.claimed &&
        new Date(challenge.endDate) > now
      );
      
      if (streakChallenges.length > 0) {
        // Get the current streak from statistics
        const currentStreak = userProgress.statistics.currentStreak;
        console.log(`Current streak for streak challenges: ${currentStreak} days`);
        
        // Update each streak challenge
        streakChallenges.forEach(challenge => {
          const newProgress = Math.min(currentStreak, challenge.requirement);
          
          if (challenge.progress !== newProgress) {
            console.log(`Updating streak challenge "${challenge.title}" progress: ${challenge.progress} → ${newProgress}`);
            userProgress.challenges[challenge.id].progress = newProgress;
            hasUpdates = true;
          }
          
          // Mark as completed if streak meets requirement
          if (newProgress >= challenge.requirement && !challenge.completed) {
            console.log(`Marking streak challenge "${challenge.title}" as completed`);
            userProgress.challenges[challenge.id].completed = true;
            hasUpdates = true;
          }
        });
      }
      
      // Save updates if needed
      if (hasUpdates) {
        console.log('Challenge progress updated, saving changes...');
        await storageService.saveUserProgress(userProgress);
      } else {
        console.log('No challenge progress updates needed');
      }
      
    } catch (error) {
      console.error('Error syncing challenge progress:', error);
    }
  };

  return {
    activeChallenges,
    loading,
    claimChallenge,
    refreshChallenges,
    updateChallengeProgress,
    preloadChallengesForTab
  };
}; 