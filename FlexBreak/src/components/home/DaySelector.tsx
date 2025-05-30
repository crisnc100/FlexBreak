import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

// Define day type
type Day = {
  id: string;
  shortName: string;
  fullName: string;
};

// Days of the week
const DAYS_OF_WEEK: Day[] = [
  { id: 'mon', shortName: 'Mon', fullName: 'Monday' },
  { id: 'tue', shortName: 'Tue', fullName: 'Tuesday' },
  { id: 'wed', shortName: 'Wed', fullName: 'Wednesday' },
  { id: 'thu', shortName: 'Thu', fullName: 'Thursday' },
  { id: 'fri', shortName: 'Fri', fullName: 'Friday' },
  { id: 'sat', shortName: 'Sat', fullName: 'Saturday' },
  { id: 'sun', shortName: 'Sun', fullName: 'Sunday' },
];

interface DaySelectorProps {
  visible: boolean;
  selectedDays: string[];
  onDaysSelected: (days: string[]) => void;
  onCancel: () => void;
}

/**
 * Component for selecting days of the week
 */
const DaySelector: React.FC<DaySelectorProps> = ({
  visible,
  selectedDays,
  onDaysSelected,
  onCancel
}) => {
  const { theme, isDark } = useTheme();
  const [localSelectedDays, setLocalSelectedDays] = React.useState<string[]>(selectedDays);
  
  // Reset local state when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      setLocalSelectedDays(selectedDays);
    }
  }, [visible, selectedDays]);
  
  // Toggle day selection
  const toggleDay = (dayId: string) => {
    let newSelectedDays;
    
    if (localSelectedDays.includes(dayId)) {
      // Don't allow deselecting all days - at least one must be selected
      if (localSelectedDays.length === 1) {
        return;
      }
      // Remove the day
      newSelectedDays = localSelectedDays.filter(id => id !== dayId);
    } else {
      // Add the day
      newSelectedDays = [...localSelectedDays, dayId];
    }
    
    setLocalSelectedDays(newSelectedDays);
  };
  
  // Quick selection options
  const selectAllDays = () => {
    setLocalSelectedDays(DAYS_OF_WEEK.map(day => day.id));
  };
  
  const selectWeekdays = () => {
    const weekdays = DAYS_OF_WEEK.filter(day => day.id !== 'sat' && day.id !== 'sun').map(day => day.id);
    setLocalSelectedDays(weekdays);
  };
  
  const selectWeekends = () => {
    const weekends = DAYS_OF_WEEK.filter(day => day.id === 'sat' || day.id === 'sun').map(day => day.id);
    setLocalSelectedDays(weekends);
  };
  
  // Save selection
  const handleSave = () => {
    onDaysSelected(localSelectedDays);
  };
  
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={[
        styles.overlay,
        { backgroundColor: 'rgba(0, 0, 0, 0.5)' }
      ]}>
        <View style={[
          styles.container,
          { backgroundColor: theme.cardBackground }
        ]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>
              Select Days
            </Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.content}>
            {/* Quick selection options */}
            <View style={styles.quickOptions}>
              <TouchableOpacity
                style={[
                  styles.quickOption,
                  { backgroundColor: isDark ? theme.backgroundLight : '#f0f0f0' }
                ]}
                onPress={selectAllDays}
              >
                <Text style={[styles.quickOptionText, { color: theme.text }]}>
                  All Days
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.quickOption,
                  { backgroundColor: isDark ? theme.backgroundLight : '#f0f0f0' }
                ]}
                onPress={selectWeekdays}
              >
                <Text style={[styles.quickOptionText, { color: theme.text }]}>
                  Weekdays
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.quickOption,
                  { backgroundColor: isDark ? theme.backgroundLight : '#f0f0f0' }
                ]}
                onPress={selectWeekends}
              >
                <Text style={[styles.quickOptionText, { color: theme.text }]}>
                  Weekend
                </Text>
              </TouchableOpacity>
            </View>
            
            {/* Individual day selection */}
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
              Custom Selection
            </Text>
            
            <View style={styles.daysContainer}>
              {DAYS_OF_WEEK.map(day => (
                <TouchableOpacity
                  key={day.id}
                  style={[
                    styles.dayOption,
                    { 
                      backgroundColor: localSelectedDays.includes(day.id)
                        ? theme.accent
                        : isDark ? theme.backgroundLight : '#f0f0f0'
                    }
                  ]}
                  onPress={() => toggleDay(day.id)}
                >
                  <Text style={[
                    styles.dayName,
                    { 
                      color: localSelectedDays.includes(day.id)
                        ? '#FFF'
                        : theme.text
                    }
                  ]}>
                    {day.shortName}
                  </Text>
                  
                  <Text style={[
                    styles.dayFullName,
                    { 
                      color: localSelectedDays.includes(day.id)
                        ? '#FFF'
                        : theme.textSecondary
                    }
                  ]}>
                    {day.fullName}
                  </Text>
                  
                  {localSelectedDays.includes(day.id) && (
                    <View style={styles.checkmarkContainer}>
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={[styles.daysSelectedText, { color: theme.textSecondary }]}>
              {localSelectedDays.length} days selected
            </Text>
          </ScrollView>
          
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: theme.border }]}
              onPress={onCancel}
            >
              <Text style={[styles.buttonText, { color: theme.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: theme.accent }]}
              onPress={handleSave}
            >
              <Text style={[styles.buttonText, { color: '#FFF' }]}>
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
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 360,
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
  content: {
    padding: 16,
    maxHeight: 400,
  },
  quickOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  quickOption: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  quickOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  daysContainer: {
    marginBottom: 16,
  },
  dayOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    position: 'relative',
  },
  dayName: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 40,
  },
  dayFullName: {
    fontSize: 14,
    flex: 1,
  },
  checkmarkContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  daysSelectedText: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  }
});

export default DaySelector; 