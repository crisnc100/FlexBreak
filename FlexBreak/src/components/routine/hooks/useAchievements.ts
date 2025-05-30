import { useState, useEffect } from 'react';
import { getUserProgress } from '../../../services/storageService';
import { Achievement, AchievementType } from '../types/completedRoutine.types';

/**
 * Custom hook to manage achievements in the completed routine screen
 * 
 * @param levelUp The level up data from props
 * @returns The list of unlocked achievements
 */
export const useAchievements = (
  levelUp?: {
    unlockedAchievements?: Achievement[]
  }
) => {
  const [unlockedAchievements, setUnlockedAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    // First, check if there are already unlockedAchievements from the levelUp prop
    // These are guaranteed to be from the current session
    const achievementsFromProps = levelUp?.unlockedAchievements || [];
    if (achievementsFromProps.length > 0) {
      console.log('Using unlocked achievements from props:', achievementsFromProps);
      setUnlockedAchievements(achievementsFromProps);
      return; // No need to check storage if we already have achievements from props
    }

    // Only check storage if we don't have achievements from props
    async function checkForUnlockedAchievements() {
      try {
        const userProgress = await getUserProgress();
        if (!userProgress.achievements) return;

        // Get the current timestamp to compare against
        const now = new Date();
        
        // Look for achievements that were completed very recently
        // This ensures we only show achievements unlocked in the current completion
        const recentlyUnlocked = Object.values(userProgress.achievements)
          .filter((achievement: AchievementType) => {
            if (!achievement.completed || !achievement.dateCompleted) return false;
            
            const completedDate = new Date(achievement.dateCompleted);
            const diffMs = now.getTime() - completedDate.getTime();
            const diffSeconds = diffMs / 1000;
            
            // Only consider achievements completed within the last 5 seconds
            return diffSeconds < 5;
          })
          .map((achievement: AchievementType) => ({
            id: achievement.id,
            title: achievement.title,
            description: achievement.description,
            xp: achievement.xp,
            icon: achievement.icon
          }));

        if (recentlyUnlocked.length > 0) {
          console.log('Recently unlocked achievements found in storage:', recentlyUnlocked);
          setUnlockedAchievements(recentlyUnlocked);
        } else {
          console.log('No recently unlocked achievements found in storage');
          setUnlockedAchievements([]);
        }
      } catch (error) {
        console.error('Error checking for unlocked achievements:', error);
      }
    }
    
    checkForUnlockedAchievements();
  }, [levelUp]);

  return { unlockedAchievements };
}; 