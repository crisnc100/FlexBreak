import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { usePremium } from '../../../context/PremiumContext';
import { KEYS } from '../../../services/storageService';
import { scheduleAIWellnessV2 } from '../../../services/ai/scheduling/notificationScheduler';
import * as Notifications from 'expo-notifications';

interface AIScheduleSettingsProps {
  visible: boolean;
}

const timePreferenceLabels: Record<string, string> = {
  random: 'Random (11am-4pm)',
  morning: 'Morning (9-11am)',
  midday: 'Midday (12-2pm)',
  afternoon: 'Afternoon (3-5pm)',
  evening: 'Evening (6-8pm)'
};

export const AIScheduleSettings: React.FC<AIScheduleSettingsProps> = ({ visible }) => {
  const { theme } = useTheme();
  const { isPremium } = usePremium();
  const [currentPreference, setCurrentPreference] = useState<string>('random');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCurrentPreference();
    }
  }, [visible]);

  const loadCurrentPreference = async () => {
    const preference = await AsyncStorage.getItem(KEYS.AI_WELLNESS.TIME_PREFERENCE) || 'random';
    setCurrentPreference(preference);
  };


  const handleChangeSchedule = () => {
    if (!isPremium) {
      Alert.alert(
        'Premium Feature',
        'Daily check-ins and custom scheduling are premium features. Upgrade to unlock!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Learn More', onPress: () => {
            // Navigate to premium upgrade
          }}
        ]
      );
      return;
    }

    // Show time preference options
    const options = Object.entries(timePreferenceLabels).map(([value, label]) => ({
      text: label,
      onPress: () => updateSchedulePreference(value)
    }));

    Alert.alert(
      'Choose Check-in Time',
      'When would you like your daily wellness check-ins?',
      [
        ...options,
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const updateSchedulePreference = async (newPreference: string) => {
    setIsLoading(true);
    try {
      // Save new preference
      await AsyncStorage.setItem(KEYS.AI_WELLNESS.TIME_PREFERENCE, newPreference);
      setCurrentPreference(newPreference);

      // Reschedule notifications
      await scheduleAIWellnessV2('preference_change');

      Alert.alert(
        'Schedule Updated',
        `Your check-ins are now scheduled for ${timePreferenceLabels[newPreference]}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error updating schedule preference:', error);
      Alert.alert(
        'Error',
        'Failed to update schedule. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={[styles.row, { borderBottomColor: theme.border }]}>
        <View style={styles.leftContent}>
          <Text style={[styles.label, { color: theme.text }]}>Check-in Schedule</Text>
          <Text style={[styles.subLabel, { color: theme.textSecondary }]}>
            {isPremium ? timePreferenceLabels[currentPreference] : 'Wednesdays only (Free)'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleChangeSchedule}
          disabled={isLoading}
          style={styles.changeButton}
        >
          <Text style={[styles.changeText, { color: isPremium ? theme.accent : theme.textSecondary }]}>
            {isPremium ? 'Change' : 'Upgrade'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  leftContent: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  subLabel: {
    fontSize: 14,
    marginBottom: 2,
  },
  changeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  changeText: {
    fontSize: 14,
    fontWeight: '600',
  },
});