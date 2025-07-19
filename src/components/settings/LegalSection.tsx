import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import FitnessDisclaimer from './notices/FitnessDisclaimer';
import NonMedicalNotice from './notices/NonMedicalNotice';

const LegalSection: React.FC = () => {
  const { theme, isDark, isSunset } = useTheme();
  const [fitnessDisclaimerModalVisible, setFitnessDisclaimerModalVisible] = useState(false);
  const [nonMedicalNoticeModalVisible, setNonMedicalNoticeModalVisible] = useState(false);

  return (
    <>
      <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Legal Information</Text>
        
        {/* Fitness Disclaimer */}
        <TouchableOpacity 
          style={styles.settingItem} 
          onPress={() => setFitnessDisclaimerModalVisible(true)}
        >
          <View style={styles.settingContent}>
            <View style={[styles.iconContainer, { backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD' }]}>
              <Ionicons name="fitness-outline" size={22} color={theme.accent} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Fitness Disclaimer</Text>
              <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                View important health and safety information
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
        
        {/* Non-Medical Notice */}
        <TouchableOpacity 
          style={[styles.settingItem, styles.lastItem]} 
          onPress={() => setNonMedicalNoticeModalVisible(true)}
        >
          <View style={styles.settingContent}>
            <View style={[styles.iconContainer, { backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD' }]}>
              <Ionicons name="information-circle-outline" size={22} color={theme.accent} />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>Non-Medical Notice</Text>
              <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                Information regarding wellness content
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Modals */}
      <FitnessDisclaimer 
        visible={fitnessDisclaimerModalVisible}
        onAccept={() => setFitnessDisclaimerModalVisible(false)}
        onCancel={() => setFitnessDisclaimerModalVisible(false)}
        viewOnly={true}
      />
      
      <NonMedicalNotice 
        visible={nonMedicalNoticeModalVisible}
        onAcknowledge={() => setNonMedicalNoticeModalVisible(false)}
        isModal={true}
      />
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
});

export default LegalSection;