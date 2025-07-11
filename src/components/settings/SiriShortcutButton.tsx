import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { usePremium } from '../../context/PremiumContext';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../services/storageService';
import { canAccessFlexCoach } from '../../utils/siriShortcuts';

export const SiriShortcutButton: React.FC = () => {
  const { theme } = useTheme();
  const { isPremium } = usePremium();
  const [isAIEnabled, setIsAIEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAIStatus();
  }, []);

  const checkAIStatus = async () => {
    try {
      const enabled = await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED);
      setIsAIEnabled(enabled === 'true');
    } catch (error) {
      console.error('Error checking AI status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToSiri = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert(
        'Not Available',
        'Siri shortcuts are only available on iOS devices.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check if AI Wellness is enabled
    if (!isAIEnabled) {
      Alert.alert(
        'AI Wellness Not Enabled',
        'Please enable AI Wellness Coach first in the settings.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check access permissions
    const accessCheck = await canAccessFlexCoach();
    const today = new Date().getDay();
    const isWednesday = today === 3;

    // Show access information
    let accessInfo = '';
    if (isPremium) {
      accessInfo = '✓ Premium user - Access available every day';
    } else if (isWednesday) {
      accessInfo = '✓ Free user - Access available today (Wednesday)';
    } else {
      accessInfo = '⚠️ Free user - Access only on Wednesdays';
    }

    // Open iOS Settings to the Siri & Search section
    try {
      // Show comprehensive instructions
      Alert.alert(
        'Add Siri Shortcut',
        `${accessInfo}\n\nTo add the shortcut:\n\n1. Go to Settings > Siri & Search\n2. Find "FlexBreak" in the app list\n3. Tap "FlexBreak"\n4. Turn on "Use with Siri" if not already on\n5. Tap "Add to Siri" under "Shortcuts"\n6. Record your phrase (e.g., "Open Flex Coach")\n7. Tap "Done"\n\nNote: ${!isPremium ? 'As a free user, the shortcut will only work on Wednesdays.' : 'You can use this shortcut any day.'}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Open Settings', 
            onPress: async () => {
              try {
                // Try to open Siri settings directly
                await Linking.openURL('App-prefs:SIRI');
              } catch (error) {
                // Fallback to general settings
                Linking.openSettings();
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error showing instructions:', error);
    }
  };

  if (Platform.OS !== 'ios') return null;
  if (loading) return <ActivityIndicator style={{ margin: 20 }} />;

  const getSubtitleText = () => {
    if (!isAIEnabled) return 'Enable AI Wellness first';
    if (!isPremium) return 'Free: Wednesdays only';
    return 'Say "Hey Siri, open Flex Coach"';
  };

  const getIconColor = () => {
    if (!isAIEnabled) return theme.textSecondary;
    const today = new Date().getDay();
    if (!isPremium && today !== 3) return '#FFA500'; // Orange for restricted
    return '#007AFF'; // Blue for available
  };

  return (
    <TouchableOpacity 
      style={[styles.button, { backgroundColor: theme.cardBackground }]}
      onPress={handleAddToSiri}
    >
      <View style={styles.content}>
        <Ionicons name="mic-circle" size={32} color={getIconColor()} />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.text }]}>Add to Siri</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            {getSubtitleText()}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});