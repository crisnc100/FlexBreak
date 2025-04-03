import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity } from 'react-native';
import { PremiumLockSimple } from '../PremiumLockSimple';
import { useRefresh } from '../../../context/RefreshContext';
import { useGamification } from '../../../hooks/progress/useGamification';
import ChallengeItem from '../ChallengeItem';
import { Challenge, CHALLENGE_STATUS } from '../../../utils/progress/types';
import { RefreshableScrollView } from '../../common';
import { useTheme } from '../../../context/ThemeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { CHALLENGE_LIMITS } from '../../../utils/progress/constants';

interface ChallengesTabProps {
  isPremium: boolean;
  handleUpgradeToPremium: () => void;
}

// Tab configuration
const TABS = [
  { key: 'daily', title: 'Daily', icon: 'calendar-today' as const },
  { key: 'weekly', title: 'Weekly', icon: 'calendar-week' as const },
  { key: 'monthly', title: 'Monthly', icon: 'calendar-month' as const },
  { key: 'special', title: 'Special', icon: 'star-outline' as const },
  { key: 'claimable', title: 'Claimable', icon: 'trophy' as const }
];

/**
 * Challenges tab content component for the Progress Screen
 */
export const ChallengesTab: React.FC<ChallengesTabProps> = React.memo(({
  isPremium,
  handleUpgradeToPremium
}) => {
  console.log('ChallengesTab rendered');
  
  // Use the refresh context to properly handle refreshes
  const { isRefreshing, refreshProgress, refreshTimestamp } = useRefresh();
  const { isDark, theme } = useTheme();
  
  // Get challenges from gamification system
  const { 
    activeChallenges,
    claimableChallenges, 
    challengesLoading, 
    refreshChallenges,
    refreshData
  } = useGamification();
  
  // Active tab index
  const [activeTab, setActiveTab] = useState<string>(TABS[0].key);
  
  // Track last refresh time to avoid excessive refreshes
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());
  
  // Initial data load
  useEffect(() => {
    console.log('Initial data load for challenges');
    refreshChallenges();
  }, [refreshChallenges]);
  
  // Refresh when the tab comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('ChallengesTab came into focus, refreshing data');
      refreshChallenges();
      return () => {
        // Cleanup if needed
      };
    }, [refreshChallenges])
  );
  
  // Check and force-refresh challenges whenever the active tab changes
  useEffect(() => {
    console.log(`Active tab changed to: ${activeTab}`);
    refreshChallenges();
  }, [activeTab, refreshChallenges]);
  
  // Listen for global refresh triggers
  useEffect(() => {
    if (refreshTimestamp > lastRefresh) {
      console.log('Global refresh triggered, refreshing challenges data');
      refreshChallenges();
      setLastRefresh(refreshTimestamp);
    }
  }, [refreshTimestamp, lastRefresh, refreshChallenges]);
  
  // Create a refresh handler
  const handleRefresh = useCallback(async () => {
    console.log('Manual refresh triggered');
    setLastRefresh(Date.now());
    await refreshChallenges();
  }, [refreshChallenges]);
  
  // Handle when a challenge is successfully claimed
  const handleClaimSuccess = useCallback(() => {
    console.log('Challenge successfully claimed, refreshing');
    setLastRefresh(Date.now());
    refreshChallenges();
    
    // Switch back to the original tab after claiming
    // This helps users see that their claim affected the available challenges
    if (activeTab === 'claimable') {
      setTimeout(() => setActiveTab('daily'), 300);
    }
  }, [refreshChallenges, activeTab]);
  
  // Count total active challenges
  const totalActiveChallenges = Object.values(activeChallenges).reduce(
    (sum, challenges) => sum + challenges.length, 
    0
  );
  
  // Count claimable challenges
  const claimableCount = claimableChallenges?.length || 0;
  
  // Auto-switch to claimable tab if there are claimable challenges
  useEffect(() => {
    if (claimableCount > 0 && !challengesLoading && activeTab !== 'claimable') {
      // Don't automatically switch to claimable tab if user is actively using the tab system
      // This could be annoying if it happens during interaction
      const lastInteractionTime = Date.now() - lastRefresh;
      // Only auto-switch to claimable tab if the user hasn't interacted in the last 2 seconds
      // and they've never seen the claimable tab before (first time experience)
      if (lastInteractionTime > 2000) {
        console.log('Auto-switching to claimable tab');
        setActiveTab('claimable');
      }
    }
  }, [claimableCount, challengesLoading, activeTab, lastRefresh]);
  
  // Log challenge counts for debugging
  useEffect(() => {
    console.log(`Challenge counts - Active: ${totalActiveChallenges}, Claimable: ${claimableCount}`);
    console.log('Claimable challenges:', claimableChallenges);
  }, [totalActiveChallenges, claimableCount, claimableChallenges]);
  
  // Render content for the active tab
  const renderActiveTabContent = () => {
    // Special handling for claimable tab
    if (activeTab === 'claimable') {
      // Show loading indicator if challenges are loading
      if (challengesLoading) {
        return (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={theme.accent} />
            <Text style={[styles.emptyText, { color: theme.text }]}>Loading challenges...</Text>
          </View>
        );
      }
      
      // Show empty state if no claimable challenges
      if (claimableChallenges.length === 0) {
        return (
          <View style={styles.centerContainer}>
            <MaterialCommunityIcons 
              name="trophy-outline"
              size={48} 
              color={theme.textSecondary + '60'} 
            />
            <Text style={[styles.emptyText, { color: theme.text }]}>
              No challenges ready to claim right now.{'\n'}Complete challenges to claim rewards!
            </Text>
          </View>
        );
      }
      
      // Render claimable challenges
      return (
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {claimableChallenges.map(challenge => (
            <ChallengeItem
              key={challenge.id}
              challenge={challenge}
              onClaimSuccess={handleClaimSuccess}
            />
          ))}
        </ScrollView>
      );
    }
    
    // Normal tab rendering for category tabs
    const challenges = activeChallenges[activeTab] || [];
    
    console.log(`Rendering ${challenges.length} challenges for ${activeTab} tab`);
    
    // Show loading indicator if challenges are loading
    if (challengesLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.emptyText, { color: theme.text }]}>Loading challenges...</Text>
        </View>
      );
    }
    
    // Show empty state if no challenges
    if (challenges.length === 0) {
      const currentTabTitle = TABS.find(tab => tab.key === activeTab)?.title || '';
      
      // Check if there are completed challenges in this category (to explain why there aren't new ones)
      const claimableInCategory = claimableChallenges.filter(c => c.category === activeTab).length;
      
      return (
        <View style={styles.centerContainer}>
          <MaterialCommunityIcons 
            name="calendar-check"
            size={48} 
            color={theme.textSecondary + '60'} 
          />
          <Text style={[styles.emptyText, { color: theme.text }]}>
            {claimableInCategory > 0 ? 
              `No active ${currentTabTitle.toLowerCase()} challenges available.\nYou've completed the challenges for this cycle!` :
              `No ${currentTabTitle.toLowerCase()} challenges available.\nCheck back after the ${activeTab} cycle resets!`
            }
          </Text>
          {claimableInCategory > 0 && (
            <TouchableOpacity
              style={[styles.claimNowButton, { backgroundColor: theme.accent }]}
              onPress={() => setActiveTab('claimable')}
            >
              <Text style={styles.claimNowButtonText}>View Claimable Challenges</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    
    // Render challenges for the current tab
    return (
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {challenges.map(challenge => (
          <ChallengeItem
            key={challenge.id}
            challenge={challenge}
            onClaimSuccess={handleClaimSuccess}
          />
        ))}
        {/* Provide explanation if user has fewer challenges than the typical limit */}
        {challenges.length < CHALLENGE_LIMITS[activeTab as keyof typeof CHALLENGE_LIMITS] && (
          <View style={styles.limitExplanationContainer}>
            <MaterialCommunityIcons name="information-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.limitExplanationText, { color: theme.textSecondary }]}>
              {`You'll have up to ${CHALLENGE_LIMITS[activeTab as keyof typeof CHALLENGE_LIMITS]} ${activeTab} challenges per cycle. New challenges will appear after the cycle resets.`}
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };
  
  // Render the badge with challenge count for each tab
  const renderTabBadge = (tabKey: string) => {
    let count = 0;
    
    if (tabKey === 'claimable') {
      count = claimableCount;
    } else {
      count = activeChallenges[tabKey]?.length || 0;
    }
    
    if (count === 0) return null;
    
    return (
      <View style={[
        styles.badge, 
        { 
          backgroundColor: tabKey === 'claimable' ? '#FF9800' : theme.accent 
        }
      ]}>
        <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
      </View>
    );
  };
  
  return (
    <View style={{ flex: 1 }}>
      {isPremium ? (
        <View style={{ flex: 1 }}>
          <View style={{ minHeight: 550, flex: 1 }}>
            <RefreshableScrollView
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              minimumRefreshTime={800}
            >
              {/* Custom Tab Bar */}
              <View style={[styles.tabBar, { backgroundColor: theme.cardBackground }]}>
                {TABS.map((tab) => (
                  <TouchableOpacity
                    key={tab.key}
                    style={[
                      styles.tabItem,
                      activeTab === tab.key && { borderBottomColor: theme.accent, borderBottomWidth: 2 }
                    ]}
                    onPress={() => {
                      console.log(`Tab pressed: ${tab.key}`);
                      setActiveTab(tab.key);
                      // Consider this a user interaction
                      setLastRefresh(Date.now());
                    }}
                  >
                    <MaterialCommunityIcons 
                      name={tab.icon} 
                      size={20} 
                      color={
                        tab.key === 'claimable' && claimableCount > 0 
                          ? '#FF9800' 
                          : (activeTab === tab.key ? theme.accent : theme.textSecondary)
                      } 
                    />
                    <Text 
                      style={[
                        styles.tabLabel,
                        { 
                          color: 
                            tab.key === 'claimable' && claimableCount > 0 
                              ? '#FF9800' 
                              : (activeTab === tab.key ? theme.accent : theme.textSecondary)
                        }
                      ]}
                    >
                      {tab.title}
                    </Text>
                    {renderTabBadge(tab.key)}
                  </TouchableOpacity>
                ))}
              </View>
              
              {/* Challenge Explanation - conditional based on tab */}
              <View style={[styles.explanationContainer, { backgroundColor: theme.backgroundLight }]}>
                <MaterialCommunityIcons 
                  name={activeTab === 'claimable' ? 'information-outline' : 'calendar-clock'} 
                  size={18} 
                  color={theme.textSecondary} 
                />
                <Text style={[styles.explanationText, { color: theme.text }]}>
                  {activeTab === 'claimable' 
                    ? "Completed challenges awaiting claim. Claim within the time limit to earn XP!"
                    : activeTab === 'daily' 
                      ? "Daily challenges reset at midnight. Complete for XP rewards!"
                      : activeTab === 'weekly'
                        ? "Weekly challenges reset on Sunday. More XP for longer tasks!"
                        : activeTab === 'monthly'
                          ? "Monthly challenges reset at month's end. Big rewards for dedication!"
                          : "Special challenges for limited time events. Don't miss out!"
                  }
                </Text>
              </View>
              
              {/* Active tab content */}
              <View style={styles.tabContent}>
                {renderActiveTabContent()}
              </View>
            </RefreshableScrollView>
          </View>
        </View>
      ) : (
        <PremiumLockSimple
          feature="Challenges"
          description="Complete daily, weekly, and monthly challenges to earn XP and track your progress."
          onUpgrade={handleUpgradeToPremium}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: '30%',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
  explanationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  explanationText: {
    flex: 1,
    fontSize: 12,
    marginLeft: 8,
    lineHeight: 16,
  },
  claimableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  claimableText: {
    flex: 1,
    marginLeft: 8,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    minHeight: 500,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 8,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    minHeight: 300,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  claimNowButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  claimNowButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  limitExplanationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginHorizontal: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  limitExplanationText: {
    flex: 1,
    fontSize: 12,
    marginLeft: 8,
    lineHeight: 16,
  },
});

export default ChallengesTab; 