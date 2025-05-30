import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { ProgressEntry } from '../../types';
import RoutineItem from './RoutineItem';
import { RefreshableScrollView } from '../common';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../../context/ThemeContext';
import { getFavoriteRoutines } from '../../services/storageService';

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
  onFavoriteRoutine?: (routineDate: string) => void;
}

interface WeeklyRoutines {
  [key: string]: ProgressEntry[];
}

// Time period types for the navigation
type TimePeriod = 'This Week' | 'Last Week' | '2 Weeks Ago' | '3 Weeks Ago' | '1 Month Ago' | 'Older';
const TIME_PERIODS: TimePeriod[] = ['This Week', 'Last Week', '2 Weeks Ago', '3 Weeks Ago', '1 Month Ago', 'Older'];

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
  onDeleteRoutine,
  onFavoriteRoutine
}) => {
  const { theme, isDark, isSunset } = useTheme();
  // Move hooks to the top level of the component
  const [hasCompletedRoutinesBefore, setHasCompletedRoutinesBefore] = useState<boolean | null>(null);
  const [activeTimePeriod, setActiveTimePeriod] = useState<TimePeriod>('This Week');
  const [organizedRoutines, setOrganizedRoutines] = useState<WeeklyRoutines>({});
  const [availableTimePeriods, setAvailableTimePeriods] = useState<TimePeriod[]>([]);
  
  // State to store favorite routines list
  const [favoriteRoutines, setFavoriteRoutines] = useState<any[]>([]);

  const loadFavoriteRoutines = async () => {
    try {
      const favs = await getFavoriteRoutines();
      setFavoriteRoutines(favs);
    } catch (e) {
      console.error('Error loading favorite routines:', e);
    }
  };

  // Load favorites whenever recent routines change
  useEffect(() => {
    loadFavoriteRoutines();
  }, [recentRoutines]);

  // Helper to check if a routine is favorite
  const isFavoriteRoutine = (item: ProgressEntry) => {
    return favoriteRoutines.some(fav =>
      fav.area === item.area &&
      fav.duration === item.duration &&
      JSON.stringify(fav.savedStretches || []) === JSON.stringify(item.savedStretches || [])
    );
  };

  // Wrap onFavoriteRoutine to refresh favorites after toggle
  const handleFavorite = async (routineDate: string) => {
    if (onFavoriteRoutine) {
      await onFavoriteRoutine(routineDate);
      await loadFavoriteRoutines();
    }
  };
  
  // Check if user has completed routines before
  useEffect(() => {
    const checkCompletedRoutines = async () => {
      try {
        const allRoutinesJson = await AsyncStorage.getItem('progress');
        const hasCompleted = allRoutinesJson && JSON.parse(allRoutinesJson).length > 0;
        setHasCompletedRoutinesBefore(hasCompleted);
      } catch (error) {
        console.error('Error checking completed routines:', error);
        setHasCompletedRoutinesBefore(false);
      }
    };
    
    // Only check if there are no recent routines
    if (recentRoutines.length === 0) {
      checkCompletedRoutines();
    } else {
      // If there are routines, we know the user has completed routines before
      setHasCompletedRoutinesBefore(true);
    }
  }, [recentRoutines.length]);
  
  // Organize routines by time period
  useEffect(() => {
    const organizeRoutinesByPeriod = (routines: ProgressEntry[]): WeeklyRoutines => {
      const periodRoutines: WeeklyRoutines = {};
      
      routines.forEach(routine => {
        const date = new Date(routine.date);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - date.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let periodLabel: TimePeriod;
        if (diffDays <= 7) {
          periodLabel = 'This Week';
        } else if (diffDays <= 14) {
          periodLabel = 'Last Week';
        } else if (diffDays <= 21) {
          periodLabel = '2 Weeks Ago';
        } else if (diffDays <= 28) {
          periodLabel = '3 Weeks Ago';
        } else if (diffDays <= 31) {
          periodLabel = '1 Month Ago';
        } else {
          periodLabel = 'Older';
        }
        
        if (!periodRoutines[periodLabel]) {
          periodRoutines[periodLabel] = [];
        }
        periodRoutines[periodLabel].push(routine);
      });
      
      // Create a list of available time periods (only those with routines)
      const periods = Object.keys(periodRoutines) as TimePeriod[];
      setAvailableTimePeriods(periods.sort((a, b) => {
        return TIME_PERIODS.indexOf(a) - TIME_PERIODS.indexOf(b);
      }));
      
      // Set active time period to the most recent one with routines
      if (periods.length > 0 && !periodRoutines[activeTimePeriod]) {
        setActiveTimePeriod(periods[0]);
      }
      
      return periodRoutines;
    };
    
    const organized = organizeRoutinesByPeriod(recentRoutines);
    setOrganizedRoutines(organized);
  }, [recentRoutines, activeTimePeriod]);
  
  // Navigation for time periods
  const navigateToPeriod = (direction: 'next' | 'prev') => {
    if (availableTimePeriods.length <= 1) return;
    
    const currentIndex = availableTimePeriods.indexOf(activeTimePeriod);
    let newIndex: number;
    
    if (direction === 'next') {
      newIndex = (currentIndex + 1) % availableTimePeriods.length;
    } else {
      newIndex = (currentIndex - 1 + availableTimePeriods.length) % availableTimePeriods.length;
    }
    
    setActiveTimePeriod(availableTimePeriods[newIndex]);
  };

  // Loading state
  if (isLoading || (recentRoutines.length === 0 && hasCompletedRoutinesBefore === null)) {
    return (
      <RefreshableScrollView
        onRefresh={onRefresh}
        refreshing={isRefreshing}
        showRefreshingFeedback={true}
      >
        <View style={[styles.loadingContainer, { backgroundColor: isDark || isSunset ? theme.background : '#FFF' }]}>
          <ActivityIndicator size="large" color={isDark || isSunset ? theme.accent : "#4CAF50"} />
          <Text style={[styles.loadingText, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>Loading your routines...</Text>
        </View>
      </RefreshableScrollView>
    );
  }

  // First-time user experience - no routines and never completed any
  if (recentRoutines.length === 0 && hasCompletedRoutinesBefore === false) {
    return (
      <RefreshableScrollView
        onRefresh={onRefresh}
        refreshing={isRefreshing}
        showRefreshingFeedback={true}
      >
        <View style={[styles.emptyContainer, { backgroundColor: isDark || isSunset ? theme.background : '#FFF' }]}>
          <Ionicons 
            name="fitness-outline" 
            size={80} 
            color={isDark || isSunset ? "#555555" : "#CCCCCC"} 
          />
          <Text style={[styles.emptyTitle, { color: isDark || isSunset ? theme.text : '#333' }]}>No Routines Yet</Text>
          <Text style={[styles.emptySubtitle, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
            Create your first personalized stretching routine
          </Text>
          <TouchableOpacity 
            style={[styles.createButton, { backgroundColor: isDark || isSunset ? theme.accent : '#4CAF50' }]}
            onPress={onCreateNew}
          >
            <Text style={styles.createButtonText}>Create Routine</Text>
          </TouchableOpacity>
        </View>
      </RefreshableScrollView>
    );
  }
  
  // User has completed routines before but has hidden all of them
  if (recentRoutines.length === 0 && hasCompletedRoutinesBefore === true) {
    return (
      <GestureHandlerRootView style={[styles.container, { backgroundColor: isDark || isSunset ? theme.background : '#FFF' }]}>
        <RefreshableScrollView
          onRefresh={onRefresh}
          refreshing={isRefreshing}
          showRefreshingFeedback={true}
        >
          <View style={[styles.hiddenRoutinesContainer, { 
            backgroundColor: isDark || isSunset ? theme.cardBackground : '#F9F9F9',
            shadowColor: isDark || isSunset ? 'rgba(0,0,0,0.3)' : '#000'
          }]}>
            <Ionicons 
              name="eye-off-outline" 
              size={60} 
              color={isDark || isSunset ? "#555555" : "#CCCCCC"} 
            />
            <Text style={[styles.emptyTitle, { color: isDark || isSunset ? theme.text : '#333' }]}>No Recent Routines</Text>
            <Text style={[styles.emptySubtitle, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
              You've hidden all your recent routines. Start a new one or try a suggestion below.
            </Text>
          </View>
          
          {/* Suggestions section */}
          <View style={styles.suggestionsContainer}>
            <Text style={[styles.sectionTitle, { color: isDark || isSunset ? theme.text : '#333' }]}>
              {isPremium ? 'Smart Suggestions' : 'Try Something New'}
            </Text>
            
            <View style={styles.suggestionCards}>
              {/* Random suggestion - available to all users */}
              <TouchableOpacity 
                style={[styles.suggestionCard, { 
                  backgroundColor: isDark || isSunset ? theme.cardBackground : '#F5F5F5',
                  borderColor: isDark || isSunset ? 'rgba(255,255,255,0.1)' : 'transparent',
                  borderWidth: isDark || isSunset ? 1 : 0
                }]}
                onPress={onRandomSuggestion}
              >
                <Ionicons name="shuffle" size={32} color="#FF9800" />
                <Text style={[styles.suggestionTitle, { color: isDark || isSunset ? theme.text : '#333' }]}>Random</Text>
                <Text style={[styles.suggestionSubtitle, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
                  Try a random routine
                </Text>
              </TouchableOpacity>
              
              {/* Smart suggestion - show to all but locked for free users */}
              <TouchableOpacity 
                style={[styles.suggestionCard, { 
                  backgroundColor: isDark || isSunset ? theme.cardBackground : '#F5F5F5',
                  borderColor: isDark || isSunset ? 'rgba(255,255,255,0.1)' : 'transparent',
                  borderWidth: isDark || isSunset ? 1 : 0
                }]}
                onPress={onSmartPick}
              >
                <View style={styles.smartPickContainer}>
                  <Ionicons name="bulb" size={32} color="#4CAF50" />
                  {!isPremium && (
                    <View style={[styles.premiumBadge, {
                      backgroundColor: isDark || isSunset ? '#FF9800' : '#FF9800',
                      // Add subtle border in dark mode for better visibility
                      borderWidth: isDark || isSunset ? 1 : 0,
                      borderColor: isDark || isSunset ? 'rgba(255,255,255,0.2)' : 'transparent'
                    }]}>
                      <Ionicons name="lock-closed" size={12} color="#FFF" />
                    </View>
                  )}
                </View>
                <Text style={[styles.suggestionTitle, { color: isDark || isSunset ? theme.text : '#333' }]}>Smart Pick</Text>
                <Text style={[styles.suggestionSubtitle, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
                  {isPremium ? "Based on your progress" : "Personalized for you"}
                </Text>
              </TouchableOpacity>
              
              {/* Custom routine - available to all */}
              <TouchableOpacity 
                style={[styles.suggestionCard, { 
                  backgroundColor: isDark || isSunset ? theme.cardBackground : '#F5F5F5',
                  borderColor: isDark || isSunset ? 'rgba(255,255,255,0.1)' : 'transparent',
                  borderWidth: isDark || isSunset ? 1 : 0
                }]}
                onPress={onCreateNew}
              >
                <Ionicons name="create" size={32} color="#2196F3" />
                <Text style={[styles.suggestionTitle, { color: isDark || isSunset ? theme.text : '#333' }]}>Custom</Text>
                <Text style={[styles.suggestionSubtitle, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
                  Create your own
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </RefreshableScrollView>
      </GestureHandlerRootView>
    );
  }

  // User has completed routines before - show history and suggestions
  // Limit to 3 for free users, all for premium
  const displayRoutines = isPremium 
    ? recentRoutines 
    : recentRoutines.slice(0, 3);
  
  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: isDark || isSunset ? theme.background : '#FFF' }]}>
      <RefreshableScrollView
        onRefresh={onRefresh}
        refreshing={isRefreshing}
        showRefreshingFeedback={true}
      >
        <View style={[styles.headerContainer, { 
          borderBottomColor: isDark || isSunset ? 'rgba(255,255,255,0.1)' : '#EEE',
          borderBottomWidth: 1,
        }]}>
          <Text style={[styles.sectionTitle, { color: isDark || isSunset ? theme.text : '#333' }]}>Your Recent Routines</Text>
          {!isPremium && recentRoutines.length > 3 && (
            <Text style={[styles.premiumNote, { color: isDark || isSunset ? '#FFC107' : '#FF9800' }]}>
              <Ionicons name="lock-closed" size={14} color={isDark || isSunset ? '#FFC107' : '#FF9800'} /> 
              Upgrade to premium to access all your history
            </Text>
          )}
        </View>
        
        {/* If not premium, just show the first 3 routines as a flat list */}
        {!isPremium && (
          <View>
            {displayRoutines.map((item, index) => (
              <RoutineItem 
                key={`${item.date}-${index}`}
                item={item}
                onPress={() => onStartRecent(item)}
                onDelete={() => onDeleteRoutine(item.date)}
                onFavorite={onFavoriteRoutine ? () => handleFavorite(item.date) : undefined}
                hideLabel="Hide"
                theme={theme}
                isDark={isDark}
                isSunset={isSunset}
                favorite={isFavoriteRoutine(item)}
                isCustom={!!item.customStretches && item.customStretches.length > 0}
              />
            ))}
          </View>
        )}
        
        {/* For premium users, show time period navigation */}
        {isPremium && availableTimePeriods.length > 0 && (
          <>
            {/* Time period navigation */}
            <View style={styles.timeNavigation}>
              <TouchableOpacity
                style={[styles.navButton, { opacity: availableTimePeriods.length > 1 ? 1 : 0.3 }]}
                onPress={() => navigateToPeriod('prev')}
                disabled={availableTimePeriods.length <= 1}
              >
                <Ionicons 
                  name="chevron-back" 
                  size={24} 
                  color={isDark || isSunset ? theme.text : '#333'} 
                />
              </TouchableOpacity>
              
              <View style={styles.timePeriodContainer}>
                <Text style={[styles.timePeriodText, { color: isDark || isSunset ? theme.text : '#333' }]}>
                  {activeTimePeriod}
                </Text>
                <Text style={[styles.timePeriodCount, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
                  {organizedRoutines[activeTimePeriod]?.length || 0} routines
                </Text>
              </View>
              
              <TouchableOpacity
                style={[styles.navButton, { opacity: availableTimePeriods.length > 1 ? 1 : 0.3 }]}
                onPress={() => navigateToPeriod('next')}
                disabled={availableTimePeriods.length <= 1}
              >
                <Ionicons 
                  name="chevron-forward" 
                  size={24} 
                  color={isDark || isSunset ? theme.text : '#333'} 
                />
              </TouchableOpacity>
            </View>
            
            {/* Routines for current time period */}
            {organizedRoutines[activeTimePeriod]?.map((item, index) => (
              <RoutineItem 
                key={`${item.date}-${index}`}
                item={item}
                onPress={() => onStartRecent(item)}
                onDelete={() => onDeleteRoutine(item.date)}
                onFavorite={onFavoriteRoutine ? () => handleFavorite(item.date) : undefined}
                hideLabel="Hide"
                theme={theme}
                isDark={isDark}
                isSunset={isSunset}
                favorite={isFavoriteRoutine(item)}
                isCustom={!!item.customStretches && item.customStretches.length > 0}
              />
            ))}
          </>
        )}
        
        {/* Suggestions section */}
        <View style={styles.suggestionsContainer}>
          <Text style={[styles.sectionTitle, { color: isDark || isSunset ? theme.text : '#333' }]}>
            {isPremium ? 'Smart Suggestions' : 'Try Something New'}
          </Text>
          
          <View style={styles.suggestionCards}>
            {/* Random suggestion - available to all users */}
            <TouchableOpacity 
              style={[styles.suggestionCard, { 
                backgroundColor: isDark || isSunset ? theme.cardBackground : '#F5F5F5',
                borderColor: isDark || isSunset ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderWidth: isDark || isSunset ? 1 : 0
              }]}
              onPress={onRandomSuggestion}
            >
              <Ionicons name="shuffle" size={32} color="#FF9800" />
              <Text style={[styles.suggestionTitle, { color: isDark || isSunset ? theme.text : '#333' }]}>Random</Text>
              <Text style={[styles.suggestionSubtitle, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
                Try a random routine
              </Text>
            </TouchableOpacity>
            
            {/* Smart suggestion - show to all but locked for free users */}
            <TouchableOpacity 
              style={[styles.suggestionCard, { 
                backgroundColor: isDark || isSunset ? theme.cardBackground : '#F5F5F5',
                borderColor: isDark || isSunset ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderWidth: isDark || isSunset ? 1 : 0
              }]}
              onPress={onSmartPick}
            >
              <View style={styles.smartPickContainer}>
                <Ionicons name="bulb" size={32} color="#4CAF50" />
                {!isPremium && (
                  <View style={[styles.premiumBadge, {
                    backgroundColor: isDark || isSunset ? '#FF9800' : '#FF9800',
                    // Add subtle border in dark mode for better visibility
                    borderWidth: isDark || isSunset ? 1 : 0,
                    borderColor: isDark || isSunset ? 'rgba(255,255,255,0.2)' : 'transparent'
                  }]}>
                    <Ionicons name="lock-closed" size={12} color="#FFF" />
                  </View>
                )}
              </View>
              <Text style={[styles.suggestionTitle, { color: isDark || isSunset ? theme.text : '#333' }]}>Smart Pick</Text>
              <Text style={[styles.suggestionSubtitle, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
                {isPremium ? "Based on your progress" : "Personalized for you"}
              </Text>
            </TouchableOpacity>
            
            {/* Custom routine - available to all */}
            <TouchableOpacity 
              style={[styles.suggestionCard, { 
                backgroundColor: isDark || isSunset ? theme.cardBackground : '#F5F5F5',
                borderColor: isDark || isSunset ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderWidth: isDark || isSunset ? 1 : 0
              }]}
              onPress={onCreateNew}
            >
              <Ionicons name="create" size={32} color="#2196F3" />
              <Text style={[styles.suggestionTitle, { color: isDark || isSunset ? theme.text : '#333' }]}>Custom</Text>
              <Text style={[styles.suggestionSubtitle, { color: isDark || isSunset ? theme.textSecondary : '#666' }]}>
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
  timeNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
  },
  timePeriodContainer: {
    alignItems: 'center',
    flex: 1,
  },
  timePeriodText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  timePeriodCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
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
  hiddenRoutinesContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
});

export default RoutineDashboard;