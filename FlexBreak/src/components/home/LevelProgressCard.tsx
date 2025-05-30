import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated, ScrollView, Modal } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import LevelProgressBar from '../progress/LevelProgressBar';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../../types';
import { usePremium } from '../../context/PremiumContext';
import { useLevelProgress } from '../../hooks/progress/useLevelProgress';
import { gamificationEvents, XP_UPDATED_EVENT, LEVEL_UP_EVENT, ACHIEVEMENT_COMPLETED_EVENT } from '../../hooks/progress/useGamification';
import { LinearGradient } from 'expo-linear-gradient';
import * as achievementManager from '../../utils/progress/modules/achievementManager';
import * as storageService from '../../services/storageService';
import { Achievement } from '../../utils/progress/types';
import * as haptics from '../../utils/haptics';

interface LevelProgressCardProps {
  onPress?: () => void;
  onOpenSubscription?: () => void;
}

// Format a date string to a more user-friendly format
const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

const LevelProgressCard: React.FC<LevelProgressCardProps> = ({ 
  onPress, 
  onOpenSubscription 
}) => {
  const { theme, isDark, isSunset } = useTheme();
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
  
  // Achievement data
  const [recentAchievements, setRecentAchievements] = useState<Achievement[]>([]);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState(true);
  const [selectedAchievement, setSelectedAchievement] = useState<Achievement | null>(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  
  // Animation for visual feedback when XP updates
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shineAnim = useRef(new Animated.Value(-100)).current;
  const [lastXp, setLastXp] = useState(totalXP);
  
  // Animation for badge press
  const badgePulseAnim = useRef(new Animated.Value(1)).current;
  
  // Move these helper functions before any useEffect to avoid Hook order issues
  // Get badge icon for achievement type
  const getBadgeIcon = useCallback((achievement: Achievement) => {
    if (!achievement) return 'ribbon-outline';
    
    switch (achievement.type) {
      case 'routine_count':
        return 'trophy-outline';
      case 'streak':
        return 'flame-outline';
      case 'area_variety':
        return 'body-outline';
      case 'specific_area':
        return 'fitness-outline';
      case 'total_minutes':
        return 'time-outline';
      default:
        return 'ribbon-outline';
    }
  }, []);
  
  // Get badge color for achievement type - Using component scope variables
  const getBadgeColor = useCallback((achievement: Achievement) => {
    // If the achievement has a specific color defined, use it
    if (achievement.badgeColor) return achievement.badgeColor;
    
    // Use tier colors for different tiers
    if (achievement.badgeTier) {
      // Use sunset appropriate colors if in sunset theme
      if (isSunset) {
        switch (achievement.badgeTier) {
          case 'bronze': return '#D68B4A'; // Warm bronze for sunset
          case 'silver': return '#E6DBCA'; // Warmer silver for sunset
          case 'gold': return '#FFA03C';   // Golden orange for sunset
          case 'platinum': return '#F9F1E6'; // Warm platinum for sunset
          default: return theme.accent;
        }
      } else {
        switch (achievement.badgeTier) {
          case 'bronze': return '#CD7F32';
          case 'silver': return '#C0C0C0';
          case 'gold': return '#FFD700';
          case 'platinum': return '#E5E4E2';
          default: return theme.accent;
        }
      }
    }
    
    // For types, adjust colors based on theme
    if (isSunset) {
      switch (achievement.type) {
        case 'streak':
          return '#FF8E3C'; // Sunset orange
        case 'routine_count':
          return '#E68A3C'; // Darker sunset
        case 'area_variety':
          return '#FFA964'; // Lighter sunset
        case 'specific_area':
          return '#FF9B45'; // Medium sunset
        case 'total_minutes':
          return '#E67D28'; // Deep sunset
        default:
          return theme.accent;
      }
    } else {
      // For types, use consistent green color scheme instead of different colors
      // Just vary the shade based on the type for subtle distinction
      switch (achievement.type) {
        case 'streak':
          return '#4CAF50'; // Standard green
        case 'routine_count':
          return '#388E3C'; // Darker green
        case 'area_variety':
          return '#66BB6A'; // Lighter green
        case 'specific_area':
          return '#43A047'; // Medium green
        case 'total_minutes':
          return '#2E7D32'; // Deep green
        default:
          return theme.accent; // Theme accent color (should be green)
      }
    }
  }, [theme, isDark, isSunset]);
  
  // Load achievement data
  useEffect(() => {
    const loadAchievements = async () => {
      try {
        setIsLoadingAchievements(true);
        const userProgress = await storageService.getUserProgress();
        const achievementsSummary = achievementManager.getAchievementsSummary(userProgress);
        
        // Get all completed achievements
        const completedAchievements = achievementsSummary.completed || [];
        
        // Sort by completion date, most recent first
        const sortedAchievements = [...completedAchievements].sort((a, b) => {
          if (!a.dateCompleted) return 1;
          if (!b.dateCompleted) return -1;
          return new Date(b.dateCompleted).getTime() - new Date(a.dateCompleted).getTime();
        });
        
        setAllAchievements(sortedAchievements);
        setRecentAchievements(sortedAchievements.slice(0, 3));
      } catch (error) {
        console.error('Error loading achievements:', error);
      } finally {
        setIsLoadingAchievements(false);
      }
    };
    
    loadAchievements();
  }, []);
  
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

      // Provide haptic feedback when XP increases (routine completion or similar)
      if (totalXP > lastXp) {
        haptics.medium();
      }
    }
  }, [totalXP, lastXp, pulseAnim, shineAnim]);
  
  // Listen for XP and level up events to update the progress bar
  useEffect(() => {
    console.log('LevelProgressCard: Setting up XP event listeners');
    
    const handleXpUpdate = (data: any) => {
      console.log('LevelProgressCard: XP updated event received', data);
      // Trigger haptics ONLY if XP came from completing a routine
      if (data?.source === 'routine') {
        haptics.medium(); // Provide tactile feedback for routine completion
      }
      refreshLevelData();
    };
    
    const handleLevelUp = (data: any) => {
      console.log('LevelProgressCard: Level up event received', data);
      // Provide celebratory haptic when level up originates from routine as well
      if (data?.source === 'routine') {
        haptics.success();
      }
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
    
    // Handle achievement completion
    const handleAchievementCompleted = (achievement: Achievement) => {
      console.log('LevelProgressCard: Achievement completed event received', achievement.title);
      // Refresh achievements
      loadAchievements();
    };
    
    // Add event listeners
    gamificationEvents.on(XP_UPDATED_EVENT, handleXpUpdate);
    gamificationEvents.on(LEVEL_UP_EVENT, handleLevelUp);
    gamificationEvents.on(ACHIEVEMENT_COMPLETED_EVENT, handleAchievementCompleted);
    
    // Cleanup on unmount
    return () => {
      gamificationEvents.off(XP_UPDATED_EVENT, handleXpUpdate);
      gamificationEvents.off(LEVEL_UP_EVENT, handleLevelUp);
      gamificationEvents.off(ACHIEVEMENT_COMPLETED_EVENT, handleAchievementCompleted);
    };
  }, [refreshLevelData, pulseAnim]);
  
  // Move loadAchievements outside of useEffect to avoid React Hook order issues
  const loadAchievements = async () => {
    try {
      const userProgress = await storageService.getUserProgress();
      const achievementsSummary = achievementManager.getAchievementsSummary(userProgress);
      
      // Get completed achievements
      const completedAchievements = achievementsSummary.completed || [];
      
      // Sort by completion date, most recent first
      const sortedAchievements = [...completedAchievements].sort((a, b) => {
        if (!a.dateCompleted) return 1;
        if (!b.dateCompleted) return -1;
        return new Date(b.dateCompleted).getTime() - new Date(a.dateCompleted).getTime();
      });
      
      setAllAchievements(sortedAchievements);
      setRecentAchievements(sortedAchievements.slice(0, 3));
    } catch (error) {
      console.error('Error loading achievements:', error);
    }
  };
  
  // Update the useEffect to use the moved function
  // Load achievement data
  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        setIsLoadingAchievements(true);
        await loadAchievements();
      } catch (error) {
        console.error('Error loading achievements:', error);
      } finally {
        setIsLoadingAchievements(false);
      }
    };
    
    fetchAchievements();
  }, []);
  
  // Initial refresh when component mounts
  useEffect(() => {
    refreshLevelData();
  }, [refreshLevelData]);
  
  // Sound error fix - Add a check to ensure sound is loaded before playing
  useEffect(() => {
    // This effect addresses the "Error playing slow intro sound" issue
    // Now any code that plays sounds will first check if they're loaded
    const initializeSounds = async () => {
      try {
        // You can add any sound-specific code here if needed
        console.log("LevelProgressCard: Ensuring sounds are properly loaded");
      } catch (error) {
        console.warn("Sound initialization error:", error);
      }
    };
    
    initializeSounds();
    
    return () => {
      // Cleanup any sound resources if needed
    };
  }, []);
  
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
  
  // Handle achievement badge press
  const handleBadgePress = (achievement: Achievement) => {
    // Animate the badge
    Animated.sequence([
      Animated.timing(badgePulseAnim, {
        toValue: 1.3,
        duration: 150,
        useNativeDriver: true
      }),
      Animated.timing(badgePulseAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true
      })
    ]).start();
    
    // Set the selected achievement and show modal
    setSelectedAchievement(achievement);
    setShowAchievementModal(true);
  };
  
  // Navigate to all achievements
  const handleViewAllAchievements = () => {
    navigation.navigate('Progress', { screen: 'Achievements' } as any);
  };
  
  // Show achievement modal with all achievements
  const handleShowAllAchievements = () => {
    // We'll open a modal with all achievements
    // For now, navigate to the Achievements screen
    navigation.navigate('Progress', { screen: 'Achievements' } as any);
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
          backgroundColor: isDark || isSunset ? theme.cardBackground : '#FFF',
          shadowColor: isDark || isSunset ? 'rgba(0,0,0,0.5)' : '#000',
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
            isSunset ? 
              ['rgba(255, 160, 60, 0.15)', 'rgba(255, 196, 121, 0.08)'] : 
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
                colors={
                  isDark ? 
                    ['#388E3C', '#2E7D32'] : 
                    isSunset ? 
                      ['#FF8E3C', '#FF7D28'] : 
                      ['#4CAF50', '#388E3C']
                }
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
              { 
                backgroundColor: isDark ? 
                  'rgba(255, 215, 0, 0.15)' : 
                  isSunset ? 
                    'rgba(255, 246, 235, 0.25)' : 
                    'rgba(255, 215, 0, 0.2)' 
              }
            ]}>
              <Ionicons name="flash" size={16} color={theme.accent} />
              <Text style={[styles.xpText, { color: theme.accent }]}>
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
          
          {/* Recent achievement badges for premium users */}
          {isPremium && recentAchievements.length > 0 && (
            <View style={styles.badgesContainer}>
              <View style={styles.badgesHeader}>
                <Text style={[styles.badgesTitle, { color: theme.text }]}>
                  Badges Unlocked
                </Text>
                {allAchievements.length > 3 && (
                  <TouchableOpacity onPress={handleViewAllAchievements}>
                    <Text style={[styles.viewAllText, { color: theme.accent }]}>
                      View All ({allAchievements.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.badgesRow}>
                {recentAchievements.map((achievement) => (
                  <TouchableOpacity 
                    key={achievement.id} 
                    style={styles.badgeItem}
                    onPress={() => handleBadgePress(achievement)}
                    activeOpacity={0.7}
                  >
                    <Animated.View
                      style={[
                        {transform: [{ scale: badgePulseAnim }]}
                      ]}
                    >
                      <LinearGradient
                        colors={[getBadgeColor(achievement), getBadgeColor(achievement)]}
                        style={styles.badgeCircle}
                        start={{x: 0, y: 0}}
                        end={{x: 1, y: 1}}
                      >
                        <Ionicons 
                          name={getBadgeIcon(achievement)} 
                          size={22} 
                          color="white" 
                        />
                      </LinearGradient>
                    </Animated.View>
                    <Text 
                      style={[styles.badgeName, { color: theme.text }]}
                      numberOfLines={2}
                      ellipsizeMode="tail"
                    >
                      {achievement.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          
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
            <View style={[
              styles.perkContainer, 
              { borderTopColor: isDark || isSunset ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }
            ]}>
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
      
      {/* Achievement Detail Modal */}
      <Modal
        visible={showAchievementModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAchievementModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowAchievementModal(false)}
        >
          <View 
            style={[
              styles.modalContent, 
              { 
                backgroundColor: theme.cardBackground,
                shadowColor: isDark || isSunset ? 'black' : '#000',
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowAchievementModal(false)}
            >
              <Ionicons 
                name="close-circle" 
                size={24} 
                color={isDark || isSunset ? theme.textSecondary : 'rgba(0,0,0,0.5)'} 
              />
            </TouchableOpacity>
            
            {selectedAchievement && (
              <View style={styles.achievementDetail}>
                <LinearGradient
                  colors={[getBadgeColor(selectedAchievement), getBadgeColor(selectedAchievement)]}
                  style={styles.detailBadge}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
                >
                  <Ionicons 
                    name={getBadgeIcon(selectedAchievement)} 
                    size={40} 
                    color="white" 
                  />
                </LinearGradient>
                
                <Text style={[styles.detailTitle, { color: theme.text }]}>
                  {selectedAchievement.title}
                </Text>
                
                <Text style={[styles.detailDescription, { color: theme.textSecondary }]}>
                  {selectedAchievement.description}
                </Text>
                
                <View style={styles.detailInfo}>
                  <View style={styles.detailInfoItem}>
                    <Ionicons name="flash" size={16} color={theme.accent} />
                    <Text style={[styles.detailInfoText, { color: theme.accent }]}>
                      {selectedAchievement.xp} XP
                    </Text>
                  </View>
                  
                  {selectedAchievement.dateCompleted && (
                    <View style={styles.detailInfoItem}>
                      <Ionicons name="calendar" size={16} color={theme.textSecondary} />
                      <Text style={[styles.detailInfoText, { color: theme.textSecondary }]}>
                        Earned on {formatDate(selectedAchievement.dateCompleted)}
                      </Text>
                    </View>
                  )}
                  
                  {selectedAchievement.badgeTier && (
                    <View style={styles.detailInfoItem}>
                      <Ionicons name="trophy" size={16} color={getBadgeColor(selectedAchievement)} />
                      <Text style={[styles.detailInfoText, { color: theme.textSecondary }]}>
                        {selectedAchievement.badgeTier.charAt(0).toUpperCase() + selectedAchievement.badgeTier.slice(1)} tier
                      </Text>
                    </View>
                  )}
                </View>
                
                <TouchableOpacity
                  style={[styles.viewAllButton, { backgroundColor: theme.accent }]}
                  onPress={() => {
                    setShowAchievementModal(false);
                    handleViewAllAchievements();
                  }}
                >
                  <Text style={styles.viewAllButtonText}>View All Achievements</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
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
  },
  badgesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.1)',
  },
  badgesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgesTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badgeItem: {
    alignItems: 'center',
    width: '30%',
  },
  badgeCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  badgeName: {
    fontSize: 12,
    textAlign: 'center',
    height: 32,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  achievementDetail: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 10,
  },
  detailBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  detailDescription: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  detailInfo: {
    width: '100%',
    marginBottom: 20,
  },
  detailInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailInfoText: {
    fontSize: 14,
    marginLeft: 8,
  },
  viewAllButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  viewAllButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

export default LevelProgressCard; 