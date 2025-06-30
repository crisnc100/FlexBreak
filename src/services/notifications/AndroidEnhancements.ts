import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const enhanceAndroidNotification = async (
  content: Notifications.NotificationContentInput
): Promise<Notifications.NotificationContentInput> => {
  if (Platform.OS !== 'android') return content;

  return {
    ...content,
    pressAction: {
      id: 'default',
      launchActivity: 'default',
    },
    allowBubbles: true,
    shortcutId: 'ai-wellness-coach',
    contextualActions: [
      {
        title: 'Snooze 1 hour',
        actionId: 'snooze_1h',
      },
      {
        title: 'Turn off for today',
        actionId: 'disable_today',
      },
    ],
  } as any;
};
