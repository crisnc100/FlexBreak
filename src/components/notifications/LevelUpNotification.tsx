import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { createThemedStyles } from '../../utils/themeUtils';

interface LevelUpNotificationProps {
  oldLevel: number;
  newLevel: number;
  source?: string;
  details?: string;
  challengeTitle?: string;
  xpEarned?: number;
  onDismiss: () => void;
}

const LevelUpNotification: React.FC<LevelUpNotificationProps> = ({ 
  oldLevel, 
  newLevel,
  source = 'default',
  details,
  challengeTitle,
  xpEarned,
  onDismiss 
}) => {
  const [animation] = useState(new Animated.Value(0));
  const { theme, isDark } = useTheme();
  const styles = themedStyles(theme, isDark);
  
  // Detailed console logging for debugging
  useEffect(() => {
    console.log(`Rendering LevelUpNotification: ${oldLevel} → ${newLevel}`);
    console.log(`Source: ${source}, Challenge: ${challengeTitle || 'None'}`);
  }, []);

  useEffect(() => {
    // Animate in
    Animated.timing(animation, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
      easing: Easing.out(Easing.elastic(1.2))
    }).start();
    
    // Auto dismiss after 5 seconds (longer than regular notifications)
    const timer = setTimeout(() => {
      Animated.timing(animation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease)
      }).start(() => {
        onDismiss();
      });
    }, 5000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Get source description
  const getSourceText = () => {
    // Use provided details if available
    if (details) {
      return details;
    }
    
    // Use challenge title if available
    if (challengeTitle) {
      return `from completing "${challengeTitle}" challenge!`;
    }
    
    // Fall back to default source-based text
    switch (source) {
      case 'challenge':
        return 'from completing a challenge!';
      case 'routine':
        return 'from completing a routine!';
      case 'achievement':
        return 'from unlocking an achievement!';
      default:
        return '';
    }
  };
  
  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: animation,
          transform: [
            { 
              translateY: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [-50, 0]
              })
            },
            {
              scale: animation.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.8, 1.1, 1]
              })
            }
          ]
        }
      ]}
    >
      <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
        <Ionicons name="close" size={18} color={isDark ? "#999" : "#ccc"} />
      </TouchableOpacity>
      
      <View style={styles.iconContainer}>
        <Ionicons name="trophy" size={28} color="#FFD700" />
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.title}>LEVEL UP!</Text>
        <View style={styles.levelContainer}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>{oldLevel}</Text>
          </View>
          <Ionicons name="arrow-forward" size={20} color={isDark ? theme.text : "#FFF"} style={styles.arrow} />
          <View style={[styles.levelBadge, styles.newLevelBadge]}>
            <Text style={styles.levelText}>{newLevel}</Text>
          </View>
        </View>
        <Text style={styles.description}>
          You've reached level {newLevel} {getSourceText()}
        </Text>
      </View>
    </Animated.View>
  );
};

// Use themed styles
const themedStyles = (theme, isDark) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: isDark 
      ? 'rgba(45, 45, 60, 0.95)' 
      : 'rgba(67, 93, 141, 0.95)',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: theme.text,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(255,215,0,0.3)' : 'rgba(255,215,0,0.5)',
  },
  dismissButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconContainer: {
    marginBottom: 10,
    height: 50,
    width: 50,
    borderRadius: 25,
    backgroundColor: isDark ? 'rgba(255,215,0,0.2)' : 'rgba(255,215,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  contentContainer: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  levelBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
  },
  newLevelBadge: {
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  levelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: isDark ? theme.text : '#FFF',
  },
  arrow: {
    marginHorizontal: 5,
  },
  description: {
    color: isDark ? theme.text : 'white',
    fontSize: 14,
    textAlign: 'center',
  }
});

export default LevelUpNotification; 