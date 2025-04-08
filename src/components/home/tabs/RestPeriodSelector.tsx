import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomRestPeriod } from '../../../types';

interface RestPeriodSelectorProps {
  restPeriods: CustomRestPeriod[];
  addRestPeriod: (restPeriod: CustomRestPeriod) => void;
  theme: any;
  isDark: boolean;
}

const RestPeriodSelector: React.FC<RestPeriodSelectorProps> = ({
  restPeriods,
  addRestPeriod,
  theme,
  isDark
}) => {
  return (
    <>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Add Rest Periods</Text>
      </View>
      
      <View style={styles.restPeriodsContainer}>
        {restPeriods.map((restPeriod) => (
          <TouchableOpacity
            key={restPeriod.id}
            style={[
              styles.restPeriodButton,
              { backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5' }
            ]}
            onPress={() => addRestPeriod(restPeriod)}
          >
            <View style={styles.restPeriodIconContainer}>
              <Ionicons name="time-outline" size={24} color={theme.accent} />
            </View>
            <View style={styles.restPeriodContent}>
              <Text style={[styles.restPeriodName, { color: theme.text }]}>
                {restPeriod.name}
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.restPeriodDescription, { color: theme.textSecondary }]}
              >
                {restPeriod.description}
              </Text>
            </View>
            <Ionicons name="add-circle" size={24} color={theme.accent} />
          </TouchableOpacity>
        ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  restPeriodsContainer: {
    marginBottom: 16,
  },
  restPeriodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  restPeriodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  restPeriodContent: {
    flex: 1,
  },
  restPeriodName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  restPeriodDescription: {
    fontSize: 12,
  },
});

export default RestPeriodSelector; 