import React, { useState } from 'react';
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

interface TimePickerProps {
  visible: boolean;
  selectedTime: string; // Format: "HH:MM" (24h)
  onTimeSelected: (time: string) => void;
  onCancel: () => void;
}

/**
 * Component for picking time in hour:minute format
 */
const TimePicker: React.FC<TimePickerProps> = ({
  visible,
  selectedTime,
  onTimeSelected,
  onCancel
}) => {
  const { theme, isDark } = useTheme();
  
  // Parse initial selected time
  const [selectedHour, selectedMinute] = selectedTime.split(':').map(Number);
  
  // Local state for hour and minute selection
  const [hour, setHour] = useState(selectedHour);
  const [minute, setMinute] = useState(selectedMinute);
  const [period, setPeriod] = useState(selectedHour >= 12 ? 'PM' : 'AM');
  
  // Generate hours (12h format)
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  
  // Generate minutes (in 5-minute intervals)
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);
  
  // Handle time selection
  const handleSelectTime = () => {
    // Convert 12h to 24h format
    let hour24 = hour;
    if (period === 'PM' && hour < 12) {
      hour24 = hour + 12;
    } else if (period === 'AM' && hour === 12) {
      hour24 = 0;
    }
    
    // Format time as HH:MM
    const formattedHour = hour24.toString().padStart(2, '0');
    const formattedMinute = minute.toString().padStart(2, '0');
    const timeString = `${formattedHour}:${formattedMinute}`;
    
    onTimeSelected(timeString);
  };
  
  // Format for display
  const formatHour = (h: number) => {
    return h.toString();
  };
  
  const formatMinute = (m: number) => {
    return m.toString().padStart(2, '0');
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
              Select Reminder Time
            </Text>
            <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.timePickerContainer}>
            {/* Hour Picker */}
            <View style={styles.pickerColumn}>
              <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>Hour</Text>
              <ScrollView 
                style={[styles.pickerScroll, { borderColor: theme.border }]}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.pickerContent}
              >
                {hours.map((h) => (
                  <TouchableOpacity
                    key={`hour-${h}`}
                    style={[
                      styles.timeOption,
                      h === hour && [styles.selectedTime, { backgroundColor: theme.accent + '33' }]
                    ]}
                    onPress={() => setHour(h)}
                  >
                    <Text style={[
                      styles.timeText,
                      h === hour && [styles.selectedTimeText, { color: theme.accent }],
                      { color: h === hour ? theme.accent : theme.text }
                    ]}>
                      {formatHour(h)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            {/* Minute Picker */}
            <View style={styles.pickerColumn}>
              <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>Minute</Text>
              <ScrollView 
                style={[styles.pickerScroll, { borderColor: theme.border }]}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.pickerContent}
              >
                {minutes.map((m) => (
                  <TouchableOpacity
                    key={`minute-${m}`}
                    style={[
                      styles.timeOption,
                      m === minute && [styles.selectedTime, { backgroundColor: theme.accent + '33' }]
                    ]}
                    onPress={() => setMinute(m)}
                  >
                    <Text style={[
                      styles.timeText,
                      m === minute && [styles.selectedTimeText, { color: theme.accent }],
                      { color: m === minute ? theme.accent : theme.text }
                    ]}>
                      {formatMinute(m)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            
            {/* AM/PM Picker */}
            <View style={styles.pickerColumn}>
              <Text style={[styles.pickerLabel, { color: theme.textSecondary }]}>AM/PM</Text>
              <View style={[styles.periodContainer, { borderColor: theme.border }]}>
                <TouchableOpacity
                  style={[
                    styles.periodOption,
                    period === 'AM' && [styles.selectedPeriod, { backgroundColor: theme.accent }]
                  ]}
                  onPress={() => setPeriod('AM')}
                >
                  <Text style={[
                    styles.periodText,
                    { color: period === 'AM' ? '#FFF' : theme.text }
                  ]}>
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.periodOption,
                    period === 'PM' && [styles.selectedPeriod, { backgroundColor: theme.accent }]
                  ]}
                  onPress={() => setPeriod('PM')}
                >
                  <Text style={[
                    styles.periodText,
                    { color: period === 'PM' ? '#FFF' : theme.text }
                  ]}>
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          <View style={styles.timePreview}>
            <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
              Selected Time:
            </Text>
            <Text style={[styles.previewTime, { color: theme.text }]}>
              {formatHour(hour)}:{formatMinute(minute)} {period}
            </Text>
          </View>
          
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
              onPress={handleSelectTime}
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
  timePickerContainer: {
    flexDirection: 'row',
    padding: 16,
    justifyContent: 'space-between',
  },
  pickerColumn: {
    flex: 1,
    alignItems: 'center',
  },
  pickerLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  pickerScroll: {
    height: 160,
    width: '80%',
    borderWidth: 1,
    borderRadius: 8,
  },
  pickerContent: {
    paddingVertical: 8,
  },
  timeOption: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTime: {
    borderRadius: 4,
  },
  timeText: {
    fontSize: 16,
  },
  selectedTimeText: {
    fontWeight: 'bold',
  },
  periodContainer: {
    height: 160,
    width: '80%',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  periodOption: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedPeriod: {
    backgroundColor: '#2196F3',
  },
  periodText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  timePreview: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  previewTime: {
    fontSize: 24,
    fontWeight: 'bold',
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

export default TimePicker; 