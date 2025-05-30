import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

interface ThemeUnlockNotificationProps {
  onDismiss: () => void;
  onNavigateToSettings?: () => void; // Props to navigate to settings
}

const ThemeUnlockNotification: React.FC<ThemeUnlockNotificationProps> = ({ 
  onDismiss,
  onNavigateToSettings
}) => {
  const { theme } = useTheme();
  const [animation] = useState(new Animated.Value(0));
  
  useEffect(() => {
    const animateNotification = async () => {
      // Animate in
      Animated.timing(animation, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.2))
      }).start();
    };
    
    animateNotification();
    
    return () => {
      // If component unmounts, just clean up
      animation.stopAnimation();
    };
  }, []);

  // Handle manual dismiss with animation
  const handleDismiss = () => {
    Animated.timing(animation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.in(Easing.ease)
    }).start(() => {
      onDismiss();
    });
  };

  // Handle navigation to settings
  const handleNavigateToSettings = () => {
    if (onNavigateToSettings) {
      onNavigateToSettings();
    } else {
      handleDismiss();
    }
  };
  
  return (
    <Animated.View 
      style={[
        styles.container,
        {
          backgroundColor: theme.cardBackground,
          borderColor: '#FF8E3C', // Always use sunset theme accent color
          shadowColor: '#FF8E3C',
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
        colors={['#FF8E3C', '#E67D28']} // Sunset theme colors
        style={styles.themeBadge}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons name="color-palette" size={28} color="#FFFFFF" />
      </LinearGradient>
      
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: theme.text }]}>
          New Theme Unlocked!
        </Text>
        <Text style={[styles.themeTitle, { color: '#FF8E3C' }]}> {/* Always use sunset theme accent */}
          Sunset Theme
        </Text>
        <Text style={[styles.description, { color: theme.textSecondary }]}>
          You've earned 6 badges and unlocked the beautiful sunset theme! Go to Settings to select and use it.
        </Text>
      </View>
      
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleDismiss}
      >
        <Ionicons name="close" size={16} color={theme.textSecondary} />
      </TouchableOpacity>
      
      {/* Go to Settings button */}
      <TouchableOpacity
        style={[styles.activateButton, { backgroundColor: '#FF8E3C' }]}
        onPress={handleNavigateToSettings}
      >
        <Text style={styles.activateButtonText}>Go to Settings</Text>
        <Ionicons name="chevron-forward" size={14} color="#FFFFFF" style={styles.activateButtonIcon} />
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
    paddingBottom: 50, // Extra space for the button at bottom
  },
  themeBadge: {
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
  themeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    marginBottom: 4,
    lineHeight: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    padding: 4,
  },
  activateButton: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activateButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  activateButtonIcon: {
    marginLeft: 4,
  }
});

export default ThemeUnlockNotification; 