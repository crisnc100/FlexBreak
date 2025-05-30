import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { createThemedStyles } from '../../utils/themeUtils';

interface XpNotificationProps {
  amount: number;
  source: string;
  description: string;
  originalAmount?: number;  // Original XP before boost was applied
  wasXpBoosted?: boolean;  // Whether XP boost was active
  onDismiss: () => void;
}

const XpNotification: React.FC<XpNotificationProps> = ({ 
  amount, 
  source, 
  description, 
  originalAmount,
  wasXpBoosted = false,
  onDismiss 
}) => {
  const [animation] = useState(new Animated.Value(0));
  const { theme, isDark, isSunset } = useTheme();
  const styles = themedStyles(theme, isDark, isSunset);
  
  useEffect(() => {
    // Animate in
    Animated.timing(animation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease)
    }).start();
    
    // Auto dismiss after 2 seconds
    const timer = setTimeout(() => {
      Animated.timing(animation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease)
      }).start(() => {
        onDismiss();
      });
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Get icon and formatted source text based on source
  const getIcon = () => {
    switch (source) {
      case 'routine':
        return 'fitness-outline';
      case 'achievement':
        return 'trophy-outline';
      case 'challenge':
      case 'challenge_claim':
        return 'flag-outline';
      case 'streak':
        return 'flame-outline';
      case 'first_routine':
        return 'star-outline';
      default:
        return 'add-circle-outline';
    }
  };

  // Use description if provided, otherwise format a nice message based on source
  const getFormattedMessage = () => {
    if (description) {
      return description;
    }
    
    switch (source) {
      case 'routine':
        return 'From completing a routine';
      case 'achievement':
        return 'From unlocking an achievement';
      case 'challenge':
      case 'challenge_claim':
        return wasXpBoosted 
          ? `From completing a challenge`
          : 'From completing a challenge';
      case 'streak':
        return 'From maintaining your streak';
      case 'first_routine':
        return 'From your first routine today';
      default:
        return `From ${source}`;
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
            }
          ]
        }
      ]}
    >
      <View style={styles.iconContainer}>
        {wasXpBoosted ? (
          <View style={styles.boostBadgeContainer}>
            <Ionicons name={getIcon()} size={24} color="#FFD700" />
            <View style={styles.boostBadge}>
              <Ionicons name="flash" size={12} color="#FFFFFF" />
              <Text style={styles.boostBadgeText}>2x</Text>
            </View>
          </View>
        ) : (
          <Ionicons name={getIcon()} size={24} color="#FFD700" />
        )}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>
          +{amount} XP
          {wasXpBoosted && originalAmount && (
            <Text style={styles.originalXp}> (was +{originalAmount})</Text>
          )}
        </Text>
        <Text style={styles.description}>{getFormattedMessage()}</Text>
      </View>
    </Animated.View>
  );
};

// Use themed styles
const themedStyles = (theme, isDark, isSunset) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: isDark || isSunset 
      ? 'rgba(40, 40, 40, 0.9)' 
      : 'rgba(0, 0, 0, 0.8)',
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: theme.text,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 5,
  },
  iconContainer: {
    marginRight: 15,
    position: 'relative',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  description: {
    color: isDark || isSunset ? theme.text : 'white',
    fontSize: 14,
  },
  boostBadgeContainer: {
    position: 'relative',
  },
  boostBadge: {
    position: 'absolute',
    top: -5,
    right: -10,
    backgroundColor: '#FF8F00',
    borderRadius: 10,
    width: 28,
    height: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  boostBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 1,
  },
  originalXp: {
    fontSize: 14,
    color: 'rgba(255, 215, 0, 0.7)',
    fontStyle: 'italic',
  }
});

export default XpNotification; 