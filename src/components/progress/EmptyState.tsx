import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface EmptyStateProps {
  isLoading: boolean;
  onStartRoutine: () => void;
  allRoutinesHidden?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  isLoading,
  onStartRoutine,
  allRoutinesHidden = false
}) => {
  const { theme, isDark, isSunset } = useTheme();
  
  if (isLoading) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: isDark || isSunset ? theme.background : '#F5F5F5' }]}>
        <ActivityIndicator size="large" color={isDark || isSunset ? theme.accent : "#4CAF50"} />
        <Text style={[styles.emptySubtitle, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
          Loading your progress data...
        </Text>
      </View>
    );
  }
  
  if (allRoutinesHidden) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: isDark || isSunset ? theme.background : '#F5F5F5' }]}>
        <View style={styles.iconContainer}>
          <Ionicons name="eye-off-outline" size={80} color={isDark || isSunset ? theme.textSecondary : "#CCCCCC"} />
        </View>
        
        <Text style={[styles.emptyTitle, { color: isDark || isSunset ? theme.text : '#333' }]}>All Routines Hidden</Text>
        <Text style={[styles.emptySubtitle, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
          You've hidden all your routines. You still have progress data and achievements saved.
        </Text>
        
        <TouchableOpacity 
          style={[styles.createButton, { backgroundColor: isDark || isSunset ? theme.accent : '#4CAF50' }]}
          onPress={onStartRoutine}
        >
          <Ionicons name="play" size={20} color="#FFF" style={styles.buttonIcon} />
          <Text style={styles.createButtonText}>Start New Routine</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.emptyContainer, { backgroundColor: isDark || isSunset ? theme.background : '#F5F5F5' }]}>
      <View style={styles.iconContainer}>
        <Ionicons name="fitness-outline" size={80} color={isDark || isSunset ? theme.accent : "#4CAF50"} />
        <View style={[styles.badge, { backgroundColor: isDark ? '#FF9800' : '#FF9800' }]}>
          <Ionicons name="star" size={24} color="#FFF" />
        </View>
      </View>
      
      <Text style={[styles.emptyTitle, { color: isDark || isSunset ? theme.text : '#333' }]}>Begin Your Journey!</Text>
      <Text style={[styles.emptySubtitle, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
        Complete your first stretching routine to start tracking your progress and earning achievements
      </Text>
      
      <View style={[styles.benefitsContainer, { 
        backgroundColor: isDark || isSunset ? theme.cardBackground : '#FFF',
        shadowColor: isDark || isSunset ? 'rgba(0,0,0,0.5)' : '#000'
      }]}>
        <View style={styles.benefitItem}>
          <Ionicons name="trophy-outline" size={24} color={isDark || isSunset ? theme.accent : "#4CAF50"} />
          <Text style={[styles.benefitText, { color: isDark || isSunset ? theme.text : '#333' }]}>Earn XP and level up</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="trending-up-outline" size={24} color={isDark || isSunset ? theme.accent : "#4CAF50"} />
          <Text style={[styles.benefitText, { color: isDark ? theme.text : '#333' }]}>Track your consistency</Text>
        </View>
        <View style={styles.benefitItem}>
          <Ionicons name="ribbon-outline" size={24} color={isDark || isSunset ? theme.accent : "#4CAF50"} />
          <Text style={[styles.benefitText, { color: isDark ? theme.text : '#333' }]}>Unlock achievements</Text>
        </View>
      </View>
      
      <TouchableOpacity 
        style={[styles.createButton, { backgroundColor: isDark || isSunset ? theme.accent : '#4CAF50' }]}
        onPress={onStartRoutine}
      >
        <Ionicons name="play" size={20} color="#FFF" style={styles.buttonIcon} />
        <Text style={styles.createButtonText}>Start Your First Routine</Text>
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
  iconContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  badge: {
    position: 'absolute',
    bottom: -5,
    right: -10,
    backgroundColor: '#FF9800',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  benefitsContainer: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 4,
  },
  benefitText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EmptyState; 