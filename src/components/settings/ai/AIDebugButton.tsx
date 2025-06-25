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
    
    // Group notifications by type
    const aiNotifs = allScheduled.filter(n => 
      n.content.data?.type?.includes('ai_wellness') ||
      n.content.title?.includes('AI') ||
      n.content.title?.includes('wellness')
    );
    
    const motivationalNotifs = allScheduled.filter(n => 
      n.content.data?.type === 'motivational_message'
    );
    
    const info = [];
    
    if (aiNotifs.length > 0) {
      info.push(`AI WELLNESS (${aiNotifs.length}):`);
      aiNotifs.forEach((n, i) => {
        const trigger = n.trigger as any;
        let when = 'Unknown';
        if (trigger?.date) {
          when = new Date(trigger.date).toLocaleString();
        } else if (trigger?.seconds) {
          when = `In ${trigger.seconds} seconds`;
        }
        info.push(`${i+1}. ${n.content.title}\n   When: ${when}`);
      });
    }
    
    if (motivationalNotifs.length > 0) {
      info.push(`\nMOTIVATIONAL (${motivationalNotifs.length}):`);
      info.push(`${motivationalNotifs.length} messages scheduled`);
    }
    
    if (info.length === 0) {
      Alert.alert('No Notifications', 'No notifications are scheduled');
    } else {
      Alert.alert(`Scheduled Notifications (${allScheduled.length} total)`, info.join('\n'));
    }
  };


  const handleTestNotification = async () => {
    try {
      // Import the comprehensive test
      const { testBackgroundNotifications } = await import('../../../utils/testBackgroundNotifications');
      await testBackgroundNotifications();
      
      Alert.alert(
        'Background Test Started', 
        'Check console for details. Notifications will fire at:\n' +
        '- 10 seconds\n- 30 seconds\n- 1 minute\n- 2 minutes\n- 5 minutes\n\n' +
        'Close app after 30s to test background!'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to start test');
      console.error('Test error:', error);
    }
  };

  const handleCheckStatus = async () => {
    try {
      const { checkTestStatus } = await import('../../../utils/testBackgroundNotifications');
      await checkTestStatus();
      
      // Also show in alert
      const all = await Notifications.getAllScheduledNotificationsAsync();
      const tests = all.filter(n => n.content.data?.isBackgroundTest === true);
      
      if (tests.length === 0) {
        Alert.alert('Test Status', 'No test notifications scheduled');
      } else {
        Alert.alert('Test Status', `${tests.length} test notifications still waiting to fire`);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check status');
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
        style={[styles.debugButton, { backgroundColor: '#2ECC71' }]}
        onPress={handleTestNotification}
      >
        <Text style={styles.debugButtonText}>Test Background Notifications</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.debugButton, { backgroundColor: '#E74C3C' }]}
        onPress={handleCheckStatus}
      >
        <Text style={styles.debugButtonText}>Check Test Status</Text>
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