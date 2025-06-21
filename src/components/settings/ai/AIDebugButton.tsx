import React from 'react';
import { TouchableOpacity, Text, Alert, StyleSheet, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AIDebugButtonProps {
  visible: boolean;
}

export const AIDebugButton: React.FC<AIDebugButtonProps> = ({ visible }) => {
  const { theme } = useTheme();

  if (!__DEV__ || !visible) {
    return null;
  }

  const handlePress = async () => {
    const { getScheduledAINotifications } = await import('../../../services/ai/aiWellnessScheduler');
    const scheduled = await getScheduledAINotifications();
    
    if (scheduled.length === 0) {
      Alert.alert('No AI Notifications', 'No AI wellness check-ins are scheduled.');
    } else {
      const message = scheduled.map(n => n.scheduledFor).join('\n');
      Alert.alert(`${scheduled.length} AI Check-ins Scheduled`, message);
    }
  };

  const handleTestNotification = async (type = 'basic', delay = 30) => {
    try {
      const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
      
      let categoryId = 'AI_WELLNESS_DIRECT_REPLY';
      let bodyText = "How's your body feeling? Reply to this message or tap a quick option below 💬";
      let actionOptions = '• Reply button with text field (like WhatsApp)\n• 😊 Good (quick tap)\n• 😰 Stressed (quick tap)';
      
      if (type === 'basic') {
        categoryId = 'AI_WELLNESS_CHECK';
        bodyText = "How are you feeling? Long press (iOS) or swipe down for quick replies 👇";
        actionOptions = '• 😊 Great! (quick response)\n• 🤕 Sore/Tired (quick response)\n• 💬 Type Reply (type in notification)';
      } else if (type === 'advanced') {
        categoryId = 'AI_WELLNESS_ADVANCED';
        bodyText = "How are you feeling? Detailed options available below 📝";
        actionOptions = '• 🎙️ Voice Note (opens app)\n• 📝 Detailed Reply (type in notification)\n• 😰 Stressed (quick response)';
      }
      
      // Schedule a test notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "AI Wellness Check 🤖",
          body: bodyText,
          sound: true,
          data: { 
            type: 'ai_wellness_checkin',
            userId,
            isTest: true
          },
          categoryIdentifier: categoryId,
        },
        trigger: {
          seconds: delay
        }
      });
      
      Alert.alert(
        'Test Notification Scheduled', 
        `A test AI Wellness notification will appear in ${delay} seconds.\n\nActions available:\n${actionOptions}\n\n` +
        'Try these interactions:\n' +
        '1. Tap and hold to see quick actions (iOS)\n' +
        '2. Swipe down to see action buttons\n' +
        '3. Select an action to respond\n\n' +
        'Note: Only "Voice Note" should open the app!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to schedule test notification');
      console.error('Test notification error:', error);
    }
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.debugButton, { backgroundColor: theme.accent }]}
        onPress={handlePress}
      >
        <Text style={styles.debugButtonText}>View Scheduled AI Check-ins</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.debugButton, { backgroundColor: '#2ECC71', marginTop: 8 }]}
        onPress={() => handleTestNotification('direct', 30)}
      >
        <Text style={styles.debugButtonText}>Test Direct Reply (30s) 💬</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.debugButton, { backgroundColor: '#FF6B6B', marginTop: 8 }]}
        onPress={() => handleTestNotification('basic', 30)}
      >
        <Text style={styles.debugButtonText}>Test Long Press (30s) 😊</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.debugButton, { backgroundColor: '#9B59B6', marginTop: 8 }]}
        onPress={() => handleTestNotification('advanced', 30)}
      >
        <Text style={styles.debugButtonText}>Test Advanced (30s) 📝</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.debugButton, { backgroundColor: '#3498DB', marginTop: 8 }]}
        onPress={() => handleTestNotification('simple', 5)}
      >
        <Text style={styles.debugButtonText}>Quick Test (5s) - Stay in App</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  debugButton: {
    marginTop: 12,
    marginHorizontal: 16,
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