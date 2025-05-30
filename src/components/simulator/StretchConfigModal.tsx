import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

// Options for configuration
const BODY_AREAS = ['Neck', 'Lower Back', 'Upper Back & Chest', 'Shoulders & Arms', 'Hips & Legs', 'Full Body'];
const POSITIONS = ['Standing', 'Sitting', 'Lying', 'All'];
const DURATIONS = [5, 10, 15];

// Add "Random" option
const RANDOM_OPTION = "Random";

// XP values for durations
const XP_RATES = {
  5: 30,   // 5 minutes = 30 XP
  10: 60,  // 10 minutes = 60 XP
  15: 90   // 15 minutes = 90 XP
};

interface StretchConfig {
  bodyArea: string;
  position: string;
  duration: number;
}

interface StretchConfigModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (config: StretchConfig) => void;
  initialConfig?: Partial<StretchConfig>;
  title?: string;
  isBatchMode?: boolean;
}

const StretchConfigModal = ({ 
  visible, 
  onClose, 
  onConfirm,
  initialConfig = {},
  title = 'Configure Stretch',
  isBatchMode = false
}: StretchConfigModalProps) => {
  const { theme, isDark } = useTheme();
  
  // State for configuration
  const [selectedArea, setSelectedArea] = useState<string>(
    initialConfig.bodyArea || BODY_AREAS[0]
  );
  const [selectedPosition, setSelectedPosition] = useState<string>(
    initialConfig.position || POSITIONS[0]
  );
  const [selectedDuration, setSelectedDuration] = useState<number | string>(
    initialConfig.duration || DURATIONS[1]
  );
  
  // Helper function to get random item from array
  const getRandomItem = <T extends unknown>(array: T[]): T => {
    return array[Math.floor(Math.random() * array.length)];
  };
  
  // Handle submission
  const handleSubmit = () => {
    // Handle random selections
    const finalArea = selectedArea === RANDOM_OPTION 
      ? getRandomItem(BODY_AREAS) 
      : selectedArea;
      
    const finalPosition = selectedPosition === RANDOM_OPTION 
      ? getRandomItem(POSITIONS) 
      : selectedPosition;
      
    const finalDuration = selectedDuration === RANDOM_OPTION 
      ? getRandomItem(DURATIONS) 
      : Number(selectedDuration);
    
    onConfirm({
      bodyArea: finalArea,
      position: finalPosition,
      duration: finalDuration as number
    });
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {title}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.configContainer}>
            {/* Instructions */}
            <View style={styles.instructionsContainer}>
              <Ionicons name="fitness-outline" size={24} color={theme.accent} />
              <Text style={[styles.instructions, { color: theme.textSecondary }]}>
                {isBatchMode 
                  ? 'Configure the stretches for a simulation. This will simulate one stretch per day with these settings.'
                  : 'Configure the stretch routine parameters for this simulation. Select "Random" for any option to have the system choose for you.'}
              </Text>
            </View>
            
            {/* Body Area Selection */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Body Area
            </Text>
            
            <View style={styles.optionsGrid}>
              {/* Add Random option to body areas */}
              <TouchableOpacity
                key={RANDOM_OPTION}
                style={[
                  styles.optionCard,
                  { 
                    backgroundColor: isDark ? '#4A2E85' : '#E1BEE7' 
                  },
                  selectedArea === RANDOM_OPTION && {
                    backgroundColor: isDark ? '#673AB7' : '#D1C4E9',
                    borderColor: theme.accent,
                    borderWidth: 1
                  }
                ]}
                onPress={() => setSelectedArea(RANDOM_OPTION)}
              >
                <View style={styles.randomOptionContent}>
                  <Ionicons name="shuffle" size={16} color={isDark ? '#E1BEE7' : '#673AB7'} />
                  <Text style={[
                    styles.optionText,
                    { color: isDark ? '#E1BEE7' : '#673AB7', fontWeight: 'bold' }
                  ]}>
                    {RANDOM_OPTION}
                  </Text>
                </View>
              </TouchableOpacity>
              
              {BODY_AREAS.map(area => (
                <TouchableOpacity
                  key={area}
                  style={[
                    styles.optionCard,
                    { backgroundColor: isDark ? '#2D2D2D' : '#f5f5f5' },
                    selectedArea === area && {
                      backgroundColor: isDark ? '#3D5A3D' : '#E8F5E9',
                      borderColor: theme.accent,
                      borderWidth: 1
                    }
                  ]}
                  onPress={() => setSelectedArea(area)}
                >
                  <Text style={[
                    styles.optionText,
                    { color: theme.text },
                    selectedArea === area && { color: theme.accent, fontWeight: 'bold' }
                  ]}>
                    {area}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Difficulty Selection */}
            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 16 }]}>
              Difficulty
            </Text>
            
            <View style={styles.difficultyContainer}>
              {/* Add Random option to difficulty */}
              <TouchableOpacity
                key={RANDOM_OPTION}
                style={[
                  styles.difficultyOption,
                  { 
                    backgroundColor: isDark ? '#4A2E85' : '#E1BEE7',
                    borderColor: selectedPosition === RANDOM_OPTION ? theme.accent : 'transparent',
                    borderWidth: selectedPosition === RANDOM_OPTION ? 2 : 0
                  }
                  ]}
                  onPress={() => setSelectedPosition(RANDOM_OPTION)}
              >
                <View style={styles.difficultyContent}>
                  <Ionicons 
                    name="shuffle" 
                    size={24} 
                    color={isDark ? '#E1BEE7' : '#673AB7'} 
                  />
                  <Text style={[
                    styles.difficultyText,
                    { color: isDark ? '#E1BEE7' : '#673AB7', fontWeight: 'bold' }
                  ]}>
                    {RANDOM_OPTION}
                  </Text>
                </View>
              </TouchableOpacity>
              
              {POSITIONS.map(position => (
                <TouchableOpacity
                  key={position}
                  style={[
                    styles.difficultyOption,
                    { 
                      backgroundColor: isDark ? '#2D2D2D' : '#f5f5f5',
                      borderColor: selectedPosition === position ? theme.accent : 'transparent',
                      borderWidth: selectedPosition === position ? 2 : 0
                    }
                  ]}
                  onPress={() => setSelectedPosition(position)}
                >
                  <View style={styles.difficultyContent}>
                    <Ionicons 
                      name={
                        position === 'Standing' ? 'leaf-outline' :
                        position === 'Sitting' ? 'flame-outline' :
                        position === 'Lying' ? 'flash-outline' : 'ellipse-outline'
                      } 
                      size={24} 
                      color={selectedPosition === position ? theme.accent : theme.textSecondary} 
                    />
                    <Text style={[
                      styles.difficultyText,
                      { color: theme.text },
                      selectedPosition === position && { color: theme.accent, fontWeight: 'bold' }
                    ]}>
                      {position}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Duration Selection */}
            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 16 }]}>
              Duration (minutes)
            </Text>
            
            <View style={styles.durationContainer}>
              {/* Add Random option to duration */}
              <TouchableOpacity
                key={RANDOM_OPTION}
                style={[
                  styles.durationOption,
                  { backgroundColor: isDark ? '#4A2E85' : '#E1BEE7' },
                  selectedDuration === RANDOM_OPTION && {
                    backgroundColor: isDark ? '#673AB7' : '#D1C4E9',
                    borderColor: theme.accent,
                    borderWidth: 1
                  }
                ]}
                onPress={() => setSelectedDuration(RANDOM_OPTION)}
              >
                <Text style={[
                  styles.durationValue,
                  { color: isDark ? '#E1BEE7' : '#673AB7', fontWeight: 'bold' }
                ]}>
                  {RANDOM_OPTION}
                </Text>
                <Text style={[styles.xpValue, { color: isDark ? '#E1BEE7' : '#673AB7' }]}>
                  Auto-select
                </Text>
              </TouchableOpacity>
              
              {DURATIONS.map(duration => (
                <TouchableOpacity
                  key={duration}
                  style={[
                    styles.durationOption,
                    { backgroundColor: isDark ? '#2D2D2D' : '#f5f5f5' },
                    selectedDuration === duration && {
                      backgroundColor: isDark ? '#3D5A3D' : '#E8F5E9',
                      borderColor: theme.accent,
                      borderWidth: 1
                    }
                  ]}
                  onPress={() => setSelectedDuration(duration)}
                >
                  <Text style={[
                    styles.durationValue,
                    { color: theme.text },
                    selectedDuration === duration && { color: theme.accent, fontWeight: 'bold' }
                  ]}>
                    {duration} min
                  </Text>
                  <Text style={[styles.xpValue, { color: theme.textSecondary }]}>
                    {XP_RATES[duration as keyof typeof XP_RATES]} XP
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Extra info for batch mode */}
            {isBatchMode && (
              <View style={[styles.batchInfoContainer, { backgroundColor: isDark ? '#2D2D2D' : '#FFF9C4' }]}>
                <Ionicons name="information-circle" size={24} color={isDark ? theme.accent : '#FFA000'} />
                <Text style={[styles.batchInfoText, { color: isDark ? theme.text : '#5D4037' }]}>
                  This will simulate 7 consecutive days with one stretch per day using these settings.
                  {selectedDuration !== RANDOM_OPTION ? 
                    ` Total XP earned: ${XP_RATES[selectedDuration as keyof typeof XP_RATES] * 7} XP` :
                    ' XP will be calculated based on randomly selected durations.'}
                </Text>
              </View>
            )}
          </ScrollView>
          
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.border }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: theme.accent }]}
              onPress={handleSubmit}
            >
              <Text style={styles.confirmButtonText}>
                {isBatchMode ? 'Start Simulation' : 'Confirm'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '85%',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  configContainer: {
    padding: 16,
  },
  instructionsContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  instructions: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  optionCard: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 14,
    textAlign: 'center',
  },
  difficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  difficultyContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  difficultyText: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  durationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  durationOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  durationValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  xpValue: {
    fontSize: 12,
    marginTop: 4,
  },
  batchInfoContainer: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  batchInfoText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  randomOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default StretchConfigModal; 