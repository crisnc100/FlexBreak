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
  StyleSheet
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp, BodyArea, Duration, RoutineParams, StretchLevel } from '../types';
import tips from '../data/tips';
import SubscriptionModal from '../components/SubscriptionModal';
import { getIsPremium, getReminderEnabled, getReminderTime, saveReminderTime, clearAllData } from '../services/storageService';
import { requestNotificationsPermissions, scheduleDailyReminder, cancelReminders } from '../utils/notifications';
import { tw } from '../utils/tw';
import { usePremium } from '../context/PremiumContext';
import { useRefresh } from '../context/RefreshContext';
import { RefreshableScrollView } from '../components/common';

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
  
  // Optimized animation values
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  
  // State for dropdown
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

  // Memoized animation functions for better performance
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

  // Handle option selection with optimized animation
  const handleOptionSelect = useCallback((setValue: (value: any) => void, value: any) => {
    setValue(value);
    
    // Quick fade out before closing dropdown
    Animated.timing(backdropOpacity, {
      toValue: 0,
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      closeDropdown();
    });
  }, [closeDropdown]);

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

  // Format time for display (24h to 12h)
  const formatTimeFor12Hour = (time24h: string) => {
    const [hours, minutes] = time24h.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Helper label functions
  const getAreaLabel = (value: BodyArea): string => {
    return value;
  };

  const getDurationLabel = (value: Duration) => {
    switch(value) {
      case '5': return '5 minutes';
      case '10': return '10 minutes';
      case '15': return '15 minutes';
      default: return '5 minutes';
    }
  };

  const getLevelLabel = (value: StretchLevel) => {
    switch(value) {
      case 'beginner': return 'Beginner';
      case 'intermediate': return 'Intermediate';
      case 'advanced': return 'Advanced';
      default: return 'Beginner';
    }
  };

  // Add this function to get a descriptive message for each body area
  const getAreaDescription = (area: string): string => {
    switch(area) {
      case 'Hips & Legs':
        return 'For sitting-related stiffness';
      case 'Lower Back':
        return 'For desk posture relief';
      case 'Upper Back & Chest':
        return 'For hunching & slouching';
      case 'Shoulders & Arms':
        return 'For desk-typing tension';
      case 'Neck':
        return 'For screen-staring strain';
      case 'Full Body':
        return 'For complete rejuvenation';
      default:
        return '';
    }
  };

  // Update the area options array
  const areaOptions = [
    { label: 'Hips & Legs', value: 'Hips & Legs', description: 'For sitting-related stiffness' },
    { label: 'Lower Back', value: 'Lower Back', description: 'For desk posture relief' },
    { label: 'Upper Back & Chest', value: 'Upper Back & Chest', description: 'For hunching & slouching' },
    { label: 'Shoulders & Arms', value: 'Shoulders & Arms', description: 'For desk-typing tension' },
    { label: 'Neck', value: 'Neck', description: 'For screen-staring strain' },
    { label: 'Full Body', value: 'Full Body', description: 'For complete rejuvenation' }
  ];

  // Define duration options
  const durationOptions = [
    { label: '5 minutes', value: '5', description: 'Quick refresh' },
    { label: '10 minutes', value: '10', description: 'Standard session' },
    { label: '15 minutes', value: '15', description: 'Deep relief' }
  ];

  // Define level options
  const levelOptions = [
    { label: 'Beginner', value: 'beginner', description: 'Easy gentle stretches' },
    { label: 'Intermediate', value: 'intermediate', description: 'Moderate intensity' },
    { label: 'Advanced', value: 'advanced', description: 'Deep stretching' }
  ];

  // Get active options based on dropdown
  const getActiveOptions = () => {
    switch (activeDropdown) {
      case 'area':
        return {
          title: 'Select Body Area',
          options: areaOptions,
          value: area,
          onChange: (value: string) => setArea(value as BodyArea)
        };
      case 'duration':
        return {
          title: 'Select Duration',
          options: durationOptions,
          value: duration,
          onChange: (value: string) => setDuration(value as Duration)
        };
      case 'level':
        return {
          title: 'Select Level',
          options: levelOptions,
          value: level,
          onChange: (value: string) => setLevel(value as StretchLevel)
        };
      default:
        return {
          title: '',
          options: [],
          value: '',
          onChange: () => {}
        };
    }
  };

  // Render a custom dropdown field with optimized styling
  const renderCustomDropdown = (label: string, value: string, onPress: () => void) => {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={styles.dropdownButton}
        activeOpacity={0.8}
      >
        <Text style={styles.dropdownButtonText}>{value}</Text>
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>
    );
  };

  // Add console logs to track component lifecycle
  useEffect(() => {
    console.log('HomeScreen mounted');
    return () => {
      console.log('HomeScreen unmounted');
    };
  }, []);
  
  useEffect(() => {
    console.log('isPremium changed:', isPremium);
  }, [isPremium]);
  
  useEffect(() => {
    console.log('isLoading changed:', isLoading);
  }, [isLoading]);

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView style={tw('flex-1 bg-white justify-center items-center')}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={tw('mt-3 text-base text-gray-500')}>Loading DeskStretch...</Text>
      </SafeAreaView>
    );
  }

  const activeOptions = getActiveOptions();

  return (
    <SafeAreaView style={tw('flex-1 bg-bg')}>
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
        <View style={tw('items-center mb-5')}>
          <Text style={tw('text-2xl font-bold text-text text-center')}>DeskStretch</Text>
          <Text style={tw('text-sm text-muted text-center')}>Move Better, Work Better</Text>
        </View>
        
        {/* Daily Tip */}
        <View style={tw('bg-gray-200 rounded-lg p-3 mb-4 flex-row items-center')}>
          <Ionicons name="bulb-outline" size={20} color="#FF9800" style={tw('mr-2')} />
          <Text style={tw('text-base text-text flex-1')}>{dailyTip.text}</Text>
        </View>
        
        {/* Routine Picker - Redesigned */}
        <View style={tw('bg-white shadow-md p-4 rounded-lg mb-4')}>
          <Text style={tw('text-lg font-semibold text-text mb-3')}>Create Your Routine</Text>
          
          <View style={tw('mb-3')}>
            <Text style={tw('text-sm text-text mb-1')}>What's tight?</Text>
            {renderCustomDropdown("Body Area", getAreaLabel(area), () => openDropdown('area'))}
          </View>
          
          <View style={tw('mb-3')}>
            <Text style={tw('text-sm text-text mb-1')}>How long?</Text>
            {renderCustomDropdown("Duration", getDurationLabel(duration), () => openDropdown('duration'))}
          </View>
          
          <View style={tw('mb-3')}>
            <Text style={tw('text-sm text-text mb-1')}>How flexible?</Text>
            {renderCustomDropdown("Level", getLevelLabel(level), () => openDropdown('level'))}
          </View>
          
          <TouchableOpacity 
            onPress={handleStartStretching}
            style={tw('bg-primary p-3 rounded-lg mt-2 items-center')}
          >
            <Text style={tw('text-white font-semibold text-base')}>Start Stretching</Text>
          </TouchableOpacity>
        </View>
        
        {/* Subscription Teaser */}
        <View style={tw('bg-white border border-gray-200 rounded-lg p-4 mb-4 flex-row justify-between items-center')}>
          <View style={tw('flex-row items-center flex-1')}>
            <Ionicons name="star" size={20} color="#FF9800" style={tw('mr-2')} />
            <Text style={tw('text-sm text-muted flex-1')}>Unlock Progress, Reminders & Favorites</Text>
          </View>
          <TouchableOpacity 
            onPress={showPremiumModal}
            style={tw('bg-accent p-2 rounded-lg')}
          >
            <Text style={tw('text-white text-xs font-semibold')}>Go Premium</Text>
          </TouchableOpacity>
        </View>
        
        {/* Reminder Section */}
        <View style={[tw('bg-white border border-gray-200 rounded-lg p-4 mb-4'), !isPremium && tw('opacity-50')]}>
          <Text style={tw('text-lg font-semibold text-text mb-3')}>Daily Reminder</Text>
          
          <View style={tw('flex-row justify-between items-center')}>
            <View style={tw('flex-row items-center')}>
              <Ionicons name="alarm-outline" size={20} color="#333" style={tw('mr-2')} />
              <Text style={tw('text-sm text-text')}>Remind me to stretch</Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={handleReminderToggle}
              trackColor={{ false: '#D1D1D1', true: '#4CAF50' }}
              thumbColor={reminderEnabled ? '#FFFFFF' : '#F4F4F4'}
              disabled={!isPremium}
            />
          </View>
          
          <TouchableOpacity 
            onPress={handleTimePress}
            style={[tw('bg-gray-100 p-2 rounded mt-3'), !isPremium && tw('bg-gray-200')]}
            disabled={!isPremium}
          >
            <Text style={[tw('text-sm text-center'), !isPremium ? tw('text-gray-500') : tw('text-text')]}>
              {formatTimeFor12Hour(reminderTime)}
            </Text>
          </TouchableOpacity>
          
          {!isPremium && (
            <Text style={tw('text-xs text-gray-500 italic text-center mt-2')}>
              Premium feature
            </Text>
          )}
        </View>
        
        {/* Subscription Modal */}
        <SubscriptionModal 
          visible={subscriptionModalVisible}
          onClose={() => setSubscriptionModalVisible(false)}
        />
      </RefreshableScrollView>

      {/* Optimized Dropdown Modal */}
      {activeDropdown && (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <Animated.View 
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: 'rgba(0,0,0,0.5)',
                opacity: backdropOpacity,
              },
            ]}
          >
            <Pressable 
              style={StyleSheet.absoluteFill}
              onPress={closeDropdown}
            />
          </Animated.View>
          
          <Animated.View 
            style={[
              styles.dropdownContainer,
              {
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>{activeOptions.title}</Text>
              <TouchableOpacity onPress={closeDropdown} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.optionsContainer}
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={styles.optionsContent}
            >
              {activeOptions.options.map((item) => (
                <Pressable 
                  key={item.value}
                  style={({pressed}) => [
                    styles.optionItem,
                    activeOptions.value === item.value && styles.selectedOptionItem,
                    pressed && styles.pressedOptionItem
                  ]}
                  onPress={() => handleOptionSelect(activeOptions.onChange, item.value)}
                  android_ripple={{color: 'rgba(0,0,0,0.1)'}}
                >
                  <View>
                    <Text style={[
                      styles.optionText,
                      activeOptions.value === item.value && styles.selectedOptionText
                    ]}>
                      {item.label}
                    </Text>
                    {item.description && (
                      <Text style={styles.optionDescription}>
                        {item.description}
                      </Text>
                    )}
                  </View>
                  {activeOptions.value === item.value && (
                    <Ionicons name="checkmark" size={22} color="#4CAF50" style={styles.checkIcon} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      )}

      {__DEV__ && (
        <TouchableOpacity 
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            backgroundColor: 'red',
            padding: 10,
            borderRadius: 5,
            zIndex: 999
          }}
          onPress={async () => {
            const success = await clearAllData();
            if (success) {
              Alert.alert('Success', 'All app data has been reset');
              // Reset local state
              setReminderEnabled(false);
              setReminderTime('09:00');
            } else {
              Alert.alert('Error', 'Failed to reset app data');
            }
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Reset Data</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

// Optimized styles with memoized StyleSheet for better performance
const styles = StyleSheet.create({
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  dropdownContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: height * 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    maxHeight: height * 0.6,
  },
  optionsContent: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 16,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedOptionItem: {
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
  },
  pressedOptionItem: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedOptionText: {
    fontWeight: '600',
    color: '#4CAF50',
  },
  optionDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  checkIcon: {
    marginLeft: 8,
  }
});