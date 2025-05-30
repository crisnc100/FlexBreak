import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface SimulatedDatesCardProps {
  dates: string[];
}

/**
 * SimulatedDatesCard shows a scrollable list of simulated dates.
 */
const SimulatedDatesCard: React.FC<SimulatedDatesCardProps> = ({ dates }) => {
  const { theme } = useTheme();

  if (!dates || dates.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.cardHeader}>
        <Ionicons name="checkmark-circle" size={24} color={theme.accent} />
        <Text style={[styles.cardTitle, { color: theme.text }]}>Simulated Dates</Text>
      </View>

      <ScrollView style={styles.datesContainer} showsVerticalScrollIndicator={false}>
        {dates.slice(0, 10).map((dateStr, index) => (
          <View key={index} style={styles.dateItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
            <Text style={[styles.dateText, { color: theme.text }]}> {new Date(dateStr).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}</Text>
          </View>
        ))}

        {dates.length > 10 && (
          <Text style={[styles.moreDatesText, { color: theme.textSecondary }]}>+{dates.length - 10} more dates simulated</Text>
        )}
      </ScrollView>
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
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  datesContainer: {
    maxHeight: 200,
    padding: 16,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 14,
  },
  moreDatesText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default SimulatedDatesCard; 