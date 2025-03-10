import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getIsPremium, getProgress } from '../utils/storage';
import { ProgressEntry, BodyArea } from '../types';
import { BarChart, LineChart, PieChart } from 'react-native-chart-kit';
import SubscriptionModal from '../components/SubscriptionModal';
import { usePremium } from '../context/PremiumContext';

// Add these achievement definitions at the top
const ACHIEVEMENTS = [
  {
    id: 'first_stretch',
    title: 'First Stretch!',
    description: 'Completed your first stretching routine',
    icon: 'star-outline',
    requirement: 1
  },
  {
    id: 'consistent_3',
    title: 'Getting Into It',
    description: '3-day streak achieved',
    icon: 'flame-outline',
    requirement: 3
  },
  {
    id: 'variety_master',
    title: 'Variety Master',
    description: 'Tried all body areas',
    icon: 'body-outline',
    requirement: 6 // number of different areas
  },
  {
    id: 'dedication',
    title: 'Dedication',
    description: 'Completed 10 routines',
    icon: 'trophy-outline',
    requirement: 10
  }
];

// Add this component for achievements
const AchievementCard = ({ achievement, isUnlocked }) => (
  <View style={[styles.achievementCard, !isUnlocked && styles.achievementLocked]}>
    <Ionicons 
      name={achievement.icon} 
      size={24} 
      color={isUnlocked ? '#4CAF50' : '#999'} 
    />
    <Text style={[styles.achievementTitle, !isUnlocked && styles.achievementLockedText]}>
      {achievement.title}
    </Text>
    <Text style={styles.achievementDescription}>
      {achievement.description}
    </Text>
  </View>
);

export default function ProgressScreen({ navigation }) {
  const { isPremium } = usePremium();
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

  // Day names for labels
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    const loadData = async () => {
      try {
        if (isPremium) {
          const progressData = await getProgress();
          setProgressData(progressData);
          calculateStats(progressData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
  }, [isPremium]);

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

  const calculateStreak = (data) => {
    if (data.length === 0) return 0;
    
    // Sort dates newest to oldest
    const sortedDates = data
      .map(entry => new Date(entry.date).setHours(0, 0, 0, 0))
      .sort((a, b) => b - a); // Sort descending

    // Remove duplicates (multiple routines on same day)
    const uniqueDates = [...new Set(sortedDates)];
    
    const today = new Date().setHours(0, 0, 0, 0);
    
    // Check if they've done a routine today
    const hasWorkoutToday = uniqueDates[0] === today;
    
    let streak = hasWorkoutToday ? 1 : 0;
    if (streak === 0) return 0; // No streak if didn't work out today

    // Count consecutive days
    let prevDate = uniqueDates[0];
    for (let i = 1; i < uniqueDates.length; i++) {
      const diff = (prevDate - uniqueDates[i]) / (1000 * 60 * 60 * 24);
      if (diff === 1) {
        streak++;
        prevDate = uniqueDates[i];
      } else {
        break;
      }
    }

    return streak;
  };

  const calculateWeeklyActivity = (data) => {
    const last7Days = Array(7).fill(0);
    const today = new Date().setHours(0, 0, 0, 0);

    data.forEach(entry => {
      const entryDate = new Date(entry.date).setHours(0, 0, 0, 0);
      const daysDiff = Math.floor((today - entryDate) / (1000 * 60 * 60 * 24));
      if (daysDiff < 7) {
        last7Days[daysDiff]++;
      }
    });

    return last7Days.reverse();
  };

  const calculateDayOfWeekActivity = (data) => {
    const daysOfWeek = Array(7).fill(0);

    data.forEach(entry => {
      const date = new Date(entry.date);
      // Adjust to make Monday index 0
      const dayOfWeek = (date.getDay() + 6) % 7;
      daysOfWeek[dayOfWeek]++;
    });

    return daysOfWeek;
  };

  const calculateActiveDays = (data) => {
    if (data.length === 0) return 0;
    
    const today = new Date().setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29); // 30 days including today
    
    // Get unique dates in the last 30 days
    const uniqueDates = new Set();
    
    data.forEach(entry => {
      const entryDate = new Date(entry.date).setHours(0, 0, 0, 0);
      if (entryDate >= thirtyDaysAgo && entryDate <= today) {
        uniqueDates.add(entryDate);
      }
    });
    
    return uniqueDates.size;
  };

  // Convert area breakdown to chart data
  const getAreaBreakdownChartData = () => {
    const colors = [
      '#4CAF50', // Primary green
      '#8BC34A', // Light green
      '#2196F3', // Blue
      '#FF9800', // Orange
      '#9C27B0', // Purple
      '#F44336'  // Red
    ];
    
    return Object.entries(stats.areaBreakdown)
      .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
      .map(([area, count], index) => {
        return {
          name: area,
          count: count,
          color: colors[index % colors.length],
          legendFontColor: '#7F7F7F',
          legendFontSize: 12
        };
      });
  };

  // Calculate consistency percentage
  const getConsistencyPercentage = () => {
    return Math.round((stats.activeRoutineDays / 30) * 100);
  };

  // Find most active day
  const getMostActiveDay = () => {
    if (stats.dayOfWeekBreakdown.every(count => count === 0)) {
      return 'N/A';
    }
    
    const maxIndex = stats.dayOfWeekBreakdown.indexOf(
      Math.max(...stats.dayOfWeekBreakdown)
    );
    
    return dayNames[maxIndex];
  };

  // Update the stretching patterns section
  const renderStretchingPatterns = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Stretching Patterns</Text>
      <View style={styles.patternContainer}>
        <View style={styles.patternLegend}>
          <Text style={styles.patternLabel}>Most Active Day:</Text>
          <Text style={styles.patternValue}>
            {dayNames[stats.dayOfWeekBreakdown.indexOf(Math.max(...stats.dayOfWeekBreakdown))]}
          </Text>
        </View>
      </View>
      
      {/* Chart in its own container */}
      <View style={styles.chartContainer}>
        <BarChart
          data={{
            labels: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
            datasets: [{
              data: stats.dayOfWeekBreakdown.map(val => Math.max(val, 0))
            }]
          }}
          width={Dimensions.get('window').width - 64}
          height={160}
          yAxisLabel=""
          yAxisSuffix=""
          chartConfig={{
            backgroundColor: '#FFF',
            backgroundGradientFrom: '#FFF',
            backgroundGradientTo: '#FFF',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            barPercentage: 0.7,
          }}
        />
      </View>
    </View>
  );

  // Premium locked screen
  if (!isPremium) {
    return (
      <View style={styles.premiumContainer}>
        <Ionicons name="stats-chart" size={80} color="#CCCCCC" />
        <Text style={styles.premiumTitle}>Track Your Progress</Text>
        <Text style={styles.premiumSubtitle}>
          Unlock detailed stats, streaks, and insights with Premium
        </Text>
        <View style={styles.premiumFeatures}>
          <View style={styles.premiumFeatureItem}>
            <Ionicons name="calendar" size={24} color="#FF9800" />
            <Text style={styles.premiumFeatureText}>Track your stretching journey</Text>
          </View>
          <View style={styles.premiumFeatureItem}>
            <Ionicons name="analytics" size={24} color="#FF9800" />
            <Text style={styles.premiumFeatureText}>See area focus breakdown</Text>
          </View>
          <View style={styles.premiumFeatureItem}>
            <Ionicons name="trending-up" size={24} color="#FF9800" />
            <Text style={styles.premiumFeatureText}>Monitor your consistency</Text>
          </View>
        </View>
        <TouchableOpacity 
          style={styles.premiumButton}
          onPress={() => setSubscriptionModalVisible(true)}
        >
          <Text style={styles.premiumButtonText}>Upgrade to Premium</Text>
        </TouchableOpacity>
        
        <SubscriptionModal 
          visible={subscriptionModalVisible}
          onClose={() => setSubscriptionModalVisible(false)}
        />
      </View>
    );
  }

  // Empty state
  if (progressData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="fitness-outline" size={80} color="#CCCCCC" />
        <Text style={styles.emptyTitle}>No Progress Yet</Text>
        <Text style={styles.emptySubtitle}>
          Complete your first stretching routine to start tracking your progress
        </Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.createButtonText}>Start a Routine</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Stats Overview */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Progress</Text>
        <Text style={styles.headerSubtitle}>Keep up the great work!</Text>
      </View>
      
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="time-outline" size={20} color="#4CAF50" />
          </View>
          <Text style={styles.statValue}>{stats.totalMinutes}</Text>
          <Text style={styles.statLabel}>Total Minutes</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="flame-outline" size={20} color="#FF9800" />
          </View>
          <Text style={styles.statValue}>{stats.currentStreak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="fitness-outline" size={20} color="#2196F3" />
          </View>
          <Text style={styles.statValue}>{stats.totalRoutines}</Text>
          <Text style={styles.statLabel}>Routines</Text>
        </View>
      </View>

      {/* Consistency Insights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Consistency Insights</Text>
        <View style={styles.insightRow}>
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>30-Day Activity</Text>
            <Text style={styles.insightValue}>{getConsistencyPercentage()}%</Text>
            <Text style={styles.insightDescription}>
              {stats.activeRoutineDays} active days in the last 30 days
            </Text>
          </View>
          
          <View style={styles.insightCard}>
            <Text style={styles.insightLabel}>Most Active</Text>
            <Text style={styles.insightValue}>{getMostActiveDay()}</Text>
            <Text style={styles.insightDescription}>
              Your most consistent stretching day
            </Text>
          </View>
        </View>
      </View>

      {/* Area Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Focus Areas</Text>
        {Object.keys(stats.areaBreakdown).length > 0 ? (
          <View>
            <PieChart
              data={getAreaBreakdownChartData()}
              width={Dimensions.get('window').width - 32}
              height={180}
              chartConfig={{
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="count"
              backgroundColor="transparent"
              paddingLeft="15"
              absolute
            />
            <View style={styles.areaBreakdownList}>
              {Object.entries(stats.areaBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([area, count], index) => (
                  <View key={area} style={styles.areaBreakdownItem}>
                    <Text style={styles.areaBreakdownName}>{area}</Text>
                    <Text style={styles.areaBreakdownCount}>
                      {count} {count === 1 ? 'activity' : 'activities'} 
                      {' '}({Math.round((count / stats.totalRoutines) * 100)}%)
                    </Text>
                  </View>
                ))
              }
            </View>
          </View>
        ) : (
          <Text style={styles.emptyText}>Complete some routines to see your focus area breakdown</Text>
        )}
      </View>

      {/* Weekly Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Weekly Activity</Text>
        {stats.weeklyActivity.some(val => val > 0) ? (
          <LineChart
            data={{
              labels: dayNames,
              datasets: [{
                data: stats.weeklyActivity.map(val => Math.max(val, 0)) // Ensure no negative values
              }]
            }}
            width={Dimensions.get('window').width - 32}
            height={180}
            yAxisInterval={1}
            chartConfig={{
              backgroundColor: '#FFF',
              backgroundGradientFrom: '#FFF',
              backgroundGradientTo: '#FFF',
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: "6",
                strokeWidth: "2",
                stroke: "#4CAF50"
              }
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
          />
        ) : (
          <Text style={styles.emptyText}>Complete some routines to see your weekly activity</Text>
        )}
      </View>
      
      {/* Favorite Day */}
      {renderStretchingPatterns()}
      
      {/* Tips based on data */}
      <View style={styles.tipSection}>
        <Ionicons name="bulb-outline" size={24} color="#FF9800" />
        <Text style={styles.tipText}>
          {stats.currentStreak > 0 
            ? `Great job on your ${stats.currentStreak}-day streak! Keep it going tomorrow.` 
            : "Try to stretch daily to build a consistent habit."}
        </Text>
      </View>
      
      {/* Achievements */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <View style={styles.achievementsContainer}>
          {ACHIEVEMENTS.map(achievement => (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              isUnlocked={
                (achievement.id === 'first_stretch' && stats.totalRoutines >= 1) ||
                (achievement.id === 'consistent_3' && stats.currentStreak >= 3) ||
                (achievement.id === 'variety_master' && Object.keys(stats.areaBreakdown).length >= 6) ||
                (achievement.id === 'dedication' && stats.totalRoutines >= 10)
              }
            />
          ))}
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          DeskStretch Premium
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  section: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  insightCard: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
  },
  insightLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  insightDescription: {
    fontSize: 12,
    color: '#666',
  },
  areaBreakdownList: {
    marginTop: 16,
  },
  areaBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  areaBreakdownName: {
    fontSize: 16,
    color: '#333',
  },
  areaBreakdownCount: {
    fontSize: 14,
    color: '#666',
  },
  tipSection: {
    backgroundColor: '#FFF9E6',
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  tipText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
  },
  
  // Premium screen styles
  premiumContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  premiumTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  premiumSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  premiumFeatures: {
    width: '100%',
    marginBottom: 32,
  },
  premiumFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  premiumFeatureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  premiumButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  premiumButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Empty state styles
  emptyContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // Achievement styles
  achievementCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 8,
    alignItems: 'center',
  },
  achievementLocked: {
    backgroundColor: '#F0F0F0',
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  achievementLockedText: {
    color: '#999',
  },
  achievementDescription: {
    fontSize: 12,
    color: '#666',
  },
  patternContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  patternLegend: {
    flex: 1,
  },
  patternLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  patternValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  chartContainer: {
    marginTop: 16,
  },
  achievementsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});