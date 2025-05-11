import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface PrivacyNoticeProps {
  onClose?: () => void;
}

const PrivacyNotice: React.FC<PrivacyNoticeProps> = ({ onClose }) => {
  const { theme, isDark } = useTheme();
  
  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: isDark ? theme.cardBackground : '#FFFFFF',
        borderColor: isDark ? theme.border : '#E0E0E0'
      }
    ]}>
      <View style={styles.header}>
        <View style={styles.titleWrapper}>
          <Ionicons 
            name="shield-checkmark-outline" 
            size={22} 
            color={theme.accent} 
          />
          <Text style={[styles.title, { color: theme.text }]}>
            Privacy & Data Notice
          </Text>
        </View>
        
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.content}>
        <View style={styles.section}>
          <Ionicons
            name="phone-portrait-outline"
            size={20}
            color={theme.accent}
            style={styles.icon}
          />
          <View style={styles.sectionContent}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Local Storage Only
            </Text>
            <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
              All your progress data, including routines, streaks, and achievements, 
              is stored locally on your device. We do not collect or store your 
              personal information on any servers.
            </Text>
          </View>
        </View>
        
        <View style={styles.section}>
          <Ionicons
            name="analytics-outline"
            size={20}
            color={theme.accent}
            style={styles.icon}
          />
          <View style={styles.sectionContent}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              No Personal Data Collection
            </Text>
            <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
              FlexBreak is designed for privacy. We don't track your activity, 
              collect analytics, or gather personally identifiable information. 
              Your usage remains private.
            </Text>
          </View>
        </View>
        
        <View style={styles.section}>
          <Ionicons
            name="card-outline"
            size={20}
            color={theme.accent}
            style={styles.icon}
          />
          <View style={styles.sectionContent}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Premium Features
            </Text>
            <Text style={[styles.sectionText, { color: theme.textSecondary }]}>
              Premium features are managed through your device's app store. Any payment 
              information is handled securely by the app store and is not accessible 
              to FlexBreak. Standard app store payment policies apply.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    margin: 16
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  titleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8
  },
  closeButton: {
    padding: 4
  },
  content: {
    padding: 16
  },
  section: {
    flexDirection: 'row',
    marginBottom: 16
  },
  icon: {
    marginTop: 2
  },
  sectionContent: {
    flex: 1,
    marginLeft: 12
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4
  },
  sectionText: {
    fontSize: 14,
    lineHeight: 20
  }
});

export default PrivacyNotice; 