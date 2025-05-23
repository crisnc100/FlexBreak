import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
  StyleSheet,
  Vibration,
  Easing
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp, BodyArea, Duration, RoutineParams, Position, Stretch, RestPeriod, TransitionPeriod } from '../types';
import tips from '../data/tips';
import SubscriptionModal from '../components/SubscriptionModal';
import { tw } from '../utils/tw';
import { usePremium } from '../context/PremiumContext';
import { useRefresh } from '../context/RefreshContext';
import { RefreshableScrollView } from '../components/common';
import { useFeatureAccess } from '../hooks/progress/useFeatureAccess';
import { useTheme } from '../context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as haptics from '../utils/haptics';
import { 
  HomeHeader, 
  DailyTip, 
  SubscriptionTeaser, 
  RoutinePicker, 
  ReminderSection, 
  CustomReminderModal,
  OptionDropdown,
  TimePicker,
  DaySelector,
  LevelProgressCard,
  CustomRoutineModal,
  StreakDisplay,
  DeskBreakBoost,
  streakFlexSaveEvents,
  STREAK_FLEX_SAVE_APPLIED,
  TimeRewind,
  Vortex
} from '../components/home';
import * as notifications from '../utils/notifications';
import * as firebaseReminders from '../utils/firebaseReminders';
import { gamificationEvents, LEVEL_UP_EVENT, REWARD_UNLOCKED_EVENT, XP_UPDATED_EVENT } from '../hooks/progress/useGamification';
import * as rewardManager from '../utils/progress/modules/rewardManager';
import * as storageService from '../services/storageService';
import { generateDeskBreakBoostRoutine, isDeskBreakBoostAvailable } from '../utils/generators/deskBreakBoostGenerator';

const { height, width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const [area, setArea] = useState<BodyArea>('Hips & Legs');
  const [duration, setDuration] = useState<Duration>('5');
  const [officeFriendly, setOfficeFriendly] = useState<boolean>(false);
  const { isPremium, refreshPremiumStatus } = usePremium();
  const { isRefreshing, refreshHome } = useRefresh();
  
  // Streak state
  const [currentStreak, setCurrentStreak] = useState(0);
  
  // Reminder state
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderDays, setReminderDays] = useState<string[]>([]);
  const [reminderFrequency, setReminderFrequency] = useState<notifications.ReminderFrequency>('daily');
  const [reminderMessage, setReminderMessage] = useState('');
  
  // Modal visibility states
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [customReminderModalVisible, setCustomReminderModalVisible] = useState(false);
  const [customRoutineModalVisible, setCustomRoutineModalVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [daySelectorVisible, setDaySelectorVisible] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [dailyTip, setDailyTip] = useState(tips[0]);
  const { canAccessFeature, meetsLevelRequirement, getRequiredLevel, getUserLevel, refreshAccess } = useFeatureAccess();
  const { theme, isDark, isSunset } = useTheme();

  // Animated values for dropdowns
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Scroll position tracking
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // User level for custom reminders
  const [userLevel, setUserLevel] = useState(0);

  // TimeRewind animation state
  const [showTimeRewindEffect, setShowTimeRewindEffect] = useState(false);
  const [timeRewindElements, setTimeRewindElements] = useState<{ id: number, x: number, y: number, size: number, duration: number, delay: number, rotation: number, maxY: number }[]>([]);
  const [showVortex, setShowVortex] = useState(false);
  const backgroundFlashOpacity = useRef(new Animated.Value(0)).current;

  // Handle refresh
  const handleRefresh = async () => {
    console.log('Refreshing home screen...');

    // Get a new random tip
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    setDailyTip(randomTip);

    // Check feature access again to update UI for newly unlocked features
    const level = await getUserLevel();
    setUserLevel(level);
    
    // Load user streak data
    await loadUserStreak();
    
    // Force refresh feature access state to immediately update UI for custom reminders
    await refreshAccess(); // Explicitly refresh feature access state
    const customRemindersAccess = await rewardManager.isRewardUnlocked('custom_reminders');
    console.log('Custom reminders feature access refreshed:', customRemindersAccess);
    
    // Refresh other home data
    await refreshHome();
  };
  
  // Load user streak from storage
  const loadUserStreak = async () => {
    try {
      console.log('HomeScreen: Loading user streak...');
      const userProgress = await storageService.getUserProgress();
      if (userProgress && userProgress.statistics) {
        // Get all completed routines to calculate streak
        const allRoutines = await storageService.getAllRoutines();
        console.log(`HomeScreen: Found ${allRoutines.length} routines for streak calculation`);
        
        // Import the calculateStreak function (same one used in useProgressData)
        const { calculateStreak } = require('../utils/progress/modules/progressTracker');
        
        // Calculate streak from routines
        const calculatedStreak = calculateStreak(allRoutines);
        
        // Get the stored streak
        const storedStreak = userProgress.statistics.currentStreak || 0;
        
        console.log(`HomeScreen: Streak values - Stored: ${storedStreak}, Calculated: ${calculatedStreak}`);
        
        // Check for discrepancy
        if (storedStreak === calculatedStreak + 1) {
          console.warn(`HomeScreen: Streak discrepancy detected! Stored: ${storedStreak}, Calculated: ${calculatedStreak}`);
          
          // Use calculated streak instead
          setCurrentStreak(calculatedStreak);
          
          // Also update the stored streak
          userProgress.statistics.currentStreak = calculatedStreak;
          await storageService.saveUserProgress(userProgress);
          
          console.log(`HomeScreen: Corrected streak from ${storedStreak} to ${calculatedStreak}`);
        } else {
          // No discrepancy, use stored streak
          setCurrentStreak(storedStreak);
          console.log(`HomeScreen: Using stored streak value: ${storedStreak}`);
        }
      }
    } catch (error) {
      console.error('Error loading user streak:', error);
    }
  };
  
  // Create a ref to store the latest handleRefresh function
  const handleRefreshRef = useRef(handleRefresh);
  
  // Update the ref when handleRefresh changes
  useEffect(() => {
    handleRefreshRef.current = handleRefresh;
  }, [handleRefresh]);

  // Listen for level-up and reward unlocked events
  useEffect(() => {
    const handleLevelUp = () => {
      console.log('Level-up event received in HomeScreen, refreshing...');
      handleRefreshRef.current();
    };
    
    const handleRewardUnlocked = () => {
      console.log('Reward unlocked event received in HomeScreen, refreshing...');
      handleRefreshRef.current();
    };
    
    const handleXpUpdate = (data: any) => {
      console.log(`XP update event received in HomeScreen (${data.xpEarned} XP from ${data.source}), refreshing...`);
      handleRefreshRef.current();
    };
    
    // Add event listeners
    gamificationEvents.on(LEVEL_UP_EVENT, handleLevelUp);
    gamificationEvents.on(REWARD_UNLOCKED_EVENT, handleRewardUnlocked);
    gamificationEvents.on(XP_UPDATED_EVENT, handleXpUpdate);
    
    // Clean up event listeners
    return () => {
      gamificationEvents.off(LEVEL_UP_EVENT, handleLevelUp);
      gamificationEvents.off(REWARD_UNLOCKED_EVENT, handleRewardUnlocked);
      gamificationEvents.off(XP_UPDATED_EVENT, handleXpUpdate);
    };
  }, []);
  
  // Initialize notifications system
  useEffect(() => {
    notifications.configureNotifications();
  }, []);
  
  // Load data
  useEffect(() => {
    console.log('HomeScreen: Starting data loading');

    const loadData = async () => {
      try {
        console.log('HomeScreen: Loading reminder settings');

        // Load user level
        const level = await getUserLevel();
        setUserLevel(level);
        
        // Load user streak
        await loadUserStreak();

        // Load Firebase reminder settings
        const settings = await firebaseReminders.getReminderSettings();
        setReminderEnabled(settings.enabled);
        setReminderTime(settings.time);
        setReminderDays(settings.days);
        setReminderFrequency(settings.frequency);
        setReminderMessage(settings.message);

        // Get a random tip
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        setDailyTip(randomTip);

        console.log('HomeScreen: Data loading completed successfully');
      } catch (error) {
        console.error('HomeScreen: Error loading data:', error);
      } finally {
        console.log('HomeScreen: Setting isLoading to false');
        setIsLoading(false);
      }
    };

    // Set a timeout to ensure loading state is updated even if loadData fails
    const timeoutId = setTimeout(() => {
      console.log('HomeScreen: Timeout reached, forcing isLoading to false');
      setIsLoading(false);
    }, 3000); // 3 second timeout as a fallback

    // Start loading data
    loadData();

    // Clean up the timeout if component unmounts
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Animation functions for dropdowns
  const openDropdown = useCallback((dropdownName: string) => {
    // Save scroll position to restore later
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: scrollPosition, animated: false });
    }

    setActiveDropdown(dropdownName);

    // Run animations in parallel for smoother effect
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      })
    ]).start();
  }, [slideAnim, backdropOpacity, scrollPosition]);

  const closeDropdown = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => {
      setActiveDropdown(null);
    });
  }, [slideAnim, backdropOpacity]);

  // Start stretching routine
  const handleStartStretching = () => {
    // Set position based on officeFriendly toggle
    const effectivePosition: Position = officeFriendly ? 'Sitting,Standing' : 'All';

    const routineParams: RoutineParams & { customStretches?: Stretch[] } = {
      area,
      duration,
      position: effectivePosition
    };

    navigation.navigate('Routine', routineParams);
  };

  // Handle office friendly toggle
  const handleOfficeFriendlyToggle = (value: boolean) => {
    setOfficeFriendly(value);
  };

  // Toggle reminder
  const handleToggleReminders = async (value: boolean) => {
    console.log(`Setting reminders enabled to: ${value}`);
    
    try {
      if (value) {
        // If enabling reminders, ensure we initialize Firebase
        console.log('Enabling reminders, initializing Firebase...');
        const hasPermission = await firebaseReminders.initializeFirebaseReminders();
        console.log('Firebase permission status:', hasPermission);
        
        if (hasPermission) {
          // Update state
          setReminderEnabled(true);
          
          // Save to Firebase with current settings
          const settings = {
            enabled: true,
            time: reminderTime,
            frequency: reminderFrequency,
            days: reminderDays,
            message: reminderMessage || 'Time for your daily stretch!'
          };
          
          console.log('Saving reminder settings to Firebase:', settings);
          const success = await firebaseReminders.saveReminderSettings(settings);
          
          if (success) {
            Alert.alert(
              'Reminders Enabled',
              `You will receive reminders at ${reminderTime} ${reminderFrequency === 'daily' ? 'every day' : reminderFrequency === 'weekdays' ? 'on weekdays' : 'on selected days'}.`,
              [{ text: 'OK' }]
            );
          } else {
            Alert.alert(
              'Reminders Partially Enabled',
              'Your reminders were set up, but you may only receive them when the app is open. For reliable background notifications, please try again later.',
              [{ text: 'OK' }]
            );
          }
        } else {
          // If permissions were denied, revert the switch
          console.log('Firebase permissions denied, not enabling reminders');
          setReminderEnabled(false);
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to use this feature.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // If disabling reminders, update Firebase settings
        console.log('Disabling reminders on Firebase');
        setReminderEnabled(false);
        
        // Set enabled to false but keep other settings
        const settings = {
          enabled: false,
          time: reminderTime,
          frequency: reminderFrequency,
          days: reminderDays,
          message: reminderMessage
        };
        
        await firebaseReminders.saveReminderSettings(settings);
      }
    } catch (error) {
      console.error('Error toggling reminders:', error);
      
      // If we were trying to enable, revert the UI state
      if (value) {
        setReminderEnabled(false);
      }
      
      Alert.alert(
        'Error',
        'Could not set reminder. Please try again later.',
        [{ text: 'OK' }]
      );
    }
  };

  // Handle time change
  const handleTimeChange = async (time: string) => {
    console.log(`Setting reminder time to: ${time}`);
    setReminderTime(time);
    setTimePickerVisible(false);

    if (reminderEnabled) {
      // Update Firebase settings with new time
      console.log('Reminders are enabled, updating Firebase with new time');
      const settings = {
        enabled: reminderEnabled,
        time: time,
        frequency: reminderFrequency,
        days: reminderDays,
        message: reminderMessage
      };
      
      await firebaseReminders.saveReminderSettings(settings);
    } else {
      // Still save the time, even if reminders are disabled
      await firebaseReminders.setReminderTime(time);
      console.log('Reminders are not enabled, time saved but not active');
    }
  };

  // Handle time picker
  const handleTimePress = () => {
    if (!isPremium) {
      setSubscriptionModalVisible(true);
      return;
    }

    setTimePickerVisible(true);
  };

  // Handle days selection
  const handleDaysSelected = async (days: string[]) => {
    setReminderDays(days);
    setDaySelectorVisible(false);

    if (reminderEnabled) {
      // Update Firebase settings with new days
      const settings = {
        enabled: reminderEnabled,
        time: reminderTime,
        frequency: reminderFrequency,
        days: days,
        message: reminderMessage
      };
      
      await firebaseReminders.saveReminderSettings(settings);
    } else {
      // Still save the days, even if reminders are disabled
      await firebaseReminders.setReminderDays(days);
    }
  };

  // Handle days press
  const handleDaysPress = () => {
    if (!isPremium || !canAccessFeature('custom_reminders')) {
      showPremiumOrLevelAlert('custom_reminders');
      return;
    }

    setDaySelectorVisible(true);
  };

  // Handle frequency change
  const handleFrequencyChange = async (frequency: notifications.ReminderFrequency) => {
    setReminderFrequency(frequency);

    // Update days based on frequency selection
    let updatedDays = reminderDays;
    if (frequency === 'daily') {
      updatedDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      setReminderDays(updatedDays);
    } else if (frequency === 'weekdays') {
      updatedDays = ['mon', 'tue', 'wed', 'thu', 'fri'];
      setReminderDays(updatedDays);
    }

    if (reminderEnabled) {
      // Update Firebase settings with new frequency and days
      const settings = {
        enabled: reminderEnabled,
        time: reminderTime,
        frequency: frequency,
        days: updatedDays,
        message: reminderMessage
      };
      
      await firebaseReminders.saveReminderSettings(settings);
    } else {
      // Still save settings, even if reminders are disabled
      await firebaseReminders.setReminderFrequency(frequency);
      await firebaseReminders.setReminderDays(updatedDays);
    }
  };

  // Handle frequency press
  const handleFrequencyPress = () => {
    if (!isPremium || !canAccessFeature('custom_reminders')) {
      showPremiumOrLevelAlert('custom_reminders');
      return;
    }

    // Show frequency options
    Alert.alert(
      'Reminder Frequency',
      'How often do you want to receive reminders?',
      [
        {
          text: 'Every Day',
          onPress: () => handleFrequencyChange('daily'),
        },
        {
          text: 'Weekdays Only',
          onPress: () => handleFrequencyChange('weekdays'),
        },
        {
          text: 'Custom Days',
          onPress: () => {
            handleFrequencyChange('custom');
            // Then show day selector after a brief delay
            setTimeout(() => setDaySelectorVisible(true), 500);
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // Save custom reminder message
  const saveCustomReminderMessage = async (message: string) => {
    // Default message if empty
    const finalMessage = message.trim() === '' 
      ? 'Time for your daily stretch!' 
      : message;
    
    setReminderMessage(finalMessage);
    setCustomReminderModalVisible(false);

    if (reminderEnabled) {
      // Update Firebase settings with new message
      const settings = {
        enabled: reminderEnabled,
        time: reminderTime,
        frequency: reminderFrequency,
        days: reminderDays,
        message: finalMessage
      };
      
      await firebaseReminders.saveReminderSettings(settings);
    } else {
      // Still save the message, even if reminders are disabled
      await firebaseReminders.setReminderMessage(finalMessage);
    }
  };

  // Handle custom reminder
  const handleCustomReminderPress = () => {
    if (!isPremium || !canAccessFeature('custom_reminders')) {
      showPremiumOrLevelAlert('custom_reminders');
      return;
    }
    
    setCustomReminderModalVisible(true);
  };

  // Show premium modal or level requirement alert
  const showPremiumOrLevelAlert = (featureName: string) => {
    if (!isPremium) {
      setSubscriptionModalVisible(true);
    } else {
      Alert.alert(
        'Feature Locked',
        `This feature unlocks at level ${getRequiredLevel(featureName)}. Keep stretching to reach this level!`,
        [{ text: 'OK' }]
      );
    }
  };

  // Show premium modal
  const showPremiumModal = () => {
    setSubscriptionModalVisible(true);
  };

  // Handle test notification
  const handleTestNotification = async () => {
    try {
      console.log('Testing notification system...');
      const hasPermission = await notifications.requestNotificationsPermissions();
      console.log('Notification permission status:', hasPermission);

      if (!hasPermission) {
        console.log('Notification permission denied');
        Alert.alert(
          'Permission Required',
          'Please enable notifications to test this feature.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Schedule the test notification for 5 seconds in the future
      // Using a much shorter delay for interactive testing
      const delaySeconds = 5;
      const testId = await notifications.scheduleTestNotification(delaySeconds);
      console.log('TEST notification scheduled with ID:', testId);
      
      Alert.alert(
        'Test Notification Scheduled',
        `A notification will appear in ${delaySeconds} seconds.\n\nIMPORTANT EXPO LIMITATIONS:\n- You may need to exit the app completely to see it\n- If reminders aren't working, try restarting the app`
      );
    } catch (error) {
      console.error('Error sending test notification:', error);
      Alert.alert('Error', 'Could not send test notification');
    }
  };

  // Handle custom routines press
  const handleCustomRoutinesPress = async () => {
    // First refresh premium status and feature access
    await refreshPremiumStatus();
    await refreshAccess();
    
    if (!isPremium) {
      showPremiumModal();
      return;
    }
    
    if (!canAccessFeature('custom_routines')) {
      showPremiumOrLevelAlert('custom_routines');
      return;
    }
    
    setCustomRoutineModalVisible(true);
  };
  
  // Handle starting a custom routine
  const handleStartCustomRoutine = (params: RoutineParams) => {
    console.log('Starting custom routine with params:', {
      area: params.area,
      duration: params.duration,
      position: params.position,
      stretches: params.customStretches?.length || 0
    });
    
    // Log all stretch IDs for debugging
    console.log('Custom stretches IDs:', params.customStretches && params.customStretches.length > 0 ?
      params.customStretches.map(s => `${s.id} (${typeof s.id}, ${('isRest' in s) ? 'rest' : 'stretch'})`).join(', ') : 'None');

    // Directly navigate to the Routine screen with the provided custom params
    // Avoid calling handleStartStretching() first, as that triggers an initial navigation
    // with default/previous picker params which can overwrite the custom selection.
    // Instead, we go straight to the Routine screen with the correct custom routine data.
    navigation.navigate('Routine', params as any);
  };

  // Handle desk break boost
  const handleDeskBreakBoost = useCallback(async () => {
    // If user is not premium, they should not see the button at all
    // (handled by the component's conditional rendering)
    
    // If the feature is not available by level, show the level requirement alert
    if (!canAccessFeature('desk_break_boost')) {
      const currentLevel = await getUserLevel(); // Get current user level
      const xpNeeded = (getRequiredLevel('desk_break_boost') - currentLevel) * 500; // Rough estimate of XP needed
      
      Alert.alert(
        '🔒 Desk Break Boost - Locked',
        `You'll unlock this feature at Level ${getRequiredLevel('desk_break_boost')}!\n\n` +
        `You're making great progress at Level ${userLevel}. Keep stretching to unlock quick desk stretches and improve your productivity.`,
        [
          { 
            text: 'Maybe Later', 
            style: 'cancel' 
          },
          { 
            text: 'Start Routine',
            onPress: () => handleStartStretching()
          }
        ]
      );
      return;
    }
    
    // Define transition duration (in seconds)
    const transitionDuration = 3; // 3 seconds between stretches
    
    // Generate the desk break boost routine with transitions
    const deskBreakStretches = generateDeskBreakBoostRoutine(transitionDuration);
    
    // Navigate to the routine screen with the desk break stretches
    navigation.navigate('Routine', {
      area: 'Full Body',
      duration: '5',
      position: 'All',
      customStretches: deskBreakStretches,
      transitionDuration: transitionDuration
    });
  }, [navigation, canAccessFeature, getRequiredLevel, userLevel, getUserLevel, handleStartStretching]);

  // Listen for streak flexSave events
  useEffect(() => {
    // Handler for streak flexSave applied event
    const handleStreakFlexSaveApplied = (data: any) => {
      console.log('HomeScreen: Streak flexSave applied', data);
      createTimeRewindEffect();
    };
    
    // Subscribe to the streak flexSave events
    streakFlexSaveEvents.on(STREAK_FLEX_SAVE_APPLIED, handleStreakFlexSaveApplied);
    
    // Cleanup
    return () => {
      streakFlexSaveEvents.off(STREAK_FLEX_SAVE_APPLIED, handleStreakFlexSaveApplied);
    };
  }, []);

  // Create TimeRewind effect
  const createTimeRewindEffect = () => {
    // Reset animation values
    backgroundFlashOpacity.setValue(0);
    
    // Create time rewind elements in a radial pattern around the screen
    const newElements = [];
    const screenWidth = width;
    const screenHeight = height;
    const centerX = screenWidth / 2;
    const centerY = screenHeight / 2;
    
    // Number of elements to create
    const numElements = 30;
    
    // Create elements in a circular pattern around the screen edges
    for (let i = 0; i < numElements; i++) {
      // Calculate position on a circle or slightly inside from the edges
      const angle = (i / numElements) * Math.PI * 2;
      const radius = Math.min(screenWidth, screenHeight) * 0.45;  // 90% of the smaller dimension
      
      // Position elements around the edge in a circle
      const startX = centerX + Math.cos(angle) * radius;
      const startY = centerY + Math.sin(angle) * radius;
      
      // Create varying sizes based on position 
      const sizeVariation = 0.7 + (Math.random() * 0.6); // 70% to 130% of base size
      const baseSize = 20; // Base icon size
      
      newElements.push({
        id: i,
        x: startX,
        y: startY,
        size: baseSize * sizeVariation,
        duration: 2000 + Math.random() * 1500, // Varying durations for natural feel
        delay: Math.random() * 800, // Stagger the start time
        rotation: 180 + Math.random() * 720, // 0.5 to 2 full rotations
        maxY: height
      });
    }
    
    // Add a visual vortex effect at the center
    addVortexEffect();
    
    // Create a subtle background flash animation
    Animated.sequence([
      Animated.timing(backgroundFlashOpacity, {
        toValue: 0.3,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic)
      }),
      Animated.timing(backgroundFlashOpacity, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic)
      })
    ]).start();
    
    setTimeRewindElements(newElements);
    setShowTimeRewindEffect(true);
    
    // Auto-hide after animation completes
    setTimeout(() => {
      setShowTimeRewindEffect(false);
      setShowVortex(false);
    }, 4000); // Match the new animation timing
  };
  
  // Create a visual center "vortex" effect
  const addVortexEffect = () => {
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      haptics.medium();
      
      // Second pulse after a slight delay
      setTimeout(() => {
        haptics.heavy();
      }, 300);
    }
    
    // Show the vortex component
    setShowVortex(true);
  };

  // Handle flexSave applied callback
  const handleFlexSaveApplied = (data: { success: boolean, streakValue: number, flexSavesRemaining: number }) => {
    if (data.success) {
      // If needed, additional actions beyond createTimeRewindEffect
      setCurrentStreak(data.streakValue);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[tw('flex-1 justify-center items-center'), { backgroundColor: theme.background }]}>
        <LinearGradient
          colors={isDark ? 
            ['rgba(18, 18, 18, 1)', 'rgba(30, 30, 30, 1)'] : 
            isSunset ?
              ['rgba(42, 33, 24, 0.95)', 'rgba(61, 48, 35, 1)'] :
              ['rgba(240, 240, 240, 1)', 'rgba(255, 255, 255, 1)']}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[tw('mt-3 text-base'), { color: theme.textSecondary }]}>Loading flexbreak...</Text>
      </SafeAreaView>
    );
  }

  // Helper to convert office friendly toggle to generator-friendly position string
  const getEffectivePosition = (): Position => {
    return officeFriendly ? 'Sitting,Standing' : 'All';
  };

  return (
    <SafeAreaView style={[tw('flex-1'), { backgroundColor: theme.background }]}>
      <LinearGradient
        colors={isDark ? 
          ['rgba(18, 18, 18, 1)', 'rgba(30, 30, 30, 1)'] : 
          isSunset ?
            ['rgba(42, 33, 24, 0.95)', 'rgba(61, 48, 35, 1)'] :
            ['rgba(245, 245, 250, 1)', 'rgba(255, 255, 255, 1)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <RefreshableScrollView
        ref={scrollViewRef}
        style={tw('flex-1 p-4')}
        contentContainerStyle={styles.scrollContent}
        scrollEnabled={!activeDropdown}
        onScroll={(e) => setScrollPosition(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        onRefresh={handleRefresh}
        refreshing={isRefreshing}
        showRefreshingFeedback={true}
      >
        {/* Header */}
        <HomeHeader />

        {/* Streak Display */}
        <StreakDisplay 
          currentStreak={currentStreak} 
          onPremiumPress={showPremiumModal}
          onFlexSaveApplied={handleFlexSaveApplied}
        />

        {/* Level Progress Card - shows for all users */}
        <LevelProgressCard onOpenSubscription={() => setSubscriptionModalVisible(true)} />

        {/* Routine Picker */}
        <RoutinePicker
          area={area}
          duration={duration}
          officeFriendly={officeFriendly}
          onAreaPress={() => openDropdown('area')}
          onDurationPress={() => openDropdown('duration')}
          onOfficeFriendlyToggle={handleOfficeFriendlyToggle}
          onStartStretching={handleStartStretching}
          canAccessCustomRoutines={canAccessFeature('custom_routines')}
          onCustomRoutinesPress={handleCustomRoutinesPress}
          isPremium={isPremium}
          requiredLevel={getRequiredLevel('custom_routines')}
          userLevel={userLevel}
        />
        
        {/* Desk Break Boost */}
        <DeskBreakBoost
          onPress={handleDeskBreakBoost}
          isAvailable={canAccessFeature('desk_break_boost')}
          requiredLevel={getRequiredLevel('desk_break_boost')}
          userLevel={userLevel}
          isPremium={isPremium}
        />

        {/* Daily Tip */}
        <DailyTip tip={dailyTip.text} />

        {/* Subscription Teaser - only show for non-premium users */}
        {!isPremium && <SubscriptionTeaser onPremiumPress={showPremiumModal} />}

        {/* Reminder Section */}
        <ReminderSection
          isPremium={isPremium}
          reminderEnabled={reminderEnabled}
          reminderTime={reminderTime}
          reminderMessage={reminderMessage}
          reminderDays={reminderDays}
          reminderFrequency={reminderFrequency}
          onToggleReminder={handleToggleReminders}
          onTimePress={handleTimePress}
          onDaysPress={handleDaysPress}
          onFrequencyPress={handleFrequencyPress}
          onCustomMessagePress={handleCustomReminderPress}
          canAccessCustomReminders={canAccessFeature('custom_reminders')}
          requiredLevel={getRequiredLevel('custom_reminders')}
          currentLevel={userLevel}
        />

        
      </RefreshableScrollView>

      {/* Time Picker Modal */}
      <TimePicker
        visible={timePickerVisible}
        selectedTime={reminderTime}
        onTimeSelected={handleTimeChange}
        onCancel={() => setTimePickerVisible(false)}
      />

      {/* Day Selector Modal */}
      <DaySelector
        visible={daySelectorVisible}
        selectedDays={reminderDays}
        onDaysSelected={handleDaysSelected}
        onCancel={() => setDaySelectorVisible(false)}
      />

      {/* Custom Reminder Modal */}
      <CustomReminderModal
        visible={customReminderModalVisible}
        message={reminderMessage}
        days={reminderDays}
        frequency={reminderFrequency}
        onMessageChange={setReminderMessage}
        onDaysChange={setReminderDays}
        onFrequencyChange={setReminderFrequency}
        onSave={saveCustomReminderMessage}
        onCancel={() => setCustomReminderModalVisible(false)}
        maxLength={80}
        isCustomFrequencyEnabled={canAccessFeature('custom_reminders')}
      />
      
      {/* Option Dropdown */}
      {activeDropdown === 'area' && (
        <OptionDropdown
          visible={!!activeDropdown}
          title="Select Body Area"
          options={[
            { label: 'Hips & Legs', value: 'Hips & Legs', description: 'For sitting-related stiffness' },
            { label: 'Lower Back', value: 'Lower Back', description: 'For desk posture relief' },
            { label: 'Upper Back & Chest', value: 'Upper Back & Chest', description: 'For hunching & slouching' },
            { label: 'Shoulders & Arms', value: 'Shoulders & Arms', description: 'For desk-typing tension' },
            { label: 'Neck', value: 'Neck', description: 'For screen-staring strain' },
            { label: 'Full Body', value: 'Full Body', description: 'For complete rejuvenation' },
            { label: 'Dynamic Flow', value: 'Dynamic Flow', description: 'Active movement sequence' }
          ]}
          selectedValue={area}
          onSelect={(value) => {
            setArea(value as BodyArea);
            // Turn off office friendly mode if Dynamic Flow is selected
            if (value === 'Dynamic Flow' && officeFriendly) {
              setOfficeFriendly(false);
            }
            closeDropdown();
          }}
          onClose={closeDropdown}
          slideAnim={slideAnim}
          backdropOpacity={backdropOpacity}
          multiSelect={false}
        />
      )}
      {activeDropdown === 'duration' && (
        <OptionDropdown
          visible={!!activeDropdown}
          title="Select Duration"
          options={[
            { label: '5 minutes', value: '5', description: 'Quick refresh' },
            { label: '10 minutes', value: '10', description: 'Standard session' },
            { label: '15 minutes', value: '15', description: 'Deep relief' }
          ]}
          selectedValue={duration}
          onSelect={(value) => {
            setDuration(value as Duration);
            closeDropdown();
          }}
          onClose={closeDropdown}
          slideAnim={slideAnim}
          backdropOpacity={backdropOpacity}
          multiSelect={false}
        />
      )}

      {/* Subscription Modal */}
      <SubscriptionModal
        visible={subscriptionModalVisible}
        onClose={() => setSubscriptionModalVisible(false)}
      />

      {/* Custom Routine Modal */}
      <CustomRoutineModal
        visible={customRoutineModalVisible}
        onClose={() => setCustomRoutineModalVisible(false)}
        onStartRoutine={handleStartCustomRoutine}
      />

      {/* Time Rewind Animation Layer */}
      {showTimeRewindEffect && (
        <View style={[StyleSheet.absoluteFill, styles.timeRewindContainer]}>
          {/* Background flash effect */}
          <Animated.View 
            style={[
              StyleSheet.absoluteFill, 
              styles.backgroundFlash,
              { 
                opacity: backgroundFlashOpacity,
                backgroundColor: theme.accent 
              }
            ]} 
          />
          
          {/* Central vortex effect */}
          <Vortex 
            visible={showVortex}
            size={120}
            color={theme.accent}
            duration={3000}
          />
        
          {/* Time rewind elements that spiral in */}
          {timeRewindElements.map(element => (
            <TimeRewind
              key={element.id}
              x={element.x}
              y={element.y}
              size={element.size}
              duration={element.duration}
              delay={element.delay}
              rotation={element.rotation}
              maxY={element.maxY}
              color={theme.accent}
            />
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  testButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 16,
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  timeRewindContainer: {
    pointerEvents: 'none', // Allow touches to pass through to components underneath
    zIndex: 99, // High z-index to ensure time rewind elements appear on top
  },
  backgroundFlash: {
    backgroundColor: '#2196F3', // Blue flash color
    zIndex: 98, // Below the time rewind elements but above the app
  }
});