import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

// Maximum days in past that can be simulated
const MAX_DAYS_PAST = 60;

interface DateSelectionModalProps {
  visible: boolean;
  onClose: () => void;
  onDateSelected: (date: Date) => void;
  simulatedDates: string[]; // Array of already simulated dates in ISO format
}

const DateSelectionModal = ({ 
  visible, 
  onClose, 
  onDateSelected,
  simulatedDates 
}: DateSelectionModalProps) => {
  const { theme, isDark } = useTheme();
  
  // Date selection state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  
  // Generate available dates when modal opens
  useEffect(() => {
    if (visible) {
      generateAvailableDates();
    }
  }, [visible, simulatedDates]);
  
  // Generate dates from today back to MAX_DAYS_PAST
  const generateAvailableDates = () => {
    const dates: Date[] = [];
    const today = new Date();
    
    // Convert simulatedDates to Date objects for comparison
    const simulated = simulatedDates.map(dateStr => new Date(dateStr));
    
    // Generate dates starting from yesterday going back MAX_DAYS_PAST days
    for (let i = 1; i <= MAX_DAYS_PAST; i++) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      // Reset time components for clean date comparison
      date.setHours(0, 0, 0, 0);
      
      // Check if this date has already been simulated
      const alreadySimulated = simulated.some(simDate => {
        const simDateOnly = new Date(simDate);
        simDateOnly.setHours(0, 0, 0, 0);
        return simDateOnly.getTime() === date.getTime();
      });
      
      // Only add dates that haven't been simulated yet
      if (!alreadySimulated) {
        dates.push(date);
      }
    }
    
    // Sort dates from most recent to oldest
    dates.sort((a, b) => b.getTime() - a.getTime());
    
    setAvailableDates(dates);
    setSelectedDate(null); // Reset selection when dates change
  };
  
  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString(undefined, { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // Handle date selection
  const handleSelectDate = (date: Date) => {
    setSelectedDate(date);
  };
  
  // Handle confirm selection
  const handleConfirm = () => {
    if (!selectedDate) {
      Alert.alert('Selection Required', 'Please select a date to simulate.');
      return;
    }
    
    onDateSelected(selectedDate);
  };
  
  // Determine if a date is in the future (not allowed)
  const isDateInFuture = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date.getTime() > today.getTime();
  };
  
  // Get days ago text
  const getDaysAgoText = (date: Date): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };
  
  // Get days ago class for styling
  const getDaysAgoClass = (date: Date): any => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    const diffTime = today.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) return styles.recentDate;
    if (diffDays <= 30) return styles.moderateDate;
    return styles.olderDate;
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
              Select Simulation Date
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.instructionsContainer}>
            <Ionicons name="calendar" size={24} color={theme.accent} />
            <Text style={[styles.instructions, { color: theme.textSecondary }]}>
              Select a past date to simulate a stretching routine. 
              Once simulated, you can only move forward in time.
            </Text>
          </View>
          
          <ScrollView style={styles.dateListContainer}>
            {availableDates.length > 0 ? (
              availableDates.map((date, index) => (
                <TouchableOpacity
                  key={date.toISOString()}
                  style={[
                    styles.dateItem,
                    { backgroundColor: isDark ? '#2D2D2D' : '#f5f5f5' },
                    selectedDate && selectedDate.getTime() === date.getTime() && {
                      backgroundColor: isDark ? '#3D5A3D' : '#E8F5E9',
                      borderColor: theme.accent,
                      borderWidth: 1
                    }
                  ]}
                  onPress={() => handleSelectDate(date)}
                  disabled={isDateInFuture(new Date(date.getTime()))}
                >
                  <View style={styles.dateContent}>
                    <Text style={[
                      styles.dateText, 
                      { color: theme.text },
                      getDaysAgoClass(date)
                    ]}>
                      {formatDate(date)}
                    </Text>
                    
                    <Text style={[styles.daysAgoText, { color: theme.textSecondary }]}>
                      {getDaysAgoText(date)}
                    </Text>
                  </View>
                  
                  {selectedDate && selectedDate.getTime() === date.getTime() && (
                    <Ionicons 
                      name="checkmark-circle" 
                      size={24} 
                      color={theme.accent} 
                      style={styles.checkmark} 
                    />
                  )}
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons 
                  name="calendar-outline" 
                  size={48} 
                  color={theme.textSecondary} 
                />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  All available dates have been simulated.
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
              style={[
                styles.confirmButton,
                { backgroundColor: theme.accent },
                !selectedDate && styles.disabledButton
              ]}
              onPress={handleConfirm}
              disabled={!selectedDate}
            >
              <Text style={styles.confirmButtonText}>
                Confirm
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
    maxHeight: '80%',
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
  instructionsContainer: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  instructions: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    lineHeight: 20,
  },
  dateListContainer: {
    maxHeight: 300,
    padding: 16,
  },
  dateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  dateContent: {
    flex: 1,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  daysAgoText: {
    fontSize: 12,
    marginTop: 4,
  },
  checkmark: {
    marginLeft: 8,
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
  disabledButton: {
    opacity: 0.6,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  recentDate: {
    color: '#4CAF50', // green for recent dates
  },
  moderateDate: {
    color: '#FFA000', // amber for moderate dates
  },
  olderDate: {
    color: '#F44336', // red for older dates
  }
});

export default DateSelectionModal; 