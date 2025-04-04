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
  Modal
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

const BobSimulatorScreen = ({ navigation }: { navigation: any }) => {
  const { theme, isDark } = useTheme();
  
  // Bob's user progress
  const [bobProgress, setBobProgress] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Simulation date and time
  const [currentDate, setCurrentDate] = useState<Date>(() => {
    // Get the actual current date instead of a hardcoded date
    const today = new Date();
    console.log(`Initial simulation date set to today: ${today.toISOString()}`);
    return today;
  });
  const [selectedDuration, setSelectedDuration] = useState(10);
  
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
  
  // Initialize Bob's progress
  useEffect(() => {
    initializeBob();
  }, []);
  
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
      
      // Override Date for simulation
      patchDateForSimulation(currentDate);
      
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
  
  // Add a method to make handleNextDay also check for challenge cycles
  const handleNextDay = async () => {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + 1);
    setCurrentDate(nextDate);
    
    // Update the simulated date
    patchDateForSimulation(nextDate);
    
    // Get the current state before the day change
    const prevDateString = currentDate.toISOString().split('T')[0];
    
    // Log the change
    addLog(`Advanced to ${nextDate.toLocaleDateString()}`);
    
    // Check for day/week/month transitions to refresh challenges
    try {
      setIsLoading(true);
      
      const newDateString = nextDate.toISOString().split('T')[0];
      const progress = await storageService.getUserProgress();
      
      // Check for day change
      if (prevDateString !== newDateString) {
        // Update the streak info in the progress statistics
        if (progress.statistics) {
          // Only update streak info if there's an actual streak to track
          if (progress.statistics.totalRoutines > 0) {
            // Check if there was an activity in the previous day (to maintain streak)
            const hadActivityYesterday = await hadActivityOnDate(prevDateString, progress);
            
            if (hadActivityYesterday) {
              // Maintain streak
              addLog(`🔥 Streak maintained: ${progress.statistics.currentStreak} day(s)`);
            } else {
              // Reset streak
              progress.statistics.currentStreak = 0;
              addLog(`❄️ Streak reset: No activity on ${prevDateString}`);
            }
            
            // Update the last updated date
            progress.statistics.lastUpdated = new Date().toISOString();
            
            // Save the updated statistics
            await storageService.saveUserProgress(progress);
          }
        }
        
        // Check if a new week started (Monday = 1)
        const isNewWeek = 
          (currentDate.getDay() !== 1 && nextDate.getDay() === 1) || 
          (nextDate.getDate() === 1 && nextDate.getDay() === 1);
          
        // Check if a new month started
        const isNewMonth = currentDate.getMonth() !== nextDate.getMonth();
        
        // Always check for challenges updates on day change
        const completedChallenges = await challengeManager.updateUserChallenges(progress);
        
        // Log completed challenges
        if (completedChallenges.length > 0) {
          addLog(`Completed ${completedChallenges.length} challenges with the day change`);
          completedChallenges.forEach(challenge => {
            addLog(`  ✅ Completed: ${challenge.title}`);
          });
        }
        
        if (isNewWeek) {
          addLog(`📅 New week started. Weekly challenges updated.`);
          // Weekly challenges are handled by updateUserChallenges
        }
        
        if (isNewMonth) {
          addLog(`📅 New month started. Monthly challenges updated.`);
          // Monthly challenges are handled by updateUserChallenges
        }
        
        // Save updated progress
        await storageService.saveUserProgress(progress);
        
        // Update stats
        await refreshBobStats();
      }
    } catch (error) {
      console.error('Error handling day change:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper to check if there was activity on a specific date
  const hadActivityOnDate = async (dateString: string, progress: any): Promise<boolean> => {
    try {
      // Get all routines from storage
      const allEntries = await storageService.getAllRoutines();
      
      // Find any entry with that date
      return allEntries.some(entry => {
        const entryDate = new Date(entry.date);
        const entryDateStr = entryDate.toISOString().split('T')[0];
        return entryDateStr === dateString;
      });
    } catch (error) {
      console.error('Error checking for activity on date:', error);
      return false;
    }
  };
  
  // Debug streak calculation for more insight
  const debugStreakCalculation = async () => {
    try {
      const allRoutines = await storageService.getAllRoutines();
      console.log(`DEBUG STREAK: Found ${allRoutines.length} total routines`);
      
      // Group routines by date
      const routinesByDate: Record<string, any[]> = {};
      allRoutines.forEach(routine => {
        const date = new Date(routine.date);
        const dateStr = date.toISOString().split('T')[0];
        if (!routinesByDate[dateStr]) {
          routinesByDate[dateStr] = [];
        }
        routinesByDate[dateStr].push(routine);
      });
      
      // Log the dates with routines
      const dates = Object.keys(routinesByDate);
      console.log(`DEBUG STREAK: Routines found on ${dates.length} distinct dates:`, dates);
      
      if (dates.length === 0) {
        console.log("DEBUG STREAK: No routines, streak should be 0");
        return;
      }
      
      // Sort dates in descending order (newest first)
      dates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
      console.log(`DEBUG STREAK: Most recent date with activity: ${dates[0]}`);
      
      // Get today's date
      const today = new Date().toISOString().split('T')[0];
      console.log(`DEBUG STREAK: Today's date: ${today}`);
      
      // Check if today has activity
      const hasTodayActivity = dates.includes(today);
      console.log(`DEBUG STREAK: Activity today? ${hasTodayActivity}`);
      
      // If no activity today, streak should be 0 unless yesterday had activity
      if (!hasTodayActivity) {
        console.log("DEBUG STREAK: No activity today, streak calculation requires yesterday's activity");
        return;
      }
      
      // Calculate the streak
      let streak = 1; // Start with 1 for today
      let currentDate = new Date(today);
      
      while (true) {
        // Move to previous day
        currentDate.setDate(currentDate.getDate() - 1);
        const prevDateStr = currentDate.toISOString().split('T')[0];
        
        // Check if previous day has activity
        if (dates.includes(prevDateStr)) {
          streak++;
          console.log(`DEBUG STREAK: Found activity on ${prevDateStr}, streak = ${streak}`);
        } else {
          console.log(`DEBUG STREAK: No activity on ${prevDateStr}, streak ends`);
          break;
        }
      }
      
      console.log(`DEBUG STREAK: Final calculated streak: ${streak}`);
      
      // Compare with stored streak value
      const progress = await storageService.getUserProgress();
      console.log(`DEBUG STREAK: Stored streak value: ${progress.statistics.currentStreak}`);
      
      if (progress.statistics.currentStreak !== streak) {
        console.log(`DEBUG STREAK: Mismatch between calculated (${streak}) and stored (${progress.statistics.currentStreak}) streak values!`);
      }
    } catch (error) {
      console.error('Error in debug streak calculation:', error);
    }
  };
  
  // Jump to a specific date
  const handleJumpToDate = (days: number) => {
    const jumpDate = new Date(currentDate);
    jumpDate.setDate(jumpDate.getDate() + days);
    setCurrentDate(jumpDate);
    
    // Update the simulated date
    patchDateForSimulation(jumpDate);
    
    addLog(`Jumped ${days} days to ${jumpDate.toLocaleDateString()}`);
  };
  
  // Add a stretch for Bob
  const handleAddStretch = async () => {
    if (!isInitialized || isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Debug streak before adding
      console.log("Checking streak before adding stretch:");
      await debugStreakCalculation();
      
      // Get current user progress first to check current state
      const userProgress = await storageService.getUserProgress();
      const initialRoutineCount = userProgress.statistics?.totalRoutines || 0;
      const initialXP = userProgress.totalXP || 0;
      
      // Log the starting state
      console.log(`Before adding stretch - Routine count: ${initialRoutineCount}, XP: ${initialXP}, Streak: ${userProgress.statistics?.currentStreak || 0}`);
      
      // Clear storage caches to ensure fresh data
      cacheUtils.invalidateRoutineCache();
      
      // Create the routine with type assertions for type safety
      const routine = {
        id: `bob-stretch-${Date.now()}`,
        date: new Date().toISOString(),
        duration: selectedDuration.toString() as any, // Cast to any to bypass Duration type check
        area: selectedArea as any, // Cast to any to bypass BodyArea type check
        difficulty: selectedDifficulty as any, // Add difficulty
        stretches: ["Neck Rotation", "Chin Tucks"],
        status: "completed"
      } as any; // Final cast to ProgressEntry
      
      // Debug the date to confirm it's correct
      const routineDate = new Date(routine.date);
      console.log(`Created routine with date: ${routine.date}`);
      console.log(`Parsed routine date: ${routineDate.toLocaleDateString()}, current sim date: ${currentDate.toLocaleDateString()}`);
      
      // Log the stretch
      addLog(`${BOB_NAME} completed a ${selectedDuration}-minute ${selectedDifficulty} ${selectedArea} stretch on ${routineDate.toLocaleDateString()}`);
      
      // Calculate expected XP
      const expectedXP = XP_RATES[selectedDuration as keyof typeof XP_RATES] || 0;
      const isFirstStretch = initialRoutineCount === 0;
      const expectedTotalXP = expectedXP + (isFirstStretch ? WELCOME_BONUS : 0);
      
      if (isFirstStretch) {
        addLog(`First stretch ever! ${WELCOME_BONUS} XP welcome bonus will be applied`);
        addLog(`Expected base XP: ${expectedXP} + ${WELCOME_BONUS} welcome bonus = ${expectedTotalXP} XP`);
      } else {
        addLog(`Expected base XP: ${expectedXP} XP`);
      }
      
      // Process the routine
      console.log(`Processing routine: ${routine.id} (${routine.duration} minutes, ${routine.area})`);
      const result = await gamificationManager.processCompletedRoutine(routine);
      console.log(`Routine processed. Result:`, result);
      
      // Log the actual XP after processing
      const currentProgress = await storageService.getUserProgress();
      const xpGained = currentProgress.totalXP - initialXP;
      console.log(`XP gained after routine processing: ${xpGained} (from ${initialXP} to ${currentProgress.totalXP})`);
      
      // Log XP breakdown in detail
      if (result.xpBreakdown) {
        const xpBreakdown = Array.isArray(result.xpBreakdown) ? 
          result.xpBreakdown : 
          (typeof result.xpBreakdown === 'object' ? [result.xpBreakdown] : []);
          
        addLog(`XP Breakdown from routine:`);
        xpBreakdown.forEach((item: any) => {
          if (item && typeof item === 'object') {
            addLog(`  - ${item.description || 'Unknown'}: ${item.amount || 0} XP`);
          }
        });
        
        // Calculate total from breakdown if available
        const totalXp = xpBreakdown.reduce((sum: number, item: any) => 
          sum + (item && typeof item === 'object' ? (item.amount || 0) : 0), 0);
          
        addLog(`Total XP earned from routine: ${totalXp}`);
      }
      
      // Process any completed challenges immediately after the routine
      let totalChallengeXP = 0;
      const completedChallenges = result.completedChallenges || [];
      
      if (completedChallenges.length > 0) {
        addLog(`Completed ${completedChallenges.length} challenges!`);
        
        // Explicitly claim each challenge to ensure XP is awarded
        for (const challenge of completedChallenges) {
          console.log(`Claiming challenge: ${challenge.id} - ${challenge.title} (+${challenge.xp} XP)`);
          const claimResult = await gamificationManager.claimChallenge(challenge.id);
          
          if (claimResult.success) {
            addLog(`💰 Claimed: ${challenge.title} (+${challenge.xp} XP)`);
            totalChallengeXP += challenge.xp;
          } else {
            addLog(`❌ Failed to claim: ${challenge.title} - ${claimResult.message}`);
          }
        }
        
        // Log total XP from challenges
        if (totalChallengeXP > 0) {
          addLog(`Total XP from challenges: ${totalChallengeXP}`);
        }
      } else {
        console.log(`No completed challenges found after processing routine`);
        
        // Force check for challenges that might be completed now
        const progress = await storageService.getUserProgress();
        const additionalChallenges = await challengeManager.updateUserChallenges(progress);
        
        if (additionalChallenges.length > 0) {
          addLog(`Found ${additionalChallenges.length} additional completed challenges!`);
          
          // Claim each additional challenge
          for (const challenge of additionalChallenges) {
            console.log(`Claiming additional challenge: ${challenge.id} - ${challenge.title} (+${challenge.xp} XP)`);
            const claimResult = await gamificationManager.claimChallenge(challenge.id);
            
            if (claimResult.success) {
              addLog(`💰 Claimed: ${challenge.title} (+${challenge.xp} XP)`);
              totalChallengeXP += challenge.xp;
            }
          }
        }
      }
      
      // Get final progress after all operations
      const finalProgress = await storageService.getUserProgress();
      const totalXpAfterAll = finalProgress.totalXP;
      const totalXpGained = totalXpAfterAll - initialXP;
      
      addLog(`Total XP gained: ${totalXpGained} (Routine: ${xpGained}, Challenges: ${totalChallengeXP})`);
      
      // Refresh stats after the stretch and challenges
      await refreshBobStats();
      
      // Get level info for logging
      const levelInfo = await gamificationManager.getUserLevelInfo();
      
      // Check for level up
      if (levelInfo.level > userProgress.level) {
        addLog(`🎉 LEVEL UP! ${BOB_NAME} reached level ${levelInfo.level}!`);
        
        // Check for newly unlocked rewards
        const allRewards = await rewardManager.getAllRewards();
        const newRewards = allRewards.filter(r => 
          r.unlocked && r.levelRequired === levelInfo.level
        );
        
        if (newRewards.length > 0) {
          newRewards.forEach(reward => {
            addLog(`🎁 New reward unlocked: ${reward.title}`);
          });
        }
      }
      
      // Verify the routine count after adding
      const finalRoutineCount = finalProgress.statistics?.totalRoutines || 0;
      console.log(`After adding stretch - Routine count: ${finalRoutineCount}, XP: ${finalProgress.totalXP}, Streak: ${finalProgress.statistics?.currentStreak || 0}`);
      
      if (finalRoutineCount !== initialRoutineCount + 1) {
        addLog(`⚠️ Warning: Routine count incorrect! Expected ${initialRoutineCount + 1}, got ${finalRoutineCount}`);
        
        // Force fix the routine count if it's incorrect
        finalProgress.statistics.totalRoutines = initialRoutineCount + 1;
        await storageService.saveUserProgress(finalProgress);
        addLog(`✅ Fixed routine count to ${initialRoutineCount + 1}`);
      }
      
      // Check for newly completed achievements
      const achievements = Object.values(finalProgress.achievements || {});
      const newlyCompleted = achievements.filter(a => 
        a.completed && a.dateCompleted === new Date().toISOString().split('T')[0]
      );
      
      if (newlyCompleted.length > 0) {
        newlyCompleted.forEach(achievement => {
          addLog(`🏆 Achievement unlocked: ${achievement.title}`);
        });
      }
      
      // Log summary of the current state
      addLog(`Summary: Level ${levelInfo.level}, XP: ${levelInfo.totalXP}, Routines: ${finalRoutineCount}, Streak: ${finalProgress.statistics?.currentStreak || 0}`);
      
      // After all processing
      console.log("Checking streak after adding stretch:");
      await debugStreakCalculation();
    } catch (error) {
      console.error('Error adding stretch:', error);
      Alert.alert('Error', 'Failed to add stretch');
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
            setActivityLog([]);
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
            styles.progressBar, 
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
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border, backgroundColor: theme.cardBackground }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{BOB_NAME} Simulator</Text>
        <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
          <Ionicons name="refresh" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>
      
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Date & Controls */}
        <View style={[styles.dateControlsContainer, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.currentDate, { color: theme.text }]}>
            Current Date: {currentDate.toLocaleDateString()}
          </Text>
          
          <View style={styles.controlsRow}>
            <TouchableOpacity 
              style={[styles.controlButton, { backgroundColor: isDark ? '#2D2D2D' : '#f0f0f0' }]}
              onPress={handlePreviousDay}
              disabled={isLoading}
            >
              <Ionicons name="chevron-back" size={24} color={theme.accent} />
              <Text style={[styles.controlButtonText, { color: theme.text }]}>Previous Day</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, { backgroundColor: isDark ? '#2D2D2D' : '#f0f0f0' }]}
              onPress={handleNextDay}
              disabled={isLoading}
            >
              <Text style={[styles.controlButtonText, { color: theme.text }]}>Next Day</Text>
              <Ionicons name="chevron-forward" size={24} color={theme.accent} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.jumpControlsRow}>
            <TouchableOpacity 
              style={[styles.jumpButton, { backgroundColor: isDark ? '#2D2D2D' : '#f0f0f0' }]}
              onPress={() => handleJumpToDate(-7)}
              disabled={isLoading}
            >
              <Text style={[styles.jumpButtonText, { color: theme.text }]}>-7 Days</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.jumpButton, { backgroundColor: isDark ? '#2D2D2D' : '#f0f0f0' }]}
              onPress={() => handleJumpToDate(-30)}
              disabled={isLoading}
            >
              <Text style={[styles.jumpButtonText, { color: theme.text }]}>-30 Days</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.jumpButton, { backgroundColor: isDark ? '#2D2D2D' : '#f0f0f0' }]}
              onPress={() => handleJumpToDate(7)}
              disabled={isLoading}
            >
              <Text style={[styles.jumpButtonText, { color: theme.text }]}>+7 Days</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.jumpButton, { backgroundColor: isDark ? '#2D2D2D' : '#f0f0f0' }]}
              onPress={() => handleJumpToDate(30)}
              disabled={isLoading}
            >
              <Text style={[styles.jumpButtonText, { color: theme.text }]}>+30 Days</Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Bob's Stats */}
        {renderBobStats()}
        
        {/* Game Data Controls */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Game Data</Text>
          <View style={styles.gameDataRow}>
            <TouchableOpacity 
              style={[styles.gameDataButton, { backgroundColor: isDark ? '#2D2D2D' : '#E8F5E9' }]}
              onPress={handleShowChallenges}
            >
              <Ionicons name="trophy-outline" size={20} color="#4CAF50" />
              <Text style={[styles.gameDataButtonText, { color: isDark ? '#81C784' : '#2E7D32' }]}>
                View Challenges
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.gameDataButton, { backgroundColor: isDark ? '#2D2D2D' : '#E8F5E9' }]}
              onPress={handleShowRewards}
            >
              <Ionicons name="gift-outline" size={20} color="#4CAF50" />
              <Text style={[styles.gameDataButtonText, { color: isDark ? '#81C784' : '#2E7D32' }]}>
                View Rewards
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.gameDataButton, { backgroundColor: isDark ? '#2D2D2D' : '#E8F5E9' }]}
              onPress={handleShowAchievements}
            >
              <Ionicons name="ribbon-outline" size={20} color="#4CAF50" />
              <Text style={[styles.gameDataButtonText, { color: isDark ? '#81C784' : '#2E7D32' }]}>
                View Achievements
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Add Stretch Section */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Add a Stretch</Text>
          
          <Text style={[styles.durationLabel, { color: theme.textSecondary }]}>
            Body Area:
          </Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.areaScrollView}>
            <View style={styles.areaButtonsRow}>
              {BODY_AREAS.map(area => (
                <TouchableOpacity 
                  key={area}
                  style={[
                    styles.areaButton, 
                    selectedArea === area ? 
                      { backgroundColor: theme.accent } : 
                      { backgroundColor: isDark ? '#2D2D2D' : '#f0f0f0' }
                  ]}
                  onPress={() => setSelectedArea(area)}
                >
                  <Text 
                    style={[
                      styles.areaButtonText, 
                      { color: selectedArea === area ? '#FFF' : theme.text }
                    ]}
                  >
                    {area}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          
          <Text style={[styles.durationLabel, { color: theme.textSecondary }]}>
            Difficulty:
          </Text>
          
          <View style={styles.difficultyButtonsRow}>
            {DIFFICULTY_LEVELS.map(difficulty => (
              <TouchableOpacity 
                key={difficulty}
                style={[
                  styles.difficultyButton, 
                  selectedDifficulty === difficulty ? 
                    { backgroundColor: theme.accent } : 
                    { backgroundColor: isDark ? '#2D2D2D' : '#f0f0f0' }
                ]}
                onPress={() => setSelectedDifficulty(difficulty)}
              >
                <Text 
                  style={[
                    styles.difficultyButtonText, 
                    { color: selectedDifficulty === difficulty ? '#FFF' : theme.text }
                  ]}
                >
                  {difficulty}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <Text style={[styles.durationLabel, { color: theme.textSecondary }]}>
            Duration (minutes):
          </Text>
          
          <View style={styles.durationButtonsRow}>
            {DURATIONS.map(duration => (
              <TouchableOpacity 
                key={duration}
                style={[
                  styles.durationButton, 
                  selectedDuration === duration ? 
                    { backgroundColor: theme.accent } : 
                    { backgroundColor: isDark ? '#2D2D2D' : '#f0f0f0' }
                ]}
                onPress={() => setSelectedDuration(duration)}
              >
                <Text 
                  style={[
                    styles.durationButtonText, 
                    { color: selectedDuration === duration ? '#FFF' : theme.text }
                  ]}
                >
                  {duration} min ({XP_RATES[duration as keyof typeof XP_RATES]} XP)
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <TouchableOpacity 
            style={[
              styles.addStretchButton, 
              isLoading ? styles.disabledButton : { backgroundColor: theme.accent }
            ]}
            onPress={handleAddStretch}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name="fitness" size={20} color="#FFF" />
                <Text style={styles.addStretchButtonText}>Add Stretch for {BOB_NAME}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Activity Log */}
        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.logHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Activity Log</Text>
            
            <TouchableOpacity 
              style={styles.clearButton}
              onPress={() => setActivityLog([])}
              disabled={isLoading}
            >
              <Text style={[styles.clearButtonText, { color: theme.accent }]}>Clear</Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.logContainer, { backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5' }]}>
            {activityLog.length === 0 ? (
              <Text style={[styles.emptyLogText, { color: theme.textSecondary }]}>
                No activity yet. Start by adding a stretch!
              </Text>
            ) : (
              activityLog.map((log, index) => (
                <Text 
                  key={index} 
                  style={[
                    styles.logText, 
                    { 
                      color: log.includes('LEVEL UP') || log.includes('unlocked') ? 
                        '#4CAF50' : theme.text 
                    }
                  ]}
                >
                  {log}
                </Text>
              ))
            )}
          </View>
        </View>
        
        {/* Details Modal */}
        <Modal
          visible={detailsModal.visible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setDetailsModal({...detailsModal, visible: false})}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{detailsModal.title}</Text>
                <TouchableOpacity 
                  onPress={() => setDetailsModal({...detailsModal, visible: false})}
                  style={styles.modalCloseButton}
                >
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalScrollView}>
                {detailsModal.content.map((item, index) => (
                  <View key={index} style={styles.modalItem}>
                    <Text style={[styles.modalItemTitle, { color: theme.text }]}>{item.title}</Text>
                    <Text style={[styles.modalItemDescription, { color: theme.textSecondary }]}>
                      {item.description}
                    </Text>
                    {item.progress && (
                      <Text 
                        style={[
                          styles.modalItemProgress, 
                          { 
                            color: item.progress.includes('COMPLETED') || 
                                  item.progress.includes('UNLOCKED') ? 
                              '#4CAF50' : theme.accent 
                          }
                        ]}
                      >
                        {item.progress}
                      </Text>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
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
  backButton: {
    padding: 8,
  },
  resetButton: {
    padding: 8,
  },
  section: {
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
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 16,
    paddingBottom: 8,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingBottom: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 16,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  controlButtonText: {
    marginLeft: 8,
    fontWeight: '500',
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
  levelProgressContainer: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  levelProgressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  levelProgressLabel: {
    fontSize: 14,
  },
  levelProgressValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
  },
  gameDataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  gameDataButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  gameDataButtonText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '500',
  },
  durationLabel: {
    fontSize: 14,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  durationButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  durationButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  durationButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  addStretchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#999',
  },
  addStretchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 16,
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    fontSize: 14,
  },
  logContainer: {
    margin: 16,
    marginTop: 0,
    padding: 12,
    borderRadius: 8,
    maxHeight: 300,
  },
  emptyLogText: {
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 16,
  },
  logText: {
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
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
  modalCloseButton: {
    padding: 4,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  modalItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  modalItemDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  modalItemProgress: {
    fontSize: 14,
    fontWeight: '500',
  },
  areaScrollView: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  areaButtonsRow: {
    flexDirection: 'row',
    paddingRight: 16, // extra space for scroll
  },
  areaButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  areaButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  difficultyButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  difficultyButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  difficultyButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  dateControlsContainer: {
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
  currentDate: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingBottom: 16,
  },
  jumpControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingBottom: 16,
  },
  jumpButton: {
    padding: 8,
    borderRadius: 20,
  },
  jumpButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
});

export default BobSimulatorScreen; 