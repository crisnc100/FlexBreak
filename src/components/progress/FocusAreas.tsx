import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

interface FocusAreasProps {
  areaBreakdown: Record<string, number>;
  totalRoutines: number;
}

const FocusAreas: React.FC<FocusAreasProps> = ({
  areaBreakdown,
  totalRoutines
}) => {
  // Convert area breakdown to chart data
  const getAreaBreakdownChartData = () => {
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
          legendFontColor: '#7F7F7F',
          legendFontSize: 12
        };
      });
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Focus Areas</Text>
        <Text style={styles.dateRangeText}>All Time</Text>
      </View>
      {Object.keys(areaBreakdown).length > 0 ? (
        <View>
          <PieChart
            data={getAreaBreakdownChartData()}
            width={Dimensions.get('window').width - 32}
            height={180}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
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
                <View key={area} style={styles.areaBreakdownItem}>
                  <Text style={styles.areaBreakdownName}>{area}</Text>
                  <Text style={styles.areaBreakdownCount}>
                    {String(count)} {count === 1 ? 'activity' : 'activities'} 
                    {' '}({Math.round((count / totalRoutines) * 100)}%)
                  </Text>
                </View>
              ))
            }
          </View>
        </View>
      ) : (
        <Text style={styles.emptyText}>Complete some routines to see your focus area breakdown</Text>
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