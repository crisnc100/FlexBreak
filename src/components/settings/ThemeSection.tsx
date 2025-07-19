import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeType, useTheme } from '../../context/ThemeContext';
import { useFeatureAccess } from '../../hooks/progress/useFeatureAccess';
import { useGamification } from '../../hooks/progress/useGamification';
import { usePremium } from '../../context/PremiumContext';
import { ThemedText, ThemedCard } from '../common';

interface ThemeSectionProps {
  onOpenSubscription: () => void;
  badgeCount: number;
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

const ThemeSection: React.FC<ThemeSectionProps> = ({ onOpenSubscription, badgeCount }) => {
  const { theme, themeType, setThemeType, isDark, isSunset, canUseDarkTheme, canUseSunsetTheme } = useTheme();
  const { isPremium } = usePremium();
  const { level } = useGamification();
  const { canAccessFeature, getRequiredLevel, meetsLevelRequirement } = useFeatureAccess();

  const handleThemeTypeSelection = (type: ThemeType) => {
    if (type === 'dark') {
      if (!canUseDarkTheme) {
        if (!isPremium) {
          Alert.alert(
            'Premium Feature',
            'Dark theme requires a premium subscription. Unlock all premium features to access dark theme.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Upgrade', style: 'default', onPress: () => onOpenSubscription() }
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
      
      if (themeType !== 'dark') {
        console.log('Settings screen: Directly setting dark theme');
        setThemeType('dark');
        return;
      }
    } else if (type === 'sunset') {
      if (!canUseSunsetTheme) {
        Alert.alert(
          'Hidden Theme Locked',
          'Continue collecting achievement badges to unlock this special theme.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      if (themeType !== 'sunset') {
        console.log('Settings screen: Toggling to sunset theme');
        setThemeType('sunset');
        return;
      }
    } else if (themeType === 'dark' && type === 'light' || themeType === 'sunset' && type === 'light') {
      console.log('Settings screen: Toggling to light theme');
      setThemeType('light');
      return;
    }
  };

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
          onPress={onOpenSubscription}
        >
          <ThemedText style={styles.premiumUpsellButtonText}>Upgrade to Premium</ThemedText>
        </TouchableOpacity>
      </ThemedCard>
    );
  };

  return (
    <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Appearance</Text>
      
      <View style={styles.settingItem}>
        <View style={styles.settingContent}>
          <View style={[styles.iconContainer, { backgroundColor: isSunset ? '#462639' : (isDark || isSunset ? '#2D2D2D' : '#E3F2FD') }]}>
            <Ionicons 
              name={isSunset ? "partly-sunny" : (isDark || isSunset ? "moon" : "sunny")} 
              size={22} 
              color={isSunset ? "#FF8C5A" : (isDark ? "#BB86FC" : "#FF9800")} 
            />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.settingTitle, { color: theme.text }]}>App Theme</Text>
            <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
              {canAccessFeature('dark_theme') || canUseSunsetTheme
                ? 'Choose how the app looks' 
                : isPremium && !meetsLevelRequirement('dark_theme')
                  ? `Dark mode unlocks at level ${getRequiredLevel('dark_theme')} (Current: ${level})`
                  : 'Premium feature - Dark mode unlocks at level 2'}
            </Text>
          </View>
        </View>
      </View>
      
      {(canAccessFeature('dark_theme') || canUseSunsetTheme) && (
        <View style={styles.themeOptions}>
          <TouchableOpacity
            style={[
              styles.themeOption, 
              themeType === 'light' && styles.themeOptionSelected,
              { backgroundColor: themeType === 'light' ? theme.accent + '20' : theme.backgroundLight }
            ]}
            onPress={() => handleThemeTypeSelection('light')}
          >
            <View style={[styles.themeIconContainer, { backgroundColor: isDark || isSunset ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)' }]}>
              <Ionicons name="sunny" size={22} color="#FF9800" />
            </View>
            <Text style={[styles.themeOptionText, { color: theme.text }]}>Light</Text>
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
                { backgroundColor: themeType === 'dark' ? theme.accent + '20' : theme.backgroundLight }
              ]}
              onPress={() => handleThemeTypeSelection('dark')}
            >
              <View style={[styles.themeIconContainer, { backgroundColor: isDark || isSunset ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.5)' }]}>
                <Ionicons name="moon" size={22} color={isDark || isSunset ? "#BB86FC" : "#673AB7"} />
              </View>
              <Text style={[styles.themeOptionText, { color: theme.text }]}>Dark</Text>
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
                { backgroundColor: themeType === 'sunset' ? '#FF8C5A20' : theme.backgroundLight }
              ]}
              onPress={() => handleThemeTypeSelection('sunset')}
            >
              <View style={[styles.themeIconContainer, { backgroundColor: isSunset ? 'rgba(255, 140, 90, 0.2)' : 'rgba(255, 255, 255, 0.5)' }]}>
                <Ionicons name="partly-sunny" size={22} color="#FF8C5A" />
              </View>
              <Text style={[styles.themeOptionText, { color: theme.text }]}>Sunset</Text>
              {themeType === 'sunset' && (
                <View style={styles.selectedIndicator}>
                  <Ionicons name="checkmark-circle" size={16} color="#FF8C5A" />
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
      
      {!canAccessFeature('dark_theme') && (
        <>
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
  themeOptions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  themeOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  themeOptionSelected: {
    borderColor: '#2196F3',
  },
  themeIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
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
    margin: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(187, 134, 252, 0.1)',
  },
  darkModeLockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  darkModeLockTitle: {
    marginLeft: 12,
    flex: 1,
  },
  lockBadge: {
    backgroundColor: '#BB86FC',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    marginBottom: 8,
  },
  unlockTip: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  premiumUpsellCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD700',
  },
  premiumUpsellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumUpsellTitle: {
    fontSize: 18,
    marginLeft: 8,
  },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  premiumFeatureIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(187, 134, 252, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  premiumLockBadge: {
    marginLeft: 'auto',
    backgroundColor: '#666',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  premiumUpsellDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  premiumUpsellButton: {
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  premiumUpsellButtonText: {
    color: '#000',
    fontWeight: '600',
  },
  comingSoonContainer: {
    margin: 16,
    padding: 16,
    alignItems: 'center',
  },
  comingSoonBadge: {
    backgroundColor: '#4CAF50',
    color: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  sunsetModeLockContainer: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 140, 90, 0.1)',
  },
  sunsetModeLockHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sunsetModeLockTitle: {
    marginLeft: 12,
    flex: 1,
  },
});

export default ThemeSection;