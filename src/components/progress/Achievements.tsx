import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useGamification } from '../../hooks/progress/useGamification';
import { LEVELS } from '../../utils/progress/xpManager';
import { useTheme } from '../../context/ThemeContext';
import { useLevelProgress } from '../../hooks/progress/useLevelProgress';
// Simple date formatter function to replace date-fns
const formatTimeAgo = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // Convert to seconds, minutes, hours, days
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 30) {
      const diffMonths = Math.floor(diffDays / 30);
      return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    }
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
    if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    }
    return 'just now';
  } catch (e) {
    console.warn('Error formatting date:', e);
    return '';
  }
};

// Enhanced achievement definitions with categories, XP rewards, and levels aligned with achievementManager.ts
const ACHIEVEMENTS = [
  // Beginner achievements (25-50 XP)
  {
    id: 'routine_5',
    title: 'Getting Started',
    description: 'Complete 5 stretching routines',
    icon: 'trophy-outline',
    requirement: 5,
    xp: 25,
    category: 'beginner',
    backendCategory: 'progress', 
    type: 'routine_count'
  },
  {
    id: 'streak_3',
    title: 'Getting Into It',
    description: 'Maintain a 3-day stretching streak',
    icon: 'flame-outline',
    requirement: 3,
    xp: 25,
    category: 'beginner',
    backendCategory: 'streaks',
    type: 'streak'
  },
  {
    id: 'streak_7',
    title: 'Weekly Warrior',
    description: 'Maintain a 7-day stretching streak',
    icon: 'calendar-outline',
    requirement: 7,
    xp: 50,
    category: 'beginner',
    backendCategory: 'streaks',
    type: 'streak'
  },
  {
    id: 'areas_3',
    title: 'Variety Beginner',
    description: 'Stretch 3 different body areas',
    icon: 'body-outline',
    requirement: 3,
    xp: 30,
    category: 'beginner',
    backendCategory: 'variety',
    type: 'area_variety'
  },
  {
    id: 'minutes_60',
    title: 'Time Investment',
    description: 'Complete 60 total minutes of stretching',
    icon: 'time-outline',
    requirement: 60,
    xp: 50,
    category: 'beginner',
    backendCategory: 'time',
    type: 'total_minutes'
  },
  
  // Intermediate achievements (50-100 XP)
  {
    id: 'areas_all',
    title: 'Variety Master',
    description: 'Stretch all body areas at least once',
    icon: 'body-outline',
    requirement: 6,
    xp: 75,
    category: 'intermediate',
    backendCategory: 'variety',
    type: 'area_variety'
  },
  {
    id: 'routine_20',
    title: 'Regular Stretcher',
    description: 'Complete 20 stretching routines',
    icon: 'trophy-outline',
    requirement: 20,
    xp: 75,
    category: 'intermediate',
    backendCategory: 'progress',
    type: 'routine_count'
  },
  {
    id: 'streak_14',
    title: 'Fortnight Flexer',
    description: 'Maintain a 14-day stretching streak',
    icon: 'flame-outline',
    requirement: 14,
    xp: 100,
    category: 'intermediate',
    backendCategory: 'streaks',
    type: 'streak'
  },
  {
    id: 'minutes_300',
    title: 'Dedicated Stretcher',
    description: 'Complete 300 total minutes of stretching',
    icon: 'hourglass-outline',
    requirement: 300,
    xp: 100,
    category: 'intermediate',
    backendCategory: 'time',
    type: 'total_minutes'
  },
  
  // Advanced achievements (100-200 XP)
  {
    id: 'routine_30',
    title: 'Stretch Master',
    description: 'Complete 30 stretching routines',
    icon: 'ribbon-outline',
    requirement: 30,
    xp: 100,
    category: 'advanced',
    backendCategory: 'progress',
    type: 'routine_count'
  },
  {
    id: 'streak_30',
    title: 'Monthly Milestone',
    description: 'Maintain a 30-day stretching streak',
    icon: 'calendar-number-outline',
    requirement: 30,
    xp: 200,
    category: 'advanced',
    backendCategory: 'streaks',
    type: 'streak'
  },
  {
    id: 'area_expert',
    title: 'Area Expert',
    description: 'Complete 15 routines in one body area',
    icon: 'fitness-outline',
    requirement: 15,
    xp: 150,
    category: 'advanced',
    backendCategory: 'variety',
    type: 'specific_area'
  },
  {
    id: 'routine_50',
    title: 'Flexibility Devotee',
    description: 'Complete 50 routines',
    icon: 'medal-outline',
    requirement: 50,
    xp: 200,
    category: 'advanced',
    backendCategory: 'progress',
    type: 'routine_count'
  },
  {
    id: 'minutes_1000',
    title: 'Time Dedication',
    description: 'Complete 1000 total minutes of stretching',
    icon: 'timer-outline',
    requirement: 1000,
    xp: 200,
    category: 'advanced',
    backendCategory: 'time',
    type: 'total_minutes'
  },
  
  // Elite achievements (300-500 XP)
  {
    id: 'routine_100',
    title: 'Stretch Guru',
    description: 'Complete 100 routines',
    icon: 'medal-outline',
    requirement: 100,
    xp: 300,
    category: 'elite',
    backendCategory: 'progress',
    type: 'routine_count'
  },
  {
    id: 'streak_60',
    title: 'Iron Flexibility',
    description: 'Maintain a 60-day stretching streak',
    icon: 'infinite-outline',
    requirement: 60,
    xp: 350,
    category: 'elite',
    backendCategory: 'streaks',
    type: 'streak'
  },
  {
    id: 'streak_365',
    title: 'Year of Flexibility',
    description: 'Maintain a 365-day stretching streak',
    icon: 'calendar-outline',
    requirement: 365,
    xp: 500,
    category: 'elite',
    backendCategory: 'streaks',
    type: 'streak'
  },
  {
    id: 'master_all_areas',
    title: 'Master of All Areas',
    description: 'Complete 30 routines in each body area',
    icon: 'grid-outline',
    requirement: 30,
    xp: 400,
    category: 'elite',
    backendCategory: 'variety',
    type: 'specific_area'
  },
  {
    id: 'routine_200',
    title: 'Flexibility Legend',
    description: 'Complete 200 routines',
    icon: 'star-outline',
    requirement: 200,
    xp: 500,
    category: 'elite',
    backendCategory: 'progress',
    type: 'routine_count'
  }
];

// Update the routine XP calculation to match xpManager.ts
export const calculateRoutineXP = (
  routineDuration: number = 10,
  isFirstRoutineEver: boolean = false,
  streakLength: number = 0
): number => {
  let xp = 0;
  
  // Base XP based on duration (5/10/15 min brackets)
  if (routineDuration <= 5) {
    xp = 30; // 5 min routine
  } else if (routineDuration <= 10) {
    xp = 60; // 10 min routine
  } else {
    xp = 90; // 15+ min routine
  }
  
  // Bonus for first ever routine
  if (isFirstRoutineEver) {
    xp += 50;
  }
  
  return xp;
};

// Calculate total XP from achievements
export const calculateTotalXP = (achievements: Array<{id: string; xp: number}>): number => {
  return achievements.reduce((total, achievement) => total + achievement.xp, 0);
};

// Achievement card component with progress indicator and completion time
const AchievementCard = ({ achievement, onPress, isDark, theme }) => (
  <TouchableOpacity 
    style={[
      styles.achievementCard, 
      !achievement.isUnlocked && styles.achievementLocked,
      achievement.isUnlocked && styles.achievementUnlocked,
      { 
        backgroundColor: isDark ? theme.cardBackground : '#FFF',
        borderColor: achievement.isUnlocked 
          ? isDark ? theme.accent : '#4CAF50'
          : isDark ? 'rgba(255,255,255,0.1)' : '#EEEEEE'
      }
    ]}
    onPress={() => onPress(achievement)}
  >
    <View style={[
      styles.achievementIconContainer, 
      achievement.isUnlocked && styles.achievementIconContainerUnlocked,
      achievement.currentProgress > 0 && !achievement.isUnlocked && styles.achievementIconContainerInProgress,
      {
        backgroundColor: achievement.isUnlocked 
          ? isDark ? theme.accent : '#4CAF50'
          : achievement.currentProgress > 0 
            ? isDark ? 'rgba(76,175,80,0.3)' : '#E8F5E9'
            : isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0'
      }
    ]}>
      <Ionicons 
        name={achievement.icon} 
        size={24} 
        color={achievement.isUnlocked ? '#FFFFFF' : (achievement.currentProgress > 0 ? (isDark ? theme.accent : '#4CAF50') : (isDark ? 'rgba(255,255,255,0.5)' : '#999'))} 
      />
    </View>
    <Text style={[
      styles.achievementTitle, 
      !achievement.isUnlocked && styles.achievementLockedText,
      achievement.currentProgress > 0 && !achievement.isUnlocked && styles.achievementInProgressText,
      { 
        color: achievement.isUnlocked 
          ? isDark ? theme.text : '#333'
          : achievement.currentProgress > 0 
            ? isDark ? theme.accent : '#4CAF50'
            : isDark ? 'rgba(255,255,255,0.5)' : '#999'
      }
    ]}>
      {achievement.title}
    </Text>
    <Text style={[
      styles.achievementDescription,
      { color: isDark ? theme.textSecondary : '#666' }
    ]}>
      {achievement.description}
    </Text>
    
    {achievement.isUnlocked ? (
      <>
      <View style={styles.xpBadge}>
        <Text style={styles.xpText}>+{achievement.xp} XP</Text>
        </View>
        {achievement.completedTimeAgo && (
          <Text style={[styles.completionDate, { color: isDark ? 'rgba(255,255,255,0.5)' : '#666' }]}>
            Earned {achievement.completedTimeAgo}
          </Text>
        )}
      </>
    ) : achievement.currentProgress > 0 ? (
      // Show progress for in-progress achievements
      <View style={styles.progressWrapper}>
        <View style={[styles.progressMiniContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0' }]}>
          <View 
            style={[
              styles.progressMiniBar, 
              { 
                width: `${achievement.progressPercentage}%`,
                backgroundColor: isDark ? theme.accent : '#8BC34A'
              }
            ]}
          />
        </View>
        <Text style={[styles.progressText, { color: isDark ? 'rgba(255,255,255,0.6)' : '#666' }]}>
          {achievement.currentProgress}/{achievement.requirement} ({achievement.progressPercentage}%)
        </Text>
      </View>
    ) : (
      // Show locked indicator for completely locked achievements
      <View style={[styles.lockedBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEEEEE' }]}>
        <Text style={[styles.lockedText, { color: isDark ? 'rgba(255,255,255,0.5)' : '#999' }]}>Locked</Text>
      </View>
    )}
  </TouchableOpacity>
);

// Add an empty state component for when there are no achievements yet
const EmptyAchievements = ({ isDark, theme }) => (
  <View style={[styles.emptyContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9F9F9' }]}>
    <Ionicons name="trophy-outline" size={64} color={isDark ? 'rgba(255,255,255,0.2)' : "#CCCCCC"} />
    <Text style={[styles.emptyTitle, { color: isDark ? theme.textSecondary : '#666' }]}>No Achievements Yet</Text>
    <Text style={[styles.emptyDescription, { color: isDark ? 'rgba(255,255,255,0.5)' : '#999' }]}>
      Complete your first stretching routines to start earning achievements!
    </Text>
  </View>
);

// Define the props interface
interface AchievementsProps {
  totalRoutines?: number;
  currentStreak?: number;
  areaBreakdown?: Record<string, number>;
  totalXP?: number;
  level?: number;
  totalMinutes?: number;
  completedAchievements?: Array<{id: string; title: string; xp: number; dateCompleted?: string}>;
  isDark?: boolean;
}

const Achievements: React.FC<AchievementsProps> = ({
  totalRoutines: propsRoutines,
  currentStreak: propsStreak,
  areaBreakdown: propsAreas,
  totalXP: propsTotalXP,
  level: propsLevel,
  totalMinutes: propsMinutes,
  completedAchievements: propsAchievements
}) => {
  // Use gamification hook
  const { gamificationSummary, isLoading, refreshData } = useGamification();
  
  // Local state for UI
  const [unlockedAchievements, setUnlockedAchievements] = useState<any[]>([]);
  const [achievementsByCategory, setAchievementsByCategory] = useState<Record<string, any[]>>({});
  const [refreshing, setRefreshing] = useState(false);
  const { theme, isDark } = useTheme();
  // Handle pull-to-refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshData();
    } finally {
      setRefreshing(false);
    }
  }, [refreshData]);
  
  // Explicitly refresh data when component mounts
  useEffect(() => {
    console.log('Achievements component mounted, refreshing data...');
    refreshData();
  }, [refreshData]);
  
  // Setup local values using either gamification data or props (for backward compatibility)
  useEffect(() => {
    if (gamificationSummary) {
      console.log('Gamification summary received:', gamificationSummary);
      // Use data from gamification hook 
      const { achievements, statistics, level, totalXP } = gamificationSummary;
      
      // Get list of completed achievement IDs
      const completedAchievementIds = achievements?.completed?.map(a => a.id) || [];
      
      // Get in-progress achievements
      const inProgressAchievements = achievements?.inProgress || [];
      
      // Process achievements for display
      const processedAchievements = ACHIEVEMENTS.map(achievement => {
        // Find the backend achievement data
        const completedAchievement = achievements?.completed?.find(a => a.id === achievement.id);
        const inProgressAchievement = inProgressAchievements.find(a => a.id === achievement.id);
        
        // Determine if it's unlocked and get progress
        const isUnlocked = !!completedAchievement;
        const currentProgress = inProgressAchievement?.progress || 0;
        const progressPercentage = Math.min(100, Math.round((currentProgress / achievement.requirement) * 100));
        
        // Format completion date if available
        let completedTimeAgo = '';
        if (completedAchievement?.dateCompleted) {
          completedTimeAgo = formatTimeAgo(completedAchievement.dateCompleted);
        }
        
        return {
          ...achievement,
          isUnlocked,
          currentProgress,
          progressPercentage,
          dateCompleted: completedAchievement?.dateCompleted,
          completedTimeAgo
        };
      });
      
      // Set the processed achievements
      setUnlockedAchievements(processedAchievements);
      
      // Group achievements by UI category (beginner, intermediate, etc.)
      const groupedAchievements = processedAchievements.reduce((acc, achievement) => {
        const category = achievement.category || 'other';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(achievement);
        return acc;
      }, {});
      
      // For each category, sort achievements by requirement level (easiest first)
      Object.keys(groupedAchievements).forEach(category => {
        groupedAchievements[category].sort((a, b) => a.requirement - b.requirement);
      });
      
      setAchievementsByCategory(groupedAchievements);
    }
  }, [gamificationSummary, propsAchievements]);
  
  // Handle achievement tap
  const handleAchievementPress = (achievement) => {
    // Show achievement details or feedback
    console.log(`Tapped achievement: ${achievement.title}`);
  };
  
  // Use the useLevelProgress hook to get consistent level progress data
  const { 
    currentLevel, 
    currentLevelData,
    nextLevelData,
    totalXP: calculatedTotalXP, 
    xpProgress,
    xpToNextLevel
  } = useLevelProgress();
  
  // Use merged values from both sources
  const totalRoutines = gamificationSummary?.statistics?.routinesCompleted || propsRoutines || 0;
  const currentStreak = gamificationSummary?.statistics?.currentStreak || propsStreak || 0;
  const totalMinutes = gamificationSummary?.statistics?.totalMinutes || propsMinutes || 0;
  
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading achievements...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: isDark ? theme.background : '#FFF' }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[isDark ? theme.accent : '#4CAF50']}
          tintColor={isDark ? theme.accent : '#4CAF50'}
          title="Refreshing achievements..."
          titleColor={isDark ? theme.textSecondary : '#666'}
        />
      }
    >
      {/* Level progress section */}
      <View style={[styles.levelSection, { 
        backgroundColor: isDark ? theme.cardBackground : '#FFF',
        shadowColor: isDark ? 'rgba(0,0,0,0.5)' : '#000'
      }]}>
        <View style={styles.levelHeader}>
          <View>
            <Text style={[styles.levelTitle, { color: isDark ? theme.text : '#333' }]}>Level {currentLevel}</Text>
            <Text style={[styles.levelSubtitle, { color: isDark ? theme.textSecondary : '#666' }]}>{currentLevelData?.title || ''}</Text>
          </View>
          <View style={[styles.xpContainer, { 
            backgroundColor: isDark ? 'rgba(255,249,196,0.2)' : '#FFF9C4',
            borderColor: isDark ? 'rgba(255,224,130,0.5)' : '#FFE082'
          }]}>
            <Ionicons name="flash" size={18} color={isDark ? "#FFD700" : "#FFD700"} />
            <Text style={[styles.xpTotal, { color: isDark ? '#FFD700' : '#FF8F00' }]}>{calculatedTotalXP} XP</Text>
          </View>
        </View>
        
        <View style={[styles.progressContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0' }]}>
          <LinearGradient
            colors={isDark ? ['#388E3C', '#7CB342'] : ['#4CAF50', '#8BC34A']}
            style={[styles.progressBar, { width: `${xpProgress * 100}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
        
        {nextLevelData ? (
          <Text style={[styles.nextLevelText, { color: isDark ? theme.textSecondary : '#666' }]}>
            {xpToNextLevel} XP to Level {nextLevelData.level}: {nextLevelData.title}
          </Text>
        ) : (
          <Text style={[styles.nextLevelText, { color: isDark ? theme.textSecondary : '#666' }]}>
            Maximum level reached! Congratulations!
          </Text>
        )}
      </View>
      
      {/* Achievements section */}
      <View style={[styles.achievementsSection, { 
        backgroundColor: isDark ? theme.cardBackground : '#FFF',
        shadowColor: isDark ? 'rgba(0,0,0,0.5)' : '#000'
      }]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: isDark ? theme.text : '#333' }]}>Achievements</Text>
          {/* Achievement stats summary */}
          <View style={[styles.achievementStats, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f5f5f5' }]}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: isDark ? theme.accent : '#4CAF50' }]}>
                {unlockedAchievements.length > 0 
                  ? Object.values(unlockedAchievements).filter(a => a.isUnlocked).length 
                  : 0}
              </Text>
              <Text style={[styles.statLabel, { color: isDark ? theme.textSecondary : '#666' }]}>Earned</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: isDark ? theme.accent : '#4CAF50' }]}>
                {unlockedAchievements.length > 0
                  ? Object.values(unlockedAchievements).filter(a => a.currentProgress > 0 && !a.isUnlocked).length
                  : 0}
              </Text>
              <Text style={[styles.statLabel, { color: isDark ? theme.textSecondary : '#666' }]}>In Progress</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: isDark ? theme.accent : '#4CAF50' }]}>
                {unlockedAchievements.length}
              </Text>
              <Text style={[styles.statLabel, { color: isDark ? theme.textSecondary : '#666' }]}>Total</Text>
            </View>
          </View>
        </View>
        
        {Object.keys(achievementsByCategory).length === 0 ? (
          <EmptyAchievements isDark={isDark} theme={theme} />
        ) : (
          <>
            {/* Beginner achievements - only show if there are achievements in this category */}
            {achievementsByCategory['beginner']?.length > 0 && (
              <>
                <View style={[styles.categoryHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEEEEE' }]}>
                  <Text style={[styles.categoryTitle, { color: isDark ? theme.text : '#555' }]}>Beginner</Text>
                  <Text style={[styles.categoryCount, { color: isDark ? theme.textSecondary : '#666' }]}>
                    {achievementsByCategory['beginner'].filter(a => a.isUnlocked).length} / {achievementsByCategory['beginner'].length}
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.achievementsContainer}>
                    {achievementsByCategory['beginner'].map(achievement => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        onPress={handleAchievementPress}
                        isDark={isDark}
                        theme={theme}
                      />
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
        
            {/* Intermediate achievements - only show if there are achievements in this category */}
            {achievementsByCategory['intermediate']?.length > 0 && (
              <>
                <View style={[styles.categoryHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEEEEE' }]}>
                  <Text style={[styles.categoryTitle, { color: isDark ? theme.text : '#555' }]}>Intermediate</Text>
                  <Text style={[styles.categoryCount, { color: isDark ? theme.textSecondary : '#666' }]}>
                    {achievementsByCategory['intermediate'].filter(a => a.isUnlocked).length} / {achievementsByCategory['intermediate'].length}
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.achievementsContainer}>
                    {achievementsByCategory['intermediate'].map(achievement => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        onPress={handleAchievementPress}
                        isDark={isDark}
                        theme={theme}
                      />
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
        
            {/* Advanced achievements - only show if there are achievements in this category */}
            {achievementsByCategory['advanced']?.length > 0 && (
              <>
                <View style={[styles.categoryHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEEEEE' }]}>
                  <Text style={[styles.categoryTitle, { color: isDark ? theme.text : '#555' }]}>Advanced</Text>
                  <Text style={[styles.categoryCount, { color: isDark ? theme.textSecondary : '#666' }]}>
                    {achievementsByCategory['advanced'].filter(a => a.isUnlocked).length} / {achievementsByCategory['advanced'].length}
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.achievementsContainer}>
                    {achievementsByCategory['advanced'].map(achievement => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        onPress={handleAchievementPress}
                        isDark={isDark}
                        theme={theme}
                      />
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
        
            {/* Elite achievements - only show if there are achievements in this category */}
            {achievementsByCategory['elite']?.length > 0 && (
              <>
                <View style={[styles.categoryHeader, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEEEEE' }]}>
                  <Text style={[styles.categoryTitle, { color: isDark ? theme.text : '#555' }]}>Elite</Text>
                  <Text style={[styles.categoryCount, { color: isDark ? theme.textSecondary : '#666' }]}>
                    {achievementsByCategory['elite'].filter(a => a.isUnlocked).length} / {achievementsByCategory['elite'].length}
                  </Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.achievementsContainer}>
                    {achievementsByCategory['elite'].map(achievement => (
                      <AchievementCard
                        key={achievement.id}
                        achievement={achievement}
                        onPress={handleAchievementPress}
                        isDark={isDark}
                        theme={theme}
                      />
                    ))}
                  </View>
                </ScrollView>
              </>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  levelSection: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  levelSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  xpTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF8F00',
    marginLeft: 4,
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  nextLevelText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  achievementsSection: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  achievementStats: {
    flexDirection: 'row',
    marginTop: 8,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
  },
  categoryCount: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  achievementsContainer: {
    flexDirection: 'row',
    paddingBottom: 8,
  },
  achievementCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
    alignItems: 'center',
    width: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  achievementLocked: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  achievementUnlocked: {
    borderColor: '#4CAF50',
    borderWidth: 1,
    shadowColor: '#4CAF50',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 3,
  },
  achievementIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementIconContainerUnlocked: {
    backgroundColor: '#4CAF50',
  },
  achievementIconContainerInProgress: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  achievementLockedText: {
    color: '#999',
  },
  achievementInProgressText: {
    color: '#4CAF50',
  },
  achievementDescription: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  xpBadge: {
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFD600',
  },
  xpText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF8F00',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressWrapper: {
    marginTop: 4,
    alignItems: 'center',
  },
  progressMiniContainer: {
    width: 80,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 2,
  },
  progressMiniBar: {
    height: '100%',
    backgroundColor: '#8BC34A',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: '#666',
  },
  lockedBadge: {
    backgroundColor: '#EEEEEE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginTop: 4,
  },
  lockedText: {
    fontSize: 10,
    color: '#999',
  },
  completionDate: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic'
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
    marginVertical: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginHorizontal: 24,
  },
});

export default Achievements; 