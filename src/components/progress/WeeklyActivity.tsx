import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { getWeeklyActivityDateRange } from '../../utils/progressUtils';

interface WeeklyActivityProps {
  weeklyActivity: number[];
  orderedDayNames: string[];
}

const WeeklyActivity: React.FC<WeeklyActivityProps> = ({
  weeklyActivity,
  orderedDayNames
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Weekly Activity</Text>
        <Text style={styles.dateRangeText}>{getWeeklyActivityDateRange()}</Text>
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
            backgroundColor: '#FFF',
            backgroundGradientFrom: '#FFF',
            backgroundGradientTo: '#FFF',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: "#4CAF50"
            }
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16
          }}
        />
      ) : (
        <Text style={styles.emptyText}>Complete some routines to see your weekly activity</Text>
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