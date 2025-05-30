import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useTheme } from '../../context/ThemeContext';

interface FocusAreasProps {
  areaBreakdown: Record<string, number>;
  totalRoutines: number;
  theme?: any; // Optional theme prop passed from parent
  isDark?: boolean; // Optional isDark flag passed from parent
  isSunset?: boolean;
}

const FocusAreas: React.FC<FocusAreasProps> = ({
  areaBreakdown,
  totalRoutines,
  theme: propTheme,
  isDark: propIsDark,
  isSunset: propIsSunset
}) => {
  // Use theme from props if provided, otherwise use theme context
  const themeContext = useTheme();
  const theme = propTheme || themeContext.theme;
  const isDark = propIsDark !== undefined ? propIsDark : themeContext.isDark;
  const isSunset = propIsSunset !== undefined ? propIsSunset : themeContext.isSunset;

  // Convert area breakdown to chart data
  const getAreaBreakdownChartData = () => {
    // We'll keep the same colors regardless of theme for the pie slices
    // The colors provide enough contrast on their own in both light/dark modes
    const colors = [
      '#4CAF50', // Primary green
      '#8BC34A', // Light green
      '#2196F3', // Blue
      '#FF9800', // Orange
      '#9C27B0', // Purple
      '#F44336'  // Red
    ];

    return Object.entries(areaBreakdown)
      .sort((a, b) => b[1] - a[1]) // Sort by frequency descending
      .map(([area, count], index) => {
        return {
          name: area,
          count: count,
          color: colors[index % colors.length],
          legendFontColor: isDark || isSunset ? theme.textSecondary : '#7F7F7F',
          legendFontSize: 12
        };
      });
  };

  return (
    <View style={[styles.section, {
      backgroundColor: isDark || isSunset ? theme.cardBackground : '#FFF',
      shadowColor: isDark || isSunset ? 'rgba(0,0,0,0.5)' : '#000',
      borderColor: isDark || isSunset ? 'rgba(255,255,255,0.1)' : 'transparent',
      borderWidth: isDark || isSunset ? 1 : 0
    }]}>
      <View style={styles.sectionHeaderRow}>
        <Text style={[styles.sectionTitle, { color: isDark || isSunset ? theme.text : '#333' }]}>
          Focus Areas
        </Text>
        <Text style={[styles.dateRangeText, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
          All Time
        </Text>
      </View>
      {Object.keys(areaBreakdown).length > 0 ? (
        <View>
          <PieChart
            data={getAreaBreakdownChartData().map(item => ({
              ...item,
              // Truncate long names in the legend
              name: item.name.length > 15 ? item.name.substring(0, 13) + '...' : item.name,
              // Smaller font size for the legend to fit more text
              legendFontSize: 11
            }))}
            width={Dimensions.get('window').width - 32}
            height={200}
            chartConfig={{
              color: (opacity = 1) => isDark || isSunset
                ? `rgba(255, 255, 255, ${opacity})`
                : `rgba(0, 0, 0, ${opacity})`,
              labelColor: (opacity = 1) => isDark || isSunset
                ? `rgba(255, 255, 255, ${opacity})`
                : `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="count"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
          <View style={styles.areaBreakdownList}>
            {Object.entries(areaBreakdown)
              .sort((a, b) => b[1] - a[1])
              .map(([area, count], index) => (
                <View key={area} style={[
                  styles.areaBreakdownItem,
                  { borderBottomColor: isDark || isSunset ? 'rgba(255,255,255,0.1)' : '#F0F0F0' }
                ]}>
                  <Text style={[styles.areaBreakdownName, { color: isDark || isSunset ? theme.text : '#333' }]}>
                    {area}
                  </Text>
                  <Text style={[styles.areaBreakdownCount, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
                    {String(count)} {count === 1 ? 'activity' : 'activities'}
                    {' '}({Math.round((count / totalRoutines) * 100)}%)
                  </Text>
                </View>
              ))
            }
          </View>
        </View>
      ) : (
        <Text style={[styles.emptyText, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
          Complete some routines to see your focus area breakdown
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
  areaBreakdownList: {
    marginTop: 16,
  },
  areaBreakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  areaBreakdownName: {
    fontSize: 16,
    color: '#333',
  },
  areaBreakdownCount: {
    fontSize: 14,
    color: '#666',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
});

export default FocusAreas;