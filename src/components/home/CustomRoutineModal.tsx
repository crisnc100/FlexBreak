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
  Switch
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

// Max number of custom routines a user can save
const MAX_CUSTOM_ROUTINES = 10;

// Interface for custom routine
interface CustomRoutine {
  id: string;
  name: string;
  area: BodyArea;
  duration: Duration;
  timestamp: string;
  customStretches?: { id: number }[];
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
  const [selectedStretches, setSelectedStretches] = useState<Stretch[]>([]);
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
      
      const newRoutine: any = {
        name: routineName.trim(),
        area: selectedArea,
        duration: selectedDuration
      };
      
      // Add selected stretches if using custom stretches
      if (useCustomStretches && selectedStretches.length > 0) {
        newRoutine.customStretches = selectedStretches.map(stretch => ({ id: stretch.id }));
      }
      
      // If not enough stretches were selected, inform the user
      if (useCustomStretches && selectedStretches.length > 0) {
        const totalTime = selectedStretches.reduce((total, stretch) => 
          total + (stretch.bilateral ? stretch.duration * 2 : stretch.duration), 0);
        const targetTime = parseInt(selectedDuration) * 60;
        
        if (totalTime < targetTime) {
          Alert.alert(
            'Incomplete Routine',
            `You've selected stretches that cover ${Math.floor(totalTime/60)} minutes of your ${selectedDuration} minute routine. We'll add suitable stretches to complete your routine when you start it.`,
            [{ text: 'OK' }]
          );
        }
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
        const stretchDetail = stretches.find(stretch => stretch.id === s.id);
        return stretchDetail;
      }).filter(Boolean) as Stretch[];
      
      params.customStretches = selectedStretchDetails;
      
      console.log(`Starting routine with ${selectedStretchDetails.length} custom stretches`);
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
  const handleStretchesSelected = (stretches: Stretch[]) => {
    setSelectedStretches(stretches);
    setShowStretchSelector(false);
  };
  
  // Format custom stretches info
  const formatCustomStretchesInfo = () => {
    if (selectedStretches.length === 0) {
      return 'No stretches selected yet';
    }
    
    const totalTime = selectedStretches.reduce((total, stretch) => 
      total + (stretch.bilateral ? stretch.duration * 2 : stretch.duration), 0);
    const targetTime = parseInt(selectedDuration) * 60;
    
    const coverage = Math.floor((totalTime / targetTime) * 100);
    
    return `${selectedStretches.length} stretches (${coverage}% of routine)`;
  };
  
  // Render a routine item
  const renderRoutineItem = ({ item }: { item: CustomRoutine }) => (
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
          {item.customStretches && ` • ${item.customStretches.length} custom stretches`}
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
                <Text style={[styles.switchSubLabel, { color: theme.textSecondary }]}>
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
                  {selectedStretches.length > 0 ? 'Edit selected stretches' : 'Select stretches'}
                </Text>
                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: theme.accent }
              ]}
              onPress={saveCustomRoutine}
            >
              <Text style={styles.saveButtonText}>Save Routine</Text>
            </TouchableOpacity>
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
          <FlatList
            data={customRoutines}
            renderItem={renderRoutineItem}
            keyExtractor={item => item.id}
            style={styles.routinesList}
            contentContainerStyle={styles.listContent}
          />
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
        
        {modalContent()}
        
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
              onClose={() => setShowStretchSelector(false)}
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
    flex: 1,
  },
  listContent: {
    padding: 16,
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
});

export default CustomRoutineModal; 