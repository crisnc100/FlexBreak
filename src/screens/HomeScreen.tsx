import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  Modal,
  TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp, BodyArea, Duration, RoutineParams, StretchLevel } from '../types';
import tips from '../data/tips';
import SubscriptionModal from '../components/SubscriptionModal';
import { getReminderEnabled, getReminderTime, saveReminderTime } from '../services/storageService';
import { requestNotificationsPermissions, scheduleDailyReminder, cancelReminders } from '../utils/notifications';
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
  OptionDropdown
} from '../components/home';

const { height, width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const [area, setArea] = useState<BodyArea>('Hips & Legs');
  const [duration, setDuration] = useState<Duration>('5');
  const [level, setLevel] = useState<StretchLevel>('beginner');
  const { isPremium } = usePremium();
  const { isRefreshing, refreshHome } = useRefresh();
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyTip, setDailyTip] = useState(tips[0]);
  const { canAccessFeature, meetsLevelRequirement, getRequiredLevel } = useFeatureAccess();
  const [reminderMessage, setReminderMessage] = useState('Time for your daily stretch!');
  const [customReminderModalVisible, setCustomReminderModalVisible] = useState(false);
  const { theme, isDark } = useTheme();

  // Animated values for dropdowns
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Scroll position tracking
  const [scrollPosition, setScrollPosition] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  // Handle refresh
  const handleRefresh = async () => {
    console.log('Refreshing home screen...');

    // Get a new random tip
    const randomTip = tips[Math.floor(Math.random() * tips.length)];
    setDailyTip(randomTip);

    // Refresh other home data
    await refreshHome();
  };

  useEffect(() => {
    console.log('HomeScreen: Starting data loading');

    const loadData = async () => {
      try {
        console.log('HomeScreen: Loading reminder settings');

        // Load reminder settings
        const reminderEnabled = await getReminderEnabled();
        setReminderEnabled(reminderEnabled);

        const reminderTime = await getReminderTime();
        setReminderTime(reminderTime || '08:00');

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
  const handleReminderToggle = async (value: boolean) => {
    if (!isPremium) {
      setSubscriptionModalVisible(true);
      return;
    }

    try {
      setReminderEnabled(value);

      if (value) {
        // Request permissions first
        const hasPermission = await requestNotificationsPermissions();

        if (!hasPermission) {
          Alert.alert(
            'Permission Required',
            'Please enable notifications to use this feature.',
            [{ text: 'OK' }]
          );
          setReminderEnabled(false);
          return;
        }

        // Schedule the reminder
        await scheduleDailyReminder(reminderTime);
      } else {
        // Cancel reminders
        await cancelReminders();
      }
    } catch (error) {
      console.error('Error toggling reminder:', error);
      Alert.alert('Error', 'Could not set reminder');
    }
  };

  // Handle time picker
  const handleTimePress = () => {
    if (!isPremium) {
      setSubscriptionModalVisible(true);
      return;
    }

    // In a real app, this would open a time picker
    Alert.alert(
      'Set Reminder Time',
      'Choose a time for your daily stretching reminder',
      [
        {
          text: 'Morning (9:00)',
          onPress: () => handleTimeChange('09:00'),
        },
        {
          text: 'Afternoon (14:00)',
          onPress: () => handleTimeChange('14:00'),
        },
        {
          text: 'Evening (18:00)',
          onPress: () => handleTimeChange('18:00'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  // Handle time change
  const handleTimeChange = async (time: string) => {
    setReminderTime(time);
    await saveReminderTime(time);

    if (reminderEnabled) {
      // Update the scheduled reminder with the new time
      await scheduleDailyReminder(time);
    }
  };

  // Show premium modal
  const showPremiumModal = () => {
    setSubscriptionModalVisible(true);
  };
  
  // Save custom reminder message
  const saveCustomReminderMessage = (message: string) => {
    if (message.trim() === '') {
      setReminderMessage('Time for your daily stretch!');
    } else {
      setReminderMessage(message);
    }
    setCustomReminderModalVisible(false);
  };

  // Handle custom reminder
  const handleCustomReminderPress = () => {
    if (!isPremium) {
      setSubscriptionModalVisible(true);
      return;
    }
    
    if (!canAccessFeature('custom_reminders')) {
      Alert.alert(
        'Feature Locked',
        `Custom Reminders unlock at level ${getRequiredLevel('custom_reminders')}. Keep stretching to reach this level!`,
        [{ text: 'OK' }]
      );
      return;
    }
    
    setCustomReminderModalVisible(true);
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
          onToggleReminder={handleReminderToggle}
          onTimePress={handleTimePress}
          onCustomMessagePress={handleCustomReminderPress}
          canAccessCustomReminders={canAccessFeature('custom_reminders')}
          requiredLevel={getRequiredLevel('custom_reminders')}
          currentLevel={0} // Replace with actual user level when available
        />

        {/* Subscription Modal */}
        <SubscriptionModal
          visible={subscriptionModalVisible}
          onClose={() => setSubscriptionModalVisible(false)}
        />
      </RefreshableScrollView>

      {/* Custom Reminder Modal */}
      <CustomReminderModal
        visible={customReminderModalVisible}
        message={reminderMessage}
        onMessageChange={setReminderMessage}
        onSave={saveCustomReminderMessage}
        onCancel={() => setCustomReminderModalVisible(false)}
        maxLength={50}
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
    </SafeAreaView>
  );
}