import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  Switch
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { BodyArea, Duration, RoutineParams, Stretch, CustomRestPeriod } from '../../types';
import { 
  saveFavoriteRoutine, 
  saveCustomRoutine as saveCustomRoutineToStorage, 
  getCustomRoutines, 
  deleteCustomRoutine as deleteCustomRoutineFromStorage 
} from '../../services/storageService';
import { usePremium } from '../../context/PremiumContext';
import { useFeatureAccess } from '../../hooks/progress/useFeatureAccess';
import StretchSelector from './StretchSelector';
import SmartRoutineGenerator from './SmartRoutineGenerator';
import stretches from '../../data/stretches';
import * as rewardManager from '../../utils/progress/modules/rewardManager';
import { 
  CustomRoutineHeader,
  CustomForm,
  PremiumTeaser,
  RoutineList
} from './tabs';

// Max number of custom routines a user can save
const MAX_CUSTOM_ROUTINES = 15;

// Interface for custom routine
interface CustomRoutine {
  id: string;
  name: string;
  area: BodyArea;
  duration: Duration;
  timestamp: string;
  customStretches?: { 
    id: number | string; 
    isRest?: boolean;
    bilateral?: boolean;
  }[];
}

interface CustomRoutineModalProps {
  visible: boolean;
  onClose: () => void;
  onStartRoutine: (params: RoutineParams) => void;
}

const CustomRoutineModal: React.FC<CustomRoutineModalProps> = ({ 
  visible, 
  onClose,
  onStartRoutine
}) => {
  const { theme, isDark } = useTheme();
  const { isPremium, refreshPremiumStatus } = usePremium();
  const { canAccessFeature, getRequiredLevel, getUserLevel, refreshAccess } = useFeatureAccess();
  
  // State variables
  const [customRoutines, setCustomRoutines] = useState<CustomRoutine[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [routineName, setRoutineName] = useState('');
  const [selectedArea, setSelectedArea] = useState<BodyArea>('Neck');
  const [selectedDuration, setSelectedDuration] = useState<Duration>('5');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [showStretchSelector, setShowStretchSelector] = useState(false);
  const [selectedStretches, setSelectedStretches] = useState<(Stretch | CustomRestPeriod)[]>([]);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'routines' | 'create'>('routines');
  const [isSaving, setIsSaving] = useState(false);
  const [userLevel, setUserLevel] = useState<number>(1);
  const [requiredLevel, setRequiredLevel] = useState<number>(5);
  
  // Rest period options
  const restPeriods: CustomRestPeriod[] = [
    { 
      id: 'rest-15', 
      name: "15-Second Break", 
      description: "A short break to transition to the next stretch position or take a quick breath.",
      duration: 15,
      isRest: true
    },
    { 
      id: 'rest-30', 
      name: "30-Second Break", 
      description: "Take a moment to recover, breathe deeply, and prepare for the next stretch.",
      duration: 30,
      isRest: true
    },
    { 
      id: 'rest-60', 
      name: "1-Minute Break", 
      description: "A longer break to fully recover, hydrate, and mentally prepare for the next part of your routine.",
      duration: 60,
      isRest: true
    },
  ];
  
  // When area or duration changes, reset selected stretches
  useEffect(() => {
    setSelectedStretches([]);
  }, [selectedArea, selectedDuration]);
  
  // Check access when modal becomes visible or when premium status changes
  useEffect(() => {
    if (visible) {
      refreshFeatureAccess();
      loadCustomRoutines();
    }
  }, [visible, isPremium]);
  
  // Update tabs based on custom routines availability
  useEffect(() => {
    // If there are custom routines, default to showing them
    if (customRoutines.length > 0) {
      setActiveTab('routines');
    } else {
      // If no custom routines, default to create tab
      setActiveTab('create');
    }
  }, [customRoutines.length]);
  
  // Refresh feature access
  const refreshFeatureAccess = async () => {
    console.log('Refreshing feature access for custom routines...');
    // Refresh premium status first
    await refreshPremiumStatus();
    // Then refresh feature access
    await refreshAccess();
    
    // Get user's current level and required level for feature
    const level = await getUserLevel();
    const required = getRequiredLevel('custom_routines');
    setUserLevel(level);
    setRequiredLevel(required);
    
    // Update access state
    const access = isPremium && canAccessFeature('custom_routines');
    console.log('Current premium status:', isPremium);
    console.log('User level:', level, 'Required level:', required);
    console.log('Can access custom routines:', canAccessFeature('custom_routines'));
    console.log('Feature access result:', access);
    setHasAccess(access);
  };
  
  // Load custom routines from storage
  const loadCustomRoutines = async () => {
    try {
      const savedRoutines = await getCustomRoutines();
      if (savedRoutines && savedRoutines.length > 0) {
        setCustomRoutines(savedRoutines);
      }
    } catch (error) {
      console.error('Error loading custom routines:', error);
      Alert.alert('Error', 'Failed to load your custom routines.');
    }
  };
  
  // Save a new custom routine
  const saveCustomRoutine = async () => {
    try {
      // Ensure required fields are filled out
      if (!routineName.trim()) {
        Alert.alert('Missing Information', 'Please enter a name for your routine.');
        return;
      }

      // Ensure minimum stretches requirement is met
      if (selectedStretches.length === 0) {
        Alert.alert('No Stretches Selected', 'Please select at least one stretch for your routine.');
        return;
      }

      // Check if meets minimum time requirement
      if (!meetsMinimumRequirement()) {
        Alert.alert('Time Requirement Not Met', `Your routine is too short. It needs to meet the minimum time requirement for a ${selectedDuration}-minute routine.`);
        return;
      }

      // Get existing custom routines
      const existingRoutines = await getCustomRoutines();

      // Check if we've reached the maximum limit
      if (existingRoutines.length >= MAX_CUSTOM_ROUTINES) {
        Alert.alert(
          'Maximum Routines Reached',
          `You can save up to ${MAX_CUSTOM_ROUTINES} custom routines. Please delete some before adding more.`
        );
        return;
      }

      // Prepare routine data - save bilateral flags for each stretch
      const stretchesData = selectedStretches.map(stretch => {
        if ('isRest' in stretch) {
          return {
            id: stretch.id,
            isRest: true
          };
        } else {
          return {
            id: stretch.id,
            bilateral: stretch.bilateral || false
          };
        }
      });

      const routineData = {
        name: routineName.trim(),
        area: selectedArea,
        duration: selectedDuration,
        customStretches: stretchesData
      };

      // Save to storage
      console.log('Saving custom routine:', routineData);
      const success = await saveCustomRoutineToStorage(routineData);

      if (success) {
        // Show success message
        setIsSaving(true);
        
        // Removed automatic saving to favorites
        // Now custom routines will not automatically be added to favorites

        // Reset form
        setRoutineName('');
        setSelectedArea('Full Body');
        setSelectedDuration('10');
        setSelectedStretches([]);

        // Reload routines list
        await loadCustomRoutines();

        // Switch to "My Routines" tab
        setActiveTab('routines');

        // Hide saving indicator after a delay
        setTimeout(() => {
          setIsSaving(false);
        }, 1500);
      } else {
        throw new Error('Failed to save routine');
      }
    } catch (error) {
      console.error('Error saving custom routine:', error);
      Alert.alert('Error', 'Failed to save your custom routine.');
    }
  };
  
  // Start a custom routine
  const startCustomRoutine = (routine: CustomRoutine) => {
    console.log('Starting custom routine:', routine.name, 'with', 
                routine.customStretches?.length || 0, 'stretches');
    
    let params: RoutineParams = {
      area: routine.area,
      duration: routine.duration,
      position: 'All' // Default level
    };
    
    // Add custom stretches if available
    if (routine.customStretches && routine.customStretches.length > 0) {
      console.log('Custom stretches found, processing', routine.customStretches.length, 'items');
      
      // Debug the custom stretches IDs and types
      routine.customStretches.forEach((s, i) => {
        console.log(`Stretch ${i}: ID=${s.id}, type=${typeof s.id}, isRest=${s.isRest || false}`);
      });
      
      // Create a detailed array of stretches with all properties needed
      const selectedStretchDetails = routine.customStretches.map(s => {
        if (s.isRest) {
          // Handle rest periods
          const restPeriodId = s.id.toString();
          console.log(`Processing rest period: ${restPeriodId}`);
          
          // Find matching rest period from our predefined options
          if (restPeriodId === 'rest-15') {
            return { 
              id: 'rest-15', 
              name: "15-Second Break", 
              description: "A short rest to reset between stretches",
              duration: 15,
              isRest: true
            };
          } else if (restPeriodId === 'rest-30') {
            return { 
              id: 'rest-30', 
              name: "30-Second Break", 
              description: "A medium rest between stretches",
              duration: 30,
              isRest: true
            };
          } else if (restPeriodId === 'rest-60') {
            return { 
              id: 'rest-60', 
              name: "1-Minute Break", 
              description: "A longer rest between stretches",
              duration: 60,
              isRest: true
            };
          }
          return null;
        } else {
          // Handle regular stretches
          console.log(`Looking for stretch with ID: ${s.id} (${typeof s.id})`);
          
          const stretchDetail = stretches.find(stretch => 
            // Convert both IDs to strings for consistent comparison
            String(stretch.id) === String(s.id)
          );
          
          if (stretchDetail) {
            console.log(`✅ Found matching stretch: ${stretchDetail.name}, ID=${stretchDetail.id}`);
            // Create a deep copy of the stretch detail with all properties
            const stretchCopy = {...stretchDetail};
            
            // Ensure the bilateral flag is set correctly based on saved value
            if (s.bilateral !== undefined) {
              stretchCopy.bilateral = s.bilateral;
            }
            
            return stretchCopy;
          }
          
          console.log(`❌ Could not find stretch with ID ${s.id} - will be filtered out`);
          return null;
        }
      }).filter(Boolean) as (Stretch | CustomRestPeriod)[];
      
      // Log the final set of stretches being used
      console.log(`Final routine has ${selectedStretchDetails.length} items:`, 
                  selectedStretchDetails.map(s => `${s.name} (${s.id})`).join(', '));
      
      // Save the detailed stretches to params
      params.customStretches = selectedStretchDetails;
      
      console.log(`Starting routine with ${selectedStretchDetails.length} items (including ${
        selectedStretchDetails.filter(s => 'isRest' in s).length} rest periods)`);
    }
    
    // Also save the customStretches IDs and properties to the routine params for future reference
    if (routine.customStretches) {
      (params as any).savedCustomStretches = routine.customStretches;
    }
    
    onStartRoutine(params);
    onClose();
  };
  
  // Delete a custom routine
  const deleteCustomRoutine = (id: string) => {
    Alert.alert(
      'Delete Routine',
      'Are you sure you want to delete this routine?',
      [
        { 
          text: 'Cancel', 
          style: 'cancel' 
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await deleteCustomRoutineFromStorage(id);
              
              if (success) {
                // Update the local state
                setCustomRoutines(customRoutines.filter(routine => routine.id !== id));
              } else {
                throw new Error('Failed to delete routine');
              }
            } catch (error) {
              console.error('Error deleting custom routine:', error);
              Alert.alert('Error', 'Failed to delete the routine.');
            }
          }
        }
      ]
    );
  };
  
  // Open the stretch selector
  const openStretchSelector = () => {
    setShowStretchSelector(true);
  };
  
  // Handle stretches selected
  const handleStretchesSelected = (stretches: (Stretch | CustomRestPeriod)[]) => {
    console.log('handleStretchesSelected called with', stretches.length, 'stretches');
    setSelectedStretches(stretches);
  };
  
  // Handle closing the stretch selector
  const handleCloseStretchSelector = () => {
    console.log('handleCloseStretchSelector called - closing StretchSelector modal');
    setShowStretchSelector(false);
  };
  
  // Get minimum time requirement based on duration
  const getMinimumTimeRequirement = () => {
    const durationValue = parseInt(selectedDuration);
    
    // Set minimum required minutes based on selected duration
    let minimumMinutes = 1.5;  // Default for 5-minute routines
    
    if (durationValue === 10) {
      minimumMinutes = 6;
    } else if (durationValue === 15) {
      minimumMinutes = 11;
    }
    
    return minimumMinutes * 60; // Convert to seconds
  };
  
  // Format custom stretches info
  const formatCustomStretchesInfo = () => {
    if (selectedStretches.length === 0) {
      return 'No stretches selected yet';
    }
    
    // Calculate total time including rest periods
    const totalTime = selectedStretches.reduce((total, stretch) => {
      if ('isRest' in stretch) {
        return total + stretch.duration;
      }
      return total + (stretch.bilateral ? stretch.duration * 2 : stretch.duration);
    }, 0);
    
    const targetTime = parseInt(selectedDuration) * 60;
    const stretchCount = selectedStretches.filter(s => !('isRest' in s)).length;
    const restCount = selectedStretches.filter(s => 'isRest' in s).length;
    
    // Format time in minutes
    const minutes = Math.floor(totalTime / 60);
    const seconds = totalTime % 60;
    const timeDisplay = seconds > 0 ? 
      `${minutes}m ${seconds}s` : 
      `${minutes}m`;
      
    // Get minimum time requirement
    const minimumTimeRequired = getMinimumTimeRequirement();
    
    // Check if time meets minimum requirement
    if (totalTime < minimumTimeRequired) {
      const minMinutes = Math.floor(minimumTimeRequired / 60);
      const minSeconds = minimumTimeRequired % 60;
      const minTimeDisplay = minSeconds > 0 ? 
        `${minMinutes}m ${minSeconds}s` : 
        `${minMinutes}m`;
        
      return `${stretchCount} stretches, ${restCount} breaks (${timeDisplay}) - Minimum ${minTimeDisplay} required`;
    }
    
    return `${stretchCount} stretches, ${restCount} breaks (${timeDisplay})`;
  };
  
  // Check if current selection meets minimum requirement
  const meetsMinimumRequirement = () => {
    if (selectedStretches.length === 0) {
      return true; // No need to check if no stretches selected
    }
    
    // Calculate total time
    const totalTime = selectedStretches.reduce((total, stretch) => {
      if ('isRest' in stretch) {
        return total + stretch.duration;
      }
      return total + (stretch.bilateral ? stretch.duration * 2 : stretch.duration);
    }, 0);
    
    // Get minimum time requirement
    const minimumTimeRequired = getMinimumTimeRequirement();
    
    return totalTime >= minimumTimeRequired;
  };
  
  // Add a rest period to selected stretches
  const addRestPeriod = (restPeriod: CustomRestPeriod) => {
    setSelectedStretches(prev => [...prev, restPeriod]);
  };
  
  // Remove a stretch or rest period at specific index
  const removeItem = (index: number) => {
    const updatedStretches = [...selectedStretches];
    updatedStretches.splice(index, 1);
    setSelectedStretches(updatedStretches);
  };
  
  // Move an item in the selected stretches array
  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= selectedStretches.length) return;
    
    const updatedStretches = [...selectedStretches];
    const item = updatedStretches[fromIndex];
    updatedStretches.splice(fromIndex, 1);
    updatedStretches.splice(toIndex, 0, item);
    setSelectedStretches(updatedStretches);
  };

  // Handle smart routine generation
  const handleSmartRoutineGenerated = async (generatedStretches: Stretch[], smartRoutineInput?: { 
    description: string;
    issueType: string;
    duration: Duration;
    area?: BodyArea;
  }) => {
    try {
      console.log(`SMART ROUTINE DEBUG: Received ${generatedStretches.length} stretches`);
      
      // Check if user has premium access
      const hasPremiumAccess = await rewardManager.isRewardUnlocked('premium_stretches');
      console.log(`SMART ROUTINE DEBUG: User has premium access: ${hasPremiumAccess}`);
      
      const validatedStretches = generatedStretches
        // Filter out premium stretches if user doesn't have access
        .filter(stretch => !stretch.premium || hasPremiumAccess)
        // Map to ensure all properties are properly set
        .map(stretch => {
          // Create a safe copy with all required fields
          const stretchCopy = {
            // Convert ID to string to ensure compatibility with ActiveRoutine
            id: typeof stretch.id === 'number' ? String(stretch.id) : stretch.id,
            
            // Ensure name exists
            name: stretch.name || 'Unnamed Stretch',
            
            // Ensure description exists
            description: stretch.description || 'Follow the instructions for this stretch carefully.',
            
            // Ensure duration is a number
            duration: typeof stretch.duration === 'number' ? stretch.duration : 30,
            
            // Ensure tags is an array
            tags: Array.isArray(stretch.tags) && stretch.tags.length > 0 
              ? stretch.tags 
              : [smartRoutineInput?.area || selectedArea],
            
            // Ensure level exists
            position: stretch.position || 'All',
            
            // Ensure image exists
            image: stretch.image || { 
              uri: `https://via.placeholder.com/200/673AB7/FFFFFF?text=${encodeURIComponent(stretch.name || 'Stretch')}` 
            },
            
            // Set bilateral property
            bilateral: !!stretch.bilateral,
            
            // Optional premium property - ensure it's filtered already
            premium: !!stretch.premium && hasPremiumAccess
          };
          
          return stretchCopy;
        });
      
      console.log(`SMART ROUTINE DEBUG: Validated ${validatedStretches.length} stretches`);
      
      if (validatedStretches.length === 0) {
        Alert.alert('Error', 'No valid stretches could be generated. Please try again with different input.');
        return;
      }
      
      // Create the routine parameters
      const routineParams: RoutineParams = {
        area: smartRoutineInput?.area || selectedArea,
        duration: smartRoutineInput?.duration || selectedDuration as Duration,
        position: 'All',
        customStretches: validatedStretches
      };
      
      
      // If generated from SmartRoutineGenerator, save it to custom routines
      if (smartRoutineInput) {
        try {
          // Create a name for the routine based on input description
          const routineName = generateSmartRoutineName(smartRoutineInput);
          
          // Create routine object
          const newRoutine: any = {
            name: routineName,
            area: routineParams.area,
            duration: routineParams.duration,
            customStretches: validatedStretches.map(stretch => ({ id: stretch.id }))
          };
          
          // Save to storage
          const success = await saveCustomRoutineToStorage(newRoutine);
          
          if (success) {
            // Reload routines to include the newly saved one
            await loadCustomRoutines();
            
          }
        } catch (error) {
          console.error('Error saving smart routine as custom routine:', error);
          // Continue with the routine even if saving fails
        }
      }
      
      // Start the routine
      onStartRoutine(routineParams);
      onClose();
    } catch (error) {
      console.error('Error in handleSmartRoutineGenerated:', error);
      Alert.alert('Error', 'There was a problem generating your routine. Please try again.');
    }
  };

  // Generate a meaningful name for a smart routine
  const generateSmartRoutineName = (input: { 
    description: string;
    issueType: string;
    duration: Duration;
    area?: BodyArea;
  }): string => {
    // Create a smart name based on the issue type and description
    const area = input.area || 'Full Body';
    const issueType = input.issueType.charAt(0).toUpperCase() + input.issueType.slice(1);
    const durationMin = input.duration;
    
    let name = '';
    
    // Try to extract a meaningful name from the description
    const description = input.description.trim();
    if (description.length > 0) {
      // Try to create a more descriptive name
      if (description.length <= 30) {
        // If it's a short description, capitalize first letter and use it as is
        name = `${description.charAt(0).toUpperCase() + description.slice(1)} (${durationMin}min)`;
      } else {
        // If it's longer, truncate it
        name = `${description.substring(0, 27).trim()}... (${durationMin}min)`;
      }
    } else {
      // Fallback to generic name based on area and issue
      name = `${area} ${issueType} Routine (${durationMin}min)`;
    }
    
    return name;
  };

  // If hasAccess is null, we're still loading
  if (hasAccess === null) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
        <SafeAreaView style={[
          styles.container,
          { backgroundColor: isDark ? theme.background : '#f5f5f5' }
        ]}>
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Checking access...
            </Text>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[
        styles.container,
        { backgroundColor: isDark ? theme.background : '#f5f5f5' }
      ]}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={[styles.closeButton, { backgroundColor: isDark ? theme.backgroundLight : '#fff' }]} 
            onPress={onClose}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Custom Routines</Text>
        </View>
        
        {!hasAccess ? (
          // Show premium teaser if user doesn't have access
          <PremiumTeaser
            theme={theme}
            isDark={isDark}
            requiredLevel={requiredLevel}
            refreshFeatureAccess={refreshFeatureAccess}
            onClose={onClose}
            userLevel={userLevel}
            isPremium={isPremium}
          />
        ) : (
          // Show regular content if user has access
          <>
            {/* Mode toggle for smart/custom selection */}
            <View style={styles.modeToggleContainer}>
              <Text style={[styles.modeToggleLabel, { color: theme.text }]}>
                Creation Mode:
              </Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    !isCustomMode && styles.segmentButtonActive,
                    { backgroundColor: !isCustomMode ? theme.accent : isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }
                  ]}
                  onPress={() => setIsCustomMode(false)}
                >
                  <Text style={[
                    styles.segmentButtonText,
                    { color: !isCustomMode ? '#fff' : theme.text }
                  ]}>
                    Smart
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    isCustomMode && styles.segmentButtonActive,
                    { backgroundColor: isCustomMode ? theme.accent : isDark ? 'rgba(255,255,255,0.1)' : '#f0f0f0' }
                  ]}
                  onPress={() => setIsCustomMode(true)}
                >
                  <Text style={[
                    styles.segmentButtonText,
                    { color: isCustomMode ? '#fff' : theme.text }
                  ]}>
                    Manual
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Tab navigation */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'routines' && { borderBottomColor: theme.accent, borderBottomWidth: 2 }
                ]}
                onPress={() => setActiveTab('routines')}
              >
                <Text 
                  style={[
                    styles.tabText, 
                    { color: activeTab === 'routines' ? theme.accent : theme.textSecondary }
                  ]}
                >
                  My Routines
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.tabButton,
                  activeTab === 'create' && { borderBottomColor: theme.accent, borderBottomWidth: 2 }
                ]}
                onPress={() => setActiveTab('create')}
              >
                <Text 
                  style={[
                    styles.tabText, 
                    { color: activeTab === 'create' ? theme.accent : theme.textSecondary }
                  ]}
                >
                  Create New
                </Text>
              </TouchableOpacity>
            </View>

            {/* Tab content */}
            {activeTab === 'routines' && (
              <ScrollView 
                style={styles.tabContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
              >
                {customRoutines.length > 0 ? (
                  <RoutineList
                    customRoutines={customRoutines}
                    startCustomRoutine={startCustomRoutine}
                    deleteCustomRoutine={deleteCustomRoutine}
                    theme={theme}
                    isDark={isDark}
                    MAX_CUSTOM_ROUTINES={MAX_CUSTOM_ROUTINES}
                  />
                ) : (
                  <View style={styles.emptyStateContainer}>
                    <Ionicons 
                      name="fitness-outline" 
                      size={70} 
                      color={isDark ? theme.textSecondary : '#ccc'} 
                    />
                    <Text style={[styles.emptyStateTitle, { color: theme.text }]}>
                      No Custom Routines Yet
                    </Text>
                    <Text style={[styles.emptyStateDescription, { color: theme.textSecondary }]}>
                      Create your first custom routine or use the AI powered generator to get started.
                    </Text>
                    <TouchableOpacity
                      style={[styles.createEmptyButton, { backgroundColor: theme.accent }]}
                      onPress={() => setActiveTab('create')}
                    >
                      <Text style={styles.createEmptyButtonText}>Create New Routine</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            )}

            {activeTab === 'create' && (
              <ScrollView 
                style={styles.tabContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
              >
                <View style={[
                  styles.createForm,
                  { backgroundColor: isDark ? theme.cardBackground : '#fff' }
                ]}>
                  <Text style={[
                    styles.formTitle,
                    { color: theme.text }
                  ]}>
                    {isCustomMode ? 'Create Custom Routine' : 'Smart Routine Generator (Beta)'}
                  </Text>
                  
                  <Text style={[styles.formDescription, { color: theme.textSecondary }]}>
                    {isCustomMode 
                      ? 'Select your own stretches and create a personalized routine.' 
                      : 'Describe your needs in natural language, and I\'ll create a personalized routine for you.'}
                  </Text>
                  
                  {isCustomMode ? (
                    <CustomForm
                      theme={theme}
                      isDark={isDark}
                      routineName={routineName}
                      setRoutineName={setRoutineName}
                      selectedArea={selectedArea}
                      setSelectedArea={setSelectedArea}
                      selectedDuration={selectedDuration}
                      setSelectedDuration={setSelectedDuration}
                      selectedStretches={selectedStretches}
                      setSelectedStretches={setSelectedStretches}
                      openStretchSelector={openStretchSelector}
                      addRestPeriod={addRestPeriod}
                      removeItem={removeItem}
                      moveItem={moveItem}
                      saveCustomRoutine={saveCustomRoutine}
                      restPeriods={restPeriods}
                      formatCustomStretchesInfo={formatCustomStretchesInfo}
                      meetsMinimumRequirement={meetsMinimumRequirement}
                      isCustomMode={isCustomMode}
                    />
                  ) : (
                    <View style={styles.smartModeContainer}>
                      <SmartRoutineGenerator onRoutineGenerated={handleSmartRoutineGenerated} />
                    </View>
                  )}
                </View>
              </ScrollView>
            )}
          </>
        )}
        
        {/* Stretch Selector Modal */}
        <Modal
          visible={showStretchSelector}
          animationType="slide"
          transparent={false}
          onRequestClose={handleCloseStretchSelector}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <StretchSelector
              area={selectedArea}
              duration={selectedDuration}
              selectedStretches={selectedStretches}
              onStretchesSelected={handleStretchesSelected}
              onClose={handleCloseStretchSelector}
            />
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
    marginBottom: 8,
  },
  createForm: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  formDescription: {
    fontSize: 14,
    marginBottom: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  smartModeContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
  },
  modeToggleLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tabButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tabContent: {
    flex: 1,
  },
  emptyStateContainer: {
    padding: 40,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  createEmptyButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 16,
  },
  createEmptyButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  segmentButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    minWidth: 80,
  },
  segmentButtonActive: {
    // No bottom border needed with filled background
  },
  segmentButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default CustomRoutineModal; 