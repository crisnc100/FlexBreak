import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { useToast } from 'react-native-toast-notifications';
import { 
  setWeatherNotificationsEnabled, 
  areWeatherNotificationsEnabled,
  updateLocationIfNeeded 
} from '../../../services/locationService';
import { Ionicons } from '@expo/vector-icons';

export const WeatherNotificationToggle: React.FC = () => {
  const { theme, isDark, isSunset } = useTheme();
  const toast = useToast();
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
        toast.show(
          value ? 'Weather Notifications Enabled\nYour reminders will now include weather-based messages' : 
                  'Weather Notifications Disabled\nYou\'ll receive standard wellness reminders only',
          {
            type: 'success',
            placement: 'top',
            duration: 3000,
          }
        );
      } else {
        // Revert the toggle if it failed
        toast.show(
          'Unable to Enable Weather Notifications\nPlease check your location permissions',
          {
            type: 'danger',
            placement: 'top',
            duration: 4000,
          }
        );
      }
    } catch (error) {
      console.error('Error toggling weather notifications:', error);
      toast.show(
        'Error\nFailed to update weather notification settings',
        {
          type: 'danger',
          placement: 'top',
          duration: 4000,
        }
      );
    } finally {
      setLoading(false);
    }
  };

  if (isInitializing) {
    return (
      <View style={styles.settingRow}>
        <ActivityIndicator size="small" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={styles.settingRow}>
      <View style={styles.iconContainer}>
        <View style={[styles.iconBackground, { backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD' }]}>
          <Ionicons name="partly-sunny" size={24} color="#2196F3" />
        </View>
      </View>
      
      <View style={styles.settingLabelContainer}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>
          Weather-Based Notifications
        </Text>
        <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
          Mix weather insights with your wellness reminders
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
  settingRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
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
  settingLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 13,
    marginTop: 2,
  },
});