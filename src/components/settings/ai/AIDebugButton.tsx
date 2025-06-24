import React from 'react';
import { TouchableOpacity, Text, Alert, StyleSheet, View } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../../services/storageService';

interface AIDebugButtonProps {
  visible: boolean;
}

export const AIDebugButton: React.FC<AIDebugButtonProps> = ({ visible }) => {
  if (!__DEV__ || !visible) {
    return null;
  }

  const handleViewSchedule = async () => {
    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    const aiNotifs = allScheduled.filter(n => 
      n.content.data?.type?.includes('ai_wellness') ||
      n.content.title?.includes('AI') ||
      n.content.title?.includes('wellness')
    );
    
    if (aiNotifs.length === 0) {
      Alert.alert('No AI Notifications', 'No AI wellness notifications are scheduled');
      return;
    }
    
    const info = aiNotifs.map((n, i) => {
      const trigger = n.trigger as any;
      let when = 'Unknown';
      if (trigger?.date) {
        when = new Date(trigger.date).toLocaleString();
      } else if (trigger?.seconds) {
        when = `In ${trigger.seconds} seconds`;
      }
      return `${i+1}. ${n.content.title}\n   When: ${when}`;
    }).join('\n\n');
    
    Alert.alert(`AI Notifications (${aiNotifs.length})`, info);
  };

  const handleResetAI = async () => {
    Alert.alert(
      'Reset AI Wellness',
      'This will clear all AI notifications and settings. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              const { cleanupAllAINotifications } = await import('../../../utils/cleanupAINotifications');
              await cleanupAllAINotifications();
              
              await AsyncStorage.removeItem(KEYS.AI_WELLNESS.HAS_SEEN_WELCOME);
              await AsyncStorage.removeItem('@ai_wellness_regular_scheduled');
              await AsyncStorage.removeItem('@ai_wellness_show_modal');
              await AsyncStorage.removeItem('@ai_wellness_voice_mode');
              await AsyncStorage.removeItem(KEYS.AI_WELLNESS.ENABLED);
              
              Alert.alert('Success', 'AI Wellness has been reset. Toggle it on to start fresh.');
            } catch (error) {
              console.error('Error resetting AI wellness:', error);
              Alert.alert('Error', 'Failed to reset AI wellness');
            }
          }
        }
      ]
    );
  };

  const handleTestNotification = async () => {
    try {
      const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "AI Wellness Check 🤖",
          body: `Test notification - How are you feeling?`,
          sound: true,
          data: { 
            type: 'ai_wellness_checkin',
            userId,
            isTest: true
          },
          categoryIdentifier: 'AI_WELLNESS_SIMPLE',
        },
        trigger: {
          seconds: 3
        }
      });
      
      Alert.alert('Test Sent', 'Notification will appear in 3 seconds');
    } catch (error) {
      Alert.alert('Error', 'Failed to schedule test notification');
      console.error('Test notification error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AI Debug Tools</Text>
      
      <TouchableOpacity
        style={[styles.debugButton, { backgroundColor: '#3498DB' }]}
        onPress={handleViewSchedule}
      >
        <Text style={styles.debugButtonText}>View Schedule</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.debugButton, { backgroundColor: '#E74C3C' }]}
        onPress={handleResetAI}
      >
        <Text style={styles.debugButtonText}>Reset AI Wellness</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.debugButton, { backgroundColor: '#2ECC71' }]}
        onPress={handleTestNotification}
      >
        <Text style={styles.debugButtonText}>Test Notification</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  debugButton: {
    marginTop: 8,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});