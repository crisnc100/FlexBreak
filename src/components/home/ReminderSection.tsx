import React from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { tw } from '../../utils/tw';
// Import Firebase reminders
import * as firebaseReminders from '../../utils/firebaseReminders';

interface ReminderSectionProps {
  isPremium: boolean;
  reminderEnabled: boolean;
  reminderTime: string;
  reminderMessage: string;
  reminderDays?: string[]; // New: days of the week for reminders
  reminderFrequency?: 'daily' | 'weekdays' | 'custom'; // New: frequency option
  onToggleReminder: (enabled: boolean) => void;
  onTimePress: () => void;
  onDaysPress?: () => void; // New: for selecting days
  onFrequencyPress?: () => void; // New: for selecting frequency
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
  reminderDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  reminderFrequency = 'daily',
  onToggleReminder,
  onTimePress,
  onDaysPress,
  onFrequencyPress,
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

  // Format frequency for display
  const formatFrequency = (frequency: string) => {
    switch (frequency) {
      case 'daily': return 'Every day';
      case 'weekdays': return 'Weekdays only';
      case 'custom': return `${reminderDays.length} days selected`;
      default: return 'Every day';
    }
  };
  

  
  return (
    <View style={[
      tw('border rounded-lg p-4 mb-4'),
      styles.container,
      { 
        backgroundColor: theme.cardBackground,
        borderColor: theme.border,
      }
    ]}>
      {/* Premium Badge */}
      {isPremium ? (
        <View style={[styles.premiumBadge, { backgroundColor: isDark ? '#e6c25e' : '#FFD700' }]}>
          <Ionicons name="star" size={12} color={isDark ? '#000' : '#7D6608'} />
          <Text style={styles.premiumBadgeText}>Premium</Text>
        </View>
      ) : (
        <View style={[styles.premiumBadge, { backgroundColor: isDark ? '#666' : '#DDD' }]}>
          <Ionicons name="lock-closed" size={12} color={isDark ? '#CCC' : '#666'} />
          <Text style={styles.premiumBadgeText}>Premium Only</Text>
        </View>
      )}
      
      <Text style={[
        tw('text-lg font-semibold'),
        styles.title,
        { color: theme.text }
      ]}>
        Stretch Reminders
      </Text>
      
      <View style={styles.switchRow}>
        <View style={tw('flex-row items-center')}>
          <Ionicons 
            name="notifications-outline" 
            size={20} 
            color={theme.text} 
            style={tw('mr-2')} 
          />
          <Text style={[
            tw('text-sm'),
            { color: theme.text }
          ]}>
            Enable reminders
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

      {/* Reminder time and settings section */}
      <View style={[styles.settingsSection, { opacity: !isPremium || !reminderEnabled ? 0.6 : 1 }]}>
        {/* Time selection */}
        <TouchableOpacity 
          onPress={onTimePress}
          style={[
            styles.settingItem,
            { 
              backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5',
            }
          ]}
          disabled={!isPremium || !reminderEnabled}
        >
          <View style={styles.settingIconContainer}>
            <Ionicons name="time-outline" size={18} color={theme.accent} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingLabel, { color: theme.text }]}>Time</Text>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
              {formatTimeFor12Hour(reminderTime)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </TouchableOpacity>

        {/* Frequency selection - only for custom reminders */}
        {canAccessCustomReminders && (
          <TouchableOpacity 
            onPress={onFrequencyPress}
            style={[
              styles.settingItem,
              { 
                backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5',
              }
            ]}
            disabled={!isPremium || !reminderEnabled}
          >
            <View style={styles.settingIconContainer}>
              <Ionicons name="calendar-outline" size={18} color={theme.accent} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Frequency</Text>
              <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
                {formatFrequency(reminderFrequency)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Custom days selection - only for custom reminders with custom frequency */}
        {canAccessCustomReminders && reminderFrequency === 'custom' && (
          <TouchableOpacity 
            onPress={onDaysPress}
            style={[
              styles.settingItem,
              { 
                backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5',
              }
            ]}
            disabled={!isPremium || !reminderEnabled}
          >
            <View style={styles.settingIconContainer}>
              <Ionicons name="calendar-outline" size={18} color={theme.accent} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Days</Text>
              <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
                {reminderDays.join(', ')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Custom message */}
        {canAccessCustomReminders && (
          <TouchableOpacity 
            onPress={onCustomMessagePress}
            style={[
              styles.settingItem,
              { 
                backgroundColor: isDark ? theme.backgroundLight : '#f5f5f5',
              }
            ]}
            disabled={!isPremium || !reminderEnabled}
          >
            <View style={styles.settingIconContainer}>
              <Ionicons name="text-outline" size={18} color={theme.accent} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingLabel, { color: theme.text }]}>Message</Text>
              <Text 
                style={[styles.settingValue, { color: theme.textSecondary }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {reminderMessage}
              </Text>
            </View>
            <Ionicons name="create-outline" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
        
       
      </View>
      
      {/* Feature explanations based on user status */}
      {!isPremium ? (
        <View style={styles.featuresList}>
          <Text style={[styles.featureTitle, { color: theme.text }]}>Premium Reminder Features:</Text>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.accent} style={styles.featureIcon} />
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>
              Daily stretch reminders
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.accent} style={styles.featureIcon} />
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>
              Customizable reminder time
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.accent} style={styles.featureIcon} />
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>
              Unlock Custom Reminders at Level {requiredLevel}
            </Text>
          </View>
        </View>
      ) : !canAccessCustomReminders ? (
        <View style={[styles.levelProgressContainer, { borderTopColor: theme.border }]}>
          <Text style={[styles.levelText, { color: theme.textSecondary }]}>
            Custom Reminders unlock at Level {requiredLevel}
          </Text>
          <View style={[styles.progressBar, { backgroundColor: isDark ? '#333' : '#f0f0f0' }]}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${Math.min(100, (currentLevel / requiredLevel) * 100)}%`,
                  backgroundColor: theme.accent 
                }
              ]} 
            />
          </View>
          <Text style={[styles.levelProgressText, { color: theme.textSecondary }]}>
            Level {currentLevel} / {requiredLevel}
          </Text>
        </View>
      ) : null}
      
      {canAccessCustomReminders && (
        <View style={styles.customFeaturesList}>
          <Text style={[styles.featureTitle, { color: theme.text }]}>Your Custom Reminder Benefits:</Text>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.accent} style={styles.featureIcon} />
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>
              Personalized reminder messages
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.accent} style={styles.featureIcon} />
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>
              Select specific days of the week
            </Text>
          </View>
          <View style={styles.featureItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.accent} style={styles.featureIcon} />
            <Text style={[styles.featureText, { color: theme.textSecondary }]}>
              Notifications work even when app is closed
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    position: 'relative',
    paddingTop: 30,
  },
  premiumBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
    color: '#000',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingsSection: {
    marginVertical: 8,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  settingIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(100, 100, 100, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  settingValue: {
    fontSize: 12,
    marginTop: 2,
  },
  featuresList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  customFeaturesList: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    marginRight: 8,
  },
  featureText: {
    fontSize: 13,
  },
  levelProgressContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  levelText: {
    fontSize: 13,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    width: '100%',
    marginBottom: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  levelProgressText: {
    fontSize: 12,
  },
  testButton: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ReminderSection; 