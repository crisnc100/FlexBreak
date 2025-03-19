import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Platform, SafeAreaView, StatusBar, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clearAllData } from '../services/storageService';
import DiagnosticsScreen from './DiagnosticsScreen';

const { width } = Dimensions.get('window');

interface SettingsScreenProps {
  navigation: { goBack: () => void };
  onClose?: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation, onClose }) => {
  const [diagnosticsModalVisible, setDiagnosticsModalVisible] = useState(false);
  
  const handleGoBack = () => {
    if (onClose) {
      onClose();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };
  
  // Handle reset data
  const handleResetData = async () => {
    Alert.alert(
      'Reset All Data',
      'This will delete all app data, including your progress, routines, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: async () => {
          const success = await clearAllData();
          if (success) {
            Alert.alert('Success', 'All app data has been reset');
          } else {
            Alert.alert('Error', 'Failed to reset app data');
          }
        }}
      ]
    );
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={handleGoBack}
          style={styles.backButton}
        >
          <Ionicons name="close" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Theme Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="contrast-outline" size={22} color="#673AB7" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.settingTitle}>Dark Mode</Text>
                <Text style={styles.settingDescription}>Enable dark theme</Text>
              </View>
            </View>
            <View style={styles.badgeContainer}>
              <Text style={styles.comingSoonBadge}>Soon</Text>
            </View>
          </TouchableOpacity>
        </View>
        
        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="information-circle-outline" size={22} color="#2196F3" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.settingTitle}>App Version</Text>
                <Text style={styles.settingDescription}>1.0.0</Text>
              </View>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="document-text-outline" size={22} color="#2196F3" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.settingTitle}>Privacy Policy</Text>
                <Text style={styles.settingDescription}>View our privacy policy</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingContent}>
              <View style={styles.iconContainer}>
                <Ionicons name="help-circle-outline" size={22} color="#2196F3" />
              </View>
              <View style={styles.textContainer}>
                <Text style={styles.settingTitle}>Help</Text>
                <Text style={styles.settingDescription}>Get support and assistance</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
        
        {/* Developer Section - Only visible in development mode */}
        {__DEV__ && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Developer</Text>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => setDiagnosticsModalVisible(true)}
            >
              <View style={styles.settingContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="construct-outline" size={22} color="#FF9800" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.settingTitle}>Diagnostics</Text>
                  <Text style={styles.settingDescription}>Storage and performance monitoring</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.settingItem, styles.lastItem]}
              onPress={handleResetData}
            >
              <View style={styles.settingContent}>
                <View style={styles.iconContainer}>
                  <Ionicons name="trash-outline" size={22} color="#F44336" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={styles.settingTitle}>Reset All Data</Text>
                  <Text style={styles.settingDescription}>Delete all app data and start fresh</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Version info at bottom */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Made with ♥ by Your App Team</Text>
        </View>
      </ScrollView>
      
      {/* Diagnostics Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={diagnosticsModalVisible}
        onRequestClose={() => setDiagnosticsModalVisible(false)}
      >
        <View style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={() => setDiagnosticsModalVisible(false)}
              style={styles.backButton}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Diagnostics</Text>
            <View style={styles.headerRight} />
          </View>
          <DiagnosticsScreen navigation={{ goBack: () => setDiagnosticsModalVisible(false) }} />
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  headerRight: {
    width: 40,
  },
  container: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
    backgroundColor: 'white',
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
    color: '#666',
    backgroundColor: '#fff',
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
  badgeContainer: {
    marginLeft: 8,
  },
  comingSoonBadge: {
    fontSize: 12,
    color: '#673AB7',
    fontWeight: '600',
    padding: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f3e5f5',
    borderRadius: 12,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    color: '#999',
    fontSize: 12,
  },
});

export default SettingsScreen;