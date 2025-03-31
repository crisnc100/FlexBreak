import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import LevelProgressBar from '../progress/LevelProgressBar';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../../types';
import { usePremium } from '../../context/PremiumContext';
import { useLevelProgress } from '../../hooks/progress/useLevelProgress';
import { gamificationEvents, XP_UPDATED_EVENT, LEVEL_UP_EVENT } from '../../hooks/progress/useGamification';

interface LevelProgressCardProps {
  onPress?: () => void;
  onOpenSubscription?: () => void;
}

const LevelProgressCard: React.FC<LevelProgressCardProps> = ({ 
  onPress, 
  onOpenSubscription 
}) => {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  const { 
    currentLevel, 
    currentLevelData, 
    nextLevelData, 
    totalXP, 
    xpToNextLevel, 
    xpProgress,
    refreshLevelData
  } = useLevelProgress();
  const { isPremium } = usePremium();
  
  // Animation for visual feedback when XP updates
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [lastXp, setLastXp] = useState(totalXP);
  
  // Detect XP changes and animate
  useEffect(() => {
    if (lastXp !== totalXP) {
      console.log(`LevelProgressCard: XP changed from ${lastXp} to ${totalXP}`);
      
      // Animate the card to provide visual feedback
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
      
      // Update the last XP value
      setLastXp(totalXP);
    }
  }, [totalXP, lastXp, pulseAnim]);
  
  // Listen for XP and level up events to update the progress bar
  useEffect(() => {
    console.log('LevelProgressCard: Setting up XP event listeners');
    
    const handleXpUpdate = (data: any) => {
      console.log('LevelProgressCard: XP updated event received', data);
      refreshLevelData();
    };
    
    const handleLevelUp = (data: any) => {
      console.log('LevelProgressCard: Level up event received', data);
      refreshLevelData();
    };
    
    // Add event listeners
    gamificationEvents.on(XP_UPDATED_EVENT, handleXpUpdate);
    gamificationEvents.on(LEVEL_UP_EVENT, handleLevelUp);
    
    // Cleanup on unmount
    return () => {
      gamificationEvents.off(XP_UPDATED_EVENT, handleXpUpdate);
      gamificationEvents.off(LEVEL_UP_EVENT, handleLevelUp);
    };
  }, [refreshLevelData]);
  
  // Initial refresh when component mounts
  useEffect(() => {
    refreshLevelData();
  }, [refreshLevelData]);
  
  const handleCardPress = () => {
    if (onPress) {
      onPress();
    } else if (isPremium) {
      // Only navigate to Progress tab if premium user
      navigation.navigate('Progress' as any);
    } else if (onOpenSubscription) {
      // Show subscription modal for free users
      onOpenSubscription();
    } else {
      // Fallback if no onOpenSubscription prop provided
      Alert.alert(
        'Premium Feature',
        'Detailed progress tracking is a premium feature. Upgrade to premium to access it.',
        [{ text: 'OK' }]
      );
    }
  };
  
  // Development only - Debug tap handler to test XP updates (long press)
  const handleDebugLongPress = () => {
    if (__DEV__) {
      console.log('LevelProgressCard: Debug long press detected, refreshing data');
      refreshLevelData();
    }
  };
  
  return (
    <Animated.View
      style={[
        styles.container,
        { 
          backgroundColor: isDark ? theme.cardBackground : '#FFF',
          shadowColor: isDark ? 'rgba(0,0,0,0.5)' : '#000',
          transform: [{ scale: pulseAnim }]
        }
      ]}
    >
      <TouchableOpacity 
        style={styles.touchable}
        onPress={handleCardPress}
        onLongPress={handleDebugLongPress}
        activeOpacity={0.8}
      >
        {/* Use the LevelProgressBar component that has better styling and updates dynamically */}
        <LevelProgressBar
          currentLevel={currentLevel}
          levelTitle={currentLevelData?.title}
          totalXP={totalXP}
          xpProgress={xpProgress}
          xpToNextLevel={xpToNextLevel}
          nextLevelTitle={nextLevelData?.title}
          compact={true}
          showXpCounter={true}
        />
        
        <View style={styles.viewMoreContainer}>
          <Text style={[styles.viewMoreText, { color: theme.accent }]}>
            {isPremium ? 'View Details' : 'Upgrade for More Stats'}
          </Text>
          <Ionicons 
            name={isPremium ? "chevron-forward" : "star"}
            size={14} 
            color={theme.accent} 
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 8,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  touchable: {
    width: '100%',
  },
  viewMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: '500',
    marginRight: 2,
  }
});

export default LevelProgressCard; 