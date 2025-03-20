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
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp, BodyArea, Duration, RoutineParams, StretchLevel } from '../types';
import tips from '../data/tips';
import SubscriptionModal from '../components/SubscriptionModal';
import { tw } from '../utils/tw';
import { usePremium } from '../context/PremiumContext';
import { useRefresh } from '../context/RefreshContext';
import { RefreshableScrollView } from '../components/common';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useTheme } from '../context/ThemeContext';
import { 
  HomeHeader, 
  DailyTip, 
  SubscriptionTeaser, 
  RoutinePicker, 
  ReminderSection, 
  CustomReminderModal,
  OptionDropdown,
  TimePicker,
  DaySelector
} from '../components/home';
import * as notifications from '../utils/notifications';

const { height, width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const [area, setArea] = useState<BodyArea>('Hips & Legs');
  const [duration, setDuration] = useState<Duration>('5');
  const [level, setLevel] = useState<StretchLevel>('beginner');
  const { isPremium } = usePremium();
  const { isRefreshing, refreshHome } = useRefresh();
  
  // Reminder state
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [reminderDays, setReminderDays] = useState<string[]>([]);
  const [reminderFrequency, setReminderFrequency] = useState<notifications.ReminderFrequency>('daily');
  const [reminderMessage, setReminderMessage] = useState('');
  
  // Modal visibility states
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [customReminderModalVisible, setCustomReminderModalVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [daySelectorVisible, setDaySelectorVisible] = useState(false);
  
  const [isLoading, setIsLoading] = useState(true);
  const [dailyTip, setDailyTip] = useState(tips[0]);
  const { canAccessFeature, meetsLevelRequirement, getRequiredLevel, getUserLevel } = useFeatureAccess();
  const { theme, isDark } = useTheme();

  // Animated values for dropdowns
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Scroll position tracking
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // User level for custom reminders
  const [userLevel, setUserLevel] = useState(0);

  // Initialize notifications system
  useEffect(() => {
    notifications.configureNotifications();
  }, []);

  // Handle refresh
  const handleRefresh = async () => {
    console.log('Refreshing home screen...');

    // Get a new random tip
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    setDailyTip(randomTip);

    // Refresh other home data
    await refreshHome();
  };

  // Load data
  useEffect(() => {
    console.log('HomeScreen: Starting data loading');

    const loadData = async () => {
      try {
        console.log('HomeScreen: Loading reminder settings');

        // Load user level
        const level = await getUserLevel();
        setUserLevel(level);

        // Load reminder settings
        const settings = await notifications.getAllReminderSettings();
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
    const routineParams: RoutineParams = {
      area,
      duration,
      level
    };

    navigation.navigate('Routine', routineParams);
  };

  // Toggle reminder
  const handleToggleReminders = async (value: boolean) => {
    console.log(`Setting reminders enabled to: ${value}`);
    
    try {
      if (value) {
        // If enabling reminders, ensure we schedule them
        console.log('Enabling reminders, requesting permissions...');
        const hasPermission = await notifications.requestNotificationsPermissions();
        console.log('Notification permission status:', hasPermission);
        
        if (hasPermission) {
          // Update state and storage
          setReminderEnabled(true);
          await notifications.saveReminderEnabled(true);
          
          // Schedule "dummy" reminders with current settings (just saves settings)
          console.log(`Scheduling reminders for time: ${reminderTime}`);
          await notifications.scheduleReminders();
          
          // Actually schedule the real notification
          console.log('Now scheduling a real notification that will appear at the set time');
          await notifications.scheduleRealReminder();
          
          // Get updated settings to verify
          const updatedSettings = await notifications.getAllReminderSettings();
          console.log('Updated reminder settings after enabling:', updatedSettings);
          
          // No alert - the UI already shows the state has changed
        } else {
          // If permissions were denied, revert the switch
          console.log('Notification permissions denied, not enabling reminders');
          setReminderEnabled(false);
          Alert.alert(
            'Permission Required',
            'Please enable notifications in your device settings to use this feature.',
            [{ text: 'OK' }]
          );
        }
      } else {
        // If disabling reminders, cancel any scheduled ones
        console.log('Disabling reminders, cancelling any scheduled');
        setReminderEnabled(false);
        await notifications.saveReminderEnabled(false);
        await notifications.cancelReminders();
      }
    } catch (error) {
      console.error('Error toggling reminders:', error);
      Alert.alert('Error', 'Could not set reminder');
    }
  };

  // Helper function to format time from 24h to 12h
  const formatTimeFor12h = (time24h: string) => {
    try {
      const [hours, minutes] = time24h.split(':');
      const hour = parseInt(hours, 10);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch (e) {
      return time24h;
    }
  };

  // Handle time change
  const handleTimeChange = async (time: string) => {
    console.log(`Setting reminder time to: ${time}`);
    setReminderTime(time);
    await notifications.saveReminderTime(time);
    setTimePickerVisible(false);

    if (reminderEnabled) {
      // Update the scheduled reminder with the new time
      console.log('Reminders are enabled, rescheduling with new time');
      await notifications.scheduleReminders();
      
      // Get updated settings to verify
      const updatedSettings = await notifications.getAllReminderSettings();
      console.log('Updated reminder settings after time change:', updatedSettings);
      
      // No alert - the UI already shows the time has changed
    } else {
      console.log('Reminders are not enabled, time saved but no scheduling needed');
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
    await notifications.saveReminderDays(days);
    setDaySelectorVisible(false);

    if (reminderEnabled) {
      // Update the scheduled reminder with the new days
      await notifications.scheduleReminders();
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
    await notifications.saveReminderFrequency(frequency);

    // Update days based on frequency selection
    if (frequency === 'daily') {
      const allDays = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
      setReminderDays(allDays);
      await notifications.saveReminderDays(allDays);
    } else if (frequency === 'weekdays') {
      const weekdays = ['mon', 'tue', 'wed', 'thu', 'fri'];
      setReminderDays(weekdays);
      await notifications.saveReminderDays(weekdays);
    }

    if (reminderEnabled) {
      // Update the scheduled reminder with the new frequency
      await notifications.scheduleReminders();
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
    await notifications.saveReminderMessage(finalMessage);
    setCustomReminderModalVisible(false);

    if (reminderEnabled) {
      // Update the scheduled reminder with the new message
      await notifications.scheduleReminders();
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

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={[tw('flex-1 justify-center items-center'), { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[tw('mt-3 text-base'), { color: theme.textSecondary }]}>Loading DeskStretch...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[tw('flex-1'), { backgroundColor: theme.background }]}>
      <RefreshableScrollView
        ref={scrollViewRef}
        style={tw('flex-1 p-4')}
        scrollEnabled={!activeDropdown}
        onScroll={(e) => setScrollPosition(e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        onRefresh={handleRefresh}
        refreshing={isRefreshing}
        showRefreshingFeedback={true}
      >
        {/* Header */}
        <HomeHeader />

        {/* Daily Tip */}
        <DailyTip tip={dailyTip.text} />

        {/* Routine Picker */}
        <RoutinePicker
          area={area}
          duration={duration}
          level={level}
          onAreaPress={() => openDropdown('area')}
          onDurationPress={() => openDropdown('duration')}
          onLevelPress={() => openDropdown('level')}
          onStartStretching={handleStartStretching}
          canAccessCustomRoutines={canAccessFeature('custom_routines')}
          onCustomRoutinesPress={() => 
            Alert.alert('Custom Routines', 'This feature will allow you to create and save your own personalized stretching routines.', [{ text: 'OK' }])
          }
        />

        {/* Subscription Teaser */}
        <SubscriptionTeaser onPremiumPress={showPremiumModal} />

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

        {/* Test Notification Button (for development/testing) */}
        {__DEV__ && (
          <TouchableOpacity
            style={[styles.testButton, { backgroundColor: theme.accent }]}
            onPress={handleTestNotification}
          >
            <Text style={styles.testButtonText}>Test Notifications (Development Only)</Text>
          </TouchableOpacity>
        )}
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
      {activeDropdown && (
        <OptionDropdown
          visible={!!activeDropdown}
          title={
            activeDropdown === 'area' 
              ? 'Select Body Area' 
              : activeDropdown === 'duration'
                ? 'Select Duration'
                : 'Select Level'
          }
          options={
            activeDropdown === 'area'
              ? [
                  { label: 'Hips & Legs', value: 'Hips & Legs', description: 'For sitting-related stiffness' },
                  { label: 'Lower Back', value: 'Lower Back', description: 'For desk posture relief' },
                  { label: 'Upper Back & Chest', value: 'Upper Back & Chest', description: 'For hunching & slouching' },
                  { label: 'Shoulders & Arms', value: 'Shoulders & Arms', description: 'For desk-typing tension' },
                  { label: 'Neck', value: 'Neck', description: 'For screen-staring strain' },
                  { label: 'Full Body', value: 'Full Body', description: 'For complete rejuvenation' }
                ]
              : activeDropdown === 'duration'
                ? [
                    { label: '5 minutes', value: '5', description: 'Quick refresh' },
                    { label: '10 minutes', value: '10', description: 'Standard session' },
                    { label: '15 minutes', value: '15', description: 'Deep relief' }
                  ]
                : [
                    { label: 'Beginner', value: 'beginner', description: 'Easy gentle stretches' },
                    { label: 'Intermediate', value: 'intermediate', description: 'Moderate intensity' },
                    { label: 'Advanced', value: 'advanced', description: 'Deep stretching' }
                  ]
          }
          selectedValue={
            activeDropdown === 'area'
              ? area
              : activeDropdown === 'duration'
                ? duration
                : level
          }
          onSelect={(value) => {
            if (activeDropdown === 'area') {
              setArea(value as BodyArea);
            } else if (activeDropdown === 'duration') {
              setDuration(value as Duration);
            } else if (activeDropdown === 'level') {
              setLevel(value as StretchLevel);
            }
            closeDropdown();
          }}
          onClose={closeDropdown}
          slideAnim={slideAnim}
          backdropOpacity={backdropOpacity}
        />
      )}

      {/* Subscription Modal */}
      <SubscriptionModal
        visible={subscriptionModalVisible}
        onClose={() => setSubscriptionModalVisible(false)}
      />
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
  }
});