import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { Toast } from 'react-native-toast-notifications';
import { 
  setWeatherNotificationsEnabled, 
  areWeatherNotificationsEnabled,
  updateLocationIfNeeded 
} from '../../../services/locationService';
import { Ionicons } from '@expo/vector-icons';

export const WeatherNotificationToggle: React.FC = () => {
  const { theme, isDark, isSunset } = useTheme();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Load weather notification setting on mount
  useEffect(() => {
    const loadSetting = async () => {
      try {
        const isEnabled = await areWeatherNotificationsEnabled();
        setEnabled(isEnabled);
        
        // Update location if needed
        if (isEnabled) {
          await updateLocationIfNeeded();
        }
      } catch (error) {
        console.error('Error loading weather notification setting:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    loadSetting();
  }, []);

  const handleToggle = async (value: boolean) => {
    setLoading(true);
    try {
      const success = await setWeatherNotificationsEnabled(value);
      
      if (success) {
        setEnabled(value);
        Toast.show({
          type: 'success',
          text1: value ? 'Weather Notifications Enabled' : 'Weather Notifications Disabled',
          text2: value ? 'You\'ll receive weather-based wellness reminders' : 'Weather notifications turned off',
          topOffset: 60,
        });
      } else {
        // Revert the toggle if it failed
        Toast.show({
          type: 'error',
          text1: 'Unable to Enable Weather Notifications',
          text2: 'Please check your location permissions',
          topOffset: 60,
        });
      }
    } catch (error) {
      console.error('Error toggling weather notifications:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update weather notification settings',
        topOffset: 60,
      });
    } finally {
      setLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <View style={[styles.iconBackground, { backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD' }]}>
          <Ionicons name="partly-sunny" size={22} color="#2196F3" />
        </View>
      </View>
      
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.text }]}>
          Weather-Based Notifications
        </Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          Get wellness reminders based on local weather conditions
        </Text>
      </View>
      
      <Switch
        value={enabled}
        onValueChange={handleToggle}
        disabled={loading}
        trackColor={{ 
          false: '#767577', 
          true: isDark || isSunset ? theme.accent + '80' : theme.accent + '50' 
        }}
        thumbColor={enabled ? theme.accent : '#f4f3f4'}
        ios_backgroundColor="#3e3e3e"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    marginRight: 12,
  },
  iconBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
});