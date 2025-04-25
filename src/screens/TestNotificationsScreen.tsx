import React, { useEffect, useState } from 'react';
import {
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert,
  TextInput,
  Switch,
  Platform,
  SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as notificationTester from '../utils/notificationTester';

interface TestNotificationsScreenProps {
  navigation: {
    goBack: () => void;
  };
}

const TestNotificationsScreen: React.FC<TestNotificationsScreenProps> = ({ navigation }) => {
  const { theme, isDark } = useTheme();
  
  // State for custom reminder
  const [hours, setHours] = useState('12');
  const [minutes, setMinutes] = useState('00');
  const [customMessage, setCustomMessage] = useState('Time for your stretching routine!');
  const [customTitle, setCustomTitle] = useState('FlexBreak Reminder');
  
  // State for delayed notification
  const [delaySeconds, setDelaySeconds] = useState('5');
  const [scheduleTitle, setScheduleTitle] = useState('Scheduled Notification');
  const [scheduleBody, setScheduleBody] = useState('This notification was scheduled to appear after a delay');
  
  // State for immediate notification
  const [immediateTitle, setImmediateTitle] = useState('Immediate Notification');
  const [immediateBody, setImmediateBody] = useState('This is an immediate test notification');
  
  // Notification list state
  const [scheduledNotifications, setScheduledNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Set up notification handler on mount
  useEffect(() => {
    notificationTester.setupNotifications();
    refreshNotificationList();
  }, []);
  
  // Refresh the list of scheduled notifications
  const refreshNotificationList = async () => {
    setLoading(true);
    const notifications = await notificationTester.getAllScheduledNotifications();
    setScheduledNotifications(notifications);
    setLoading(false);
  };
  
  // Handle immediate notification
  const handleSendImmediate = async () => {
    try {
      const notificationId = await notificationTester.sendImmediateNotification(
        immediateTitle,
        immediateBody
      );
      
      if (notificationId) {
        Alert.alert(
          'Notification Sent',
          'An immediate notification has been triggered. If you don\'t see it, check your device\'s notification settings.'
        );
      }
    } catch (error) {
      console.error('Error sending immediate notification:', error);
      Alert.alert('Error', 'Failed to send immediate notification');
    }
  };
  
  // Handle scheduled notification
  const handleScheduleDelayed = async () => {
    try {
      const seconds = parseInt(delaySeconds, 10);
      if (isNaN(seconds) || seconds < 1) {
        Alert.alert('Invalid Delay', 'Please enter a valid number of seconds (minimum 1)');
        return;
      }
      
      const notificationId = await notificationTester.scheduleNotificationInSeconds(
        seconds,
        scheduleTitle,
        scheduleBody
      );
      
      if (notificationId) {
        Alert.alert(
          'Notification Scheduled',
          `A notification has been scheduled to appear in ${seconds} seconds.`
        );
        
        // Refresh the list after scheduling
        refreshNotificationList();
      }
    } catch (error) {
      console.error('Error scheduling notification:', error);
      Alert.alert('Error', 'Failed to schedule notification');
    }
  };
  
  // Handle custom time reminder
  const handleScheduleCustomReminder = async () => {
    try {
      const hoursNum = parseInt(hours, 10);
      const minsNum = parseInt(minutes, 10);
      
      if (isNaN(hoursNum) || hoursNum < 0 || hoursNum > 23 || 
          isNaN(minsNum) || minsNum < 0 || minsNum > 59) {
        Alert.alert('Invalid Time', 'Please enter a valid time (hours: 0-23, minutes: 0-59)');
        return;
      }
      
      const notificationId = await notificationTester.scheduleCustomReminder(
        hoursNum,
        minsNum,
        customMessage,
        customTitle
      );
      
      if (notificationId) {
        // Format time for display
        const timeStr = `${hoursNum.toString().padStart(2, '0')}:${minsNum.toString().padStart(2, '0')}`;
        
        Alert.alert(
          'Custom Reminder Scheduled',
          `A custom reminder has been scheduled for ${timeStr}.`,
          [
            { 
              text: 'OK',
              onPress: refreshNotificationList
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error scheduling custom reminder:', error);
      Alert.alert('Error', 'Failed to schedule custom reminder');
    }
  };
  
  // Handle cancel all notifications
  const handleCancelAll = async () => {
    try {
      await notificationTester.cancelAllNotifications();
      Alert.alert('Cancelled', 'All scheduled notifications have been cancelled');
      refreshNotificationList();
    } catch (error) {
      console.error('Error cancelling notifications:', error);
      Alert.alert('Error', 'Failed to cancel notifications');
    }
  };
  
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          Test Notifications
        </Text>
      </View>
    
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Immediate Notification Section */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Immediate Notification
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Send a notification that appears immediately
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Title:</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5',
                  color: theme.text,
                  borderColor: theme.border 
                }
              ]}
              value={immediateTitle}
              onChangeText={setImmediateTitle}
              placeholder="Notification Title"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Message:</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5',
                  color: theme.text,
                  borderColor: theme.border 
                }
              ]}
              value={immediateBody}
              onChangeText={setImmediateBody}
              placeholder="Notification Message"
              placeholderTextColor={theme.textSecondary}
              multiline
            />
          </View>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={handleSendImmediate}
          >
            <Text style={styles.buttonText}>Send Now</Text>
          </TouchableOpacity>
        </View>
        
        {/* Delayed Notification Section */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Delayed Notification
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Send a notification after a specific delay
          </Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Delay (seconds):</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5',
                  color: theme.text,
                  borderColor: theme.border 
                }
              ]}
              value={delaySeconds}
              onChangeText={setDelaySeconds}
              placeholder="5"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Title:</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5',
                  color: theme.text,
                  borderColor: theme.border 
                }
              ]}
              value={scheduleTitle}
              onChangeText={setScheduleTitle}
              placeholder="Notification Title"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Message:</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5',
                  color: theme.text,
                  borderColor: theme.border 
                }
              ]}
              value={scheduleBody}
              onChangeText={setScheduleBody}
              placeholder="Notification Message"
              placeholderTextColor={theme.textSecondary}
              multiline
            />
          </View>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={handleScheduleDelayed}
          >
            <Text style={styles.buttonText}>Schedule</Text>
          </TouchableOpacity>
        </View>
        
        {/* Custom Time Reminder Section */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Custom Time Reminder
          </Text>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Schedule a reminder for a specific time
          </Text>
          
          <View style={styles.timeInputContainer}>
            <View style={styles.timeInput}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Hours (24h):</Text>
              <TextInput
                style={[
                  styles.timeInputField,
                  { 
                    backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5',
                    color: theme.text,
                    borderColor: theme.border 
                  }
                ]}
                value={hours}
                onChangeText={setHours}
                placeholder="HH"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
            
            <Text style={[styles.timeSeparator, { color: theme.text }]}>:</Text>
            
            <View style={styles.timeInput}>
              <Text style={[styles.inputLabel, { color: theme.text }]}>Minutes:</Text>
              <TextInput
                style={[
                  styles.timeInputField,
                  { 
                    backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5',
                    color: theme.text,
                    borderColor: theme.border 
                  }
                ]}
                value={minutes}
                onChangeText={setMinutes}
                placeholder="MM"
                placeholderTextColor={theme.textSecondary}
                keyboardType="number-pad"
                maxLength={2}
              />
            </View>
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Title:</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5',
                  color: theme.text,
                  borderColor: theme.border 
                }
              ]}
              value={customTitle}
              onChangeText={setCustomTitle}
              placeholder="Reminder Title"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Message:</Text>
            <TextInput
              style={[
                styles.input,
                { 
                  backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5',
                  color: theme.text,
                  borderColor: theme.border 
                }
              ]}
              value={customMessage}
              onChangeText={setCustomMessage}
              placeholder="Custom Reminder Message"
              placeholderTextColor={theme.textSecondary}
              multiline
            />
          </View>
          
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.accent }]}
            onPress={handleScheduleCustomReminder}
          >
            <Text style={styles.buttonText}>Schedule Custom Time</Text>
          </TouchableOpacity>
        </View>
        
        {/* Scheduled Notifications List */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Scheduled Notifications
            </Text>
            <TouchableOpacity onPress={refreshNotificationList}>
              <Ionicons name="refresh" size={22} color={theme.accent} />
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              Loading...
            </Text>
          ) : scheduledNotifications.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No scheduled notifications
            </Text>
          ) : (
            scheduledNotifications.map((notification, index) => (
              <View 
                key={notification.identifier || index} 
                style={[styles.notificationItem, { borderBottomColor: theme.border }]}
              >
                <View style={styles.notificationHeader}>
                  <Text style={[styles.notificationTitle, { color: theme.text }]}>
                    {notification.content.title}
                  </Text>
                  <Text style={[styles.notificationTime, { color: theme.textSecondary }]}>
                    {notification.trigger && notification.trigger.type === 'timeInterval' 
                      ? `In ${notification.trigger.seconds} seconds` 
                      : 'Custom time'}
                  </Text>
                </View>
                <Text style={[styles.notificationBody, { color: theme.textSecondary }]}>
                  {notification.content.body}
                </Text>
              </View>
            ))
          )}
          
          {scheduledNotifications.length > 0 && (
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#f44336' }]}
              onPress={handleCancelAll}
            >
              <Text style={styles.buttonText}>Cancel All Notifications</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.bottomSpace} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  timeInput: {
    flex: 1,
  },
  timeInputField: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 24,
    marginHorizontal: 8,
    marginBottom: 12,
  },
  button: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  emptyText: {
    textAlign: 'center',
    padding: 16,
    fontStyle: 'italic',
  },
  notificationItem: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  notificationTitle: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  notificationTime: {
    fontSize: 12,
  },
  notificationBody: {
    fontSize: 14,
  },
  bottomSpace: {
    height: 40,
  },
});

export default TestNotificationsScreen; 