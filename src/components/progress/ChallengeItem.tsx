import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { Challenge, CHALLENGE_STATUS } from '../../utils/progress/types';
import { useGamification } from '../../hooks/progress/useGamification';
import * as Haptics from 'expo-haptics';
import { Animated } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import * as xpBoostManager from '../../utils/progress/modules/xpBoostManager';

interface ChallengeItemProps {
  challenge: Challenge;
  onClaimSuccess?: () => void;
  style?: any;
  isXpBoosted?: boolean;
}

const ChallengeItem: React.FC<ChallengeItemProps> = ({ challenge, onClaimSuccess, style, isXpBoosted = false }) => {
  const { claimChallenge, getTimeRemainingForChallenge, formatTimeRemaining } = useGamification();
  const { theme, isDark } = useTheme();
  const [isClaiming, setIsClaiming] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [opacity] = useState(new Animated.Value(1));
  const [scale] = useState(new Animated.Value(1));
  const [highlight] = useState(new Animated.Value(0));
  const [xpMultiplier, setXpMultiplier] = useState(1);
  
  // Add debug logging for streak challenges on mount
  useEffect(() => {
    if (challenge.type === 'streak') {
      console.log(`STREAK CHALLENGE DEBUG - ${challenge.title}`, {
        id: challenge.id,
        progress: challenge.progress,
        requirement: challenge.requirement,
        completed: challenge.completed,
        status: challenge.status,
        lastUpdated: challenge.lastUpdated
      });
    }
  }, [challenge]);
  
  // Check for XP boost multiplier on mount
  useEffect(() => {
    const checkXpBoost = async () => {
      if (isXpBoosted) {
        const { isActive, data } = await xpBoostManager.checkXpBoostStatus();
        if (isActive) {
          setXpMultiplier(data.multiplier);
        }
      }
    };
    
    checkXpBoost();
  }, [isXpBoosted]);
  
  // Update time remaining every minute
  useEffect(() => {
    const updateTimeRemaining = () => {
      const msRemaining = getTimeRemainingForChallenge(challenge);
      setTimeRemaining(formatTimeRemaining(msRemaining));
    };
    
    // Update immediately
    updateTimeRemaining();
    
    // Then update every minute
    const interval = setInterval(updateTimeRemaining, 60000);
    return () => clearInterval(interval);
  }, [challenge, getTimeRemainingForChallenge, formatTimeRemaining]);
  
  // Create interpolated values for the highlight effect
  const highlightBackground = highlight.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [
      'transparent', 
      isDark ? 'rgba(76, 175, 80, 0.2)' : 'rgba(76, 175, 80, 0.15)',
      'transparent'
    ]
  });
  
  // Handle claiming the challenge
  const handleClaim = async () => {
    if (!challenge.completed || challenge.claimed || isClaiming) return;
    
    setIsClaiming(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const result = await claimChallenge(challenge.id);
      
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        // Play highlight animation first
        Animated.timing(highlight, {
          toValue: 1,
          duration: 600,
          useNativeDriver: false, // We need to animate backgroundColor
        }).start();
        
        // Delay the fade out animation slightly for a more satisfying sequence
        setTimeout(() => {
          // Create a smoother animation sequence with scale and opacity
          Animated.parallel([
            // Fade out animation (slower)
            Animated.timing(opacity, {
              toValue: 0,
              duration: 800, // Increased from 500ms
              useNativeDriver: true,
              easing: (t) => t, // Linear easing for smoother fade
            }),
            // Add a subtle scale animation
            Animated.sequence([
              // First scale up slightly
              Animated.timing(scale, {
                toValue: 1.03,
                duration: 200,
                useNativeDriver: true,
              }),
              // Then scale down and away
              Animated.timing(scale, {
                toValue: 0.95,
                duration: 600,
                useNativeDriver: true,
              }),
            ]),
          ]).start(() => {
            // Wait a moment before triggering the success callback
            setTimeout(() => {
              if (onClaimSuccess) {
                onClaimSuccess();
              }
            }, 150); // Add a short delay before removing from list
          });
        }, 200); // Wait 200ms to start fade out animation
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setIsClaiming(false);
      }
    } catch (error) {
      console.error('Error claiming challenge:', error);
      setIsClaiming(false);
    }
  };
  
  // Get time type based on challenge category
  const getTimeType = () => {
    switch (challenge.category) {
      case 'daily': return 'Resets daily';
      case 'weekly': return 'Resets weekly';
      case 'monthly': return 'Resets monthly';
      case 'special': return 'Limited time';
      default: return '';
    }
  };
  
  // Get the correct icon based on the challenge status
  const getStatusIcon = () => {
    if (challenge.status === CHALLENGE_STATUS.CLAIMED) {
      return <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />;
    } else if (challenge.status === CHALLENGE_STATUS.COMPLETED) {
      return <MaterialCommunityIcons name="gift" size={24} color="#FF9800" />;
    } else if (challenge.status === CHALLENGE_STATUS.EXPIRED) {
      return <MaterialCommunityIcons name="timer-off" size={24} color="#F44336" />;
    } else {
      return <MaterialCommunityIcons name="timer-sand" size={24} color="#2196F3" />;
    }
  };
  
  // Calculate the progress percentage
  const progressPercent = Math.min(100, Math.round((challenge.progress / challenge.requirement) * 100));
  
  // Get a description of the progress
  const getProgressDescription = () => {
    if (challenge.completed) {
      return 'Completed';
    }
    
    switch (challenge.type) {
      case 'routine_count':
        return `${challenge.progress}/${challenge.requirement} routines`;
      case 'daily_minutes':
      case 'total_minutes':
        return `${challenge.progress}/${challenge.requirement} minutes`;
      case 'streak':
        // Add more descriptive text for streak challenges
        if (challenge.progress === 0) {
          return `Start your streak! 0/${challenge.requirement} days`;
        } else if (challenge.progress === 1) {
          return `1/${challenge.requirement} day streak`;
        } else {
          return `${challenge.progress}/${challenge.requirement} day streak`;
        }
      case 'weekly_consistency':
        return `${challenge.progress}/${challenge.requirement} days this week`;
      case 'unique_days':
        return `${challenge.progress}/${challenge.requirement} unique days`;
      case 'area_variety':
        return `${challenge.progress}/${challenge.requirement} unique areas`;
      case 'specific_area':
        const area = challenge.requirementData?.area || challenge.areaTarget || 'specified area';
        return `${challenge.progress}/${challenge.requirement} routines in ${area}`;
      default:
        return `${challenge.progress}/${challenge.requirement}`;
    }
  };
  
  // Determine if the challenge is about to expire (for UI highlighting)
  const isExpiring = challenge.expiryWarning === true;
  
  // Format the end date for display
  const formatEndDate = () => {
    if (!challenge.endDate) return '';
    
    const endDate = new Date(challenge.endDate);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Check if it's today or tomorrow
    if (endDate.toDateString() === today.toDateString()) {
      return 'Ends today';
    } else if (endDate.toDateString() === tomorrow.toDateString()) {
      return 'Ends tomorrow';
    } else {
      // Calculate days until end
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 7) {
        // For less than a week, show days
        return `Ends in ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
      } else if (challenge.category === 'monthly') {
        // For monthly challenges, show date
        return `Ends ${endDate.getMonth() + 1}/${endDate.getDate()}`;
      } else {
        // Format as MM/DD for others
        return `Ends ${endDate.getMonth() + 1}/${endDate.getDate()}`;
      }
    }
  };
  
  // Format the claim deadline for completed challenges
  const formatClaimDeadline = () => {
    if (!challenge.expiryDate) return '';
    
    const expiryDate = new Date(challenge.expiryDate);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    
    // If less than zero, it's already expired
    if (diffTime <= 0) {
      return 'Expired';
    }
    
    const hours = Math.round(diffTime / (1000 * 60 * 60));
    
    if (hours < 1) {
      // Less than an hour, show minutes
      const minutes = Math.round(diffTime / (1000 * 60));
      return `Claim now! (${minutes} min${minutes !== 1 ? 's' : ''} left)`;
    } else if (hours < 24) {
      // Less than a day, show hours
      return `Claim within ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else {
      // More than a day, show days
      const days = Math.floor(hours / 24);
      const remainingHours = hours % 24;
      
      if (remainingHours === 0) {
        return `Claim within ${days} day${days !== 1 ? 's' : ''}`;
      } else {
        return `Claim within ${days}d ${remainingHours}h`;
      }
    }
  };
  
  // Calculate boosted and original XP
  const originalXp = challenge.xp;
  const boostedXp = isXpBoosted ? Math.floor(originalXp * xpMultiplier) : originalXp;
  
  return (
    <Animated.View style={[
      styles.container, 
      { 
        backgroundColor: isDark ? theme.cardBackground : '#FFF',
        shadowColor: isDark ? 'rgba(0,0,0,0.8)' : '#000',
      },
      style, 
      { 
        opacity,
        transform: [
          { scale }
        ],
        backgroundColor: highlightBackground
      }
    ]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {getStatusIcon()}
          <Text style={[styles.title, { color: isDark ? theme.text : '#333' }]} numberOfLines={1} ellipsizeMode="tail">{challenge.title}</Text>
        </View>
        
        {!challenge.completed && (
          <View style={[
            styles.deadlineTag,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F5F5F5' }
          ]}>
            <MaterialCommunityIcons 
              name="calendar"
              size={14} 
              color={isDark ? theme.textSecondary : "#757575"}
            />
            <Text style={[styles.deadlineText, { color: isDark ? theme.textSecondary : "#757575" }]}>
              {formatEndDate()}
            </Text>
          </View>
        )}
        
        {challenge.status === CHALLENGE_STATUS.COMPLETED && !challenge.claimed && (
          <View style={[
            styles.expiryTag, 
            isExpiring && styles.expiryTagWarning,
            { backgroundColor: isDark ? (isExpiring ? 'rgba(244,67,54,0.2)' : 'rgba(255,255,255,0.1)') : (isExpiring ? '#FFEBEE' : '#F5F5F5') }
          ]}>
            <MaterialCommunityIcons 
              name={isExpiring ? "alarm" : "timer-outline"} 
              size={14} 
              color={isExpiring ? "#F44336" : (isDark ? theme.textSecondary : "#757575")} 
            />
            <Text style={[
              styles.expiryText, 
              isExpiring && styles.expiryTextWarning,
              { color: isExpiring ? "#F44336" : (isDark ? theme.textSecondary : "#757575") }
            ]}>
              {timeRemaining}
            </Text>
          </View>
        )}
      </View>
      
      <Text style={[styles.description, { color: isDark ? theme.textSecondary : '#666' }]}>{challenge.description}</Text>
      
      <View style={styles.progressContainer}>
        <View style={[styles.progressBarBackground, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0' }]}>
          <LinearGradient
            colors={challenge.completed ? 
              (isDark ? ['#388E3C', '#7CB342'] : ['#4CAF50', '#8BC34A']) : 
              (isDark ? ['#1565C0', '#2196F3'] : ['#2196F3', '#03A9F4'])
            }
            start={[0, 0]}
            end={[1, 0]}
            style={[
              styles.progressBar,
              { width: `${progressPercent}%` }
            ]}
          />
        </View>
        <Text style={[
          styles.progressText,
          { color: isDark ? theme.textSecondary : '#757575' }
        ]}>
          {getProgressDescription()}
        </Text>
      </View>
      
      <View style={styles.footer}>
        <View style={styles.leftFooter}>
          <View style={[
            styles.xpContainer,
            { backgroundColor: isDark ? 'rgba(227,242,253,0.2)' : '#E3F2FD' },
            isXpBoosted && styles.xpBoostContainer
          ]}>
            {isXpBoosted && (
              <View style={styles.xpBoostBadge}>
                <Ionicons name="flash" size={12} color="#FFFFFF" />
                <Text style={styles.xpBoostBadgeText}>{xpMultiplier}x</Text>
              </View>
            )}
            <Text style={[
              styles.xpText,
              { color: isDark ? '#82B1FF' : '#1976D2' },
              isXpBoosted && styles.xpBoostText
            ]}>
              +{boostedXp} XP
              {isXpBoosted && (
                <Text style={styles.originalXpText}> (was {originalXp})</Text>
              )}
            </Text>
          </View>
          <Text style={[
            styles.categoryText,
            { color: isDark ? theme.textSecondary : '#757575' }
          ]}>{getTimeType()}</Text>
        </View>
        
        {challenge.status === CHALLENGE_STATUS.COMPLETED && !challenge.claimed && (
          <Pressable
            style={[styles.claimButton, isClaiming && styles.claimButtonDisabled]}
            onPress={handleClaim}
            disabled={isClaiming}
          >
            {isClaiming ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <MaterialCommunityIcons name="gift-outline" size={18} color="#FFF" />
                <Text style={styles.claimButtonText}>Claim</Text>
              </>
            )}
          </Pressable>
        )}
        
        {challenge.status === CHALLENGE_STATUS.CLAIMED && (
          <View style={[
            styles.claimedTag,
            { backgroundColor: isDark ? 'rgba(232,245,233,0.2)' : '#E8F5E9' }
          ]}>
            <MaterialCommunityIcons name="check" size={16} color="#4CAF50" />
            <Text style={styles.claimedText}>Claimed</Text>
          </View>
        )}
        
        {challenge.status === CHALLENGE_STATUS.EXPIRED && (
          <View style={[
            styles.expiredTag,
            { backgroundColor: isDark ? 'rgba(255,235,238,0.2)' : '#FFEBEE' }
          ]}>
            <MaterialCommunityIcons name="timer-off" size={16} color="#F44336" />
            <Text style={styles.expiredText}>Expired</Text>
          </View>
        )}
      </View>
      
      {challenge.status === CHALLENGE_STATUS.COMPLETED && !challenge.claimed && (
        <View style={[
          styles.claimWarning, 
          isExpiring && styles.claimWarningUrgent,
          { 
            backgroundColor: isDark 
              ? (isExpiring ? 'rgba(255,235,238,0.2)' : 'rgba(227,242,253,0.2)')
              : (isExpiring ? '#FFEBEE' : '#E3F2FD')
          }
        ]}>
          <MaterialCommunityIcons 
            name={isExpiring ? "alert-circle" : "information"} 
            size={16} 
            color={isExpiring ? "#F44336" : (isDark ? '#82B1FF' : "#2196F3")} 
          />
          <Text style={[
            styles.claimWarningText, 
            isExpiring && styles.claimWarningTextUrgent,
            { 
              color: isExpiring 
                ? "#F44336" 
                : (isDark ? '#82B1FF' : "#2196F3")
            }
          ]}>
            {formatClaimDeadline()}
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  progressContainer: {
    marginVertical: 8,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  leftFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  xpContainer: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    position: 'relative',
  },
  xpText: {
    color: '#1976D2',
    fontWeight: 'bold',
    fontSize: 12,
  },
  xpBoostContainer: {
    borderWidth: 1,
    borderColor: '#FFC107',
    backgroundColor: 'rgba(255, 236, 179, 0.3) !important',
    paddingRight: 14,
  },
  xpBoostText: {
    color: '#FF8F00',
    fontWeight: 'bold',
  },
  xpBoostBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFC107',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    zIndex: 1,
  },
  xpBoostBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 1,
  },
  originalXpText: {
    fontSize: 10,
    color: '#757575',
    marginLeft: 2,
    fontStyle: 'italic',
  },
  categoryText: {
    fontSize: 12,
    color: '#757575',
  },
  claimButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  claimButtonDisabled: {
    backgroundColor: '#A5D6A7',
  },
  claimButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 14,
  },
  claimedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  claimedText: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 12,
  },
  expiredTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  expiredText: {
    color: '#F44336',
    fontWeight: 'bold',
    marginLeft: 4,
    fontSize: 12,
  },
  expiryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  expiryTagWarning: {
    backgroundColor: '#FFEBEE',
  },
  expiryText: {
    color: '#757575',
    fontSize: 12,
    marginLeft: 4,
  },
  expiryTextWarning: {
    color: '#F44336',
    fontWeight: 'bold',
  },
  deadlineTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  deadlineText: {
    color: '#757575',
    fontSize: 12,
    marginLeft: 4,
  },
  claimWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  claimWarningUrgent: {
    backgroundColor: '#FFEBEE',
  },
  claimWarningText: {
    fontSize: 12,
    color: '#2196F3',
    marginLeft: 4,
    fontWeight: '500',
  },
  claimWarningTextUrgent: {
    color: '#F44336',
    fontWeight: 'bold',
  },
});

export default ChallengeItem; 