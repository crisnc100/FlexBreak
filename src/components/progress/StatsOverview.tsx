import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface StatsOverviewProps {
  totalMinutes: number;
  currentStreak: number;
  totalRoutines: number;
  isTodayComplete?: boolean; // Add this prop
  theme?: any; // Optional theme prop passed from parent
  isDark?: boolean; // Optional isDark flag passed from parent
}

const StatsOverview: React.FC<StatsOverviewProps> = ({
  totalMinutes,
  currentStreak,
  totalRoutines,
  isTodayComplete = false, // Default to false if not provided
  theme: propTheme,
  isDark: propIsDark
}) => {
  // Use theme from props if provided, otherwise use theme context
  const themeContext = useTheme();
  const theme = propTheme || themeContext.theme;
  const isDark = propIsDark !== undefined ? propIsDark : themeContext.isDark;

  // Determine if today's activity is complete - use the prop instead of calculating here
  const today = new Date();
  const todayStr = today.toLocaleDateString();
  
  // For streak of 5+ days, show a warning indicator if today's activity isn't done
  const showWarning = currentStreak >= 5 && !isTodayComplete;

  return (
    <View style={{ backgroundColor: isDark ? theme.background : 'transparent' }}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: isDark ? theme.text : '#333' }]}>
          Your Progress
        </Text>
        <Text style={[styles.headerSubtitle, { color: isDark ? theme.textSecondary : '#666' }]}>
          Keep up the great work!
        </Text>
      </View>
      
      <View style={styles.statsGrid}>
        {/* Total Minutes Stat */}
        <View style={[styles.statCard, { 
          backgroundColor: isDark ? theme.cardBackground : '#FFF',
          shadowColor: isDark ? 'rgba(0,0,0,0.5)' : '#000',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
          borderWidth: isDark ? 1 : 0
        }]}>
          <View style={[styles.statIconContainer, { 
            backgroundColor: isDark ? 'rgba(76, 175, 80, 0.2)' : '#F0F0F0'
          }]}>
            <Ionicons name="time-outline" size={20} color="#4CAF50" />
          </View>
          <Text style={[styles.statValue, { color: isDark ? theme.text : '#333' }]}>
            {totalMinutes}
          </Text>
          <Text style={[styles.statLabel, { color: isDark ? theme.textSecondary : '#666' }]}>
            Total Minutes
          </Text>
        </View>
        
        {/* Streak Stat */}
        <View style={[styles.statCard, { 
          backgroundColor: isDark ? theme.cardBackground : '#FFF',
          shadowColor: isDark ? 'rgba(0,0,0,0.5)' : '#000',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
          borderWidth: isDark ? 1 : 0
        }]}>
          <View style={[styles.statIconContainer, { 
            backgroundColor: isDark ? showWarning ? 'rgba(255, 87, 34, 0.2)' : 'rgba(255, 152, 0, 0.2)' : '#F0F0F0'
          }]}>
            <Ionicons 
              name={showWarning ? "warning-outline" : "flame-outline"} 
              size={20} 
              color={showWarning ? "#FF5722" : "#FF9800"} 
            />
          </View>
          <Text style={[styles.statValue, { color: isDark ? theme.text : '#333' }]}>
            {currentStreak}
          </Text>
          <Text style={[styles.statLabel, { color: isDark ? theme.textSecondary : '#666' }]}>
            Day Streak{showWarning ? " (at risk)" : ""}
          </Text>
          {showWarning && (
            <Text style={[styles.streakNote, { color: '#FF5722' }]}>
              Complete today to maintain!
            </Text>
          )}
        </View>
        
        {/* Routines Stat */}
        <View style={[styles.statCard, { 
          backgroundColor: isDark ? theme.cardBackground : '#FFF',
          shadowColor: isDark ? 'rgba(0,0,0,0.5)' : '#000',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
          borderWidth: isDark ? 1 : 0
        }]}>
          <View style={[styles.statIconContainer, { 
            backgroundColor: isDark ? 'rgba(33, 150, 243, 0.2)' : '#F0F0F0'
          }]}>
            <Ionicons name="fitness-outline" size={20} color="#2196F3" />
          </View>
          <Text style={[styles.statValue, { color: isDark ? theme.text : '#333' }]}>
            {totalRoutines}
          </Text>
          <Text style={[styles.statLabel, { color: isDark ? theme.textSecondary : '#666' }]}>
            Routines
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  streakNote: {
    fontSize: 10,
    marginTop: 2,
    fontWeight: '500',
    textAlign: 'center',
  }
});

export default StatsOverview;