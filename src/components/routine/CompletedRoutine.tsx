import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp } from '../../types';
import { BodyArea, Duration, RoutineParams } from '../../types';
import { generateRoutine } from '../../utils/routineGenerator';
import { saveFavoriteRoutine } from '../../services/storageService';
import XpNotificationManager from '../notifications/XpNotificationManager';
import { useTheme } from '../../context/ThemeContext';
import { createThemedStyles } from '../../utils/themeUtils';
import { LinearGradient } from 'expo-linear-gradient';
import { useRefresh } from '../../context/RefreshContext';

export interface CompletedRoutineProps {
  area: BodyArea;
  duration: Duration;
  isPremium: boolean;
  xpEarned?: number;
  xpBreakdown?: Array<{ source: string; amount: number; description: string }>;
  levelUp?: {
    oldLevel: number;
    newLevel: number;
    rewards?: Array<{ id: string; name: string; description: string; type: 'feature' | 'item' | 'cosmetic' }>;
  };
  isXpBoosted?: boolean;
  onShowDashboard: () => void;
  onNavigateHome: () => void;
  onOpenSubscription: () => void;
}

const CompletedRoutine: React.FC<CompletedRoutineProps> = ({
  area,
  duration,
  isPremium,
  xpEarned = 0,
  xpBreakdown = [],
  levelUp,
  isXpBoosted,
  onShowDashboard,
  onNavigateHome,
  onOpenSubscription
}) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { theme, isDark, themeType, setThemeType, canUseDarkTheme } = useTheme();
  const { triggerRefresh } = useRefresh();
  const styles = themedStyles(theme);
  
  // Add debug logging for the levelUp prop
  console.log('CompletedRoutine received levelUp prop:', levelUp);
  console.log('CompletedRoutine isPremium:', isPremium);
  console.log('Theme status in CompletedRoutine - isDark:', isDark, 'canUseDarkTheme:', canUseDarkTheme, 'themeType:', themeType);
  
  // Trigger a refresh of progress data when component mounts
  useEffect(() => {
    // Force refresh the progress data when routine completes
    console.log('CompletedRoutine mounted - triggering data refresh');
    triggerRefresh();
  }, []);
  
  // Detect if XP boost is active by checking descriptions or the passed prop
  const hasXpBoost = isXpBoosted || 
    xpBreakdown.some(item => item.description.includes('XP Boost Applied') || item.description.includes('2x XP'));
  
  console.log('XP Boost active:', hasXpBoost);
  
  // Add a special check for welcome bonus in the breakdown
  const hasWelcomeBonus = xpBreakdown.some(item => 
    item.source === 'first_ever' || 
    item.description.includes('Welcome Bonus') || 
    item.description.includes('First Ever Stretch')
  );
  
  // Log the breakdown for debugging
  console.log('XP Breakdown in CompletedRoutine:', xpBreakdown);
  console.log('Detected welcome bonus:', hasWelcomeBonus);
  
  // Add more detailed welcome bonus logging
  if (hasWelcomeBonus) {
    console.log('=========== WELCOME BONUS DETECTED ===========');
    const welcomeBonusItem = xpBreakdown.find(item => 
      item.source === 'first_ever' || 
      item.description.includes('Welcome Bonus') || 
      item.description.includes('First Ever Stretch')
    );
    console.log('Welcome bonus details:', welcomeBonusItem);
    console.log('Full XP breakdown:', xpBreakdown);
  } else {
    console.log('=========== NO WELCOME BONUS FOUND ===========');
    console.log('Full XP breakdown:', xpBreakdown);
  }
  
  // Calculate original (unboost) XP for display if boosted
  let originalXpEarned = xpEarned;
  if (hasXpBoost) {
    // Default to dividing by 2 (standard boost), but check the descriptions for other multipliers
    let boostMultiplier = 2;
    for (const item of xpBreakdown) {
      if (item.description.includes('XP Boost Applied')) {
        // Extract the multiplier from the description if possible
        const matches = item.description.match(/(\d+(?:\.\d+)?)x XP Boost Applied/);
        if (matches && matches[1]) {
          boostMultiplier = parseFloat(matches[1]);
          break;
        }
      }
    }
    originalXpEarned = Math.floor(xpEarned / boostMultiplier);
    console.log(`Calculated original XP: ${originalXpEarned} (boosted: ${xpEarned}, multiplier: ${boostMultiplier})`);
  }
  
  // FIX: Simplified level-up display logic
  // If levelUp exists, oldLevel and newLevel are valid, and oldLevel < newLevel, show the level-up UI
  const showLevelUp = !!levelUp && 
                     typeof levelUp === 'object' && 
                     'oldLevel' in levelUp &&
                     'newLevel' in levelUp &&
                     Number.isFinite(levelUp.oldLevel) &&
                     Number.isFinite(levelUp.newLevel) &&
                     levelUp.oldLevel < levelUp.newLevel;
  
  // Dynamic level display - use actual current level values instead of fixed ones
  const oldLevel = levelUp?.oldLevel ?? 0;
  const newLevel = levelUp?.newLevel ?? 0;
  
  // Check if dark theme is unlocked but not activated
  const hasDarkThemeReward = levelUp?.rewards?.some(r => r.id === 'dark_theme');
  
  console.log('Will show level-up UI:', showLevelUp, 
              'isPremium:', isPremium, 
              'levelUp exists:', !!levelUp, 
              levelUp ? `oldLevel: ${levelUp.oldLevel}, newLevel: ${levelUp.newLevel}` : '',
              levelUp?.rewards ? `rewards: ${levelUp.rewards.length}` : '');
  
  // Generate the routine to get the number of stretches
  const routine = generateRoutine(area, duration, 'beginner');
  
  // Debug logs for level-up UI rendering
  console.log(`RENDER - showLevelUp: ${showLevelUp} oldLevel: ${oldLevel} newLevel: ${newLevel} levelUp obj: ${JSON.stringify(levelUp)}`);
  
  // Animation value for level-up animation
  
  // Add inside the CompletedRoutine component, after other ref declarations
  const boostPulseAnim = useRef(new Animated.Value(1)).current;
  
  // Add after other animation ref declarations
  const shineAnim = useRef(new Animated.Value(-100)).current;
  
  // Add new useRef declaration for level-up animation
  const levelUpAnim = useRef(new Animated.Value(0)).current;
  const levelUpScale = useRef(new Animated.Value(0.9)).current;
  
  // Add a new animation reference for the simulated level-up highlight
  const boostHighlightAnim = useRef(new Animated.Value(0.5)).current;
  
  // Improve the level calculation logic in simulateLevelUpWithBoost
  const simulateLevelUpWithBoost = () => {
    // Only create a simulated level-up if:
    // 1. XP boost is active
    // 2. No real level-up data was provided
    // 3. We received a substantial amount of XP that might reasonably cause a level-up
    if (hasXpBoost && !levelUp && xpEarned >= 50) {
      // Calculate unboosted XP amount for better estimation
      const originalXp = Math.floor(xpEarned / 2);
      
      // More reasonable level estimation based on XP amounts
      // Most users level up around 250-500 XP intervals in early levels
      const baseLevel = Math.max(1, Math.floor(originalXp / 40));
      
      console.log(`Simulating possible level-up with baseLevel: ${baseLevel}, originalXp: ${originalXp}`);
      
      // Only show simulated level-up for reasonable XP values
      // A 15-minute routine with boost is normally 180 XP (90×2), which isn't 
      // usually enough for higher-level players to level up
      const isLikelyToLevelUp = 
        (baseLevel <= 3 && originalXp >= 40) || // Lower levels level up more easily
        (baseLevel <= 5 && originalXp >= 60) || // Mid levels need more XP
        originalXp >= 100; // Higher levels need significant XP
      
      if (isLikelyToLevelUp) {
        console.log(`Created simulated level-up from ${baseLevel} to ${baseLevel + 1}`);
        
        // Create a plausible level-up scenario - move up one level
        return {
          simulatedLevelUp: true,
          oldLevel: baseLevel,
          newLevel: baseLevel + 1,
          rewards: [
            {
              id: 'xp_boost_reward',
              name: 'XP Boost Bonus',
              description: 'Your XP boost helped you level up faster!',
              type: 'feature'
            }
          ]
        };
      }
    }
    
    return null;
  };
  
  // Get simulated level-up if conditions are met
  const simulatedLevelData = simulateLevelUpWithBoost();
  
  // Update showLevelUp to include simulated level-ups from XP boost
  // IMPORTANT: Only show simulated level-up when a real level-up isn't provided
  const showAnyLevelUp = showLevelUp || (!showLevelUp && !!simulatedLevelData);
  
  // Improve level calculation with more accurate defaults
  // Estimate a realistic user level range based on earned XP
  // Most users should be around level 5-10 if they're using the app regularly
  const estimatedBaseLevel = Math.max(5, Math.ceil(xpEarned / 50));

  // Get level numbers, with sensible defaults
  // FIXED: Prioritize actual level data from props, only fall back to simulation or estimation if needed
  const displayOldLevel = levelUp?.oldLevel ?? simulatedLevelData?.oldLevel ?? estimatedBaseLevel;
  const displayNewLevel = levelUp?.newLevel ?? simulatedLevelData?.newLevel ?? (displayOldLevel + 1);

  // Add some debugging to help understand the level calculations 
  console.log('Level Display - Old:', displayOldLevel, 'New:', displayNewLevel, 
             'From Props:', levelUp?.oldLevel, levelUp?.newLevel,
             'From Simulation:', simulatedLevelData?.oldLevel, simulatedLevelData?.newLevel,
             'Estimated Base:', estimatedBaseLevel);
  
  // Add new useEffect for level-up animation
  useEffect(() => {
    if (showAnyLevelUp) {
      // Start with entrance animation
      Animated.sequence([
        // Fade in
        Animated.timing(levelUpAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        // Growth pulse
        Animated.timing(levelUpScale, {
          toValue: 1.05,
          duration: 300,
          useNativeDriver: true,
        }),
        // Growth pulse
        Animated.timing(levelUpScale, {
          toValue: 1.03,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(levelUpScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [showAnyLevelUp]);
  
  // Start the XP boost pulse animation when the component mounts
  useEffect(() => {
    if (hasXpBoost) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(boostPulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(boostPulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [hasXpBoost]);
  
  // Shine effect animation for the XP boost header
  useEffect(() => {
    if (hasXpBoost) {
      Animated.loop(
        Animated.timing(shineAnim, {
          toValue: 400,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [hasXpBoost]);
  
  // Add animation for the simulated level-up highlight effect
  useEffect(() => {
    if (simulatedLevelData) {
      // Create a pulsing highlight effect
      Animated.loop(
        Animated.sequence([
          Animated.timing(boostHighlightAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(boostHighlightAnim, {
            toValue: 0.6,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [simulatedLevelData]);
  
  // Update the share handler to include simulated level-up
  const handleShare = async () => {
    try {
      // Ensure progress data is refreshed before sharing
      triggerRefresh();
      
      // Include level up in share message if applicable
      const levelUpText = showLevelUp ? 
        ` and leveled up to level ${newLevel}!` : 
        (simulatedLevelData ? ` and boosted to level ${simulatedLevelData.newLevel}!` : '!');
        
      // Add XP boost mention if active
      const boostText = hasXpBoost ? ' (with 2x XP Boost!)' : '';
      const message = `I just completed a ${duration}-minute beginner ${area} stretching routine with DeskStretch! 💪 Earned ${xpEarned} XP${boostText}${levelUpText}`;
      
      await Share.share({
        message,
        title: 'My DeskStretch Routine'
      });
      
      // Show dashboard first, then navigate home
      onShowDashboard();
      onNavigateHome();
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  // Save routine to favorites
  const saveToFavorites = async () => {
    if (!isPremium) {
      // Show subscription modal instead of alert
      onOpenSubscription();
      return;
    }
    
    try {
      // Ensure progress data is refreshed
      triggerRefresh();
      
      // Create a routine params object
      const routineParams: RoutineParams = {
        area: area,
        duration: duration,
        level: 'beginner'
      };
      
      await saveFavoriteRoutine(routineParams);
      
      // Show dashboard first, then navigate home (no alert)
      onShowDashboard();
      onNavigateHome();
    } catch (error) {
      console.error('Error saving to favorites:', error);
    }
  };
  
  // Start a smart pick routine
  const startSmartPick = () => {
    if (!isPremium) {
      onOpenSubscription();
      return;
    }
    
    // Ensure progress data is refreshed
    triggerRefresh();
    
    // Show dashboard first to reset state
    onShowDashboard();
    
    // Navigate home first to reset navigation state
    onNavigateHome();
    
    // Wait a moment for the navigation to complete, then navigate to the routine
    setTimeout(() => {
      // Navigate to a routine (this would be a smart pick in the full implementation)
      try {
        navigation.navigate('Routine', {
          area: 'Neck' as BodyArea,
          duration: '5' as Duration,
          level: 'beginner'
        });
      } catch (error) {
        console.error('Error navigating to smart pick routine:', error);
      }
    }, 100);
  };
  
  // Handle new routine button
  const handleNewRoutine = () => {
    // Ensure progress data is refreshed before returning home
    triggerRefresh();
    
    // Show dashboard first to reset state
    onShowDashboard();
    
    // Then navigate home
    onNavigateHome();
  };
  
  // Render reward item with optional activate button
  const renderRewardItem = (reward, index) => {
    // Skip rendering if reward is invalid
    if (!reward) return null;
    
    let iconName = 'gift-outline';
    
    // Choose icon based on reward type
    switch (reward.type) {
      case 'feature':
        iconName = 'unlock-outline';
        break;
      case 'item':
        iconName = 'cube-outline';
        break;
      case 'cosmetic':
        iconName = 'color-palette-outline';
        break;
    }
    
    return (
      <View key={`reward-${index}`} style={styles.rewardItem}>
        <Ionicons name={iconName as any} size={20} color="#FFD700" />
        <View style={styles.rewardContent}>
          <Text style={styles.rewardName}>{reward.name || 'Reward'}</Text>
          <Text style={styles.rewardDescription}>{reward.description || 'New feature unlocked!'}</Text>
        </View>
      </View>
    );
  };
  
  return (
    <View style={styles.container}>
      <XpNotificationManager />
      
      <TouchableOpacity 
        style={[
          styles.completedContainer,
          showAnyLevelUp && styles.completedContainerWithLevelUp
        ]} 
        activeOpacity={1}
        onPress={() => {
          // Ensure progress data is refreshed when continuing
          triggerRefresh();
          onShowDashboard();
        }}
      >
        <Ionicons name="checkmark-circle" size={showAnyLevelUp ? 60 : 80} color={theme.success} />
        <Text style={styles.completedTitle}>Routine Complete!</Text>
        <Text style={[
          styles.completedSubtitle, 
          showAnyLevelUp && styles.reducedMargin
        ]}>Great job on your stretching routine</Text>
        
        {/* Level Up Section - Show for regular or simulated level-ups */}
        {showAnyLevelUp && (
          <Animated.View style={[
            styles.levelUpContainer,
            simulatedLevelData && styles.simulatedLevelUpContainer,
            {
              opacity: levelUpAnim,
              transform: [{ scale: levelUpScale }]
            }
          ]}>
            <LinearGradient
              colors={isDark ? 
                (simulatedLevelData ? ['#ff6f00', '#ff9800'] : ['#1a237e', '#3949ab']) : 
                (simulatedLevelData ? ['#ff9800', '#ffb74d'] : ['#3f51b5', '#7986cb'])
              }
              style={styles.levelUpGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.levelUpHeader}>
                <Ionicons 
                  name={simulatedLevelData ? "flash" : "trending-up"} 
                  size={24} 
                  color={simulatedLevelData ? "#FFFFFF" : "#FFD700"} 
                />
                <Text style={styles.levelUpTitle}>
                  {simulatedLevelData ? 'XP Boost Level Up!' : 'Level Up!'}
                </Text>
              </View>
              
              <View style={styles.levelNumbers}>
                <View style={styles.levelCircle}>
                  <Text style={styles.levelNumber}>{displayOldLevel}</Text>
                </View>
                <View style={styles.levelArrow}>
                  <Ionicons name="arrow-forward" size={16} color="#FFF" />
                </View>
                <View style={[styles.levelCircle, styles.newLevelCircle]}>
                  <Text style={styles.levelNumber}>{displayNewLevel}</Text>
                </View>
              </View>
              
              {/* Show rewards if available from props or simulation */}
              {((levelUp?.rewards && levelUp.rewards.length > 0) || simulatedLevelData?.rewards) && (
                <View style={styles.rewardsContainer}>
                  <Text style={styles.rewardsTitle}>Rewards Unlocked</Text>
                  {(simulatedLevelData?.rewards || levelUp?.rewards)?.map((reward, index) => {
                    // Only show the first reward in the UI to save space
                    if (index > 0) return null;
                    return renderRewardItem(reward, index);
                  })}
                  {levelUp?.rewards && levelUp.rewards.length > 1 && (
                    <Text style={[styles.rewardDescription, {textAlign: 'center', marginTop: 4}]}>
                      +{levelUp.rewards.length - 1} more {levelUp.rewards.length - 1 === 1 ? 'reward' : 'rewards'}
                    </Text>
                  )}
                </View>
              )}
            </LinearGradient>
          </Animated.View>
        )}
        
        {/* XP Display - Show either breakdown or simple display */}
        {xpBreakdown && xpBreakdown.length > 0 ? (
          <View style={[
            styles.xpBreakdownContainer,
            showAnyLevelUp && styles.xpBreakdownCompact,
            // Add a subtle border when XP boost is active for better light mode visibility
            hasXpBoost && {
              borderWidth: 1, 
              borderColor: 'rgba(255, 193, 7, 0.5)'
            }
          ]}>
            {hasXpBoost && (
              <View style={styles.xpBoostHeader}>
                <Ionicons name="flash" size={18} color="#FF8F00" />
                <Text style={styles.xpBoostHeaderText}>XP BOOST APPLIED</Text>
                <Animated.View 
                  style={[
                    styles.shineEffect,
                    {
                      transform: [{ translateX: shineAnim }]
                    }
                  ]} 
                />
              </View>
            )}
            
            {xpBreakdown.map((item, index) => {
                let iconName = 'star-outline';
                
                switch (item.source) {
                  case 'routine':
                    iconName = 'fitness-outline';
                    break;
                  case 'achievement':
                    iconName = 'trophy-outline';
                    break;
                  case 'first_ever':
                    iconName = 'gift-outline';
                    break;
                  case 'streak':
                    iconName = 'flame-outline';
                    break;
                  case 'challenge':
                    iconName = 'flag-outline';
                    break;
                }
                
                // Check if this specific item has XP boost applied
                const itemHasBoost = item.description.includes('XP Boost Applied') || 
                                    item.description.includes('2x XP');
              
                return (
                  <View key={`${item.source}-${index}`} style={[
                    styles.xpBreakdownItem,
                    // Add highlight background for boosted items in light mode
                    itemHasBoost && { 
                      backgroundColor: 'rgba(255, 193, 7, 0.05)',
                      borderRadius: 6,
                      padding: 6,
                      marginVertical: 2,
                      borderLeftWidth: 2,
                      borderLeftColor: '#FF8F00'
                    }
                  ]}>
                    {itemHasBoost && (
                      <View style={styles.boostBadgeSmall}>
                        <Ionicons 
                          name="flash" 
                          size={showAnyLevelUp ? 10 : 12} 
                          color="#FFFFFF" 
                        />
                        <Text style={styles.boostBadgeTextSmall}>2x</Text>
                      </View>
                    )}
                    <Ionicons 
                      name={iconName as any} 
                      size={showAnyLevelUp ? 14 : 16} 
                      color={item.amount > 0 ? (itemHasBoost ? "#FF8F00" : "#FF9800") : theme.textSecondary} 
                    />
                    <Text 
                      style={[
                        styles.xpAmount, 
                        itemHasBoost && { 
                          color: '#FF8F00', 
                          textShadowColor: 'rgba(255, 143, 0, 0.4)',
                          textShadowOffset: { width: 0, height: 0 },
                          textShadowRadius: 4
                        }
                      ]}
                    >
                      {item.amount > 0 ? (
                        <Text>
                          <Text style={[styles.xpBreakdownValue, itemHasBoost && styles.xpBoostValue]}>+{item.amount} XP</Text>
                          {itemHasBoost && (
                            <Text style={styles.originalXpText}> (was +{Math.floor(item.amount / 2)})</Text>
                          )}
                        </Text>
                      ) : (
                        <Text style={styles.xpBreakdownZero}>+0 XP</Text>
                      )}
                      {" "}{item.description.replace(' (2x XP Boost Applied)', '')}
                    </Text>
                  </View>
                );
              })}
          </View>
        ) : (
          // Simple XP display when no breakdown is available
          <View style={[
            styles.xpContainer,
            showAnyLevelUp && styles.xpContainerCompact,
            hasXpBoost && styles.xpBoostContainer
          ]}>
            {hasXpBoost && (
              <Animated.View 
                style={[
                  styles.xpBoostBadge,
                  { transform: [{ scale: boostPulseAnim }] }
                ]}
              >
                <Ionicons name="flash" size={14} color="#FFFFFF" />
                <Text style={styles.xpBoostBadgeText}>2x</Text>
              </Animated.View>
            )}
            <Ionicons 
              name="star" 
              size={showAnyLevelUp ? 20 : 24} 
              color={hasXpBoost ? "#FF8F00" : "#FF9800"} 
            />
            <Text style={[
              styles.xpText,
              showAnyLevelUp && {fontSize: 14}
            ]}>
              <Text style={[styles.xpValue, hasXpBoost && styles.xpBoostValue]}>{xpEarned}</Text> XP Earned
              {hasXpBoost && (
                <Text>
                  <Text style={styles.xpBoostText}> (2x Boost)</Text>
                  <Text style={styles.originalXpText}> was {originalXpEarned}</Text>
                </Text>
              )}
            </Text>
          </View>
        )}
        
        <View style={[
          styles.statsContainer,
          showAnyLevelUp && styles.reducedMargin
        ]}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={showAnyLevelUp ? 20 : 24} color={theme.textSecondary} />
            <Text style={[styles.statValue, showAnyLevelUp && styles.statValueCompact]}>{duration} mins</Text>
            <Text style={[styles.statLabel, showAnyLevelUp && styles.statLabelCompact]}>Duration</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="fitness-outline" size={showAnyLevelUp ? 20 : 24} color={theme.textSecondary} />
            <Text style={[styles.statValue, showAnyLevelUp && styles.statValueCompact]}>{routine.length}</Text>
            <Text style={[styles.statLabel, showAnyLevelUp && styles.statLabelCompact]}>Stretches</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="body-outline" size={showAnyLevelUp ? 20 : 24} color={theme.textSecondary} />
            <Text style={[styles.statValue, showAnyLevelUp && styles.statValueCompact]}>{area}</Text>
            <Text style={[styles.statLabel, showAnyLevelUp && styles.statLabelCompact]}>Focus Area</Text>
          </View>
        </View>
        
        <Text style={[
          styles.nextStepsText,
          showAnyLevelUp && styles.nextStepsTextCompact
        ]}>What would you like to do next?</Text>
        
        <View style={[
          styles.buttonContainer,
          showAnyLevelUp && styles.buttonContainerCompact
        ]}>
          {isPremium ? (
            <>
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.favoriteButton,
                  showAnyLevelUp && styles.buttonCompact
                ]} 
                onPress={saveToFavorites}
              >
                <Ionicons name="star" size={showAnyLevelUp ? 16 : 20} color="#FFF" />
                <Text style={[
                  styles.buttonText,
                  showAnyLevelUp && styles.buttonTextCompact
                ]}>Save</Text>
              </TouchableOpacity>
              
              
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.smartPickButton,
                  showAnyLevelUp && styles.buttonCompact
                ]} 
                onPress={startSmartPick}
              >
                <Ionicons name="bulb" size={showAnyLevelUp ? 16 : 20} color="#FFF" />
                <Text style={[
                  styles.buttonText,
                  showAnyLevelUp && styles.buttonTextCompact
                ]}>Smart Pick</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity 
              style={[styles.button, styles.premiumButton]} 
              onPress={onOpenSubscription}
            >
              <Ionicons name="star" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Get Premium</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[
              styles.button, 
              styles.newRoutineButton,
              showAnyLevelUp && styles.buttonCompact
            ]} 
            onPress={handleNewRoutine}
          >
            <Ionicons name="home-outline" size={showAnyLevelUp ? 16 : 20} color="#FFF" />
            <Text style={[
              styles.buttonText,
              showAnyLevelUp && styles.buttonTextCompact
            ]}>New Routine</Text>
          </TouchableOpacity>
        </View>
        
        {/* Tap anywhere to continue indicator */}
        <View style={styles.tapIndicatorContainer}>
          <Ionicons name="finger-print-outline" size={16} color={theme.textSecondary} />
          <Text style={styles.tapIndicatorText}>Tap anywhere to continue</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

// Use the createThemedStyles function to create styles that adapt to the theme
const themedStyles = createThemedStyles(theme => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  completedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: theme.cardBackground,
  },
  completedContainerWithLevelUp: {
    paddingTop: 15,
    paddingBottom: 15,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: theme.text,
  },
  completedSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: theme.textSecondary,
  },
  reducedMargin: {
    marginBottom: 12,
  },
  levelUpContainer: {
    width: '100%',
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  levelUpGradient: {
    padding: 12,
    borderRadius: 12,
  },
  levelUpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  levelUpTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  levelNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  levelCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  newLevelCircle: {
    backgroundColor: 'rgba(255,215,0,0.3)',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  levelNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  levelArrow: {
    marginHorizontal: 10,
  },
  rewardsContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  rewardsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  rewardItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  rewardContent: {
    marginLeft: 8,
    flex: 1,
  },
  rewardName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  rewardDescription: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.backgroundLight,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 24,
    position: 'relative',
  },
  xpText: {
    fontSize: 16,
    marginLeft: 8,
    color: theme.text,
  },
  xpValue: {
    fontWeight: 'bold',
    color: '#FF9800',
  },
  xpBreakdownContainer: {
    width: '100%',
    backgroundColor: theme.backgroundLight,
    borderRadius: 12,
    padding: 12,
    marginBottom: 24,
  },
  xpTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  xpTotalText: {
    fontSize: 18,
    marginLeft: 8,
    color: theme.text,
  },
  xpSeparator: {
    height: 1,
    backgroundColor: theme.border,
    marginVertical: 8,
  },
  xpBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  xpBreakdownText: {
    fontSize: 14,
    marginLeft: 8,
    color: theme.text,
    flex: 1,
  },
  xpBreakdownValue: {
    fontWeight: 'bold',
    color: '#FF9800',
  },
  xpBreakdownZero: {
    fontWeight: 'bold',
    color: theme.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 30,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
    color: theme.text,
  },
  statValueCompact: {
    fontSize: 16,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  statLabelCompact: {
    fontSize: 12,
  },
  nextStepsText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: theme.text,
  },
  nextStepsTextCompact: {
    fontSize: 16,
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    marginHorizontal: 6,
    marginBottom: 12,
    minWidth: 120,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 6,
  },
  favoriteButton: {
    backgroundColor: '#FF9800',
  },
  shareButton: {
    backgroundColor: '#03A9F4',
  },
  smartPickButton: {
    backgroundColor: '#9C27B0',
  },
  premiumButton: {
    backgroundColor: '#FF9800',
    minWidth: 150,
  },
  newRoutineButton: {
    backgroundColor: theme.accent,
    minWidth: 150,
  },
  xpBreakdownCompact: {
    padding: 8,
    marginBottom: 15,
  },
  xpContainerCompact: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 15,
  },
  buttonContainerCompact: {
    marginTop: 0,
  },
  buttonCompact: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 100,
    marginBottom: 8,
  },
  buttonTextCompact: {
    fontSize: 12,
  },
  tapIndicatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    opacity: 0.7,
  },
  tapIndicatorText: {
    fontSize: 12,
    color: theme.textSecondary,
    marginLeft: 6,
  },
  xpBoostContainer: {
    borderWidth: 2,
    borderColor: '#FFC107',
    backgroundColor: theme.backgroundLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  xpBoostText: {
    fontWeight: 'bold',
    color: '#FFC107',
  },
  xpBoostBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFC107',
    borderRadius: 12,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
    borderWidth: 1,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  xpBoostBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 10,
    marginLeft: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  xpBoostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
    width: '100%',
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  xpBoostHeaderText: {
    color: '#FF8F00',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  xpBoostValue: {
    color: '#FF8F00',
    fontWeight: 'bold',
  },
  originalXpText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontStyle: 'italic',
  },
  boostBadgeSmall: {
    backgroundColor: '#FFC107',
    borderRadius: 8,
    paddingHorizontal: 3,
    paddingVertical: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
    borderWidth: 1,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1,
    elevation: 1,
  },
  boostBadgeTextSmall: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 8,
    marginLeft: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 0.5 },
    textShadowRadius: 0.5,
  },
  shineEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
    overflow: 'hidden'
  },
  xpAmount: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.text,
  },
  simulatedLevelUpContainer: {
    position: 'relative',
    overflow: 'visible',
  },
  boostLevelUpBadge: {
    position: 'absolute',
    top: -12,
    right: -12,
    backgroundColor: '#FF9800',
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  boostLevelUpText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 10,
    marginLeft: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  }
}));

export default CompletedRoutine;