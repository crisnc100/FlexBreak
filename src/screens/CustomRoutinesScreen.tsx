import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useNavigation } from '@react-navigation/native';
import { BodyArea, Duration, RoutineParams, AppNavigationProp } from '../types';
import { saveFavoriteRoutine, saveCustomRoutine as saveCustomRoutineToStorage, getCustomRoutines, deleteCustomRoutine as deleteCustomRoutineFromStorage } from '../services/storageService';
import { tw } from '../utils/tw';

// Storage key constants
const STORAGE_KEY = '@customRoutines';

// Interface for custom routine
interface CustomRoutine {
  id: string;
  name: string;
  area: BodyArea;
  duration: Duration;
  timestamp: string;
}

export default function CustomRoutinesScreen() {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<AppNavigationProp>();
  
  // State variables
  const [customRoutines, setCustomRoutines] = useState<CustomRoutine[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [routineName, setRoutineName] = useState('');
  const [selectedArea, setSelectedArea] = useState<BodyArea>('Neck');
  const [selectedDuration, setSelectedDuration] = useState<Duration>('5');
  
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
  
  // Load saved custom routines
  useEffect(() => {
    loadCustomRoutines();
  }, []);
  
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
      const newRoutine = {
        name: routineName.trim(),
        area: selectedArea,
        duration: selectedDuration
      };
      
      // Save to storage service
      const success = await saveCustomRoutineToStorage(newRoutine);
      
      if (success) {
        // Also save as a favorite routine
        await saveFavoriteRoutine(newRoutine);
        
        // Reset form
        setRoutineName('');
        setShowCreateForm(false);
        
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
    const routineParams: RoutineParams = {
      area: routine.area,
      duration: routine.duration,
      level: 'intermediate' // Default level
    };
    
    navigation.navigate('Routine', routineParams);
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
  
  return (
    <View style={[
      styles.container,
      { backgroundColor: isDark ? theme.background : '#f5f5f5' }
    ]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  }
}); 