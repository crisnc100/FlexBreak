import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useGamification } from '../../hooks/progress/useGamification';
import XpNotification from './XpNotification';
import AchievementNotification from './AchievementNotification';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Key for storing notified achievements
const NOTIFIED_ACHIEVEMENTS_KEY = 'notifiedAchievements';

const XpNotificationManager: React.FC = () => {
  const { 
    recentlyUnlockedAchievements,
    dismissNotifications
  } = useGamification();
  
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifiedAchievements, setNotifiedAchievements] = useState<string[]>([]);
  
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
        
        // Add other notification types here as needed
        
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