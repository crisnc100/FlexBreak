import React from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { tw } from '../../utils/tw';

interface ReminderSectionProps {
  isPremium: boolean;
  reminderEnabled: boolean;
  reminderTime: string;
  reminderMessage: string;
  onToggleReminder: (enabled: boolean) => void;
  onTimePress: () => void;
  onCustomMessagePress: () => void;
  canAccessCustomReminders: boolean;
  requiredLevel: number;
  currentLevel: number;
}

/**
 * Component for managing daily reminders with different states based on premium status
 */
const ReminderSection: React.FC<ReminderSectionProps> = ({
  isPremium,
  reminderEnabled,
  reminderTime,
  reminderMessage,
  onToggleReminder,
  onTimePress,
  onCustomMessagePress,
  canAccessCustomReminders,
  requiredLevel,
  currentLevel
}) => {
  const { theme, isDark } = useTheme();
  
  // Format time for display (24h to 12h)
  const formatTimeFor12Hour = (time24h: string) => {
    const [hours, minutes] = time24h.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };
  
  return (
    <View style={[
      tw('border border-gray-200 rounded-lg p-4 mb-4'),
      { 
        backgroundColor: theme.cardBackground,
        borderColor: theme.border,
        opacity: !isPremium ? 0.5 : 1 
      }
    ]}>
      <Text style={[
        tw('text-lg font-semibold mb-3'),
        { color: theme.text }
      ]}>
        Daily Reminder
      </Text>
      
      <View style={tw('flex-row justify-between items-center')}>
        <View style={tw('flex-row items-center')}>
          <Ionicons 
            name="alarm-outline" 
            size={20} 
            color={theme.text} 
            style={tw('mr-2')} 
          />
          <Text style={[
            tw('text-sm'),
            { color: theme.text }
          ]}>
            Remind me to stretch
          </Text>
        </View>
        <Switch
          value={reminderEnabled}
          onValueChange={onToggleReminder}
          trackColor={{ 
            false: isDark ? '#555' : '#D1D1D1', 
            true: theme.accent 
          }}
          thumbColor={reminderEnabled ? '#FFFFFF' : isDark ? '#888' : '#F4F4F4'}
          disabled={!isPremium}
        />
      </View>
      
      <TouchableOpacity 
        onPress={onTimePress}
        style={[
          tw('p-2 rounded mt-3'),
          { 
            backgroundColor: isDark 
              ? theme.backgroundLight 
              : '#f5f5f5',
            opacity: !isPremium ? 0.7 : 1
          }
        ]}
        disabled={!isPremium}
      >
        <Text style={[
          tw('text-sm text-center'),
          { 
            color: !isPremium 
              ? theme.textSecondary 
              : theme.text 
          }
        ]}>
          {formatTimeFor12Hour(reminderTime)}
        </Text>
      </TouchableOpacity>
      
      {/* Show custom message section if user can access the feature */}
      {canAccessCustomReminders && (
        <View style={tw('mt-3')}>
          <View style={tw('flex-row justify-between items-center')}>
            <Text style={[
              tw('text-sm'),
              { color: theme.text }
            ]}>
              Custom Message
            </Text>
            <TouchableOpacity 
              onPress={onCustomMessagePress}
              style={[
                tw('rounded-full p-1'),
                { backgroundColor: theme.accent }
              ]}
            >
              <Ionicons name="pencil" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={[
            tw('p-2 rounded mt-2'),
            { backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5' }
          ]}>
            <Text style={[
              tw('text-sm'),
              { color: theme.text }
            ]}>
              {reminderMessage}
            </Text>
          </View>
        </View>
      )}
      
      {/* Show progress toward unlocking custom messages */}
      {isPremium && !canAccessCustomReminders && (
        <Text style={[
          tw('text-xs italic text-center mt-3'),
          { color: theme.textSecondary }
        ]}>
          Custom messages unlock at level {requiredLevel}
        </Text>
      )}
      
      {/* Show premium requirement */}
      {!isPremium && (
        <Text style={[
          tw('text-xs italic text-center mt-2'),
          { color: theme.textSecondary }
        ]}>
          Premium feature
        </Text>
      )}
    </View>
  );
};

export default ReminderSection; 