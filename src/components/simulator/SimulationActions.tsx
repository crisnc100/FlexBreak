import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface SimulationActionsProps {
  onShowSingleDaySimulation: () => void;
  onQuickSimulation: () => void;
  onSimulate7Days: () => void;
  onSimulate3Days: () => void;
  onStreakFreezeTest: (testId: string) => void;
  onReset: () => void;
  lastConfig: any | null;
  lastSimulatedDate: Date | null;
  lastBatchEndDate: Date | null;
  consecutiveDaysCount: number;
  scenarioId?: string;
}

const SimulationActions: React.FC<SimulationActionsProps> = ({
  onShowSingleDaySimulation,
  onQuickSimulation,
  onSimulate7Days,
  onSimulate3Days,
  onStreakFreezeTest,
  onReset,
  lastConfig,
  lastSimulatedDate,
  lastBatchEndDate,
  consecutiveDaysCount,
  scenarioId
}) => {
  const { theme, isDark } = useTheme();
  
  const isStreakFreezeScenario = scenarioId === '4.1' || scenarioId === '4.2';

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
        <Ionicons name="flash" size={20} color={theme.accent} />
        <Text style={[styles.cardTitle, { color: theme.text }]}>Simulation Actions</Text>
      </View>

      <View style={styles.buttonsContainer}>
        {/* Single Day Simulation */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.accent }]}
          onPress={onShowSingleDaySimulation}
        >
          <Ionicons name="calendar" size={20} color="white" />
          <Text style={styles.actionButtonText}>Simulate Yesterday</Text>
        </TouchableOpacity>

        {/* Quick Simulation - only show if there's previous simulation data */}
        {lastSimulatedDate && lastConfig && (
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.accent }]}
            onPress={onQuickSimulation}
          >
            <Ionicons name="time" size={20} color="white" />
            <Text style={styles.actionButtonText}>Quick Simulation</Text>
          </TouchableOpacity>
        )}

        {/* 7-Day Simulation */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.accent }]}
          onPress={onSimulate7Days}
        >
          <Ionicons name="calendar-outline" size={20} color="white" />
          <Text style={styles.actionButtonText}>Simulate 7 Days</Text>
        </TouchableOpacity>

        {/* 3-Day Simulation */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.accent }]}
          onPress={onSimulate3Days}
        >
          <Ionicons name="calendar-outline" size={20} color="white" />
          <Text style={styles.actionButtonText}>Simulate 3 Days Before Today</Text>
        </TouchableOpacity>

        {/* Section Divider */}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Streak Freeze Tests</Text>
        
        {/* Streak Freeze Test 4.1 (1-day gap) */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
          onPress={() => onStreakFreezeTest('4.1')}
        >
          <Ionicons name="snow-outline" size={20} color="white" />
          <Text style={styles.actionButtonText}>Streak Freeze Test 4.1</Text>
        </TouchableOpacity>

        {/* Streak Freeze Test 4.2 (2-day gap) */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
          onPress={() => onStreakFreezeTest('4.2')}
        >
          <Ionicons name="snow-outline" size={20} color="white" />
          <Text style={styles.actionButtonText}>Streak Freeze Test 4.2</Text>
        </TouchableOpacity>

        {/* Reset Button */}
        <TouchableOpacity
          style={[styles.resetButtonStyle, { 
            backgroundColor: isDark ? 'rgba(255, 59, 48, 0.2)' : 'rgba(255, 59, 48, 0.1)',
            borderColor: '#FF3B30',
            borderWidth: 1 
          }]}
          onPress={onReset}
        >
          <Ionicons name="refresh" size={20} color="#FF3B30" />
          <Text style={[styles.resetButtonText, { color: '#FF3B30' }]}>Reset Simulation Data</Text>
        </TouchableOpacity>
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
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  buttonsContainer: {
    padding: 16,
    paddingTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    padding: 14,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  resetButtonStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 14,
    borderRadius: 8,
  },
  resetButtonText: {
    fontWeight: '600',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  }
});

export default SimulationActions; 