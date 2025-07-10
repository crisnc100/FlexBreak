import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Linking from 'expo-linking';

export const SiriShortcutButton: React.FC = () => {
  const { theme } = useTheme();

  const handleAddToSiri = async () => {
    if (Platform.OS !== 'ios') {
      Alert.alert(
        'Not Available',
        'Siri shortcuts are only available on iOS devices.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Open iOS Settings to the Siri & Search section for FlexBreak
    try {
      // This opens Settings app to Siri section
      await Linking.openURL('App-prefs:SIRI');
      
      // Show instructions
      setTimeout(() => {
        Alert.alert(
          'Add Siri Shortcut',
          '1. Find "FlexBreak" in the list\n2. Tap "Add to Siri"\n3. Record phrase like "Open Flex Coach"\n4. Tap Done',
          [{ text: 'Got it!' }]
        );
      }, 500);
    } catch (error) {
      // Fallback: Open general settings
      Linking.openSettings();
    }
  };

  if (Platform.OS !== 'ios') return null;

  return (
    <TouchableOpacity 
      style={[styles.button, { backgroundColor: theme.cardBackground }]}
      onPress={handleAddToSiri}
    >
      <View style={styles.content}>
        <Ionicons name="mic-circle" size={32} color="#007AFF" />
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: theme.text }]}>Add to Siri</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Say "Hey Siri, open Flex Coach"
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