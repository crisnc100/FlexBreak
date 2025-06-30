import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useEnhancedNotifications } from '../../hooks/useEnhancedNotifications';
import { enhancedNotificationService } from '../../services/notifications/EnhancedNotificationService';
import { useAuth } from '../../hooks/useAuth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../services/storageService';

export const TestNotifications: React.FC = () => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const { sendTestNotification, cancelAllNotifications, notificationStats } = useEnhancedNotifications();
  const [isLoading, setIsLoading] = useState(false);

  const testScenarios = [
    {
      title: 'Default Check-in',
      action: async () => {
        const userName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
        await enhancedNotificationService.createEnhancedNotification({
          userId: user?.uid || 'test',
          userName: userName || undefined,
          soundType: 'default',
        });
      },
    },
    {
      title: 'Gentle Reminder',
      action: async () => {
        const userName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
        await enhancedNotificationService.createEnhancedNotification({
          userId: user?.uid || 'test',
          userName: userName || undefined,
          message: "No pressure! Just checking if you'd like to chat 💭",
          soundType: 'gentle',
        });
      },
    },
    {
      title: 'Important Message',
      action: async () => {
        const userName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
        await enhancedNotificationService.createEnhancedNotification({
          userId: user?.uid || 'test',
          userName: userName || undefined,
          message: "Hey! It's been a while. Let's check in on your wellness! 🌟",
          soundType: 'important',
        });
      },
    },
    {
      title: 'Scheduled (5 seconds)',
      action: async () => {
        const userName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
        const fiveSecondsLater = new Date();
        fiveSecondsLater.setSeconds(fiveSecondsLater.getSeconds() + 5);

        await enhancedNotificationService.createEnhancedNotification({
          userId: user?.uid || 'test',
          userName: userName || undefined,
          message: "Scheduled check-in! How are you? 📅",
          scheduledTime: fiveSecondsLater,
        });
      },
    },
  ];

  const runTest = async (test: any) => {
    setIsLoading(true);
    try {
      await test.action();
      Alert.alert('Success', `${test.title} notification sent!`);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={[styles.title, { color: theme.text }]}>Test Enhanced Notifications</Text>

      {notificationStats && (
        <View style={[styles.statsCard, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.statsTitle, { color: theme.text }]}>Notification Stats</Text>
          <Text style={[styles.statsText, { color: theme.textSecondary }]}>Today: {notificationStats.today} | This Week: {notificationStats.thisWeek}</Text>
        </View>
      )}

      <View style={styles.testGrid}>
        {testScenarios.map((test, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.testButton, { backgroundColor: theme.accent }]}
            onPress={() => runTest(test)}
            disabled={isLoading}
          >
            <Text style={styles.testButtonText}>{test.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.cancelButton, { borderColor: theme.border }]}
        onPress={cancelAllNotifications}
      >
        <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel All Notifications</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  statsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statsText: {
    fontSize: 14,
  },
  testGrid: {
    gap: 12,
  },
  testButton: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  testButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 20,
  },
  cancelButtonText: {
    fontSize: 16,
  },
});
