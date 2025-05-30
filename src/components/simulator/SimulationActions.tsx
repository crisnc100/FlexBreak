import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface SimulationActionsProps {
  onSimulate7Days: () => void;
  onSimulate3Days: () => void;
  onFlexSaveTest: (testId: string) => void;
  onReset: () => void;
  scenarioId?: string;
  simulate7DaysDateRange?: string;
  simulate3DaysDateRange?: string;
}

const SimulationActions: React.FC<SimulationActionsProps> = ({
  onSimulate7Days,
  onSimulate3Days,
  onFlexSaveTest,
  onReset,
  scenarioId,
  simulate7DaysDateRange,
  simulate3DaysDateRange
}) => {
  const { theme, isDark } = useTheme();
  
  const isFlexSaveScenario = scenarioId === '4.1' || scenarioId === '4.2';

  // Calculate date ranges if not provided
  const get7DayDateRange = () => {
    if (simulate7DaysDateRange) return simulate7DaysDateRange;
    
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    return `${sevenDaysAgo.toLocaleDateString()} - ${yesterday.toLocaleDateString()}`;
  };
  
  const get3DayDateRange = () => {
    if (simulate3DaysDateRange) return simulate3DaysDateRange;
    
    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    return `${threeDaysAgo.toLocaleDateString()} - ${yesterday.toLocaleDateString()}`;
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
        <Ionicons name="flash" size={20} color={theme.accent} />
        <Text style={[styles.cardTitle, { color: theme.text }]}>Simulation Actions</Text>
      </View>

      <View style={styles.buttonsContainer}>

        {/* 7-Day Simulation */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.accent }]}
          onPress={onSimulate7Days}
        >
          <Ionicons name="calendar-outline" size={20} color="white" />
          <View style={styles.buttonTextContainer}>
            <Text style={styles.actionButtonText}>Simulate 7 Days</Text>
            <Text style={styles.dateRangeText}>{get7DayDateRange()}</Text>
          </View>
        </TouchableOpacity>

        {/* 3-Day Simulation */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: theme.accent }]}
          onPress={onSimulate3Days}
        >
          <Ionicons name="calendar-outline" size={20} color="white" />
          <View style={styles.buttonTextContainer}>
            <Text style={styles.actionButtonText}>Simulate 3 Days</Text>
            <Text style={styles.dateRangeText}>{get3DayDateRange()}</Text>
          </View>
        </TouchableOpacity>

        {/* Section Divider */}
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Flex Save Tests</Text>
        
        {/* Flex Save Test 4.1 (1-day gap) */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
          onPress={() => onFlexSaveTest('4.1')}
        >
          <Ionicons name="snow-outline" size={20} color="white" />
          <Text style={styles.actionButtonText}>Flex Save Test 4.1</Text>
        </TouchableOpacity>

        {/* Flex Save Test 4.2 (2-day gap) */}
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF9800' }]}
          onPress={() => onFlexSaveTest('4.2')}
        >
          <Ionicons name="snow-outline" size={20} color="white" />
          <Text style={styles.actionButtonText}>Flex Save Test 4.2</Text>
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
    justifyContent: 'flex-start',
    marginBottom: 12,
    padding: 14,
    borderRadius: 8,
  },
  buttonTextContainer: {
    flexDirection: 'column',
    marginLeft: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  dateRangeText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 2,
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