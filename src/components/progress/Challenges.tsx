import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ProgressBarAndroid, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Challenge } from '../../hooks/useProgressSystem';

interface ChallengesProps {
  activeChallenges: Challenge[];
  completedChallenges: Challenge[];
  onCompleteChallenge: (challengeId: string) => Promise<void>;
  isPremium: boolean;
  onUpgradeToPremium: () => void;
}

// Challenge card component
const ChallengeCard = ({ 
  challenge, 
  isPremium, 
  onPress, 
  onClaim, 
  isCompleted 
}: { 
  challenge: Challenge; 
  isPremium: boolean; 
  onPress: (challenge: Challenge) => void; 
  onClaim: (challenge: Challenge) => void;
  isCompleted: boolean;
}) => {
  const isLocked = challenge.isPremiumOnly && !isPremium;
  const progressPercentage = Math.min((challenge.progress / challenge.requirement) * 100, 100);
  
  return (
    <View style={[styles.challengeCard, isLocked && styles.lockedCard]}>
      <View style={styles.challengeHeader}>
        <View style={[
          styles.iconContainer, 
          isCompleted && styles.completedIconContainer,
          isLocked && styles.lockedIconContainer
        ]}>
          <Ionicons 
            name={challenge.icon as any} 
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
            {challenge.progress}/{challenge.requirement}
          </Text>
        </View>
      )}
      
      <View style={styles.challengeFooter}>
        {challenge.endDate && (
          <View style={styles.expiryContainer}>
            <Ionicons name="time-outline" size={14} color="#FF9800" />
            <Text style={styles.expiryText}>
              {new Date(challenge.endDate).toLocaleDateString()}
            </Text>
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

const Challenges: React.FC<ChallengesProps> = ({
  activeChallenges,
  completedChallenges,
  onCompleteChallenge,
  isPremium,
  onUpgradeToPremium
}) => {
  const [activeTab, setActiveTab] = useState<string>('daily');
  
  // Filter challenges by type
  const filteredActiveChallenges = activeChallenges.filter(
    challenge => challenge.type === activeTab
  );
  
  const filteredCompletedChallenges = completedChallenges.filter(
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
    onCompleteChallenge(challenge.id);
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
        {/* Active Challenges */}
        {filteredActiveChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active</Text>
            {filteredActiveChallenges.map(challenge => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                isPremium={isPremium}
                onPress={handleChallengePress}
                onClaim={handleClaimReward}
                isCompleted={false}
              />
            ))}
          </View>
        )}
        
        {/* Completed Challenges */}
        {filteredCompletedChallenges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed</Text>
            {filteredCompletedChallenges.map(challenge => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                isPremium={isPremium}
                onPress={handleChallengePress}
                onClaim={handleClaimReward}
                isCompleted={true}
              />
            ))}
          </View>
        )}
        
        {filteredActiveChallenges.length === 0 && filteredCompletedChallenges.length === 0 && (
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    paddingHorizontal: 4,
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