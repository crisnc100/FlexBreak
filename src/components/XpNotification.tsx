import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { createThemedStyles } from '../utils/themeUtils';

interface XpNotificationProps {
  amount: number;
  source: string;
  description: string;
  onDismiss: () => void;
}

const XpNotification: React.FC<XpNotificationProps> = ({ 
  amount, 
  source, 
  description, 
  onDismiss 
}) => {
  const [animation] = useState(new Animated.Value(0));
  const { theme, isDark } = useTheme();
  const styles = themedStyles(theme, isDark);
  
  useEffect(() => {
    // Animate in
    Animated.timing(animation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.ease)
    }).start();
    
    // Auto dismiss after 3 seconds
    const timer = setTimeout(() => {
      Animated.timing(animation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.in(Easing.ease)
      }).start(() => {
        onDismiss();
      });
    }, 3000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Get icon based on source
  const getIcon = () => {
    switch (source) {
      case 'routine':
        return 'fitness-outline';
      case 'achievement':
        return 'trophy-outline';
      case 'challenge':
        return 'flag-outline';
      case 'streak':
        return 'flame-outline';
      case 'first_routine':
        return 'star-outline';
      default:
        return 'add-circle-outline';
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
        <Ionicons name={getIcon()} size={24} color="#FFD700" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>+{amount} XP</Text>
        <Text style={styles.description}>{description}</Text>
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
    color: isDark ? theme.text : 'white',
    fontSize: 14,
  }
});

export default XpNotification; 