import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface TipSectionProps {
  currentStreak: number;
  isDark?: boolean;
  isSunset?: boolean;
}

const TipSection: React.FC<TipSectionProps> = ({
  currentStreak,
  isDark = false,
  isSunset = false
}) => {
  const generateTipMessage = () => {
    if (currentStreak === 0) {
      return "Try to stretch daily to build a consistent habit.";
    } else if (currentStreak === 1) {
      return "You've started your streak! Keep it going tomorrow.";
    } else if (currentStreak < 5) {
      return `Great job on your ${currentStreak}-day streak! You're building a healthy habit.`;
    } else if (currentStreak < 10) {
      return `Impressive ${currentStreak}-day streak! You're making stretching a routine.`;
    } else {
      return `Amazing ${currentStreak}-day streak! Your dedication is truly inspiring!`;
    }
  };

  if (isSunset) {
    // Sunset theme specific colors
    return (
      <LinearGradient
        colors={['rgba(50, 30, 64, 0.8)', 'rgba(32, 18, 41, 0.9)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.darkTipContainer, styles.sunsetTipContainer]}
      >
        <View style={[styles.iconContainer, styles.sunsetIconContainer]}>
          <Ionicons name="flame" size={24} color="#FF8C5A" />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.darkTipText, styles.sunsetTipText]}>
            {generateTipMessage()}
          </Text>
        </View>
      </LinearGradient>
    );
  } else if (isDark) {
    return (
      <LinearGradient
        colors={['#1F2937', '#111827']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.darkTipContainer}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="flash" size={24} color="#F59E0B" />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.darkTipText}>
            {generateTipMessage()}
          </Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.tipSection}>
      <Ionicons name="bulb-outline" size={24} color="#FF9800" />
      <Text style={styles.tipText}>
        {generateTipMessage()}
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
  darkTipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#374151',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  sunsetTipContainer: {
    borderColor: 'rgba(255, 140, 90, 0.4)',
    shadowColor: '#FF8C5A',
  },
  iconContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderRadius: 12,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sunsetIconContainer: {
    backgroundColor: 'rgba(255, 140, 90, 0.15)',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  darkTipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#D1D5DB',
    lineHeight: 20,
  },
  sunsetTipText: {
    color: '#FFF1E6',
  },
});

export default TipSection; 