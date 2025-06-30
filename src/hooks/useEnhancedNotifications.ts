import { useEffect, useState, useCallback, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { enhancedNotificationService } from '../services/notifications/EnhancedNotificationService';
import { notificationResponseHandler } from '../services/notifications/NotificationResponseHandler';
import { useAuth } from './useAuth';
import { usePremium } from './usePremium';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../services/storageService';

export const useEnhancedNotifications = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null);
  const [notificationStats, setNotificationStats] = useState<any>(null);
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const responseHandlerRef = useRef<any>(null);

  useEffect(() => {
    const initialize = async () => {
      if (!user) return;

      // Initialize notification handlers
      responseHandlerRef.current = notificationResponseHandler.getInstance();

      // Load user preferences
      await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);

      setIsInitialized(true);

      // Load notification stats
      const stats = await enhancedNotificationService.getNotificationStats(user.uid);
      setNotificationStats(stats);
    };

    initialize();
  }, [user]);

  const sendTestNotification = useCallback(async () => {
    if (!user || !isInitialized) return;

    try {
      const userName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);

      const notificationId = await enhancedNotificationService.createEnhancedNotification({
        userId: user.uid,
        userName: userName || undefined,
        soundType: 'default',
        data: {
          isTest: true,
          timestamp: new Date().toISOString(),
        },
      });

      setLastNotificationId(notificationId);
      console.log('[Test Notification] Sent:', notificationId);
    } catch (error) {
      console.error('[Test Notification] Error:', error);
      throw error;
    }
  }, [user, isInitialized]);

  const cancelAllNotifications = useCallback(async () => {
    await enhancedNotificationService.cancelAllNotifications();
    console.log('[Notifications] All cancelled');
  }, []);

  const refreshStats = useCallback(async () => {
    if (!user) return;
    const stats = await enhancedNotificationService.getNotificationStats(user.uid);
    setNotificationStats(stats);
  }, [user]);

  return {
    isInitialized,
    lastNotificationId,
    notificationStats,
    sendTestNotification,
    cancelAllNotifications,
    refreshStats,
  };
};
