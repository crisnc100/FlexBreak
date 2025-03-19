import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { tw } from '../../utils/tw';
import { BodyArea, Duration, StretchLevel } from '../../types';

interface RoutinePickerProps {
  area: BodyArea;
  duration: Duration;
  level: StretchLevel;
  onAreaPress: () => void;
  onDurationPress: () => void;
  onLevelPress: () => void;
  onStartStretching: () => void;
  canAccessCustomRoutines?: boolean;
  onCustomRoutinesPress?: () => void;
}

/**
 * Component for selecting routine options like area, duration, and level
 */
const RoutinePicker: React.FC<RoutinePickerProps> = ({
  area,
  duration,
  level,
  onAreaPress,
  onDurationPress,
  onLevelPress,
  onStartStretching,
  canAccessCustomRoutines = false,
  onCustomRoutinesPress
}) => {
  const { theme, isDark } = useTheme();
  
  // Helper label functions
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

  const getLevelLabel = (value: StretchLevel) => {
    switch (value) {
      case 'beginner': return 'Beginner';
      case 'intermediate': return 'Intermediate';
      case 'advanced': return 'Advanced';
      default: return 'Beginner';
    }
  };
  
  return (
    <View style={[
      tw('shadow-md p-4 rounded-lg mb-4'),
      { 
        backgroundColor: theme.cardBackground,
        shadowColor: isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.1)'
      }
    ]}>
      <View style={tw('flex-row items-center justify-between mb-3')}>
        <Text style={[
          tw('text-lg font-semibold'),
          { color: theme.text }
        ]}>
          Create Your Routine
        </Text>
        
        {/* Custom Routines link */}
        {canAccessCustomRoutines && onCustomRoutinesPress && (
          <TouchableOpacity 
            style={tw('flex-row items-center')}
            onPress={onCustomRoutinesPress}
          >
            <Text style={[
              tw('text-sm font-medium mr-1'), 
              { color: theme.accent }
            ]}>
              Custom Routines
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.accent} />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={tw('mb-3')}>
        <Text style={[
          tw('text-sm mb-1'),
          { color: theme.text }
        ]}>
          What's tight?
        </Text>
        <TouchableOpacity
          onPress={onAreaPress}
          style={[
            styles.dropdownButton,
            { 
              backgroundColor: isDark ? theme.backgroundLight : 'white',
              borderColor: theme.border
            }
          ]}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.dropdownButtonText,
            { color: theme.text }
          ]}>
            {getAreaLabel(area)}
          </Text>
          <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={tw('mb-3')}>
        <Text style={[
          tw('text-sm mb-1'),
          { color: theme.text }
        ]}>
          How long?
        </Text>
        <TouchableOpacity
          onPress={onDurationPress}
          style={[
            styles.dropdownButton,
            { 
              backgroundColor: isDark ? theme.backgroundLight : 'white',
              borderColor: theme.border
            }
          ]}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.dropdownButtonText,
            { color: theme.text }
          ]}>
            {getDurationLabel(duration)}
          </Text>
          <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={tw('mb-3')}>
        <Text style={[
          tw('text-sm mb-1'),
          { color: theme.text }
        ]}>
          How flexible?
        </Text>
        <TouchableOpacity
          onPress={onLevelPress}
          style={[
            styles.dropdownButton,
            { 
              backgroundColor: isDark ? theme.backgroundLight : 'white',
              borderColor: theme.border
            }
          ]}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.dropdownButtonText,
            { color: theme.text }
          ]}>
            {getLevelLabel(level)}
          </Text>
          <Ionicons name="chevron-down" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={onStartStretching}
        style={tw('bg-primary p-3 rounded-lg mt-2 items-center')}
      >
        <Text style={tw('text-white font-semibold text-base')}>
          Start Stretching
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  }
});

export default RoutinePicker; 