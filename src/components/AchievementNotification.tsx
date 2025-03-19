import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

interface AchievementNotificationProps {
  achievement: {
    id: string;
    title: string;
    description: string;
    xp: number;
    icon?: string;
    category?: string;
  };
  onDismiss: () => void;
}

const AchievementNotification: React.FC<AchievementNotificationProps> = ({ 
  achievement, 
  onDismiss 
}) => {
  const { theme } = useTheme();
  const [animation] = useState(new Animated.Value(0));
  
  useEffect(() => {
    const animateNotification = async () => {
      // Animate in
      await new Promise<void>(resolve => {
        Animated.timing(animation, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
          easing: Easing.out(Easing.back(1.2))
        }).start(() => resolve());
      });
      
      // Auto dismiss after 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Animate out
      await new Promise<void>(resolve => {
        Animated.timing(animation, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease)
        }).start(() => {
          onDismiss();
          resolve();
        });
      });
    };
    
    animateNotification();
    
    return () => {
      // If component unmounts, immediately dismiss
      onDismiss();
    };
  }, []);
  
  // Get icon based on achievement category or icon
  const getIcon = () => {
    if (achievement.icon) {
      return achievement.icon;
    }
    
    // Default icons based on category
    switch (achievement.category) {
      case 'beginner':
        return 'star-outline';
      case 'intermediate':
        return 'medal-outline';
      case 'advanced':
        return 'trophy-outline';
      case 'elite':
        return 'ribbon-outline';
      default:
        return 'trophy-outline';
    }
  };
  
  return (
    <Animated.View 
      style={[
        styles.container,
        {
          backgroundColor: theme.cardBackground,
          borderColor: theme.accent,
          shadowColor: theme.accent,
          opacity: animation,
          transform: [
            { 
              translateY: animation.interpolate({
                inputRange: [0, 1],
                outputRange: [-80, 0]
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
      <LinearGradient
        colors={['rgba(76, 175, 80, 0.7)', 'rgba(76, 175, 80, 0.3)']}
        style={styles.achievementBadge}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name={getIcon() as any} size={28} color="#FFFFFF" />
      </LinearGradient>
      
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.text }]}>
          Achievement Unlocked!
        </Text>
        <Text style={[styles.achievementTitle, { color: theme.accent }]}>
          {achievement.title}
        </Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          {achievement.description}
        </Text>
        <View style={styles.xpContainer}>
          <Ionicons name="flash" size={14} color="#FFD700" />
          <Text style={styles.xpText}>+{achievement.xp} XP</Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.closeButton}
        onPress={onDismiss}
      >
        <Ionicons name="close" size={16} color={theme.textSecondary} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  achievementBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    marginBottom: 4,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  xpText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  }
});

export default AchievementNotification; 