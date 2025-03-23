import React, { useRef } from 'react';
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
  const styles = themedStyles(theme);
  
  // Add debug logging for the levelUp prop
  console.log('CompletedRoutine received levelUp prop:', levelUp);
  console.log('CompletedRoutine isPremium:', isPremium);
  console.log('Theme status in CompletedRoutine - isDark:', isDark, 'canUseDarkTheme:', canUseDarkTheme, 'themeType:', themeType);
  
  // Detect if XP boost is active by checking descriptions or the passed prop
  const hasXpBoost = isXpBoosted || 
    xpBreakdown.some(item => item.description.includes('XP Boost Applied') || item.description.includes('2x XP'));
  
  console.log('XP Boost active:', hasXpBoost);
  
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
  const scaleValue = useRef(new Animated.Value(1)).current;
  
  // Handle share
  const handleShare = async () => {
    try {
      // Include level up in share message if applicable
      const levelUpText = levelUp ? ` and leveled up to level ${newLevel}!` : '!';
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
    console.log('New routine button pressed');
    
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
          showLevelUp && styles.completedContainerWithLevelUp
        ]} 
        activeOpacity={1}
        onPress={onShowDashboard}
      >
        <Ionicons name="checkmark-circle" size={showLevelUp ? 60 : 80} color={theme.success} />
        <Text style={styles.completedTitle}>Routine Complete!</Text>
        <Text style={[
          styles.completedSubtitle, 
          showLevelUp && styles.reducedMargin
        ]}>Great job on your stretching routine</Text>
        
        {/* Level Up Section */}
        {showLevelUp && (
          <View style={styles.levelUpContainer}>
            <LinearGradient
              colors={isDark ? ['#1a237e', '#3949ab'] : ['#3f51b5', '#7986cb']}
              style={styles.levelUpGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.levelUpHeader}>
                <Ionicons name="trending-up" size={24} color="#FFD700" />
                <Text style={styles.levelUpTitle}>Level Up!</Text>
              </View>
              
              <View style={styles.levelNumbers}>
                <View style={styles.levelCircle}>
                  <Text style={styles.levelNumber}>{oldLevel}</Text>
                </View>
                <View style={styles.levelArrow}>
                  <Ionicons name="arrow-forward" size={16} color="#FFF" />
                </View>
                <View style={[styles.levelCircle, styles.newLevelCircle]}>
                  <Text style={styles.levelNumber}>{newLevel}</Text>
                </View>
              </View>
              
              {levelUp?.rewards && levelUp.rewards.length > 0 && (
                <View style={styles.rewardsContainer}>
                  <Text style={styles.rewardsTitle}>Rewards Unlocked</Text>
                  {levelUp.rewards.map((reward, index) => {
                    // Only show the first reward in the UI to save space
                    if (index > 0) return null;
                    return renderRewardItem(reward, index);
                  })}
                  {levelUp.rewards.length > 1 && (
                    <Text style={[styles.rewardDescription, {textAlign: 'center', marginTop: 4}]}>
                      +{levelUp.rewards.length - 1} more {levelUp.rewards.length - 1 === 1 ? 'reward' : 'rewards'}
                    </Text>
                  )}
                </View>
              )}
            </LinearGradient>
          </View>
        )}
        
        {/* XP Display - Show either breakdown or simple display */}
        {xpBreakdown && xpBreakdown.length > 0 ? (
          <View style={[
            styles.xpBreakdownContainer,
            showLevelUp && styles.xpBreakdownCompact,
            hasXpBoost && styles.xpBoostContainer
          ]}>
            <View style={styles.xpTotalRow}>
              {hasXpBoost && (
                <View style={styles.xpBoostBadge}>
                  <Ionicons name="flash" size={showLevelUp ? 14 : 16} color="#FFFFFF" />
                  <Text style={styles.xpBoostBadgeText}>2x</Text>
                </View>
              )}
              <Ionicons 
                name={hasXpBoost ? "star" : "star"} 
                size={showLevelUp ? 20 : 24} 
                color={hasXpBoost ? "#FFC107" : "#FF9800"} 
              />
              <Text style={[
                styles.xpTotalText,
                showLevelUp && {fontSize: 16}
              ]}>
                <Text style={styles.xpValue}>{xpEarned}</Text> XP {xpEarned > 0 ? 'Earned' : 'Earned from Previous Stretch'}
                {hasXpBoost && <Text style={styles.xpBoostText}> (2x Boost)</Text>}
              </Text>
            </View>
            
            <View style={styles.xpSeparator} />
            
            {/* If level-up is shown, only display non-zero XP items to save space */}
            {xpBreakdown
              .filter(item => !showLevelUp || item.amount > 0)
              .map((item, index) => {
                // Get appropriate icon based on source
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
                  <View key={`${item.source}-${index}`} style={styles.xpBreakdownItem}>
                    {itemHasBoost && (
                      <Ionicons 
                        name="flash" 
                        size={showLevelUp ? 12 : 14} 
                        color="#FFC107" 
                        style={styles.boostIcon} 
                      />
                    )}
                    <Ionicons 
                      name={iconName as any} 
                      size={showLevelUp ? 14 : 16} 
                      color={item.amount > 0 ? (itemHasBoost ? "#FFC107" : "#FF9800") : theme.textSecondary} 
                    />
                    <Text style={[
                      styles.xpBreakdownText, 
                      item.amount === 0 && styles.xpBreakdownZero,
                      showLevelUp && {fontSize: 12}
                    ]}>
                      {item.amount > 0 ? (
                        <Text style={styles.xpBreakdownValue}>+{item.amount} XP</Text>
                      ) : (
                        <Text style={styles.xpBreakdownZero}>+0 XP</Text>
                      )}
                      {" "}{item.description}
                    </Text>
                  </View>
                );
              })}
          </View>
        ) : (
          // Simple XP display when no breakdown is available
          <View style={[
            styles.xpContainer,
            showLevelUp && styles.xpContainerCompact,
            hasXpBoost && styles.xpBoostContainer
          ]}>
            {hasXpBoost && (
              <View style={styles.xpBoostBadge}>
                <Ionicons name="flash" size={12} color="#FFFFFF" />
                <Text style={styles.xpBoostBadgeText}>2x</Text>
              </View>
            )}
            <Ionicons 
              name="star" 
              size={showLevelUp ? 20 : 24} 
              color={hasXpBoost ? "#FFC107" : "#FF9800"} 
            />
            <Text style={[
              styles.xpText,
              showLevelUp && {fontSize: 14}
            ]}>
              <Text style={styles.xpValue}>{xpEarned}</Text> XP Earned
              {hasXpBoost && <Text style={styles.xpBoostText}> (2x Boost)</Text>}
            </Text>
          </View>
        )}
        
        <View style={[
          styles.statsContainer,
          showLevelUp && styles.reducedMargin
        ]}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={showLevelUp ? 20 : 24} color={theme.textSecondary} />
            <Text style={[styles.statValue, showLevelUp && styles.statValueCompact]}>{duration} mins</Text>
            <Text style={[styles.statLabel, showLevelUp && styles.statLabelCompact]}>Duration</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="fitness-outline" size={showLevelUp ? 20 : 24} color={theme.textSecondary} />
            <Text style={[styles.statValue, showLevelUp && styles.statValueCompact]}>{routine.length}</Text>
            <Text style={[styles.statLabel, showLevelUp && styles.statLabelCompact]}>Stretches</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="body-outline" size={showLevelUp ? 20 : 24} color={theme.textSecondary} />
            <Text style={[styles.statValue, showLevelUp && styles.statValueCompact]}>{area}</Text>
            <Text style={[styles.statLabel, showLevelUp && styles.statLabelCompact]}>Focus Area</Text>
          </View>
        </View>
        
        <Text style={[
          styles.nextStepsText,
          showLevelUp && styles.nextStepsTextCompact
        ]}>What would you like to do next?</Text>
        
        <View style={[
          styles.buttonContainer,
          showLevelUp && styles.buttonContainerCompact
        ]}>
          {isPremium ? (
            <>
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.favoriteButton,
                  showLevelUp && styles.buttonCompact
                ]} 
                onPress={saveToFavorites}
              >
                <Ionicons name="star" size={showLevelUp ? 16 : 20} color="#FFF" />
                <Text style={[
                  styles.buttonText,
                  showLevelUp && styles.buttonTextCompact
                ]}>Save</Text>
              </TouchableOpacity>
              
              
              <TouchableOpacity 
                style={[
                  styles.button, 
                  styles.smartPickButton,
                  showLevelUp && styles.buttonCompact
                ]} 
                onPress={startSmartPick}
              >
                <Ionicons name="bulb" size={showLevelUp ? 16 : 20} color="#FFF" />
                <Text style={[
                  styles.buttonText,
                  showLevelUp && styles.buttonTextCompact
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
              showLevelUp && styles.buttonCompact
            ]} 
            onPress={handleNewRoutine}
          >
            <Ionicons name="home-outline" size={showLevelUp ? 16 : 20} color="#FFF" />
            <Text style={[
              styles.buttonText,
              showLevelUp && styles.buttonTextCompact
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
    borderWidth: 1,
    borderColor: '#FFC107',
    backgroundColor: `${theme.backgroundLight}`,
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
    paddingHorizontal: 4,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  xpBoostBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 10,
    marginLeft: 2,
  },
  boostIcon: {
    position: 'absolute',
    top: 0,
    right: -10,
  },
}));

export default CompletedRoutine;