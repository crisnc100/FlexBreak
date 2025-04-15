import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as gamificationManager from '../utils/progress/gameEngine';
import * as storageService from '../services/storageService';
import * as challengeManager from '../utils/progress/modules/challengeManager';
import * as achievementManager from '../utils/progress/modules/achievementManager';
import * as rewardManager from '../utils/progress/modules/rewardManager';
import * as dateUtils from '../utils/progress/modules/utils/dateUtils';
import { CORE_CHALLENGES } from '../utils/progress/constants';
import * as cacheUtils from '../utils/progress/modules/utils/cacheUtils';
import { clearAllData } from '../services/storageService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, CommonActions } from '@react-navigation/native';

// Import our custom components
import {
  AuthModal,
  DateSelectionModal,
  StretchConfigModal,
  ConfirmationModal,
  SimulationResult,
  StretchConfig
} from '../components/simulator';

// Constants
const BOB_NAME = "Bob";
const DEFAULT_DURATION = 10;
const XP_RATES = {
  5: 30,   // 5 minutes = 30 XP
  10: 60,  // 10 minutes = 60 XP
  15: 90   // 15 minutes = 90 XP
};
const WELCOME_BONUS = 50;

// Durations for the picker
const DURATIONS = [5, 10, 15];

// Valid body areas and durations (matching app types)
const BODY_AREAS = ['Neck', 'Lower Back', 'Upper Back & Chest', 'Shoulders & Arms', 'Hips & Legs', 'Full Body'];
const DURATION_TYPES = ['5', '10', '15'];
const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

const BobSimulatorScreen = ({ navigation, route }: { navigation: any, route: any }) => {
  const { theme, isDark } = useTheme();
  
  // Check if coming from testing flow
  const fromTesting = route.params?.fromTesting === true;
  const testingAccessGranted = route.params?.testingAccessGranted === true;
  const returnToTesting = route.params?.returnToTesting === true;
  
  // Get scenario data if provided
  const scenarioData = route.params?.scenarioData;
  
  // State for scenario instructions
  const [scenarioInstructions, setScenarioInstructions] = useState<{
    id: string;
    title: string;
    setup: string;
    verification: string[];
  } | null>(null);
  
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(fromTesting && testingAccessGranted);
  const [showAuthModal, setShowAuthModal] = useState(!fromTesting || !testingAccessGranted);
  
  // Add new state variables for improved simulation
  const [lastBatchEndDate, setLastBatchEndDate] = useState<Date | null>(null);
  const [lastConfig, setLastConfig] = useState<StretchConfig | null>(null);
  const [lastSimulatedDate, setLastSimulatedDate] = useState<Date | null>(null);
  const [consecutiveDaysCount, setConsecutiveDaysCount] = useState<number>(0);
  
  // Check if we have authentication from testing flow stored in AsyncStorage
  useEffect(() => {
    const checkTestingAccess = async () => {
      try {
        const testingAccess = await AsyncStorage.getItem('@deskstretch:bob_simulator_access');
        if (testingAccess === 'true') {
          setIsAuthenticated(true);
          setShowAuthModal(false);
        }
      } catch (error) {
        console.error('Error checking simulator access:', error);
      }
    };
    
    // Only check if we're not already authenticated from route params
    if (!isAuthenticated) {
      checkTestingAccess();
    }
  }, [isAuthenticated]);
  
  // Load scenario data when the component mounts
  useEffect(() => {
    const loadScenarioData = async () => {
      // Check for scenario data in route params
      if (scenarioData) {
        setScenarioInstructions({
          id: scenarioData.scenarioId || '',
          title: scenarioData.scenarioTitle || '',
          setup: scenarioData.scenarioSetup || '',
          verification: scenarioData.scenarioVerification || []
        });
      } else {
        // Check for scenario data in AsyncStorage as fallback
        try {
          const storedScenario = await AsyncStorage.getItem('@deskstretch:simulator_scenario');
          if (storedScenario) {
            const parsedScenario = JSON.parse(storedScenario);
            setScenarioInstructions(parsedScenario);
          }
        } catch (error) {
          console.error('Error loading scenario data:', error);
        }
      }
    };
    
    if (fromTesting && isAuthenticated) {
      loadScenarioData();
    }
  }, [fromTesting, isAuthenticated, scenarioData]);
  
  // Bob's user progress
  const [bobProgress, setBobProgress] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Modal visibility states
  const [showDateModal, setShowDateModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showBatchConfigModal, setShowBatchConfigModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  
  // Simulation state
  const [simulatedDates, setSimulatedDates] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  
  // Simulation results
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  
  // Current stats to display
  const [stats, setStats] = useState({
    level: 1,
    totalXP: 0,
    xpToNextLevel: 100,
    percentToNextLevel: 0,
    currentStreak: 0
  });
  
  // Modal for challenge/reward details
  const [detailsModal, setDetailsModal] = useState({
    visible: false,
    title: '',
    content: [] as {title: string, description: string, progress?: string}[]
  });
  
  // Activity log
  const [activityLog, setActivityLog] = useState<string[]>([]);
  
  // Add a state for body area selection
  const [selectedArea, setSelectedArea] = useState<string>('Neck');
  
  // Add a state for difficulty selection
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('Beginner');
  
  // Initialize Bob's progress when authenticated
  useEffect(() => {
    if (isAuthenticated && !isInitialized) {
    initializeBob();
    }
  }, [isAuthenticated, isInitialized]);
  
  // Add log entry with current date
  const addLog = (message: string) => {
    const dateStr = currentDate.toLocaleDateString();
    setActivityLog(prev => [`[${dateStr}] ${message}`, ...prev]);
  };
  
  // Initialize Bob with fresh progress
  const initializeBob = async () => {
    setIsLoading(true);
    
    try {
      // Clear any existing routines in storage first to ensure clean start
      await storageService.clearRoutines();
      console.log("Cleared existing routines before initialization");
      
      // First backup the current user data
      const currentUserData = await storageService.getUserProgress();
      
      // Create a fresh progress for Bob
      const freshProgress = await gamificationManager.initializeUserProgress();
      
      // Ensure statistics are properly reset to 0
      freshProgress.statistics = {
        totalRoutines: 0,
        currentStreak: 0,
        bestStreak: 0,
        uniqueAreas: [],
        totalMinutes: 0,
        routinesByArea: {},
        lastUpdated: new Date().toISOString()
      };
      
      // Ensure XP and level are at initial values
      freshProgress.totalXP = 0;
      freshProgress.level = 1;
      freshProgress.hasReceivedWelcomeBonus = false;
      
      // Override Date for simulation if a specific date is selected
      if (selectedDate) {
        patchDateForSimulation(selectedDate);
      }
      
      // Save fresh progress
      await storageService.saveUserProgress(freshProgress);
      console.log("Saved fresh progress with statistics reset to 0");

      // Verify storage is empty
      const routineCheck1 = await storageService.getAllRoutines();
      console.log(`After progress reset - routine count: ${routineCheck1.length}`);
      if (routineCheck1.length > 0) {
        console.warn("WARNING: Routines still exist after reset!");
        await storageService.clearRoutines();
      }

      // Initialize and refresh challenges explicitly
      await challengeManager.refreshChallenges(freshProgress);
      
      // After refreshing in initialization, also call updateUserChallenges
      const initialCompletedChallenges = await challengeManager.updateUserChallenges(freshProgress);
      if (initialCompletedChallenges.length > 0) {
        console.log(`Completed ${initialCompletedChallenges.length} challenges during initialization`);
        addLog(`Found ${initialCompletedChallenges.length} completed challenges on first setup`);
      }
      
      // Always check for challenges updates on day change
      const progress = await storageService.getUserProgress();
      const completedChallenges = await challengeManager.updateUserChallenges(progress);
      if (completedChallenges.length > 0) {
        console.log(`Found ${completedChallenges.length} challenges completed during day change`);
        addLog(`Completed ${completedChallenges.length} challenges with the day change`);
        completedChallenges.forEach(challenge => {
          addLog(`  ✅ Completed: ${challenge.title}`);
        });
      }
      
      // Update Bob's data
      await refreshBobStats();
      
      // Force one more refresh to ensure everything is in sync
      const currentProgress = await storageService.getUserProgress();
      await challengeManager.ensureChallengeCount(currentProgress, CORE_CHALLENGES);
      await storageService.saveUserProgress(currentProgress);
      
      // Verify Bob starts with 0 routines
      const finalStats = await storageService.getUserProgress();
      console.log(`Bob initialized with stats: Total routines: ${finalStats.statistics.totalRoutines}, XP: ${finalStats.totalXP}, Streak: ${finalStats.statistics.currentStreak}`);
      addLog(`Bob has ${finalStats.statistics.totalRoutines} routines to start`);
      
      // Verify routines storage
      const routineCheck2 = await storageService.getAllRoutines();
      console.log(`Final routine check - count in storage: ${routineCheck2.length}`);
      
      if (finalStats.statistics.totalRoutines !== 0 || routineCheck2.length !== 0) {
        console.warn("ERROR: Bob's routine count is not 0 after initialization!");
        finalStats.statistics.totalRoutines = 0;
        await storageService.saveUserProgress(finalStats);
        await storageService.clearRoutines();
        addLog("⚠️ Forced routine count to 0");
      }
      
      setIsInitialized(true);
      addLog(`Initialized ${BOB_NAME}'s progress on ${currentDate.toLocaleDateString()}`);
      addLog(`Daily, weekly, and monthly challenges are now active`);
    } catch (error) {
      console.error('Error initializing Bob:', error);
      Alert.alert('Error', 'Failed to initialize simulation');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Override JavaScript's Date object for simulation
  const patchDateForSimulation = (targetDate: Date) => {
    const originalDate = Date;
    const targetTime = targetDate.getTime();
    
    console.log(`Patching JavaScript Date to: ${targetDate.toISOString()} (${targetDate.toLocaleDateString()})`);
    
    // @ts-ignore - Override Date constructor
    global.Date = class extends originalDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          // When called with no args, return the simulation date
          super(targetTime);
        } else if (args[0] === 'now') {
          // Special case for getting the real current date (not simulated)
          super();
        } else {
          // Otherwise use the provided args
          // @ts-ignore
          super(...args);
        }
      }
      
      // Override Date.now()
      static now() {
        return targetTime;
      }
      
      // Provide a way to get the actual current date
      static realNow() {
        return originalDate.now();
      }
      
      // Get the real current date as a date object
      static getRealCurrentDate() {
        return new originalDate();
      }
    };
    
    // Verify the patch
    const newDate = new Date();
    const realDate = (Date as any).getRealCurrentDate();
    console.log(`Simulation date: ${newDate.toLocaleDateString()}, Real date: ${realDate.toLocaleDateString()}`);
    
    // Set the current date for the component state
    setCurrentDate(targetDate);
  };
  
  // Refresh Bob's stats
  const refreshBobStats = async () => {
    const progress = await storageService.getUserProgress();
    setBobProgress(progress);
    
    const levelInfo = await gamificationManager.getUserLevelInfo();
    
    setStats({
      level: levelInfo.level,
      totalXP: levelInfo.totalXP,
      xpToNextLevel: levelInfo.xpToNextLevel || 0,
      percentToNextLevel: levelInfo.percentToNextLevel,
      currentStreak: progress.statistics?.currentStreak || 0
    });
    
    return progress;
  };
  
  // Handle simulation for a single day
  const handleSingleDaySimulation = async (config: StretchConfig) => {
    if (!selectedDate) {
      Alert.alert('Error', 'No date selected for simulation');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Use the selected date for simulation
      patchDateForSimulation(selectedDate);
      
      // Get initial state for comparison
      const initialProgress = await storageService.getUserProgress();
      const initialXP = initialProgress.totalXP || 0;
      const initialStreak = initialProgress.statistics?.currentStreak || 0;
      
      // Create the routine with proper types
      const routine = {
        id: `simulated-stretch-${Date.now()}`,
        date: new Date().toISOString(),
        duration: config.duration.toString() as any,
        area: config.bodyArea as any,
        difficulty: config.difficulty as any,
        stretches: ["Neck Rotation", "Shoulder Stretch"], // Placeholder stretches
        status: "completed"
      } as any;
      
      // Process the routine
      console.log(`Processing simulated routine for ${selectedDate.toLocaleDateString()}`);
      const result = await gamificationManager.processCompletedRoutine(routine);
      
      // Calculate XP gained
      const afterProgress = await storageService.getUserProgress();
      const xpGained = afterProgress.totalXP - initialXP;
      
      // Check for completed challenges
      let completedChallenges: any[] = result.completedChallenges || [];
      
      // Explicitly claim each challenge to ensure XP is awarded
      for (const challenge of completedChallenges) {
        await gamificationManager.claimChallenge(challenge.id);
      }
      
      // Force check for additional challenges that might be completed
      const additionalChallenges = await challengeManager.updateUserChallenges(afterProgress);
      completedChallenges = [...completedChallenges, ...additionalChallenges];
      
      // Claim each additional challenge
      for (const challenge of additionalChallenges) {
        await gamificationManager.claimChallenge(challenge.id);
      }
      
      // Check for newly completed achievements
      const achievements = Object.values(afterProgress.achievements || {});
      const newlyCompleted = achievements.filter(a => 
        a.completed && a.dateCompleted === new Date().toISOString().split('T')[0]
      );
      
      // Get final progress after all operations
      await refreshBobStats();
      const finalProgress = await storageService.getUserProgress();
      
      // Add date to simulated dates
      const dateStr = selectedDate.toISOString();
      setSimulatedDates(prev => [...prev, dateStr]);
      
      // Store the last configuration and date for quick simulation
      setLastConfig(config);
      setLastSimulatedDate(selectedDate);
      
      // If this is a sequential day after the last one, increment the counter
      if (consecutiveDaysCount > 0 && 
          lastSimulatedDate && 
          Math.abs(selectedDate.getTime() - lastSimulatedDate.getTime()) < 86400000 * 2) {
        setConsecutiveDaysCount(prev => prev + 1);
      } else {
        setConsecutiveDaysCount(1);
      }
      
      // Prepare simulation result for confirmation modal
      const simulationResult: SimulationResult = {
        date: dateStr,
        bodyArea: config.bodyArea,
        difficulty: config.difficulty,
        duration: config.duration,
        xpEarned: xpGained,
        totalXp: finalProgress.totalXP,
        level: finalProgress.level,
        percentToNextLevel: stats.percentToNextLevel,
        streakDays: finalProgress.statistics?.currentStreak || 0,
        completedChallenges: completedChallenges.map(c => ({
          title: c.title,
          xp: c.xp
        })),
        achievements: newlyCompleted.map(a => ({
          title: a.title
        }))
      };
      
      // Show the confirmation modal
      setSimulationResult(simulationResult);
      setShowConfirmationModal(true);
      
      // Reset selected date
      setSelectedDate(null);
    } catch (error) {
      console.error('Error in single day simulation:', error);
      Alert.alert('Simulation Error', 'An error occurred during simulation');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle quick simulation of the previous day
  const handleQuickSimulation = () => {
    if (!lastSimulatedDate || !lastConfig) {
      Alert.alert('Error', 'No previous simulation data available');
      return;
    }
    
    // Calculate the previous day
    const previousDay = new Date(lastSimulatedDate);
    previousDay.setDate(previousDay.getDate() - 1);
    
    // Set as selected date and use lastConfig
    setSelectedDate(previousDay);
    
    // Show a confirmation with the date
    Alert.alert(
      'Quick Simulate Previous Day',
      `Simulate ${previousDay.toLocaleDateString()} with the same configuration?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Simulate', 
          onPress: () => handleSingleDaySimulation(lastConfig)
        }
      ]
    );
  };
  
  // Handle batch simulation for 7 consecutive days
  const handleBatchSimulation = async (config: StretchConfig) => {
    setIsLoading(true);
    
    try {
      // Calculate date range based on lastBatchEndDate
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let endDate: Date;
      let startDate: Date;
      
      if (!lastBatchEndDate) {
        // First batch: use yesterday as end date
        endDate = yesterday;
      } else {
        // Subsequent batches: use 7 days before the last end date
        endDate = new Date(lastBatchEndDate);
        endDate.setDate(endDate.getDate() - 1);
      }
      
      // Start date is always 7 days before end date
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      
      console.log(`Batch simulation from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
      
      // Keep track of total XP earned
      let totalXpEarned = 0;
      let allCompletedChallenges: any[] = [];
      let allCompletedAchievements: any[] = [];
      
      // Get initial state for comparison
      const initialProgress = await storageService.getUserProgress();
      const initialXP = initialProgress.totalXP || 0;
      
      // Simulate each day in the range
      const batchDates: string[] = [];
      
      // Simulate from start date to end date (inclusive)
      let currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        // Patch date for simulation
        patchDateForSimulation(currentDate);
        
        // Create routine for this day
        const routine = {
          id: `batch-stretch-${Date.now()}-${currentDate.getTime()}`,
          date: new Date().toISOString(),
          duration: config.duration.toString() as any,
          area: config.bodyArea as any,
          difficulty: config.difficulty as any,
          stretches: ["Batch Simulation Stretch"],
          status: "completed"
        } as any;
        
        // Process the routine
        const result = await gamificationManager.processCompletedRoutine(routine);
        
        // Claim any completed challenges
        if (result.completedChallenges && result.completedChallenges.length > 0) {
          for (const challenge of result.completedChallenges) {
            await gamificationManager.claimChallenge(challenge.id);
            allCompletedChallenges.push(challenge);
          }
        }
        
        // Add date to batch
        batchDates.push(currentDate.toISOString());
        
        // Check for additional challenges
        const progress = await storageService.getUserProgress();
        const additionalChallenges = await challengeManager.updateUserChallenges(progress);
        
        if (additionalChallenges.length > 0) {
          for (const challenge of additionalChallenges) {
            await gamificationManager.claimChallenge(challenge.id);
            allCompletedChallenges.push(challenge);
          }
        }
        
        // Move to next day
        currentDate = new Date(currentDate);
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Store the last batch end date for subsequent simulations
      setLastBatchEndDate(startDate);
      
      // Update simulated dates
      setSimulatedDates(prev => [...prev, ...batchDates]);
      
      // Get final state after all simulations
      await refreshBobStats();
      const finalProgress = await storageService.getUserProgress();
      
      // Calculate total XP earned
      totalXpEarned = finalProgress.totalXP - initialXP;
      
      // Check for newly completed achievements
      const achievements = Object.values(finalProgress.achievements || {});
      allCompletedAchievements = achievements.filter(a => 
        a.completed && batchDates.some(dateStr => {
          const batchDate = new Date(dateStr).toISOString().split('T')[0];
          return a.dateCompleted === batchDate;
        })
      );
      
      // Prepare simulation result for confirmation modal
      const simulationResult: SimulationResult = {
        date: batchDates[0], // Use first date for reference
        bodyArea: config.bodyArea,
        difficulty: config.difficulty,
        duration: config.duration,
        xpEarned: totalXpEarned,
        totalXp: finalProgress.totalXP,
        level: finalProgress.level,
        percentToNextLevel: stats.percentToNextLevel,
        streakDays: finalProgress.statistics?.currentStreak || 0,
        completedChallenges: allCompletedChallenges.map(c => ({
          title: c.title,
          xp: c.xp
        })),
        achievements: allCompletedAchievements.map(a => ({
          title: a.title
        })),
        isBatchMode: true,
        daysSimulated: batchDates.length
      };
      
      // Show the confirmation modal
      setSimulationResult(simulationResult);
      setShowConfirmationModal(true);
    } catch (error) {
      console.error('Error in batch simulation:', error);
      Alert.alert('Batch Simulation Error', 'An error occurred during batch simulation');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Show details for challenges
  const handleShowChallenges = async () => {
    try {
      const activeChallenges = await challengeManager.getActiveChallenges();
      const flatChallenges = Object.values(activeChallenges).flat();
      
      if (flatChallenges.length === 0) {
        Alert.alert('No Challenges', 'There are no active challenges at the moment.');
        return;
      }
      
      const challengeDetails = flatChallenges.map(challenge => ({
        title: challenge.title,
        description: challenge.description,
        progress: `${challenge.progress || 0}/${challenge.requirement} (${challenge.status})`
      }));
      
      setDetailsModal({
        visible: true,
        title: 'Active Challenges',
        content: challengeDetails
      });
    } catch (error) {
      console.error('Error fetching challenges:', error);
      Alert.alert('Error', 'Failed to fetch challenge details');
    }
  };
  
  // Show details for rewards
  const handleShowRewards = async () => {
    try {
      const allRewards = await rewardManager.getAllRewards();
      
      const rewardDetails = allRewards.map(reward => ({
        title: reward.title,
        description: `Unlocks at Level ${reward.levelRequired}`,
        progress: reward.unlocked ? 'UNLOCKED' : `Locked (Level ${reward.levelRequired})`
      }));
      
      setDetailsModal({
        visible: true,
        title: 'Rewards',
        content: rewardDetails
      });
    } catch (error) {
      console.error('Error fetching rewards:', error);
      Alert.alert('Error', 'Failed to fetch reward details');
    }
  };
  
  // Show details for achievements
  const handleShowAchievements = async () => {
    try {
      const achievementsProgress = await storageService.getUserProgress();
      const achievements = Object.values(achievementsProgress.achievements || {});
      
      const achievementDetails = achievements.map(achievement => ({
        title: achievement.title,
        description: achievement.description,
        progress: achievement.completed ? 'COMPLETED' : 'Not completed yet'
      }));
      
      setDetailsModal({
        visible: true,
        title: 'Achievements',
        content: achievementDetails
      });
    } catch (error) {
      console.error('Error fetching achievements:', error);
      Alert.alert('Error', 'Failed to fetch achievement details');
    }
  };
  
  // Reset the simulation
  const handleReset = () => {
    Alert.alert(
      'Reset Simulation',
      'This will reset all progress and start fresh. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            // Use the actual current date
            const resetDate = new Date();
            setCurrentDate(resetDate);
            console.log(`Reset simulation date to today: ${resetDate.toISOString()}`);
            
            // Reset all the tracking states
            setActivityLog([]);
            setLastBatchEndDate(null);
            setLastConfig(null);
            setLastSimulatedDate(null);
            setConsecutiveDaysCount(0);
            
            // Initialize fresh state
            initializeBob();
          }
        }
      ]
    );
  };
  
  // Render the level progress bar
  const renderLevelProgress = () => {
    return (
      <View style={styles.progressBarContainer}>
        <View 
          style={[
            styles.progressBarFill, 
            { width: `${Math.min(100, Math.max(0, stats.percentToNextLevel))}%`, backgroundColor: theme.accent }
          ]} 
        />
      </View>
    );
  };
  
  // Add a method to handle going back one day
  const handlePreviousDay = async () => {
    const prevDate = new Date(currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    setCurrentDate(prevDate);
    
    // Update the simulated date
    patchDateForSimulation(prevDate);
    
    // Log the change
    addLog(`Went back to ${prevDate.toLocaleDateString()}`);
    
    try {
      setIsLoading(true);
      
      // Get the current progress
      const progress = await storageService.getUserProgress();
      
      // Since we're going backwards, we need to make sure all
      // challenges are still properly set up for this date
      await challengeManager.ensureChallengeCount(progress, CORE_CHALLENGES);
      await storageService.saveUserProgress(progress);
      
      // Update stats
      await refreshBobStats();
    } catch (error) {
      console.error('Error handling previous day:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Also update the renderBobStats function to include additional stats
  const renderBobStats = () => {
    // If there's no progress yet, return a placeholder
    if (!bobProgress) return null;
    
    // Get stats from progress
    const statistics = bobProgress.statistics || {};
    const routines = statistics.totalRoutines || 0;
    const minutes = statistics.totalMinutes || 0;
    
    return (
      <View style={[styles.statsCard, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.statsTitle, { color: theme.text }]}>Current Stats</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{stats.level}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Level</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{stats.totalXP}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total XP</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{stats.currentStreak}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Streak</Text>
          </View>
        </View>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{routines}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Routines</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{minutes}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Minutes</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: theme.text }]}>{stats.xpToNextLevel}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>To Next</Text>
          </View>
        </View>
        
        {renderLevelProgress()}
      </View>
    );
  };
  
  // Add cleanup when leaving the screen
  useEffect(() => {
    return () => {
      // Clean up when component unmounts
      try {
        AsyncStorage.removeItem('@deskstretch:bob_simulator_access');
      } catch (error) {
        console.error('Error removing simulator access:', error);
      }
    };
  }, []);
  
  // Add an effect to handle back button press
  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (fromTesting) {
          // Just go back normally if coming from testing
          return false;
        }
        return false;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [fromTesting])
  );
  
  // Add a special check to log navigation params for debugging
  console.log("[BobSimulator] Navigation params:", route?.params);
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.cardBackground }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            onPress={() => {
              console.log("[BobSimulator] Back button pressed, fromTesting:", fromTesting);
              // If returning to testing, use a custom navigation reset to restore stack
              if (fromTesting || returnToTesting) {
                console.log("[BobSimulator] Returning to Testing flow");
                
                // Instead of just going back (which fails), dispatch a reset action to get back to MainTabs
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' }],
                  })
                );
                
                // Store a flag to indicate that we need to re-open settings with the testing modal
                // This will be picked up by TabNavigator
                AsyncStorage.setItem('@deskstretch:reopen_settings', 'true')
                  .then(() => {
                    console.log('[BobSimulator] Set reopen_settings flag');
                  })
                  .catch(error => {
                    console.error('Error setting reopen_settings flag:', error);
                  });
                  
                // Make sure we keep our testing access
                AsyncStorage.setItem('@deskstretch:testing_access', 'true')
                  .catch(error => {
                    console.error('Error preserving testing access:', error);
                  });
              } else {
                // Regular back navigation for non-testing flow
                navigation.goBack();
              }
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {scenarioInstructions ? `Testing: Scenario #${scenarioInstructions.id}` : 'Bob Simulator'}
        </Text>
        
        <View style={styles.headerRight} />
      </View>
      
      {/* Main content */}
      {isAuthenticated ? (
        <ScrollView style={styles.container}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={[styles.loadingText, { color: theme.text }]}>
                Processing simulation...
              </Text>
            </View>
          ) : (
            <>
              {/* Testing Scenario Card - Only show if scenario data exists */}
              {scenarioInstructions && (
                <View style={[styles.scenarioCard, { backgroundColor: theme.cardBackground }]}>
                  <View style={styles.scenarioCardHeader}>
                    <Ionicons name="flask-outline" size={24} color={theme.accent} />
                    <Text style={[styles.scenarioCardTitle, { color: theme.text }]}>
                      Scenario #{scenarioInstructions.id}: {scenarioInstructions.title}
                    </Text>
                  </View>
                  
                  <View style={[styles.scenarioSetupContainer, { backgroundColor: theme.backgroundLight }]}>
                    <Text style={[styles.scenarioSetupLabel, { color: theme.accent }]}>Setup Instructions:</Text>
                    <Text style={[styles.scenarioSetupText, { color: theme.text }]}>
                      {scenarioInstructions.setup}
                    </Text>
                  </View>
                  
                  <Text style={[styles.verificationLabel, { color: theme.text }]}>
                    Verification Points:
                  </Text>
                  
                  {scenarioInstructions.verification.map((point, index) => (
                    <View key={index} style={styles.verificationItem}>
                      <Ionicons name="checkmark-circle" size={20} color={theme.accent} style={{ marginRight: 8 }} />
                      <Text style={[styles.verificationText, { color: theme.text }]}>
                        {point}
                      </Text>
                    </View>
                  ))}
                  
                  <View style={styles.scenarioFooter}>
                    <Text style={[styles.scenarioFooterText, { color: theme.textSecondary }]}>
                      Complete this scenario and return to the testing screen to provide feedback.
                    </Text>
                  </View>
                </View>
              )}
              
              {/* Welcome and Instructions Card */}
              <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="information-circle" size={24} color={theme.accent} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    Stretching Simulator
                  </Text>
                </View>
                
                <Text style={[styles.instructionsText, { color: theme.textSecondary }]}>
                  This tool lets you simulate stretching routines for testing purposes. Simulated routines 
                  will affect XP, levels, and unlock achievements just like real routines.
                </Text>
                
                <View style={styles.stepsContainer}>
                  <View style={styles.stepItem}>
                    <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <Text style={[styles.stepText, { color: theme.text }]}>
                      Choose a date to simulate a routine
                    </Text>
                  </View>
                  
                  <View style={styles.stepItem}>
                    <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <Text style={[styles.stepText, { color: theme.text }]}>
                      Configure the routine details (area, difficulty, duration)
                    </Text>
                  </View>
                  
                  <View style={styles.stepItem}>
                    <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <Text style={[styles.stepText, { color: theme.text }]}>
                      Review the results and continue simulating
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* Stats Overview Card */}
              {bobProgress && (
                <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="stats-chart" size={24} color={theme.accent} />
                    <Text style={[styles.cardTitle, { color: theme.text }]}>
                      Current Stats
                    </Text>
                  </View>
                  
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: theme.text }]}>{stats.level}</Text>
                      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Level</Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: theme.text }]}>{stats.totalXP}</Text>
                      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total XP</Text>
                    </View>
                    
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: theme.text }]}>{stats.currentStreak}</Text>
                      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Streak</Text>
                    </View>
                  </View>
                  
                  <View style={styles.progressBarContainer}>
                    <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>
                      Progress to Level {stats.level + 1}
                    </Text>
                    <View style={[styles.progressBarBg, { backgroundColor: isDark ? '#333' : '#e0e0e0' }]}>
                      <View 
                        style={[
                          styles.progressBarFill, 
                          { 
                            width: `${Math.min(100, Math.max(0, stats.percentToNextLevel))}%`, 
                            backgroundColor: theme.accent 
                          }
                        ]} 
                      />
                    </View>
                    <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                      {stats.totalXP} / {stats.totalXP + stats.xpToNextLevel} XP
                    </Text>
                  </View>
                </View>
              )}
              
              {/* Simulation Actions Card */}
              <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
                <View style={styles.cardHeader}>
                  <Ionicons name="fitness" size={24} color={theme.accent} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>
                    Simulation Actions
                  </Text>
                </View>
                
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.accent }]}
                  onPress={() => setShowDateModal(true)}
                >
                  <Ionicons name="calendar" size={20} color="#FFF" />
                  <Text style={styles.actionButtonText}>Simulate Single Day</Text>
                </TouchableOpacity>
                
                {/* Add Quick Simulate Button if we have a last config */}
                {lastConfig && lastSimulatedDate && (
                  <TouchableOpacity 
                    style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                    onPress={handleQuickSimulation}
                  >
                    <Ionicons name="time" size={20} color="#FFF" />
                    <Text style={styles.actionButtonText}>
                      Quick Simulate Previous Day 
                      {consecutiveDaysCount > 0 ? ` (Day ${consecutiveDaysCount + 1})` : ''}
                    </Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: isDark ? '#2D2D2D' : '#f5f5f5' }]}
                  onPress={() => setShowBatchConfigModal(true)}
                >
                  <Ionicons name="calendar-outline" size={20} color={theme.accent} />
                  <Text style={[styles.actionButtonText, { color: theme.text }]}>
                    Simulate 7 Days 
                    {lastBatchEndDate ? 
                      ` (${new Date(lastBatchEndDate.getTime() - 6 * 86400000).toLocaleDateString()} - ${new Date(lastBatchEndDate).toLocaleDateString()})` : 
                      ' Before Today'}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.resetButtonStyle, { backgroundColor: isDark ? '#2D2D2D' : '#f5f5f5' }]}
                  onPress={handleReset}
                >
                  <Ionicons name="refresh" size={20} color="#F44336" />
                  <Text style={[styles.resetButtonText, { color: '#F44336' }]}>
                    Reset Simulation Data
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Simulated Dates Card (if any) */}
              {simulatedDates.length > 0 && (
                <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="checkmark-circle" size={24} color={theme.accent} />
                    <Text style={[styles.cardTitle, { color: theme.text }]}>
                      Simulated Dates
                    </Text>
                  </View>
                  
                  <ScrollView style={styles.datesContainer}>
                    {simulatedDates.slice(0, 10).map((dateStr, index) => (
                      <View key={index} style={styles.dateItem}>
                        <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
                        <Text style={[styles.dateText, { color: theme.text }]}>
                          {new Date(dateStr).toLocaleDateString(undefined, {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </Text>
                      </View>
                    ))}
                    
                    {simulatedDates.length > 10 && (
                      <Text style={[styles.moreDatesText, { color: theme.textSecondary }]}>
                        +{simulatedDates.length - 10} more dates simulated
                      </Text>
                    )}
                  </ScrollView>
                </View>
              )}
            </>
          )}
        </ScrollView>
      ) : null}
      
      {/* Authentication Modal */}
      <AuthModal 
        visible={showAuthModal}
        onSuccess={() => {
          setIsAuthenticated(true);
          setShowAuthModal(false);
        }}
        onClose={() => {
          // If the user closes without authenticating, go back
          navigation.goBack();
        }}
        fromTesting={fromTesting}
      />
      
      {/* Date Selection Modal */}
      <DateSelectionModal
        visible={showDateModal}
        onClose={() => setShowDateModal(false)}
        onDateSelected={(date) => {
          setSelectedDate(date);
          setShowDateModal(false);
          setShowConfigModal(true);
        }}
        simulatedDates={simulatedDates}
      />
      
      {/* Stretch Config Modal */}
      <StretchConfigModal
        visible={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onConfirm={(config) => {
          setShowConfigModal(false);
          handleSingleDaySimulation(config);
        }}
        title="Configure Stretch Routine"
      />
      
      {/* Batch Config Modal */}
      <StretchConfigModal
        visible={showBatchConfigModal}
        onClose={() => setShowBatchConfigModal(false)}
        onConfirm={(config) => {
          setShowBatchConfigModal(false);
          handleBatchSimulation(config);
        }}
        title="Configure 7-Day Simulation"
        isBatchMode={true}
      />
      
      {/* Confirmation Modal */}
      {simulationResult && (
        <ConfirmationModal
          visible={showConfirmationModal}
          onClose={() => setShowConfirmationModal(false)}
          result={simulationResult}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  resetButton: {
    padding: 8,
  },
  card: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  instructionsText: {
    padding: 16,
    paddingTop: 8,
    lineHeight: 20,
    fontSize: 14,
  },
  stepsContainer: {
    padding: 16,
    paddingTop: 0,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepText: {
    fontSize: 14,
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    paddingBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  progressBarContainer: {
    padding: 16,
    paddingTop: 8,
  },
  progressLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 12,
    textAlign: 'right',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 8,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 8,
  },
  resetButtonStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 8,
  },
  resetButtonText: {
    fontWeight: '600',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
  },
  datesContainer: {
    maxHeight: 200,
    padding: 16,
  },
  dateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateText: {
    marginLeft: 8,
    fontSize: 14,
  },
  moreDatesText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  statsCard: {
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    padding: 16,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  scenarioCard: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    padding: 16,
  },
  scenarioCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
    paddingBottom: 12,
  },
  scenarioCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  scenarioSetupContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  scenarioSetupLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  scenarioSetupText: {
    fontSize: 15,
    lineHeight: 22,
  },
  verificationLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  verificationText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
  scenarioFooter: {
    marginTop: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingBottom: 8,
  },
  scenarioFooterText: {
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default BobSimulatorScreen; 