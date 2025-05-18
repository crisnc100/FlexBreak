import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface SimulationResult {
  date: string;
  bodyArea: string;
  difficulty: string;
  duration: number;
  xpEarned: number;
  totalXp: number;
  level: number;
  percentToNextLevel: number;
  streakDays: number;
  completedChallenges?: { title: string, xp: number }[];
  achievements?: { title: string }[];
  isBatchMode?: boolean;
  daysSimulated?: number;
}

interface ConfirmationModalProps {
  visible: boolean;
  onClose: () => void;
  result: SimulationResult;
}

const ConfirmationModal = ({ 
  visible, 
  onClose, 
  result 
}: ConfirmationModalProps) => {
  const { theme, isDark, isSunset } = useTheme();
  
  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {result.isBatchMode ? 'Batch Simulation Complete' : 'Simulation Complete'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.headerCloseButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.resultsContainer}>
            {/* Success Banner */}
            <View style={[styles.successBanner, { backgroundColor: isDark || isSunset ? '#3D5A3D' : '#E8F5E9' }]}>
              <Ionicons name="checkmark-circle" size={24} color={theme.success} />
              <Text style={[styles.successText, { color: theme.success }]}>
                {result.isBatchMode 
                  ? `Successfully simulated ${result.daysSimulated} days!` 
                  : 'Stretch routine simulated successfully!'}
              </Text>
            </View>
            
            {/* Simulation Details */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Simulation Details
              </Text>
              
              <View style={[styles.detailCard, { backgroundColor: isDark || isSunset ? '#2D2D2D' : '#f5f5f5' }]}>
                {result.isBatchMode ? (
                  <Text style={[styles.dateRange, { color: theme.text }]}>
                    Simulated {result.daysSimulated} consecutive days
                  </Text>
                ) : (
                  <Text style={[styles.date, { color: theme.text }]}>
                    Date: {formatDate(result.date)}
                  </Text>
                )}
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Body Area:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{result.bodyArea}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Difficulty:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{result.difficulty}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Duration:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>{result.duration} minutes</Text>
                </View>
              </View>
            </View>
            
            {/* XP and Progress */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                Experience & Progress
              </Text>
              
              <View style={[styles.statsCard, { backgroundColor: isDark || isSunset ? '#2D2D2D' : '#f5f5f5' }]}>
                <View style={styles.xpContainer}>
                  <View style={styles.xpBadge}>
                    <Text style={styles.xpEarned}>+{result.xpEarned}</Text>
                    <Text style={styles.xpLabel}>XP</Text>
                  </View>
                  
                  <View style={styles.currentProgress}>
                    <View style={styles.levelInfo}>
                      <Text style={[styles.levelLabel, { color: theme.textSecondary }]}>
                        Level
                      </Text>
                      <Text style={[styles.levelValue, { color: theme.text }]}>
                        {result.level}
                      </Text>
                    </View>
                    
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarBackground}>
                        <View 
                          style={[
                            styles.progressBar, 
                            { 
                              width: `${result.percentToNextLevel}%`, 
                              backgroundColor: theme.accent 
                            }
                          ]} 
                        />
                      </View>
                      <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                        Progress to next level
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.streakContainer}>
                  <Ionicons name="flame" size={18} color={isDark || isSunset ? '#FF9800' : '#FF5722'} />
                  <Text style={[styles.streakText, { color: theme.text }]}>
                    Current Streak: {result.streakDays} day{result.streakDays !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>
            </View>
            
            {/* Completed Challenges */}
            {result.completedChallenges && result.completedChallenges.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Completed Challenges
                </Text>
                
                <View style={[styles.challengesCard, { backgroundColor: isDark || isSunset ? '#2D2D2D' : '#f5f5f5' }]}>
                  {result.completedChallenges.map((challenge, index) => (
                    <View key={index} style={styles.challengeItem}>
                      <View style={styles.challengeInfo}>
                        <Ionicons name="trophy" size={18} color={theme.accent} />
                        <Text style={[styles.challengeTitle, { color: theme.text }]}>
                          {challenge.title}
                        </Text>
                      </View>
                      <Text style={[styles.challengeXp, { color: theme.accent }]}>
                        +{challenge.xp} XP
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {/* Unlocked Achievements */}
            {result.achievements && result.achievements.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                  Unlocked Achievements
                </Text>
                
                <View style={[styles.achievementsCard, { backgroundColor: isDark || isSunset ? '#2D2D2D' : '#f5f5f5' }]}>
                  {result.achievements.map((achievement, index) => (
                    <View key={index} style={styles.achievementItem}>
                      <Ionicons name="ribbon" size={18} color="#FFD700" />
                      <Text style={[styles.achievementTitle, { color: theme.text }]}>
                        {achievement.title}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
            
            {/* Total Stats Summary */}
            <View style={[styles.totalStats, { backgroundColor: isDark || isSunset ? '#2D2D2D' : '#E3F2FD' }]}>
              <Ionicons name="analytics" size={20} color={theme.accent} />
              <Text style={[styles.totalStatsText, { color: theme.text }]}>
                Total XP: {result.totalXp} • Level: {result.level} • Streak: {result.streakDays} days
              </Text>
            </View>
          </ScrollView>
          
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.continueButton, { backgroundColor: theme.accent }]}
              onPress={onClose}
            >
              <Text style={styles.closeButtonText}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerCloseButton: {
    padding: 4,
  },
  resultsContainer: {
    padding: 16,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  successText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailCard: {
    padding: 16,
    borderRadius: 8,
  },
  date: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  dateRange: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsCard: {
    padding: 16,
    borderRadius: 8,
  },
  xpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  xpBadge: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
  },
  xpEarned: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  xpLabel: {
    color: '#FFF',
    fontSize: 12,
  },
  currentProgress: {
    flex: 1,
    marginLeft: 16,
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  levelLabel: {
    fontSize: 14,
    marginRight: 8,
  },
  levelValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressContainer: {
    width: '100%',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
  },
  progressText: {
    fontSize: 12,
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streakText: {
    fontSize: 14,
    marginLeft: 8,
  },
  challengesCard: {
    padding: 12,
    borderRadius: 8,
  },
  challengeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  challengeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  challengeTitle: {
    marginLeft: 8,
    fontSize: 14,
  },
  challengeXp: {
    fontSize: 14,
    fontWeight: '600',
  },
  achievementsCard: {
    padding: 12,
    borderRadius: 8,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  achievementTitle: {
    marginLeft: 8,
    fontSize: 14,
  },
  totalStats: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  totalStatsText: {
    marginLeft: 8,
    fontSize: 14,
  },
  actionButtonsContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  continueButton: {
    width: '100%',
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ConfirmationModal; 