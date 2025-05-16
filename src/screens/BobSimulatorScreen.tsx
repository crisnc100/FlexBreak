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
  StatsCard,
  SimulatedDatesCard,
  WelcomeCard,
  NoticeCard,
  ScenarioCard,
  SimulationActions,
  LoadingOverlay
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

// Define the StretchConfig and SimulationResult types since we're not exporting them anymore
interface StretchConfig {
  bodyArea: string;
  position?: string;
  difficulty?: string;
  duration: number;
}

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
  completedChallenges: Array<{title: string, xp: number}>;
  achievements: Array<{title: string}>;
  isBatchMode?: boolean;
  daysSimulated?: number;
}

const BobSimulatorScreen = ({ navigation, route }: { navigation: any, route: any }) => {
  const { theme, isDark } = useTheme();
  
  // Check if coming from testing flow or settings
  const fromTesting = route.params?.fromTesting === true;
  const fromSettings = route.params?.fromSettings === true;
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
  
  // Authentication state - always authenticated when coming from settings
  const [isAuthenticated, setIsAuthenticated] = useState(
    (fromTesting && testingAccessGranted) || fromSettings
  );
  const [showAuthModal, setShowAuthModal] = useState(
    !((fromTesting && testingAccessGranted) || fromSettings)
  );
  
  // Add new state variables for improved simulation
  const [lastBatchEndDate, setLastBatchEndDate] = useState<Date | null>(null);
  const [consecutiveDaysCount, setConsecutiveDaysCount] = useState<number>(0);
  const [batchSimulationDateRange, setBatchSimulationDateRange] = useState<string>('');
  const [simulate7DaysDateRange, setSimulate7DaysDateRange] = useState<string>('');
  const [simulate3DaysDateRange, setSimulate3DaysDateRange] = useState<string>('');
  const [isSimulationRunning, setIsSimulationRunning] = useState<boolean>(false);
  const [simulationAbortController, setSimulationAbortController] = useState<AbortController | null>(null);
  
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
  
  // Activity log
  const [activityLog, setActivityLog] = useState<string[]>([]);
  
  // Add new state variables after the existing loading state variables
  const [showScenarioOptions, setShowScenarioOptions] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  
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
      
      // Reset initialized state to allow retry
      setIsInitialized(false);
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
  
  // Calculate and update the date ranges when needed
  useEffect(() => {
    updateDateRanges();
  }, [lastBatchEndDate, consecutiveDaysCount]);

  // Function to update date ranges for display in buttons
  const updateDateRanges = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let start7Day: Date;
    let end7Day: Date;
    let start3Day: Date;
    let end3Day: Date;
    
    // Calculate dates for 7-day simulation
    if (lastBatchEndDate && consecutiveDaysCount > 0) {
      end7Day = new Date(lastBatchEndDate);
      end7Day.setDate(end7Day.getDate() - 1);
      
      start7Day = new Date(end7Day);
      start7Day.setDate(start7Day.getDate() - 6);
    } else {
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      start7Day = sevenDaysAgo;
      end7Day = new Date(today);
      end7Day.setDate(end7Day.getDate() - 1);
    }
    
    // Calculate dates for 3-day simulation
    if (lastBatchEndDate && consecutiveDaysCount > 0) {
      end3Day = new Date(lastBatchEndDate);
      end3Day.setDate(end3Day.getDate() - 1);
      
      start3Day = new Date(end3Day);
      start3Day.setDate(start3Day.getDate() - 2);
    } else {
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      start3Day = threeDaysAgo;
      end3Day = new Date(today);
      end3Day.setDate(end3Day.getDate() - 1);
    }
    
    setSimulate7DaysDateRange(`${start7Day.toLocaleDateString()} - ${end7Day.toLocaleDateString()}`);
    setSimulate3DaysDateRange(`${start3Day.toLocaleDateString()} - ${end3Day.toLocaleDateString()}`);
  };

  // Handle simulation actions
  const onSimulate7Days = () => {
    // Calculate the date range for simulation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate: Date;
    let endDate: Date;
    
    // Calculate dates based on consecutive days and last batch end date
    if (lastBatchEndDate && consecutiveDaysCount > 0) {
      // Step 1: Set the end date to the day before the last end date
      endDate = new Date(lastBatchEndDate);
      endDate.setDate(endDate.getDate() - 1);
      
      // Step 2: Calculate start date by going back 6 more days (for 7 total)
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 6);
    } else {
      // First time batch simulation - use 7 days before today
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      startDate = sevenDaysAgo;
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() - 1); // End at yesterday
    }
    
    const dateRange = `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
    setBatchSimulationDateRange(dateRange);
    setSelectedScenario('7day');
    setShowBatchConfigModal(true);
  };

  const onSimulate3Days = () => {
    // Calculate the date range for simulation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate: Date;
    let endDate: Date;
    
    // Calculate dates based on consecutive days and last batch end date
    if (lastBatchEndDate && consecutiveDaysCount > 0) {
      // Step 1: Set the end date to the day before the last end date
      endDate = new Date(lastBatchEndDate);
      endDate.setDate(endDate.getDate() - 1);
      
      // Step 2: Calculate start date by going back 2 more days (for 3 total)
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 2);
    } else {
      // First time simulation - use 3 days before today
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      
      startDate = threeDaysAgo;
      endDate = new Date(today);
      endDate.setDate(endDate.getDate() - 1); // End at yesterday
    }
    
    const dateRange = `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
    setBatchSimulationDateRange(dateRange);
    setSelectedScenario('3day');
    setShowBatchConfigModal(true);
  };
  
  // Add a function to cancel ongoing simulations
  const cancelOngoingSimulations = () => {
    if (isSimulationRunning && simulationAbortController) {
      logWithTimestamp('Cancelling ongoing simulation');
      simulationAbortController.abort();
      setSimulationAbortController(null);
    }
    
    // Always make sure date is restored
    restoreOriginalDate();
  };
  
  // Handle batch simulation for 7 consecutive days
  const handleBatchSimulation = async (config: StretchConfig, signal?: AbortSignal): Promise<void> => {
    const batchStartTime = Date.now();
    setIsLoading(true);
    
    // Always ensure Date is restored at the beginning
    restoreOriginalDate();
    
    // Log that we're starting batch simulation
    logWithTimestamp('Starting batch simulation');
    logWithTimestamp(`Config: ${JSON.stringify(config)}`);
    
    try {
      // Check if aborted
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      
      // First get user progress for comparison
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
      
      // Set up batch simulation
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate the date range to simulate
      let startDate: Date;
      let endDate: Date;
      
      // Calculate dates based on consecutive days and last batch end date
      if (lastBatchEndDate && consecutiveDaysCount > 0) {
        logWithTimestamp(`Continuing from previous batch. Last end date: ${lastBatchEndDate.toLocaleDateString()}, consecutive days: ${consecutiveDaysCount}`);
        
        // Step 1: Set the end date to the day before the last end date
        endDate = new Date(lastBatchEndDate);
        endDate.setDate(endDate.getDate() - 1);
        
        // Step 2: Calculate start date by going back 6 more days (for 7 total)
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 6);
        
        logWithTimestamp(`Continuing batch simulation from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
      } else {
        // First time batch simulation - use 7 days before today
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        startDate = sevenDaysAgo;
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() - 1); // End at yesterday
        
        logWithTimestamp(`First batch simulation, date range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
      }
      
      // Count days in the batch
      const daysToSimulate = Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      logWithTimestamp(`Days to simulate: ${daysToSimulate}`);
      
      // Array to hold dates we simulated
      const simulatedDateStrings: string[] = [];
      
      // Setup progress tracking
      let totalXpGained = 0;
      let finalLevel = 1;
      let finalXp = 0;
      let finalPercentToNextLevel = 0;
      let finalStreak = 0;
      let completedChallenges: Array<{title: string, xp: number}> = [];
      let achievements: Array<{title: string}> = [];
      
      // Simulate each day
      for (let i = 0; i < daysToSimulate; i++) {
        // Check if aborted
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        
        logWithTimestamp(`Simulating day ${i+1}/${daysToSimulate}: ${currentDate.toLocaleDateString()}`);
        
        // Patch date
        try {
          const originalDate = Date;
          
          // @ts-ignore
          global.OriginalDate = originalDate;
          
          // @ts-ignore
          global.Date = class extends originalDate {
            constructor() {
              if (arguments.length === 0) {
                super(currentDate.getTime());
              } else {
                // @ts-ignore
                super(...arguments);
              }
            }
          };
          
          // @ts-ignore
          global.Date.now = () => currentDate.getTime();
          
        } catch (error) {
          logWithTimestamp(`Error patching date: ${error}`);
          continue; // Skip this day but try to continue batch
        }
        
        // Process routine for this day
        try {
          // Create basic routine object
      const routine = {
            id: `batch-stretch-${Date.now()}-${i}`,
        date: new Date().toISOString(),
        duration: config.duration.toString() as any,
        area: config.bodyArea as any,
        difficulty: config.difficulty as any,
            stretches: ["Batch Simulation Stretch"],
        status: "completed"
      } as any;
      
          // Process with limited timeout
          const result = await Promise.race([
            gamificationManager.processCompletedRoutine(routine),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Processing timeout')), 1500))
          ]) as any;
          
          // Add to simulated dates
          const dateStr = currentDate.toISOString().split('T')[0];
          simulatedDateStrings.push(dateStr);
          
          logWithTimestamp(`Day ${i+1} simulation successful`);
        } catch (error) {
          logWithTimestamp(`Error processing day ${i+1}: ${error}`);
          // Continue batch despite errors
        } finally {
          // Restore date after each day to prevent memory leaks
          try {
            // @ts-ignore
            if (global.OriginalDate) {
              // @ts-ignore
              global.Date = global.OriginalDate;
              // @ts-ignore
              global.OriginalDate = undefined;
            }
          } catch (dateRestoreError) {
            logWithTimestamp(`Error restoring date: ${dateRestoreError}`);
          }
        }
        
        // Brief pause between days to let system process
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Get final progress
      logWithTimestamp('Getting final progress after batch');
      let finalProgress;
      try {
        finalProgress = await Promise.race([
          storageService.getUserProgress(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
        ]) as any;
        
        totalXpGained = (finalProgress.totalXP || 0) - (initialProgress.totalXP || 0);
        finalLevel = finalProgress.level || 1;
        finalXp = finalProgress.totalXP || 0;
        finalPercentToNextLevel = finalProgress.percentToNextLevel || 0;
        finalStreak = finalProgress.statistics?.currentStreak || 0;
        
        logWithTimestamp(`Total XP gained in batch: ${totalXpGained}`);
        logWithTimestamp(`Final level: ${finalLevel}, Streak: ${finalStreak}`);
      } catch (error) {
        logWithTimestamp(`Error getting final progress: ${error}`);
        totalXpGained = 0;
        finalLevel = 1;
        finalXp = 0;
        finalPercentToNextLevel = 0;
        finalStreak = 0;
      }
      
      // Update state for next batch
      setLastBatchEndDate(startDate);
      setConsecutiveDaysCount(consecutiveDaysCount + daysToSimulate);
      
      // Add simulated dates to state
      setSimulatedDates(prev => [...prev, ...simulatedDateStrings]);
      
      // Create simulation result
      const batchResult: SimulationResult = {
        date: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
        bodyArea: config.bodyArea,
        difficulty: config.difficulty,
        duration: config.duration,
        xpEarned: totalXpGained,
        totalXp: finalXp,
        level: finalLevel,
        percentToNextLevel: finalPercentToNextLevel,
        streakDays: finalStreak,
        completedChallenges: completedChallenges,
        achievements: achievements,
        isBatchMode: true,
        daysSimulated: daysToSimulate
      };
      
      // Show confirmation
      setSimulationResult(batchResult);
      setShowConfirmationModal(true);
      
      // Refresh stats in background
      refreshBobStats().catch(error => {
        logWithTimestamp(`Error refreshing stats: ${error}`);
      });
      
      logWithTimestamp(`Batch simulation completed in ${Date.now() - batchStartTime}ms`);
      return Promise.resolve();
      
    } catch (error) {
      logWithTimestamp(`Error in batch simulation: ${error}`);
      
      // Special handling for abort errors
      if (error.name === 'AbortError') {
        logWithTimestamp('Batch simulation was aborted');
      } else {
        console.error('Error in batch simulation:', error);
        Alert.alert('Simulation Error', 'An error occurred during batch simulation.');
      }
      
      // Ensure date is restored in case of error
      restoreOriginalDate();
      
      return Promise.reject(error);
    } finally {
      // Final date restoration and cleanup
      restoreOriginalDate();
      
      // Don't set loading state here - do it in the calling function's finally block
    }
  };
  
  // Handle 3-day simulation
  const handle3DaySimulation = async (config: StretchConfig, signal?: AbortSignal): Promise<void> => {
    const batchStartTime = Date.now();
    setIsLoading(true);
    
    // Always ensure Date is restored at the beginning
    restoreOriginalDate();
    
    // Log that we're starting 3-day simulation
    logWithTimestamp('Starting 3-day simulation');
    logWithTimestamp(`Config: ${JSON.stringify(config)}`);
    
    try {
      // Check if aborted
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      
      // First get user progress for comparison with shorter timeout
      logWithTimestamp('Getting initial user progress');
      let initialProgress;
      try {
        initialProgress = await Promise.race([
          storageService.getUserProgress(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
        ]) as any;
        
        logWithTimestamp(`Initial XP: ${initialProgress.totalXP || 0}`);
      } catch (error) {
        logWithTimestamp(`Error getting initial progress: ${error}`);
        initialProgress = { totalXP: 0, statistics: { currentStreak: 0 } };
      }
      
      // Set up batch simulation
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Calculate the date range to simulate
      let startDate: Date;
      let endDate: Date;
      
      // Calculate dates based on consecutive days and last batch end date
      if (lastBatchEndDate && consecutiveDaysCount > 0) {
        logWithTimestamp(`Continuing from previous batch. Last end date: ${lastBatchEndDate.toLocaleDateString()}, consecutive days: ${consecutiveDaysCount}`);
        
        // Step 1: Set the end date to the day before the last end date
        endDate = new Date(lastBatchEndDate);
        endDate.setDate(endDate.getDate() - 1);
      
        // Step 2: Calculate start date by going back 2 more days (for 3 total)
      startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 2);
        
        logWithTimestamp(`Continuing 3-day simulation from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
      } else {
        // First time simulation - use 3 days before today
        const threeDaysAgo = new Date(today);
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        
        startDate = threeDaysAgo;
        endDate = new Date(today);
        endDate.setDate(endDate.getDate() - 1); // End at yesterday
        
        logWithTimestamp(`First 3-day simulation, date range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
      }
      
      // Count days in the batch
      const daysToSimulate = Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
      logWithTimestamp(`Days to simulate: ${daysToSimulate}`);
      
      // Array to hold dates we simulated
      const simulatedDateStrings: string[] = [];
      
      // Setup progress tracking
      let totalXpGained = 0;
      let finalLevel = 1;
      let finalXp = 0;
      let finalPercentToNextLevel = 0;
      let finalStreak = 0;
      let completedChallenges: Array<{title: string, xp: number}> = [];
      let achievements: Array<{title: string}> = [];
      
      // Simulate each day
      for (let i = 0; i < daysToSimulate; i++) {
        // Check if aborted
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        
        // Always ensure Date is restored between days
        restoreOriginalDate();
        
        const currentDate = new Date(startDate);
        currentDate.setDate(currentDate.getDate() + i);
        
        logWithTimestamp(`Simulating day ${i+1}/${daysToSimulate}: ${currentDate.toLocaleDateString()}`);
        
        // Patch date
        try {
        patchDateForSimulation(currentDate);
        
          // Process routine for this day
          try {
            // Create basic routine object with more unique ID to prevent conflicts
      const routine = {
              id: `3day-stretch-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        date: new Date().toISOString(),
          duration: config.duration.toString() as any,
          area: config.bodyArea as any,
          difficulty: config.difficulty as any,
              stretches: ["3-Day Simulation Stretch"],
        status: "completed"
        } as any;
      
            // Process with limited timeout (shorter than 7-day simulation)
            const result = await Promise.race([
              gamificationManager.processCompletedRoutine(routine),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Processing timeout')), 1000))
            ]) as any;
            
            // Add to simulated dates
            const dateStr = currentDate.toISOString().split('T')[0];
            simulatedDateStrings.push(dateStr);
            
            logWithTimestamp(`Day ${i+1} simulation successful`);
          } catch (error) {
            logWithTimestamp(`Error processing day ${i+1}: ${error}`);
            // Continue batch despite errors
          }
        } catch (error) {
          logWithTimestamp(`Error patching date for day ${i+1}: ${error}`);
        } finally {
          // Ensure date is ALWAYS restored after each day
          restoreOriginalDate();
          
          // Brief pause between days to let system process (slightly longer than 7-day)
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Get final progress with shorter timeout
      logWithTimestamp('Getting final progress after 3-day simulation');
      let finalProgress;
      try {
        finalProgress = await Promise.race([
          storageService.getUserProgress(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 2000))
        ]) as any;
        
        totalXpGained = (finalProgress.totalXP || 0) - (initialProgress.totalXP || 0);
        finalLevel = finalProgress.level || 1;
        finalXp = finalProgress.totalXP || 0;
        finalPercentToNextLevel = finalProgress.percentToNextLevel || 0;
        finalStreak = finalProgress.statistics?.currentStreak || 0;
        
        logWithTimestamp(`Total XP gained in 3-day batch: ${totalXpGained}`);
        logWithTimestamp(`Final level: ${finalLevel}, Streak: ${finalStreak}`);
      } catch (error) {
        logWithTimestamp(`Error getting final progress: ${error}`);
        totalXpGained = 0;
        finalLevel = 1;
        finalXp = 0;
        finalPercentToNextLevel = 0;
        finalStreak = 0;
      }
      
      // Ensure date is restored one more time before updating state
      restoreOriginalDate();
      
      // Update state for next batch
      setLastBatchEndDate(startDate);
      setConsecutiveDaysCount(consecutiveDaysCount + daysToSimulate);
      
      // Add simulated dates to state
      setSimulatedDates(prev => [...prev, ...simulatedDateStrings]);
      
      // Create simulation result
      const batchResult: SimulationResult = {
        date: `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`,
        bodyArea: config.bodyArea,
        difficulty: config.difficulty,
        duration: config.duration,
        xpEarned: totalXpGained,
        totalXp: finalXp,
        level: finalLevel,
        percentToNextLevel: finalPercentToNextLevel,
        streakDays: finalStreak,
        completedChallenges: completedChallenges,
        achievements: achievements,
        isBatchMode: true,
        daysSimulated: daysToSimulate
      };
      
      // Show confirmation
      setSimulationResult(batchResult);
      
      // Use setTimeout to ensure UI is not blocked
      setTimeout(() => {
      setShowConfirmationModal(true);
        
        // Refresh stats in background with error handling
        refreshBobStats().catch(error => {
          logWithTimestamp(`Error refreshing stats: ${error}`);
        });
      }, 100);
      
      logWithTimestamp(`3-day simulation completed in ${Date.now() - batchStartTime}ms`);
      return Promise.resolve();
      
    } catch (error) {
      logWithTimestamp(`Error in 3-day simulation: ${error}`);
      
      // Special handling for abort errors
      if (error.name === 'AbortError') {
        logWithTimestamp('3-day simulation was aborted');
      } else {
        console.error('Error in 3-day simulation:', error);
        Alert.alert('Simulation Error', 'An error occurred during simulation.');
      }
      
      // Ensure date is restored in case of error
      restoreOriginalDate();
      
      return Promise.reject(error);
    } finally {
      // Final date restoration and cleanup
      restoreOriginalDate();
      
      // Don't set loading state here - do it in the calling function's finally block
    }
  };
  
  // Handle streak freeze tests
  const handleStreakFreezeTest = async (testId: string): Promise<void> => {
    logWithTimestamp(`Starting streak freeze test ${testId}`);
    setIsLoading(true);
    
    try {
      // First, reset simulation data to start fresh
      await resetSimulationData();
      logWithTimestamp('Reset simulation data for streak freeze test');
      addLog(`Reset data for streak freeze test ${testId}`);
      
      // Set XP to 1800 to reach Level 6 (when streak freeze unlocks)
      let progress = await storageService.getUserProgress();
      progress.totalXP = 1800;
      progress.level = 6; // Ensure level is set correctly
      await storageService.saveUserProgress(progress);
      logWithTimestamp('Set XP to 1800 (Level 6) for streak freeze test');
      addLog(`Set XP to 1800 (Level 6) for streak freeze test`);
      
      // Number of days to simulate a streak
      const streakDays = 14;
      
      // Calculate the gap based on test ID
      const gapDays = testId === '4.1' ? 1 : 2;
      
      // Calculate start date: streakDays + gapDays before today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // End date is gapDays+1 days ago (day before the gap)
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() - (gapDays + 1));
      
      // Start date is streakDays before end date
      const startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - (streakDays - 1));
      
      logWithTimestamp(`Streak freeze test ${testId}: simulating from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()} with ${gapDays}-day gap`);
      addLog(`Starting streak simulation for ${streakDays} days ending ${gapDays} days ago`);
      
      // Default config for all simulated days
      const config = {
        bodyArea: 'Full Body',
        difficulty: 'Intermediate',
        duration: 10
      } as StretchConfig;
      
      // Simulate each day in the streak
      let currentDate = new Date(startDate);
      let dayCount = 0;
      const batchDates: string[] = [];
      
      while (currentDate <= endDate) {
        dayCount++;
        logWithTimestamp(`Processing streak day ${dayCount} of ${streakDays}: ${currentDate.toLocaleDateString()}`);
        
        // Restore the original date between iterations
        restoreOriginalDate();
        
        try {
          // Patch date for simulation
          patchDateForSimulation(currentDate);
          
          // Create routine for this day
          const routine = {
            id: `streak-test-${testId}-${Date.now()}-${currentDate.getTime()}`,
            date: new Date().toISOString(),
            duration: config.duration.toString() as any,
            area: config.bodyArea as any,
            difficulty: config.difficulty as any,
            stretches: [`Streak Test ${testId} Day ${dayCount}`],
            status: "completed"
          } as any;
        
          // Process the routine
          logWithTimestamp(`Processing streak routine for ${currentDate.toLocaleDateString()}`);
          await Promise.race([
            gamificationManager.processCompletedRoutine(routine),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Routine processing timeout')), 10000)
            )
          ]);
          
          // Add date to batch
          batchDates.push(currentDate.toISOString());
          
    } catch (error) {
          logWithTimestamp(`Error processing streak day ${dayCount}: ${error}`);
          addLog(`⚠️ Error on streak day ${dayCount}: ${currentDate.toLocaleDateString()}`);
        } finally {
          // Always restore date before moving to next day
          restoreOriginalDate();
          
          // Move to next day
          currentDate = new Date(currentDate);
          currentDate.setDate(currentDate.getDate() + 1);
          
          // Add a small delay between days
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      // Restore the original Date
      restoreOriginalDate();
      
      // Update simulated dates
      setSimulatedDates(prev => [...prev, ...batchDates]);
      
      // Refresh stats
      await refreshBobStats();
      
      // Get streak status
      const finalProgress = await storageService.getUserProgress();
      const currentStreak = finalProgress.statistics?.currentStreak || 0;
      
      // Add a summary message based on the test
      if (testId === '4.1') {
        addLog(`✅ Streak Freeze Test 4.1 (1-day gap) completed`);
        addLog(`Current streak is ${currentStreak}. Check if streak freeze option is available in Progress tab.`);
        Alert.alert(
          'Streak Freeze Test 4.1 Complete',
          `Set up a ${streakDays}-day streak ending 2 days ago with 1-day gap (yesterday).\n\nCurrent streak: ${currentStreak}\n\nNow:\n1. Close the simulator\n2. Restart the app\n3. Go to Progress tab\n4. Check if streak freeze option is available\n5. Apply streak freeze\n6. Verify streak is restored +1 day.`,
          [{ text: 'OK', style: 'default' }]
        );
      } else { // 4.2
        addLog(`✅ Streak Freeze Test 4.2 (2-day gap) completed`);
        addLog(`Current streak is ${currentStreak}. Check that streak freeze option is NOT available in Progress tab.`);
        Alert.alert(
          'Streak Freeze Test 4.2 Complete',
          `Set up a ${streakDays}-day streak ending 3 days ago with 2-day gap (yesterday and day before).\n\nCurrent streak: ${currentStreak}\n\nNow:\n1. Close the simulator\n2. Restart the app\n3. Go to Progress tab\n4. Verify streak freeze option is NOT available\n5. Confirm streak has reset (should be 0).`,
          [{ text: 'OK', style: 'default' }]
        );
      }
      
      return Promise.resolve();
    } catch (error) {
      logWithTimestamp(`Error in streak freeze test ${testId}: ${error}`);
      console.error(`Error in streak freeze test ${testId}:`, error);
      Alert.alert('Streak Freeze Test Error', 'An error occurred during the streak freeze test setup.');
      
      // Ensure we restore the original Date object
      restoreOriginalDate();
      return Promise.reject(error);
    } finally {
      setIsLoading(false);
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
  
 
  
  
  // Also update the renderBobStats function to include additional stats
  const renderBobStats = () => {
    if (!bobProgress) return null;
    return <StatsCard stats={stats} bobProgress={bobProgress} />;
  };
  
  // Add a special check to log navigation params for debugging
  useEffect(() => {
    logWithTimestamp(`Bob Simulator screen mounted, from testing: ${fromTesting}, from settings: ${fromSettings}`);
    logWithTimestamp(`Navigation params: ${JSON.stringify(route?.params)}`);
    
    // Reset initialization state when screen is mounted to ensure proper setup
    if (fromSettings) {
      setIsInitialized(false);
    }
    
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
              console.log("[BobSimulator] Back button pressed, fromTesting:", fromTesting, "fromSettings:", fromSettings);
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
              } else if (fromSettings) {
                // When coming from settings, reset to MainTabs
                console.log("[BobSimulator] Returning to MainTabs from settings");
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'MainTabs' }],
                  })
                );
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
            <LoadingOverlay isLoading={isLoading} />
          ) : (
            <>
              <NoticeCard />
              
              <ScenarioCard scenarioInstructions={scenarioInstructions} />
              
              <WelcomeCard />
              
              {renderBobStats()}
              
              <SimulationActions
                onSimulate7Days={onSimulate7Days}
                onSimulate3Days={onSimulate3Days}
                onStreakFreezeTest={handleStreakFreezeTest}
                onReset={handleReset}
                scenarioId={scenarioInstructions?.id}
                simulate7DaysDateRange={simulate7DaysDateRange}
                simulate3DaysDateRange={simulate3DaysDateRange}
              />
              
              {simulatedDates.length > 0 && (
                <SimulatedDatesCard dates={simulatedDates} />
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
          
        }}
        title="Configure Stretch Routine"
      />
      
      {/* Batch Config Modal */}
      <StretchConfigModal
        visible={showBatchConfigModal}
        onClose={() => {
          cancelOngoingSimulations();
          setShowBatchConfigModal(false);
          setSelectedScenario(null); // Reset selected scenario when closing
        }}
        onConfirm={(config) => {
          // Safety check - don't allow starting if already loading
          if (isLoading) {
            return;
          }
          
          // Cancel any ongoing simulations
          cancelOngoingSimulations();
          
          // Immediately close modal and show loading state
          setShowBatchConfigModal(false);
          setIsLoading(true);
          
          // Create new abort controller for this simulation
          const abortController = new AbortController();
          setSimulationAbortController(abortController);
          setIsSimulationRunning(true);
          
          // Add a small delay to let the UI update before starting the heavy computation
          setTimeout(() => {
            // Check which scenario was selected
            if (selectedScenario === '3day') {
              handle3DaySimulation(config, abortController.signal)
                .catch((error) => {
                  if (error.name === 'AbortError') {
                    logWithTimestamp('3-day simulation was cancelled');
                  } else {
                    console.error('Error in 3-day simulation:', error);
                    Alert.alert('3-Day Simulation Error', 'The simulation process failed. Please try again with different settings.');
                  }
                })
                .finally(() => {
                  setIsLoading(false);
                  setIsSimulationRunning(false);
                  setSimulationAbortController(null);
                  restoreOriginalDate();
                });
            } else {
              // Default to 7-day simulation
              handleBatchSimulation(config, abortController.signal)
                .catch((error) => {
                  if (error.name === 'AbortError') {
                    logWithTimestamp('7-day simulation was cancelled');
                  } else {
                    console.error('Error in batch simulation:', error);
                    Alert.alert('Batch Simulation Error', 'The batch simulation process failed. Please try again with different settings or fewer days.');
                  }
                })
                .finally(() => {
                  setIsLoading(false);
                  setIsSimulationRunning(false);
                  setSimulationAbortController(null);
                  restoreOriginalDate();
                });
            }
            // Reset selected scenario after starting
            setSelectedScenario(null);
          }, 100);
        }}
        title={selectedScenario === '3day' 
          ? `Configure 3-Day Simulation (${batchSimulationDateRange})` 
          : `Configure 7-Day Simulation (${batchSimulationDateRange})`}
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
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
  }
});

export default BobSimulatorScreen; 