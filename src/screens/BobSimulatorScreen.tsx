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
import { resetSimulationData } from '../services/storageService';
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
        const testingAccess = await AsyncStorage.getItem('@flexbreak:bob_simulator_access');
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
          const storedScenario = await AsyncStorage.getItem('@flexbreak:simulator_scenario');
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
  
  
  // Initialize Bob's progress when authenticated
  useEffect(() => {
    if (isAuthenticated && !isInitialized) {
      logWithTimestamp('Authentication confirmed, initializing Bob');
      initializeBob();
    }
  }, [isAuthenticated, isInitialized]);
  
  // Add comprehensive logging
  const logWithTimestamp = (message: string) => {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0]; // HH:MM:SS format
    console.log(`[BobSim ${timestamp}] ${message}`);
  };
  
  // Add log entry with current date
  const addLog = (message: string) => {
    logWithTimestamp(message);
    const dateStr = currentDate.toLocaleDateString();
    setActivityLog(prev => [`[${dateStr}] ${message}`, ...prev]);
  };
  
  // Initialize Bob with fresh progress
  const initializeBob = async () => {
    const initStartTime = Date.now();
    logWithTimestamp('Starting initializeBob');
    setIsLoading(true);
    
    try {
      // Clear any existing routines in storage first to ensure clean start
      logWithTimestamp('Clearing existing routines before initialization');
      await storageService.clearRoutines();
      
      // Create a fresh progress for Bob
      logWithTimestamp('Creating fresh progress for Bob');
      const freshProgress = await gamificationManager.initializeUserProgress();
      
      // Ensure statistics are properly reset to 0
      logWithTimestamp('Resetting statistics to 0');
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
      logWithTimestamp('Setting initial XP and level values');
      freshProgress.totalXP = 0;
      freshProgress.level = 1;
      freshProgress.hasReceivedWelcomeBonus = false;
      
      // Override Date for simulation if a specific date is selected
      if (selectedDate) {
        logWithTimestamp(`Selected date exists, patching Date for simulation: ${selectedDate.toLocaleDateString()}`);
        patchDateForSimulation(selectedDate);
      }
      
      // Save fresh progress
      logWithTimestamp('Saving fresh progress to storage');
      await storageService.saveUserProgress(freshProgress);

      // Verify storage is empty
      logWithTimestamp('Verifying routine storage is empty');
      const routineCheck1 = await storageService.getAllRoutines();
      logWithTimestamp(`After progress reset - routine count: ${routineCheck1.length}`);
      if (routineCheck1.length > 0) {
        logWithTimestamp(`WARNING: Routines still exist after reset! Count: ${routineCheck1.length}`);
        await storageService.clearRoutines();
      }

      // Initialize and refresh challenges explicitly
      logWithTimestamp('Initializing and refreshing challenges');
      const refreshStartTime = Date.now();
      await challengeManager.refreshChallenges(freshProgress);
      logWithTimestamp(`Challenges refreshed in ${Date.now() - refreshStartTime}ms`);
      
      // After refreshing in initialization, also call updateUserChallenges
      logWithTimestamp('Checking for initially completed challenges');
      const updateChallengesStartTime = Date.now();
      const initialCompletedChallenges = await challengeManager.updateUserChallenges(freshProgress);
      logWithTimestamp(`Challenge update completed in ${Date.now() - updateChallengesStartTime}ms`);
      
      if (initialCompletedChallenges.length > 0) {
        logWithTimestamp(`Found ${initialCompletedChallenges.length} completed challenges during initialization`);
        addLog(`Found ${initialCompletedChallenges.length} completed challenges on first setup`);
      } else {
        logWithTimestamp('No initially completed challenges found');
      }
      
      // Always check for challenges updates on day change
      logWithTimestamp('Checking for challenges with user progress');
      const progress = await storageService.getUserProgress();
      const completedChallenges = await challengeManager.updateUserChallenges(progress);
      if (completedChallenges.length > 0) {
        logWithTimestamp(`Found ${completedChallenges.length} challenges completed during day change`);
        addLog(`Completed ${completedChallenges.length} challenges with the day change`);
        completedChallenges.forEach(challenge => {
          logWithTimestamp(`Challenge completed: ${challenge.id} - ${challenge.title}`);
          addLog(`  ✅ Completed: ${challenge.title}`);
        });
      } else {
        logWithTimestamp('No challenges completed during day change');
      }
      
      // Update Bob's data
      logWithTimestamp('Refreshing Bob stats after initialization');
      await refreshBobStats();
      
      // Force one more refresh to ensure everything is in sync
      logWithTimestamp('Performing final sync of user progress');
      const currentProgress = await storageService.getUserProgress();
      logWithTimestamp('Ensuring core challenge count');
      await challengeManager.ensureChallengeCount(currentProgress, CORE_CHALLENGES);
      logWithTimestamp('Saving final user progress');
      await storageService.saveUserProgress(currentProgress);
      
      // Verify Bob starts with 0 routines
      logWithTimestamp('Verifying final statistics');
      const finalStats = await storageService.getUserProgress();
      logWithTimestamp(`Bob initialized with stats: Total routines: ${finalStats.statistics.totalRoutines}, XP: ${finalStats.totalXP}, Streak: ${finalStats.statistics.currentStreak}`);
      addLog(`Bob has ${finalStats.statistics.totalRoutines} routines to start`);
      
      // Verify routines storage
      logWithTimestamp('Final routine storage verification');
      const routineCheck2 = await storageService.getAllRoutines();
      logWithTimestamp(`Final routine check - count in storage: ${routineCheck2.length}`);
      
      if (finalStats.statistics.totalRoutines !== 0 || routineCheck2.length !== 0) {
        logWithTimestamp(`ERROR: Bob's routine count is not 0 after initialization! Stats show ${finalStats.statistics.totalRoutines}, storage has ${routineCheck2.length}`);
        finalStats.statistics.totalRoutines = 0;
        await storageService.saveUserProgress(finalStats);
        await storageService.clearRoutines();
        addLog("⚠️ Forced routine count to 0");
      }
      
      logWithTimestamp('Setting isInitialized to true');
      setIsInitialized(true);
      addLog(`Initialized ${BOB_NAME}'s progress on ${currentDate.toLocaleDateString()}`);
      addLog(`Daily, weekly, and monthly challenges are now active`);
      logWithTimestamp(`Initialization complete in ${Date.now() - initStartTime}ms`);
    } catch (error) {
      logWithTimestamp(`Error initializing Bob: ${error}`);
      console.error('Error initializing Bob:', error);
      Alert.alert('Error', 'Failed to initialize simulation');
    } finally {
      logWithTimestamp('Setting isLoading to false after initialization');
      setIsLoading(false);
    }
  };
  
  // Date patching for simulation
  const patchDateForSimulation = (targetDate: Date) => {
    logWithTimestamp(`Patching Date for simulation: ${targetDate.toISOString()}`);
    
    try {
      // First, make sure any previous patch is cleaned up
      restoreOriginalDate();
      
      // Store the original date
      const originalDate = Date;
      const targetTime = targetDate.getTime();
      logWithTimestamp(`Target time: ${targetTime}`);
      
      // @ts-ignore - hack for simulation
      global.OriginalDate = originalDate;
      logWithTimestamp('Original Date stored in global.OriginalDate');
      
      // Override the Date constructor
      // @ts-ignore - hack for simulation
      global.Date = class extends originalDate {
        constructor() {
          if (arguments.length === 0) {
            super(targetTime);
            // Only log occasionally to avoid flooding
            if (Math.random() < 0.01) {
              logWithTimestamp(`New Date() created (sampled log): ${super.toString()}`);
            }
          } else {
            // @ts-ignore - we need to pass through arguments
            super(...arguments);
          }
        }
      };
      
      // Copy all properties and methods from the original Date
      Object.getOwnPropertyNames(originalDate).forEach(prop => {
        // @ts-ignore - hack for simulation
        if (prop !== 'prototype' && prop !== 'length' && prop !== 'name') {
          // @ts-ignore - hack for simulation
          global.Date[prop] = originalDate[prop];
        }
      });

      // Copy now method explicitly
      // @ts-ignore - hack for simulation
      global.Date.now = () => targetTime;
      
      // Set the current date for the component
      setCurrentDate(new Date(targetTime));
      
      // Verify the patch
      const newDate = new Date();
      logWithTimestamp(`Verification - new Date(): ${newDate.toISOString()}`);
      logWithTimestamp(`Verification - Date.now(): ${Date.now()}`);
      
      addLog(`Simulation date set to: ${newDate.toLocaleDateString()}`);
      return true;
    } catch (error) {
      logWithTimestamp(`Error patching Date: ${error}`);
      console.error('Error patching Date:', error);
      
      // Try to restore original date in case of error
      try {
        // @ts-ignore - hack for simulation
        if (global.OriginalDate) {
          // @ts-ignore - hack for simulation
          global.Date = global.OriginalDate;
          // @ts-ignore - hack for simulation
          global.OriginalDate = undefined;
          logWithTimestamp('Restored original Date after patching error');
        }
      } catch (restoreError) {
        logWithTimestamp(`Error restoring Date after patch error: ${restoreError}`);
      }
      
      return false;
    }
  };

  // Restore original Date after simulation
  const restoreOriginalDate = () => {
    logWithTimestamp('Attempting to restore original Date');
    try {
      // @ts-ignore - hack for simulation
      if (global.OriginalDate) {
        // @ts-ignore - hack for simulation
        global.Date = global.OriginalDate;
        // @ts-ignore - hack for simulation
        global.OriginalDate = undefined;
        logWithTimestamp('Original Date successfully restored');
        
        // Verify the restoration
        const nowTime = Date.now();
        const currentTime = new Date();
        logWithTimestamp(`Verification after restore - Date.now(): ${nowTime}`);
        logWithTimestamp(`Verification after restore - new Date(): ${currentTime.toISOString()}`);
        
        addLog(`Restored to current date: ${currentTime.toLocaleDateString()}`);
        return true;
      } else {
        logWithTimestamp('No original Date found to restore');
        return false;
      }
    } catch (error) {
      logWithTimestamp(`Error restoring original Date: ${error}`);
      console.error('Error restoring original Date:', error);
      return false;
    }
  };
  
  // Refresh Bob's stats
  const refreshBobStats = async () => {
    const startTime = Date.now();
    logWithTimestamp('Starting refreshBobStats');
    
    try {
      // Get the latest progress
      logWithTimestamp('Fetching latest user progress');
      const progress = await storageService.getUserProgress();
      setBobProgress(progress);
      
      // Get latest routines
      logWithTimestamp('Fetching all routines');
      const fetchStartTime = Date.now();
      const routines = await storageService.getAllRoutines();
      logWithTimestamp(`Fetched ${routines.length} routines in ${Date.now() - fetchStartTime}ms`);
      
      // Calculate level info
      logWithTimestamp('Calculating level info');
      const levelInfo = await gamificationManager.getUserLevelInfo();
      
      // Update state with level and streak info
      logWithTimestamp('Setting stats from progress data');
      setStats({
        level: levelInfo.level,
        totalXP: levelInfo.totalXP,
        xpToNextLevel: levelInfo.xpToNextLevel || 0,
        percentToNextLevel: levelInfo.percentToNextLevel,
        currentStreak: progress.statistics?.currentStreak || 0
      });
      
      // Calculate today's routines
      const todayRoutines = routines.filter(r => {
        const routineDate = new Date(r.date);
        const today = new Date();
        return (
          routineDate.getDate() === today.getDate() &&
          routineDate.getMonth() === today.getMonth() &&
          routineDate.getFullYear() === today.getFullYear()
        );
      }).length;
      
      logWithTimestamp(`Today's routines: ${todayRoutines}, Total routines: ${routines.length}`);
      logWithTimestamp(`User level: ${levelInfo.level}, XP: ${levelInfo.totalXP}, Streak: ${progress.statistics?.currentStreak || 0}`);
      
      // Challenges and achievements stats would be added here if those APIs existed
      
      logWithTimestamp(`refreshBobStats completed in ${Date.now() - startTime}ms`);
      return progress;
    } catch (error) {
      logWithTimestamp(`Error in refreshBobStats: ${error}`);
      console.error('Error refreshing Bob stats:', error);
      throw error;
    }
  };
  
  // Handle simulation for a single day - MINIMAL VERSION
  const handleSingleDaySimulation = async (config: StretchConfig, simulationDate?: Date): Promise<void> => {
    const simulationStartTime = Date.now();
    logWithTimestamp('Starting MINIMAL handleSingleDaySimulation');
    logWithTimestamp(`Config: ${JSON.stringify(config)}`);
    
    // Use either the passed date or the selected date from state
    const dateToSimulate = simulationDate || selectedDate;
    logWithTimestamp(`Date to simulate: ${dateToSimulate?.toLocaleDateString() || 'NONE'}`);
    
    if (!dateToSimulate) {
      logWithTimestamp('Error: No date selected for simulation');
      Alert.alert('Error', 'No date selected for simulation');
      setIsLoading(false);
      return Promise.reject(new Error('No date selected'));
    }
    
    // Emergency abort timeout
    const safetyTimeoutId = setTimeout(() => {
      logWithTimestamp('SAFETY TIMEOUT: Simulation taking too long, forcing cleanup');
      restoreOriginalDate();
      setIsLoading(false);
      Alert.alert('Simulation Error', 'The simulation was taking too long and was automatically cancelled.');
    }, 20000);
    
    try {
      // Simplified approach that follows the batch simulation pattern
      logWithTimestamp('Starting minimal simulation approach');
      
      // First get initial progress for comparison
      logWithTimestamp('Getting initial user progress');
      let initialProgress;
      try {
        initialProgress = await Promise.race([
          storageService.getUserProgress(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]) as any;
        
        logWithTimestamp(`Initial XP: ${initialProgress.totalXP || 0}`);
      } catch (error) {
        logWithTimestamp(`Error getting initial progress: ${error}`);
        initialProgress = { totalXP: 0, statistics: { currentStreak: 0 } };
      }
      
      // Patch date for simulation
      logWithTimestamp('Patching date for simulation');
      const patchResult = patchDateForSimulation(dateToSimulate);
      if (!patchResult) {
        throw new Error('Failed to patch date for simulation');
      }
      
      // Create basic routine object
      const routine = {
        id: `minimal-stretch-${Date.now()}`,
        date: new Date().toISOString(),
        duration: config.duration.toString() as any,
        area: config.bodyArea as any,
        difficulty: config.difficulty as any,
        stretches: ["Minimal Simulation Stretch"],
        status: "completed"
      } as any;
      
      // Process the routine with short timeout
      logWithTimestamp('Processing routine with limited processing');
      try {
        const result = await Promise.race([
          gamificationManager.processCompletedRoutine(routine),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Routine processing timeout')), 5000))
        ]) as any;
        
        logWithTimestamp('Routine processed successfully');
        
        // Don't process challenges - skip this step which may be causing the freeze
        logWithTimestamp('Skipping detailed challenge processing to prevent freezing');
      } catch (error) {
        logWithTimestamp(`Error processing routine: ${error}`);
        // Continue despite error
      }
      
      // Add the simulation date
      const dateStr = dateToSimulate.toISOString();
      logWithTimestamp(`Adding date to simulated dates: ${dateStr}`);
      setSimulatedDates(prev => [...prev, dateStr]);
      
      // Store for quick simulation
      logWithTimestamp('Storing config for quick simulation');
      setLastConfig(config);
      setLastSimulatedDate(dateToSimulate);
      
      // Get final progress
      logWithTimestamp('Getting final progress');
      let finalProgress;
      try {
        finalProgress = await Promise.race([
          storageService.getUserProgress(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Final progress timeout')), 3000))
        ]) as any;
      } catch (error) {
        logWithTimestamp(`Error getting final progress: ${error}`);
        finalProgress = initialProgress;
      }
      
      // Calculate XP gained
      const xpGained = (finalProgress.totalXP || 0) - (initialProgress.totalXP || 0);
      logWithTimestamp(`XP gained: ${xpGained}`);
      
      // Refresh stats (non-blocking)
      logWithTimestamp('Refreshing stats (non-blocking)');
      refreshBobStats().catch(error => {
        logWithTimestamp(`Error refreshing stats: ${error}`);
      });
      
      // Create minimal simulation result
      const simulationResult: SimulationResult = {
        date: dateStr,
        bodyArea: config.bodyArea,
        difficulty: config.difficulty,
        duration: config.duration,
        xpEarned: xpGained,
        totalXp: finalProgress.totalXP || 0,
        level: finalProgress.level || 1,
        percentToNextLevel: 0,
        streakDays: finalProgress.statistics?.currentStreak || 0,
        completedChallenges: [],
        achievements: []
      };
      
      // Show confirmation
      logWithTimestamp('Showing simulation result');
      setSimulationResult(simulationResult);
      setShowConfirmationModal(true);
      
      // Reset selected date
      if (!simulationDate) {
        setSelectedDate(null);
      }
      
      logWithTimestamp(`Minimal simulation completed in ${Date.now() - simulationStartTime}ms`);
      return Promise.resolve();
      
    } catch (error) {
      logWithTimestamp(`Error in minimal simulation: ${error}`);
      console.error('Error in minimal simulation:', error);
      Alert.alert('Simulation Error', 'An error occurred during simulation. Please try again.');
      return Promise.reject(error);
    } finally {
      // Always clean up
      clearTimeout(safetyTimeoutId);
      restoreOriginalDate();
      setIsLoading(false);
      logWithTimestamp('Simulation cleanup completed');
    }
  };
  
  // Handle quick simulation of the previous day
  const handleQuickSimulation = () => {
    logWithTimestamp('Quick simulation button pressed');
    
    if (!lastSimulatedDate || !lastConfig) {
      logWithTimestamp('No previous simulation data available for quick simulation');
      Alert.alert('Error', 'No previous simulation data available');
      return;
    }
    
    // Safety check - don't allow starting if already loading
    if (isLoading) {
      logWithTimestamp('Already loading, ignoring quick simulation request');
      return;
    }
    
    // Immediately show loading state
    logWithTimestamp('Setting loading state for quick simulation');
    setIsLoading(true);
    
    // Calculate the previous day
    const previousDay = new Date(lastSimulatedDate);
    previousDay.setDate(previousDay.getDate() - 1);
    logWithTimestamp(`Quick simulation target date: ${previousDay.toLocaleDateString()}`);
    
    // Add a small delay to let the UI update before starting the heavy computation
    logWithTimestamp('Adding delay before starting quick simulation');
    setTimeout(() => {
      logWithTimestamp('Starting quick simulation after delay');
      // Directly pass the date to the simulation function
      handleSingleDaySimulation(lastConfig, previousDay)
        .catch((error) => {
          logWithTimestamp(`Error in quick simulation: ${error}`);
          console.error('Error in quick simulation:', error);
          Alert.alert('Simulation Error', 'The quick simulation failed. Please try a different approach.');
          setIsLoading(false);
          restoreOriginalDate();
        });
    }, 100);
  };
  
  // Handle batch simulation for 7 consecutive days
  const handleBatchSimulation = async (config: StretchConfig): Promise<void> => {
    const batchStartTime = Date.now();
    logWithTimestamp('Starting handleBatchSimulation');
    logWithTimestamp(`Batch config: ${JSON.stringify(config)}`);
    
    // Note: We're not setting isLoading=true here anymore, because it should be set by the caller
    // This allows the UI to update before the heavy processing starts
    
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
        logWithTimestamp(`First batch simulation, end date: ${yesterday.toLocaleDateString()}`);
      } else {
        // Subsequent batches: use 7 days before the last end date
        endDate = new Date(lastBatchEndDate);
        endDate.setDate(endDate.getDate() - 1);
        logWithTimestamp(`Subsequent batch, end date: ${endDate.toLocaleDateString()}`);
      }
      
      // Start date is always 7 days before end date
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
      
      logWithTimestamp(`Batch simulation from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
      
      // Keep track of total XP earned
      let totalXpEarned = 0;
      let allCompletedChallenges: any[] = [];
      let allCompletedAchievements: any[] = [];
      
      // Get initial state for comparison - with timeout protection
      logWithTimestamp('Getting initial user progress for batch simulation');
      const initialProgressStartTime = Date.now();
      
      // Initial progress promise with 5 second timeout
      const initialProgress = await Promise.race([
        storageService.getUserProgress(),
        new Promise((_, reject) => 
          setTimeout(() => {
            const errorMsg = 'Timed out getting initial progress for batch';
            logWithTimestamp(errorMsg);
            reject(new Error(errorMsg));
          }, 5000)
        )
      ]) as any;
      
      const initialXP = initialProgress.totalXP || 0;
      logWithTimestamp(`Initial XP before batch: ${initialXP}`);
      
      // Simulate each day in the range
      const batchDates: string[] = [];
      
      // Simulate from start date to end date (inclusive)
      let currentDate = new Date(startDate);
      let dayCount = 0;
      const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      
      while (currentDate <= endDate) {
        dayCount++;
        logWithTimestamp(`Processing day ${dayCount} of ${totalDays}: ${currentDate.toLocaleDateString()}`);
        
        // Make sure we restore the original date between iterations
        logWithTimestamp('Restoring original Date before patching for next day');
        restoreOriginalDate();
        
        try {
          // Patch date for simulation
          patchDateForSimulation(currentDate);
          
          // Create routine for this day
          logWithTimestamp('Creating batch routine object');
          const routine = {
            id: `batch-stretch-${Date.now()}-${currentDate.getTime()}`,
            date: new Date().toISOString(),
            duration: config.duration.toString() as any,
            area: config.bodyArea as any,
            difficulty: config.difficulty as any,
            stretches: ["Batch Simulation Stretch"],
            status: "completed"
          } as any;
        
          // Process the routine with shorter timeout (10 seconds)
          logWithTimestamp(`Processing batch routine for ${currentDate.toLocaleDateString()}`);
          const routineProcessStartTime = Date.now();
          
          const result = await Promise.race([
            gamificationManager.processCompletedRoutine(routine),
            new Promise((_, reject) => 
              setTimeout(() => {
                const errorMsg = `Timed out processing routine for ${currentDate.toLocaleDateString()}`;
                logWithTimestamp(errorMsg);
                reject(new Error(errorMsg));
              }, 10000)
            )
          ]) as any;
          
          logWithTimestamp(`Completed batch routine processing in ${Date.now() - routineProcessStartTime}ms`);
          
          // Claim any completed challenges (if there are any)
          if (result.completedChallenges && result.completedChallenges.length > 0) {
            logWithTimestamp(`Found ${result.completedChallenges.length} completed challenges for batch day ${dayCount}`);
            for (const challenge of result.completedChallenges) {
              try {
                // Claim challenge with timeout protection (5 seconds)
                logWithTimestamp(`Claiming batch challenge: ${challenge.id} - ${challenge.title}`);
                await Promise.race([
                  gamificationManager.claimChallenge(challenge.id),
                  new Promise((_, reject) =>
                    setTimeout(() => {
                      const errorMsg = `Timed out claiming challenge ${challenge.id}`;
                      logWithTimestamp(errorMsg);
                      reject(new Error(errorMsg));
                    }, 5000)
                  )
                ]);
                
                allCompletedChallenges.push(challenge);
                logWithTimestamp(`Successfully claimed batch challenge: ${challenge.id}`);
              } catch (error) {
                logWithTimestamp(`Error claiming batch challenge ${challenge.id}: ${error}`);
                // Continue with next challenge even if this one fails
              }
            }
          }
          
          // Add date to batch
          batchDates.push(currentDate.toISOString());
          
          // Less frequent checking for additional challenges to reduce processing load
          // Only check on days 1, 4, and 7 of the batch
          if (dayCount === 1 || dayCount === 4 || dayCount === totalDays) {
            logWithTimestamp(`Checking for additional batch challenges on day ${dayCount}`);
            const additionalChallengeStartTime = Date.now();
            
            // Get progress with 5 second timeout
            const progress = await Promise.race([
              storageService.getUserProgress(),
              new Promise((_, reject) =>
                setTimeout(() => {
                  const errorMsg = 'Timed out getting user progress for challenge check';
                  logWithTimestamp(errorMsg);
                  reject(new Error(errorMsg));
                }, 5000)
              )
            ]) as any;
            
            // Update challenges with 5 second timeout
            const additionalChallenges = await Promise.race([
              challengeManager.updateUserChallenges(progress),
              new Promise((_, reject) =>
                setTimeout(() => {
                  const errorMsg = 'Timed out updating user challenges';
                  logWithTimestamp(errorMsg);
                  reject(new Error(errorMsg));
                }, 5000)
              )
            ]) as any[];
            
            logWithTimestamp(`Found ${additionalChallenges.length} additional batch challenges in ${Date.now() - additionalChallengeStartTime}ms`);
            
            if (additionalChallenges.length > 0) {
              logWithTimestamp(`Claiming ${additionalChallenges.length} additional batch challenges`);
              for (const challenge of additionalChallenges) {
                try {
                  // Claim challenge with timeout protection (5 seconds)
                  logWithTimestamp(`Claiming additional batch challenge: ${challenge.id} - ${challenge.title}`);
                  await Promise.race([
                    gamificationManager.claimChallenge(challenge.id),
                    new Promise((_, reject) =>
                      setTimeout(() => {
                        const errorMsg = `Timed out claiming additional challenge ${challenge.id}`;
                        logWithTimestamp(errorMsg);
                        reject(new Error(errorMsg));
                      }, 5000)
                    )
                  ]);
                  
                  allCompletedChallenges.push(challenge);
                  logWithTimestamp(`Successfully claimed additional batch challenge: ${challenge.id}`);
                } catch (error) {
                  logWithTimestamp(`Error claiming additional batch challenge ${challenge.id}: ${error}`);
                  // Continue with next challenge even if this one fails
                }
              }
            }
          } else {
            logWithTimestamp(`Skipping additional challenge check on day ${dayCount} to improve performance`);
          }
          
        } catch (error) {
          // Log the error but CONTINUE processing next days
          logWithTimestamp(`Error processing day ${dayCount} (${currentDate.toLocaleDateString()}): ${error}`);
          addLog(`⚠️ Error on day ${dayCount}: ${currentDate.toLocaleDateString()}`);
        } finally {
          // Always restore date before moving to next day
          logWithTimestamp(`Finished processing day ${dayCount}, restoring Date before next day`);
          restoreOriginalDate();
          
          // Move to next day
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() + 1);
          
          // Add a small delay between days to let the JS engine breathe
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      // Make sure we restore the original Date
      logWithTimestamp('All batch days processed, final Date restoration');
      restoreOriginalDate();
      
      // Store the last batch end date for subsequent simulations
      logWithTimestamp(`Setting last batch end date to ${startDate.toLocaleDateString()}`);
      setLastBatchEndDate(startDate);
      
      // Update simulated dates
      logWithTimestamp(`Adding ${batchDates.length} dates to simulated dates`);
      setSimulatedDates(prev => [...prev, ...batchDates]);
      
      // Get final state after all simulations with timeout protection
      logWithTimestamp('Refreshing final batch stats');
      const refreshStartTime = Date.now();
      
      // Refresh stats with 10 second timeout
      await Promise.race([
        refreshBobStats(),
        new Promise((_, reject) =>
          setTimeout(() => {
            const errorMsg = 'Timed out refreshing bob stats';
            logWithTimestamp(errorMsg);
            reject(new Error(errorMsg));
          }, 10000)
        )
      ]);
      
      logWithTimestamp(`Refreshed batch stats in ${Date.now() - refreshStartTime}ms`);
      
      // Get final progress with 5 second timeout
      const finalProgress = await Promise.race([
        storageService.getUserProgress(),
        new Promise((_, reject) =>
          setTimeout(() => {
            const errorMsg = 'Timed out getting final progress';
            logWithTimestamp(errorMsg);
            reject(new Error(errorMsg));
          }, 5000)
        )
      ]) as any;
      
      // Calculate total XP earned
      totalXpEarned = finalProgress.totalXP - initialXP;
      logWithTimestamp(`Batch XP gained: ${totalXpEarned} (from ${initialXP} to ${finalProgress.totalXP})`);
      
      // Simplified achievement check to improve performance
      logWithTimestamp('Checking for newly completed achievements from batch');
      const achievements = Object.values(finalProgress.achievements || {});
      allCompletedAchievements = achievements.filter((a: any) => 
        a.completed && batchDates.some(dateStr => {
          const batchDate = new Date(dateStr).toISOString().split('T')[0];
          return a.dateCompleted === batchDate;
        })
      );
      logWithTimestamp(`Found ${allCompletedAchievements.length} achievements completed during batch`);
      
      // Prepare simulation result for confirmation modal
      logWithTimestamp('Preparing batch simulation result for confirmation modal');
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
      logWithTimestamp('Showing batch confirmation modal');
      setSimulationResult(simulationResult);
      setShowConfirmationModal(true);
      logWithTimestamp(`Batch simulation completed successfully in ${Date.now() - batchStartTime}ms`);
      return Promise.resolve();
    } catch (error) {
      logWithTimestamp(`Error in batch simulation: ${error}`);
      console.error('Error in batch simulation:', error);
      Alert.alert('Batch Simulation Error', 'An error occurred during batch simulation. Some days may have been processed successfully.');
      
      // Ensure we restore the original Date object
      logWithTimestamp('Restoring Date object in batch error handler');
      restoreOriginalDate();
      return Promise.reject(error);
    } finally {
      logWithTimestamp('Setting isLoading to false in batch finally');
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
  const handleReset = async () => {
    Alert.alert(
      'Reset Simulation Data',
      'This will reset all simulation data including game progress, routines, and XP. Your testing progress, feedback, and premium status will be preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset Simulation Data', 
          style: 'destructive',
          onPress: async () => {
            const success = await resetSimulationData();
            if (success) {
              Alert.alert('Success', 'Simulation data has been reset. You can now test different scenarios with a clean state.');
              // Refresh the screen data after reset
            initializeBob();
              refreshBobStats();
            } else {
              Alert.alert('Error', 'Failed to reset simulation data. Please try again.');
            }
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
  
  // Add a special check to log navigation params for debugging
  useEffect(() => {
    logWithTimestamp(`Bob Simulator screen mounted, from testing: ${fromTesting}`);
    logWithTimestamp(`Navigation params: ${JSON.stringify(route?.params)}`);
    
    return () => {
      logWithTimestamp('Bob Simulator screen unmounting');
      // Restore original Date object if it was overridden
      if ((global as any).__originalDate) {
        global.Date = (global as any).__originalDate;
        delete (global as any).__originalDate;
        logWithTimestamp('[BobSimulator] Restored original Date object during cleanup');
      }
      
      // Clear simulator access
      AsyncStorage.removeItem('@flexbreak:bob_simulator_access');
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
                AsyncStorage.setItem('@flexbreak:reopen_settings', 'true')
                  .then(() => {
                    console.log('[BobSimulator] Set reopen_settings flag');
                  })
                  .catch(error => {
                    console.error('Error setting reopen_settings flag:', error);
                  });
                  
                // Make sure we keep our testing access
                AsyncStorage.setItem('@flexbreak:testing_access', 'true')
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
              <Text style={[styles.loadingSubText, { color: theme.textSecondary }]}>
                Please wait, this may take a few moments as we simulate your routine and process all related challenges and rewards.
              </Text>
          </View>
          ) : (
            <>
              {/* Notice about testing screens */}
              <View style={[styles.noticeCard, { backgroundColor: isDark ? 'rgba(255, 193, 7, 0.15)' : 'rgba(255, 193, 7, 0.1)' }]}>
                <Ionicons name="alert-circle-outline" size={22} color="#FFC107" style={styles.noticeIcon} />
                <Text style={[styles.noticeText, { color: isDark ? '#FFC107' : '#856404' }]}>
                  Note: These testing screens will be removed from the app at launch. Please focus your feedback on the app's main features, not these testing tools.
                </Text>
        </View>
        
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
                  <View style={styles.stepItem}>
                    <View style={[styles.stepNumber, { backgroundColor: theme.accent }]}>
                      <Text style={styles.stepNumberText}>4</Text>
                    </View>
                    <Text style={[styles.stepText, { color: theme.text }]}>
                      Once you're done, close out the app and reopen it to see the results.
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
          // Immediately close the modal and show loading indicator
          logWithTimestamp(`Date selected from modal: ${date.toLocaleDateString()}`);
          setSelectedDate(date);
          setShowDateModal(false);
          
          // Add a small delay to allow UI to update before opening the config modal
          logWithTimestamp('Adding delay before showing config modal');
          setTimeout(() => {
            logWithTimestamp('Showing config modal after delay');
            setShowConfigModal(true);
          }, 100);
        }}
        simulatedDates={simulatedDates}
      />
      
      {/* Stretch Config Modal */}
      <StretchConfigModal
        visible={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onConfirm={(config) => {
          // Safety check - don't allow starting if already loading
          logWithTimestamp(`Config confirmed: ${JSON.stringify(config)}`);
          
          if (isLoading) {
            logWithTimestamp('Already loading, ignoring config confirmation');
            return;
          }
          
          // Immediately close modal and show loading state
          logWithTimestamp('Closing config modal and setting loading state');
          setShowConfigModal(false);
          setIsLoading(true);
          
          // Add a small delay to let the UI update before starting the heavy computation
          logWithTimestamp('Adding delay before starting simulation');
          setTimeout(() => {
            logWithTimestamp('Starting simulation after delay');
            handleSingleDaySimulation(config, selectedDate)
              .catch((error) => {
                logWithTimestamp(`Error in simulation after delay: ${error}`);
                console.error('Error in simulation:', error);
                Alert.alert('Simulation Error', 'The simulation process failed. Please try again with different settings.');
                setIsLoading(false);
                restoreOriginalDate();
              });
          }, 100);
        }}
        title="Configure Stretch Routine"
      />
      
      {/* Batch Config Modal */}
      <StretchConfigModal
        visible={showBatchConfigModal}
        onClose={() => setShowBatchConfigModal(false)}
        onConfirm={(config) => {
          // Safety check - don't allow starting if already loading
          if (isLoading) {
            return;
          }
          
          // Immediately close modal and show loading state
          setShowBatchConfigModal(false);
          setIsLoading(true);
          
          // Add a small delay to let the UI update before starting the heavy computation
          setTimeout(() => {
            handleBatchSimulation(config)
              .catch((error) => {
                console.error('Error in batch simulation:', error);
                Alert.alert('Batch Simulation Error', 'The batch simulation process failed. Please try again with different settings or fewer days.');
                setIsLoading(false);
                restoreOriginalDate();
              });
          }, 100);
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
  loadingSubText: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
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
  noticeCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  noticeIcon: {
    marginRight: 12,
  },
  noticeText: {
    fontSize: 14,
    lineHeight: 20,
  },
});

export default BobSimulatorScreen; 