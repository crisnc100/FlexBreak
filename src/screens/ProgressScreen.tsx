import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProgressEntry, BodyArea } from '../types';
import { usePremium } from '../context/PremiumContext';
import { useRoutineStorage } from '../hooks/useRoutineStorage';
import { useRefresh } from '../context/RefreshContext';
import useProgressSystem from '../hooks/useProgressSystem';
import { useTheme } from '../context/ThemeContext';
import {
  calculateStreak,
  calculateWeeklyActivity,
  calculateDayOfWeekActivity,
  calculateActiveDays,
  getOrderedDayNames,
  getMostActiveDay
} from '../utils/progressUtils';
import * as storageService from '../services/storageService';
import * as challengeManager from '../utils/progress/challengeManager';
import {
  StatsOverview,
  ConsistencyInsights,
  FocusAreas,
  WeeklyActivity,
  StretchingPatterns,
  TipSection,
  Achievements,
  PremiumLock,
  EmptyState,
  Rewards,
  Challenges
} from '../components/progress';
import { ChallengeList } from '../components/progress/ChallengeList';
import { PremiumLockSimple } from '../components/progress/PremiumLockSimple';
import { RefreshableScrollView } from '../components/common';
import XpNotificationManager from '../components/XpNotificationManager';
import { useChallengeSystem } from '../hooks/useChallengeSystem';
import XpBoostCard from '../components/progress/XpBoostCard';
import StreakFreezeCard from '../components/progress/StreakFreezeCard';
import { useFeatureAccess } from '../hooks/useFeatureAccess';

// Day names for labels
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Tab types
type TabType = 'stats' | 'achievements' | 'challenges' | 'rewards';

// Initial XP and level state
const INITIAL_PROGRESS_STATE = {
  totalXP: 0,
  level: 1,
  completedAchievements: [],
  completedChallenges: [],
  completedRoutineIds: [],
  lastUpdated: new Date().toISOString()
};

export default function ProgressScreen({ navigation }) {
  const { isPremium } = usePremium();
  const { theme, isDark } = useTheme();
  const { 
    recentRoutines, 
    getAllRoutines,
    isLoading, 
    hasSynchronized, 
    synchronizeProgressData 
  } = useRoutineStorage();
  
  const { isRefreshing, refreshProgress } = useRefresh();
  const [progressData, setProgressData] = useState<ProgressEntry[]>([]);
  const [allProgressData, setAllProgressData] = useState<ProgressEntry[]>([]);
  const [stats, setStats] = useState({
    totalRoutines: 0,
    totalMinutes: 0,
    currentStreak: 0,
    areaBreakdown: {},
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
    dayOfWeekBreakdown: [0, 0, 0, 0, 0, 0, 0],
    activeRoutineDays: 0
  });
  
  // Use the progress system hook for XP tracking
  const { 
    userProgress: progressSystemData, 
    isLoading: isProgressSystemLoading,
    processRoutine,
    updateUserAchievements,
    refreshUserProgress,
    updateChallengesWithRoutines,
    claimChallengeReward
  } = useProgressSystem();
  
  // Use the challenge system hook to refresh challenge data
  const { refreshChallenges } = useChallengeSystem();
  
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('stats');

  // Create a ref to track if we've already updated challenges - moved outside useEffect
  const hasUpdatedChallenges = useRef(false);
  
  // Get ordered day names once
  const orderedDayNames = useMemo(() => getOrderedDayNames(DAY_NAMES), []);
  
  // Get most active day
  const mostActiveDay = useMemo(() => 
    getMostActiveDay(stats.dayOfWeekBreakdown, DAY_NAMES), 
    [stats.dayOfWeekBreakdown]
  );
  
  // Use the feature access hook
  const { canAccessFeature } = useFeatureAccess();
  
  // Synchronize data and load all routines when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        // For both free and premium users, load routines to calculate XP
        const allRoutines = await getAllRoutines();
        
        if (allRoutines && allRoutines.length > 0) {
          console.log('Loaded routines for XP calculation:', allRoutines.length);
          setAllProgressData(allRoutines);
          
          // Calculate stats first to ensure streak is calculated
          calculateStats(allRoutines);
          
          // Force refresh user progress to ensure XP is up to date
          await refreshUserProgress();
          
          // Update progress with routines for both free and premium users
          // Only do this once per component mount to avoid infinite loops
          if (progressSystemData && !hasUpdatedChallenges.current) {
            console.log('Updating challenges with routines (first time only)');
            await updateChallengesWithRoutines(allRoutines);
            hasUpdatedChallenges.current = true;
          } else if (!progressSystemData) {
            console.log('Skipping updateChallengesWithRoutines because progressSystemData is null');
          } else {
            console.log('Skipping updateChallengesWithRoutines because it was already done');
          }
          
          // For premium users, also synchronize
          if (isPremium && !hasSynchronized) {
            console.log('Loading progress data for premium user...');
            await synchronizeProgressData();
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
    // Remove progressSystemData from dependency array to prevent loops
  }, [isPremium, hasSynchronized, synchronizeProgressData, getAllRoutines, updateChallengesWithRoutines, refreshUserProgress]);
  
  // Update visible routines for display
  useEffect(() => {
    if (isPremium && recentRoutines.length > 0) {
      console.log('Updating visible routines:', recentRoutines.length);
      setProgressData(recentRoutines);
    }
  }, [isPremium, recentRoutines]);
  
  // Handle refresh
  const handleRefresh = async () => {
    console.log('Refreshing progress screen...');
    await refreshProgress();
    
    try {
      // Get all routines for both premium and free users
      const allRoutines = await getAllRoutines();
      console.log('Refreshed all routines:', allRoutines.length);
      setAllProgressData(allRoutines);
      
      // Calculate stats first
      calculateStats(allRoutines);
      
      // Force refresh user progress
      await refreshUserProgress();
      
      // Update progress with routines for both free and premium users
      // This also handles updating challenges appropriately
      await updateChallengesWithRoutines(allRoutines);
      
      // If on the challenges tab, specifically refresh challenge data
      if (activeTab === 'challenges') {
        // The ChallengeList component will handle its own refresh
        console.log('Refreshing challenges tab');
      }
    } catch (error) {
      console.error('Error refreshing all routines:', error);
    }
  };

  // Calculate all stats from progress data
  const calculateStats = (data) => {
    if (!data || data.length === 0) {
      console.log('No data to calculate stats from');
      return;
    }
    
    console.log(`Calculating stats from ${data.length} routines (including hidden)`);
    
    // Total routines
    const totalRoutines = data.length;

    // Total minutes
    const totalMinutes = data.reduce((sum, entry) => {
      // Make sure we're parsing the duration as a number
      const duration = typeof entry.duration === 'string' 
        ? parseInt(entry.duration, 10) 
        : (typeof entry.duration === 'number' ? entry.duration : 0);
      
      return sum + (isNaN(duration) ? 0 : duration);
    }, 0);

    // Calculate current streak
    const streak = calculateStreak(data);

    // Area breakdown
    const areaBreakdown = data.reduce((acc, entry) => {
      acc[entry.area] = (acc[entry.area] || 0) + 1;
      return acc;
    }, {});

    // Weekly activity trend (last 7 days)
    const weeklyActivity = calculateWeeklyActivity(data);

    // Day of week breakdown
    const dayOfWeekBreakdown = calculateDayOfWeekActivity(data);

    // Calculate active days over the last 30 days
    const activeRoutineDays = calculateActiveDays(data);

    console.log(`Stats calculated: ${totalRoutines} routines, ${totalMinutes} minutes, streak: ${streak}`);
    
    setStats({
      totalRoutines,
      totalMinutes,
      currentStreak: streak,
      areaBreakdown,
      weeklyActivity,
      dayOfWeekBreakdown,
      activeRoutineDays
    });
    
    // Update achievements based on the calculated stats
    // Note: We're not using updateUserAchievements here as it has a different signature
    // Instead, we'll just log the stats for now
    console.log('Stats updated for achievements:', {
      totalRoutines,
      streak,
      areaCount: Object.keys(areaBreakdown).length,
      totalMinutes,
      areaBreakdown
    });
  };

  // Handle completing a challenge
  const handleCompleteChallenge = async (challengeId) => {
    try {
      console.log(`Completing challenge: ${challengeId}`);
      
      // Claim the challenge reward
      const result = await claimChallengeReward(challengeId);
      
      if (result.success) {
        console.log(`Challenge completed, earned ${result.xpEarned} XP`);
        
        // Refresh progress data after claiming challenge
        refreshProgress();
      } else {
        console.log(`Failed to complete challenge: ${result.message}`);
      }
    } catch (error) {
      console.error('Error completing challenge:', error);
    }
  };

  // Handle upgrade to premium
  const handleUpgradeToPremium = () => {
    setSubscriptionModalVisible(true);
  };

  // Reset user progress (DEV only)
  const handleResetProgress = async () => {
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
  };

  // Add an effect to refresh challenges when the Challenges tab is selected
  useEffect(() => {
    if (activeTab === 'challenges' && !isProgressSystemLoading) {
      console.log('Challenges tab selected, refreshing challenge data');
      const refreshChallengeData = async () => {
        try {
          console.log('Force-refreshing challenge data');
          
          // Get all routines to ensure challenges are updated based on latest data
          const allRoutines = await getAllRoutines();
          console.log(`Retrieved all routines: ${allRoutines.length}`);
          
          // Force refresh user progress first
          await refreshUserProgress();
          
          // CRITICAL FIX: Force update daily challenges based on completed routines
          // This ensures daily challenges are properly marked as completed if routines exist
          // Import the function from challengeManager
          await challengeManager.forceUpdateDailyChallengesWithRoutines();
          
          // Force update challenges with latest routine data
          // This is important to make sure challenges reflect the latest completed routines
          const result = await updateChallengesWithRoutines(allRoutines);
          
          // Log the updated challenges
          if (result && 'updatedChallenges' in result && result.updatedChallenges) {
            console.log(`Successfully updated ${result.updatedChallenges.length} challenges`);
            
            // Extra debugging: Log any challenges that are daily routine_count
            const dailyRoutineChallenges = result.updatedChallenges.filter(
              c => c.type === 'routine_count' && c.requirement === 1 && c.category === 'daily'
            );
            
            if (dailyRoutineChallenges.length > 0) {
              console.log('Daily routine challenges found:');
              dailyRoutineChallenges.forEach(c => {
                console.log(`- ${c.title}: progress=${c.progress}/${c.requirement}, completed=${c.completed}, claimed=${c.claimed}`);
              });
            }
          }
        } catch (error) {
          console.error('Error refreshing challenge data:', error);
        }
      };
      
      refreshChallengeData();
    }
  }, [activeTab, isProgressSystemLoading, getAllRoutines, updateChallengesWithRoutines, refreshUserProgress]);
  
  // Change tab handler
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    
    // Track tab change in analytics if needed
    console.log(`Tab changed to: ${tab}`);
  };

  // Add or update useEffect to refresh data when tab changes
  useEffect(() => {
    if (activeTab === 'challenges' && !isLoading) {
      console.log('Challenges tab selected, refreshing challenge data');
      refreshChallenges();
    }
  }, [activeTab, isLoading, refreshChallenges]);
  
  // Handle XP Boost activation
  const handleActivateXpBoost = () => {
    Alert.alert(
      'XP Boost Activated!',
      'Your XP Boost is now active. All XP earned in the next 24 hours will be doubled.',
      [{ text: 'OK' }]
    );
    
    // Refresh progress data to reflect changes
    handleRefresh();
  };

  // Premium locked screen
  if (!isPremium) {
    console.log('Showing PremiumLock with XP:', progressSystemData?.totalXP || 0, 'and level:', progressSystemData?.level || 1);
    return (
      <PremiumLock
        onOpenSubscription={handleUpgradeToPremium}
        subscriptionModalVisible={subscriptionModalVisible}
        onCloseSubscription={() => setSubscriptionModalVisible(false)}
        totalXP={progressSystemData?.totalXP || 0}
        level={progressSystemData?.level || 1}
      />
    );
  }

  // Check if user has completed routines but they're all hidden
  const hasHiddenRoutinesOnly = allProgressData.length > 0 && progressData.length === 0;
  
  // Only show empty state if there's truly no data (not even hidden routines)
  if (progressData.length === 0 && !hasHiddenRoutinesOnly) {
    return (
      <EmptyState
        isLoading={isLoading && isPremium}
        onStartRoutine={() => navigation.navigate('Home')}
        allRoutinesHidden={false}
      />
    );
  }

  // Render tab content
  const renderTabContent = () => {
    // Add a loading state if progressSystemData is not available yet
    if (!progressSystemData && !isProgressSystemLoading) {
      console.log('Warning: progressSystemData is null but not loading');
      return (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: '#666', textAlign: 'center' }}>
            Loading progress data...
          </Text>
          <TouchableOpacity 
            style={{ marginTop: 20, padding: 10, backgroundColor: '#4CAF50', borderRadius: 5 }}
            onPress={refreshProgress}
          >
            <Text style={{ color: 'white' }}>Refresh</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // If still loading, show a loading indicator
    if (isProgressSystemLoading) {
      return (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={{ marginTop: 10, fontSize: 16, color: '#666' }}>
            Loading progress data...
          </Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'stats':
        return (
          <>
            {/* Show notice when all routines are hidden */}
            {hasHiddenRoutinesOnly && (
              <View style={[styles.hiddenRouticesNotice, { 
                backgroundColor: isDark ? theme.cardBackground : '#FFF',
                borderColor: isDark ? '#FF9800' : '#FF9800'
              }]}>
                <Ionicons name="eye-off-outline" size={20} color="#FF9800" />
                <Text style={styles.hiddenRoutinesText}>
                  All routines are hidden. Stats are still available.
                </Text>
              </View>
            )}
            
            <StatsOverview
              totalMinutes={stats.totalMinutes}
              currentStreak={stats.currentStreak}
              totalRoutines={stats.totalRoutines}
            />
            
            {/* Only show streak freeze card for premium users with level 6+ */}
            {isPremium && canAccessFeature('streak_freezes') && (
              <StreakFreezeCard currentStreak={stats.currentStreak} />
            )}
            
            <ConsistencyInsights
              activeRoutineDays={stats.activeRoutineDays}
              mostActiveDay={mostActiveDay}
            />
            
            <WeeklyActivity
              weeklyActivity={stats.weeklyActivity}
              orderedDayNames={orderedDayNames}
            />
            
            <FocusAreas
              areaBreakdown={stats.areaBreakdown}
              totalRoutines={stats.totalRoutines}
            />
            
            <StretchingPatterns
              dayOfWeekBreakdown={stats.dayOfWeekBreakdown}
              dayNames={DAY_NAMES}
              mostActiveDay={mostActiveDay}
            />
            
            <TipSection
              currentStreak={stats.currentStreak}
            />
          </>
        );
        
      case 'achievements':
        return (
          <Achievements
            totalRoutines={stats.totalRoutines}
            currentStreak={stats.currentStreak}
            areaBreakdown={stats.areaBreakdown}
            totalXP={progressSystemData?.totalXP || 0}
            level={progressSystemData?.level || 1}
            totalMinutes={stats.totalMinutes}
            completedAchievements={progressSystemData?.achievements ? 
              Object.values(progressSystemData.achievements || {})
                .filter(a => a.completed)
                .map(a => ({
                  id: a.id,
                  title: a.title,
                  xp: a.xp,
                  dateCompleted: a.dateCompleted || new Date().toISOString()
                })) : 
              []}
          />
        );
        
      case 'challenges':
        return isPremium ? (
          <ChallengeList />
        ) : (
          <PremiumLockSimple
            feature="Challenges"
            description="Complete daily, weekly, and monthly challenges to earn XP and track your progress."
            onUpgrade={handleUpgradeToPremium}
          />
        );
        
      case 'rewards':
        if (!isPremium) {
          return (
            <PremiumLock
              onOpenSubscription={handleUpgradeToPremium}
              subscriptionModalVisible={false}
              onCloseSubscription={() => {}}
              totalXP={progressSystemData?.totalXP || 0}
              level={progressSystemData?.level || 1}
            />
          );
        }
        
        return (
          <View style={styles.tabContent}>
            {/* Include XP Boost card at the top of rewards tab */}
            <XpBoostCard onActivateBoost={handleActivateXpBoost} />
            
            {/* Existing rewards section */}
            <Rewards
              userLevel={progressSystemData?.level || 1}
              isPremium={isPremium}
              onUpgradeToPremium={handleUpgradeToPremium}
            />
          </View>
        );
        
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <XpNotificationManager />
      {/* Tab navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => handleTabChange('stats')}
        >
          <Ionicons
            name="stats-chart"
            size={24}
            color={activeTab === 'stats' ? '#4CAF50' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'stats' && styles.activeTabText]}>
            Stats
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'achievements' && styles.activeTab]}
          onPress={() => handleTabChange('achievements')}
        >
          <Ionicons
            name="trophy"
            size={24}
            color={activeTab === 'achievements' ? '#4CAF50' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'achievements' && styles.activeTabText]}>
            Achievements
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'challenges' && styles.activeTab]}
          onPress={() => handleTabChange('challenges')}
        >
          <Ionicons
            name="flag"
            size={24}
            color={activeTab === 'challenges' ? '#4CAF50' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'challenges' && styles.activeTabText]}>
            Challenges
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rewards' && styles.activeTab]}
          onPress={() => handleTabChange('rewards')}
        >
          <Ionicons
            name="gift"
            size={24}
            color={activeTab === 'rewards' ? '#4CAF50' : '#999'}
          />
          <Text style={[styles.tabText, activeTab === 'rewards' && styles.activeTabText]}>
            Rewards
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Tab content */}
      <RefreshableScrollView 
        style={styles.content}
        onRefresh={handleRefresh}
        refreshing={isRefreshing || isProgressSystemLoading}
        showRefreshingFeedback={true}
      >
        {renderTabContent()}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            DeskStretch Premium • Level {progressSystemData?.level || 1} • {progressSystemData?.totalXP || 0} XP
          </Text>
          
          {/* Add testing buttons in development mode */}
          {__DEV__ && (
            <View style={styles.devTools}>
              <TouchableOpacity
                style={styles.testingButton}
                onPress={() => Alert.alert('Progress Testing', 'Select the Testing tab to access the testing tools.')}
              >
                <Text style={styles.testingButtonText}>
                  Progress Testing Available
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.testingButton, { backgroundColor: '#F44336', marginTop: 8 }]}
                onPress={handleResetProgress}
              >
                <Text style={styles.testingButtonText}>
                  Reset Progress Data
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </RefreshableScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingVertical: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 12,
    marginTop: 4,
    color: '#999',
  },
  activeTabText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  testingButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 8,
  },
  testingButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  devTools: {
    marginTop: 12,
    alignItems: 'center',
  },
  xpHistoryCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  xpHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  viewAllText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  xpHistorySection: {
    marginBottom: 12,
  },
  xpHistoryDate: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 8,
    backgroundColor: '#f0f0f0',
    padding: 4,
    borderRadius: 4,
  },
  xpHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  xpHistoryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  xpHistoryDetails: {
    flex: 1,
  },
  xpHistoryTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  xpHistoryTime: {
    fontSize: 12,
    color: '#999',
  },
  xpHistoryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  showMoreButton: {
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    marginTop: 8,
  },
  showMoreText: {
    color: '#666',
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    padding: 16,
  },
  xpSummaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  xpSummaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  xpSummaryDetails: {
    flex: 1,
  },
  xpSummaryTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  xpSummaryBarContainer: {
    height: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    overflow: 'hidden',
  },
  xpSummaryBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  xpSummaryStats: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  xpSummaryAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  xpSummaryPercentage: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  tabContent: {
    padding: 24,
  },
  hiddenRouticesNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#FF9800',
    borderRadius: 8,
  },
  hiddenRoutinesText: {
    color: '#FF9800',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});