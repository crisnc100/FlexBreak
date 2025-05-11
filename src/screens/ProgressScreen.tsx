import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  ActivityIndicator
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { usePremium } from '../context/PremiumContext';
import { useTheme } from '../context/ThemeContext';
import { getMostActiveDay, getOrderedDayNames } from '../utils/progress/modules/progressTracker';
import * as storageService from '../services/storageService';
import { useProgressTabManagement } from '../hooks/progress/useProgressTabManagement';
import { useProgressData } from '../hooks/progress/useProgressData';
import { useFeatureAccess } from '../hooks/progress/useFeatureAccess';
import { useGamification } from '../hooks/progress/useGamification';
import XpNotificationManager from '../components/notifications/XpNotificationManager';
import { RefreshableScrollView } from '../components/common';
import SubscriptionModal from '../components/SubscriptionModal';
import {
  TabNavigation,
  ProgressFooter,
  PremiumLock,
  EmptyState,
  StatsTab,
  AchievementsTab,
  ChallengesTab,
  RewardsTab
} from '../components/progress';
import * as streakFreezeManager from '../utils/progress/modules/streakFreezeManager';
import * as streakManager from '../utils/progress/modules/streakManager';

// Day names for labels
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/**
 * Progress Screen - Shows statistics, achievements, challenges, and rewards
 */
export default function ProgressScreen({ navigation }) {
  const { isPremium } = usePremium();
  const { theme, isDark } = useTheme();
  const { canAccessFeature } = useFeatureAccess();
  
  // State for subscription modal
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  
  // Use custom tab management hook
  const { activeTab, fadeAnim, handleTabChange } = useProgressTabManagement();
  
  // Use progress data hook for stats
  const { 
    stats, 
    progressData, 
    allProgressData, 
    hasHiddenRoutinesOnly,
    isLoading,
    isRefreshing,
    handleRefresh,
    userProgress,
    freezeCount 
  } = useProgressData();
  
  // Use the centralized gamification hook for everything
  const { 
    refreshData, 
    isLoading: isGamificationLoading,
    gamificationSummary,
    level,
    totalXP
  } = useGamification();
  
  // Has updated flag to avoid infinite loops
  const hasUpdated = useRef(false);

  // Use streak checker hook (already updated to use centralized system)
  
  // Memoize derived data
  const orderedDayNames = useMemo(() => getOrderedDayNames(DAY_NAMES), []);
  const mostActiveDay = useMemo(() => 
    getMostActiveDay(stats.dayOfWeekBreakdown, DAY_NAMES), 
    [stats.dayOfWeekBreakdown]
  );
  
  // Handle upgrade to premium
  const handleUpgradeToPremium = useCallback(() => {
    setSubscriptionModalVisible(true);
  }, []);
  
  // Handle XP Boost activation
  const handleActivateXpBoost = useCallback(() => {
    // No need for an alert, the XpBoostCard component now shows an animation
    // and handles the activation UI/UX directly
    
    // Just refresh gamification data after boost activation
    refreshData();
  }, [refreshData]);
  
  // Reset user progress (DEV only)
  const handleResetProgress = useCallback(async () => {
    if (__DEV__) {
      Alert.alert(
        'Reset Progress',
        'Are you sure you want to reset all progress data? This cannot be undone.',
        [
          {
            text: 'Cancel',
            style: 'cancel'
          },
          {
            text: 'Reset',
            style: 'destructive',
            onPress: async () => {
              try {
                await storageService.resetUserProgress();
                Alert.alert('Success', 'Progress data has been reset. Please restart the app.');
              } catch (error) {
                console.error('Error resetting progress:', error);
                Alert.alert('Error', 'Failed to reset progress data.');
              }
            }
          }
        ]
      );
    }
  }, []);
  
  // Handle subscription completion
  const handleSubscriptionComplete = useCallback(() => {
    setSubscriptionModalVisible(false);
    // Refresh data after subscription completes
    handleRefresh();
  }, [handleRefresh]);
  
  // Force data refresh on mount - simplified to reduce duplicate refreshes
  useFocusEffect(
    React.useCallback(() => {
      const loadData = async () => {
        try {
          console.log('ProgressScreen: Screen focused, refreshing all data');
          
          // Update hasUpdated ref before the refresh to prevent multiple refreshes
          hasUpdated.current = true;
          
          // Refresh all data - this will update both progress stats and gamification data
          await handleRefresh();
          
          // Check streak freeze status
          await checkStreakFreezeStatus();
          
          console.log('ProgressScreen: Data refresh completed');
        } catch (error) {
          console.error('Error loading data in ProgressScreen:', error);
        }
      };
      
      // Always refresh data when screen comes into focus
      loadData();
      
      return () => {
        console.log('Progress screen lost focus');
      };
    }, [handleRefresh])
  );
  
  // Add state for streak freeze activity
  const [streakFreezeActive, setStreakFreezeActive] = useState(false);

  // Cache the results of checkStreakFreezeStatus to prevent repeated calls
  const [streakFreezeStatus, setStreakFreezeStatus] = useState({
    streakBroken: false,
    canSaveYesterdayStreak: false,
    freezesAvailable: 0
  });
  
  // Keep track of the last check time to throttle checks
  const lastCheckRef = useRef(0);
  
  // Check streak and streak freeze status with throttling
  const checkStreakFreezeStatus = useCallback(async () => {
    try {
      const now = Date.now();
      // Only check if 300ms have passed since last check
      if (now - lastCheckRef.current < 300) {
        console.log('Throttling streak freeze status check');
        return;
      }
      
      lastCheckRef.current = now;
      
      console.log('Checking streak freeze status...');
      const status = await streakManager.checkStreakStatus();
      console.log('Streak freeze card - status check:', status);
      
      setStreakFreezeStatus(status);
      
      // Check if a streak freeze is active for today
      const wasFreezedUsed = await streakFreezeManager.wasStreakFreezeUsedForCurrentDay();
      setStreakFreezeActive(wasFreezedUsed);
      console.log('Streak freeze active:', wasFreezedUsed);
      
      // Start button animation if applicable
      if (status.canSaveYesterdayStreak) {
        console.log('Streak can be saved, starting button animation');
      }
    } catch (error) {
      console.error('Error checking streak freeze status:', error);
    }
  }, []);
  
  // Listen for streak events from StreakFreezePrompt
  useEffect(() => {
    // Function to handle streak saved event
    const handleStreakSaved = async (data: any) => {
      console.log('ProgressScreen: Streak saved event received:', data);
      
      // Wait a moment to allow server-side updates to complete
      setTimeout(async () => {
        // Force a refresh of all data
        await handleRefresh();
        
        // Update streak freeze status
        await checkStreakFreezeStatus();
        
        // Update streakFreezeActive state
        setStreakFreezeActive(true);
      }, 300);
    };
    
    // Function to handle streak broken event
    const handleStreakBroken = async (data: any) => {
      console.log('ProgressScreen: Streak broken event received:', data);
      
      // Wait a moment to allow server-side updates to complete
      setTimeout(async () => {
        // Force a refresh of all data
        await handleRefresh();
        
        // Update streak freeze status
        await checkStreakFreezeStatus();
      }, 300);
    };
    
    // Subscribe to events
    streakManager.streakEvents.on(streakManager.STREAK_SAVED_EVENT, handleStreakSaved);
    streakManager.streakEvents.on(streakManager.STREAK_BROKEN_EVENT, handleStreakBroken);
    
    // Clean up listeners on unmount
    return () => {
      streakManager.streakEvents.off(streakManager.STREAK_SAVED_EVENT, handleStreakSaved);
      streakManager.streakEvents.off(streakManager.STREAK_BROKEN_EVENT, handleStreakBroken);
    };
  }, [handleRefresh, checkStreakFreezeStatus]);
  
  // Check streak status with less frequency
  useEffect(() => {
    if (!isLoading && userProgress) {
      checkStreakFreezeStatus();
    }
  }, [isLoading, userProgress, checkStreakFreezeStatus]);
  
  // Render actual content based on conditions
  const renderContent = () => {
    // Only show empty state if there's truly no data (not even hidden routines)
    if (progressData.length === 0 && !hasHiddenRoutinesOnly) {
      // Show premium lock for non-premium users instead of empty state
      if (!isPremium) {
        return (
          <PremiumLock
            onOpenSubscription={handleUpgradeToPremium}
            subscriptionModalVisible={subscriptionModalVisible}
            onCloseSubscription={() => setSubscriptionModalVisible(false)}
            totalXP={totalXP || 0}
            level={level || 1}
          />
        );
      }
          
      // Show empty state only for premium users with no routines
      return (
        <EmptyState
          isLoading={isLoading && isPremium}
          onStartRoutine={() => navigation.navigate('Home')}
          allRoutinesHidden={false}
        />
      );
    }

    // Always check if user is premium before showing the main progress screen
    if (!isPremium) {
      return (
        <PremiumLock
          onOpenSubscription={handleUpgradeToPremium}
          subscriptionModalVisible={subscriptionModalVisible}
          onCloseSubscription={() => setSubscriptionModalVisible(false)}
          totalXP={totalXP || 0}
          level={level || 1}
        />
      );
    }

    // Render loading state if data is still loading
    if (isGamificationLoading) {
      return (
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>
            Loading progress data...
          </Text>
        </View>
      );
    }

    // Render main content
    return (
      <>
        {/* Tab navigation */}
        <TabNavigation
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />
        
        {/* Tab content with animation */}
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <RefreshableScrollView 
            onRefresh={handleRefresh}
            refreshing={isRefreshing || isGamificationLoading}
            showRefreshingFeedback={true}
            minimumRefreshTime={800}
          >
            {/* Render the active tab */}
            {activeTab === 'stats' && (
              <StatsTab
                hasHiddenRoutinesOnly={hasHiddenRoutinesOnly}
                stats={stats}
                orderedDayNames={orderedDayNames}
                mostActiveDay={mostActiveDay}
                isPremium={isPremium}
                canAccessFeature={canAccessFeature}
                theme={theme}
                isDark={isDark}
                streakFreezeActive={streakFreezeActive}
                userLevel={level}
              />
            )}
            
            {activeTab === 'achievements' && (
              <AchievementsTab
                stats={stats}
                progressSystemData={gamificationSummary}
              />
            )}
            
            {activeTab === 'challenges' && (
              <ChallengesTab
                isPremium={isPremium}
                handleUpgradeToPremium={handleUpgradeToPremium}
              />
            )}
            
            {activeTab === 'rewards' && (
              <RewardsTab
                isPremium={isPremium}
                progressSystemData={gamificationSummary}
                handleUpgradeToPremium={handleUpgradeToPremium}
                handleActivateXpBoost={handleActivateXpBoost}
                subscriptionModalVisible={subscriptionModalVisible}
                onCloseSubscription={handleSubscriptionComplete}
              />
            )}
            
            <ProgressFooter
              progressSystemData={gamificationSummary}
              isDark={isDark}
              onResetProgress={handleResetProgress}
            />
          </RefreshableScrollView>
        </Animated.View>
      </>
    );
  };

  // Return the main container with a single XpNotificationManager
  return (
    <View style={styles.container}>
      {/* Only include XpNotificationManager once at the root level */}
      <XpNotificationManager />
      
      {/* Render the content based on conditions */}
      {renderContent()}
      
      {/* Subscription Modal - always available */}
      <SubscriptionModal
        visible={subscriptionModalVisible}
        onClose={() => setSubscriptionModalVisible(false)}
        onSubscribe={handleSubscriptionComplete}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  }
});