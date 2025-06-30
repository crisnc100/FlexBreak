import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const enhanceIOSNotification = async (
  content: Notifications.NotificationContentInput
): Promise<Notifications.NotificationContentInput> => {
  if (Platform.OS !== 'ios') return content;

  return {
    ...content,
    interruptionLevel: 'timeSensitive',
    relevanceScore: 1.0,
    targetContentIdentifier: 'ai-wellness-checkin',
    threadIdentifier: 'ai-wellness',
    summaryArgument: 'AI Wellness Check-in',
    summaryArgumentCount: 1,
  };
};
