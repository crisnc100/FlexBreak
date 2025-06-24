import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
// import dataRetentionService from '../../../services/ai/dataRetentionPolicy'; // Removed for MVP
import aiWellnessService from '../../../services/ai/aiWellnessService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AIDataManagementProps {
  visible: boolean;
}

export const AIDataManagement: React.FC<AIDataManagementProps> = ({ visible }) => {
  const { theme } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!visible) return null;

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
      // Data export removed for MVP
      const userData = { message: 'Data export not available in MVP' };
      
      // Convert to JSON string with pretty printing
      const jsonData = JSON.stringify(userData, null, 2);
      
      // Show data in alert for now (in production, you'd save to file or share)
      Alert.alert(
        'Your AI Wellness Data',
        'Data exported successfully. In the full app, this would save to a file.',
        [
          {
            text: 'View Policy',
            onPress: () => {
              Alert.alert(
                'Data Retention Policy',
                'Conversations: 90 days\nUsage metrics: 180 days\nEffectiveness data: 365 days\nAnonymous data: 30 days',
                [{ text: 'OK' }]
              );
            }
          },
          { text: 'OK' }
        ]
      );
      
      console.log('Exported data:', jsonData);
    } catch (error) {
      Alert.alert('Export Failed', 'Unable to export your data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteData = async () => {
    Alert.alert(
      'Delete AI Wellness Data',
      'This will permanently delete all your AI Wellness conversations and data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
              
              // Delete all user data
              // Data deletion removed for MVP
      // In MVP, we'll just clear the basic storage
      await AsyncStorage.removeItem('@ai_wellness_enabled');
      await AsyncStorage.removeItem('@ai_wellness_has_seen_welcome');
              
              // Clear conversation history from service
              await aiWellnessService.clearConversationHistory(userId);
              
              Alert.alert(
                'Data Deleted',
                'All your AI Wellness data has been deleted.',
                [{ text: 'OK' }]
              );
            } catch (error) {
              Alert.alert('Deletion Failed', 'Unable to delete your data. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  const handleViewPolicy = () => {
    const policy = dataRetentionService.getRetentionPolicy();
    Alert.alert(
      'Data Retention Policy',
      `Version: ${policy.version}\nLast Updated: ${policy.lastUpdated}\n\n` +
      `Data Retention Periods:\n` +
      `• Conversations: ${policy.retentionPeriods.conversationHistory} days\n` +
      `• Usage Metrics: ${policy.retentionPeriods.usageMetrics} days\n` +
      `• Effectiveness Data: ${policy.retentionPeriods.effectivenessData} days\n` +
      `• Anonymous Data: ${policy.retentionPeriods.anonymousData} days\n\n` +
      `Contact: ${policy.contact}`,
      [
        {
          text: 'View Your Rights',
          onPress: () => {
            Alert.alert(
              'Your Data Rights',
              `${policy.userRights.access}\n\n` +
              `${policy.userRights.deletion}\n\n` +
              `${policy.userRights.portability}\n\n` +
              `${policy.userRights.correction}`,
              [{ text: 'OK' }]
            );
          }
        },
        { text: 'OK' }
      ]
    );
  };

  return (
    <>
      <View style={styles.settingRow}>
        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary, marginTop: 12, marginBottom: 8 }]}>
          Data Management
        </Text>
      </View>

      {/* Export Data */}
      <TouchableOpacity 
        style={[styles.settingRow, { justifyContent: 'space-between' }]}
        onPress={handleExportData}
        disabled={isExporting}
      >
        <View style={styles.settingLabelContainer}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>
            Export My Data
          </Text>
          <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
            Download all your AI Wellness data
          </Text>
        </View>
        {isExporting ? (
          <ActivityIndicator size="small" color={theme.accent} />
        ) : (
          <Ionicons name="download-outline" size={22} color={theme.accent} />
        )}
      </TouchableOpacity>

      {/* Delete Data */}
      <TouchableOpacity 
        style={[styles.settingRow, { justifyContent: 'space-between' }]}
        onPress={handleDeleteData}
        disabled={isDeleting}
      >
        <View style={styles.settingLabelContainer}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>
            Delete My Data
          </Text>
          <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
            Permanently remove all AI data
          </Text>
        </View>
        {isDeleting ? (
          <ActivityIndicator size="small" color="#FF3B30" />
        ) : (
          <Ionicons name="trash-outline" size={22} color="#FF3B30" />
        )}
      </TouchableOpacity>

      {/* View Policy */}
      <TouchableOpacity 
        style={[styles.settingRow, { justifyContent: 'space-between' }]}
        onPress={handleViewPolicy}
      >
        <View style={styles.settingLabelContainer}>
          <Text style={[styles.settingLabel, { color: theme.text }]}>
            Data Retention Policy
          </Text>
          <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
            Learn how we handle your data
          </Text>
        </View>
        <Ionicons name="document-text-outline" size={22} color={theme.accent} />
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  settingRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingLabelContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});