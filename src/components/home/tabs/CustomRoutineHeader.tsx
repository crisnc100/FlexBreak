import React from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface CustomRoutineHeaderProps {
  isCustomMode: boolean;
  setIsCustomMode: (value: boolean) => void;
  showCreateForm: boolean;
  setShowCreateForm: (value: boolean) => void;
  theme: any;
  isDark: boolean;
  isSunset: boolean;
}

const CustomRoutineHeader: React.FC<CustomRoutineHeaderProps> = ({
  isCustomMode,
  setIsCustomMode,
  showCreateForm,
  setShowCreateForm,
  theme,
  isDark,
  isSunset
}) => {
  return (
    <View style={styles.header}>
      <Text style={[
        styles.screenTitle,
        { color: theme.text }
      ]}>
        {isCustomMode ? 'Custom Routines' : 'Custom Routines'}
      </Text>
      
      <View style={styles.headerRight}>
        <View style={styles.modeToggleContainer}>
          <Text style={[styles.modeToggleLabel, { color: theme.textSecondary }]}>
            Pick my own stretches
          </Text>
          <Switch
            value={isCustomMode}
            onValueChange={setIsCustomMode}
            trackColor={{ false: '#767577', true: theme.accent + '50' }}
            thumbColor={isCustomMode ? theme.accent : '#f4f3f4'}
          />
        </View>

        {isCustomMode && (
          <TouchableOpacity
            style={[
              styles.createButton,
              { backgroundColor: theme.accent }
            ]}
            onPress={() => setShowCreateForm(!showCreateForm)}
          >
            <Ionicons 
              name={showCreateForm ? "close" : "add"} 
              size={20} 
              color="#fff" 
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    marginBottom: 8,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeToggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modeToggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 10,
  },
  createButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default CustomRoutineHeader; 