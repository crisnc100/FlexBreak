import React from 'react';
import { TouchableOpacity, Text, Alert, StyleSheet } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';

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

  return (
    <TouchableOpacity
      style={[styles.debugButton, { backgroundColor: theme.accent }]}
      onPress={handlePress}
    >
      <Text style={styles.debugButtonText}>View Scheduled AI Check-ins</Text>
    </TouchableOpacity>
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