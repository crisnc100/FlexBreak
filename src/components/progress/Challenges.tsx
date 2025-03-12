import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ProgressBarAndroid, Platform, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Define challenge types
type ChallengeType = 'daily' | 'weekly' | 'monthly' | 'special';

// Define challenge interface
interface Challenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  icon: string;
  xpReward: number;
  progress: number;
  target: number;
  isPremiumOnly: boolean;
  expiresIn?: string; // For time-limited challenges
  isCompleted: boolean;
}

// Sample challenges
const SAMPLE_CHALLENGES: Challenge[] = [
  // Daily challenges
  {
    id: 'daily_stretch',
    title: 'Daily Stretch',
    description: 'Complete at least one stretching routine today',
    type: 'daily',
    icon: 'today-outline',
    xpReward: 50,
    progress: 0,
    target: 1,
    isPremiumOnly: false,
    expiresIn: '23h 45m',
    isCompleted: false
  },
  {
    id: 'morning_routine',
    title: 'Morning Boost',
    description: 'Complete a routine before 10 AM',
    type: 'daily',
    icon: 'sunny-outline',
    xpReward: 75,
    progress: 0,
    target: 1,
    isPremiumOnly: false,
    expiresIn: '23h 45m',
    isCompleted: false
  },
  
  // Weekly challenges
  {
    id: 'variety_week',
    title: 'Variety Week',
    description: 'Complete routines for 3 different body areas this week',
    type: 'weekly',
    icon: 'apps-outline',
    xpReward: 150,
    progress: 1,
    target: 3,
    isPremiumOnly: false,
    expiresIn: '5d 12h',
    isCompleted: false
  },
  {
    id: 'streak_week',
    title: 'Streak Week',
    description: 'Maintain a 5-day streak this week',
    type: 'weekly',
    icon: 'flame-outline',
    xpReward: 200,
    progress: 2,
    target: 5,
    isPremiumOnly: false,
    expiresIn: '5d 12h',
    isCompleted: false
  },
  
  // Monthly challenges
  {
    id: 'consistency_master',
    title: 'Consistency Master',
    description: 'Complete 20 routines this month',
    type: 'monthly',
    icon: 'calendar-outline',
    xpReward: 500,
    progress: 8,
    target: 20,
    isPremiumOnly: true,
    expiresIn: '22d 8h',
    isCompleted: false
  },
  {
    id: 'full_body_month',
    title: 'Full Body Focus',
    description: 'Complete routines for all body areas this month',
    type: 'monthly',
    icon: 'body-outline',
    xpReward: 750,
    progress: 4,
    target: 6,
    isPremiumOnly: true,
    expiresIn: '22d 8h',
    isCompleted: false
  },
  
  // Special challenges
  {
    id: 'weekend_warrior',
    title: 'Weekend Warrior',
    description: 'Complete 3 routines this weekend',
    type: 'special',
    icon: 'trophy-outline',
    xpReward: 300,
    progress: 1,
    target: 3,
    isPremiumOnly: true,
    expiresIn: '2d 5h',
    isCompleted: false
  }
];

// Challenge card component
const ChallengeCard = ({ challenge, isPremium, onPress, onClaim }) => {
  const isLocked = challenge.isPremiumOnly && !isPremium;
  const isCompleted = challenge.progress >= challenge.target;
  const progressPercentage = Math.min((challenge.progress / challenge.target) * 100, 100);
  
  return (
    <View style={[styles.challengeCard, isLocked && styles.lockedCard]}>
      <View style={styles.challengeHeader}>
        <View style={[
          styles.iconContainer, 
          isCompleted && styles.completedIconContainer,
          isLocked && styles.lockedIconContainer
        ]}>
          <Ionicons 
            name={challenge.icon} 
            size={24} 
            color={isLocked ? '#999' : (isCompleted ? '#FFFFFF' : '#4CAF50')} 
          />
        </View>
        
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>
            {challenge.type.charAt(0).toUpperCase() + challenge.type.slice(1)}
          </Text>
        </View>
      </View>
      
      <Text style={[styles.challengeTitle, isLocked && styles.lockedText]}>
        {challenge.title}
      </Text>
      
      <Text style={styles.challengeDescription}>
        {challenge.description}
      </Text>
      
      {!isLocked && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBarContainer}>
            {Platform.OS === 'android' ? (
              <ProgressBarAndroid
                styleAttr="Horizontal"
                indeterminate={false}
                progress={progressPercentage / 100}
                color="#4CAF50"
                style={styles.progressBar}
              />
            ) : (
              <View style={styles.iosProgressContainer}>
                <View 
                  style={[
                    styles.iosProgressBar, 
                    { width: `${progressPercentage}%` }
                  ]} 
                />
              </View>
            )}
          </View>
          <Text style={styles.progressText}>
            {challenge.progress}/{challenge.target}
          </Text>
        </View>
      )}
      
      <View style={styles.challengeFooter}>
        {challenge.expiresIn && (
          <View style={styles.expiryContainer}>
            <Ionicons name="time-outline" size={14} color="#FF9800" />
            <Text style={styles.expiryText}>{challenge.expiresIn}</Text>
          </View>
        )}
        
        <View style={styles.xpContainer}>
          <Ionicons name="flash-outline" size={14} color="#FFD700" />
          <Text style={styles.xpText}>{challenge.xpReward} XP</Text>
        </View>
      </View>
      
      {isLocked ? (
        <TouchableOpacity 
          style={styles.premiumButton}
          onPress={() => onPress(challenge)}
        >
          <Ionicons name="lock-closed" size={14} color="#FFFFFF" />
          <Text style={styles.buttonText}>Premium</Text>
        </TouchableOpacity>
      ) : isCompleted ? (
        <TouchableOpacity 
          style={styles.claimButton}
          onPress={() => onClaim(challenge)}
        >
          <Text style={styles.buttonText}>Claim Reward</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity 
          style={styles.viewButton}
          onPress={() => onPress(challenge)}
        >
          <Text style={styles.viewButtonText}>View Details</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

interface ChallengesProps {
  isPremium: boolean;
  onUpgradeToPremium: () => void;
  onCompleteChallenge: (challengeId: string) => Promise<void>;
}

const Challenges: React.FC<ChallengesProps> = ({
  isPremium,
  onUpgradeToPremium,
  onCompleteChallenge
}) => {
  const [activeTab, setActiveTab] = useState<ChallengeType>('daily');
  
  // Filter challenges by type
  const filteredChallenges = SAMPLE_CHALLENGES.filter(
    challenge => challenge.type === activeTab
  );
  
  // Handle challenge press
  const handleChallengePress = (challenge: Challenge) => {
    if (challenge.isPremiumOnly && !isPremium) {
      onUpgradeToPremium();
    } else {
      console.log('Challenge details:', challenge.title);
      // Show challenge details or navigate to relevant screen
    }
  };
  
  // Handle claim reward
  const handleClaimReward = (challenge: Challenge) => {
    console.log('Claiming reward for:', challenge.title);
    // Logic to claim the reward and update user XP
  };

  // Handle challenge completion
  const handleCompleteChallenge = async (challengeId) => {
    try {
      await onCompleteChallenge(challengeId);
    } catch (error) {
      console.error('Error completing challenge:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Challenges</Text>
        <Text style={styles.subtitle}>
          Complete challenges to earn XP and rewards
        </Text>
      </View>
      
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'daily' && styles.activeTab]}
          onPress={() => setActiveTab('daily')}
        >
          <Text style={[styles.tabText, activeTab === 'daily' && styles.activeTabText]}>
            Daily
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'weekly' && styles.activeTab]}
          onPress={() => setActiveTab('weekly')}
        >
          <Text style={[styles.tabText, activeTab === 'weekly' && styles.activeTabText]}>
            Weekly
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'monthly' && styles.activeTab]}
          onPress={() => setActiveTab('monthly')}
        >
          <Text style={[styles.tabText, activeTab === 'monthly' && styles.activeTabText]}>
            Monthly
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'special' && styles.activeTab]}
          onPress={() => setActiveTab('special')}
        >
          <Text style={[styles.tabText, activeTab === 'special' && styles.activeTabText]}>
            Special
          </Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.challengesContainer}>
        {filteredChallenges.length > 0 ? (
          filteredChallenges.map(challenge => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              isPremium={isPremium}
              onPress={handleChallengePress}
              onClaim={handleClaimReward}
            />
          ))
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={48} color="#CCCCCC" />
            <Text style={styles.emptyText}>
              No {activeTab} challenges available right now
            </Text>
            <Text style={styles.emptySubtext}>
              Check back soon for new challenges!
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
  },
  activeTab: {
    borderBottomColor: '#4CAF50',
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#999',
  },
  activeTabText: {
    color: '#4CAF50',
  },
  challengesContainer: {
    paddingHorizontal: 16,
  },
  challengeCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lockedCard: {
    backgroundColor: '#F5F5F5',
    borderColor: '#E0E0E0',
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  completedIconContainer: {
    backgroundColor: '#4CAF50',
    borderColor: '#2E7D32',
  },
  lockedIconContainer: {
    backgroundColor: '#EEEEEE',
    borderColor: '#BDBDBD',
  },
  typeBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  lockedText: {
    color: '#999',
  },
  challengeDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressBarContainer: {
    flex: 1,
    marginRight: 8,
  },
  progressBar: {
    height: 10,
  },
  iosProgressContainer: {
    height: 10,
    backgroundColor: '#E0E0E0',
    borderRadius: 5,
    overflow: 'hidden',
  },
  iosProgressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
    minWidth: 40,
    textAlign: 'right',
  },
  challengeFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  expiryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expiryText: {
    fontSize: 12,
    color: '#FF9800',
    marginLeft: 4,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  xpText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF9800',
    marginLeft: 4,
  },
  premiumButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
  },
  claimButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  viewButtonText: {
    color: '#333',
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
});

export default Challenges; 