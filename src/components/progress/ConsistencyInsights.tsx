import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getConsistencyPercentage } from '../../utils/progressUtils';

interface ConsistencyInsightsProps {
  activeRoutineDays: number;
  mostActiveDay: string;
}

const ConsistencyInsights: React.FC<ConsistencyInsightsProps> = ({
  activeRoutineDays,
  mostActiveDay
}) => {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Consistency Insights</Text>
        <Text style={styles.dateRangeText}>Last 30 Days</Text>
      </View>
      <View style={styles.insightRow}>
        <View style={styles.insightCard}>
          <Text style={styles.insightLabel}>30-Day Activity</Text>
          <Text style={styles.insightValue}>{getConsistencyPercentage(activeRoutineDays)}%</Text>
          <Text style={styles.insightDescription}>
            {activeRoutineDays} active days in the last 30 days
          </Text>
        </View>
        
        <View style={styles.insightCard}>
          <Text style={styles.insightLabel}>Most Active</Text>
          <Text style={styles.insightValue}>{mostActiveDay}</Text>
          <Text style={styles.insightDescription}>
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