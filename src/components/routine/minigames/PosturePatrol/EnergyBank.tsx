import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';

interface EnergyBankProps {
  energy: number;
  maxEnergy?: number;
}

export const EnergyBank: React.FC<EnergyBankProps> = ({
  energy,
  maxEnergy = 10,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.iconContainer}>
        <Text style={styles.energyIcon}>⚡</Text>
      </View>
      
      <Text style={[styles.energyText, { color: '#FFD700' }]}>
        {energy}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    gap: 6,
  },
  iconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  energyIcon: {
    fontSize: 16,
    color: '#FFD700',
  },
  energyText: {
    fontSize: 18,
    fontWeight: '700',
  },
});