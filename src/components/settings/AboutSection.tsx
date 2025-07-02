import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface AboutSectionProps {
  appVersion: string;
  checkingForUpdates: boolean;
  onCheckForUpdates: () => void;
  onOpenHelp: () => void;
  onOpenWebsite: () => void;
  onContactSupport: () => void;
}

const AboutSection: React.FC<AboutSectionProps> = ({
  appVersion,
  checkingForUpdates,
  onCheckForUpdates,
  onOpenHelp,
  onOpenWebsite,
  onContactSupport,
}) => {
  const { theme, isDark, isSunset } = useTheme();

  return (
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
        onPress={onCheckForUpdates}
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

      <TouchableOpacity style={styles.settingItem} onPress={onOpenHelp}>
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

      <TouchableOpacity style={styles.settingItem} onPress={onOpenWebsite}>
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
        onPress={onContactSupport}
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
});

export default AboutSection;
