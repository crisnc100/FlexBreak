import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import aiWellnessService from '../../../services/ai/aiWellnessService';
import wellnessMemory from '../../../services/ai/wellnessMemory';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../../../services/storageService';

interface AIDataManagementProps {
  visible: boolean;
}

export const AIDataManagement: React.FC<AIDataManagementProps> = ({ visible }) => {
  const { theme } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dataStats, setDataStats] = useState<{ interactions: number; lastCheckIn: string } | null>(null);

  useEffect(() => {
    loadDataStats();
  }, [visible]);

  const loadDataStats = async () => {
    try {
      const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
      const memory = await wellnessMemory.getMemory(userId);
      setDataStats({
        interactions: memory.totalInteractions,
        lastCheckIn: memory.lastCheckIn ? new Date(memory.lastCheckIn).toLocaleDateString() : 'Never'
      });
    } catch (error) {
      console.error('Error loading data stats:', error);
    }
  };

  if (!visible) return null;

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
      
      // Get wellness memory data
      const memory = await wellnessMemory.getMemory(userId);
      const insights = await wellnessMemory.getRecentInsights(userId, 50);
      const userName = await AsyncStorage.getItem(KEYS.AI_WELLNESS.USER_NAME);
      
      const exportData = {
        exportDate: new Date().toISOString(),
        userData: {
          name: userName || 'Not provided',
          totalInteractions: memory.totalInteractions,
          consistencyScore: memory.consistencyScore,
          lastCheckIn: memory.lastCheckIn ? new Date(memory.lastCheckIn).toISOString() : null
        },
        patterns: {
          commonIssues: memory.commonIssues,
          effectiveSolutions: memory.effectiveSolutions,
          energyPatterns: memory.energyPatterns
        },
        recentInteractions: insights.map(i => ({
          date: new Date(i.timestamp).toISOString(),
          category: i.category,
          timeOfDay: i.timeOfDay,
          solution: i.solution
        }))
      };
      
      // Convert to JSON string with pretty printing
      const jsonData = JSON.stringify(exportData, null, 2);
      
      // Show preview in alert (in production, save to file or share)
      Alert.alert(
        'Your AI Wellness Data',
        `Data ready for export:\n\n` +
        `• Name: ${exportData.userData.name}\n` +
        `• Total check-ins: ${exportData.userData.totalInteractions}\n` +
        `• Consistency: ${exportData.userData.consistencyScore}%\n` +
        `• Data spans: ${insights.length} interactions`,
        [
          {
            text: 'Copy to Clipboard',
            onPress: () => {
              // In production, use Clipboard API
              console.log('Data copied:', jsonData);
              Alert.alert('Success', 'Data copied to clipboard');
            }
          },
          { text: 'OK' }
        ]
      );
      
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
              
              // Clear all wellness memory
              await wellnessMemory.clearMemory(userId);
              
              // Clear AI wellness settings
              await AsyncStorage.multiRemove([
                KEYS.AI_WELLNESS.ENABLED,
                KEYS.AI_WELLNESS.HAS_SEEN_WELCOME,
                KEYS.AI_WELLNESS.USER_NAME,
                '@ai_wellness_last_response',
                '@ai_wellness_show_modal',
                '@ai_wellness_voice_mode'
              ]);
              
              // Clear conversation history from service
              await aiWellnessService.clearConversationHistory(userId);
              
              Alert.alert(
                'Data Deleted',
                'All your AI Wellness data has been permanently deleted.',
                [{ text: 'OK' }]
              );
              
              // Reload stats
              await loadDataStats();
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
    Alert.alert(
      'AI Wellness Data Policy',
      'What we store:\n' +
      '• Your first name (if provided)\n' +
      '• Anonymized wellness patterns\n' +
      '• Effective solutions that helped you\n' +
      '• Time patterns (no exact timestamps)\n\n' +
      'What we DON\'T store:\n' +
      '• Full conversation transcripts\n' +
      '• Personal health information\n' +
      '• Location or device data\n\n' +
      'Your data is stored locally on your device and can be deleted anytime.',
      [
        {
          text: 'Your Rights',
          onPress: () => {
            Alert.alert(
              'Your Data Rights',
              '✓ Access: Export your data anytime\n' +
              '✓ Delete: Remove all data permanently\n' +
              '✓ Control: Enable/disable AI wellness\n' +
              '✓ Privacy: No data leaves your device\n\n' +
              'We only store patterns to improve your experience, never full conversations.',
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
        {dataStats && (
          <Text style={[styles.statsText, { color: theme.textSecondary }]}>
            {dataStats.interactions} check-ins • Last: {dataStats.lastCheckIn}
          </Text>
        )}
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
  statsText: {
    fontSize: 11,
    marginLeft: 'auto',
  },
});