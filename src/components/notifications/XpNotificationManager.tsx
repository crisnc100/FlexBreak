import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useGamification, gamificationEvents, LEVEL_UP_EVENT, XP_UPDATED_EVENT } from '../../hooks/progress/useGamification';
import XpNotification from './XpNotification';
import AchievementNotification from './AchievementNotification';
import LevelUpNotification from './LevelUpNotification';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Key for storing notified achievements
const NOTIFIED_ACHIEVEMENTS_KEY = 'notifiedAchievements';

interface XpNotificationManagerProps {
  // Controls whether to show level-up notifications when already shown in the routine screen
  showLevelUpInRoutine?: boolean;
}

const XpNotificationManager: React.FC<XpNotificationManagerProps> = ({ 
  showLevelUpInRoutine = true 
}) => {
  const { 
    recentlyUnlockedAchievements,
    dismissNotifications
  } = useGamification();
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifiedAchievements, setNotifiedAchievements] = useState<string[]>([]);
  const eventListenersActive = useRef(false);
  
  // Add a ref to track recently shown notifications to prevent duplicates
  const recentNotificationIds = useRef<Set<string>>(new Set());
  
  // Load already notified achievements from storage
  useEffect(() => {
    const loadNotifiedAchievements = async () => {
      try {
        const stored = await AsyncStorage.getItem(NOTIFIED_ACHIEVEMENTS_KEY);
        if (stored) {
          setNotifiedAchievements(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading notified achievements:', error);
      }
    };
    
    loadNotifiedAchievements();
  }, []);
  
  // Process newly unlocked achievements
  useEffect(() => {
    if (recentlyUnlockedAchievements && recentlyUnlockedAchievements.length > 0) {
      // Filter out achievements that have already been notified
      const newAchievements = recentlyUnlockedAchievements.filter(
        achievement => !notifiedAchievements.includes(achievement.id)
      );
      
      if (newAchievements.length > 0) {
        // Update local state with new notifications
        setNotifications(prev => [
          ...prev,
          ...newAchievements.map(achievement => ({
            id: `achievement_${achievement.id}_${Date.now()}`,
            type: 'achievement',
            data: achievement
          }))
        ]);
        
        // Mark these achievements as notified
        const updatedNotifiedAchievements = [
          ...notifiedAchievements,
          ...newAchievements.map(a => a.id)
        ];
        
        setNotifiedAchievements(updatedNotifiedAchievements);
        
        // Save to AsyncStorage
        AsyncStorage.setItem(
          NOTIFIED_ACHIEVEMENTS_KEY, 
          JSON.stringify(updatedNotifiedAchievements)
        ).catch(error => {
          console.error('Error saving notified achievements:', error);
        });
      }
      
      // Dismiss the notifications in the gamification system
      dismissNotifications();
    }
  }, [recentlyUnlockedAchievements, notifiedAchievements, dismissNotifications]);
  
  // Add a mechanism to track notification groups by source more robustly
  const isNotificationDuplicate = (type: string, data: any): boolean => {
    // For XP notifications, check if we have a similar notification in the last few seconds
    if (type === 'xp') {
      const existingNotifications = Array.from(recentNotificationIds.current)
        .filter(id => id.startsWith('xp_'))
        .filter(id => {
          // Extract source and timestamp from ID
          const parts = id.split('_');
          if (parts.length >= 3) {
            const source = parts[1];
            const timestamp = parseInt(parts[2]);
            const now = Date.now();
            // Check if it's from the same source and within 5 seconds
            return source === data.source && (now - timestamp) < 5000;
          }
          return false;
        });
      
      return existingNotifications.length > 0;
    }
    
    // For level-up notifications, check if we have any level-up notification in the last 10 seconds
    if (type === 'level_up') {
      const existingNotifications = Array.from(recentNotificationIds.current)
        .filter(id => id.startsWith('level_'));
        
      // This prevents multiple level-up notifications in a short timeframe
      return existingNotifications.length > 0;
    }
    
    return false;
  };

  // Process notification handling with improved duplicate detection
  const processXpUpdate = useCallback((data) => {
    console.log('XP update detected!', data);
    
    // Create a unique ID for this notification
    const notificationId = `xp_${data.source}_${Date.now()}`;
    
    // Check for duplicates using our new function
    if (data.xpEarned > 0 && !isNotificationDuplicate('xp', data)) {    
      // Track this notification ID
      recentNotificationIds.current.add(notificationId);
      
      // Clean up old IDs after 5 seconds
      setTimeout(() => {
        recentNotificationIds.current.delete(notificationId);
      }, 5000); // Extend from 3s to 5s to better prevent duplicates
      
      console.log(`Adding XP notification for ${data.xpEarned} XP from ${data.source}`);
      
      setNotifications(prev => [
        ...prev,
        {
          id: `xp_earned_${Date.now()}`,
          type: 'xp',
          data: {
            amount: data.xpEarned,
            source: data.source || 'unknown',
            description: data.details || `From ${data.source || 'activity'}`,
            originalAmount: data.originalXp,
            wasXpBoosted: data.xpBoostApplied
          }
        }
      ]);
    } else {
      console.log(`Skipping duplicate XP notification from ${data.source}`);
    }
  }, []);

  // Improved handling of level-up event with better duplicate prevention
  const processLevelUp = useCallback((data) => {
    console.log('Level up detected in XpNotificationManager!', data);
    
    // Check for duplicates using our new function
    if (data.oldLevel && data.newLevel && data.newLevel > data.oldLevel && 
        !isNotificationDuplicate('level_up', data)) {
      
      // Create a unique ID for this notification
      const notificationId = `level_${data.oldLevel}_${data.newLevel}_${Date.now()}`;
      
      // Track this notification ID
      recentNotificationIds.current.add(notificationId);
      
      // Clean up old IDs after 10 seconds
      setTimeout(() => {
        recentNotificationIds.current.delete(notificationId);
      }, 10000); // Extend to 10s for level-ups to really prevent duplicates
      
      // Add detailed info to console for debugging
      console.log(`Displaying level-up notification: Level ${data.oldLevel} → ${data.newLevel}`);
      console.log(`Level-up source: ${data.source || 'unknown'}`);
      if (data.challengeTitle) {
        console.log(`From challenge: ${data.challengeTitle}`);
      }
      
      setNotifications(prev => [
        ...prev,
        {
          id: `level_up_${Date.now()}`,
          type: 'level_up',
          data: {
            oldLevel: data.oldLevel,
            newLevel: data.newLevel,
            // Include detailed source information
            source: data.source || 'default',
            details: data.details,
            challengeTitle: data.challengeTitle,
            xpEarned: data.xpEarned
          }
        }
      ]);
    } else {
      console.log('Skipping duplicate level-up notification');
    }
  }, []);

  // Set up event listeners for level up and XP update events
  useEffect(() => {
    if (!eventListenersActive.current) {
      console.log('Setting up gamification event listeners for notifications');
      
      // Register the listeners with the improved handlers
      gamificationEvents.on(LEVEL_UP_EVENT, processLevelUp);
      gamificationEvents.on(XP_UPDATED_EVENT, processXpUpdate);
      
      eventListenersActive.current = true;
      
      // Cleanup
      return () => {
        gamificationEvents.off(LEVEL_UP_EVENT, processLevelUp);
        gamificationEvents.off(XP_UPDATED_EVENT, processXpUpdate);
        eventListenersActive.current = false;
      };
    }
  }, [processLevelUp, processXpUpdate]);
  
  // Handle dismissing a notification
  const handleDismiss = (id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };
  
  return (
    <View style={styles.container}>
      {notifications.map((notification, index) => {
        const { id, type, data } = notification;
        
        // Position notifications with a staggered effect
        const position = { top: 50 + (index * 10) };
        
        if (type === 'achievement') {
          return (
            <View key={id} style={[styles.notificationWrapper, position]}>
              <AchievementNotification
                achievement={data}
                onDismiss={() => handleDismiss(id)}
              />
            </View>
          );
        }
        
        if (type === 'level_up') {
          return (
            <View key={id} style={[styles.notificationWrapper, position]}>
              <LevelUpNotification
                oldLevel={data.oldLevel}
                newLevel={data.newLevel}
                source={data.source}
                details={data.details}
                challengeTitle={data.challengeTitle}
                xpEarned={data.xpEarned}
                onDismiss={() => handleDismiss(id)}
                showInRoutineScreen={showLevelUpInRoutine}
              />
            </View>
          );
        }
        
        if (type === 'xp') {
          return (
            <View key={id} style={[styles.notificationWrapper, position]}>
              <XpNotification
                amount={data.amount}
                source={data.source}
                description={data.description}
                originalAmount={data.originalAmount}
                wasXpBoosted={data.wasXpBoosted}
                onDismiss={() => handleDismiss(id)}
              />
            </View>
          );
        }
        
        return null;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  notificationWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
  }
});

export default XpNotificationManager; 