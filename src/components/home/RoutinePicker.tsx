import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch, Image, ImageBackground, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { tw } from '../../utils/tw';
import { BodyArea, Duration } from '../../types';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

// Type for Ionicons names
type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface RoutinePickerProps {
  area: BodyArea;
  duration: Duration;
  officeFriendly: boolean;
  onAreaPress: () => void;
  onDurationPress: () => void;
  onOfficeFriendlyToggle: (value: boolean) => void;
  onStartStretching: () => void;
  canAccessCustomRoutines?: boolean;
  onCustomRoutinesPress?: () => void;
  isPremium?: boolean;
  requiredLevel?: number;
  userLevel?: number;
}

/**
 * Component for selecting routine options like area, duration, and office-friendly toggle
 */
const RoutinePicker: React.FC<RoutinePickerProps> = ({
  area,
  duration,
  officeFriendly,
  onAreaPress,
  onDurationPress,
  onOfficeFriendlyToggle,
  onStartStretching,
  canAccessCustomRoutines = false,
  onCustomRoutinesPress,
  isPremium = false,
  requiredLevel = 5,
  userLevel = 1
}) => {
  const { theme, isDark, isSunset } = useTheme();
  
  // Helper functions
  const getAreaIcon = (value: BodyArea): IoniconsName => {
    switch(value) {
      case 'Hips & Legs': return 'body-outline';
      case 'Lower Back': return 'fitness-outline';
      case 'Upper Back & Chest': return 'body-outline';
      case 'Shoulders & Arms': return 'barbell-outline';
      case 'Neck': return 'body-outline';
      case 'Full Body': return 'body-outline';
      case 'Dynamic Flow': return 'flame-outline';
      default: return 'body-outline';
    }
  };

  const getDurationIcon = (value: Duration): IoniconsName => {
    switch(value) {
      case '5': return 'timer-outline';
      case '10': return 'time-outline';
      case '15': return 'hourglass-outline';
      default: return 'time-outline';
    }
  };

  const getAreaLabel = (value: BodyArea): string => {
    return value;
  };

  const getDurationLabel = (value: Duration) => {
    switch (value) {
      case '5': return '5 minutes';
      case '10': return '10 minutes';
      case '15': return '15 minutes';
      default: return '5 minutes';
    }
  };
  
  // Custom routines button - different states based on access
  const renderCustomRoutinesButton = () => {
    // Has full access to custom routines
    if (canAccessCustomRoutines && onCustomRoutinesPress) {
      return (
        <TouchableOpacity 
          style={[
            styles.customRoutinesButton,
            { backgroundColor: isDark || isSunset ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.3)' }
          ]}
          onPress={onCustomRoutinesPress}
        >
          <Text style={[
            styles.customRoutinesText, 
            { color: isDark || isSunset ? '#fff' : theme.accent }
          ]}>
            Custom
          </Text>
          <Ionicons 
            name="chevron-forward" 
            size={16} 
            color={isDark || isSunset ? '#fff' : theme.accent} 
          />
        </TouchableOpacity>
      );
    }
    
    // Premium user but hasn't reached required level
    else if (isPremium && userLevel < requiredLevel) {
      const handleLockedButtonPress = () => {
        // Trigger haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        
        // Show a small alert about level requirement
        Alert.alert(
          "Level 5 Required",
          `Custom Routines unlock at level ${requiredLevel}. Keep stretching to reach this level!`,
          [{ text: "Got it" }],
          { cancelable: true }
        );
      };
      
      return (
        <TouchableOpacity
          style={[
            styles.lockedCustomRoutinesButton,
            { 
              backgroundColor: isDark || isSunset ? 'rgba(100,100,100,0.3)' : 'rgba(200, 200, 200, 0.15)',
              borderColor: isDark || isSunset ? 'rgba(100,100,100,0.5)' : 'rgba(200, 200, 200, 0.3)'
            }
          ]}
          onPress={handleLockedButtonPress}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.lockedCustomRoutinesText, 
            { color: isDark || isSunset ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }
          ]}>
            Custom Routines
          </Text>
          <Ionicons 
            name="lock-closed" 
            size={12} 
            color={isDark || isSunset ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)'} 
            style={{marginLeft: 6}} 
          />
        </TouchableOpacity>
      );
    }
    
    // Not showing any button for non-premium users
    return null;
  };
  
  return (
    <View style={[
      styles.container,
      { 
        backgroundColor: theme.cardBackground,
        shadowColor: isDark || isSunset ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)'
      }
    ]}>
      {/* Header with decorative elements */}
      <LinearGradient
        colors={isDark || isSunset ? 
          ['rgba(66, 153, 225, 0.6)', 'rgba(99, 102, 241, 0.6)'] : 
          ['rgba(66, 153, 225, 0.2)', 'rgba(99, 102, 241, 0.2)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Ionicons 
              name="fitness" 
              size={24} 
              color={isDark || isSunset ? "#ffffff" : theme.accent} 
              style={styles.titleIcon} 
            />
            <Text style={[
              styles.title,
              { color: isDark || isSunset ? "#ffffff" : theme.text }
            ]}>
              Create Your Routine
            </Text>
          </View>
          
          {/* Custom Routines button/teaser */}
          {renderCustomRoutinesButton()}
        </View>
      </LinearGradient>
      
      <View style={styles.optionsContainer}>
        {/* Area selection */}
        <View style={styles.optionSection}>
          <Text style={[
            styles.optionLabel,
            { color: theme.text }
          ]}>
            What's tight?
          </Text>
          <TouchableOpacity
            onPress={onAreaPress}
            style={[
              styles.selectionButton,
              { 
                backgroundColor: isDark || isSunset ? 'rgba(255,255,255,0.05)' : 'white',
                borderColor: isDark || isSunset ? 'rgba(255,255,255,0.1)' : theme.border
              }
            ]}
            activeOpacity={0.7}
          >
            <View style={styles.selectionContent}>
              <View style={[
                styles.iconContainer, 
                { 
                  backgroundColor: isDark || isSunset ? `${theme.accent}30` : `${theme.accent}20` 
                }
              ]}>
                <Ionicons name={getAreaIcon(area)} size={22} color={theme.accent} />
              </View>
              <Text style={[
                styles.selectionText,
                { color: theme.text }
              ]}>
                {getAreaLabel(area)}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Duration selection */}
        <View style={styles.optionSection}>
          <Text style={[
            styles.optionLabel,
            { color: theme.text }
          ]}>
            How long?
          </Text>
          <TouchableOpacity
            onPress={onDurationPress}
            style={[
              styles.selectionButton,
              { 
                backgroundColor: isDark || isSunset ? 'rgba(255,255,255,0.05)' : 'white',
                borderColor: isDark || isSunset ? 'rgba(255,255,255,0.1)' : theme.border
              }
            ]}
            activeOpacity={0.7}
          >
            <View style={styles.selectionContent}>
              <View style={[
                styles.iconContainer, 
                { 
                  backgroundColor: isDark || isSunset ? `${theme.accent}30` : `${theme.accent}20` 
                }
              ]}>
                <Ionicons name={getDurationIcon(duration)} size={22} color={theme.accent} />
              </View>
              <Text style={[
                styles.selectionText,
                { color: theme.text }
              ]}>
                {getDurationLabel(duration)}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Office Friendly Toggle */}
        <View style={[
          styles.toggleContainer,
          { 
            backgroundColor: isDark || isSunset ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
            borderRadius: 14,
            marginVertical: 10,
            paddingHorizontal: 12
          }
        ]}>
          <View style={styles.toggleTextContainer}>
            <View style={styles.toggleLabelContainer}>
              <View style={[
                styles.officeFriendlyIconContainer,
                {
                  backgroundColor: area !== 'Dynamic Flow' 
                    ? (isDark || isSunset ? `${theme.accent}30` : `${theme.accent}15`)
                    : (isDark || isSunset ? 'rgba(100,100,100,0.3)' : 'rgba(200,200,200,0.3)')
                }
              ]}>
                <Ionicons 
                  name="briefcase-outline" 
                  size={18} 
                  color={area === 'Dynamic Flow' 
                    ? (isDark || isSunset ? '#999999' : '#999999')
                    : (isDark || isSunset ? theme.accent : theme.accent)
                  } 
                />
              </View>
              <Text style={[
                styles.toggleLabel,
                { color: theme.text }
              ]}>
                Office Friendly
              </Text>
            </View>
            <Text style={[
              styles.toggleDescription,
              { 
                color: area === 'Dynamic Flow' 
                  ? (isDark || isSunset ? '#777' : '#999999') 
                  : theme.textSecondary 
              }
            ]}>
              {area === 'Dynamic Flow' 
                ? 'Not available for Dynamic Flow' 
                : 'Minimal sitting & standing stretches'}
            </Text>
          </View>
          
          {/* Enhanced Switch for Dark Mode */}
          <Switch
            value={officeFriendly}
            onValueChange={onOfficeFriendlyToggle}
            trackColor={{ 
              false: isDark || isSunset ? '#555' : '#e0e0e0', 
              true: isDark || isSunset ? `${theme.accent}80` : `${theme.accent}90` 
            }}
            thumbColor={
              isDark || isSunset 
                ? (officeFriendly ? theme.accent : '#888')
                : (officeFriendly ? theme.accent : '#f5f5f5')
            }
            ios_backgroundColor={isDark || isSunset ? '#555' : '#e0e0e0'}
            disabled={area === 'Dynamic Flow'}
          />
        </View>
      </View>

      {/* Start button with gradient */}
      <TouchableOpacity
        onPress={onStartStretching}
        style={styles.startButtonContainer}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isDark || isSunset ? 
            ['#4299E1', '#6366F1'] : 
            ['#4299E1', '#6366F1']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.startButtonGradient,
            { shadowColor: isDark || isSunset ? 'rgba(99, 102, 241, 0.5)' : 'rgba(0, 0, 0, 0.2)' }
          ]}
        >
          <Ionicons name="play" size={20} color="#ffffff" style={styles.startIcon} />
          <Text style={styles.startButtonText}>
            Start Stretching
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerGradient: {
    padding: 16,
    paddingBottom: 18,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  customRoutinesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  customRoutinesText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 3,
  },
  lockedCustomRoutinesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  lockedCustomRoutinesText: {
    fontSize: 12,
    fontWeight: '500',
  },
  optionsContainer: {
    padding: 16,
  },
  optionSection: {
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    paddingLeft: 4,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: 12,
    paddingVertical: 12,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: 8,
  },
  toggleLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  officeFriendlyIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  toggleIcon: {
    marginRight: 8,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleDescription: {
    fontSize: 13,
    paddingLeft: 42,
  },
  startButtonContainer: {
    padding: 16,
    paddingTop: 8,
  },
  startButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  startIcon: {
    marginRight: 8,
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  lockedButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unlockInfoContainer: {
    marginLeft: 6,
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  unlockText: {
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 3,
  },
  progressBarContainer: {
    width: 70,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});

export default RoutinePicker; 