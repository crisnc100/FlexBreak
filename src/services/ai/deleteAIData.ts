import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { conversationManager } from './core/conversationManager';
import voiceRecordingService from './integrations/voiceRecordingService';
import { deleteAIDataExclusively } from './aiDataLifecycle';
import { isLocalAIDataKey } from './localAIData';

const isAINotification = (data?: Record<string, unknown> | null) =>
  !!data && ((typeof data.type === 'string' && data.type.startsWith('ai_')) ||
  data.isWelcome === true || data.isPremiumWelcome === true);

export async function deleteLocalAIData(): Promise<void> {
  await deleteAIDataExclusively(async () => {
    await voiceRecordingService.cancelRecording();
    conversationManager.clearAllSessions();
    const keys = await AsyncStorage.getAllKeys();
    const aiKeys = keys.filter(isLocalAIDataKey);
    await AsyncStorage.multiRemove(aiKeys);
    const remaining = await AsyncStorage.multiGet((await AsyncStorage.getAllKeys()).filter(isLocalAIDataKey));
    if (remaining.some(([, value]) => value !== null)) throw new Error('Some AI data could not be removed.');
    // Leave stretching reminders and other app notifications intact.
    for (const notification of await Notifications.getAllScheduledNotificationsAsync()) {
      if (isAINotification(notification.content.data)) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
      }
    }
    for (const notification of await Notifications.getPresentedNotificationsAsync()) {
      if (isAINotification(notification.request.content.data)) {
        await Notifications.dismissNotificationAsync(notification.request.identifier);
      }
    }
  }, () => voiceRecordingService.cancelRecording().catch(error => console.warn('Recording cleanup will retry after pending work:', error)));
}
