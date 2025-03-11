import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TipSectionProps {
  currentStreak: number;
}

const TipSection: React.FC<TipSectionProps> = ({
  currentStreak
}) => {
  return (
    <View style={styles.tipSection}>
      <Ionicons name="bulb-outline" size={24} color="#FF9800" />
      <Text style={styles.tipText}>
        {currentStreak > 0 
          ? `Great job on your ${currentStreak}-day streak! Keep it going tomorrow.` 
          : "Try to stretch daily to build a consistent habit."}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  tipSection: {
    backgroundColor: '#FFF9E6',
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  tipText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#333',
  },
});

export default TipSection; 