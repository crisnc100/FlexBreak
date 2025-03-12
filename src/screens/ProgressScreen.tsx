import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ProgressEntry, BodyArea } from '../types';
import { usePremium } from '../context/PremiumContext';
import { useRoutineStorage } from '../hooks/useRoutineStorage';
import { useRefresh } from '../context/RefreshContext';
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
  Rewards,
  Challenges
} from '../components/progress';
import { RefreshableScrollView } from '../components/common';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Day names for labels
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Sample challenges for the app
const SAMPLE_CHALLENGES = [
  {
    id: 'daily_stretch_1',
    title: 'Daily Stretch',
    description: 'Complete a stretching routine today',
    xpReward: 50,
    icon: 'today-outline',
    type: 'daily',
    requirement: 1
  },
  {
    id: 'streak_3',
    title: 'Mini Streak',
    description: 'Complete 3 days in a row',
    xpReward: 100,
    icon: 'flame-outline',
    type: 'streak',
    requirement: 3
  },
  {
    id: 'variety_challenge',
    title: 'Variety Challenge',
    description: 'Try 3 different body areas this week',
    xpReward: 150,
    icon: 'apps-outline',
    type: 'weekly',
    requirement: 3
  },
  {
    id: 'morning_routine',
    title: 'Morning Routine',
    description: 'Complete a routine before 10 AM',
    xpReward: 75,
    icon: 'sunny-outline',
    type: 'daily',
    requirement: 1
  },
  {
    id: 'evening_wind_down',
    title: 'Evening Wind Down',
    description: 'Complete a routine after 8 PM',
    xpReward: 75,
    icon: 'moon-outline',
    type: 'daily',
    requirement: 1
  }
];

// Tab types
type TabType = 'stats' | 'achievements' | 'challenges' | 'rewards';

// Initial XP and level state
const INITIAL_PROGRESS_STATE = {
  totalXP: 0,
  level: 1,
  completedAchievements: [],
  completedChallenges: [],
  lastUpdated: new Date().toISOString()
};

export default function ProgressScreen({ navigation }) {
  const { isPremium } = usePremium();
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
  
  // State for achievements and XP system
  const [userProgress, setUserProgress] = useState(INITIAL_PROGRESS_STATE);
  const [isProgressLoading, setIsProgressLoading] = useState(true);
  
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('stats');

  // Get ordered day names once
  const orderedDayNames = useMemo(() => getOrderedDayNames(DAY_NAMES), []);
  
  // Get most active day
  const mostActiveDay = useMemo(() => 
    getMostActiveDay(stats.dayOfWeekBreakdown, DAY_NAMES), 
    [stats.dayOfWeekBreakdown]
  );
  
  // Load user progress from storage
  useEffect(() => {
    const loadUserProgress = async () => {
      try {
        setIsProgressLoading(true);
        const progressJson = await AsyncStorage.getItem('@userProgress');
        
        if (progressJson) {
          const savedProgress = JSON.parse(progressJson);
          console.log('Loaded user progress:', savedProgress);
          setUserProgress(savedProgress);
        } else {
          console.log('No existing user progress found, initializing defaults');
          await AsyncStorage.setItem('@userProgress', JSON.stringify(INITIAL_PROGRESS_STATE));
        }
      } catch (error) {
        console.error('Error loading user progress:', error);
      } finally {
        setIsProgressLoading(false);
      }
    };
    
    loadUserProgress();
  }, []);
  
  // Synchronize data and load all routines when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        if (isPremium && !hasSynchronized) {
          console.log('Loading progress data...');
          await synchronizeProgressData();
          
          // After synchronization, get ALL routines (visible and hidden)
          const allRoutines = await getAllRoutines();
          console.log('Loaded all routines for statistics:', allRoutines.length);
          setAllProgressData(allRoutines);
          
          // Calculate stats using ALL routines
          calculateStats(allRoutines);
          
          // Update achievements based on stats
          updateAchievements(allRoutines);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, [isPremium, hasSynchronized, synchronizeProgressData, getAllRoutines]);
  
  // Update visible routines for display
  useEffect(() => {
    if (isPremium && recentRoutines.length > 0) {
      console.log('Updating visible routines:', recentRoutines.length);
      setProgressData(recentRoutines);
    }
  }, [isPremium, recentRoutines]);
  
  // Refresh all routines when needed
  useEffect(() => {
    const refreshAllRoutines = async () => {
      if (isPremium && hasSynchronized) {
        try {
          const allRoutines = await getAllRoutines();
          console.log('Refreshed all routines for statistics:', allRoutines.length);
          setAllProgressData(allRoutines);
          calculateStats(allRoutines);
          
          // Update achievements based on stats
          updateAchievements(allRoutines);
        } catch (error) {
          console.error('Error refreshing all routines:', error);
        }
      }
    };
    
    refreshAllRoutines();
  }, [isPremium, hasSynchronized, getAllRoutines]);
  
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
  };
  
  // Update achievements based on stats
  const updateAchievements = async (data) => {
    if (!data || data.length === 0) return;
    
    try {
      setIsProgressLoading(true);
      
      // Get current stats
      const totalRoutines = data.length;
      const totalMinutes = data.reduce((sum, entry) => {
        const duration = typeof entry.duration === 'string' 
          ? parseInt(entry.duration, 10) 
          : (typeof entry.duration === 'number' ? entry.duration : 0);
        return sum + (isNaN(duration) ? 0 : duration);
      }, 0);
      const currentStreak = calculateStreak(data);
      const uniqueAreas = Array.from(new Set(data.map(r => r.area)));
      
      // Get area with most routines
      const areaBreakdown = data.reduce((acc, entry) => {
        acc[entry.area] = (acc[entry.area] || 0) + 1;
        return acc;
      }, {});
      const maxAreaCount = Math.max(...Object.values(areaBreakdown).map(Number), 0);
      
      // Check achievements from Achievements.tsx
      const newCompletedAchievements = [];
      let totalXP = userProgress.totalXP;
      
      // First stretch
      if (totalRoutines >= 1 && !isAchievementCompleted('first_stretch')) {
        newCompletedAchievements.push({
          id: 'first_stretch',
          title: 'First Stretch!',
          xp: 50,
          dateCompleted: new Date().toISOString()
        });
        totalXP += 50;
      }
      
      // Three day streak
      if (currentStreak >= 3 && !isAchievementCompleted('three_day_streak')) {
        newCompletedAchievements.push({
          id: 'three_day_streak',
          title: 'Getting Into It',
          xp: 100,
          dateCompleted: new Date().toISOString()
        });
        totalXP += 100;
      }
      
      // Weekly warrior
      if (currentStreak >= 7 && !isAchievementCompleted('week_streak')) {
        newCompletedAchievements.push({
          id: 'week_streak',
          title: 'Weekly Warrior',
          xp: 200,
          dateCompleted: new Date().toISOString()
        });
        totalXP += 200;
      }
      
      // Variety master
      if (uniqueAreas.length >= 6 && !isAchievementCompleted('variety_master')) {
        newCompletedAchievements.push({
          id: 'variety_master',
          title: 'Variety Master',
          xp: 150,
          dateCompleted: new Date().toISOString()
        });
        totalXP += 150;
      }
      
      // Dedication
      if (totalRoutines >= 10 && !isAchievementCompleted('dedication')) {
        newCompletedAchievements.push({
          id: 'dedication',
          title: 'Dedication',
          xp: 200,
          dateCompleted: new Date().toISOString()
        });
        totalXP += 200;
      }
      
      // Consistency champion
      if (currentStreak >= 5 && !isAchievementCompleted('consistency_champion')) {
        newCompletedAchievements.push({
          id: 'consistency_champion',
          title: 'Consistency Champion',
          xp: 250,
          dateCompleted: new Date().toISOString()
        });
        totalXP += 250;
      }
      
      // Stretch master
      if (totalRoutines >= 30 && !isAchievementCompleted('stretch_master')) {
        newCompletedAchievements.push({
          id: 'stretch_master',
          title: 'Stretch Master',
          xp: 300,
          dateCompleted: new Date().toISOString()
        });
        totalXP += 300;
      }
      
      // Monthly milestone
      if (currentStreak >= 30 && !isAchievementCompleted('month_streak')) {
        newCompletedAchievements.push({
          id: 'month_streak',
          title: 'Monthly Milestone',
          xp: 500,
          dateCompleted: new Date().toISOString()
        });
        totalXP += 500;
      }
      
      // Area expert
      if (maxAreaCount >= 15 && !isAchievementCompleted('area_expert')) {
        newCompletedAchievements.push({
          id: 'area_expert',
          title: 'Area Expert',
          xp: 350,
          dateCompleted: new Date().toISOString()
        });
        totalXP += 350;
      }
      
      // Stretch guru
      if (totalRoutines >= 100 && !isAchievementCompleted('stretch_guru')) {
        newCompletedAchievements.push({
          id: 'stretch_guru',
          title: 'Stretch Guru',
          xp: 1000,
          dateCompleted: new Date().toISOString()
        });
        totalXP += 1000;
      }
      
      // Iron flexibility
      if (currentStreak >= 60 && !isAchievementCompleted('iron_flexibility')) {
        newCompletedAchievements.push({
          id: 'iron_flexibility',
          title: 'Iron Flexibility',
          xp: 1500,
          dateCompleted: new Date().toISOString()
        });
        totalXP += 1500;
      }
      
      // Time investment
      if (totalMinutes >= 60 && !isAchievementCompleted('time_investment')) {
        newCompletedAchievements.push({
          id: 'time_investment',
          title: 'Time Investment',
          xp: 100,
          dateCompleted: new Date().toISOString()
        });
        totalXP += 100;
      }
      
      // Dedicated stretcher
      if (totalMinutes >= 300 && !isAchievementCompleted('dedicated_stretcher')) {
        newCompletedAchievements.push({
          id: 'dedicated_stretcher',
          title: 'Dedicated Stretcher',
          xp: 250,
          dateCompleted: new Date().toISOString()
        });
        totalXP += 250;
      }
      
      // Calculate level based on XP
      const level = calculateLevel(totalXP);
      
      // If any new achievements, update state and storage
      if (newCompletedAchievements.length > 0) {
        const updatedProgress = {
          ...userProgress,
          totalXP,
          level,
          completedAchievements: [...userProgress.completedAchievements, ...newCompletedAchievements],
          lastUpdated: new Date().toISOString()
        };
        
        setUserProgress(updatedProgress);
        await AsyncStorage.setItem('@userProgress', JSON.stringify(updatedProgress));
        
        console.log(`Updated achievements: ${newCompletedAchievements.length} new, total XP: ${totalXP}, level: ${level}`);
      }
    } catch (error) {
      console.error('Error updating achievements:', error);
    } finally {
      setIsProgressLoading(false);
    }
  };
  
  // Helper to check if achievement is already completed
  const isAchievementCompleted = (achievementId) => {
    return userProgress.completedAchievements.some(a => a.id === achievementId);
  };
  
  // Calculate level based on XP
  const calculateLevel = (xp) => {
    const LEVEL_THRESHOLDS = [
      0,      // Level 1
      200,    // Level 2
      500,    // Level 3
      1000,   // Level 4
      2000,   // Level 5
      3500,   // Level 6
      5000,   // Level 7
      7500,   // Level 8
      10000,  // Level 9
      15000   // Level 10
    ];
    
    for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
      if (xp >= LEVEL_THRESHOLDS[i]) {
        return i + 1;
      }
    }
    return 1; // Default to level 1
  };
  
  // Get XP required for next level
  const getNextLevelXP = () => {
    const LEVEL_THRESHOLDS = [
      0,      // Level 1
      200,    // Level 2
      500,    // Level 3
      1000,   // Level 4
      2000,   // Level 5
      3500,   // Level 6
      5000,   // Level 7
      7500,   // Level 8
      10000,  // Level 9
      15000   // Level 10
    ];
    
    const currentLevel = userProgress.level;
    if (currentLevel >= 10) return userProgress.totalXP; // Max level
    
    return LEVEL_THRESHOLDS[currentLevel];
  };

  // Handle upgrade to premium
  const handleUpgradeToPremium = () => {
    setSubscriptionModalVisible(true);
  };

  // Handle refresh
  const handleRefresh = async () => {
    console.log('Refreshing progress screen...');
    await refreshProgress();
    
    // Also refresh all routines to update stats
    if (isPremium) {
      try {
        const allRoutines = await getAllRoutines();
        console.log('Refreshed all routines for statistics:', allRoutines.length);
        setAllProgressData(allRoutines);
        calculateStats(allRoutines);
        
        // Update achievements based on stats
        updateAchievements(allRoutines);
      } catch (error) {
        console.error('Error refreshing all routines:', error);
      }
    }
  };

  // Handle completing a challenge
  const handleCompleteChallenge = async (challengeId) => {
    try {
      // Find the challenge in the sample challenges
      const challenge = SAMPLE_CHALLENGES.find(c => c.id === challengeId);
      if (!challenge) return;
      
      // Add to completed challenges
      const updatedProgress = {
        ...userProgress,
        totalXP: userProgress.totalXP + challenge.xpReward,
        completedChallenges: [
          ...userProgress.completedChallenges,
          {
            id: challengeId,
            title: challenge.title,
            xp: challenge.xpReward,
            dateCompleted: new Date().toISOString()
          }
        ],
        lastUpdated: new Date().toISOString()
      };
      
      // Calculate new level
      updatedProgress.level = calculateLevel(updatedProgress.totalXP);
      
      // Update state and storage
      setUserProgress(updatedProgress);
      await AsyncStorage.setItem('@userProgress', JSON.stringify(updatedProgress));
      
      console.log(`Challenge completed: ${challenge.title}, earned ${challenge.xpReward} XP`);
      
      // Check if leveled up
      if (updatedProgress.level > userProgress.level) {
        console.log(`Leveled up to level ${updatedProgress.level}!`);
        // Show level up notification
      }
    } catch (error) {
      console.error('Error completing challenge:', error);
    }
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
            totalRoutines={stats.totalRoutines}
            currentStreak={stats.currentStreak}
            areaBreakdown={stats.areaBreakdown}
            totalXP={userProgress.totalXP}
            level={userProgress.level}
            completedAchievements={userProgress.completedAchievements}
          />
        );
        
      case 'challenges':
        return (
          <Challenges
            isPremium={isPremium}
            onUpgradeToPremium={handleUpgradeToPremium}
            onCompleteChallenge={handleCompleteChallenge}
          />
        );
        
      case 'rewards':
        return (
          <Rewards
            userLevel={userProgress.level}
            isPremium={isPremium}
            onUpgradeToPremium={handleUpgradeToPremium}
          />
        );
        
      default:
        return null;
    }
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
        onRefresh={handleRefresh}
        refreshing={isRefreshing || isProgressLoading}
        showRefreshingFeedback={true}
      >
        {renderTabContent()}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            DeskStretch Premium
          </Text>
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
  },
});