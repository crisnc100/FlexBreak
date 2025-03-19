import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { ProgressEntry } from '../../types';
import { useTheme } from '../../context/ThemeContext';

interface RoutineItemProps {
  item: ProgressEntry;
  onPress: () => void;
  onDelete: () => void;
  hideLabel?: string; // Optional prop to customize the action label
  theme?: any; // Optional theme prop passed from parent
  isDark?: boolean; // Optional isDark flag passed from parent
}

const RoutineItem: React.FC<RoutineItemProps> = ({ 
  item, 
  onPress, 
  onDelete, 
  hideLabel = 'Delete', // Default to "Delete" for backward compatibility
  theme: propTheme,
  isDark: propIsDark
}) => {
  // Use theme from props if provided, otherwise use theme context
  // This allows the component to work both when used standalone and when included in RoutineDashboard
  const themeContext = useTheme();
  const theme = propTheme || themeContext.theme;
  const isDark = propIsDark !== undefined ? propIsDark : themeContext.isDark;

  // Render the right swipe actions (hide/delete)
  const renderRightActions = () => (
    <TouchableOpacity 
      style={styles.actionButton}
      onPress={onDelete}
    >
      <Ionicons 
        name={hideLabel === 'Hide' ? 'eye-off-outline' : 'trash-outline'} 
        size={24} 
        color="#FFF" 
      />
      <Text style={styles.actionText}>{hideLabel}</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <TouchableOpacity 
        style={[
          styles.routineItem, 
          { 
            backgroundColor: isDark ? theme.cardBackground : '#FFF',
            borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEE'
          }
        ]}
        onPress={onPress}
      >
        <View style={styles.routineInfo}>
          <Text style={[
            styles.routineArea, 
            { color: isDark ? theme.text : '#333' }
          ]}>
            {item.area}
          </Text>
          <Text style={[
            styles.routineDate, 
            { color: isDark ? theme.textSecondary : '#666' }
          ]}>
            {item.duration} min • {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        <Ionicons 
          name="play-circle" 
          size={32} 
          color={isDark ? theme.accent : "#4CAF50"} 
        />
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  routineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  routineInfo: {
    flex: 1,
  },
  routineArea: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  routineDate: {
    fontSize: 14,
    color: '#666',
  },
  actionButton: {
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    flexDirection: 'column',
  },
  actionText: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 4,
  }
});

export default RoutineItem;