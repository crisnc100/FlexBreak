import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useTheme } from '../../context/ThemeContext';

interface StretchingPatternsProps {
  dayOfWeekBreakdown: number[];
  dayNames: string[];
  mostActiveDay: string;
  theme?: any; // Optional theme prop passed from parent
  isDark?: boolean; // Optional isDark flag passed from parent
}

const StretchingPatterns: React.FC<StretchingPatternsProps> = ({
  dayOfWeekBreakdown,
  dayNames,
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
    }]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: isDark ? theme.text : '#333' }]}>
          Stretching Patterns
        </Text>
        <Text style={[styles.dateRangeText, { color: isDark ? theme.textSecondary : '#666' }]}>
          All Time
        </Text>
      </View>
      <View style={styles.patternContainer}>
        <View style={styles.patternLegend}>
          <Text style={[styles.patternLabel, { color: isDark ? theme.textSecondary : '#666' }]}>
            Most Active Day:
          </Text>
          <Text style={[styles.patternValue, { color: isDark ? theme.accent : '#4CAF50' }]}>
            {mostActiveDay}
          </Text>
        </View>
      </View>
      
      {/* Chart in its own container */}
      <View style={styles.chartContainer}>
        <BarChart
          data={{
            labels: dayNames,
            datasets: [{
              data: dayOfWeekBreakdown.map(val => Math.max(val, 0))
            }]
          }}
          width={Dimensions.get('window').width - 64}
          height={160}
          yAxisLabel=""
          yAxisSuffix=""
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
            barPercentage: 0.7,
          }}
        />
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
});

export default StretchingPatterns;