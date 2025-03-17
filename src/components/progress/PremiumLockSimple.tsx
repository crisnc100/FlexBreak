import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface PremiumLockSimpleProps {
  feature: string;
  description: string;
  onUpgrade: () => void;
}

export const PremiumLockSimple: React.FC<PremiumLockSimpleProps> = ({
  feature,
  description,
  onUpgrade
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <MaterialCommunityIcons 
        name="lock" 
        size={60} 
        color={theme.accent} 
        style={styles.icon}
      />
      
      <Text style={[styles.title, { color: theme.text }]}>
        Premium {feature}
      </Text>
      
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        {description}
      </Text>
      
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.accent }]}
        onPress={onUpgrade}
      >
        <Text style={styles.buttonText}>Upgrade to Premium</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  icon: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  }
}); 