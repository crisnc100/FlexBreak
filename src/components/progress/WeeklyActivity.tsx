import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getWeeklyActivityDateRange } from '../../utils/progressUtils';
import { useTheme } from '../../context/ThemeContext';

interface WeeklyActivityProps {
  weeklyActivity: number[];
  orderedDayNames: string[];
  theme?: any; // Optional theme prop passed from parent
  isDark?: boolean; // Optional isDark flag passed from parent
}

const WeeklyActivity: React.FC<WeeklyActivityProps> = ({
  weeklyActivity,
  orderedDayNames,
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
          Weekly Activity
        </Text>
        <Text style={[styles.dateRangeText, { color: isDark ? theme.textSecondary : '#666' }]}>
          {getWeeklyActivityDateRange()}
        </Text>
      </View>
      
      {weeklyActivity.some(val => val > 0) ? (
        <LineChart
          data={{
            labels: orderedDayNames,
            datasets: [{
              data: weeklyActivity.map(val => Math.max(val, 0)) // Ensure no negative values
            }]
          }}
          width={Dimensions.get('window').width - 32}
          height={180}
          yAxisInterval={1}
          chartConfig={{
            backgroundColor: isDark ? theme.cardBackground : '#FFF',
            backgroundGradientFrom: isDark ? theme.cardBackground : '#FFF',
            backgroundGradientTo: isDark ? theme.cardBackground : '#FFF',
            decimalPlaces: 0,
            color: (opacity = 1) => isDark 
              ? `rgba(${theme.accent.replace('#', '').match(/.{1,2}/g).map(hex => parseInt(hex, 16)).join(', ')}, ${opacity})`
              : `rgba(76, 175, 80, ${opacity})`,
            labelColor: (opacity = 1) => isDark 
              ? `rgba(255, 255, 255, ${opacity})`
              : `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: isDark ? theme.accent : "#4CAF50"
            },
            // Add these for better dark mode visibility
            strokeWidth: 2,
            propsForBackgroundLines: {
              stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              strokeDasharray: ''
            },
            propsForLabels: {
              fontSize: '12',
              fill: isDark ? theme.textSecondary : '#666'
            }
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16
          }}
        />
      ) : (
        <Text style={[styles.emptyText, { color: isDark ? theme.textSecondary : '#666' }]}>
          Complete some routines to see your weekly activity
        </Text>
      )}
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
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
});

export default WeeklyActivity;