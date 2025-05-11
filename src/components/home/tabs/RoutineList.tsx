import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Custom routine type
interface CustomRoutine {
  id: string;
  name: string;
  area: string;
  duration: string;
  timestamp: string;
  customStretches?: { id: number | string; isRest?: boolean }[];
}

interface RoutineListProps {
  customRoutines: CustomRoutine[];
  startCustomRoutine: (routine: CustomRoutine) => void;
  deleteCustomRoutine: (id: string) => void;
  theme: any;
  isDark: boolean;
  MAX_CUSTOM_ROUTINES: number;
}

const RoutineList: React.FC<RoutineListProps> = ({
  customRoutines,
  startCustomRoutine,
  deleteCustomRoutine,
  theme,
  isDark,
  MAX_CUSTOM_ROUTINES
}) => {
  // Render a routine item
  const renderRoutineItem = (item: CustomRoutine) => {
    // Calculate count of stretches and breaks
    let stretchCount = 0;
    let breakCount = 0;
    
    if (item.customStretches) {
      stretchCount = item.customStretches.filter(s => !s.isRest).length;
      breakCount = item.customStretches.filter(s => s.isRest).length;
    }
    
    return (
      <View style={[
        styles.routineItem,
        { backgroundColor: isDark ? theme.backgroundLight : '#fff' }
      ]}>
        <View style={styles.routineInfo}>
          <Text style={[
            styles.routineName,
            { color: theme.text }
          ]}>
            {item.name}
          </Text>
          <Text style={[
            styles.routineDetails,
            { color: theme.textSecondary }
          ]}>
            {item.area} • {item.duration} minutes
            {item.customStretches && ` • ${stretchCount} stretches${breakCount > 0 ? `, ${breakCount} breaks` : ''}`}
          </Text>
        </View>
        
        <View style={styles.routineActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => startCustomRoutine(item)}
          >
            <Ionicons name="play" size={18} color={theme.accent} />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => deleteCustomRoutine(item.id)}
          >
            <Ionicons name="trash" size={18} color="#FF5252" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <>
      {/* Warning about max routines */}
      {customRoutines.length >= MAX_CUSTOM_ROUTINES - 3 && (
        <View style={[
          styles.warningBox, 
          { backgroundColor: isDark ? theme.cardBackground : '#FFF9C4' }
        ]}>
          <Ionicons name="information-circle" size={20} color={isDark ? theme.textSecondary : '#FFA000'} />
          <Text style={[
            styles.warningText,
            { color: isDark ? theme.textSecondary : '#5D4037' }
          ]}>
            You have {MAX_CUSTOM_ROUTINES - customRoutines.length} routine slots remaining. Maximum is {MAX_CUSTOM_ROUTINES}.
          </Text>
        </View>
      )}
      
      {/* Routines List */}
      {customRoutines.length > 0 ? (
        <View style={styles.routinesList}>
          {customRoutines.map(item => (
            <View key={item.id} style={styles.routineItemContainer}>
              {renderRoutineItem(item)}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Ionicons 
            name="fitness-outline" 
            size={48} 
            color={isDark ? theme.textSecondary : '#ccc'} 
          />
          <Text style={[
            styles.emptyText,
            { color: theme.textSecondary }
          ]}>
            You haven't created any custom routines yet.
          </Text>
          <Text style={[
            styles.emptySubtext,
            { color: theme.textSecondary }
          ]}>
            Tap the + button to create your first routine.
          </Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9C4',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  warningText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#5D4037',
    flex: 1,
  },
  routinesList: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  routineItemContainer: {
    marginBottom: 12,
  },
  routineItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  routineInfo: {
    flex: 1,
  },
  routineName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  routineDetails: {
    fontSize: 14,
    color: '#666',
  },
  routineActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
    marginLeft: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});

export default RoutineList; 