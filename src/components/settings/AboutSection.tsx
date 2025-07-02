import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Alert, Modal, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import updateService from '../../services/updateService';
import { ThemedText } from '../common';

interface AboutSectionProps {
  appVersion: string;
}

const AboutSection: React.FC<AboutSectionProps> = ({
  appVersion,
}) => {
  const { theme, isDark, isSunset } = useTheme();
  const [checkingForUpdates, setCheckingForUpdates] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  // Handle contact support
  const handleContactSupport = () => {
    Linking.openURL('mailto:flexbreakapp@gmail.com?subject=FlexBreak%20Support%20Request');
  };

  // Handle open website
  const handleOpenWebsite = () => {
    Linking.openURL('https://flexbreak-support-hub.com');
  };

  // Handle check for updates
  const handleCheckForUpdates = async () => {
    setCheckingForUpdates(true);
    try {
      const info = await updateService.checkForUpdate(true); // Force check
      if (!info.isUpdateAvailable) {
        Alert.alert(
          'No Updates Available',
          `You're running the latest version (${info.currentVersion})`,
          [{ text: 'OK' }]
        );
      }
      // If update is available, the modal will be shown automatically by the hook
    } catch (error) {
      Alert.alert(
        'Update Check Failed',
        'Unable to check for updates. Please try again later.',
        [{ text: 'OK' }]
      );
    } finally {
      setCheckingForUpdates(false);
    }
  };

  return (
    <>
      <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>About</Text>

      <TouchableOpacity style={styles.settingItem}>
        <View style={styles.settingContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD' },
            ]}
          >
            <Ionicons name="information-circle-outline" size={22} color="#2196F3" />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>App Version</Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>{appVersion}</Text>
          </View>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.settingItem}
        onPress={handleCheckForUpdates}
        disabled={checkingForUpdates}
      >
        <View style={styles.settingContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD' },
            ]}
          >
            <Ionicons name="cloud-download-outline" size={22} color="#2196F3" />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Check for Updates</Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}> 
              {checkingForUpdates ? 'Checking...' : 'See if a new version is available'}
            </Text>
          </View>
        </View>
        {!checkingForUpdates && (
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.settingItem}
        onPress={() => Linking.openURL('https://flexbreak-privacy-app.netlify.app/')}
      >
        <View style={styles.settingContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD' },
            ]}
          >
            <Ionicons name="document-text-outline" size={22} color="#2196F3" />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Privacy Policy</Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>View our privacy policy website</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem} onPress={() => setHelpModalVisible(true)}>
        <View style={styles.settingContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD' },
            ]}
          >
            <Ionicons name="help-circle-outline" size={22} color="#2196F3" />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Help & Support</Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>Get support and assistance</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingItem} onPress={handleOpenWebsite}>
        <View style={styles.settingContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD' },
            ]}
          >
            <Ionicons name="globe-outline" size={22} color="#2196F3" />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Website</Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>Visit our website</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.settingItem, styles.lastItem]}
        onPress={handleContactSupport}
      >
        <View style={styles.settingContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD' },
            ]}
          >
            <Ionicons name="mail-outline" size={22} color="#2196F3" />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Contact Us</Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>Send us an email</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      </TouchableOpacity>
    </View>

      {/* Help Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={helpModalVisible}
        onRequestClose={() => setHelpModalVisible(false)}
      >
        <SafeAreaView style={[styles.safeArea, {backgroundColor: theme.background}]}>
          <View style={[styles.modalHeader, {borderBottomColor: theme.border, backgroundColor: theme.cardBackground}]}>
            <TouchableOpacity 
              onPress={() => setHelpModalVisible(false)}
              style={styles.modalCloseButton}
              hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, {color: theme.text}]}>Help & Support</Text>
            <View style={styles.headerRight} />
          </View>
          
          <ScrollView style={[styles.container, {padding: 16}]}>
            <ThemedText style={styles.helpTitle} bold size={20}>
              Frequently Asked Questions
            </ThemedText>
            
            <ThemedText style={styles.helpQuestion} bold>
              How do I start a stretching routine?
            </ThemedText>
            <ThemedText style={styles.helpAnswer}>
              From the home screen, tap on "Start Stretching" or select a specific routine from the routines tab. Follow the on-screen instructions for each stretch.
            </ThemedText>
            
            <ThemedText style={styles.helpQuestion} bold>
              Can I create custom routines?
            </ThemedText>
            <ThemedText style={styles.helpAnswer}>
              Yes! Go to the Routines tab and tap "Create New" to build your own custom routine with stretches of your choice.
            </ThemedText>
            
            <ThemedText style={styles.helpQuestion} bold>
              How do I track my progress?
            </ThemedText>
            <ThemedText style={styles.helpAnswer}>
              Your progress is automatically tracked in the Stats tab. You can view your daily and weekly stretching minutes, completed routines, and streaks.
            </ThemedText>
            
            <ThemedText style={styles.helpQuestion} bold>
              What is the Premium subscription?
            </ThemedText>
            <ThemedText style={styles.helpAnswer}>
              Premium gives you access to all stretching routines, removes ads, enables dark mode (at level 2), and unlocks custom routine creation. Subscribe in the app settings.
            </ThemedText>
            
            <ThemedText style={styles.helpQuestion} bold>
              How do I set up stretch reminders?
            </ThemedText>
            <ThemedText style={styles.helpAnswer}>
              Go to the Reminders tab and tap "Add Reminder". Choose your preferred time and frequency, and ensure notifications are enabled for the app in your device settings.
            </ThemedText>
            
            <View style={styles.helpDivider} />
            
            <ThemedText style={styles.helpTitle} bold size={20}>
              Contact Support
            </ThemedText>
            <ThemedText style={styles.helpContactText}>
              Need additional help? Our support team is ready to assist you:
            </ThemedText>
            
            <TouchableOpacity 
              style={[styles.helpContactButton, {backgroundColor: theme.accent}]}
              onPress={handleContactSupport}
            >
              <Ionicons name="mail-outline" size={20} color="#FFF" style={{marginRight: 8}} />
              <Text style={styles.helpContactButtonText}>Email Support</Text>
            </TouchableOpacity>
            
            <ThemedText style={styles.helpResponseTime} type="secondary">
              We typically respond within 24 hours on business days.
            </ThemedText>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginTop: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  settingDescription: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  safeArea: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalCloseButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginRight: 28,
  },
  headerRight: {
    width: 24,
  },
  container: {
    flex: 1,
  },
  helpTitle: {
    marginBottom: 16,
  },
  helpQuestion: {
    marginTop: 16,
    marginBottom: 8,
  },
  helpAnswer: {
    lineHeight: 22,
  },
  helpDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 24,
  },
  helpContactText: {
    marginBottom: 16,
  },
  helpContactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  helpContactButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  helpResponseTime: {
    textAlign: 'center',
  },
});

export default AboutSection;
