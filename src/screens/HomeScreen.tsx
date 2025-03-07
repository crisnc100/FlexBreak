import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Switch, 
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Modal,
  Animated,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { AppNavigationProp, BodyArea, Duration, RoutineParams, StretchLevel } from '../types';
import tips from '../data/tips';
import SubscriptionModal from '../components/SubscriptionModal';
import { getIsPremium, getReminderEnabled, getReminderTime, saveReminderTime } from '../utils/storage';
import { requestNotificationsPermissions, scheduleDailyReminder, cancelReminders } from '../utils/notifications';
import { tw } from '../utils/tw';

const { height } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const [area, setArea] = useState<BodyArea>('hips');
  const [duration, setDuration] = useState<Duration>('5');
  const [level, setLevel] = useState<StretchLevel>('beginner');
  const [isPremium, setIsPremium] = useState(false);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('09:00');
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [dailyTip, setDailyTip] = useState(tips[0]);
  
  // Animation value for the modal
  const slideAnimation = useRef(new Animated.Value(height)).current;
  
  // State for dropdown
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      // Get premium status
      const premium = await getIsPremium();
      setIsPremium(premium);
      
      // Get reminder settings
      const reminderStatus = await getReminderEnabled();
      setReminderEnabled(reminderStatus);
      
      const savedTime = await getReminderTime();
      if (savedTime) {
        setReminderTime(savedTime);
      }
      
      // Get a random tip
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      setDailyTip(randomTip);
      
      setIsLoading(false);
    };
    
    loadData();
  }, []);

  // Animation functions
  const openDropdown = (dropdownName: string) => {
    setActiveDropdown(dropdownName);
    Animated.timing(slideAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeDropdown = () => {
    Animated.timing(slideAnimation, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setActiveDropdown(null);
    });
  };

  // Start stretching routine
  const handleStartStretching = () => {
    const routineParams: RoutineParams = {
      area,
      duration,
      level
    };
    
    navigation.navigate('Routine', routineParams);
  };

  // Helper functions for dropdown selection
  const getAreaLabel = (value: BodyArea) => {
    switch(value) {
      case 'hips': return 'Hips';
      case 'back': return 'Back';
      case 'shoulders': return 'Shoulders';
      case 'neck': return 'Neck';
      case 'full body': return 'Full Body';
      default: return 'Hips';
    }
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

  // Render a custom dropdown field
  const renderCustomDropdown = (label: string, value: string, onPress: () => void) => {
    return (
      <TouchableOpacity
        onPress={onPress}
        style={tw('flex-row items-center justify-between p-4 bg-white border border-gray-200 rounded-lg mb-3')}
        activeOpacity={0.7}
      >
        <Text style={tw('text-base text-text')}>{value}</Text>
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>
    );
  };

  // Define area options
  const areaOptions = [
    { label: 'Hips', value: 'hips' },
    { label: 'Back', value: 'back' },
    { label: 'Shoulders', value: 'shoulders' },
    { label: 'Neck', value: 'neck' },
    { label: 'Full Body', value: 'full body' }
  ];

  // Define duration options
  const durationOptions = [
    { label: '5 minutes', value: '5' },
    { label: '10 minutes', value: '10' },
    { label: '15 minutes', value: '15' }
  ];

  // Define level options
  const levelOptions = [
    { label: 'Beginner', value: 'beginner' },
    { label: 'Intermediate', value: 'intermediate' },
    { label: 'Advanced', value: 'advanced' }
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
      <ScrollView style={tw('flex-1 p-4')}>
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
      </ScrollView>

      {/* Animated Dropdown */}
      {activeDropdown && (
        <View style={tw('absolute inset-0 bg-black bg-opacity-30')}>
          <TouchableOpacity 
            style={tw('flex-1')}
            activeOpacity={1}
            onPress={closeDropdown}
          />
          <Animated.View 
            style={[
              tw('bg-white rounded-t-lg'),
              {
                transform: [{ translateY: slideAnimation }],
                maxHeight: height * 0.6,
              }
            ]}
          >
            <View style={tw('flex-row justify-between items-center p-4 border-b border-gray-200')}>
              <Text style={tw('text-lg font-semibold text-text')}>{activeOptions.title}</Text>
              <TouchableOpacity onPress={closeDropdown} style={tw('p-2')}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={tw('max-h-96')}>
              {activeOptions.options.map((item) => (
                <TouchableOpacity 
                  key={item.value} 
                  style={[
                    tw('p-4 border-b border-gray-100'),
                    activeOptions.value === item.value && tw('bg-primary bg-opacity-10')
                  ]}
                  onPress={() => {
                    activeOptions.onChange(item.value);
                    closeDropdown();
                  }}
                >
                  <Text 
                    style={[
                      tw('text-base text-text'),
                      activeOptions.value === item.value && tw('font-bold text-primary')
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}