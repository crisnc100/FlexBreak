import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Platform, SafeAreaView, StatusBar, Dimensions, Switch, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clearAllData, clearAllPremiumStatus, saveTransitionDuration, getTransitionDuration, saveIsPremium, KEYS } from '../services/storageService';
import { resetSimulationData } from '../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIWellnessSettings } from '../components/settings/ai';
import DataManagement from '../components/settings/DataManagement';
import DeveloperSection from '../components/settings/DeveloperSection';
import AboutSection from '../components/settings/AboutSection';
import LegalSection from '../components/settings/LegalSection';
import ThemeSection from '../components/settings/ThemeSection';



import DiagnosticsScreen from './DiagnosticsScreen';
import { useTheme } from '../context/ThemeContext';
import { usePremium } from '../context/PremiumContext';
import SubscriptionModal from '../components/SubscriptionModal';
import { ThemedText } from '../components/common';
import { Toast } from 'react-native-toast-notifications';
import FitnessDisclaimer from '../components/settings/notices/FitnessDisclaimer';
import NonMedicalNotice from '../components/settings/notices/NonMedicalNotice';
import { BobSimulatorAccessModal } from '../components/testing';
import * as soundEffects from '../utils/soundEffects';
import * as storageService from '../services/storageService';
import * as achievementService from '../utils/progress/modules/achievementManager';
import { useUpdateNotification } from '../components/UpdateNotificationModal';
import updateService from '../services/updateService';
import AdService from '../services/adService';

const { width } = Dimensions.get('window');

interface SettingsScreenProps {
  navigation: {
    goBack: () => void;
    navigate?: (screen: string, params?: any) => void;
  };
  onClose?: () => void;
}


const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation, onClose }) => {
  const [diagnosticsModalVisible, setDiagnosticsModalVisible] = useState(false);
  const [privacyPolicyModalVisible, setPrivacyPolicyModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const { theme, isDark, isSunset } = useTheme();
  const { isPremium } = usePremium();
  const [bobSimulatorModalVisible, setBobSimulatorModalVisible] = useState(false);
  const hasSeenDarkModeUnlock = useRef(false);
  const appVersion = updateService.getCurrentVersion();
  const [fitnessDisclaimerModalVisible, setFitnessDisclaimerModalVisible] = useState(false);
  const [nonMedicalNoticeModalVisible, setNonMedicalNoticeModalVisible] = useState(false);
  const [transitionDuration, setTransitionDuration] = useState(5);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [badgeCount, setBadgeCount] = useState(0);
  const { showModal, updateInfo, checkForUpdates, hideModal } = useUpdateNotification();
  
  // Load transition duration on mount
  useEffect(() => {
    const loadTransitionDuration = async () => {
      const duration = await getTransitionDuration();
      setTransitionDuration(duration);
    };
    loadTransitionDuration();
  }, []);

  // Load sound effects setting on mount
  useEffect(() => {
    const loadSoundEffectsSetting = () => {
      setSoundEffectsEnabled(soundEffects.isSoundEnabled());
    };
    loadSoundEffectsSetting();
  }, []);

  // Load badge count on mount
  useEffect(() => {
    const loadBadgeCount = async () => {
      try {
        // Get user progress
        const userProgress = await storageService.getUserProgress();
        
        // Get achievements summary
        const achievementsSummary = achievementService.getAchievementsSummary(userProgress);
        
        // Count completed achievements
        const completedCount = achievementsSummary.completed.length;
        setBadgeCount(completedCount);
      } catch (error) {
        console.error('Error loading badge count:', error);
      }
    };
    loadBadgeCount();
    
    // Notify AdService when settings is opened
    AdService.onSettingsOpened();
  }, []);

  // Handle sound effects toggle
  const handleToggleSoundEffects = async (value: boolean) => {
    setSoundEffectsEnabled(value);
    await soundEffects.setSoundEnabled(value);
  };
  
  // Handle transition duration change
  const handleTransitionDurationChange = async (value: number) => {
    const roundedValue = Math.round(value);
    setTransitionDuration(roundedValue);
    await saveTransitionDuration(roundedValue);
  };
  
  const handleGoBack = () => {
    if (onClose) {
      onClose();
    } else if (navigation?.goBack) {
      navigation.goBack();
    }
  };
  
  // Handle showing subscription modal
  const handleOpenSubscription = () => {
    setSubscriptionModalVisible(true);
  };
  
  // Handle subscription complete
  const handleSubscriptionComplete = () => {
    // Subscription was completed, potentially refresh data
    // For now just close the modal
    setSubscriptionModalVisible(false);
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

  // Handle reset data
  const handleResetSimulationData = async () => {
    Alert.alert(
      'Reset All Data',
      'This will delete all app data, including your progress, routines, and settings. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: async () => {
          const success = await resetSimulationData();
          if (success) {
            Alert.alert('Success', 'All app data has been reset');
          } else {
            Alert.alert('Error', 'Failed to reset app data');
          }
        }}
      ]
    );
  };

  // Handle clear premium status
  const handleClearPremiumStatus = async () => {
    Alert.alert(
      'Clear Premium Status',
      'This will remove your premium status, useful for testing subscription flows. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear Premium', style: 'destructive', onPress: async () => {
          const success = await clearAllPremiumStatus();
          if (success) {
            Alert.alert('Success', 'Premium status has been cleared. Please restart the app for changes to take effect.');
          } else {
            Alert.alert('Error', 'Failed to clear premium status');
          }
        }}
      ]
    );
  };

  // Handle grant premium status
  const handleGrantPremiumStatus = async () => {
    Alert.alert(
      'Grant Premium Status',
      'This will enable premium features for testing purposes. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Grant Premium', style: 'default', onPress: async () => {
          try {
            // Save premium status in multiple places to ensure it works
            await storageService.saveIsPremium(true);
            await AsyncStorage.setItem('@flexbreak:testing_premium_access', 'true');
            
            Alert.alert('Success', 'Premium status has been granted. Please restart the app for changes to take effect.');
          } catch (error) {
            console.error('Error granting premium status:', error);
            Alert.alert('Error', 'Failed to grant premium status');
          }
        }}
      ]
    );
  };

  // Function to open subscription management page
  const openSubscriptionManagement = () => {
    if (Platform.OS === 'ios') {
      // Opens iOS subscription management
      Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else if (Platform.OS === 'android') {
      // Opens Google Play subscription management
      Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  };
  
  // Add this section in the render part, before the diagnostics section
  const renderWorkoutSettings = () => {
    return (
      <View style={[styles.section, {backgroundColor: theme.cardBackground}]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Workout Settings</Text>
        
        <View style={styles.settingRow}>
          <View style={styles.settingLabelContainer}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>
              Transition Duration
            </Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
              {transitionDuration === 0 ? 'No transitions' : `${transitionDuration} seconds between stretches`}
            </Text>
          </View>
          <View style={styles.transitionOptionsContainer}>
            <TouchableOpacity
              style={[
                styles.transitionOption,
                transitionDuration === 0 && styles.transitionOptionSelected,
                { backgroundColor: transitionDuration === 0 ? theme.accent : (isDark || isSunset ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') }
              ]}
              onPress={() => handleTransitionDurationChange(0)}
            >
              <Text style={[
                styles.transitionOptionText,
                { color: transitionDuration === 0 ? '#fff' : theme.text }
              ]}>Off</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.transitionOption,
                transitionDuration === 5 && styles.transitionOptionSelected,
                { backgroundColor: transitionDuration === 5 ? theme.accent : (isDark || isSunset ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') }
              ]}
              onPress={() => handleTransitionDurationChange(5)}
            >
              <Text style={[
                styles.transitionOptionText,
                { color: transitionDuration === 5 ? '#fff' : theme.text }
              ]}>5s</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.transitionOption,
                transitionDuration === 10 && styles.transitionOptionSelected,
                { backgroundColor: transitionDuration === 10 ? theme.accent : (isDark || isSunset ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)') }
              ]}
              onPress={() => handleTransitionDurationChange(10)}
            >
              <Text style={[
                styles.transitionOptionText,
                { color: transitionDuration === 10 ? '#fff' : theme.text }
              ]}>10s</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Sound Effects Toggle */}
        <View style={styles.settingRow}>
          <View style={styles.settingLabelContainer}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>
              Sound Effects
            </Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
              Enable click sounds, timer ticks, and other effects
            </Text>
          </View>
          <Switch
            value={soundEffectsEnabled}
            onValueChange={handleToggleSoundEffects}
            trackColor={{ false: '#767577', true: isDark || isSunset ? theme.accent + '80' : theme.accent + '50' }}
            thumbColor={soundEffectsEnabled ? theme.accent : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
          />
        </View>

        {/* AI Wellness Coach Settings */}
        <AIWellnessSettings />
      </View>
    );
  };
  
  return (
    <SafeAreaView style={[styles.safeArea, {backgroundColor: theme.background}]}>
      <StatusBar barStyle={isDark || isSunset ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      
      {/* Header */}
      <View style={[styles.header, {borderBottomColor: theme.border, backgroundColor: theme.cardBackground}]}>
        <TouchableOpacity 
          onPress={handleGoBack}
          style={styles.backButton}
          hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
        >
          <Ionicons name="close" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: theme.text}]}>Settings</Text>
        <View style={styles.headerRight} />
      </View>
      
      <ScrollView 
        style={[styles.container, {backgroundColor: theme.background}]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Theme Section */}
        <ThemeSection 
          onOpenSubscription={handleOpenSubscription}
          badgeCount={badgeCount}
        />
        
        {/* Workout Settings Section */}
        {renderWorkoutSettings()}
        
        {/* Premium Subscription Section */}
        <View style={[styles.section, {backgroundColor: theme.cardBackground}]}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>Subscription</Text>
          
          {isPremium ? (
            <>
              <View style={[styles.premiumInfoCard, { backgroundColor: isDark || isSunset ? 'rgba(76, 175, 80, 0.1)' : '#E8F5E9' }]}>
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <View style={styles.premiumInfoContent}>
                  <Text style={[styles.premiumInfoTitle, { color: isDark || isSunset ? '#81C784' : '#4CAF50' }]}>
                    Premium Subscription Active
                  </Text>
                  <Text style={[styles.premiumInfoText, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
                    Thank you for supporting FlexBreak! You have access to all premium features.
                  </Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.settingItem}
                onPress={openSubscriptionManagement}
              >
                <View style={styles.settingContent}>
                  <View style={[styles.iconContainer, {backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD'}]}>
                    <Ionicons name="card-outline" size={22} color="#2196F3" />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={[styles.settingTitle, {color: theme.text}]}>Manage Subscription</Text>
                    <Text style={[styles.settingDescription, {color: theme.textSecondary}]}>
                      Change or cancel your subscription
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={handleOpenSubscription}
            >
              <View style={styles.settingContent}>
                <View style={[styles.iconContainer, {backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD'}]}>
                  <Ionicons name="star" size={22} color="#FFD700" />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.settingTitle, {color: theme.text}]}>Upgrade to Premium</Text>
                  <Text style={[styles.settingDescription, {color: theme.textSecondary}]}>
                    Unlock all premium features
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        
        {/* About Section */}
        <AboutSection
          appVersion={appVersion}
        />
        
        {/* Legal Information Section */}
        <LegalSection />
        
        {/* Developer Section - Only visible in development mode */}
        {__DEV__ && (
          <>
            <DeveloperSection
              onOpenDiagnostics={() => setDiagnosticsModalVisible(true)}
              onOpenBobSimulator={() => setBobSimulatorModalVisible(true)}
              onGrantPremium={handleGrantPremiumStatus}
              onClearPremium={handleClearPremiumStatus}
              onResetSimulationData={handleResetSimulationData}
              onResetAllData={handleResetData}
              isPremium={isPremium}
            />
          </>
        )}
        
        {/* Data management section */}
        <DataManagement onResetAllData={handleResetData} />
        
        {/* Version info at bottom */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, {color: theme.textSecondary}]}>FlexBreak v{appVersion} • © 2025-2026 FlexBreak</Text>
        </View>
      </ScrollView>
      
      {/* Diagnostics Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={diagnosticsModalVisible}
        onRequestClose={() => setDiagnosticsModalVisible(false)}
      >
        <View style={[styles.safeArea, {backgroundColor: theme.background}]}>
          <View style={[styles.header, {borderBottomColor: theme.border, backgroundColor: theme.cardBackground}]}>
            <TouchableOpacity 
              onPress={() => setDiagnosticsModalVisible(false)}
              style={styles.backButton}
              hitSlop={{top: 5, bottom: 0, left: 15, right: 15}}
            >
            </TouchableOpacity>
            <View style={styles.headerRight} />
          </View>
          <DiagnosticsScreen navigation={{ goBack: () => setDiagnosticsModalVisible(false) }} />
        </View>
      </Modal>
      
     
      
      
      {/* Subscription Modal */}
      <SubscriptionModal
        visible={subscriptionModalVisible}
        onClose={() => setSubscriptionModalVisible(false)}
        isFromSettings={true}
      />
      
      {/* Fitness Disclaimer Modal */}
      <FitnessDisclaimer
        visible={fitnessDisclaimerModalVisible}
        onAccept={() => setFitnessDisclaimerModalVisible(false)}
        viewOnly={true}
      />
      
      {/* Non-Medical Notice Modal */}
      <NonMedicalNotice
        isModal={true}
        visible={nonMedicalNoticeModalVisible}
        onAcknowledge={() => setNonMedicalNoticeModalVisible(false)}
      />
      
      {/* Bob Simulator Access Modal */}
      <BobSimulatorAccessModal
        visible={bobSimulatorModalVisible}
        onClose={() => setBobSimulatorModalVisible(false)}
      />
      
      {/* Update Notification Modal */}
      {updateInfo && (
        <UpdateNotificationModal
          visible={showModal}
          onClose={hideModal}
          updateInfo={updateInfo}
        />
      )}
      
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
    padding: 10,
    marginLeft: 4,
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
  comingSoonContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  comingSoonBadge: {
    fontSize: 12,
    color: '#673AB7',
    fontWeight: '600',
    padding: 4,
    paddingHorizontal: 8,
    backgroundColor: '#f3e5f5',
    borderRadius: 12,
    marginBottom: 8,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  footerText: {
    color: '#999',
    fontSize: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  sectionToggle: {
    fontSize: 14,
  },
  testingContainer: {
    padding: 16,
  },
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  simulationButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  bobSimulatorButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  simulationButtonIcon: {
    marginRight: 8,
  },
  simulationButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  simulationDescription: {
    marginBottom: 16,
  },
  lockIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 8,
    padding: 2,
  },
  lockedFeatureText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  themeTipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  themeTip: {
    fontSize: 12,
    marginLeft: 4,
    flex: 1,
  },
  // Privacy Policy styles
  policyTitle: {
    marginBottom: 8,
  },
  policyDate: {
    marginBottom: 24,
  },
  policySection: {
    marginTop: 24,
    marginBottom: 12,
  },
  policyText: {
    lineHeight: 22,
    marginBottom: 12,
  },
  bulletList: {
    marginLeft: 8,
    marginBottom: 16,
  },
  bulletItem: {
    lineHeight: 22,
    marginBottom: 8,
  },
  
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
  },
  modalCloseButton: {
    padding: 10,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  legalModalContainer: {
    flex: 1,
    marginTop: 60,
    marginBottom: 40,
    marginHorizontal: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  legalModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  legalModalCloseButton: {
    padding: 8,
  },
  legalModalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  legalModalContent: {
    flex: 1,
  },
  legalContentWrapper: {
    padding: 20,
  },
  legalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  legalText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  helperDemoCard: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  testingCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  testCardHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  testCardText: {
    fontSize: 14,
    marginBottom: 8,
  },
  testingHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
  },
  testingChecklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  testingChecklistNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  testingChecklistContent: {
    flex: 1,
  },
  testingNumber: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  testingTaskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  testingTaskDesc: {
    fontSize: 14,
  },
  feedbackCard: {
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
  },
  feedbackHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 14,
    marginBottom: 8,
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
  testDescription: {
    marginBottom: 16,
  },
  premiumInfoCard: {
    flexDirection: 'row',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 12,
    alignItems: 'flex-start',
  },
  premiumInfoContent: {
    flex: 1,
    marginLeft: 12,
  },
  premiumInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  premiumInfoText: {
    fontSize: 14,
    marginBottom: 8,
  },
  settingRow: {
    flexDirection: 'column',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  settingLabelContainer: {
    flex: 1,
    marginBottom: 8,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  transitionOptionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    width: '100%',
  },
  transitionOption: {
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 50,
  },
  transitionOptionSelected: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  transitionOptionText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
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

export default SettingsScreen; 
