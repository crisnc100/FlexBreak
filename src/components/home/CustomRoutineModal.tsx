import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  TextInput, 
  Alert,
  Modal,
  SafeAreaView,
  Switch,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { BodyArea, Duration, RoutineParams, Stretch } from '../../types';
import { 
  saveFavoriteRoutine, 
  saveCustomRoutine as saveCustomRoutineToStorage, 
  getCustomRoutines, 
  deleteCustomRoutine as deleteCustomRoutineFromStorage 
} from '../../services/storageService';
import { usePremium } from '../../context/PremiumContext';
import { useFeatureAccess } from '../../hooks/progress/useFeatureAccess';
import StretchSelector from './StretchSelector';
import stretches from '../../data/stretches';

// Define a rest period type
interface RestPeriod {
  id: string;
  name: string;
  description: string;
  duration: number;
  isRest: true;
}

// Max number of custom routines a user can save
const MAX_CUSTOM_ROUTINES = 10;

// Interface for custom routine
interface CustomRoutine {
  id: string;
  name: string;
  area: BodyArea;
  duration: Duration;
  timestamp: string;
  customStretches?: { id: number | string; isRest?: boolean }[];
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
  const { canAccessFeature, getRequiredLevel, refreshAccess } = useFeatureAccess();
  
  // State variables
  const [customRoutines, setCustomRoutines] = useState<CustomRoutine[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [selectedArea, setSelectedArea] = useState<BodyArea>('Neck');
  const [selectedDuration, setSelectedDuration] = useState<Duration>('5');
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [showStretchSelector, setShowStretchSelector] = useState(false);
  const [selectedStretches, setSelectedStretches] = useState<(Stretch | RestPeriod)[]>([]);
  const [useCustomStretches, setUseCustomStretches] = useState(false);
  
  // Body area options
  const bodyAreas: BodyArea[] = [
    'Full Body', 'Lower Back', 'Upper Back & Chest', 'Neck', 'Hips & Legs', 'Shoulders & Arms'
  ];
  
  // Duration options
  const durations: { value: Duration; label: string }[] = [
    { value: '5', label: '5 minutes' },
    { value: '10', label: '10 minutes' },
    { value: '15', label: '15 minutes' }
  ];

  // Rest period options
  const restPeriods: RestPeriod[] = [
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
  
  // Refresh feature access
  const refreshFeatureAccess = async () => {
    console.log('Refreshing feature access for custom routines...');
    // Refresh premium status first
    await refreshPremiumStatus();
    // Then refresh feature access
    await refreshAccess();
    // Update access state
    const access = isPremium && canAccessFeature('custom_routines');
    console.log('Current premium status:', isPremium);
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
  
  // Save custom routine
  const saveCustomRoutine = async () => {
    if (!routineName.trim()) {
      Alert.alert('Name Required', 'Please enter a name for your routine.');
      return;
    }
    
    try {
      // Check if maximum number of routines has been reached
      if (customRoutines.length >= MAX_CUSTOM_ROUTINES) {
        Alert.alert(
          'Maximum Routines Reached',
          `You can save up to ${MAX_CUSTOM_ROUTINES} custom routines. Please delete some to make room for new ones.`,
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Validate minimum time requirements when using custom stretches
      if (useCustomStretches && selectedStretches.length > 0) {
        // Calculate total time
        const totalTime = selectedStretches.reduce((total, stretch) => {
          if ('isRest' in stretch) {
            return total + stretch.duration;
          }
          return total + (stretch.bilateral ? stretch.duration * 2 : stretch.duration);
        }, 0);
        
        // Convert to minutes for easier comparison
        const totalMinutes = totalTime / 60;
        const durationValue = parseInt(selectedDuration);
        
        // Set minimum required minutes based on selected duration
        let minimumMinutes = 1.5;  // Default for 5-minute routines
        
        if (durationValue === 10) {
          minimumMinutes = 6;
        } else if (durationValue === 15) {
          minimumMinutes = 11;
        }
        
        // Check if total time meets minimum requirements
        if (totalMinutes < minimumMinutes) {
          Alert.alert(
            'More Content Needed',
            `For a ${durationValue}-minute routine, please add at least ${minimumMinutes} minutes of content. You currently have ${totalMinutes.toFixed(1)} minutes.`,
            [{ text: 'OK' }]
          );
          return;
        }
      }
      
      const newRoutine: any = {
        name: routineName.trim(),
        area: selectedArea,
        duration: selectedDuration
      };
      
      // Add selected stretches if using custom stretches
      if (useCustomStretches && selectedStretches.length > 0) {
        newRoutine.customStretches = selectedStretches.map(stretch => {
          if ('isRest' in stretch) {
            return { id: stretch.id, isRest: true };
          }
          return { id: stretch.id };
        });
      }
      
      // Save to storage service
      const success = await saveCustomRoutineToStorage(newRoutine);
      
      if (success) {
        // Also save as a favorite routine
        await saveFavoriteRoutine(newRoutine);
        
        // Reset form
        setRoutineName('');
        setShowCreateForm(false);
        setSelectedStretches([]);
        setUseCustomStretches(false);
        
        // Reload routines to get the updated list with IDs
        await loadCustomRoutines();
        
        Alert.alert('Success', 'Your custom routine has been saved!');
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
    let params: RoutineParams = {
      area: routine.area,
      duration: routine.duration,
      level: 'intermediate' // Default level
    };
    
    // Add custom stretches if available
    if (routine.customStretches && routine.customStretches.length > 0) {
      const selectedStretchDetails = routine.customStretches.map(s => {
        if (s.isRest) {
          // Handle rest periods
          const restPeriodId = s.id.toString();
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
          const stretchDetail = stretches.find(stretch => stretch.id === s.id);
          return stretchDetail;
        }
      }).filter(Boolean) as (Stretch | RestPeriod)[];
      
      params.customStretches = selectedStretchDetails;
      
      console.log(`Starting routine with ${selectedStretchDetails.length} items (including ${
        selectedStretchDetails.filter(s => 'isRest' in s).length} rest periods)`);
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
  const handleStretchesSelected = (stretches: (Stretch | RestPeriod)[]) => {
    setSelectedStretches(stretches);
    // Don't close the modal - let the user close it manually
  };
  
  // Handle closing the stretch selector
  const handleCloseStretchSelector = () => {
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
    if (!useCustomStretches || selectedStretches.length === 0) {
      return true; // No need to check if not using custom stretches
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
  const addRestPeriod = (restPeriod: RestPeriod) => {
    setSelectedStretches([...selectedStretches, restPeriod]);
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
  
  // Render a routine item
  const renderRoutineItem = ({ item }: { item: CustomRoutine }) => {
    // Calculate count of stretches and breaks
    let stretchCount = 0;
    let breakCount = 0;
    
    if (item.customStretches) {
      stretchCount = item.customStretches.filter(s => !s.isRest).length;
      breakCount = item.customStretches.filter(s => s.isRest).length;
    }
    
    return (
      <View style={[
        styles.routineItem,
        { backgroundColor: isDark ? theme.backgroundLight : '#fff' }
      ]}>
        <View style={styles.routineInfo}>
          <Text style={[
            styles.routineName,
            { color: theme.text }
          ]}>
            {item.name}
          </Text>
          <Text style={[
            styles.routineDetails,
            { color: theme.textSecondary }
          ]}>
            {item.area} • {item.duration} minutes
            {item.customStretches && ` • ${stretchCount} stretches${breakCount > 0 ? `, ${breakCount} breaks` : ''}`}
          </Text>
        </View>
        
        <View style={styles.routineActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => startCustomRoutine(item)}
          >
            <Ionicons name="play" size={18} color={theme.accent} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => deleteCustomRoutine(item.id)}
          >
            <Ionicons name="trash" size={18} color="#FF5252" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render a selected item (stretch or rest period)
  const renderSelectedItem = (item: Stretch | RestPeriod, index: number) => {
    const isRest = 'isRest' in item;
    
    return (
      <View 
        key={`${item.id}-${index}`} 
        style={[
          styles.selectedItemRow, 
          { backgroundColor: isDark ? theme.backgroundLight : '#f8f8f8' }
        ]}
      >
        <View style={styles.selectedItemInfo}>
          <View style={styles.itemIndexContainer}>
            <Text style={[styles.itemIndexText, { color: theme.textSecondary }]}>
              {index + 1}
            </Text>
          </View>
          
          <View style={{ flex: 1 }}>
            <Text style={[styles.selectedItemName, { color: theme.text }]}>
              {item.name}
            </Text>
            <Text style={[styles.selectedItemDuration, { color: theme.textSecondary }]}>
              {isRest ? `${item.duration}s rest` : `${item.duration}s${(item as Stretch).bilateral ? ' (both sides)' : ''}`}
            </Text>
          </View>
        </View>
        
        <View style={styles.selectedItemActions}>
          {index > 0 && (
            <TouchableOpacity 
              style={styles.itemActionButton} 
              onPress={() => moveItem(index, index - 1)}
            >
              <Ionicons name="chevron-up" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
          
          {index < selectedStretches.length - 1 && (
            <TouchableOpacity 
              style={styles.itemActionButton} 
              onPress={() => moveItem(index, index + 1)}
            >
              <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.itemActionButton} 
            onPress={() => removeItem(index)}
          >
            <Ionicons name="close" size={20} color="#FF5252" />
          </TouchableOpacity>
        </View>
      </View>
    );
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

  const requiredLevel = getRequiredLevel('custom_routines');
  
  // Modal content
  const modalContent = () => {
    if (!hasAccess) {
      return (
        <View style={styles.premiumTeaser}>
          <Ionicons 
            name="lock-closed" 
            size={48} 
            color={isDark ? theme.textSecondary : '#ccc'} 
          />
          <Text style={[
            styles.premiumTeaserTitle,
            { color: theme.text }
          ]}>
            Premium Feature
          </Text>
          <Text style={[
            styles.premiumTeaserText,
            { color: theme.textSecondary }
          ]}>
            Custom Routines are available to premium users at level {requiredLevel}.
          </Text>
          <TouchableOpacity
            style={[
              styles.premiumButton,
              { backgroundColor: theme.accent }
            ]}
            onPress={() => {
              refreshFeatureAccess();
              onClose();
            }}
          >
            <Text style={styles.premiumButtonText}>Got it</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <>
        <View style={styles.header}>
          <Text style={[
            styles.screenTitle,
            { color: theme.text }
          ]}>
            Custom Routines
          </Text>
          
          <TouchableOpacity
            style={[
              styles.createButton,
              { backgroundColor: theme.accent }
            ]}
            onPress={() => setShowCreateForm(!showCreateForm)}
          >
            <Ionicons 
              name={showCreateForm ? "close" : "add"} 
              size={20} 
              color="#fff" 
            />
          </TouchableOpacity>
        </View>
        
        {/* Create Form */}
        {showCreateForm && (
          <View style={[
            styles.createForm,
            { backgroundColor: isDark ? theme.cardBackground : '#fff' }
          ]}>
            <Text style={[
              styles.formTitle,
              { color: theme.text }
            ]}>
              Create New Routine
            </Text>
            
            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <TextInput
                style={[
                  styles.textInput,
                  { 
                    color: theme.text,
                    backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5',
                    borderColor: theme.border
                  }
                ]}
                placeholder="Routine name"
                placeholderTextColor={theme.textSecondary}
                value={routineName}
                onChangeText={setRoutineName}
              />
              
              <Text style={[
                styles.formLabel,
                { color: theme.text }
              ]}>
                Area
              </Text>
              
              <View style={styles.optionsGrid}>
                {bodyAreas.map(area => (
                  <TouchableOpacity
                    key={area}
                    style={[
                      styles.optionButton,
                      { 
                        backgroundColor: selectedArea === area 
                          ? theme.accent 
                          : isDark ? theme.backgroundLight : '#f5f5f5'
                      }
                    ]}
                    onPress={() => setSelectedArea(area)}
                  >
                    <Text style={[
                      styles.optionText,
                      { color: selectedArea === area ? '#fff' : theme.text }
                    ]}>
                      {area}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={[
                styles.formLabel,
                { color: theme.text }
              ]}>
                Duration
              </Text>
              
              <View style={styles.durationOptions}>
                {durations.map(duration => (
                  <TouchableOpacity
                    key={duration.value}
                    style={[
                      styles.durationButton,
                      { 
                        backgroundColor: selectedDuration === duration.value 
                          ? theme.accent 
                          : isDark ? theme.backgroundLight : '#f5f5f5'
                      }
                    ]}
                    onPress={() => setSelectedDuration(duration.value)}
                  >
                    <Text style={[
                      styles.durationText,
                      { color: selectedDuration === duration.value ? '#fff' : theme.text }
                    ]}>
                      {duration.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <View style={styles.customStretchesOption}>
                <View style={styles.switchLabelContainer}>
                  <Text style={[styles.switchLabel, { color: theme.text }]}>
                    Choose specific stretches
                  </Text>
                  <Text style={[
                    styles.switchSubLabel, 
                    { 
                      color: useCustomStretches && !meetsMinimumRequirement() 
                        ? '#FF5252' 
                        : theme.textSecondary 
                    }
                  ]}>
                    {useCustomStretches ? formatCustomStretchesInfo() : 'We\'ll pick the best stretches for you'}
                  </Text>
                </View>
                <Switch
                  value={useCustomStretches}
                  onValueChange={setUseCustomStretches}
                  trackColor={{ false: '#767577', true: theme.accent + '50' }}
                  thumbColor={useCustomStretches ? theme.accent : '#f4f3f4'}
                />
              </View>
              
              {useCustomStretches && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Stretches</Text>
                  </View>
                  
                  <TouchableOpacity
                    style={[
                      styles.selectStretchesButton,
                      { 
                        backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5',
                        borderColor: theme.border
                      }
                    ]}
                    onPress={openStretchSelector}
                  >
                    <Ionicons 
                      name="fitness-outline" 
                      size={20} 
                      color={theme.accent}
                      style={styles.selectStretchesIcon} 
                    />
                    <Text style={[styles.selectStretchesText, { color: theme.text }]}>
                      {selectedStretches.filter(s => !('isRest' in s)).length > 0 
                        ? 'Edit selected stretches' 
                        : 'Select stretches'
                      }
                    </Text>
                    <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                  
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Add Rest Periods</Text>
                  </View>
                  
                  <View style={styles.restPeriodsContainer}>
                    {restPeriods.map((restPeriod) => (
                      <TouchableOpacity
                        key={restPeriod.id}
                        style={[
                          styles.restPeriodButton,
                          { backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5' }
                        ]}
                        onPress={() => addRestPeriod(restPeriod)}
                      >
                        <View style={styles.restPeriodIconContainer}>
                          <Ionicons name="time-outline" size={24} color={theme.accent} />
                        </View>
                        <View style={styles.restPeriodContent}>
                          <Text style={[styles.restPeriodName, { color: theme.text }]}>
                            {restPeriod.name}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={[styles.restPeriodDescription, { color: theme.textSecondary }]}
                          >
                            {restPeriod.description}
                          </Text>
                        </View>
                        <Ionicons name="add-circle" size={24} color={theme.accent} />
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {selectedStretches.length > 0 && (
                    <>
                      <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>
                          Your Routine Order
                        </Text>
                        <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                          Drag to reorder
                        </Text>
                      </View>
                      
                      <View style={styles.selectedItemsContainer}>
                        {selectedStretches.map((item, index) => (
                          renderSelectedItem(item, index)
                        ))}
                      </View>
                    </>
                  )}
                </>
              )}
              
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { 
                    backgroundColor: (useCustomStretches && !meetsMinimumRequirement()) 
                      ? '#CCCCCC' 
                      : theme.accent,
                    opacity: (useCustomStretches && !meetsMinimumRequirement()) ? 0.7 : 1
                  }
                ]}
                onPress={saveCustomRoutine}
                disabled={useCustomStretches && !meetsMinimumRequirement()}
              >
                <Text style={styles.saveButtonText}>
                  {(useCustomStretches && !meetsMinimumRequirement())
                    ? 'Add More Stretches First'
                    : 'Save Routine'
                  }
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
        
        {/* Warning about max routines */}
        {customRoutines.length >= MAX_CUSTOM_ROUTINES - 3 && (
          <View style={[
            styles.warningBox, 
            { backgroundColor: isDark ? theme.cardBackground : '#FFF9C4' }
          ]}>
            <Ionicons name="information-circle" size={20} color={isDark ? theme.textSecondary : '#FFA000'} />
            <Text style={[
              styles.warningText,
              { color: isDark ? theme.textSecondary : '#5D4037' }
            ]}>
              You have {MAX_CUSTOM_ROUTINES - customRoutines.length} routine slots remaining. Maximum is {MAX_CUSTOM_ROUTINES}.
            </Text>
          </View>
        )}
        
        {/* Routines List */}
        {customRoutines.length > 0 ? (
          <View style={styles.routinesList}>
            {customRoutines.map(item => (
              <View key={item.id} style={styles.routineItemContainer}>
                {renderRoutineItem({ item })}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons 
              name="fitness-outline" 
              size={48} 
              color={isDark ? theme.textSecondary : '#ccc'} 
            />
            <Text style={[
              styles.emptyText,
              { color: theme.textSecondary }
            ]}>
              You haven't created any custom routines yet.
            </Text>
            <Text style={[
              styles.emptySubtext,
              { color: theme.textSecondary }
            ]}>
              Tap the + button to create your first routine.
            </Text>
          </View>
        )}
      </>
    );
  };
  
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
        <TouchableOpacity 
          style={[styles.closeButton, { backgroundColor: isDark ? theme.backgroundLight : '#fff' }]} 
          onPress={onClose}
        >
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        
        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={true}
          bounces={true}
        >
          {modalContent()}
        </ScrollView>
        
        {/* Stretch Selector Modal */}
        <Modal
          visible={showStretchSelector}
          animationType="slide"
          transparent={false}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routinesList: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  routineItemContainer: {
    marginBottom: 12,
  },
  routineItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  routineDetails: {
    fontSize: 14,
    color: '#666',
  },
  routineActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  createForm: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    maxHeight: '80%',
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  textInput: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    backgroundColor: '#f5f5f5',
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  optionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#f5f5f5',
  },
  optionText: {
    fontSize: 14,
  },
  durationOptions: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  durationButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  durationText: {
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  premiumTeaser: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  premiumTeaserTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  premiumTeaserText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  premiumButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  premiumButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  customStretchesOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabelContainer: {
    flex: 1,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  switchSubLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  selectStretchesButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  selectStretchesIcon: {
    marginRight: 8,
  },
  selectStretchesText: {
    flex: 1,
    fontSize: 14,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9C4',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#5D4037',
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 12,
  },
  restPeriodsContainer: {
    marginBottom: 16,
  },
  restPeriodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  restPeriodIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  restPeriodContent: {
    flex: 1,
  },
  restPeriodName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  restPeriodDescription: {
    fontSize: 12,
  },
  selectedItemsContainer: {
    marginBottom: 16,
  },
  selectedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'space-between',
  },
  selectedItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemIndexContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemIndexText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedItemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedItemDuration: {
    fontSize: 12,
  },
  selectedItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemActionButton: {
    padding: 6,
  },
  scrollContainer: {
    flex: 1,
  },
});

export default CustomRoutineModal; 