import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { BodyArea, Duration } from '../../../types';

type RoutineStatsProps = {
  area: BodyArea;
  duration: Duration;
  numStretches: number;
  showAnyLevelUp: boolean;
  theme: any;
};

const RoutineStats: React.FC<RoutineStatsProps> = ({
  area,
  duration,
  numStretches,
  showAnyLevelUp,
  theme
}) => {
  return (
    <View style={[
      styles.statsContainer,
      showAnyLevelUp && styles.reducedMargin
    ]}>
      <View style={styles.statItem}>
        <Ionicons name="time-outline" size={showAnyLevelUp ? 20 : 24} color={theme.textSecondary} />
        <Text style={[
          styles.statValue, 
          showAnyLevelUp && styles.statValueCompact,
          { color: theme.text }
        ]}>{duration} mins</Text>
        <Text style={[
          styles.statLabel, 
          showAnyLevelUp && styles.statLabelCompact,
          { color: theme.textSecondary }
        ]}>Duration</Text>
      </View>
      
      <View style={styles.statItem}>
        <Ionicons name="fitness-outline" size={showAnyLevelUp ? 20 : 24} color={theme.textSecondary} />
        <Text style={[
          styles.statValue, 
          showAnyLevelUp && styles.statValueCompact,
          { color: theme.text }
        ]}>{numStretches}</Text>
        <Text style={[
          styles.statLabel, 
          showAnyLevelUp && styles.statLabelCompact,
          { color: theme.textSecondary }
        ]}>Stretches</Text>
      </View>
      
      <View style={styles.statItem}>
        <Ionicons name="body-outline" size={showAnyLevelUp ? 20 : 24} color={theme.textSecondary} />
        <Text style={[
          styles.statValue, 
          showAnyLevelUp && styles.statValueCompact,
          { color: theme.text }
        ]}>{area}</Text>
        <Text style={[
          styles.statLabel, 
          showAnyLevelUp && styles.statLabelCompact,
          { color: theme.textSecondary }
        ]}>Focus Area</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  reducedMargin: {
    marginBottom: 12,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statValueCompact: {
    fontSize: 16,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 14,
  },
  statLabelCompact: {
    fontSize: 12,
  },
});

export default RoutineStats; 