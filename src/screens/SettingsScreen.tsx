import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, Platform, SafeAreaView, StatusBar, Dimensions, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { clearAllData } from '../services/storageService';
import DiagnosticsScreen from './DiagnosticsScreen';
import { useTheme } from '../context/ThemeContext';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useGamification } from '../hooks/useGamification';
import { usePremium } from '../context/PremiumContext';
import ThemePreview from '../components/ThemePreview';
import SubscriptionModal from '../components/SubscriptionModal';
import { ThemedText, ThemedCard } from '../components/common';

const { width } = Dimensions.get('window');

interface SettingsScreenProps {
  navigation: { goBack: () => void };
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
  const [themePreviewModalVisible, setThemePreviewModalVisible] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const { theme, themeType, setThemeType, isDark, canUseDarkTheme } = useTheme();
  const { isPremium } = usePremium();
  const { isLoading, level } = useGamification();
  const { canAccessFeature, getRequiredLevel, meetsLevelRequirement } = useFeatureAccess();
  
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

  
  // Handle theme type selection
  const handleThemeTypeSelection = (type: 'light' | 'dark' | 'system') => {
    if (type === 'dark' && !canAccessFeature('dark_theme')) {
      Alert.alert(
        'Premium Feature',
        `Dark Theme is a premium feature that unlocks at level ${getRequiredLevel('dark_theme')}. Upgrade to premium and reach the required level to enable this feature.`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    setThemeType(type);
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
  
  return (
    <SafeAreaView style={[styles.safeArea, {backgroundColor: theme.background}]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={theme.background} />
      
      {/* Header */}
      <View style={[styles.header, {borderBottomColor: theme.border, backgroundColor: theme.cardBackground}]}>
        <TouchableOpacity 
          onPress={handleGoBack}
          style={styles.backButton}
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
              <View style={[styles.iconContainer, {backgroundColor: isDark ? '#2D2D2D' : '#E3F2FD'}]}>
                <Ionicons 
                  name={isDark ? "moon" : "sunny"} 
                  size={22} 
                  color={isDark ? "#BB86FC" : "#FF9800"} 
                />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.settingTitle, {color: theme.text}]}>App Theme</Text>
                <Text style={[styles.settingDescription, {color: theme.textSecondary}]}>
                  {canAccessFeature('dark_theme') 
                    ? 'Choose how the app looks' 
                    : isPremium && !meetsLevelRequirement('dark_theme')
                      ? `Dark mode unlocks at level ${getRequiredLevel('dark_theme')} (Current: ${level})`
                      : 'Premium feature - Dark mode unlocks at level 2'}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Theme options */}
          {canAccessFeature('dark_theme') && (
            <View style={styles.themeOptions}>
              <TouchableOpacity 
                style={[
                  styles.themeOption, 
                  themeType === 'light' && styles.themeOptionSelected,
                  {backgroundColor: themeType === 'light' ? theme.accent + '20' : theme.backgroundLight}
                ]}
                onPress={() => handleThemeTypeSelection('light')}
              >
                <View style={[styles.themeIconContainer, {backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)'}]}>
                  <Ionicons name="sunny" size={22} color="#FF9800" />
                </View>
                <Text style={[styles.themeOptionText, {color: theme.text}]}>Light</Text>
                {themeType === 'light' && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.themeOption, 
                  themeType === 'dark' && styles.themeOptionSelected,
                  {backgroundColor: themeType === 'dark' ? theme.accent + '20' : theme.backgroundLight}
                ]}
                onPress={() => handleThemeTypeSelection('dark')}
              >
                <View style={[styles.themeIconContainer, {backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)'}]}>
                  <Ionicons name="moon" size={22} color="#BB86FC" />
                </View>
                <Text style={[styles.themeOptionText, {color: theme.text}]}>Dark</Text>
                {themeType === 'dark' && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.themeOption, 
                  themeType === 'system' && styles.themeOptionSelected,
                  {backgroundColor: themeType === 'system' ? theme.accent + '20' : theme.backgroundLight}
                ]}
                onPress={() => handleThemeTypeSelection('system')}
              >
                <View style={[styles.themeIconContainer, {backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)'}]}>
                  <Ionicons name="phone-portrait" size={22} color="#64B5F6" />
                </View>
                <Text style={[styles.themeOptionText, {color: theme.text}]}>System</Text>
                {themeType === 'system' && (
                  <View style={styles.selectedIndicator}>
                    <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
                  </View>
                )}
              </TouchableOpacity>
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
        </View>
        
        {/* About Section */}
        <View style={[styles.section, {backgroundColor: theme.cardBackground}]}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>About</Text>
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, {backgroundColor: isDark ? '#2D2D2D' : '#E3F2FD'}]}>
                <Ionicons name="information-circle-outline" size={22} color="#2196F3" />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.settingTitle, {color: theme.text}]}>App Version</Text>
                <Text style={[styles.settingDescription, {color: theme.textSecondary}]}>1.0.0</Text>
              </View>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, {backgroundColor: isDark ? '#2D2D2D' : '#E3F2FD'}]}>
                <Ionicons name="document-text-outline" size={22} color="#2196F3" />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.settingTitle, {color: theme.text}]}>Privacy Policy</Text>
                <Text style={[styles.settingDescription, {color: theme.textSecondary}]}>View our privacy policy</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingContent}>
              <View style={[styles.iconContainer, {backgroundColor: isDark ? '#2D2D2D' : '#E3F2FD'}]}>
                <Ionicons name="help-circle-outline" size={22} color="#2196F3" />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.settingTitle, {color: theme.text}]}>Help</Text>
                <Text style={[styles.settingDescription, {color: theme.textSecondary}]}>Get support and assistance</Text>
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
                <View style={[styles.iconContainer, {backgroundColor: isDark ? '#2D2D2D' : '#E3F2FD'}]}>
                  <Ionicons name="analytics-outline" size={22} color={theme.accent} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.settingTitle, {color: theme.text}]}>Diagnostics</Text>
                  <Text style={[styles.settingDescription, {color: theme.textSecondary}]}>Storage and performance monitoring</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            
            {/* Theme Preview */}
            <TouchableOpacity 
              style={styles.settingItem}
              onPress={() => setThemePreviewModalVisible(true)}
            >
              <View style={styles.settingContent}>
                <View style={[styles.iconContainer, {backgroundColor: isDark ? '#2D2D2D' : '#E3F2FD'}]}>
                  <Ionicons name="color-palette-outline" size={22} color={theme.accent} />
                </View>
                <View style={styles.textContainer}>
                  <Text style={[styles.settingTitle, {color: theme.text}]}>Theme Preview</Text>
                  <Text style={[styles.settingDescription, {color: theme.textSecondary}]}>Test and preview theme components</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.settingItem, styles.lastItem]}
              onPress={handleResetData}
            >
              <View style={styles.settingContent}>
                <View style={[styles.iconContainer, {backgroundColor: isDark ? '#3B2E2E' : '#FFEBEE'}]}>
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
        
        {/* Version info at bottom */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, {color: theme.textSecondary}]}>Made with ♥ by Your App Team</Text>
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
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, {color: theme.text}]}>Diagnostics</Text>
            <View style={styles.headerRight} />
          </View>
          <DiagnosticsScreen navigation={{ goBack: () => setDiagnosticsModalVisible(false) }} />
        </View>
      </Modal>
      
      {/* Theme Preview Modal */}
      <Modal
        animationType="slide"
        transparent={false}
        visible={themePreviewModalVisible}
        onRequestClose={() => setThemePreviewModalVisible(false)}
      >
        <View style={[styles.safeArea, {backgroundColor: theme.background}]}>
          <View style={[styles.header, {borderBottomColor: theme.border, backgroundColor: theme.cardBackground}]}>
            <TouchableOpacity 
              onPress={() => setThemePreviewModalVisible(false)}
              style={styles.backButton}
            >
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, {color: theme.text}]}>Theme Preview</Text>
            <View style={styles.headerRight} />
          </View>
          
          <ThemePreview />
        </View>
      </Modal>
      
      {/* Subscription Modal */}
      <SubscriptionModal
        visible={subscriptionModalVisible}
        onClose={() => setSubscriptionModalVisible(false)}
        onSubscribe={handleSubscriptionComplete}
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
    paddingHorizontal: 12,
    paddingBottom: 12,
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
});

export default SettingsScreen; 