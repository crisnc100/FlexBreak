import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../../../context/ThemeContext';

type SimpleXpDisplayProps = {
  xpEarned: number;
  originalXpEarned: number;
  hasXpBoost: boolean;
  showAnyLevelUp: boolean;
  theme: Theme;
  animValues: {
    boostPulseAnim: Animated.Value;
  };
};

const SimpleXpDisplay: React.FC<SimpleXpDisplayProps> = ({
  xpEarned,
  originalXpEarned,
  hasXpBoost,
  showAnyLevelUp,
  theme,
  animValues
}) => {
  return (
    <View style={[
      styles.xpContainer,
      { backgroundColor: theme.backgroundLight },
      showAnyLevelUp && styles.xpContainerCompact,
      hasXpBoost && styles.xpBoostContainer
    ]}>
      {hasXpBoost && (
        <Animated.View 
          style={[
            styles.xpBoostBadge,
            { transform: [{ scale: animValues.boostPulseAnim }] }
          ]}
        >
          <Ionicons name="flash" size={14} color="#FFFFFF" />
          <Text style={styles.xpBoostBadgeText}>2x</Text>
        </Animated.View>
      )}
      <Ionicons 
        name="star" 
        size={showAnyLevelUp ? 20 : 24} 
        color={hasXpBoost ? "#FF8F00" : "#FF9800"} 
      />
      <Text style={[
        styles.xpText,
        { color: theme.text },
        showAnyLevelUp && {fontSize: 14}
      ]}>
        <Text style={[styles.xpValue, hasXpBoost && styles.xpBoostValue]}>{xpEarned}</Text> XP Earned
        {hasXpBoost && (
          <Text>
            <Text style={styles.xpBoostText}> (2x Boost)</Text>
            <Text style={[styles.originalXpText, { color: theme.textSecondary }]}> was {originalXpEarned}</Text>
          </Text>
        )}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 24,
    position: 'relative',
  },
  xpContainerCompact: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 15,
  },
  xpText: {
    fontSize: 16,
    marginLeft: 8,
  },
  xpValue: {
    fontWeight: 'bold',
    color: '#FF9800',
  },
  xpBoostContainer: {
    borderWidth: 2,
    borderColor: '#FFC107',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  xpBoostText: {
    fontWeight: 'bold',
    color: '#FFC107',
  },
  xpBoostValue: {
    color: '#FF8F00',
    fontWeight: 'bold',
  },
  originalXpText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  xpBoostBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFC107',
    borderRadius: 12,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 1,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  xpBoostBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 10,
    marginLeft: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});

export default SimpleXpDisplay; 