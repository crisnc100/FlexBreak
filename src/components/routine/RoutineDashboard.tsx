import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ProgressEntry } from '../../types';
import RoutineItem from './RoutineItem';
import { RefreshableScrollView } from '../common';

interface RoutineDashboardProps {
  recentRoutines: ProgressEntry[];
  isPremium: boolean;
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh: () => Promise<void>;
  onStartRecent: (routine: ProgressEntry) => void;
  onRandomSuggestion: () => void;
  onSmartPick: () => void;
  onCreateNew: () => void;
  onDeleteRoutine: (routineDate: string) => void;
}

interface WeeklyRoutines {
  [key: string]: ProgressEntry[];
}

const RoutineDashboard: React.FC<RoutineDashboardProps> = ({
  recentRoutines,
  isPremium,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  onStartRecent,
  onRandomSuggestion,
  onSmartPick,
  onCreateNew,
  onDeleteRoutine
}) => {
  // Organize routines by week
  const organizeRoutinesByWeek = (routines: ProgressEntry[]): WeeklyRoutines => {
    const weeks: WeeklyRoutines = {};
    
    routines.forEach(routine => {
      const date = new Date(routine.date);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let weekLabel = '';
      if (diffDays <= 7) {
        weekLabel = 'This Week';
      } else if (diffDays <= 14) {
        weekLabel = 'Last Week';
      } else if (diffDays <= 21) {
        weekLabel = '2 Weeks Ago';
      } else {
        weekLabel = '3 Weeks Ago';
      }
      
      if (!weeks[weekLabel]) {
        weeks[weekLabel] = [];
      }
      weeks[weekLabel].push(routine);
    });
    
    return weeks;
  };

  // Loading state
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading your routines...</Text>
      </View>
    );
  }

  // No routines yet - show first-time user experience
  if (recentRoutines.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="fitness-outline" size={80} color="#CCCCCC" />
        <Text style={styles.emptyTitle}>No Routines Yet</Text>
        <Text style={styles.emptySubtitle}>
          Create your first personalized stretching routine
        </Text>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={onCreateNew}
        >
          <Text style={styles.createButtonText}>Create Routine</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // User has completed routines before - show history and suggestions
  // Limit to 3 for free users, all for premium
  const displayRoutines = isPremium 
    ? recentRoutines 
    : recentRoutines.slice(0, 3);
  
  // Recent routines list
  const weeks = organizeRoutinesByWeek(displayRoutines);
  
  return (
    <GestureHandlerRootView style={styles.container}>
      <RefreshableScrollView
        onRefresh={onRefresh}
        refreshing={isRefreshing}
        showRefreshingFeedback={true}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.sectionTitle}>Your Recent Routines</Text>
          {!isPremium && recentRoutines.length > 3 && (
            <Text style={styles.premiumNote}>
              <Ionicons name="lock-closed" size={14} color="#FF9800" /> 
              Upgrade to premium to access all your history
            </Text>
          )}
        </View>
        
        {/* Recent routines list */}
        {Object.entries(weeks).map(([weekLabel, weekRoutines]) => (
          <View key={weekLabel}>
            <Text style={styles.weekLabel}>{weekLabel}</Text>
            {weekRoutines.map((item, index) => (
              <RoutineItem 
                key={`${item.date}-${index}`}
                item={item}
                onPress={() => onStartRecent(item)}
                onDelete={() => onDeleteRoutine(item.date)}
              />
            ))}
          </View>
        ))}
        
        {/* Suggestions section */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.sectionTitle}>
            {isPremium ? 'Smart Suggestions' : 'Try Something New'}
          </Text>
          
          <View style={styles.suggestionCards}>
            {/* Random suggestion - available to all users */}
            <TouchableOpacity 
              style={styles.suggestionCard}
              onPress={onRandomSuggestion}
            >
              <Ionicons name="shuffle" size={32} color="#FF9800" />
              <Text style={styles.suggestionTitle}>Random</Text>
              <Text style={styles.suggestionSubtitle}>
                Try a random routine
              </Text>
            </TouchableOpacity>
            
            {/* Smart suggestion - show to all but locked for free users */}
            <TouchableOpacity 
              style={styles.suggestionCard}
              onPress={onSmartPick}
            >
              <View style={styles.smartPickContainer}>
                <Ionicons name="bulb" size={32} color="#4CAF50" />
                {!isPremium && (
                  <View style={styles.premiumBadge}>
                    <Ionicons name="lock-closed" size={12} color="#FFF" />
                  </View>
                )}
              </View>
              <Text style={styles.suggestionTitle}>Smart Pick</Text>
              <Text style={styles.suggestionSubtitle}>
                {isPremium ? "Based on your progress" : "Personalized for you"}
              </Text>
            </TouchableOpacity>
            
            {/* Custom routine - available to all */}
            <TouchableOpacity 
              style={styles.suggestionCard}
              onPress={onCreateNew}
            >
              <Ionicons name="create" size={32} color="#2196F3" />
              <Text style={styles.suggestionTitle}>Custom</Text>
              <Text style={styles.suggestionSubtitle}>
                Create your own
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </RefreshableScrollView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
    marginBottom: 24,
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  premiumNote: {
    fontSize: 14,
    color: '#FF9800',
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginLeft: 16,
    marginBottom: 8,
  },
  suggestionsContainer: {
    padding: 16,
    marginTop: 16,
  },
  suggestionCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  suggestionCard: {
    width: '31%',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 12,
    textAlign: 'center',
  },
  suggestionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  smartPickContainer: {
    position: 'relative',
  },
  premiumBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF9800',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RoutineDashboard;