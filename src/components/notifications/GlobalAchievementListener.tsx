import React, { useState, useEffect } from 'react';
import { gamificationEvents, ACHIEVEMENT_COMPLETED_EVENT } from '../../hooks/progress/useGamification';
import { Achievement } from '../../utils/progress/types';
import MiniGameAchievementNotification from './MiniGameAchievementNotification';
import AchievementNotification from './AchievementNotification';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mini-game achievement IDs
const MINIGAME_ACHIEVEMENT_IDS = [
  'daily_player',
  'lightning_reflexes',
  'game_master',
  'trivia_expert',
  'perfect_balance'
];

// Routine-related achievement types that should be shown in completion flow
const ROUTINE_ACHIEVEMENT_TYPES = [
  'routine_count',
  'streak', 
  'area_variety',
  'specific_area',
  'total_minutes'
];

export const GlobalAchievementListener: React.FC = () => {
  const [currentAchievement, setCurrentAchievement] = useState<Achievement | null>(null);
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const handleAchievementCompleted = async (achievement: Achievement) => {
      console.log('[GlobalAchievementListener] Achievement completed event received:', {
        id: achievement.id,
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
        type: (achievement as any).type,
        xp: achievement.xp
      });
      
      // Skip mini-game achievements as they're shown in the completion screen
      if (MINIGAME_ACHIEVEMENT_IDS.includes(achievement.id)) {
        console.log('[GlobalAchievementListener] Skipping mini-game achievement - shown in completion screen');
        return;
      }
      
      // Skip routine-related achievements during routine completion flow
      const achievementType = (achievement as any).type;
      if (achievementType && ROUTINE_ACHIEVEMENT_TYPES.includes(achievementType)) {
        console.log('[GlobalAchievementListener] Skipping routine-related achievement - shown in routine completion flow:', achievementType);
        return;
      }
      
      // Show the achievement notification
      setCurrentAchievement(achievement);
      setShowNotification(true);
    };

    console.log('[GlobalAchievementListener] Setting up achievement event listener');
    
    // Listen for achievement completed events
    gamificationEvents.on(ACHIEVEMENT_COMPLETED_EVENT, handleAchievementCompleted);

    return () => {
      console.log('[GlobalAchievementListener] Cleaning up achievement event listener');
      gamificationEvents.off(ACHIEVEMENT_COMPLETED_EVENT, handleAchievementCompleted);
    };
  }, []);

  const handleHideNotification = () => {
    setShowNotification(false);
    // Clear achievement after animation completes
    setTimeout(() => {
      setCurrentAchievement(null);
    }, 300);
  };

  // Don't render anything if no achievement
  if (!currentAchievement || !showNotification) {
    return null;
  }

  // Check if it's a mini-game achievement
  const isMiniGameAchievement = MINIGAME_ACHIEVEMENT_IDS.includes(currentAchievement.id);

  // For mini-game achievements, use the special notification
  if (isMiniGameAchievement) {
    // Get badge image for mini-game achievements
    const getBadgeImage = (id: string) => {
      switch (id) {
        case 'daily_player':
          return require('../../../assets/images/achievements/dailyPlayerBadge.png');
        case 'lightning_reflexes':
          return require('../../../assets/images/achievements/lightningReflexes.png');
        case 'game_master':
          return require('../../../assets/images/achievements/gameMaster.png');
        case 'trivia_expert':
          return require('../../../assets/images/achievements/triviaExpert.png');
        case 'perfect_balance':
          return require('../../../assets/images/achievements/perfectScoreBadge.png');
        default:
          return null;
      }
    };

    const achievementData = {
      title: currentAchievement.title,
      description: currentAchievement.description,
      xp: currentAchievement.xp,
      badgeImage: getBadgeImage(currentAchievement.id)
    };

    return (
      <MiniGameAchievementNotification
        visible={showNotification}
        achievement={achievementData}
        onHide={handleHideNotification}
      />
    );
  }

  // For regular achievements, use the standard notification
  return (
    <AchievementNotification
      achievement={currentAchievement}
      onDismiss={handleHideNotification}
    />
  );
};

export default GlobalAchievementListener;