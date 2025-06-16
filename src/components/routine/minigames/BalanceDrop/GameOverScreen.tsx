import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../../context/ThemeContext';
import { LifeStats } from './types';
import { styles } from './styles';

interface GameOverScreenProps {
  balance: number;
  energyLeft: number;
  finalScore: number;
  lifeStats?: LifeStats;
  failureReason?: string;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  balance,
  energyLeft,
  finalScore,
  lifeStats,
  failureReason,
}) => {
  const { theme } = useTheme();

  const getFailureInfo = () => {
    // Check for critical life stat failures first
    if (lifeStats) {
      if (lifeStats.stress >= 90) {
        return {
          icon: 'alert-circle-outline',
          title: 'Burnout!',
          message: 'Chronic stress has taken its toll',
          story: 'You pushed too hard for too long. Your body and mind have reached their limit. Time to reassess your priorities.',
          tip: 'Managing stress is crucial. Take breaks, say no to non-essential tasks, and practice self-care.',
          color: '#FF0000'
        };
      } else if (lifeStats.health <= 20) {
        return {
          icon: 'medkit-outline',
          title: 'Health Crisis!',
          message: 'Your health has deteriorated',
          story: 'Ignoring your physical needs has consequences. Without health, nothing else matters.',
          tip: 'Prioritize exercise, proper nutrition, and regular checkups. Your body is your most important asset.',
          color: '#FF0000'
        };
      } else if (lifeStats.family <= 20) {
        return {
          icon: 'heart-dislike-outline',
          title: 'Relationship Crisis!',
          message: 'Your loved ones feel abandoned',
          story: 'Success means nothing without people to share it with. Your relationships need urgent attention.',
          tip: 'Make time for family and friends. Work will always be there, but relationships need nurturing.',
          color: '#E91E63'
        };
      } else if (lifeStats.career <= 20) {
        return {
          icon: 'trending-down-outline',
          title: 'Career in Jeopardy!',
          message: 'Your professional life is suffering',
          story: 'Neglecting work responsibilities has caught up with you. Your career needs immediate attention.',
          tip: 'Focus on key deliverables and communicate with your team. Sometimes you need to prioritize work.',
          color: '#FF6B6B'
        };
      }
    }
    
    // Original failure reasons
    if (energyLeft <= 0) {
      return {
        icon: 'battery-dead-outline',
        title: 'Exhausted!',
        message: 'You\'ve depleted all your energy',
        story: 'Running on empty isn\'t sustainable. You collapsed from exhaustion, unable to continue.',
        tip: 'Rest activities restore energy. Don\'t skip sleep, breaks, and meals!',
        color: '#FF9800'
      };
    } else if (Math.abs(balance) >= 70) {
      if (balance < -70) {
        return {
          icon: 'briefcase-outline',
          title: 'Workaholic Syndrome!',
          message: 'Work consumed your entire life',
          story: 'All work and no play... You\'ve become a machine, but at what cost? Life is passing you by.',
          tip: 'Schedule personal time like you schedule meetings. Life needs attention too.',
          color: '#FF6B6B'
        };
      } else {
        return {
          icon: 'game-controller-outline',
          title: 'Lost in Leisure!',
          message: 'Responsibilities abandoned',
          story: 'While enjoying life is important, ignoring work has consequences. Balance is key.',
          tip: 'Set boundaries for leisure time. Work enables the life you want to live.',
          color: '#4CAF50'
        };
      }
    } else {
      return {
        icon: 'checkmark-circle-outline',
        title: 'Journey Complete!',
        message: 'You navigated life\'s challenges',
        story: 'Every day brings new choices. You did your best to balance competing priorities.',
        tip: 'Remember: perfection isn\'t the goal, progress is. Keep learning and adapting!',
        color: theme.accent
      };
    }
  };

  const failure = getFailureInfo();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.gameOverContainer}>
        <Ionicons name={failure.icon as any} size={60} color={failure.color} />
        <Text style={[styles.gameOverTitle, { color: theme.text }]}>
          {failure.title}
        </Text>
        <Text style={[styles.gameOverText, { color: theme.textSecondary }]}>
          {failure.message}
        </Text>
        
        {failure.story && (
          <Text style={[styles.gameOverStory, { color: theme.text }]}>
            {failure.story}
          </Text>
        )}
        
        <Text style={[styles.finalScoreText, { color: theme.text }]}>
          Final Score: {finalScore}
        </Text>
        
        {/* Show final life stats */}
        {lifeStats && (
          <View style={[styles.finalStatsContainer, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.finalStatsTitle, { color: theme.text }]}>Final Life Status</Text>
            <View style={styles.finalStatsGrid}>
              <View style={styles.finalStat}>
                <Ionicons name="trending-up" size={16} color="#FF6B6B" />
                <Text style={[styles.finalStatValue, { color: theme.text }]}>{lifeStats.career}%</Text>
              </View>
              <View style={styles.finalStat}>
                <Ionicons name="home" size={16} color="#4ECDC4" />
                <Text style={[styles.finalStatValue, { color: theme.text }]}>{lifeStats.family}%</Text>
              </View>
              <View style={styles.finalStat}>
                <Ionicons name="heart" size={16} color="#4CAF50" />
                <Text style={[styles.finalStatValue, { color: theme.text }]}>{lifeStats.health}%</Text>
              </View>
              <View style={styles.finalStat}>
                <Ionicons name="people" size={16} color="#3498DB" />
                <Text style={[styles.finalStatValue, { color: theme.text }]}>{lifeStats.social}%</Text>
              </View>
              <View style={styles.finalStat}>
                <Ionicons name="warning" size={16} color={lifeStats.stress > 70 ? '#FF0000' : '#FFB347'} />
                <Text style={[styles.finalStatValue, { color: lifeStats.stress > 70 ? '#FF0000' : theme.text }]}>
                  {lifeStats.stress}%
                </Text>
              </View>
            </View>
          </View>
        )}
        
        <Text style={[styles.tipText, { color: theme.textSecondary }]}>
          💡 {failure.tip}
        </Text>
      </View>
    </View>
  );
};