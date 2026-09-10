import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { AIDataManagement } from './ai';

interface DataManagementProps {
  onResetAllData: () => void;
}

const DataManagement: React.FC<DataManagementProps> = ({ onResetAllData }) => {
  const { theme, isDark, isSunset } = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Data Management</Text>
        <Text style={[styles.sectionToggle, { color: theme.textSecondary }]}>{expanded ? '▼' : '►'}</Text>
      </TouchableOpacity>
      {expanded && (
        <View style={styles.container}>
          <TouchableOpacity
            style={[styles.settingItem, styles.lastItem]}
            onPress={onResetAllData}
          >
            <View style={styles.settingContent}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: isDark || isSunset ? '#3B2E2E' : '#FFEBEE' },
                ]}
              >
                <Ionicons name="trash-outline" size={22} color="#F44336" />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>Reset All Data</Text>
                <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>Delete all app data and start fresh</Text>
              </View>
            </View>
          </TouchableOpacity>
          <AIDataManagement visible={expanded} />
        </View>
      )}
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionToggle: {
    fontSize: 14,
  },
  container: {
    padding: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
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

export default DataManagement;
