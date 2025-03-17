import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BodyArea } from '../types';
import { useGamification } from '../hooks/useGamification';
import { useRefresh } from '../context/RefreshContext';
import * as storageService from '../services/storageService';

const ProgressTestingScreen = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [routineCount, setRoutineCount] = useState('10');
  const [streakLength, setStreakLength] = useState('7');
  const [targetXP, setTargetXP] = useState('1000');
  const [selectedArea, setSelectedArea] = useState<BodyArea>('Hips & Legs');
  const [progressSummary, setProgressSummary] = useState<any>(null);
  const [randomizeAreas, setRandomizeAreas] = useState(true);
  const [randomizeDates, setRandomizeDates] = useState(true);
  const [achievementsList, setAchievementsList] = useState<any[]>([]);
  
  const { gamificationSummary, isLoading: isGamificationLoading, refreshData } = useGamification();
  const { refreshProgress } = useRefresh();

  // Available body areas
  const bodyAreas: BodyArea[] = [
    'Hips & Legs', 'Lower Back', 'Upper Back & Chest', 'Shoulders & Arms', 'Neck', 'Full Body'
  ];

  // Load initial data and achievements list
  useEffect(() => {
    const loadData = async () => {
      await refreshSummary();
      
      try {
        // Get current progress to extract achievements list
        const progress = await storageService.getUserProgress();
        if (progress.achievements) {
          setAchievementsList(
            Object.values(progress.achievements).map(a => ({
              id: a.id,
              title: a.title,
              completed: a.completed,
              xp: a.xp,
              progress: a.progress,
              requirement: a.requirement
            }))
          );
        }
      } catch (error) {
        console.error('Error loading achievements:', error);
      }
    };
    
    loadData();
  }, []);

  // Refresh summary data
  const refreshSummary = async () => {
    setIsLoading(true);
    try {
      // Get data directly from the gamification summary
      const userProgress = await storageService.getUserProgress();
      
      // Find next level XP requirement
      let nextLevelAt = "Max level";
      if (gamificationSummary?.level < 10) {
        const nextLevel = gamificationSummary?.level + 1;
        // This assumes LEVELS is available in gamificationSummary
        nextLevelAt = gamificationSummary?.nextLevelXp || "Unknown";
      }
      
      // Get completed achievements
      const completedAchievements = Object.values(userProgress.achievements || {})
        .filter(a => a.completed);
      
      setProgressSummary({
        level: gamificationSummary?.level || userProgress.level,
        xp: gamificationSummary?.totalXP || userProgress.totalXP,
        nextLevelAt,
        routineCount: gamificationSummary?.statistics?.routinesCompleted || userProgress.statistics?.totalRoutines || 0,
        streak: gamificationSummary?.statistics?.currentStreak || userProgress.statistics?.currentStreak || 0,
        completedAchievements
      });
    } catch (error) {
      console.error('Error refreshing summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle adding mock routines
  const handleAddMockRoutines = async () => {
    const count = parseInt(routineCount, 10);
    if (isNaN(count) || count <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of routines.');
      return;
    }

    setIsLoading(true);
    try {
      // Generate mock routines
      const mockRoutines = [];
      const today = new Date();
      
      for (let i = 0; i < count; i++) {
        // Random area
        const area = randomizeAreas 
          ? bodyAreas[Math.floor(Math.random() * bodyAreas.length)]
          : selectedArea;
        
        // Random duration between 5-15 minutes
        const duration = String((Math.floor(Math.random() * 3) + 1) * 5);
        
        // Random date if enabled
        let date;
        if (randomizeDates) {
          const pastDate = new Date(today);
          pastDate.setDate(today.getDate() - Math.floor(Math.random() * 30));
          date = pastDate;
        } else {
          date = new Date();
        }
        
        mockRoutines.push({
          area,
          duration,
          date: date.toISOString(),
          stretchCount: Math.floor(Math.random() * 10) + 5
        });
      }
      
      // Process each routine
      for (const routine of mockRoutines) {
        await storageService.saveRoutineProgress(routine);
        
        // Use gamification hook if available, otherwise fallback
        if (refreshData) {
          await refreshData();
        }
      }
      
      // Final refresh
      await refreshProgress();
      await refreshSummary();
      
      Alert.alert('Success', `Added ${count} mock routines.`);
    } catch (error) {
      console.error('Error adding mock routines:', error);
      Alert.alert('Error', 'Failed to add mock routines.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle setting specific XP
  const handleSetXP = async () => {
    const xp = parseInt(targetXP, 10);
    if (isNaN(xp) || xp < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid XP value.');
      return;
    }

    setIsLoading(true);
    try {
      // Set XP directly in user progress
      const userProgress = await storageService.getUserProgress();
      userProgress.totalXP = xp;
      
      // Calculate appropriate level
      const level = calculateLevelFromXP(xp);
      userProgress.level = level;
      
      await storageService.saveUserProgress(userProgress);
      
      // Refresh UI
      await refreshProgress();
      await refreshData();
      await refreshSummary();
      
      Alert.alert('Success', `Set XP to ${xp}.`);
    } catch (error) {
      console.error('Error setting XP:', error);
      Alert.alert('Error', 'Failed to set XP.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle creating streak
  const handleCreateStreak = async () => {
    const length = parseInt(streakLength, 10);
    if (isNaN(length) || length <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid streak length.');
      return;
    }

    setIsLoading(true);
    try {
      // Create routines for each day in the streak
      const today = new Date();
      const routines = [];
      
      for (let i = 0; i < length; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        routines.push({
          area: 'Full Body',
          duration: '5',
          date: date.toISOString(),
          stretchCount: 5
        });
      }
      
      // Sort by date (oldest first)
      routines.sort((a, b) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      
      // Process each routine
      for (const routine of routines) {
        await storageService.saveRoutineProgress(routine);
      }
      
      // Set streak manually
      const userProgress = await storageService.getUserProgress();
      userProgress.statistics.currentStreak = length;
      if (length > userProgress.statistics.bestStreak) {
        userProgress.statistics.bestStreak = length;
      }
      
      await storageService.saveUserProgress(userProgress);
      
      // Refresh UI
      await refreshProgress();
      await refreshData();
      await refreshSummary();
      
      Alert.alert('Success', `Created ${length}-day streak.`);
    } catch (error) {
      console.error('Error creating streak:', error);
      Alert.alert('Error', 'Failed to create streak.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to calculate level from XP
  const calculateLevelFromXP = (xp: number): number => {
    if (xp < 100) return 1;
    if (xp < 300) return 2;
    if (xp < 600) return 3;
    if (xp < 1000) return 4;
    if (xp < 1500) return 5;
    if (xp < 2100) return 6;
    if (xp < 2800) return 7;
    if (xp < 3600) return 8;
    if (xp < 4500) return 9;
    return 10;
  };

  // Handle completing an achievement
  const handleCompleteAchievement = async (achievementId: string) => {
    setIsLoading(true);
    try {
      // Get current progress
      const userProgress = await storageService.getUserProgress();
      
      // Update the achievement if it exists
      if (userProgress.achievements && userProgress.achievements[achievementId]) {
        userProgress.achievements[achievementId] = {
          ...userProgress.achievements[achievementId],
          completed: true,
          progress: userProgress.achievements[achievementId].requirement,
          dateCompleted: new Date().toISOString()
        };
        
        // Add XP for the achievement
        const xpAmount = userProgress.achievements[achievementId].xp;
        userProgress.totalXP += xpAmount;
        
        // Update level based on new XP
        userProgress.level = calculateLevelFromXP(userProgress.totalXP);
        
        await storageService.saveUserProgress(userProgress);
        
        // Update local achievement list
        const updatedAchievements = achievementsList.map(a => 
          a.id === achievementId ? { ...a, completed: true } : a
        );
        setAchievementsList(updatedAchievements);
        
        // Refresh UI
        await refreshProgress();
        await refreshData();
        await refreshSummary();
        
        Alert.alert('Success', `Completed achievement.`);
      } else {
        Alert.alert('Error', `Achievement ${achievementId} not found.`);
      }
    } catch (error) {
      console.error('Error completing achievement:', error);
      Alert.alert('Error', 'Failed to complete achievement.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle resetting all progress data
  const handleResetAll = async () => {
    Alert.alert(
      'Reset All Data',
      'This will reset all progress data to initial state. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              // Reset user progress
              await storageService.resetUserProgress();
              
              // Refresh UI
              await refreshProgress();
              await refreshData();
              await refreshSummary();
              
              // Reset local achievement states
              const progress = await storageService.getUserProgress();
              if (progress.achievements) {
                setAchievementsList(
                  Object.values(progress.achievements).map(a => ({
                    id: a.id,
                    title: a.title,
                    completed: a.completed,
                    xp: a.xp,
                    progress: a.progress,
                    requirement: a.requirement
                  }))
                );
              } else {
                setAchievementsList([]);
              }
              
              Alert.alert('Success', 'Reset all progress data.');
            } catch (error) {
              console.error('Error resetting data:', error);
              Alert.alert('Error', 'Failed to reset data.');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Progress System Testing</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={refreshSummary}>
          <Ionicons name="refresh" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Progress Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Progress Status</Text>
          {isLoading || isGamificationLoading ? (
            <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
          ) : progressSummary ? (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>Level: {progressSummary.level}</Text>
              <Text style={styles.summaryText}>XP: {progressSummary.xp}</Text>
              <Text style={styles.summaryText}>Next Level at: {progressSummary.nextLevelAt}</Text>
              <Text style={styles.summaryText}>Total Routines: {progressSummary.routineCount}</Text>
              <Text style={styles.summaryText}>Current Streak: {progressSummary.streak} days</Text>
              <Text style={styles.summaryText}>
                Achievements: {progressSummary.completedAchievements.length} completed, 
                {" "}{(achievementsList.length - progressSummary.completedAchievements.length)} pending
              </Text>
            </View>
          ) : (
            <Text style={styles.noDataText}>No data available</Text>
          )}
        </View>

        {/* Add Mock Routines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add Mock Routines</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Number of Routines:</Text>
            <TextInput
              style={styles.input}
              value={routineCount}
              onChangeText={setRoutineCount}
              keyboardType="number-pad"
              placeholder="10"
            />
          </View>
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Randomize Areas:</Text>
            <Switch
              value={randomizeAreas}
              onValueChange={setRandomizeAreas}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={randomizeAreas ? '#4CAF50' : '#f4f3f4'}
            />
          </View>
          
          {!randomizeAreas && (
            <View style={styles.areaSelector}>
              <Text style={styles.inputLabel}>Select Area:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.areaList}>
                {bodyAreas.map(area => (
                  <TouchableOpacity
                    key={area}
                    style={[
                      styles.areaButton,
                      selectedArea === area && styles.selectedAreaButton
                    ]}
                    onPress={() => setSelectedArea(area)}
                  >
                    <Text style={[
                      styles.areaButtonText,
                      selectedArea === area && styles.selectedAreaButtonText
                    ]}>
                      {area.charAt(0).toUpperCase() + area.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Randomize Dates (last 30 days):</Text>
            <Switch
              value={randomizeDates}
              onValueChange={setRandomizeDates}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={randomizeDates ? '#4CAF50' : '#f4f3f4'}
            />
          </View>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAddMockRoutines}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>Add Mock Routines</Text>
          </TouchableOpacity>
        </View>

        {/* Set XP */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Set XP Level</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Target XP:</Text>
            <TextInput
              style={styles.input}
              value={targetXP}
              onChangeText={setTargetXP}
              keyboardType="number-pad"
              placeholder="1000"
            />
          </View>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSetXP}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>Set XP</Text>
          </TouchableOpacity>
        </View>

        {/* Create Streak */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create Streak</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Streak Length (days):</Text>
            <TextInput
              style={styles.input}
              value={streakLength}
              onChangeText={setStreakLength}
              keyboardType="number-pad"
              placeholder="7"
            />
          </View>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleCreateStreak}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>Create Streak</Text>
          </TouchableOpacity>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Complete Achievements</Text>
          
          {achievementsList.length > 0 ? (
            achievementsList.map(achievement => (
              <View key={achievement.id} style={styles.achievementItem}>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementTitle}>{achievement.title}</Text>
                  <Text style={styles.achievementXP}>+{achievement.xp} XP</Text>
                  <Text style={styles.achievementProgress}>
                    Progress: {achievement.progress}/{achievement.requirement}
                  </Text>
                </View>
                
                <TouchableOpacity
                  style={[
                    styles.completeButton,
                    achievement.completed && styles.completedButton
                  ]}
                  onPress={() => handleCompleteAchievement(achievement.id)}
                  disabled={achievement.completed || isLoading}
                >
                  <Text style={styles.completeButtonText}>
                    {achievement.completed ? 'Completed' : 'Complete'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No achievements available</Text>
          )}
        </View>

        {/* Reset All */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetAll}
            disabled={isLoading}
          >
            <Text style={styles.resetButtonText}>Reset All Progress Data</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This screen is for testing purposes only.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#4CAF50',
  },
  summaryContainer: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  summaryText: {
    fontSize: 16,
    marginBottom: 8,
    color: '#333',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    marginBottom: 8,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: '#555',
  },
  areaSelector: {
    marginBottom: 16,
  },
  areaList: {
    flexDirection: 'row',
    marginTop: 8,
  },
  areaButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
    marginRight: 8,
  },
  selectedAreaButton: {
    backgroundColor: '#4CAF50',
  },
  areaButtonText: {
    color: '#555',
  },
  selectedAreaButtonText: {
    color: '#fff',
  },
  actionButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  achievementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  achievementXP: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 4,
  },
  achievementProgress: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  completeButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  completedButton: {
    backgroundColor: '#bdbdbd',
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#f44336',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    marginVertical: 16,
  },
  noDataText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 16,
    padding: 12,
  },
  footer: {
    marginTop: 16,
    marginBottom: 32,
    alignItems: 'center',
  },
  footerText: {
    color: '#888',
    fontSize: 14,
  },
});

export default ProgressTestingScreen; 