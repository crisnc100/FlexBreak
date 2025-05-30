import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface Stats {
  level: number;
  totalXP: number;
  xpToNextLevel: number;
  percentToNextLevel: number;
  currentStreak: number;
}

interface StatsCardProps {
  stats: Stats;
  bobProgress: any;
}

/**
 * StatsCard component displays the user's current gamification stats.
 * Extracted from BobSimulatorScreen to keep that screen leaner.
 */
const StatsCard: React.FC<StatsCardProps> = ({ stats, bobProgress }) => {
  const { theme, isDark, isSunset } = useTheme();

  if (!bobProgress) return null;

  const statistics = bobProgress.statistics || {};
  const routines = statistics.totalRoutines || 0;
  const minutes = statistics.totalMinutes || 0;

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.cardHeader}>
        <Ionicons name="stats-chart" size={24} color={theme.accent} />
        <Text style={[styles.cardTitle, { color: theme.text }]}>Current Stats</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>{stats.level}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Level</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>{stats.totalXP}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total XP</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>{stats.currentStreak}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Streak</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>{routines}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Routines</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>{minutes}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Minutes</Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: theme.text }]}>{stats.xpToNextLevel}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>To Next</Text>
        </View>
      </View>

      {/* Level progress bar */}
      <View style={styles.progressBarContainer}>
        <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>Progress to Level {stats.level + 1}</Text>
        <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]}>
          <View
            style={[styles.progressBarFill, {
              width: `${Math.min(100, Math.max(0, stats.percentToNextLevel))}%`,
              backgroundColor: theme.accent,
            }]} />
        </View>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}> {stats.totalXP} / {stats.totalXP + stats.xpToNextLevel} XP </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold' },
  statLabel: { fontSize: 12, marginTop: 4 },
  progressBarContainer: { padding: 16, paddingTop: 8 },
  progressLabel: { fontSize: 12, marginBottom: 4 },
  progressBarBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: '100%' },
  progressText: { fontSize: 12, textAlign: 'right' },
});

export default StatsCard; 