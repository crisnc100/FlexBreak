import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import Clipboard from '@react-native-clipboard/clipboard';
import { exportLocalAIData } from '../../../services/ai/localAIData';
import { getAIDataGeneration, isAIDataCurrent, onAIDataDeleted } from '../../../services/ai/aiDataLifecycle';
import { deleteLocalAIData } from '../../../services/ai/deleteAIData';
import memoryService from '../../../services/ai/memory/memoryService';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  useEffect(() => onAIDataDeleted(() => setDataStats({ interactions: 0, lastCheckIn: 'Never' })), []);

  const loadDataStats = async () => {
    const generation = getAIDataGeneration();
    try {
      const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
      const memory = await memoryService.getMemory(userId);
      if (!isAIDataCurrent(generation)) return;
      setDataStats({
        interactions: memory.usage.totalInteractions,
        lastCheckIn: memory.usage.lastCheckIn ? new Date(memory.usage.lastCheckIn).toLocaleDateString() : 'Never'
      });
    } catch (error) {
      console.error('Error loading data stats:', error);
    }
  };

  if (!visible) return null;

  const handleExportData = async () => {
    try {
      setIsExporting(true);
      const generation = getAIDataGeneration();
      const exportData = await exportLocalAIData();
      if (!isAIDataCurrent(generation)) return;

      // Convert to JSON string with pretty printing
      const jsonData = JSON.stringify(exportData, null, 2);
      
      // Show preview in alert (in production, save to file or share)
      Alert.alert(
        'Your AI Wellness Data',
        `Ready to copy ${Object.keys(exportData.records).length} local AI records, including conversations, memory and settings.`,
        [
          {
            text: 'Copy to Clipboard',
            onPress: () => {
              if (!isAIDataCurrent(generation)) return;
              Clipboard.setString(jsonData);
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
      'Delete AI conversations, wellness memory and settings from this device, and cancel AI notifications? Shared diagnostic error counts are retained. This does not delete records already processed by cloud providers.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              await deleteLocalAIData();

              Alert.alert(
                'Data Deleted',
                'AI conversations, wellness memory and settings were deleted from this device. AI notifications were cancelled and the coach was turned off. Shared diagnostic error counts remain.',
                [{ text: 'OK' }]
              );
              
              setDataStats({ interactions: 0, lastCheckIn: 'Never' });
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
      'On this device: your conversations, wellness notes, preferences and usage timestamps.\n\n' +
      'When you use the coach, messages and relevant context are sent through our backend to AI providers. Voice input is sent for speech transcription. Email verification sends the email address to the verification service.\n\n' +
      'You can copy your local AI data or delete it here. Local deletion does not remove data already processed by providers. Avoid sharing information you do not want processed remotely.',
      [
        {
          text: 'Your Rights',
          onPress: () => {
            Alert.alert(
              'Your Data Rights',
              '✓ Access: Export your data anytime\n' +
              '✓ Delete: Remove AI data from this device\n' +
              '✓ Control: Enable/disable AI wellness\n' +
              '✓ Privacy: Review how AI data is processed\n\n' +
              'Conversations are stored locally. AI and speech requests also use remote providers; local deletion does not delete provider records.',
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
            Copy all AI Wellness data on this device
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
            Remove AI data from this device
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