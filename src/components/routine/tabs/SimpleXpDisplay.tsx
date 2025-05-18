import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';

type SimpleXpDisplayProps = {
  xpEarned: number;
  originalXpEarned: number;
  hasXpBoost: boolean;
  showAnyLevelUp: boolean;
  theme: any; // Use any for theme prop to avoid import issues
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
  const isDark = theme.isDark;
  const isSunset = theme.isSunset;

  return (
    <View style={[
      styles.xpContainer,
      { backgroundColor: hasXpBoost 
        ? (isDark || isSunset ? 'rgba(255, 152, 0, 0.1)' : 'rgba(255, 235, 59, 0.15)') 
        : theme.backgroundLight 
      },
      showAnyLevelUp && styles.xpContainerCompact,
      hasXpBoost && {
        borderRadius: 16,
        borderWidth: 0,
        overflow: 'hidden',
      }
    ]}>
      {/* Colored gradient-like accent for boosted XP */}
      {hasXpBoost && (
        <View style={[
          styles.boostAccent,
          { backgroundColor: isDark || isSunset ? '#FF9800' : '#FF9800' }
        ]} />
      )}

      <View style={[
        styles.contentContainer,
        hasXpBoost && { paddingLeft: 16 }
      ]}>
        {hasXpBoost && (
          <View style={[
            styles.boostBadgeContainer,
            { backgroundColor: isDark || isSunset ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.85)' }
          ]}>
            <Animated.View 
              style={[
                styles.xpBoostBadge,
                { 
                  transform: [{ scale: animValues.boostPulseAnim }],
                  backgroundColor: isDark || isSunset ? '#FF9800' : '#FF9800',
                }
              ]}
            >
              <Ionicons name="flash" size={14} color="#FFFFFF" />
            </Animated.View>
            <Text style={[
              styles.boostMultiplierText,
              { color: isDark || isSunset ? '#FFC107' : '#FF9800' }
            ]}>
              2× BOOST
            </Text>
          </View>
        )}

        <View style={styles.xpInfoContainer}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name="star" 
              size={showAnyLevelUp ? 24 : 28} 
              color={hasXpBoost ? '#FF9800' : (isDark || isSunset ? "#FF9800" : "#FF9800")} 
            />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={[
              styles.xpLabel,
              { color: theme.textSecondary }
            ]}>
              XP EARNED
            </Text>
            <Text style={[
              styles.xpValue, 
              { color: theme.text },
              hasXpBoost && { 
                color: isDark || isSunset ? '#FF9800' : '#FF6F00',
                fontSize: 24
              }
            ]}>
              {xpEarned}
              {hasXpBoost && (
                <Text style={[
                  styles.originalXpText, 
                  { color: isDark || isSunset ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }
                ]}>
                  {" "}(was {originalXpEarned})
                </Text>
              )}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  xpContainer: {
    width: '100%',
    marginBottom: 24,
    position: 'relative',
    borderRadius: 12,
  },
  xpContainerCompact: {
    marginBottom: 15,
  },
  boostAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 6,
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  contentContainer: {
    padding: 12,
  },
  boostBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingRight: 10,
    paddingLeft: 4,
    paddingVertical: 2,
    marginBottom: 6,
  },
  xpBoostBadge: {
    borderRadius: 12,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  boostMultiplierText: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  xpInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  xpLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  xpValue: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  xpText: {
    fontSize: 16,
    marginLeft: 8,
  },
  originalXpText: {
    fontSize: 14,
    fontWeight: 'normal',
  },
});

export default SimpleXpDisplay; 