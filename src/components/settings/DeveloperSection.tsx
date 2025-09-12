import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface DeveloperSectionProps {
  onOpenDiagnostics: () => void;
  onOpenBobSimulator: () => void;
  onGrantPremium: () => void;
  onClearPremium: () => void;
  onResetSimulationData: () => void;
  onResetAllData: () => void;
  isPremium: boolean;
}

const DeveloperSection: React.FC<DeveloperSectionProps> = ({
  onOpenDiagnostics,
  onOpenBobSimulator,
  onGrantPremium,
  onClearPremium,
  onResetSimulationData,
  onResetAllData,
  isPremium,
}) => {
  const { theme, isDark, isSunset } = useTheme();


  return (
    <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Developer</Text>
      <TouchableOpacity style={styles.settingItem} onPress={onOpenDiagnostics}>
        <View style={styles.settingContent}>
          <View
            style={[styles.iconContainer, { backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD' }]}
          >
            <Ionicons name="analytics-outline" size={22} color={theme.accent} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Diagnostics</Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>Storage and performance monitoring</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.testingButton, { backgroundColor: '#4A90E2', marginTop: 16 }]}
        onPress={onOpenBobSimulator}
      >
        <Ionicons name="flask-outline" size={20} color="#FFF" style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Access Bob Simulator</Text>
      </TouchableOpacity>
      <View style={[styles.premiumStatusContainer, { marginTop: 16, marginBottom: 8 }]}>
        <Text style={[styles.settingTitle, { color: theme.text, marginBottom: 8 }]}>Premium Status Management</Text>
        <Text style={[styles.settingDescription, { color: theme.textSecondary, marginBottom: 12 }]}>Control premium status for testing subscription features</Text>
        <View style={styles.premiumButtonsRow}>
          <TouchableOpacity
            style={[styles.premiumButton, { backgroundColor: isDark || isSunset ? '#3D5A3D' : '#E8F5E9' }, isPremium && { opacity: 0.5 }]}
            onPress={onGrantPremium}
            disabled={isPremium}
          >
            <Ionicons name="star" size={18} color={isDark || isSunset ? '#81C784' : '#4CAF50'} style={styles.premiumButtonIcon} />
            <Text style={[styles.premiumButtonText, { color: isDark || isSunset ? '#81C784' : '#4CAF50' }]}>Grant Premium</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.premiumButton, { backgroundColor: isDark || isSunset ? '#5D3A3A' : '#FFEBEE' }, !isPremium && { opacity: 0.5 }]}
            onPress={onClearPremium}
            disabled={!isPremium}
          >
            <Ionicons name="close-circle" size={18} color={isDark || isSunset ? '#EF9A9A' : '#F44336'} style={styles.premiumButtonIcon} />
            <Text style={[styles.premiumButtonText, { color: isDark || isSunset ? '#EF9A9A' : '#F44336' }]}>Clear Premium</Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={[styles.settingItem, styles.lastItem]} onPress={onResetSimulationData}>
        <View style={styles.settingContent}>
          <View style={[styles.iconContainer, { backgroundColor: isDark || isSunset ? '#3B2E2E' : '#FFEBEE' }]}>
            <Ionicons name="trash-outline" size={22} color="#F44336" />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Reset Simulation Data</Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>Delete all simulation data only (for testers)</Text>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.settingItem} onPress={onResetAllData}>
        <View style={styles.settingContent}>
          <View style={[styles.iconContainer, { backgroundColor: isDark || isSunset ? '#3B2E2E' : '#FFEBEE' }]}>
            <Ionicons name="trash-outline" size={22} color="#F44336" />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>Reset All Data</Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>Delete all app data and start fresh</Text>
          </View>
        </View>
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
  testingButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  premiumStatusContainer: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
  },
  premiumButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  premiumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  premiumButtonIcon: {
    marginRight: 6,
  },
  premiumButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
});

export default DeveloperSection;
