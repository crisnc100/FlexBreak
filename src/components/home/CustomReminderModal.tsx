import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TextInput 
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { tw } from '../../utils/tw';

interface CustomReminderModalProps {
  visible: boolean;
  message: string;
  onMessageChange: (message: string) => void;
  onSave: (message: string) => void;
  onCancel: () => void;
  maxLength?: number;
}

/**
 * Modal for entering custom reminder messages
 */
const CustomReminderModal: React.FC<CustomReminderModalProps> = ({
  visible,
  message,
  onMessageChange,
  onSave,
  onCancel,
  maxLength = 50
}) => {
  const { theme, isDark } = useTheme();
  
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={[
        tw('flex-1 justify-center items-center'),
        { backgroundColor: 'rgba(0, 0, 0, 0.5)' }
      ]}>
        <View style={[
          tw('w-4/5 rounded-lg p-4'),
          { backgroundColor: theme.cardBackground }
        ]}>
          <Text style={[
            tw('text-lg font-semibold mb-3'),
            { color: theme.text }
          ]}>
            Custom Reminder Message
          </Text>
          
          <TextInput
            style={[
              tw('border rounded p-2 mb-3 w-full'),
              { 
                borderColor: theme.border,
                color: theme.text,
                backgroundColor: isDark ? theme.backgroundLight : 'white'
              }
            ]}
            placeholder="Enter your reminder message"
            placeholderTextColor={theme.textSecondary}
            value={message}
            onChangeText={onMessageChange}
            maxLength={maxLength}
          />
          
          <Text style={[
            tw('text-xs mb-3'),
            { color: theme.textSecondary }
          ]}>
            This message will appear in your reminder notifications.
          </Text>
          
          <View style={tw('flex-row justify-end')}>
            <TouchableOpacity 
              style={tw('px-3 py-2 mr-2')}
              onPress={onCancel}
            >
              <Text style={{ color: theme.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                tw('px-3 py-2 rounded'),
                { backgroundColor: theme.accent }
              ]}
              onPress={() => onSave(message)}
            >
              <Text style={tw('text-white')}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default CustomReminderModal; 