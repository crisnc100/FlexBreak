import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import LevelProgressBar from '../progress/LevelProgressBar';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../../types';
import { usePremium } from '../../context/PremiumContext';
import { useLevelProgress } from '../../hooks/progress/useLevelProgress';
import { gamificationEvents, XP_UPDATED_EVENT, LEVEL_UP_EVENT } from '../../hooks/progress/useGamification';
import { LinearGradient } from 'expo-linear-gradient';

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
  const shineAnim = useRef(new Animated.Value(-100)).current;
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
      
      // Run shine animation
      Animated.timing(shineAnim, {
        toValue: 400,
        duration: 1000,
        useNativeDriver: true
      }).start(() => {
        shineAnim.setValue(-100);
      });
      
      // Update the last XP value
      setLastXp(totalXP);
    }
  }, [totalXP, lastXp, pulseAnim, shineAnim]);
  
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
      
      // Additional animation for level up
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 200,
          useNativeDriver: true
        }),
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
    };
    
    // Add event listeners
    gamificationEvents.on(XP_UPDATED_EVENT, handleXpUpdate);
    gamificationEvents.on(LEVEL_UP_EVENT, handleLevelUp);
    
    // Cleanup on unmount
    return () => {
      gamificationEvents.off(XP_UPDATED_EVENT, handleXpUpdate);
      gamificationEvents.off(LEVEL_UP_EVENT, handleLevelUp);
    };
  }, [refreshLevelData, pulseAnim]);
  
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
      {!isPremium && (
        <Animated.View 
          style={[
            styles.shine,
            { transform: [{ translateX: shineAnim }] }
          ]}
        />
      )}
      
      <LinearGradient
        colors={
          isDark ? 
            ['rgba(76, 175, 80, 0.1)', 'rgba(33, 150, 243, 0.05)'] : 
            ['rgba(200, 230, 201, 0.5)', 'rgba(187, 222, 251, 0.3)']
        }
        style={styles.cardBackground}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 1}}
      >
        <TouchableOpacity 
          style={styles.touchable}
          onPress={handleCardPress}
          onLongPress={handleDebugLongPress}
          activeOpacity={0.8}
        >
          <View style={styles.header}>
            <View style={styles.levelBadgeContainer}>
              <LinearGradient
                colors={isDark ? ['#388E3C', '#2E7D32'] : ['#4CAF50', '#388E3C']}
                style={styles.levelBadge}
                start={{x: 0, y: 0}}
                end={{x: 1, y: 0}}
              >
                <Text style={styles.levelText}>Level {currentLevel}</Text>
                <MaterialCommunityIcons 
                  name="star-four-points" 
                  size={14} 
                  color="#FFFFFF" 
                  style={styles.levelIcon}
                />
              </LinearGradient>
              <Text style={[styles.levelTitle, { color: theme.textSecondary }]}>
                {currentLevelData?.title || ''}
              </Text>
            </View>
            
            <View style={[
              styles.xpContainer, 
              { backgroundColor: isDark ? 'rgba(255, 215, 0, 0.15)' : 'rgba(255, 215, 0, 0.2)' }
            ]}>
              <Ionicons name="flash" size={16} color={isDark ? "#FFD700" : "#FF9800"} />
              <Text style={[styles.xpText, { color: isDark ? '#FFD700' : '#FF9800' }]}>
                {totalXP} XP
              </Text>
            </View>
          </View>
          
          {/* Use the LevelProgressBar component */}
          <View style={styles.progressSection}>
            <LevelProgressBar
              currentLevel={currentLevel}
              levelTitle={currentLevelData?.title}
              totalXP={totalXP}
              xpProgress={xpProgress}
              xpToNextLevel={xpToNextLevel}
              nextLevelTitle={nextLevelData?.title}
              compact={true}
              showXpCounter={false}
            />
          </View>
          
          {isPremium ? (
            <View style={styles.viewMoreContainer}>
              <Text style={[styles.viewMoreText, { color: theme.accent }]}>
                View Stats & Achievements
              </Text>
              <Ionicons 
                name="chevron-forward"
                size={14} 
                color={theme.accent} 
              />
            </View>
          ) : (
            <View style={[styles.perkContainer, { borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={styles.perkItem}>
                <Ionicons name="rocket-outline" size={15} color={theme.accent} />
                <Text style={[styles.perkText, { color: theme.textSecondary }]}>
                  Level {getRequiredLevel('custom_reminders')} unlocks custom reminders
                </Text>
              </View>
              <TouchableOpacity
                onPress={onOpenSubscription || handleCardPress}
                style={[styles.upgradeButton, { backgroundColor: theme.accent }]}
              >
                <Text style={styles.upgradeButtonText}>Upgrade</Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </LinearGradient>
    </Animated.View>
  );
};

const getRequiredLevel = (feature: string): number => {
  // This is a simple function to avoid importing the full feature access hook
  // which would be overkill for this component
  switch (feature) {
    case 'custom_reminders': return 3;
    case 'custom_routines': return 5;
    default: return 2;
  }
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardBackground: {
    borderRadius: 16,
    overflow: 'hidden'
  },
  touchable: {
    width: '100%',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  levelBadgeContainer: {
    flexDirection: 'column',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  levelIcon: {
    marginLeft: 4
  },
  levelTitle: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 2,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    justifyContent: 'center',
  },
  xpText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  progressSection: {
    marginTop: 8,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  viewMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 6,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  perkContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  perkText: {
    fontSize: 12,
    marginLeft: 6,
    flex: 1,
  },
  upgradeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  upgradeButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    transform: [{ skewX: '-20deg' }],
    zIndex: 10
  }
});

export default LevelProgressCard; 