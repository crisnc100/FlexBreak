import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Platform, SafeAreaView, StatusBar, Dimensions, Switch, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clearAllData, clearAllPremiumStatus, saveTransitionDuration, getTransitionDuration, saveIsPremium } from '../services/storageService';
import { resetSimulationData } from '../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';

import DiagnosticsScreen from './DiagnosticsScreen';
import { ThemeType, useTheme } from '../context/ThemeContext';
import { useFeatureAccess } from '../hooks/progress/useFeatureAccess';
import { useGamification } from '../hooks/progress/useGamification';
import { usePremium } from '../context/PremiumContext';
import ThemePreview from '../components/ThemePreview';
import SubscriptionModal from '../components/SubscriptionModal';
import { ThemedText, ThemedCard } from '../components/common';
import { Toast } from 'react-native-toast-notifications';
import FitnessDisclaimer from '../components/notices/FitnessDisclaimer';
import NonMedicalNotice from '../components/notices/NonMedicalNotice';
import { BobSimulatorAccessModal } from '../components/testing';
import * as soundEffects from '../utils/soundEffects';
import * as storageService from '../services/storageService';
import * as achievementService from '../utils/progress/modules/achievementManager';

const { width } = Dimensions.get('window');

interface SettingsScreenProps {
  navigation: {
    goBack: () => void;
    navigate?: (screen: string, params?: any) => void;
  };
  onClose?: () => void;
}

// Simple cross-platform progress bar component
interface ProgressBarProps {
  progress: number;
  color: string;
  style?: any;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress, color, style }) => {
  return (
    <View style={[progressBarStyles.container, style]}>
      <View 
        style={[
          progressBarStyles.progress, 
          { 
            width: `${Math.min(100, Math.max(0, progress * 100))}%`,
            backgroundColor: color
          }
        ]} 
      />
    </View>
  );
};

const progressBarStyles = StyleSheet.create({
  container: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progress: {
    height: '100%',
  },
});

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation, onClose }) => {
  const [diagnosticsModalVisible, setDiagnosticsModalVisible] = useState(false);
  const [privacyPolicyModalVisible, setPrivacyPolicyModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const { theme, themeType, setThemeType, toggleTheme, isDark, isSunset, canUseDarkTheme, canUseSunsetTheme } = useTheme();
  const { isPremium } = usePremium();
  const { isLoading, level } = useGamification();
  const { canAccessFeature, getRequiredLevel, meetsLevelRequirement } = useFeatureAccess();
  const [showTestingSection, setShowTestingSection] = useState(false);
  const [bobSimulatorModalVisible, setBobSimulatorModalVisible] = useState(false);
  const hasSeenDarkModeUnlock = useRef(false);
  const appVersion = "1.0.0";
  const [fitnessDisclaimerModalVisible, setFitnessDisclaimerModalVisible] = useState(false);
  const [nonMedicalNoticeModalVisible, setNonMedicalNoticeModalVisible] = useState(false);
  const [transitionDuration, setTransitionDuration] = useState(5);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [badgeCount, setBadgeCount] = useState(0);
  
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
  
  // Function to send email to support
  const handleContactSupport = () => {
    Linking.openURL('mailto:support@flexbreak.com?subject=FlexBreak%20Support%20Request');
  };

  // Function to open website
  const handleOpenWebsite = () => {
    Linking.openURL('https://ortegafit.com');
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
      'Reset Simulation Data',
      'This will delete all simulation data only, for testers, please use this to reset the simulator data.',
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

  // Handle theme type selection
  const handleThemeTypeSelection = (type: ThemeType) => {
    if (type === 'dark') {
      if (!canUseDarkTheme) {
        // If user doesn't have access to dark theme, show appropriate message
        if (!isPremium) {
          Alert.alert(
            'Premium Feature',
            'Dark theme requires a premium subscription. Unlock all premium features to access dark theme.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Upgrade', style: 'default', onPress: () => handleOpenSubscription() }
            ]
          );
        } else {
          Alert.alert(
            'Dark Theme Locked',
            'Dark theme is unlocked at level 2. Keep stretching to unlock it!',
            [{ text: 'OK' }]
          );
        }
        return;
      }
      
      // For dark theme, directly set to dark theme instead of using toggleTheme
      if (themeType !== 'dark') {
        console.log('Settings screen: Directly setting dark theme');
        setThemeType('dark');
        return;
      }
    } else if (type === 'sunset') {
      if (!canUseSunsetTheme) {
        // For sunset theme, don't tell them exactly how many achievements are needed
        Alert.alert(
          'Hidden Theme Locked',
          'Continue collecting achievement badges to unlock this special theme.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // For sunset theme toggle
      if (themeType !== 'sunset') {
        console.log('Settings screen: Toggling to sunset theme');
        setThemeType('sunset');
        return;
      }
    } else if (themeType === 'dark' && type === 'light' || themeType === 'sunset' && type === 'light') {
      // If switching from dark/sunset to light, also use setThemeType directly
      console.log('Settings screen: Toggling to light theme');
      setThemeType('light');
      return;
    }
  };

  // Function to render the progress to the next level for premium users
  const renderLevelProgress = () => {
    const requiredLevel = getRequiredLevel('dark_theme');
    const progress = level / requiredLevel;
    
    return (
      <View style={styles.levelProgressContainer}>
        <View style={styles.levelProgressTextContainer}>
          <ThemedText style={styles.levelProgressText}>
            Level {level} / {requiredLevel}
          </ThemedText>
          <ThemedText type="accent" bold>
            {Math.round(progress * 100)}%
          </ThemedText>
        </View>
        <ProgressBar
          progress={progress}
          color={theme.accent}
          style={styles.progressBar}
        />
        <ThemedText type="secondary" style={styles.unlockTip}>
          Continue stretching to reach level {requiredLevel} and unlock dark mode
        </ThemedText>
      </View>
    );
  };
  
  // Function to render the premium upsell card
  const renderPremiumUpsell = () => {
    return (
      <ThemedCard style={styles.premiumUpsellCard}>
        <View style={styles.premiumUpsellHeader}>
          <Ionicons name="star" size={22} color="#FFD700" />
          <ThemedText bold style={styles.premiumUpsellTitle}>Premium Feature</ThemedText>
        </View>
        
        <View style={styles.premiumFeatureItem}>
          <View style={styles.premiumFeatureIcon}>
            <Ionicons name="moon" size={18} color="#BB86FC" />
          </View>
          <ThemedText>Dark Mode</ThemedText>
          <View style={styles.premiumLockBadge}>
            <Ionicons name="lock-closed" size={12} color="#FFF" />
          </View>
        </View>
        
        <ThemedText type="secondary" style={styles.premiumUpsellDescription}>
          Upgrade to Premium to unlock Dark Mode (requires Level {getRequiredLevel('dark_theme')})
        </ThemedText>
        
        <TouchableOpacity 
          style={styles.premiumUpsellButton}
          onPress={handleOpenSubscription}
        >
          <ThemedText style={styles.premiumUpsellButtonText}>Upgrade to Premium</ThemedText>
        </TouchableOpacity>
      </ThemedCard>
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
        <View style={[styles.section, {backgroundColor: theme.cardBackground}]}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>Appearance</Text>
          
          {/* Theme selection */}
          <View style={styles.settingItem}>
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, {backgroundColor: isSunset ? '#462639' : (isDark || isSunset ? '#2D2D2D' : '#E3F2FD')}]}>
                <Ionicons 
                  name={isSunset ? "partly-sunny" : (isDark || isSunset ? "moon" : "sunny")} 
                  size={22} 
                  color={isSunset ? "#FF8C5A" : (isDark ? "#BB86FC" : "#FF9800")} 
                />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.settingTitle, {color: theme.text}]}>App Theme</Text>
                <Text style={[styles.settingDescription, {color: theme.textSecondary}]}>
                  {canAccessFeature('dark_theme') || canUseSunsetTheme
                    ? 'Choose how the app looks' 
                    : isPremium && !meetsLevelRequirement('dark_theme')
                      ? `Dark mode unlocks at level ${getRequiredLevel('dark_theme')} (Current: ${level})`
                      : 'Premium feature - Dark mode unlocks at level 2'}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Theme options */}
          {(canAccessFeature('dark_theme') || canUseSunsetTheme) && (
            <View style={styles.themeOptions}>
              <TouchableOpacity
                style={[
                  styles.themeOption, 
                  themeType === 'light' && styles.themeOptionSelected,
                  {backgroundColor: themeType === 'light' ? theme.accent + '20' : theme.backgroundLight}
                ]}
                onPress={() => handleThemeTypeSelection('light')}
              >
                <View style={[styles.themeIconContainer, {backgroundColor: isDark || isSunset ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)'}]}>
                  <Ionicons name="sunny" size={22} color="#FF9800" />
                </View>
                <Text style={[styles.themeOptionText, {color: theme.text}]}>Light</Text>
                {themeType === 'light' && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
                  </View>
                )}
              </TouchableOpacity>
              
              {canAccessFeature('dark_theme') && (
                <TouchableOpacity
                  style={[
                    styles.themeOption, 
                    themeType === 'dark' && styles.themeOptionSelected,
                    {backgroundColor: themeType === 'dark' ? theme.accent + '20' : theme.backgroundLight}
                  ]}
                  onPress={() => handleThemeTypeSelection('dark')}
                >
                  <View style={[styles.themeIconContainer, {backgroundColor: isDark || isSunset ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)'}]}>
                    <Ionicons name="moon" size={22} color={isDark || isSunset ? "#BB86FC" : "#673AB7"} />
                  </View>
                  <Text style={[styles.themeOptionText, {color: theme.text}]}>Dark</Text>
                  {themeType === 'dark' && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              
              {canUseSunsetTheme && (
                <TouchableOpacity
                  style={[
                    styles.themeOption, 
                    themeType === 'sunset' && styles.themeOptionSelected,
                    {backgroundColor: themeType === 'sunset' ? '#FF8C5A20' : theme.backgroundLight}
                  ]}
                  onPress={() => handleThemeTypeSelection('sunset')}
                >
                  <View style={[styles.themeIconContainer, {backgroundColor: isSunset ? 'rgba(255, 140, 90, 0.2)' : 'rgba(255, 255, 255, 0.5)'}]}>
                    <Ionicons name="partly-sunny" size={22} color="#FF8C5A" />
                  </View>
                  <Text style={[styles.themeOptionText, {color: theme.text}]}>Sunset</Text>
                  {themeType === 'sunset' && (
                    <View style={styles.selectedIndicator}>
                      <Ionicons name="checkmark-circle" size={16} color="#FF8C5A" />
                    </View>
                  )}
                </TouchableOpacity>
              )}
              
             
            </View>
          )}
          
          {/* Enhanced Premium/Level lock for dark theme */}
          {!canAccessFeature('dark_theme') && (
            <>
              {/* Show different UI based on premium status */}
              {!isPremium ? (
                renderPremiumUpsell()
              ) : !meetsLevelRequirement('dark_theme') ? (
                <>
                  <View style={styles.darkModeLockContainer}>
                    <View style={styles.darkModeLockHeaderRow}>
                      <Ionicons name="moon" size={24} color="#BB86FC" />
                      <ThemedText bold size={16} style={styles.darkModeLockTitle}>
                        Dark Mode
                      </ThemedText>
                      <View style={styles.lockBadge}>
                        <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
                      </View>
                    </View>
                    {renderLevelProgress()}
                  </View>
                </>
              ) : (
                <View style={styles.comingSoonContainer}>
                  <Text style={styles.comingSoonBadge}>Coming Soon</Text>
                  <ThemedText type="secondary">
                    Dark mode is coming soon to your account
                  </ThemedText>
                </View>
              )}
            </>
          )}
          
          {/* Sunset theme lock info - only shown if user has some badges but can't access the theme yet */}
          {!canUseSunsetTheme && badgeCount > 0 && (
            <View style={styles.sunsetModeLockContainer}>
              <View style={styles.sunsetModeLockHeaderRow}>
                <Ionicons name="partly-sunny" size={24} color="#FF8C5A" />
                <ThemedText bold size={16} style={styles.sunsetModeLockTitle}>
                  Hidden Theme
                </ThemedText>
                <View style={[styles.lockBadge, { backgroundColor: '#FF8C5A' }]}>
                  <Ionicons name="trophy" size={16} color="#FFFFFF" />
                </View>
              </View>
              <ThemedText type="secondary" style={styles.unlockTip}>
                Continue collecting achievements to unlock a special theme
              </ThemedText>
            </View>
          )}
        </View>
        
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
        <View style={[styles.section, {backgroundColor: theme.cardBackground}]}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>About</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, {backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD'}]}>
                <Ionicons name="information-circle-outline" size={22} color="#2196F3" />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.settingTitle, {color: theme.text}]}>App Version</Text>
                <Text style={[styles.settingDescription, {color: theme.textSecondary}]}>{appVersion}</Text>
              </View>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => Linking.openURL('https://flexbreak-privacy-app.netlify.app/')}
          >
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, {backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD'}]}>
                <Ionicons name="document-text-outline" size={22} color="#2196F3" />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.settingTitle, {color: theme.text}]}>Privacy Policy</Text>
                <Text style={[styles.settingDescription, {color: theme.textSecondary}]}>View our privacy policy website</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={() => setHelpModalVisible(true)}  
          >
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, {backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD'}]}>
                <Ionicons name="help-circle-outline" size={22} color="#2196F3" />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.settingTitle, {color: theme.text}]}>Help & Support</Text>
                <Text style={[styles.settingDescription, {color: theme.textSecondary}]}>Get support and assistance</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.settingItem}
            onPress={handleOpenWebsite}
          >
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, {backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD'}]}>
                <Ionicons name="globe-outline" size={22} color="#2196F3" />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.settingTitle, {color: theme.text}]}>Website</Text>
                <Text style={[styles.settingDescription, {color: theme.textSecondary}]}>Visit our website</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.settingItem, styles.lastItem]}
            onPress={handleContactSupport}
          >
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, {backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD'}]}>
                <Ionicons name="mail-outline" size={22} color="#2196F3" />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.settingTitle, {color: theme.text}]}>Contact Us</Text>
                <Text style={[styles.settingDescription, {color: theme.textSecondary}]}>Send us an email</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        
        {/* Legal Information Section */}
        <View style={[styles.section, {backgroundColor: theme.cardBackground}]}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>Legal Information</Text>
          
          {/* Fitness Disclaimer */}
          <TouchableOpacity 
            style={styles.settingItem} 
            onPress={() => setFitnessDisclaimerModalVisible(true)}
          >
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, {backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD'}]}>
                <Ionicons name="fitness-outline" size={22} color={theme.accent} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.settingTitle, {color: theme.text}]}>Fitness Disclaimer</Text>
                <Text style={[styles.settingDescription, {color: theme.textSecondary}]}>
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
              <View style={[styles.iconContainer, {backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD'}]}>
                <Ionicons name="information-circle-outline" size={22} color={theme.accent} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.settingTitle, {color: theme.text}]}>Non-Medical Notice</Text>
                <Text style={[styles.settingDescription, {color: theme.textSecondary}]}>
                  Information regarding wellness content
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        
        {/* Developer Section - Only visible in development mode */}
        {__DEV__ && (
          <View style={[styles.section, {backgroundColor: theme.cardBackground}]}>
            <Text style={[styles.sectionTitle, {color: theme.text}]}>Developer</Text>
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => setDiagnosticsModalVisible(true)}
            >
              <View style={styles.settingContent}>
                <View style={[styles.iconContainer, {backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD'}]}>
                  <Ionicons name="analytics-outline" size={22} color={theme.accent} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.settingTitle, {color: theme.text}]}>Diagnostics</Text>
                  <Text style={[styles.settingDescription, {color: theme.textSecondary}]}>Storage and performance monitoring</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            
          </View>
        )}
        
        {/* Add testing section at the end of the ScrollView */}
        <View style={[styles.section, {backgroundColor: theme.cardBackground}]}>
          <TouchableOpacity 
            style={styles.sectionHeader}
            onPress={() => setShowTestingSection(!showTestingSection)}
          >
            <Text style={[styles.sectionTitle, {color: theme.text}]}>Testing & Development</Text>
            <Text style={[styles.sectionToggle, {color: theme.textSecondary}]}>{showTestingSection ? '▼' : '►'}</Text>
          </TouchableOpacity>
          
          {showTestingSection && (
            <View style={styles.testingContainer}>
              <Text style={[styles.sectionDescription, {color: theme.textSecondary}]}>
                Use these tools to test app features and provide feedback to our development team.
              </Text>
              
              <TouchableOpacity 
                style={[
                  styles.testingButton,
                  {backgroundColor: '#4A90E2', marginTop: 16}
                ]}
                onPress={() => setBobSimulatorModalVisible(true)}
              >
                <Ionicons name="flask-outline" size={20} color="#FFF" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Access Bob Simulator</Text>
              </TouchableOpacity>
              
              <Text style={[styles.testDescription, {color: theme.textSecondary}]}>
                Simulate user progress and test features with the Bob Simulator tool.
              </Text>
              
              {/* Premium Status Management */}
              <View style={[styles.premiumStatusContainer, {marginTop: 16, marginBottom: 8}]}>
                <Text style={[styles.settingTitle, {color: theme.text, marginBottom: 8}]}>Premium Status Management</Text>
                <Text style={[styles.settingDescription, {color: theme.textSecondary, marginBottom: 12}]}>
                  Control premium status for testing subscription features
                </Text>
                
                <View style={styles.premiumButtonsRow}>
                  {/* Grant Premium Status */}
                  <TouchableOpacity 
                    style={[
                      styles.premiumButton,
                      {backgroundColor: isDark || isSunset ? '#3D5A3D' : '#E8F5E9'},
                      isPremium && {opacity: 0.5}
                    ]}
                    onPress={handleGrantPremiumStatus}
                    disabled={isPremium}
                  >
                    <Ionicons name="star" size={18} color={isDark || isSunset ? '#81C784' : '#4CAF50'} style={styles.premiumButtonIcon} />
                    <Text style={[styles.premiumButtonText, {color: isDark || isSunset ? '#81C784' : '#4CAF50'}]}>
                      Grant Premium
                    </Text>
                  </TouchableOpacity>
                  
                  {/* Clear Premium Status */}
                  <TouchableOpacity 
                    style={[
                      styles.premiumButton,
                      {backgroundColor: isDark || isSunset ? '#5D3A3A' : '#FFEBEE'},
                      !isPremium && {opacity: 0.5}
                    ]}
                    onPress={handleClearPremiumStatus}
                    disabled={!isPremium}
                  >
                    <Ionicons name="close-circle" size={18} color={isDark || isSunset ? '#EF9A9A' : '#F44336'} style={styles.premiumButtonIcon} />
                    <Text style={[styles.premiumButtonText, {color: isDark || isSunset ? '#EF9A9A' : '#F44336'}]}>
                      Clear Premium
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <TouchableOpacity 
                style={[styles.settingItem, styles.lastItem]}
                onPress={handleResetSimulationData}
              >
                <View style={styles.settingContent}>
                  <View style={[styles.iconContainer, {backgroundColor: isDark || isSunset ? '#3B2E2E' : '#FFEBEE'}]}>
                    <Ionicons name="trash-outline" size={22} color="#F44336" />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={[styles.settingTitle, {color: theme.text}]}>Reset Simulation Data</Text>
                    <Text style={[styles.settingDescription, {color: theme.textSecondary}]}>Delete all simulation data only (for testers)</Text>
                  </View>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.settingItem}
                onPress={handleResetData}
              >
                <View style={styles.settingContent}>
                  <View style={[styles.iconContainer, {backgroundColor: isDark || isSunset ? '#3B2E2E' : '#FFEBEE'}]}>
                    <Ionicons name="trash-outline" size={22} color="#F44336" />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={[styles.settingTitle, {color: theme.text}]}>Reset All Data</Text>
                    <Text style={[styles.settingDescription, {color: theme.textSecondary}]}>Delete all app data and start fresh</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}
        </View>
        
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
      
      {/* Privacy Policy Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={privacyPolicyModalVisible}
        onRequestClose={() => setPrivacyPolicyModalVisible(false)}
      >
        <SafeAreaView style={[styles.safeArea, {backgroundColor: theme.background}]}>
          <View style={[styles.modalHeader, {borderBottomColor: theme.border, backgroundColor: theme.cardBackground}]}>
            <TouchableOpacity 
              onPress={() => setPrivacyPolicyModalVisible(false)}
              style={styles.modalCloseButton}
              hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, {color: theme.text}]}>Privacy Policy</Text>
            <View style={styles.headerRight} />
          </View>
          
          <ScrollView style={[styles.container, {padding: 16}]}>
            <ThemedText style={styles.policyTitle} bold size={22}>
              FlexBreak Privacy Policy
            </ThemedText>
            <ThemedText style={styles.policyDate} type="secondary">
              Last Updated: April 14, 2025
            </ThemedText>
            
            <ThemedText style={styles.policySection} bold size={18}>
              1. Introduction
            </ThemedText>
            <ThemedText style={styles.policyText}>
              FlexBreak is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and share your personal information when you use our application.
            </ThemedText>
            
            <ThemedText style={styles.policySection} bold size={18}>
              2. Information We Collect
            </ThemedText>
            <ThemedText style={styles.policyText}>
              We collect information that you provide directly to us, such as when you create an account, subscribe to our service, or contact us for support. This may include your name, email address, and payment information.
            </ThemedText>
            <ThemedText style={styles.policyText}>
              We also automatically collect certain information when you use our app, including:
            </ThemedText>
            <View style={styles.bulletList}>
              <ThemedText style={styles.bulletItem}>• Device information (model, operating system)</ThemedText>
              <ThemedText style={styles.bulletItem}>• Usage statistics and exercise data</ThemedText>
              <ThemedText style={styles.bulletItem}>• Performance and error data</ThemedText>
            </View>
            
            <ThemedText style={styles.policySection} bold size={18}>
              3. How We Use Your Information
            </ThemedText>
            <ThemedText style={styles.policyText}>
              We use the information we collect to:
            </ThemedText>
            <View style={styles.bulletList}>
              <ThemedText style={styles.bulletItem}>• Provide and maintain our services</ThemedText>
              <ThemedText style={styles.bulletItem}>• Process transactions and send related information</ThemedText>
              <ThemedText style={styles.bulletItem}>• Send you technical notices and support messages</ThemedText>
              <ThemedText style={styles.bulletItem}>• Improve and personalize your experience</ThemedText>
            </View>
            
            <ThemedText style={styles.policySection} bold size={18}>
              4. Data Storage and Security
            </ThemedText>
            <ThemedText style={styles.policyText}>
              We take the security of your data seriously and implement appropriate measures to protect your information. Your personal data is stored securely and is only accessible to authorized personnel.
            </ThemedText>
            
            <ThemedText style={styles.policySection} bold size={18}>
              5. Your Rights
            </ThemedText>
            <ThemedText style={styles.policyText}>
              You have the right to access, correct, or delete your personal information. You can manage your account settings within the app or contact us directly for assistance.
            </ThemedText>
            
            <ThemedText style={styles.policySection} bold size={18}>
              6. Changes to This Policy
            </ThemedText>
            <ThemedText style={styles.policyText}>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy in the app and updating the "Last Updated" date.
            </ThemedText>
            
            <ThemedText style={styles.policySection} bold size={18}>
              7. Contact Us
            </ThemedText>
            <ThemedText style={styles.policyText}>
              If you have any questions about this Privacy Policy, please contact us at:
            </ThemedText>
            <ThemedText style={[styles.policyText, {marginBottom: 30}]}>
              privacy@flexbreak.com
            </ThemedText>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Help Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={helpModalVisible}
        onRequestClose={() => setHelpModalVisible(false)}
      >
        <SafeAreaView style={[styles.safeArea, {backgroundColor: theme.background}]}>
          <View style={[styles.modalHeader, {borderBottomColor: theme.border, backgroundColor: theme.cardBackground}]}>
            <TouchableOpacity 
              onPress={() => setHelpModalVisible(false)}
              style={styles.modalCloseButton}
              hitSlop={{top: 15, bottom: 15, left: 15, right: 15}}
            >
              <Ionicons name="arrow-back" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, {color: theme.text}]}>Help & Support</Text>
            <View style={styles.headerRight} />
          </View>
          
          <ScrollView style={[styles.container, {padding: 16}]}>
            <ThemedText style={styles.helpTitle} bold size={20}>
              Frequently Asked Questions
            </ThemedText>
            
            <ThemedText style={styles.helpQuestion} bold>
              How do I start a stretching routine?
            </ThemedText>
            <ThemedText style={styles.helpAnswer}>
              From the home screen, tap on "Start Stretching" or select a specific routine from the routines tab. Follow the on-screen instructions for each stretch.
            </ThemedText>
            
            <ThemedText style={styles.helpQuestion} bold>
              Can I create custom routines?
            </ThemedText>
            <ThemedText style={styles.helpAnswer}>
              Yes! Go to the Routines tab and tap "Create New" to build your own custom routine with stretches of your choice.
            </ThemedText>
            
            <ThemedText style={styles.helpQuestion} bold>
              How do I track my progress?
            </ThemedText>
            <ThemedText style={styles.helpAnswer}>
              Your progress is automatically tracked in the Stats tab. You can view your daily and weekly stretching minutes, completed routines, and streaks.
            </ThemedText>
            
            <ThemedText style={styles.helpQuestion} bold>
              What is the Premium subscription?
            </ThemedText>
            <ThemedText style={styles.helpAnswer}>
              Premium gives you access to all stretching routines, removes ads, enables dark mode (at level 2), and unlocks custom routine creation. Subscribe in the app settings.
            </ThemedText>
            
            <ThemedText style={styles.helpQuestion} bold>
              How do I set up stretch reminders?
            </ThemedText>
            <ThemedText style={styles.helpAnswer}>
              Go to the Reminders tab and tap "Add Reminder". Choose your preferred time and frequency, and ensure notifications are enabled for the app in your device settings.
            </ThemedText>
            
            <View style={styles.helpDivider} />
            
            <ThemedText style={styles.helpTitle} bold size={20}>
              Contact Support
            </ThemedText>
            <ThemedText style={styles.helpContactText}>
              Need additional help? Our support team is ready to assist you:
            </ThemedText>
            
            <TouchableOpacity 
              style={[styles.helpContactButton, {backgroundColor: theme.accent}]}
              onPress={handleContactSupport}
            >
              <Ionicons name="mail-outline" size={20} color="#FFF" style={{marginRight: 8}} />
              <Text style={styles.helpContactButtonText}>Email Support</Text>
            </TouchableOpacity>
            
            <ThemedText style={styles.helpResponseTime} type="secondary">
              We typically respond within 24 hours on business days.
            </ThemedText>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      
      {/* Subscription Modal */}
      <SubscriptionModal
        visible={subscriptionModalVisible}
        onClose={() => setSubscriptionModalVisible(false)}
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
  themeOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 0,
  },
  themeOption: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'column',
    alignItems: 'center',
    width: '30%',
    position: 'relative',
  },
  themeOptionSelected: {
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  themeIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  darkModeLockContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(187, 134, 252, 0.05)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#BB86FC',
  },
  darkModeLockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  darkModeLockTitle: {
    marginLeft: 8,
    flex: 1,
  },
  lockBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelProgressContainer: {
    marginTop: 8,
  },
  levelProgressTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  levelProgressText: {
    fontSize: 14,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 12,
  },
  unlockTip: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  premiumUpsellCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
  },
  premiumUpsellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumUpsellTitle: {
    fontSize: 18,
    marginLeft: 8,
    color: '#FFD700',
  },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(187, 134, 252, 0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  premiumFeatureIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(187, 134, 252, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  premiumLockBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  premiumUpsellDescription: {
    marginBottom: 16,
    fontSize: 14,
  },
  premiumUpsellButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  premiumUpsellButtonText: {
    color: 'white',
    fontWeight: 'bold',
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
  
  // Help screen styles
  helpTitle: {
    marginBottom: 20,
  },
  helpQuestion: {
    marginBottom: 8,
  },
  helpAnswer: {
    lineHeight: 22,
    marginBottom: 24,
  },
  helpDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 24,
  },
  helpContactText: {
    marginBottom: 16,
  },
  helpContactButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
  },
  helpContactButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  helpResponseTime: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
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
  sunsetModeLockContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: 'rgba(255, 140, 90, 0.05)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF8C5A',
  },
  sunsetModeLockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sunsetModeLockTitle: {
    marginLeft: 8,
    flex: 1,
    color: '#FF8C5A',
  },
});

export default SettingsScreen; 