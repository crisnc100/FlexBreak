import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { ProgressEntry } from '../../types';

interface RoutineItemProps {
  item: ProgressEntry;
  onPress: () => void;
  onDelete: () => void;
  hideLabel?: string; // Optional prop to customize the action label
}

const RoutineItem: React.FC<RoutineItemProps> = ({ 
  item, 
  onPress, 
  onDelete, 
  hideLabel = 'Delete' // Default to "Delete" for backward compatibility
}) => {
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
        style={styles.routineItem}
        onPress={onPress}
      >
        <View style={styles.routineInfo}>
          <Text style={styles.routineArea}>{item.area}</Text>
          <Text style={styles.routineDate}>
            {item.duration} min • {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        <Ionicons name="play-circle" size={32} color="#4CAF50" />
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