import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  isLoading: boolean;
  onStartRoutine: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  isLoading,
  onStartRoutine
}) => {
  if (isLoading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.emptySubtitle}>
          Loading your progress data...
        </Text>
      </View>
    );
  }
  
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="fitness-outline" size={80} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>No Progress Yet</Text>
      <Text style={styles.emptySubtitle}>
        Complete your first stretching routine to start tracking your progress
      </Text>
      <TouchableOpacity 
        style={styles.createButton}
        onPress={onStartRoutine}
      >
        <Text style={styles.createButtonText}>Start a Routine</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 32,
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EmptyState; 