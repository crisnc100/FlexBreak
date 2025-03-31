import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useChallengeSystem } from '../../hooks/progress/useChallengeSystem';
import { Challenge } from '../../utils/progress/types';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useGamification, gamificationEvents, XP_UPDATED_EVENT } from '../../hooks/progress/useGamification';
import * as xpBoostManager from '../../utils/progress/xpBoostManager';

interface ChallengeListProps {
  isDark?: boolean;
  theme?: any;
  onRefresh?: () => Promise<void>;
}

export const ChallengeList: React.FC<ChallengeListProps> = ({ 
  isDark: propIsDark, 
  theme: propTheme,
  onRefresh: externalRefresh
}) => {
  const { activeChallenges, loading, claimChallenge, refreshChallenges } = useChallengeSystem();
  const themeContext = useTheme();
  
  // Use props if provided, otherwise use the context values
  const theme = propTheme || themeContext.theme;
  const isDark = propIsDark !== undefined ? propIsDark : themeContext.isDark;
  
  const { addXp } = useGamification();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'special'>('daily');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isXpBoostActive, setIsXpBoostActive] = useState(false);
  const [xpBoostMultiplier, setXpBoostMultiplier] = useState(1);
  
  // Check for active XP boost
  useEffect(() => {
    const checkXpBoost = async () => {
      try {
        const { isActive, data } = await xpBoostManager.checkXpBoostStatus();
        setIsXpBoostActive(isActive);
        setXpBoostMultiplier(isActive ? data.multiplier : 1);
        console.log(`XP Boost status: ${isActive ? 'ACTIVE' : 'inactive'}, multiplier: ${isActive ? data.multiplier : 1}`);
      } catch (error) {
        console.error('Error checking XP boost status:', error);
      }
    };
    
    checkXpBoost();
  }, []);
  
  // Refresh challenges when component mounts to ensure accurate data
  useEffect(() => {
    console.log('ChallengeList component mounted, refreshing data...');
    const refreshOnMount = async () => {
      try {
        console.log('Force refreshing challenges on mount to ensure accurate data');
        await refreshChallenges();
        console.log('Challenge refresh on mount completed');
        
        // Check XP boost status
        const { isActive, data } = await xpBoostManager.checkXpBoostStatus();
        setIsXpBoostActive(isActive);
        setXpBoostMultiplier(isActive ? data.multiplier : 1);
      } catch (error) {
        console.error('Error during initial challenge refresh:', error);
      }
    };
    
    refreshOnMount();
  }, [refreshChallenges]);
  
  // Refresh challenges when active tab changes to ensure data is current
  useEffect(() => {
    console.log(`Tab changed to ${activeTab}, updating challenges`);
    refreshChallenges();
  }, [activeTab, refreshChallenges]);
  
  // CRITICAL FIX: Combined refresh function that uses both internal and external refresh
  const handleRefresh = async () => {
    console.log('Manual refresh of challenges triggered');
    setIsRefreshing(true);
    try {
      // Use internal refresh first
      await refreshChallenges();
      
      // Check XP boost status
      const { isActive, data } = await xpBoostManager.checkXpBoostStatus();
      setIsXpBoostActive(isActive);
      setXpBoostMultiplier(isActive ? data.multiplier : 1);
      
      // Then use external refresh if provided
      if (externalRefresh) {
        await externalRefresh();
      }
    } catch (error) {
      console.error('Error refreshing challenges:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle claiming a challenge
  const handleClaim = async (challenge: Challenge) => {
    if (claimingId) return; // Prevent multiple claims at once
    
    setClaimingId(challenge.id);
    try {
      // First refresh challenges to make sure we have the latest data
      console.log(`Refreshing challenges before claiming ${challenge.title}`);
      await refreshChallenges();
      
      // Only proceed with claiming if the challenge meets requirements after refresh
      const updatedChallenges = activeChallenges[challenge.category as 'daily' | 'weekly' | 'monthly' | 'special'] || [];
      const updatedChallenge = updatedChallenges.find(c => c.id === challenge.id);
      
      if (!updatedChallenge) {
        console.error('Challenge not found after refresh');
        return;
      }
      
      if (updatedChallenge.progress < updatedChallenge.requirement) {
        console.error(`Cannot claim challenge "${challenge.title}" - progress (${updatedChallenge.progress}) is less than requirement (${updatedChallenge.requirement})`);
        return;
      }
      
      const result = await claimChallenge(challenge.id);
      if (result.success) {
        // XP is already awarded by the challengeManager.claimChallenge function
        // No need to add XP again here
        console.log(`Successfully claimed ${challenge.title} challenge for ${result.xpEarned} XP`);
        
        // Emit XP update event to ensure all components update
        gamificationEvents.emit(XP_UPDATED_EVENT, {
          previousXP: 0, // We don't know the previous value here
          newXP: 0, // We don't know the new value here
          xpEarned: result.xpEarned,
          source: 'challenge_claim'
        });
        
        // Refresh the challenges list
        refreshChallenges();
      } else {
        console.error('Failed to claim challenge:', result.message);
      }
    } catch (error) {
      console.error('Error claiming challenge:', error);
    } finally {
      setClaimingId(null);
    }
  };

  // Format time remaining for challenge expiration
  const formatTimeRemaining = (endDateStr: string) => {
    const endDate = new Date(endDateStr);
    const now = new Date();
    
    // Get time difference in milliseconds
    const diff = endDate.getTime() - now.getTime();
    
    // Return if challenge has expired
    if (diff <= 0) return 'Expired';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h left`;
    } else if (hours > 0) {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m left`;
    } else {
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${minutes}m left`;
    }
  };

  // Render a challenge card
  const renderChallengeCard = (challenge: Challenge) => {
    const progress = Math.min(challenge.progress / challenge.requirement, 1);
    const isCompleted = challenge.completed;
    
    // Define when a challenge is eligible for completion
    const isEligibleForCompletion = 
      // Only allow completion when progress meets or exceeds requirement
      (challenge.progress >= challenge.requirement);
                                   
    const isEffectivelyCompleted = isCompleted || isEligibleForCompletion;
    const isClaimed = challenge.claimed;
    const isClaimable = isEffectivelyCompleted && !isClaimed;
    const isClaimInProgress = claimingId === challenge.id;
    const isExpiring = challenge.expiryWarning;
    const timeRemaining = formatTimeRemaining(challenge.endDate);
    
    // Calculate boosted XP values if XP boost is active
    const originalXP = challenge.xp;
    const boostedXP = isXpBoostActive ? Math.round(originalXP * xpBoostMultiplier) : originalXP;
    
    // Determine if this is an "in progress" challenge
    const isInProgress = !isEffectivelyCompleted && !isClaimed && challenge.progress > 0;
    
    // Calculate percentage for display
    const progressPercentage = Math.round(progress * 100);

    // For debugging
    console.log(`Rendering challenge ${challenge.id}: 
      - Title: ${challenge.title}
      - Type: ${challenge.type} (${challenge.category})
      - Progress: ${challenge.progress}/${challenge.requirement} (${progressPercentage}%)
      - Completed: ${isCompleted}
      - Eligible for completion: ${isEligibleForCompletion}
      - Effectively completed: ${isEffectivelyCompleted}
      - In Progress: ${isInProgress}
      - Claimed: ${isClaimed}
      - Claimable: ${isClaimable}
      - XP boost active: ${isXpBoostActive}
      - Original XP: ${originalXP}, Boosted XP: ${boostedXP}
    `);

    return (
      <View 
        key={challenge.id} 
        style={[
          styles.challengeCard, 
          { 
            backgroundColor: theme.cardBackground,
            shadowColor: isDark ? 'rgba(0,0,0,0.5)' : '#000'
          },
          isExpiring && styles.expiringCard,
          // Highlight claimable challenges
          isClaimable && { 
            borderLeftWidth: 4,
            borderLeftColor: theme.success 
          },
          // Style for in-progress challenges
          isInProgress && {
            borderLeftWidth: 4,
            borderLeftColor: theme.accent
          },
          // Add gold border for XP boost on claimable challenges
          isXpBoostActive && isClaimable && {
            borderColor: '#FFC107',
            borderWidth: 1
          }
        ]}
      >
        <View style={styles.challengeHeader}>
          <Text style={[styles.challengeTitle, { color: theme.text }]}>
            {challenge.title}
            {isClaimable && <Text style={{color: theme.success}}> (Claim now!)</Text>}
          </Text>
          <View style={styles.xpContainer}>
            {isXpBoostActive && isClaimable && (
              <View style={styles.xpBoostBadge}>
                <Ionicons name="flash" size={10} color="#FFFFFF" />
                <Text style={styles.xpBoostBadgeText}>2x</Text>
              </View>
            )}
            <Text style={[
              styles.challengeXP, 
              { color: isXpBoostActive && isClaimable ? '#FFC107' : theme.accent }
            ]}>
              {isXpBoostActive && isClaimable ? boostedXP : originalXP} XP
              {isXpBoostActive && isClaimable && (
                <Text style={styles.originalXpText}> (was {originalXP})</Text>
              )}
            </Text>
          </View>
        </View>
        
        <Text style={[styles.challengeDescription, { color: theme.textSecondary }]}>
          {challenge.description}
        </Text>
        
        {/* Time remaining indicator */}
        <Text style={[
          styles.timeRemaining, 
          { color: isExpiring ? theme.error : theme.textSecondary }
        ]}>
          {isExpiring ? '⚠️ ' : ''}
          {timeRemaining}
        </Text>
        
        <View style={styles.progressContainer}>
          <View 
            style={[
              styles.progressBar, 
              { 
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : theme.backgroundLight,
                borderWidth: isDark ? 1 : 0,
                borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'transparent'
              }
            ]}
          >
            <LinearGradient
              colors={
                isEffectivelyCompleted 
                  ? isDark 
                    ? ['#2E7D32', '#4CAF50'] // Darker success gradient for dark mode
                    : [theme.success, theme.successLight] 
                  : isDark 
                    ? ['#1976D2', '#42A5F5'] // Darker accent gradient for dark mode
                    : [theme.accent, theme.accentLight]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressFill,
                { 
                  width: `${progress * 100}%`,
                  // Add subtle glow in dark mode
                  shadowColor: isDark ? (isEffectivelyCompleted ? '#4CAF50' : '#2196F3') : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: isDark ? 0.5 : 0,
                  shadowRadius: isDark ? 3 : 0
                }
              ]}
            />
          </View>
          <Text style={[
            styles.progressText, 
            { 
              color: isEffectivelyCompleted 
                ? theme.success
                : isInProgress 
                  ? theme.accent 
                  : theme.textSecondary
            }
          ]}>
            {challenge.progress}/{challenge.requirement} ({progressPercentage}%)
          </Text>
        </View>
        
        {isClaimable && (
          <TouchableOpacity 
            style={[
              styles.claimButton, 
              { 
                backgroundColor: challenge.progress >= challenge.requirement 
                  ? (isXpBoostActive ? '#FFC107' : theme.accent) 
                  : isDark ? '#555' : '#ccc',
                // Add subtle glow effect in dark mode
                shadowColor: isDark 
                  ? (challenge.progress >= challenge.requirement 
                    ? (isXpBoostActive ? '#FFC107' : theme.accent) 
                    : 'transparent') 
                  : 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: isDark ? 0.5 : 0,
                shadowRadius: isDark ? 5 : 0,
                elevation: isDark ? 4 : 2
              }
            ]}
            onPress={() => handleClaim(challenge)}
            disabled={isClaimInProgress || challenge.progress < challenge.requirement}
          >
            {isClaimInProgress ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : challenge.progress >= challenge.requirement ? (
              <View style={styles.claimButtonContent}>
                {isXpBoostActive && (
                  <Ionicons name="flash" size={16} color="#FFFFFF" style={styles.claimButtonIcon} />
                )}
                <Text style={styles.claimButtonText}>
                  Claim {isXpBoostActive ? '2x ' : ''}XP Reward
                </Text>
              </View>
            ) : (
              <Text style={styles.claimButtonText}>Not Complete</Text>
            )}
          </TouchableOpacity>
        )}
        
        {isClaimed && (
          <View style={styles.claimedContainer}>
            <MaterialCommunityIcons name="check-circle" size={20} color={theme.success} />
            <Text style={[styles.claimedText, { color: theme.success }]}>Claimed</Text>
          </View>
        )}
        
        {isInProgress && (
          <View style={styles.inProgressContainer}>
            <MaterialCommunityIcons name="progress-clock" size={20} color={theme.accent} />
            <Text style={[styles.inProgressText, { color: theme.accent }]}>
              In Progress ({progressPercentage}% Complete)
            </Text>
          </View>
        )}
        
        {!isEffectivelyCompleted && !isClaimed && challenge.progress === 0 && (
          <View style={styles.inProgressContainer}>
            <MaterialCommunityIcons name="timer-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.inProgressText, { color: theme.textSecondary }]}>
              Not Started
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Render tab buttons
  const renderTabButtons = () => {
    const tabs: Array<{ key: 'daily' | 'weekly' | 'monthly' | 'special', label: string }> = [
      { key: 'daily', label: 'Daily' },
      { key: 'weekly', label: 'Weekly' },
      { key: 'monthly', label: 'Monthly' },
      { key: 'special', label: 'Special' }
    ];

    return (
      <View style={[styles.tabContainer, { borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEEEEE', borderBottomWidth: 1 }]}>
        {isXpBoostActive && (
          <View style={styles.boostIndicator}>
            <Ionicons name="flash" size={14} color="#FFC107" />
            <Text style={styles.boostText}>2x XP ACTIVE</Text>
          </View>
        )}
        <View style={styles.tabButtons}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tabButton,
                activeTab === tab.key && { 
                  backgroundColor: isXpBoostActive ? '#FFC107' : theme.accent,
                  borderColor: isXpBoostActive ? '#FFC107' : theme.accent
                },
                activeTab !== tab.key && { 
                  backgroundColor: 'transparent',
                  borderColor: isDark ? 'rgba(255,255,255,0.2)' : theme.border
                }
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text 
                style={[
                  styles.tabText,
                  { color: activeTab === tab.key ? '#fff' : isDark ? 'rgba(255,255,255,0.7)' : theme.textSecondary }
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Get challenges for the active tab
  const getActiveChallengesForTab = () => {
    return activeChallenges[activeTab] || [];
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: isDark ? theme.background : '#FAFAFA' }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#FAFAFA' }]}>
      {renderTabButtons()}
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 }]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={[theme.accent]}
            tintColor={theme.accent}
            titleColor={theme.text}
            title="Refreshing challenges..."
          />
        }
      >
        {getActiveChallengesForTab().length > 0 ? (
          getActiveChallengesForTab().map(challenge => renderChallengeCard(challenge))
        ) : (
          <View style={[styles.emptyContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#F9F9F9' }]}>
            <MaterialCommunityIcons 
              name="trophy-outline" 
              size={50} 
              color={isDark ? 'rgba(255,255,255,0.3)' : theme.textSecondary} 
            />
            <Text style={[styles.emptyText, { color: isDark ? 'rgba(255,255,255,0.7)' : theme.textSecondary }]}>
              No active {activeTab} challenges
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  tabButtons: {
    flexDirection: 'row',
    paddingHorizontal: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  challengeCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  expiringCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  challengeXP: {
    fontSize: 16,
    fontWeight: '700',
  },
  challengeDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  timeRemaining: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'right',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'right',
  },
  claimButton: {
    borderRadius: 20,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  claimButtonIcon: {
    marginRight: 6,
  },
  claimButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  claimedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  claimedText: {
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 14,
  },
  inProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  inProgressText: {
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginVertical: 16,
  },
  devButton: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  devButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loading: {
    marginTop: 20,
  },
  xpBoostBadge: {
    backgroundColor: '#FFC107',
    borderRadius: 10,
    paddingHorizontal: 3,
    paddingVertical: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  xpBoostBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 8,
    marginLeft: 1,
  },
  originalXpText: {
    fontSize: 12,
    color: '#8A8A8A',
    fontStyle: 'italic',
  },
  boostIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  boostText: {
    color: '#FFC107',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 4,
  },
}); 