import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getConsistencyPercentage } from '../../utils/progressUtils';
import { useTheme } from '../../context/ThemeContext';

interface ConsistencyInsightsProps {
  activeRoutineDays: number;
  mostActiveDay: string;
  theme?: any; // Optional theme prop passed from parent
  isDark?: boolean; // Optional isDark flag passed from parent
}

const ConsistencyInsights: React.FC<ConsistencyInsightsProps> = ({
  activeRoutineDays,
  mostActiveDay,
  theme: propTheme,
  isDark: propIsDark
}) => {
  // Use theme from props if provided, otherwise use theme context
  const themeContext = useTheme();
  const theme = propTheme || themeContext.theme;
  const isDark = propIsDark !== undefined ? propIsDark : themeContext.isDark;

  return (
    <View style={[styles.section, { 
      backgroundColor: isDark ? theme.cardBackground : '#FFF',
      shadowColor: isDark ? 'rgba(0,0,0,0.5)' : '#000',
      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'transparent',
      borderWidth: isDark ? 1 : 0
    }]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: isDark ? theme.text : '#333' }]}>
          Consistency Insights
        </Text>
        <Text style={[styles.dateRangeText, { color: isDark ? theme.textSecondary : '#666' }]}>
          Last 30 Days
        </Text>
      </View>
      <View style={styles.insightRow}>
        <View style={[styles.insightCard, { 
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F5F5'
        }]}>
          <Text style={[styles.insightLabel, { color: isDark ? theme.textSecondary : '#666' }]}>
            30-Day Activity
          </Text>
          <Text style={[styles.insightValue, { color: isDark ? theme.accent : '#4CAF50' }]}>
            {getConsistencyPercentage(activeRoutineDays)}%
          </Text>
          <Text style={[styles.insightDescription, { color: isDark ? theme.textSecondary : '#666' }]}>
            {activeRoutineDays} active days in the last 30 days
          </Text>
        </View>
        
        <View style={[styles.insightCard, { 
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F5F5F5'
        }]}>
          <Text style={[styles.insightLabel, { color: isDark ? theme.textSecondary : '#666' }]}>
            Most Active
          </Text>
          <Text style={[styles.insightValue, { color: isDark ? theme.accent : '#4CAF50' }]}>
            {mostActiveDay}
          </Text>
          <Text style={[styles.insightDescription, { color: isDark ? theme.textSecondary : '#666' }]}>
            Your most consistent stretching day
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  dateRangeText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
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
});

export default ConsistencyInsights;