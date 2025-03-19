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
  Switch,
  SectionList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BodyArea, Duration } from '../types';
import { useGamification } from '../hooks/useGamification';
import { useRefresh } from '../context/RefreshContext';
import * as gamificationTester from '../utils/testing/gamificationTester';
import { XpNotificationManager } from '../components/notifications';
import * as achievementManager from '../utils/progress/achievementManager';
import * as storageService from '../services/storageService';

const EnhancedProgressTestingScreen = ({ navigation }) => {
  // State for UI controls
  const [isLoading, setIsLoading] = useState(false);
  const [routineCount, setRoutineCount] = useState('10');
  const [streakLength, setStreakLength] = useState('7');
  const [selectedArea, setSelectedArea] = useState<BodyArea>('Full Body');
  const [selectedDuration, setSelectedDuration] = useState<Duration>('5');
  const [startDaysAgo, setStartDaysAgo] = useState('30');
  const [endDaysAgo, setEndDaysAgo] = useState('0');
  const [randomizeAreas, setRandomizeAreas] = useState(true);
  const [randomizeDates, setRandomizeDates] = useState(true);
  const [randomizeDurations, setRandomizeDurations] = useState(true);
  const [xpAmount, setXpAmount] = useState('100');
  
  // State for user journey simulation
  const [currentDay, setCurrentDay] = useState(1);
  const [journeyInProgress, setJourneyInProgress] = useState(false);
  const [journeyLogs, setJourneyLogs] = useState<string[]>([]);
  
  // State for achievements
  const [achievementGroups, setAchievementGroups] = useState<{
    completed: any[];
    inProgress: any[];
    locked: any[];
  }>({
    completed: [],
    inProgress: [],
    locked: []
  });
  
  // Progress summary state
  const [progressSummary, setProgressSummary] = useState<any>(null);
  
  // Hooks
  const { gamificationSummary, isLoading: isGamificationLoading, refreshData } = useGamification();
  const { refreshProgress } = useRefresh();
  
  // Available options
  const bodyAreas: BodyArea[] = [
    'Full Body', 'Lower Back', 'Upper Back & Chest', 'Shoulders & Arms', 'Neck', 'Hips & Legs'
  ];
  const durations: Duration[] = ['5', '10', '15'];
  
  // Load initial data
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setIsLoading(true);
    try {
      // Get achievements with progress
      const achievements = await gamificationTester.getAllAchievementsWithProgress();
      setAchievementGroups(achievements);
      
      // Get gamification summary
      if (gamificationSummary) {
        setProgressSummary({
          level: gamificationSummary.level,
          totalXP: gamificationSummary.totalXP,
          xpToNextLevel: gamificationSummary.xpToNextLevel,
          routinesCompleted: gamificationSummary.statistics.routinesCompleted,
          currentStreak: gamificationSummary.statistics.currentStreak,
          bestStreak: gamificationSummary.statistics.bestStreak,
          totalMinutes: gamificationSummary.statistics.totalMinutes,
          favoriteArea: gamificationSummary.statistics.favoriteArea
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data');
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
      const result = await gamificationTester.generateRoutineHistory({
        count,
        startDaysAgo: parseInt(startDaysAgo, 10),
        endDaysAgo: parseInt(endDaysAgo, 10),
        randomizeAreas,
        randomizeDurations,
        specificArea: selectedArea,
        specificDuration: selectedDuration,
        processForXP: true
      });
      
      await refreshData();
      await loadData();
      
      Alert.alert(
        'Success',
        `Added ${result.routineCount} routines\nXP Earned: ${result.totalXpEarned}\nAchievements Unlocked: ${result.unlockedAchievements.length}`
      );
    } catch (error) {
      console.error('Error adding mock routines:', error);
      Alert.alert('Error', 'Failed to add mock routines');
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
      // Set endToday to false to ensure the streak doesn't include today
      const result = await gamificationTester.createMockStreak(length, false);
      
      await refreshData();
      await loadData();
      
      Alert.alert(
        'Success',
        `Created ${length}-day streak ending yesterday\nXP Earned: ${result.totalXpEarned}\nAchievements Unlocked: ${result.unlockedAchievements.length}`
      );
    } catch (error) {
      console.error('Error creating streak:', error);
      Alert.alert('Error', 'Failed to create streak');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle adding XP
  const handleAddXP = async () => {
    const amount = parseInt(xpAmount, 10);
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid XP amount.');
      return;
    }
    
    setIsLoading(true);
    try {
      const result = await gamificationTester.addDirectXP(amount);
      
      await refreshData();
      await loadData();
      
      Alert.alert(
        'Success',
        `Added ${amount} XP\nNew Total: ${result.newTotalXP}\nNew Level: ${result.newLevel}${result.levelUp ? ' (Level Up!)' : ''}`
      );
    } catch (error) {
      console.error('Error adding XP:', error);
      Alert.alert('Error', 'Failed to add XP');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle testing achievement
  const handleTestAchievement = async (achievementId: string) => {
    setIsLoading(true);
    try {
      const result = await gamificationTester.testAchievementRequirement(achievementId);
      
      await refreshData();
      await loadData();
      
      Alert.alert(
        result.success ? 'Success' : 'Test Result',
        result.message
      );
    } catch (error) {
      console.error('Error testing achievement:', error);
      Alert.alert('Error', 'Failed to test achievement');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle completing achievements by category
  const handleCompleteAchievements = async (category?: string) => {
    setIsLoading(true);
    try {
      const result = await gamificationTester.completeAchievements({
        uiCategory: category,
        all: !category
      });
      
      await refreshData();
      await loadData();
      
      Alert.alert(
        'Success',
        `Completed ${result.completedCount} achievements\nTotal XP Earned: ${result.totalXpEarned}`
      );
    } catch (error) {
      console.error('Error completing achievements:', error);
      Alert.alert('Error', 'Failed to complete achievements');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle resetting progress
  const handleResetProgress = async () => {
    Alert.alert(
      'Reset All Progress',
      'This will reset all progress data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await gamificationTester.resetAllUserProgress();
              await refreshData();
              await loadData();
              Alert.alert('Success', 'All progress has been reset');
            } catch (error) {
              console.error('Error resetting progress:', error);
              Alert.alert('Error', 'Failed to reset progress');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  // --- New User Journey Simulation Feature ---
  
  // Start a new user journey simulation
  const startUserJourney = async () => {
    if (journeyInProgress) {
      Alert.alert('Journey already in progress', 'Please finish or reset the current journey.');
      return;
    }
    
    setIsLoading(true);
    try {
      // Reset all progress to start fresh
      await gamificationTester.resetAllUserProgress();
      
      // Reset journey state
      setCurrentDay(1);
      setJourneyInProgress(true);
      setJourneyLogs([
        '🚀 Journey started - User has no progress yet'
      ]);
      
      // Refresh data
      await refreshData();
      await loadData();
      
    } catch (error) {
      console.error('Error starting user journey:', error);
      Alert.alert('Error', 'Failed to start user journey');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Simulate a single day in the user journey
  const simulateNextDay = async () => {
    if (!journeyInProgress) {
      Alert.alert('No journey in progress', 'Please start a new user journey first.');
      return;
    }
    
    setIsLoading(true);
    try {
      // Get random or selected area and duration
      let area = selectedArea;
      let duration = selectedDuration;
      
      if (randomizeAreas) {
        area = bodyAreas[Math.floor(Math.random() * bodyAreas.length)];
      }
      
      if (randomizeDurations) {
        duration = durations[Math.floor(Math.random() * durations.length)];
      }
      
      // Create a routine for the current day in the journey
      // Offset calculation - ensure we always use past dates:
      // currentDay 1 should be yesterday (-1), currentDay 2 should be 2 days ago (-2), etc.
      const dayOffset = -(currentDay);
      const stretchCount = 5 + Math.floor(Math.random() * 5); // 5-10 stretches
      
      // Log the action
      const newLog = `📅 Day ${currentDay}: ${area} routine (${duration} min) with ${stretchCount} stretches`;
      setJourneyLogs(prev => [newLog, ...prev]);
      
      // Process the routine
      const result = await gamificationTester.addMockRoutine(
        area,
        duration,
        dayOffset,
        stretchCount,
        true // Process for XP
      );
      
      // Log the actual date used
      const routineDate = new Date(result.routine.date);
      const dateLog = `📆 Routine date: ${routineDate.toLocaleDateString()} (${dayOffset} days offset)`;
      setJourneyLogs(prev => [dateLog, ...prev]);
      
      // Check for unlocked achievements
      if (result.unlockedAchievements.length > 0) {
        const achievementNames = result.unlockedAchievements.map(a => a.title).join(', ');
        const achievementLog = `🏆 Achievement(s) unlocked: ${achievementNames}`;
        setJourneyLogs(prev => [achievementLog, ...prev]);
      }
      
      // Log XP earned
      const xpLog = `⚡ Earned ${result.xpEarned} XP`;
      setJourneyLogs(prev => [xpLog, ...prev]);
      
      // Refresh data
      await refreshData();
      await loadData();
      
      // Check streak achievements specifically
      const achievements = await gamificationTester.getAllAchievementsWithProgress();
      const streak3 = achievements.completed.find(a => a.id === 'streak_3');
      const streak7 = achievements.completed.find(a => a.id === 'streak_7');
      const streak14 = achievements.completed.find(a => a.id === 'streak_14');
      
      // Log streak status
      const currentStreak = progressSummary?.currentStreak || 0;
      const streakLog = `🔥 Current streak: ${currentStreak} days`;
      setJourneyLogs(prev => [streakLog, ...prev]);
      
      // Increment the day counter
      setCurrentDay(prev => prev + 1);
      
    } catch (error) {
      console.error('Error simulating next day:', error);
      Alert.alert('Error', 'Failed to simulate next day');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Simulate a specific number of days at once
  const simulateDays = async (numDays: number) => {
    if (!journeyInProgress) {
      Alert.alert('No journey in progress', 'Please start a new user journey first.');
      return;
    }
    
    setIsLoading(true);
    try {
      for (let i = 0; i < numDays; i++) {
        await simulateNextDay();
      }
    } catch (error) {
      console.error(`Error simulating ${numDays} days:`, error);
      Alert.alert('Error', `Failed to simulate ${numDays} days`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset the current journey
  const resetJourney = async () => {
    if (!journeyInProgress) {
      return;
    }
    
    Alert.alert(
      'Reset Journey',
      'Are you sure you want to reset the current journey?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              await gamificationTester.resetAllUserProgress();
              setCurrentDay(1);
              setJourneyInProgress(false);
              setJourneyLogs([]);
              await refreshData();
              await loadData();
            } catch (error) {
              console.error('Error resetting journey:', error);
              Alert.alert('Error', 'Failed to reset journey');
            } finally {
              setIsLoading(false);
            }
          }
        }
      ]
    );
  };

  // Handle force checking achievements
  const handleForceAchievementCheck = async () => {
    setIsLoading(true);
    try {
      const userProgress = await storageService.getUserProgress();
      
      // Log current stats
      console.log('Current statistics before forced achievement check:', JSON.stringify(userProgress.statistics));
      console.log(`Total routines: ${userProgress.statistics.totalRoutines}`);
      console.log(`Current streak: ${userProgress.statistics.currentStreak}`);
      
      // Get all routines and calculate streak directly
      const allRoutines = await storageService.getAllRoutines();
      const { calculateStreak } = require('../utils/progressUtils');
      const calculatedStreak = calculateStreak(allRoutines);
      
      console.log(`Calculated streak from all routines: ${calculatedStreak} days`);
      
      // Update streak in statistics
      if (calculatedStreak > 0) {
        userProgress.statistics.currentStreak = calculatedStreak;
        if (calculatedStreak > userProgress.statistics.bestStreak) {
          userProgress.statistics.bestStreak = calculatedStreak;
        }
      }
      
      // Update total routines
      userProgress.statistics.totalRoutines = allRoutines.length;
      
      // Save updated statistics
      await storageService.saveUserProgress(userProgress);
      
      // Force achievement check
      const result = await achievementManager.updateAchievements(userProgress);
      
      if (result.unlockedAchievements.length > 0) {
        const achievementNames = result.unlockedAchievements.map(a => a.title).join(', ');
        Alert.alert(
          'Achievements Unlocked!',
          `Forced check found these achievements:\n${achievementNames}\n\nXP Earned: ${result.xpEarned}`
        );
      } else {
        Alert.alert(
          'Achievement Check',
          'No new achievements unlocked during force check'
        );
      }
      
      await refreshData();
      await loadData();
    } catch (error) {
      console.error('Error during force achievement check:', error);
      Alert.alert('Error', 'Failed to check achievements');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Add XpNotificationManager to show achievement notifications */}
      <XpNotificationManager />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enhanced Progress Testing</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={loadData}>
          <Ionicons name="refresh" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* User Journey Simulation (NEW) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Journey Simulation</Text>
          <Text style={styles.description}>
            Simulate a user's experience day by day to test achievement progression.
          </Text>
          
          <View style={styles.journeyControls}>
            <TouchableOpacity
              style={[styles.actionButton, !journeyInProgress && styles.primaryButton]}
              onPress={startUserJourney}
              disabled={isLoading || journeyInProgress}
            >
              <Text style={styles.actionButtonText}>Start New Journey</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.actionButton, journeyInProgress && styles.primaryButton]}
              onPress={simulateNextDay}
              disabled={isLoading || !journeyInProgress}
            >
              <Text style={styles.actionButtonText}>Simulate Next Day</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => simulateDays(3)}
              disabled={isLoading || !journeyInProgress}
            >
              <Text style={styles.actionButtonText}>Simulate 3 Days</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.resetButton}
              onPress={resetJourney}
              disabled={isLoading || !journeyInProgress}
            >
              <Text style={styles.resetButtonText}>Reset Journey</Text>
            </TouchableOpacity>
          </View>
          
          {journeyInProgress && (
            <>
              <View style={styles.journeyStatus}>
                <Text style={styles.journeyStatusText}>
                  Current Day: {currentDay}
                </Text>
                <Text style={styles.journeyStatusText}>
                  Current Streak: {progressSummary?.currentStreak || 0} days
                </Text>
                <Text style={styles.journeyStatusText}>
                  Total XP: {progressSummary?.totalXP || 0}
                </Text>
                <Text style={styles.journeyStatusText}>
                  Completed Achievements: {achievementGroups.completed.length}
                </Text>
              </View>
              
              <View style={styles.journeySettings}>
                <Text style={styles.subsectionTitle}>Day Settings</Text>
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
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                            {area}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>Randomize Durations:</Text>
                  <Switch
                    value={randomizeDurations}
                    onValueChange={setRandomizeDurations}
                    trackColor={{ false: '#767577', true: '#81b0ff' }}
                    thumbColor={randomizeDurations ? '#4CAF50' : '#f4f3f4'}
                  />
                </View>
                
                {!randomizeDurations && (
                  <View style={styles.durationSelector}>
                    <Text style={styles.inputLabel}>Select Duration:</Text>
                    <View style={styles.durationButtons}>
                      {durations.map(duration => (
                        <TouchableOpacity
                          key={duration}
                          style={[
                            styles.durationButton,
                            selectedDuration === duration && styles.selectedDurationButton
                          ]}
                          onPress={() => setSelectedDuration(duration)}
                        >
                          <Text style={[
                            styles.durationButtonText,
                            selectedDuration === duration && styles.selectedDurationButtonText
                          ]}>
                            {duration} min
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
              
              <View style={styles.logContainer}>
                <Text style={styles.subsectionTitle}>Journey Log</Text>
                {journeyLogs.length > 0 ? (
                  journeyLogs.map((log, index) => (
                    <Text key={index} style={styles.logEntry}>
                      {log}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.noDataText}>No journey logs yet</Text>
                )}
              </View>
            </>
          )}
        </View>

        {/* Progress Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Progress</Text>
          {isLoading || isGamificationLoading ? (
            <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
          ) : progressSummary ? (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>Level {progressSummary.level}</Text>
              <Text style={styles.summaryText}>
                XP: {progressSummary.totalXP} / {progressSummary.totalXP + progressSummary.xpToNextLevel}
              </Text>
              <Text style={styles.summaryText}>
                Routines: {progressSummary.routinesCompleted}
              </Text>
              <Text style={styles.summaryText}>
                Current Streak: {progressSummary.currentStreak} days
              </Text>
              <Text style={styles.summaryText}>
                Best Streak: {progressSummary.bestStreak} days
              </Text>
              <Text style={styles.summaryText}>
                Total Minutes: {progressSummary.totalMinutes}
              </Text>
              {progressSummary.favoriteArea && (
                <Text style={styles.summaryText}>
                  Favorite Area: {progressSummary.favoriteArea}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.noDataText}>No data available</Text>
          )}
        </View>

        {/* Generate Routines */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Generate Routines</Text>
          
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
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Date Range:</Text>
            <View style={styles.rowInputs}>
              <View style={styles.halfInput}>
                <Text style={styles.smallLabel}>Start (days ago):</Text>
                <TextInput
                  style={styles.input}
                  value={startDaysAgo}
                  onChangeText={setStartDaysAgo}
                  keyboardType="number-pad"
                  placeholder="30"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.smallLabel}>End (days ago):</Text>
                <TextInput
                  style={styles.input}
                  value={endDaysAgo}
                  onChangeText={setEndDaysAgo}
                  keyboardType="number-pad"
                  placeholder="0"
                />
              </View>
            </View>
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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
                      {area}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchLabel}>Randomize Durations:</Text>
            <Switch
              value={randomizeDurations}
              onValueChange={setRandomizeDurations}
              trackColor={{ false: '#767577', true: '#81b0ff' }}
              thumbColor={randomizeDurations ? '#4CAF50' : '#f4f3f4'}
            />
          </View>
          
          {!randomizeDurations && (
            <View style={styles.durationSelector}>
              <Text style={styles.inputLabel}>Select Duration:</Text>
              <View style={styles.durationButtons}>
                {durations.map(duration => (
                  <TouchableOpacity
                    key={duration}
                    style={[
                      styles.durationButton,
                      selectedDuration === duration && styles.selectedDurationButton
                    ]}
                    onPress={() => setSelectedDuration(duration)}
                  >
                    <Text style={[
                      styles.durationButtonText,
                      selectedDuration === duration && styles.selectedDurationButtonText
                    ]}>
                      {duration} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAddMockRoutines}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>Generate Routines</Text>
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

        {/* Add XP */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add XP</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>XP Amount:</Text>
            <TextInput
              style={styles.input}
              value={xpAmount}
              onChangeText={setXpAmount}
              keyboardType="number-pad"
              placeholder="100"
            />
          </View>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAddXP}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>Add XP</Text>
          </TouchableOpacity>
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          
          <View style={styles.achievementActions}>
            <TouchableOpacity
              style={styles.categoryButton}
              onPress={() => handleCompleteAchievements('beginner')}
            >
              <Text style={styles.categoryButtonText}>Complete Beginner</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.categoryButton}
              onPress={() => handleCompleteAchievements('intermediate')}
            >
              <Text style={styles.categoryButtonText}>Complete Intermediate</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.categoryButton}
              onPress={() => handleCompleteAchievements('advanced')}
            >
              <Text style={styles.categoryButtonText}>Complete Advanced</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.categoryButton}
              onPress={() => handleCompleteAchievements()}
            >
              <Text style={styles.categoryButtonText}>Complete All</Text>
            </TouchableOpacity>
          </View>
          
          {/* In Progress Achievements */}
          {achievementGroups.inProgress.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>In Progress</Text>
              {achievementGroups.inProgress.map(achievement => (
                <View key={achievement.id} style={styles.achievementItem}>
                  <View style={styles.achievementInfo}>
                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    <Text style={styles.achievementProgress}>
                      Progress: {achievement.progress}/{achievement.requirement}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.testButton}
                    onPress={() => handleTestAchievement(achievement.id)}
                  >
                    <Text style={styles.testButtonText}>Test</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
          
          {/* Locked Achievements */}
          {achievementGroups.locked.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Locked</Text>
              {achievementGroups.locked.map(achievement => (
                <View key={achievement.id} style={styles.achievementItem}>
                  <View style={styles.achievementInfo}>
                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    <Text style={styles.achievementRequirement}>
                      Required: {achievement.requirement}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.testButton}
                    onPress={() => handleTestAchievement(achievement.id)}
                  >
                    <Text style={styles.testButtonText}>Test</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
          
          {/* Completed Achievements */}
          {achievementGroups.completed.length > 0 && (
            <>
              <Text style={styles.subsectionTitle}>Completed</Text>
              {achievementGroups.completed.map(achievement => (
                <View key={achievement.id} style={styles.achievementItem}>
                  <View style={styles.achievementInfo}>
                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    <Text style={styles.achievementCompleted}>
                      Completed: {new Date(achievement.dateCompleted).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Reset Progress */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.resetButton}
            onPress={handleResetProgress}
            disabled={isLoading}
          >
            <Text style={styles.resetButtonText}>Reset All Progress</Text>
          </TouchableOpacity>
        </View>

        {/* Diagnostics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Diagnostics</Text>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: '#9c27b0' }]}
            onPress={handleForceAchievementCheck}
            disabled={isLoading}
          >
            <Text style={styles.actionButtonText}>Force Achievement Check</Text>
          </TouchableOpacity>
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
  subsectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#666',
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
  smallLabel: {
    fontSize: 14,
    marginBottom: 4,
    color: '#666',
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
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    flex: 0.48,
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
  durationSelector: {
    marginBottom: 16,
  },
  durationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  durationButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
  },
  selectedDurationButton: {
    backgroundColor: '#4CAF50',
  },
  durationButtonText: {
    color: '#555',
  },
  selectedDurationButtonText: {
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
  achievementActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  categoryButton: {
    backgroundColor: '#81C784',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    width: '48%',
  },
  categoryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  achievementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  achievementProgress: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 4,
  },
  achievementRequirement: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  achievementCompleted: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 4,
  },
  testButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  testButtonText: {
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
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  journeyControls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#2E7D32', // Darker green
  },
  journeyStatus: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#4169e1',
  },
  journeyStatusText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
  },
  journeySettings: {
    marginBottom: 16,
  },
  logContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    maxHeight: 200,
  },
  logEntry: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
});

export default EnhancedProgressTestingScreen; 