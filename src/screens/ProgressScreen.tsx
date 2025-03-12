import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Image,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoutineStorage } from '../hooks/useRoutineStorage';
import { ProgressEntry, BodyArea } from '../types';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import SubscriptionModal from '../components/SubscriptionModal';
import { useRefresh } from '../context/RefreshContext';
import { useProgressSystem } from '../hooks/useProgressSystem';
import {
  calculateStreak,
  calculateWeeklyActivity,
  calculateDayOfWeekActivity,
  calculateActiveDays,
  getOrderedDayNames,
  getMostActiveDay
} from '../utils/progressUtils';
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
  Rewards
} from '../components/progress';
import { RefreshableScrollView } from '../components/common';
import { debounce } from '../utils/debounce';
import { measureAsyncOperation, logPerformanceStats } from '../utils/performance';
import ChallengesComponent from '../components/progress/Challenges';
import { useNavigation } from '@react-navigation/native';
import { usePremium } from '../context/PremiumContext';
import { AppNavigationProp } from '../types';

// Day names for labels
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Tab types
type TabType = 'stats' | 'achievements' | 'challenges' | 'rewards';

export default function ProgressScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const { isPremium } = usePremium();
  const { 
    recentRoutines, 
    getAllRoutines,
    isLoading, 
    hasSynchronized, 
    synchronizeProgressData 
  } = useRoutineStorage();
  const { isRefreshing, refreshProgress, debouncedRefreshProgress } = useRefresh();
  const {
    userProgress,
    isLoading: isProgressLoading,
    refreshUserProgress,
    updateProgressWithRoutines,
    updateCurrentStreak,
    getUnlockedRewards,
    getPendingAchievements,
    getCurrentChallenges,
    achievements,
    rewards,
    challenges,
    completedChallenges,
    completeChallenge,
    updateUserProgress
  } = useProgressSystem();
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
  const [streak, setStreak] = useState({ current: 0, best: 0 });
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('stats');
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const debouncedRefreshRef = useRef(null);
  
  // Add these refs at the component level, not inside useEffect
  const loadAllRoutinesRef = useRef(false);
  const lastProgressDataKeyRef = useRef('');
  const lastStreakKeyRef = useRef('');
  
  // Calculate user level based on achievements and challenges
  const userLevel = useMemo(() => {
    // This is a simplified calculation - in a real app, this would be based on XP
    const baseLevel = 1;
    const routineBonus = Math.floor(stats.totalRoutines / 10);
    const streakBonus = Math.floor(stats.currentStreak / 5);
    const areaBonus = Object.keys(stats.areaBreakdown).length > 3 ? 1 : 0;
    
    return Math.min(baseLevel + routineBonus + streakBonus + areaBonus, 10);
  }, [stats.totalRoutines, stats.currentStreak, stats.areaBreakdown]);
  
  // Get ordered day names once
  const orderedDayNames = useMemo(() => getOrderedDayNames(DAY_NAMES), []);
  
  // Get most active day
  const mostActiveDay = useMemo(() => 
    getMostActiveDay(stats.dayOfWeekBreakdown, DAY_NAMES), 
    [stats.dayOfWeekBreakdown]
  );
  
  // Initialize debounced refresh function
  useEffect(() => {
    debouncedRefreshRef.current = debounce(async () => {
      await handleRefresh();
    }, 500); // 500ms debounce time
    
    return () => {
      // Clean up
      debouncedRefreshRef.current = null;
    };
  }, []);
  
  // Synchronize data when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        if (isPremium && !hasSynchronized) {
          console.log('Loading progress data...');
          await synchronizeProgressData();
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, [isPremium, hasSynchronized, synchronizeProgressData]);
  
  // Log performance stats when component unmounts
  useEffect(() => {
    return () => {
      // Log performance stats when component unmounts
      logPerformanceStats();
    };
  }, []);
  
  // Load all routines for statistics with performance monitoring
  useEffect(() => {
    const loadAllRoutines = async () => {
      if (isPremium && !isLoadingStats && !loadAllRoutinesRef.current) {
        try {
          loadAllRoutinesRef.current = true;
          setIsLoadingStats(true);
          
          // Use performance monitoring
          const allRoutines = await measureAsyncOperation(
            'getAllRoutines',
            async () => await getAllRoutines()
          );
          
          console.log('Loaded all routines for statistics:', allRoutines.length);
          setAllProgressData(allRoutines);
          
          // Also measure stats calculation
          await measureAsyncOperation(
            'calculateStats',
            async () => {
              calculateStats(allRoutines);
              return Promise.resolve();
            }
          );
        } catch (error) {
          console.error('Error loading all routines:', error);
        } finally {
          setIsLoadingStats(false);
        }
      }
    };
    
    loadAllRoutines();
    
    return () => {
      loadAllRoutinesRef.current = false;
    };
  }, [isPremium]);
  
  // Update visible routines
  useEffect(() => {
    if (isPremium && recentRoutines.length > 0) {
      console.log('Updating visible routines:', recentRoutines.length);
      setProgressData(recentRoutines);
    }
  }, [isPremium, recentRoutines]);
  
  // Calculate all stats from progress data
  const calculateStats = (data) => {
    if (!data || data.length === 0) return;
    
    // Total routines
    const totalRoutines = data.length;

    // Total minutes
    const totalMinutes = data.reduce((sum, entry) => {
      return sum + (parseInt(entry.duration) || 0);
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

    setStats({
      totalRoutines,
      totalMinutes,
      currentStreak: streak,
      areaBreakdown,
      weeklyActivity,
      dayOfWeekBreakdown,
      activeRoutineDays
    });
  };

  // Handle upgrade to premium
  const handleUpgradeToPremium = () => {
    setSubscriptionModalVisible(true);
  };

  // Calculate next level XP threshold
  const getNextLevelXP = useCallback(() => {
    const currentLevel = userProgress.level;
    if (currentLevel >= 10) return userProgress.totalXP; // Max level
    
    // This matches the thresholds defined in useProgressSystem.ts
    const LEVEL_THRESHOLDS = [
      0,      // Level 1
      100,    // Level 2
      250,    // Level 3
      500,    // Level 4
      1000,   // Level 5
      2000,   // Level 6
      3500,   // Level 7
      5500,   // Level 8
      8000,   // Level 9
      12000   // Level 10
    ];
    
    return LEVEL_THRESHOLDS[currentLevel];
  }, [userProgress.level, userProgress.totalXP]);

  // Update user progress when all routines are loaded
  useEffect(() => {
    if (allProgressData.length > 0 && isPremium && !isLoadingStats) {
      // Add a flag to prevent multiple calls
      const progressDataKey = `${allProgressData.length}_${new Date().toDateString()}`;
      
      if (lastProgressDataKeyRef.current !== progressDataKey) {
        lastProgressDataKeyRef.current = progressDataKey;
        console.log('Processing new progress data:', progressDataKey);
        
        // Update progress system with the full routine data
        updateProgressWithRoutines(allProgressData);
      }
    }
  }, [allProgressData, isPremium, updateProgressWithRoutines, isLoadingStats]);
  
  // Update streak in progress system when stats change
  useEffect(() => {
    if (stats.currentStreak > 0 && isPremium && !isLoadingStats) {
      // Only update if the streak actually changed
      const streakKey = `streak_${stats.currentStreak}`;
      
      if (lastStreakKeyRef.current !== streakKey) {
        lastStreakKeyRef.current = streakKey;
        console.log('Updating streak:', stats.currentStreak);
        updateCurrentStreak(stats.currentStreak);
      }
    }
  }, [stats.currentStreak, isPremium, updateCurrentStreak, isLoadingStats]);
  
  // Modify handleRefresh to include progress system
  const handleRefresh = async () => {
    if (isRefreshing || isLoadingStats) {
      console.log('Refresh already in progress, skipping...');
      return;
    }
    
    console.log('Refreshing progress screen...');
    
    // Measure refresh performance
    await measureAsyncOperation(
      'refreshProgress',
      async () => await refreshProgress()
    );
    
    // Also reload all routines for statistics
    if (isPremium) {
      try {
        setIsLoadingStats(true);
        
        // Measure getAllRoutines performance
        const allRoutines = await measureAsyncOperation(
          'getAllRoutines',
          async () => await getAllRoutines()
        );
        
        setAllProgressData(allRoutines);
        
        // Measure stats calculation performance
        await measureAsyncOperation(
          'calculateStats',
          async () => {
            calculateStats(allRoutines);
            return Promise.resolve();
          }
        );
      } catch (error) {
        console.error('Error refreshing all routines:', error);
      } finally {
        setIsLoadingStats(false);
      }
    }
    
    // Also refresh user progress
    await refreshUserProgress();
  };
  
  // Use the debounced refresh function from context
  const handleDebouncedRefresh = async () => {
    if (isRefreshing || isLoadingStats) {
      console.log('Refresh already in progress, skipping...');
      return Promise.resolve();
    }
    
    console.log('Using debounced refresh from context...');
    return debouncedRefreshProgress();
  };

  // Premium locked screen
  if (!isPremium) {
    return (
      <PremiumLock
        onOpenSubscription={handleUpgradeToPremium}
        subscriptionModalVisible={subscriptionModalVisible}
        onCloseSubscription={() => setSubscriptionModalVisible(false)}
      />
    );
  }

  // Empty state
  if (progressData.length === 0) {
    return (
      <EmptyState
        isLoading={isLoading && isPremium}
        onStartRoutine={() => navigation.navigate('Home')}
      />
    );
  }

  // Render challenges tab
  const renderChallengesTab = () => {
    return (
      <ChallengesComponent 
        activeChallenges={challenges}
        completedChallenges={completedChallenges}
        onCompleteChallenge={completeChallenge}
        isPremium={isPremium}
        onUpgradeToPremium={handleUpgradeToPremium}
      />
    );
  };
  
  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'stats':
        return (
          <>
            <StatsOverview
              totalMinutes={stats.totalMinutes}
              currentStreak={stats.currentStreak}
              totalRoutines={stats.totalRoutines}
            />
            
            <ConsistencyInsights
              activeRoutineDays={stats.activeRoutineDays}
              mostActiveDay={mostActiveDay}
            />
            
            <FocusAreas
              areaBreakdown={stats.areaBreakdown}
              totalRoutines={stats.totalRoutines}
            />
            
            <WeeklyActivity
              weeklyActivity={stats.weeklyActivity}
              orderedDayNames={orderedDayNames}
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
            achievements={Object.values(userProgress.achievements)}
            completedAchievements={Object.values(userProgress.achievements).filter(a => a.completed)}
            upcomingAchievements={getPendingAchievements().slice(0, 5)}
          />
        );
        
      case 'challenges':
        return renderChallengesTab();
        
      case 'rewards':
        return (
          <Rewards
            rewards={Object.values(userProgress.rewards)}
            level={userProgress.level}
            totalXP={userProgress.totalXP}
            nextLevelXP={getNextLevelXP()}
            isPremium={isPremium}
            onUpgradeToPremium={handleUpgradeToPremium}
          />
        );
        
      default:
        return null;
    }
  };

  // Render loading overlay if needed
  const renderLoadingOverlay = () => {
    if (isLoadingStats && !isRefreshing) {
      return (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Loading statistics...</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <View style={styles.container}>
      {/* Tab navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stats' && styles.activeTab]}
          onPress={() => setActiveTab('stats')}
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
          onPress={() => setActiveTab('achievements')}
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
          onPress={() => setActiveTab('challenges')}
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
          onPress={() => setActiveTab('rewards')}
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
        onRefresh={handleDebouncedRefresh}
        refreshing={isRefreshing}
        showRefreshingFeedback={true}
      >
        {renderTabContent()}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            DeskStretch Premium
          </Text>
        </View>
      </RefreshableScrollView>
      
      {/* Loading overlay */}
      {renderLoadingOverlay()}
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
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
});