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
import { getIsPremium } from '../utils/storage';
import { ProgressEntry, BodyArea } from '../types';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import SubscriptionModal from '../components/SubscriptionModal';
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

// Day names for labels
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Tab types
type TabType = 'stats' | 'achievements' | 'challenges' | 'rewards';

export default function ProgressScreen({ navigation }) {
  const { isPremium } = usePremium();
  const { recentRoutines, isLoading, hasSynchronized, synchronizeProgressData } = useRoutineStorage();
  const { isRefreshing, refreshProgress } = useRefresh();
  const [progressData, setProgressData] = useState<ProgressEntry[]>([]);
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
  
  // Update stats when recentRoutines changes
  useEffect(() => {
    if (isPremium && recentRoutines.length > 0) {
      console.log('Updating stats with', recentRoutines.length, 'routines');
      setProgressData(recentRoutines);
      calculateStats(recentRoutines);
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

  // Handle refresh
  const handleRefresh = async () => {
    console.log('Refreshing progress screen...');
    await refreshProgress();
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
          />
        );
        
      case 'challenges':
        return (
          <Challenges
            isPremium={isPremium}
            onUpgradeToPremium={handleUpgradeToPremium}
          />
        );
        
      case 'rewards':
        return (
          <Rewards
            userLevel={userLevel}
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