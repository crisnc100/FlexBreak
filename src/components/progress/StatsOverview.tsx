import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatsOverviewProps {
  totalMinutes: number;
  currentStreak: number;
  totalRoutines: number;
}

const StatsOverview: React.FC<StatsOverviewProps> = ({
  totalMinutes,
  currentStreak,
  totalRoutines
}) => {
  return (
    <>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Progress</Text>
        <Text style={styles.headerSubtitle}>Keep up the great work!</Text>
      </View>
      
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="time-outline" size={20} color="#4CAF50" />
          </View>
          <Text style={styles.statValue}>{totalMinutes}</Text>
          <Text style={styles.statLabel}>Total Minutes</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="flame-outline" size={20} color="#FF9800" />
          </View>
          <Text style={styles.statValue}>{currentStreak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        
        <View style={styles.statCard}>
          <View style={styles.statIconContainer}>
            <Ionicons name="fitness-outline" size={20} color="#2196F3" />
          </View>
          <Text style={styles.statValue}>{totalRoutines}</Text>
          <Text style={styles.statLabel}>Routines</Text>
        </View>
      </View>
    </>
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
});

export default StatsOverview; 