import React from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BodyArea, Duration, Stretch, CustomRestPeriod } from '../../../types';
import SelectedItemsList from './SelectedItemsList';
import RestPeriodSelector from './RestPeriodSelector';

interface CustomFormProps {
  theme: any;
  isDark: boolean;
  routineName: string;
  setRoutineName: (value: string) => void;
  selectedArea: BodyArea;
  setSelectedArea: (value: BodyArea) => void;
  selectedDuration: Duration;
  setSelectedDuration: (value: Duration) => void;
  selectedStretches: (Stretch | CustomRestPeriod)[];
  setSelectedStretches: (stretches: (Stretch | CustomRestPeriod)[]) => void;
  openStretchSelector: () => void;
  addRestPeriod: (restPeriod: CustomRestPeriod) => void;
  removeItem: (index: number) => void;
  moveItem: (fromIndex: number, toIndex: number) => void;
  saveCustomRoutine: () => void;
  restPeriods: CustomRestPeriod[];
  formatCustomStretchesInfo: () => string;
  meetsMinimumRequirement: () => boolean;
  isCustomMode: boolean;
}

const CustomForm: React.FC<CustomFormProps> = ({
  theme,
  isDark,
  routineName,
  setRoutineName,
  selectedArea,
  setSelectedArea,
  selectedDuration,
  setSelectedDuration,
  selectedStretches,
  openStretchSelector,
  addRestPeriod,
  removeItem,
  moveItem,
  saveCustomRoutine,
  restPeriods,
  formatCustomStretchesInfo,
  meetsMinimumRequirement,
  isCustomMode
}) => {
  // Body area options
  const bodyAreas: BodyArea[] = [
    'Dynamic Flow', 'Lower Back', 'Upper Back & Chest', 'Neck', 'Hips & Legs', 'Shoulders & Arms'
  ];
  
  // Duration options
  const durations: { value: Duration; label: string }[] = [
    { value: '5', label: '5 minutes' },
    { value: '10', label: '10 minutes' },
    { value: '15', label: '15 minutes' }
  ];

  return (
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
      
      <Text style={[styles.formLabel, { color: theme.text }]}>Area</Text>
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
      
      <Text style={[styles.formLabel, { color: theme.text }]}>Duration</Text>
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

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Select Stretches</Text>
        {selectedStretches.length > 0 && (
          <Text style={[styles.stretchCountText, { color: theme.textSecondary }]}>
            {formatCustomStretchesInfo()}
          </Text>
        )}
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
      
      {/* Rest Period Selector */}
      <RestPeriodSelector
        restPeriods={restPeriods}
        addRestPeriod={addRestPeriod}
        theme={theme}
        isDark={isDark}
      />
      
      {/* Selected Items List */}
      <SelectedItemsList
        selectedStretches={selectedStretches}
        moveItem={moveItem}
        removeItem={removeItem}
        theme={theme}
        isDark={isDark}
      />
      
      <TouchableOpacity
        style={[
          styles.saveButton,
          { 
            backgroundColor: !meetsMinimumRequirement() 
              ? '#CCCCCC' 
              : theme.accent,
            opacity: !meetsMinimumRequirement() ? 0.7 : 1
          }
        ]}
        onPress={saveCustomRoutine}
        disabled={!meetsMinimumRequirement()}
      >
        <Text style={styles.saveButtonText}>
          {!meetsMinimumRequirement()
            ? 'Add More Stretches First'
            : 'Save Routine'
          }
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
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
  stretchCountText: {
    fontSize: 12,
    marginTop: 4,
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
});

export default CustomForm; 