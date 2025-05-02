import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  ScrollView,
  TextInput,
  Platform,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as firebaseReminders from '../../utils/firebaseReminders';
import { useTheme } from '../../context/ThemeContext';

/**
 * Simple screen for testing Firebase notifications
 */
const NotificationTester = () => {
  const { theme, isDark } = useTheme();
  
  // Reminder settings
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('Time for your daily stretch!');
  const [customTime, setCustomTime] = useState('');
  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('00');
  const [frequency, setFrequency] = useState<'daily' | 'weekdays' | 'custom'>('daily');
  
  // Load saved settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await firebaseReminders.getReminderSettings();
        setEnabled(settings.enabled);
        setMessage(settings.message);
        
        // Parse saved time
        if (settings.time) {
          const [savedHour, savedMinute] = settings.time.split(':');
          setHour(savedHour);
          setMinute(savedMinute);
        }
        
        setFrequency(settings.frequency);
      } catch (error) {
        console.error('Error loading reminder settings:', error);
      }
    };
    
    loadSettings();
  }, []);
  
  // Toggle reminders
  const handleToggleEnabled = async (value: boolean) => {
    try {
      if (value) {
        // Initialize Firebase messaging
        const initialized = await firebaseReminders.initializeFirebaseReminders();
        if (!initialized) {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to use this feature.'
          );
          return;
        }
      }
      
      // Update state
      setEnabled(value);
      
      // Save to Firebase
      const settings = {
        enabled: value,
        time: `${hour}:${minute}`,
        frequency,
        days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        message
      };
      
      await firebaseReminders.saveReminderSettings(settings);
      
      if (value) {
        Alert.alert(
          'Reminders Enabled',
          `You will receive reminders at ${hour}:${minute} ${frequency === 'daily' ? 'every day' : frequency === 'weekdays' ? 'on weekdays' : 'on selected days'}.`
        );
      }
    } catch (error) {
      console.error('Error toggling reminders:', error);
      Alert.alert('Error', 'Failed to toggle reminders');
    }
  };
  
  // Update time
  const updateTime = async () => {
    try {
      // Validate hour and minute
      const hourNum = parseInt(hour, 10);
      const minuteNum = parseInt(minute, 10);
      
      if (isNaN(hourNum) || hourNum < 0 || hourNum > 23) {
        Alert.alert('Invalid Hour', 'Please enter a valid hour (0-23)');
        return;
      }
      
      if (isNaN(minuteNum) || minuteNum < 0 || minuteNum > 59) {
        Alert.alert('Invalid Minute', 'Please enter a valid minute (0-59)');
        return;
      }
      
      // Format time
      const formattedHour = hourNum.toString().padStart(2, '0');
      const formattedMinute = minuteNum.toString().padStart(2, '0');
      const timeString = `${formattedHour}:${formattedMinute}`;
      
      // Update state
      setHour(formattedHour);
      setMinute(formattedMinute);
      
      // Save to Firebase
      const settings = {
        enabled,
        time: timeString,
        frequency,
        days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        message
      };
      
      await firebaseReminders.saveReminderSettings(settings);
      
      Alert.alert(
        'Time Updated',
        `Reminder time set to ${formattedHour}:${formattedMinute}`
      );
    } catch (error) {
      console.error('Error updating time:', error);
      Alert.alert('Error', 'Failed to update time');
    }
  };
  
  // Update message
  const updateMessage = async () => {
    try {
      if (!message.trim()) {
        Alert.alert('Invalid Message', 'Please enter a message');
        return;
      }
      
      // Save to Firebase
      const settings = {
        enabled,
        time: `${hour}:${minute}`,
        frequency,
        days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        message
      };
      
      await firebaseReminders.saveReminderSettings(settings);
      
      Alert.alert(
        'Message Updated',
        `Reminder message set to: "${message}"`
      );
    } catch (error) {
      console.error('Error updating message:', error);
      Alert.alert('Error', 'Failed to update message');
    }
  };
  
  // Select frequency
  const selectFrequency = async (newFrequency: 'daily' | 'weekdays' | 'custom') => {
    try {
      // Update state
      setFrequency(newFrequency);
      
      // Save to Firebase
      const settings = {
        enabled,
        time: `${hour}:${minute}`,
        frequency: newFrequency,
        days: newFrequency === 'weekdays' 
          ? ['mon', 'tue', 'wed', 'thu', 'fri'] 
          : ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        message
      };
      
      await firebaseReminders.saveReminderSettings(settings);
      
      Alert.alert(
        'Frequency Updated',
        `Reminders will occur ${newFrequency === 'daily' ? 'every day' : newFrequency === 'weekdays' ? 'on weekdays' : 'on selected days'}`
      );
    } catch (error) {
      console.error('Error updating frequency:', error);
      Alert.alert('Error', 'Failed to update frequency');
    }
  };
  
  // Send test notification
  const sendTestNotification = async () => {
    try {
      const success = await firebaseReminders.sendTestNotification();
      
      if (success) {
        Alert.alert(
          'Test Notification Sent',
          'You should receive a notification shortly. Try closing the app completely to test if it appears when the app is not running.'
        );
      } else {
        Alert.alert(
          'Failed',
          'Could not send test notification. Make sure Firebase is properly set up.'
        );
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Failed to send test notification');
    }
  };
  
  // Send custom notification at specific time
  const sendCustomNotification = async () => {
    if (!customTime) {
      Alert.alert('Missing Time', 'Please enter a time in the format HH:MM');
      return;
    }
    
    // Validate time format
    const timeRegex = /^([0-1][0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(customTime)) {
      Alert.alert('Invalid Time', 'Please enter time in the format HH:MM (00:00 to 23:59)');
      return;
    }
    
    try {
      // Save settings temporarily with custom time
      const settings = {
        enabled: true,
        time: customTime,
        frequency: 'daily' as firebaseReminders.ReminderFrequency,
        days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
        message: `This is a custom notification scheduled for ${customTime}`
      };
      
      await firebaseReminders.saveReminderSettings(settings);
      
      Alert.alert(
        'Custom Notification Scheduled',
        `A notification has been scheduled for ${customTime}. The app must be deployed to Firebase for this to work when closed.`
      );
    } catch (error) {
      console.error('Error scheduling custom notification:', error);
      Alert.alert('Error', 'Failed to schedule custom notification');
    }
  };
  
  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        Firebase Notification Tester
      </Text>
      
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        This screen lets you test Firebase notifications that work reliably even when the app is completely closed.
      </Text>
      
      {/* Reminders Toggle */}
      <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          Enable Reminders
        </Text>
        
        <View style={styles.toggleRow}>
          <Text style={[styles.toggleLabel, { color: theme.text }]}>
            Firebase Reminders
          </Text>
          
          <Switch
            value={enabled}
            onValueChange={handleToggleEnabled}
            trackColor={{ false: '#767577', true: theme.accent }}
            thumbColor={Platform.OS === 'ios' ? undefined : enabled ? theme.accent : '#f4f3f4'}
          />
        </View>
        
        <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
          {enabled 
            ? `Reminders are enabled for ${hour}:${minute} ${frequency === 'daily' ? 'every day' : frequency === 'weekdays' ? 'on weekdays' : 'on selected days'}.` 
            : 'Enable reminders to receive notifications even when the app is closed.'}
        </Text>
      </View>
      
      {/* Set Time */}
      <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          Set Reminder Time
        </Text>
        
        <View style={styles.timeRow}>
          <View style={styles.timeInput}>
            <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>
              Hour (00-23)
            </Text>
            <TextInput
              style={[styles.timeTextInput, { 
                color: theme.text, 
                borderColor: theme.border,
                backgroundColor: isDark ? '#333' : '#f5f5f5'
              }]}
              value={hour}
              onChangeText={setHour}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="09"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
          
          <Text style={[styles.timeSeparator, { color: theme.text }]}>:</Text>
          
          <View style={styles.timeInput}>
            <Text style={[styles.timeLabel, { color: theme.textSecondary }]}>
              Minute (00-59)
            </Text>
            <TextInput
              style={[styles.timeTextInput, { 
                color: theme.text, 
                borderColor: theme.border,
                backgroundColor: isDark ? '#333' : '#f5f5f5'
              }]}
              value={minute}
              onChangeText={setMinute}
              keyboardType="number-pad"
              maxLength={2}
              placeholder="00"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.accent }]}
          onPress={updateTime}
        >
          <Text style={styles.buttonText}>Update Time</Text>
        </TouchableOpacity>
      </View>
      
      {/* Frequency Selection */}
      <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          Set Frequency
        </Text>
        
        <View style={styles.frequencyButtons}>
          <TouchableOpacity
            style={[
              styles.frequencyButton,
              frequency === 'daily' && { backgroundColor: theme.accent },
              { borderColor: theme.border }
            ]}
            onPress={() => selectFrequency('daily')}
          >
            <Text style={[
              styles.frequencyButtonText, 
              { color: frequency === 'daily' ? '#fff' : theme.text }
            ]}>
              Daily
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.frequencyButton,
              frequency === 'weekdays' && { backgroundColor: theme.accent },
              { borderColor: theme.border }
            ]}
            onPress={() => selectFrequency('weekdays')}
          >
            <Text style={[
              styles.frequencyButtonText, 
              { color: frequency === 'weekdays' ? '#fff' : theme.text }
            ]}>
              Weekdays
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.frequencyButton,
              frequency === 'custom' && { backgroundColor: theme.accent },
              { borderColor: theme.border }
            ]}
            onPress={() => selectFrequency('custom')}
          >
            <Text style={[
              styles.frequencyButtonText, 
              { color: frequency === 'custom' ? '#fff' : theme.text }
            ]}>
              Custom
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Custom Message */}
      <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          Custom Message
        </Text>
        
        <TextInput
          style={[styles.messageInput, { 
            color: theme.text, 
            borderColor: theme.border,
            backgroundColor: isDark ? '#333' : '#f5f5f5'
          }]}
          value={message}
          onChangeText={setMessage}
          placeholder="Enter your custom reminder message"
          placeholderTextColor={theme.textSecondary}
          multiline
          maxLength={100}
        />
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.accent }]}
          onPress={updateMessage}
        >
          <Text style={styles.buttonText}>Update Message</Text>
        </TouchableOpacity>
      </View>
      
      {/* Test Notifications */}
      <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          Test Notifications
        </Text>
        
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.accent }]}
          onPress={sendTestNotification}
        >
          <Text style={styles.buttonText}>Send Test Notification Now</Text>
        </TouchableOpacity>
        
        <View style={styles.customTimeContainer}>
          <TextInput
            style={[styles.customTimeInput, { 
              color: theme.text, 
              borderColor: theme.border,
              backgroundColor: isDark ? '#333' : '#f5f5f5'
            }]}
            value={customTime}
            onChangeText={setCustomTime}
            placeholder="HH:MM (e.g., 14:30)"
            placeholderTextColor={theme.textSecondary}
          />
          
          <TouchableOpacity
            style={[styles.customTimeButton, { backgroundColor: theme.accent }]}
            onPress={sendCustomNotification}
          >
            <Text style={styles.buttonText}>Schedule</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.cardDescription, { color: theme.textSecondary }]}>
          Note: Scheduled notifications require Firebase Cloud Functions to be deployed.
        </Text>
      </View>
      
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
          Firebase notifications work reliably when the app is completely closed. Close the app after sending a test notification to see it work!
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    marginBottom: 20,
  },
  card: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  cardDescription: {
    fontSize: 12,
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 16,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  timeInput: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  timeTextInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    fontSize: 16,
    textAlign: 'center',
  },
  timeSeparator: {
    paddingHorizontal: 8,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 4,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  frequencyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
    borderWidth: 1,
    marginHorizontal: 4,
  },
  frequencyButtonText: {
    fontWeight: '500',
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    height: 80,
    marginBottom: 16,
  },
  customTimeContainer: {
    flexDirection: 'row',
    marginTop: 16,
  },
  customTimeInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    marginRight: 8,
  },
  customTimeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
    justifyContent: 'center',
  },
  footer: {
    marginTop: 16,
    marginBottom: 32,
    padding: 16,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default NotificationTester; 