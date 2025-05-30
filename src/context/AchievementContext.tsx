import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { Achievement } from '../utils/progress/types';
import * as achievementManager from '../utils/progress/modules/achievementManager';
import * as storageService from '../services/storageService';
import { gamificationEvents, ACHIEVEMENT_COMPLETED_EVENT } from '../hooks/progress/useGamification';

// Define context types
interface AchievementContextType {
  recentAchievement: Achievement | null;
  clearRecentAchievement: () => void;
  topAchievements: Achievement[];
  allAchievements: Achievement[];
  refreshAchievements: () => Promise<void>;
  isLoading: boolean;
}

// Create the context
const AchievementContext = createContext<AchievementContextType>({
  recentAchievement: null,
  clearRecentAchievement: () => {},
  topAchievements: [],
  allAchievements: [],
  refreshAchievements: async () => {},
  isLoading: true,
});

// Provider props
interface AchievementProviderProps {
  children: ReactNode;
}

// Create provider component
export const AchievementProvider: React.FC<AchievementProviderProps> = ({ children }) => {
  const [recentAchievement, setRecentAchievement] = useState<Achievement | null>(null);
  const [topAchievements, setTopAchievements] = useState<Achievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Clear recent achievement
  const clearRecentAchievement = () => {
    setRecentAchievement(null);
  };

  // Load achievements data
  const loadAchievements = async () => {
    try {
      setIsLoading(true);
      
      // Get user progress
      const userProgress = await storageService.getUserProgress();
      
      // Get achievements summary
      const achievementsSummary = achievementManager.getAchievementsSummary(userProgress);
      
      // Set all achievements (both completed and in progress)
      const all = [
        ...achievementsSummary.completed,
        ...achievementsSummary.inProgress
      ];
      setAllAchievements(all);
      
      // Set top achievements (up to 5 recent completed ones)
      const completed = achievementsSummary.completed || [];
      // Sort by completion date, most recent first
      const sortedCompleted = [...completed].sort((a, b) => {
        if (!a.dateCompleted) return 1;
        if (!b.dateCompleted) return -1;
        return new Date(b.dateCompleted).getTime() - new Date(a.dateCompleted).getTime();
      });
      
      setTopAchievements(sortedCompleted.slice(0, 5));
    } catch (error) {
      console.error('Error loading achievements in context:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh achievements (public method)
  const refreshAchievements = async () => {
    await loadAchievements();
  };

  // Listen for achievement completion events
  useEffect(() => {
    const handleAchievementCompleted = (achievement: Achievement) => {
      console.log('Achievement completed event received:', achievement.title);
      setRecentAchievement(achievement);
      refreshAchievements();
    };
    
    // Add event listener
    gamificationEvents.on(ACHIEVEMENT_COMPLETED_EVENT, handleAchievementCompleted);
    
    // Load initial data
    loadAchievements();
    
    // Clean up
    return () => {
      gamificationEvents.off(ACHIEVEMENT_COMPLETED_EVENT, handleAchievementCompleted);
    };
  }, []);

  const value = {
    recentAchievement,
    clearRecentAchievement,
    topAchievements,
    allAchievements,
    refreshAchievements,
    isLoading,
  };

  return (
    <AchievementContext.Provider value={value}>
      {children}
    </AchievementContext.Provider>
  );
};

// Custom hook to use this context
export const useAchievements = () => useContext(AchievementContext);

export default AchievementContext; 