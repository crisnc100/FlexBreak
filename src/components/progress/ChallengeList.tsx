import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useChallengeSystem } from '../../hooks/useChallengeSystem';
import { Challenge } from '../../utils/progress/types';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import { useGamification } from '../../hooks/useGamification';
import * as challengeManager from '../../utils/progress/challengeManager';

export const ChallengeList = () => {
  const { activeChallenges, loading, claimChallenge, generateNewChallenges, refreshChallenges } = useChallengeSystem();
  const { theme } = useTheme();
  const { addXp } = useGamification();
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'special'>('daily');
  const [refreshing, setRefreshing] = useState(false);

  // Add useEffect to refresh challenges and check expirations when component mounts
  useEffect(() => {
    const initializeChallenges = async () => {
      try {
        console.log('Initializing challenges and forcing update of daily challenges');
        
        // CRITICAL FIX: Force update daily challenges based on any completed routines
        // This ensures challenges can be claimed if routines have been completed
        await challengeManager.forceUpdateDailyChallengesWithRoutines();
        
        // Then refresh the challenge display
        await refreshChallenges();
      } catch (error) {
        console.error('Error initializing challenges:', error);
      }
    };

    initializeChallenges();
  }, [refreshChallenges]);

  // Handle claiming a challenge
  const handleClaim = async (challenge: Challenge) => {
    if (claimingId) return; // Prevent multiple claims at once
    
    setClaimingId(challenge.id);
    try {
      const result = await claimChallenge(challenge.id);
      if (result.success) {
        // Add XP for the completed challenge
        addXp(result.xpEarned, 'challenge', `Completed: ${challenge.title}`);
      } else {
        console.error('Failed to claim challenge:', result.message);
      }
    } catch (error) {
      console.error('Error claiming challenge:', error);
    } finally {
      setClaimingId(null);
    }
  };

  // Handle refreshing challenges
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await generateNewChallenges();
      await refreshChallenges();
    } catch (error) {
      console.error('Error refreshing challenges:', error);
    } finally {
      setRefreshing(false);
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
    
    // Special case for daily stretch challenge (routine_count with requirement=1)
    const isEligibleForCompletion = 
      // Case 1: Daily stretch challenge with progress
      (challenge.type === 'routine_count' && 
       challenge.requirement === 1 && 
       challenge.category === 'daily' && 
       challenge.progress >= 1) ||
      // Case 2: Any challenge that has met its requirement
      (challenge.progress >= challenge.requirement);
                                   
    const isEffectivelyCompleted = isCompleted || isEligibleForCompletion;
    const isClaimed = challenge.claimed;
    const isClaimable = isEffectivelyCompleted && !isClaimed;
    const isClaimInProgress = claimingId === challenge.id;
    const isExpiring = challenge.expiryWarning;
    const timeRemaining = formatTimeRemaining(challenge.endDate);

    // For debugging
    console.log(`Rendering challenge ${challenge.id}: 
      - Title: ${challenge.title}
      - Type: ${challenge.type} (${challenge.category})
      - Progress: ${challenge.progress}/${challenge.requirement}
      - Completed: ${isCompleted}
      - Eligible for completion: ${isEligibleForCompletion}
      - Effectively completed: ${isEffectivelyCompleted}
      - Claimed: ${isClaimed}
      - Claimable: ${isClaimable}
    `);

    return (
      <View 
        key={challenge.id} 
        style={[
          styles.challengeCard, 
          { backgroundColor: theme.cardBackground },
          isExpiring && styles.expiringCard,
          // Highlight claimable challenges
          isClaimable && { 
            borderLeftWidth: 4,
            borderLeftColor: theme.success 
          }
        ]}
      >
        <View style={styles.challengeHeader}>
          <Text style={[styles.challengeTitle, { color: theme.text }]}>
            {challenge.title}
            {isClaimable && <Text style={{color: theme.success}}> (Claim now!)</Text>}
          </Text>
          <Text style={[styles.challengeXP, { color: theme.accent }]}>
            {challenge.xp} XP
          </Text>
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
              { backgroundColor: theme.backgroundLight }
            ]}
          >
            <LinearGradient
              colors={[theme.accent, theme.accentLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[
                styles.progressFill,
                { width: `${progress * 100}%` }
              ]}
            />
          </View>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            {challenge.progress}/{challenge.requirement}
          </Text>
        </View>
        
        {isClaimable && (
          <TouchableOpacity 
            style={[
              styles.claimButton, 
              { backgroundColor: theme.accent }
            ]}
            onPress={() => handleClaim(challenge)}
            disabled={isClaimInProgress}
          >
            {isClaimInProgress ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.claimButtonText}>Claim Reward</Text>
            )}
          </TouchableOpacity>
        )}
        
        {isClaimed && (
          <View style={styles.claimedContainer}>
            <MaterialCommunityIcons name="check-circle" size={20} color={theme.success} />
            <Text style={[styles.claimedText, { color: theme.success }]}>Claimed</Text>
          </View>
        )}
        
        {!isEffectivelyCompleted && !isClaimed && challenge.progress > 0 && (
          <View style={styles.inProgressContainer}>
            <MaterialCommunityIcons name="progress-clock" size={20} color={theme.accent} />
            <Text style={[styles.inProgressText, { color: theme.accent }]}>
              {challenge.progress > 0 ? 'In Progress' : 'Not Started'}
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
      <View style={styles.tabContainer}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tabButton,
              activeTab === tab.key && { 
                backgroundColor: theme.accent,
                borderColor: theme.accent
              },
              activeTab !== tab.key && { 
                backgroundColor: 'transparent',
                borderColor: theme.border
              }
            ]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text 
              style={[
                styles.tabText,
                { color: activeTab === tab.key ? '#fff' : theme.textSecondary }
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Get challenges for the active tab
  const getActiveChallengesForTab = () => {
    return activeChallenges[activeTab] || [];
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {renderTabButtons()}
      
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: theme.accent }]}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.refreshButtonText}>Refresh Challenges</Text>
          )}
        </TouchableOpacity>
        
        {getActiveChallengesForTab().length > 0 ? (
          getActiveChallengesForTab().map(challenge => renderChallengeCard(challenge))
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name="trophy-outline" 
              size={50} 
              color={theme.textSecondary} 
            />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No active {activeTab} challenges
            </Text>
            <TouchableOpacity
              style={[styles.refreshButton, { backgroundColor: theme.accent }]}
              onPress={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.refreshButtonText}>Generate New Challenges</Text>
              )}
            </TouchableOpacity>
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
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  refreshButton: {
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
}); 