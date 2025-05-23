import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { createThemedStyles } from '../../utils/themeUtils';
import * as soundEffects from '../../utils/soundEffects';

interface LevelUpNotificationProps {
  oldLevel: number;
  newLevel: number;
  source?: string;
  details?: string;
  challengeTitle?: string;
  xpEarned?: number;
  onDismiss: () => void;
  showInRoutineScreen?: boolean;
}

const LevelUpNotification: React.FC<LevelUpNotificationProps> = ({ 
  oldLevel, 
  newLevel,
  source = 'default',
  details,
  challengeTitle,
  xpEarned,
  onDismiss,
  showInRoutineScreen = true
}) => {
  const [animation] = useState(new Animated.Value(0));
  const { theme, isDark, isSunset } = useTheme();
  const styles = themedStyles(theme, isDark, isSunset);
  const [isVisible, setIsVisible] = useState(false);
  const [isFullyMounted, setIsFullyMounted] = useState(false);
  
  // Only show notification for challenges
  // Skip rendering for any other sources
  if (source !== 'challenge') {
    console.log(`LevelUpNotification: Skipping notification for source '${source}'`);
    
    // Immediately dismiss without rendering
    setTimeout(() => {
      onDismiss();
    }, 100);
    
    // Return null instead of rendering the component
    return null;
  }
  
  // Detailed console logging for debugging
  useEffect(() => {
    console.log(`Rendering LevelUpNotification: ${oldLevel} → ${newLevel}`);
    console.log(`Source: ${source}, Challenge: ${challengeTitle || 'None'}`);
    
    // Play level up sound when component mounts
    soundEffects.playLevelUpSound();
    
    // First mark as fully mounted (layout complete)
    // This ensures all styles are properly applied before animation
    setTimeout(() => {
      setIsFullyMounted(true);
      
      // Then after a tiny delay, trigger animation
      setTimeout(() => {
        setIsVisible(true);
      }, 100);
    }, 100);
  }, []);

  useEffect(() => {
    if (isVisible && isFullyMounted) {
      // Animate in only after we're fully ready
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
    }
  }, [isVisible, isFullyMounted]);
  
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
    return 'from completing a challenge!';
  };
  
  // Render a fully transparent placeholder to establish layout before animation
  if (!isFullyMounted) {
    return (
      <View style={[styles.container, { opacity: 0 }]}>
        <View style={styles.contentWrapper}>
          {/* Same content structure but not visible */}
          <View style={styles.headerContainer}>
            <View style={styles.iconContainer} />
            <Text style={styles.title}>LEVEL UP!</Text>
          </View>
          <View style={styles.contentContainer}>
            <View style={styles.levelContainer}>
              <View style={styles.levelBadge} />
              <View style={styles.arrow} />
              <View style={[styles.levelBadge, styles.newLevelBadge]} />
            </View>
            <Text style={styles.description}>Placeholder</Text>
          </View>
        </View>
      </View>
    );
  }
  
  // Don't animate until we're ready
  if (!isVisible) {
    return (
      <View style={[styles.container, { opacity: 0 }]}>
        <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
          <Ionicons name="close" size={16} color={isDark || isSunset ? "#999" : "#ccc"} />
        </TouchableOpacity>
        
        <View style={styles.contentWrapper}>
          <View style={styles.headerContainer}>
            <View style={styles.iconContainer}>
              <Ionicons name="trophy" size={24} color="#FFD700" />
            </View>
            <Text style={styles.title}>LEVEL UP!</Text>
          </View>
          
          <View style={styles.contentContainer}>
            <View style={styles.levelContainer}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{oldLevel}</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color={isDark || isSunset ? theme.text : "#FFF"} style={styles.arrow} />
              <View style={[styles.levelBadge, styles.newLevelBadge]}>
                <Text style={styles.levelText}>{newLevel}</Text>
              </View>
            </View>
            <Text style={styles.description}>
              You've reached level {newLevel} {getSourceText()}
            </Text>
          </View>
        </View>
      </View>
    );
  }
  
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
                outputRange: [-20, 0] // Reduced movement to avoid layout issues
              })
            },
            {
              scale: animation.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0.95, 1.05, 1] // Gentler scale changes
              })
            }
          ]
        }
      ]}
    >
      <TouchableOpacity style={styles.dismissButton} onPress={onDismiss}>
        <Ionicons name="close" size={16} color={isDark || isSunset ? "#999" : "#ccc"} />
      </TouchableOpacity>
      
      <View style={styles.contentWrapper}>
        <View style={styles.headerContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="trophy" size={24} color="#FFD700" />
          </View>
          <Text style={styles.title}>LEVEL UP!</Text>
        </View>
        
        <View style={styles.contentContainer}>
          <View style={styles.levelContainer}>
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{oldLevel}</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color={isDark || isSunset ? theme.text : "#FFF"} style={styles.arrow} />
            <View style={[styles.levelBadge, styles.newLevelBadge]}>
              <Text style={styles.levelText}>{newLevel}</Text>
            </View>
          </View>
          <Text style={styles.description}>
            You've reached level {newLevel} {getSourceText()}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

// Use themed styles
const themedStyles = (theme, isDark, isSunset) => StyleSheet.create({
  container: {
    position: 'absolute',
    top: 40,
    left: 16,
    right: 16,
    backgroundColor: isDark || isSunset 
      ? 'rgba(45, 45, 60, 0.95)' 
      : 'rgba(67, 93, 141, 0.95)',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'column',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: theme.text,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: isDark || isSunset ? 'rgba(255,215,0,0.3)' : 'rgba(255,215,0,0.5)',
    // Ensure the component has enough height
    minHeight: 120,
  },
  dismissButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  contentWrapper: {
    width: '100%',
    flexDirection: 'column',
    alignItems: 'center',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  iconContainer: {
    height: 38,
    width: 38,
    borderRadius: 19,
    backgroundColor: isDark || isSunset ? 'rgba(255,215,0,0.2)' : 'rgba(255,215,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    marginRight: 8,
  },
  contentContainer: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  levelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 6,
  },
  levelBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: isDark || isSunset ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
  },
  newLevelBadge: {
    backgroundColor: '#FFD700',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
  },
  levelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: isDark || isSunset ? theme.text : '#FFF',
  },
  arrow: {
    marginHorizontal: 3,
  },
  description: {
    color: isDark || isSunset ? theme.text : 'white',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 2,
    paddingBottom: 4,
  }
});

export default LevelUpNotification; 