import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface ScenarioCardProps {
  scenarioInstructions: {
    id: string;
    title: string;
    setup: string;
    verification: string[];
  } | null;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ scenarioInstructions }) => {
  const { theme } = useTheme();

  if (!scenarioInstructions) return null;

  return (
    <View style={[styles.scenarioCard, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.scenarioCardHeader}>
        <Ionicons name="flask-outline" size={24} color={theme.accent} />
        <Text style={[styles.scenarioCardTitle, { color: theme.text }]}>
          Scenario #{scenarioInstructions.id}: {scenarioInstructions.title}
        </Text>
      </View>

      <View style={[styles.scenarioSetupContainer, { backgroundColor: theme.backgroundLight }]}>
        <Text style={[styles.scenarioSetupLabel, { color: theme.accent }]}>Setup Instructions:</Text>
        <Text style={[styles.scenarioSetupText, { color: theme.text }]}>
          {scenarioInstructions.setup}
        </Text>
      </View>
      
      <Text style={[styles.verificationLabel, { color: theme.text }]}>
        Verification Points:
      </Text>
      
      {scenarioInstructions.verification.map((point, index) => (
        <View key={index} style={styles.verificationItem}>
          <Ionicons name="checkmark-circle" size={20} color={theme.accent} style={{ marginRight: 8 }} />
          <Text style={[styles.verificationText, { color: theme.text }]}>
            {point}
          </Text>
        </View>
      ))}
      
      <View style={styles.scenarioFooter}>
        <Text style={[styles.scenarioFooterText, { color: theme.textSecondary }]}>
          Complete this scenario and return to the testing screen to provide feedback.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  scenarioCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    padding: 16,
  },
  scenarioCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    paddingBottom: 12,
  },
  scenarioCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  scenarioSetupContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  scenarioSetupLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  scenarioSetupText: {
    fontSize: 15,
    lineHeight: 22,
  },
  verificationLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  verificationText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  scenarioFooter: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingBottom: 8,
  },
  scenarioFooterText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default ScenarioCard; 