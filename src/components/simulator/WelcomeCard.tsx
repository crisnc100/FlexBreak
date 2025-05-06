import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

const WelcomeCard: React.FC = () => {
  const { theme } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.cardHeader}>
        <Ionicons name="information-circle" size={24} color={theme.accent} />
        <Text style={[styles.cardTitle, { color: theme.text }]}>
          Stretching Simulator
        </Text>
      </View>
      
      <Text style={[styles.instructionsText, { color: theme.textSecondary }]}>
        This tool lets you simulate stretching routines for testing purposes. Simulated routines 
        will affect XP, levels, and unlock achievements just like real routines.
      </Text>
      
      <View style={styles.stepsContainer}>
        <View style={styles.stepItem}>
          <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
            <Text style={styles.stepNumberText}>1</Text>
          </View>
          <Text style={[styles.stepText, { color: theme.text }]}>
            Choose a date to simulate a routine
          </Text>
        </View>
        
        <View style={styles.stepItem}>
          <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
            <Text style={styles.stepNumberText}>2</Text>
          </View>
          <Text style={[styles.stepText, { color: theme.text }]}>
            Configure the routine details (area, difficulty, duration)
          </Text>
        </View>
        
        <View style={styles.stepItem}>
          <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
            <Text style={styles.stepNumberText}>3</Text>
          </View>
          <Text style={[styles.stepText, { color: theme.text }]}>
            Review the results and continue simulating
          </Text>
        </View>
        
        <View style={styles.stepItem}>
          <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
            <Text style={styles.stepNumberText}>4</Text>
          </View>
          <Text style={[styles.stepText, { color: theme.text }]}>
            Once you're done, close out the app and reopen it to see the results.
          </Text>
        </View>
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
  instructionsText: {
    padding: 16,
    paddingTop: 8,
    lineHeight: 20,
    fontSize: 14,
  },
  stepsContainer: {
    padding: 16,
    paddingTop: 0,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepText: {
    fontSize: 14,
    flex: 1,
  },
});

export default WelcomeCard; 