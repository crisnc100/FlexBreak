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




  return (
    <View style={styles.container}>
      {/*<Text style={styles.title}>AI Debug Tools</Text>*/}
      
      <TouchableOpacity
        style={[styles.debugButton, { backgroundColor: '#3498DB' }]}
        onPress={handleViewSchedule}
      >
        <Text style={styles.debugButtonText}>View Schedule</Text>
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