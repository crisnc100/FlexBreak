import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput,
  ScrollView,
  TouchableWithoutFeedback
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { tw } from '../../utils/tw';

interface CustomReminderModalProps {
  visible: boolean;
  message: string;
  days?: string[];
  frequency?: 'daily' | 'weekdays' | 'custom';
  onMessageChange: (message: string) => void;
  onDaysChange?: (days: string[]) => void;
  onFrequencyChange?: (frequency: 'daily' | 'weekdays' | 'custom') => void;
  onSave: (message: string) => void;
  onCancel: () => void;
  maxLength?: number;
  isCustomFrequencyEnabled?: boolean;
}

// Days of the week for selection
const DAYS_OF_WEEK = [
  { id: 'Mon', label: 'Monday' },
  { id: 'Tue', label: 'Tuesday' },
  { id: 'Wed', label: 'Wednesday' },
  { id: 'Thu', label: 'Thursday' },
  { id: 'Fri', label: 'Friday' },
  { id: 'Sat', label: 'Saturday' },
  { id: 'Sun', label: 'Sunday' },
];

// Frequency options
const FREQUENCY_OPTIONS = [
  { id: 'daily', label: 'Every day' },
  { id: 'weekdays', label: 'Weekdays only' },
  { id: 'custom', label: 'Custom days' },
];

/**
 * Modal for entering custom reminder messages and settings
 */
const CustomReminderModal: React.FC<CustomReminderModalProps> = ({
  visible,
  message,
  days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  frequency = 'daily',
  onMessageChange,
  onDaysChange,
  onFrequencyChange,
  onSave,
  onCancel,
  maxLength = 80,
  isCustomFrequencyEnabled = false
}) => {
  const { theme, isDark, isSunset } = useTheme();
  const [localMessage, setLocalMessage] = useState(message);
  const [localDays, setLocalDays] = useState(days);
  const [localFrequency, setLocalFrequency] = useState(frequency);
  const [activeTab, setActiveTab] = useState('message');
  
  // Reset state when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      setLocalMessage(message);
      setLocalDays(days);
      setLocalFrequency(frequency);
      setActiveTab('message');
    }
  }, [visible, message, days, frequency]);
  
  // Handle day selection
  const toggleDay = (dayId: string) => {
    let newDays;
    if (localDays.includes(dayId)) {
      // Don't allow removing the last day
      if (localDays.length === 1) return;
      newDays = localDays.filter(d => d !== dayId);
    } else {
      newDays = [...localDays, dayId];
    }
    setLocalDays(newDays);
    if (onDaysChange) onDaysChange(newDays);
  };
  
  // Handle frequency change
  const handleFrequencyChange = (newFrequency: 'daily' | 'weekdays' | 'custom') => {
    setLocalFrequency(newFrequency);
    
    // Update days based on frequency
    if (newFrequency === 'daily') {
      const allDays = DAYS_OF_WEEK.map(d => d.id);
      setLocalDays(allDays);
      if (onDaysChange) onDaysChange(allDays);
    } else if (newFrequency === 'weekdays') {
      const weekdays = DAYS_OF_WEEK.filter(d => d.id !== 'Sat' && d.id !== 'Sun').map(d => d.id);
      setLocalDays(weekdays);
      if (onDaysChange) onDaysChange(weekdays);
    }
    
    if (onFrequencyChange) onFrequencyChange(newFrequency);
  };
  
  // Handle local message change
  const handleMessageChange = (text: string) => {
    setLocalMessage(text);
    onMessageChange(text);
  };
  
  // Handle saving all changes
  const handleSave = () => {
    onSave(localMessage);
    // Days and frequency are already saved via their respective change handlers
  };
  
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={[
          styles.overlay,
          { backgroundColor: 'rgba(0, 0, 0, 0.5)' }
        ]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={[
              styles.modalContainer,
              { backgroundColor: theme.cardBackground }
            ]}>
              <View style={styles.header}>
                <Text style={[
                  styles.title,
                  { color: theme.text }
                ]}>
                  Custom Reminder
                </Text>
                <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              
              {/* Tab Navigation */}
              <View style={styles.tabContainer}>
                <TouchableOpacity 
                  style={[
                    styles.tab, 
                    activeTab === 'message' && [styles.activeTab, { borderBottomColor: theme.accent }]
                  ]}
                  onPress={() => setActiveTab('message')}
                >
                  <Text style={[
                    styles.tabText, 
                    { color: activeTab === 'message' ? theme.accent : theme.textSecondary }
                  ]}>
                    Message
                  </Text>
                </TouchableOpacity>
                
                {isCustomFrequencyEnabled && (
                  <TouchableOpacity 
                    style={[
                      styles.tab, 
                      activeTab === 'schedule' && [styles.activeTab, { borderBottomColor: theme.accent }]
                    ]}
                    onPress={() => setActiveTab('schedule')}
                  >
                    <Text style={[
                      styles.tabText, 
                      { color: activeTab === 'schedule' ? theme.accent : theme.textSecondary }
                    ]}>
                      Schedule
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              
              {/* Message Content */}
              {activeTab === 'message' && (
                <View style={styles.tabContent}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>
                    Reminder Message
                  </Text>
                  
                  <TextInput
                    style={[
                      styles.messageInput,
                      { 
                        borderColor: theme.border,
                        color: theme.text,
                        backgroundColor: isDark || isSunset ? theme.backgroundLight : 'white'
                      }
                    ]}
                    placeholder="Enter your reminder message"
                    placeholderTextColor={theme.textSecondary}
                    value={localMessage}
                    onChangeText={handleMessageChange}
                    maxLength={maxLength}
                    multiline
                  />
                  
                  <Text style={[
                    styles.charCount,
                    { color: theme.textSecondary }
                  ]}>
                    {localMessage.length}/{maxLength} characters
                  </Text>
                  
                  <Text style={[
                    styles.helpText,
                    { color: theme.textSecondary }
                  ]}>
                    This message will appear in your notification. 
                    Make it personal and motivating.
                  </Text>
                  
                  <View style={styles.exampleContainer}>
                    <Ionicons name="bulb-outline" size={16} color={theme.accent} style={styles.infoIcon} />
                    <Text style={[styles.exampleTitle, { color: theme.text }]}>Examples:</Text>
                  </View>
                  
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.examplesScroll}
                  >
                    {[
                      "Time to stretch and feel great!",
                      "Your body needs a break. Stretch now!",
                      "Stretch those muscles and boost your energy!",
                      "Quick stretch break for better focus!",
                      "Don't forget your stretching routine!"
                    ].map((ex, i) => (
                      <TouchableOpacity 
                        key={i}
                        style={[
                          styles.exampleChip,
                          { backgroundColor: isDark || isSunset ? theme.backgroundLight : '#f0f0f0' }
                        ]}
                        onPress={() => handleMessageChange(ex)}
                      >
                        <Text style={[styles.exampleText, { color: theme.text }]}>{ex}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
              
              {/* Schedule Content */}
              {activeTab === 'schedule' && isCustomFrequencyEnabled && (
                <ScrollView style={styles.tabContent}>
                  <Text style={[styles.inputLabel, { color: theme.text }]}>
                    Reminder Frequency
                  </Text>
                  
                  <View style={styles.frequencyOptions}>
                    {FREQUENCY_OPTIONS.map((option) => (
                      <TouchableOpacity 
                        key={option.id}
                        style={[
                          styles.frequencyOption,
                          { 
                            backgroundColor: isDark || isSunset ? theme.backgroundLight : '#f0f0f0',
                            borderColor: localFrequency === option.id ? theme.accent : 'transparent',
                            borderWidth: localFrequency === option.id ? 2 : 0
                          }
                        ]}
                        onPress={() => handleFrequencyChange(option.id as 'daily' | 'weekdays' | 'custom')}
                      >
                        <View style={[
                          styles.radioButton,
                          { 
                            borderColor: theme.accent,
                            backgroundColor: isDark || isSunset ? theme.backgroundLight : '#f0f0f0'
                          }
                        ]}>
                          {localFrequency === option.id && (
                            <View style={[styles.radioButtonSelected, { backgroundColor: theme.accent }]} />
                          )}
                        </View>
                        <Text style={[styles.frequencyLabel, { color: theme.text }]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  
                  {/* Only show the days selection if custom frequency is selected */}
                  {localFrequency === 'custom' && (
                    <>
                      <Text style={[styles.inputLabel, { color: theme.text, marginTop: 16 }]}>
                        Select Days
                      </Text>
                      
                      <View style={styles.daysContainer}>
                        {DAYS_OF_WEEK.map((day) => (
                          <TouchableOpacity 
                            key={day.id}
                            style={[
                              styles.dayOption,
                              { 
                                backgroundColor: localDays.includes(day.id) 
                                  ? theme.accent 
                                  : isDark || isSunset ? theme.backgroundLight : '#f0f0f0',
                              }
                            ]}
                            onPress={() => toggleDay(day.id)}
                          >
                            <Text style={[
                              styles.dayText,
                              { 
                                color: localDays.includes(day.id) 
                                  ? '#FFF' 
                                  : theme.text 
                              }
                            ]}>
                              {day.id}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      
                      <Text style={[
                        styles.daysSelectedText,
                        { color: theme.textSecondary }
                      ]}>
                        {localDays.length} days selected
                      </Text>
                    </>
                  )}
                  
                  <Text style={[
                    styles.helpText,
                    { color: theme.textSecondary, marginTop: 20 }
                  ]}>
                    Choose when you would like to receive your stretching reminders.
                  </Text>
                </ScrollView>
              )}
              
              {/* Footer Actions */}
              <View style={[styles.footer, { borderTopColor: theme.border }]}>
                <TouchableOpacity 
                  style={[styles.cancelButton, { borderColor: theme.border }]}
                  onPress={onCancel}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.saveButton, { backgroundColor: theme.accent }]}
                  onPress={handleSave}
                >
                  <Text style={styles.saveButtonText}>
                    Save
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabContent: {
    padding: 16,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  messageInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    alignSelf: 'flex-end',
    marginTop: 4,
    marginRight: 2,
  },
  helpText: {
    fontSize: 13,
    marginTop: 12,
  },
  exampleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  infoIcon: {
    marginRight: 6,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  examplesScroll: {
    marginTop: 8,
  },
  exampleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginRight: 8,
  },
  exampleText: {
    fontSize: 13,
  },
  frequencyOptions: {
    marginTop: 8,
  },
  frequencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  radioButtonSelected: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  frequencyLabel: {
    fontSize: 16,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    justifyContent: 'space-between',
  },
  dayOption: {
    width: '13%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 4,
    marginBottom: 10,
  },
  dayText: {
    fontSize: 13,
    fontWeight: '500',
  },
  daysSelectedText: {
    fontSize: 12,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 16,
    borderTopWidth: 1,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 12,
  },
  cancelButtonText: {
    fontSize: 14,
  },
  saveButton: {
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFF',
  },
});

export default CustomReminderModal; 