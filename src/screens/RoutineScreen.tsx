import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Share,
  Animated,
  Dimensions,
  SafeAreaView,
  Platform,
  ActivityIndicator,
  FlatList
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect, CommonActions } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { RoutineParams, Stretch, ProgressEntry, AppNavigationProp } from '../types';
import { generateRoutine } from '../utils/routineGenerator';
import { saveProgress, getIsPremium, getRecentRoutines, saveFavoriteRoutine } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function RoutineScreen() {
  const navigation = useNavigation<AppNavigationProp>();
  const route = useRoute();
  
  // State for routine and current stretch
  const [routine, setRoutine] = useState<Stretch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRoutineComplete, setIsRoutineComplete] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasParams, setHasParams] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [recentRoutines, setRecentRoutines] = useState<ProgressEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Animation values
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Get the current stretch
  const currentStretch = routine[currentIndex];
  
  // Load premium status and recent routines
  useEffect(() => {
    const loadData = async () => {
      try {
        const premium = await getIsPremium();
        setIsPremium(premium);
        
        const routines = await getRecentRoutines();
        setRecentRoutines(routines || []); // Ensure we always have an array
      } catch (error) {
        console.error('Error loading data:', error);
        // Set empty array on error to prevent loading state from getting stuck
        setRecentRoutines([]);
      } finally {
        // Always set loading to false, even if there's an error
        setIsLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Reset screen state when focused
  useFocusEffect(
    React.useCallback(() => {
      // Reset all state when the screen comes into focus
      setCurrentIndex(0);
      setIsPaused(false);
      setTimeRemaining(0);
      progressAnim.setValue(0);
      fadeAnim.setValue(1);
      
      // Check if we have parameters
      if (route.params) {
        setHasParams(true);
        const params = route.params as RoutineParams;
        const generatedRoutine = generateRoutine(
          params.area,
          params.duration,
          params.level
        );
        setRoutine(generatedRoutine);
        
        if (generatedRoutine.length > 0) {
          setTimeRemaining(generatedRoutine[0].duration);
        }
        
        // Reset completion state when starting a new routine
        setIsRoutineComplete(false);
      } else {
        // No params, show empty state
        setHasParams(false);
        setRoutine([]);
        
        // Refresh recent routines when returning to this screen
        const refreshData = async () => {
          const routines = await getRecentRoutines();
          setRecentRoutines(routines || []);
        };
        
        refreshData();
      }
      
      // Clean up timer when screen loses focus
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };
    }, [route.params])
  );
  
  // Timer effect
  useEffect(() => {
    if (routine.length === 0 || isPaused || isRoutineComplete) return;
    
    if (timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
        
        // Update progress animation
        Animated.timing(progressAnim, {
          toValue: 1 - (timeRemaining - 1) / currentStretch.duration,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      }, 1000);
    } else {
      // Time's up for current stretch
      if (currentIndex < routine.length - 1) {
        // Move to next stretch with animation
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          })
        ]).start();
        
        // Reset progress animation
        progressAnim.setValue(0);
        
        // Move to next stretch
        setCurrentIndex(prev => prev + 1);
        setTimeRemaining(routine[currentIndex + 1].duration);
      } else {
        // Routine complete
        setIsRoutineComplete(true);
        
        // Save progress
        if (route.params) {
          const params = route.params as RoutineParams;
          handleComplete();
        }
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timeRemaining, currentIndex, routine, isPaused, isRoutineComplete]);
  
  // Handle pause/resume
  const togglePause = () => {
    setIsPaused(prev => !prev);
  };
  
  // Handle skip to next stretch
  const handleNext = () => {
    if (currentIndex < routine.length - 1) {
      // Reset progress animation
      progressAnim.setValue(0);
      
      // Move to next stretch
      setCurrentIndex(prev => prev + 1);
      setTimeRemaining(routine[currentIndex + 1].duration);
    } else {
      // Complete routine if on last stretch
      setIsRoutineComplete(true);
      
      // Save progress
      if (route.params) {
        const params = route.params as RoutineParams;
        handleComplete();
      }
    }
  };
  
  // Handle previous stretch
  const handlePrevious = () => {
    if (currentIndex > 0) {
      // Reset progress animation
      progressAnim.setValue(0);
      
      // Move to previous stretch
      setCurrentIndex(prev => prev - 1);
      setTimeRemaining(routine[currentIndex - 1].duration);
    }
  };
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Calculate overall progress
  const calculateOverallProgress = () => {
    if (routine.length === 0) return 0;
    
    const totalStretches = routine.length;
    const completedStretches = currentIndex;
    const currentProgress = 1 - (timeRemaining / currentStretch.duration);
    
    return (completedStretches + currentProgress) / totalStretches;
  };
  
  // Handle save and exit
  const handleSaveAndExit = () => {
    // Save progress
    if (route.params) {
      const params = route.params as RoutineParams;
      handleComplete();
      
      Alert.alert('Progress Saved', 'Your routine has been saved to your progress');
    }
    navigateToHome();
  };
  
  // Handle share
  const handleShare = async () => {
    try {
      if (route.params) {
        const params = route.params as RoutineParams;
        const message = `I just completed a ${params.duration}-minute ${params.level} ${params.area} stretching routine with DeskStretch! 💪`;
        
        await Share.share({
          message,
          title: 'My DeskStretch Routine'
        });
        
        // After sharing, clear params and navigate
        navigation.setParams(undefined);
        navigation.navigate('Home');
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };
  
  // Navigate to home to create a routine
  const navigateToHome = () => {
    // First clear params
    navigation.setParams(undefined);
    
    // Then reset the entire navigation state to ensure a fresh start
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Home' }]
      })
    );
  };
  
  // Save routine to favorites
  const saveToFavorites = async () => {
    if (!isPremium) {
      Alert.alert(
        'Premium Feature',
        'Saving routines to favorites is a premium feature. Upgrade to unlock unlimited favorites!',
        [
          { text: 'Maybe Later', style: 'cancel' },
          { 
            text: 'Upgrade', 
            onPress: () => navigation.navigate('Home', { openSubscription: true })
          }
        ]
      );
      return;
    }
    
    if (route.params) {
      const params = route.params as RoutineParams;
      await saveFavoriteRoutine(params);
      Alert.alert('Success', 'Routine saved to your favorites!');
      
      // After saving, clear params and navigate
      navigation.setParams(undefined);
      navigation.navigate('Home');
    }
  };
  
  // Start a recent routine
  const startRecentRoutine = (routine: ProgressEntry) => {
    navigation.navigate('Routine', {
      area: routine.area,
      duration: routine.duration,
      level: 'beginner', // Default to beginner or could store level in progress
      timestamp: new Date().getTime() // Force refresh
    });
  };
  
  // Get a random suggestion
  const getRandomSuggestion = () => {
    const areas = ['Hips & Legs', 'Lower Back', 'Upper Back & Chest', 'Shoulders & Arms', 'Neck', 'Full Body'];
    const durations = ['5', '10', '15'];
    const levels = ['beginner', 'intermediate', 'advanced'];
    
    const randomArea = areas[Math.floor(Math.random() * areas.length)];
    const randomDuration = durations[Math.floor(Math.random() * durations.length)];
    const randomLevel = levels[Math.floor(Math.random() * levels.length)];
    
    return {
      area: randomArea,
      duration: randomDuration,
      level: randomLevel,
      timestamp: new Date().getTime()
    };
  };
  
  // Get a smart suggestion based on user history
  const getSmartSuggestion = () => {
    // This would be more sophisticated in a real app, analyzing user patterns
    // For now, we'll just suggest focusing on areas they haven't done recently
    
    const areas = ['Hips & Legs', 'Lower Back', 'Upper Back & Chest', 'Shoulders & Arms', 'Neck', 'Full Body'];
    const recentAreas = recentRoutines.map(r => r.area);
    
    // Find areas they haven't done recently
    const unusedAreas = areas.filter(area => !recentAreas.includes(area));
    
    // If they've done all areas, suggest one they've done least recently
    const suggestedArea = unusedAreas.length > 0 
      ? unusedAreas[Math.floor(Math.random() * unusedAreas.length)]
      : areas[Math.floor(Math.random() * areas.length)];
    
    // Suggest a slightly longer duration than their average
    const avgDuration = recentRoutines.length > 0
      ? Math.min(15, Math.ceil(recentRoutines.reduce((sum, r) => sum + parseInt(r.duration), 0) / recentRoutines.length) + 5)
      : 10;
    
    const suggestedDuration = avgDuration <= 5 ? '5' : avgDuration <= 10 ? '10' : '15';
    
    // Suggest a level based on their history
    const suggestedLevel = recentRoutines.length >= 10 ? 'advanced' : 
                          recentRoutines.length >= 5 ? 'intermediate' : 'beginner';
    
    return {
      area: suggestedArea,
      duration: suggestedDuration,
      level: suggestedLevel,
      timestamp: new Date().getTime()
    };
  };
  
  // Add this function to handle routine completion
  const handleComplete = async () => {
    // Stop the timer if it's running
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Mark routine as complete
    setIsRoutineComplete(true);
    
    // Save progress if we have params
    if (route.params) {
      const params = route.params as RoutineParams;
      
      try {
        // Save to progress for premium users
        await saveProgress({
          date: new Date().toISOString(),
          area: params.area,
          duration: params.duration
        });
        
        // Save to recent routines for all users
        const entry: ProgressEntry = {
          area: params.area,
          duration: params.duration,
          date: new Date().toISOString()
        };
        
        // Get existing recent routines
        const existingRoutines = await getRecentRoutines();
        
        // Add new routine to the beginning
        const updatedRoutines = [entry, ...existingRoutines];
        
        // Save back to storage
        await AsyncStorage.setItem('@progress', JSON.stringify(updatedRoutines));
        
        // Update local state
        setRecentRoutines(updatedRoutines);
        
        console.log('Routine saved successfully');
      } catch (error) {
        console.error('Error saving routine:', error);
      }
    }
  };
  
  // Render the empty state with recent routines
  const renderEmptyState = () => {
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
            onPress={navigateToHome}
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
    
    return (
      <ScrollView style={styles.container}>
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
        <FlatList
          data={displayRoutines}
          keyExtractor={(item, index) => `routine-${index}-${item.date}`}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.routineCard}
              onPress={() => startRecentRoutine(item)}
            >
              <View style={styles.routineCardContent}>
                <View>
                  <Text style={styles.routineCardTitle}>{item.area}</Text>
                  <Text style={styles.routineCardSubtitle}>
                    {item.duration} min • {new Date(item.date).toLocaleDateString()}
                  </Text>
                </View>
                <Ionicons name="play-circle" size={32} color="#4CAF50" />
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={() => (
            <View style={styles.suggestionsContainer}>
              <Text style={styles.sectionTitle}>
                {isPremium ? 'Smart Suggestions' : 'Try Something New'}
              </Text>
              
              <View style={styles.suggestionCards}>
                {/* Random suggestion - available to all users */}
                <TouchableOpacity 
                  style={styles.suggestionCard}
                  onPress={() => {
                    const suggestion = getRandomSuggestion();
                    navigation.navigate('Routine', suggestion);
                  }}
                >
                  <Ionicons name="shuffle" size={32} color="#FF9800" />
                  <Text style={styles.suggestionTitle}>Random</Text>
                  <Text style={styles.suggestionSubtitle}>
                    Try a random routine
                  </Text>
                </TouchableOpacity>
                
                {/* Smart suggestion - premium only */}
                {isPremium && (
                  <TouchableOpacity 
                    style={styles.suggestionCard}
                    onPress={() => {
                      const suggestion = getSmartSuggestion();
                      navigation.navigate('Routine', suggestion);
                    }}
                  >
                    <Ionicons name="bulb" size={32} color="#4CAF50" />
                    <Text style={styles.suggestionTitle}>Smart Pick</Text>
                    <Text style={styles.suggestionSubtitle}>
                      Based on your progress
                    </Text>
                  </TouchableOpacity>
                )}
                
                {/* Custom routine - available to all */}
                <TouchableOpacity 
                  style={styles.suggestionCard}
                  onPress={navigateToHome}
                >
                  <Ionicons name="create" size={32} color="#2196F3" />
                  <Text style={styles.suggestionTitle}>Custom</Text>
                  <Text style={styles.suggestionSubtitle}>
                    Create your own
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </ScrollView>
    );
  };
  
  // Render the completed state
  const renderCompletedState = () => {
    if (!route.params) return renderEmptyState();
    
    const params = route.params as RoutineParams;
    
    return (
      <View style={styles.completedContainer}>
        <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
        <Text style={styles.completedTitle}>Routine Complete!</Text>
        <Text style={styles.completedSubtitle}>Great job on your stretching routine</Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={24} color="#666" />
            <Text style={styles.statValue}>{params.duration} mins</Text>
            <Text style={styles.statLabel}>Duration</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="fitness-outline" size={24} color="#666" />
            <Text style={styles.statValue}>{routine.length}</Text>
            <Text style={styles.statLabel}>Stretches</Text>
          </View>
          
          <View style={styles.statItem}>
            <Ionicons name="body-outline" size={24} color="#666" />
            <Text style={styles.statValue}>{params.area}</Text>
            <Text style={styles.statLabel}>Focus Area</Text>
          </View>
        </View>
        
        <View style={styles.buttonContainer}>
          {isPremium ? (
            <TouchableOpacity 
              style={[styles.button, styles.favoriteButton]} 
              onPress={saveToFavorites}
            >
              <Ionicons name="star" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.button, styles.premiumButton]} 
              onPress={() => navigation.navigate('Home', { openSubscription: true })}
            >
              <Ionicons name="lock-closed" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Premium</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.button, styles.shareButton]} 
            onPress={handleShare}
          >
            <Ionicons name="share-social-outline" size={20} color="#FFF" />
            <Text style={styles.buttonText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, styles.newRoutineButton]} 
            onPress={navigateToHome}
          >
            <Ionicons name="home-outline" size={20} color="#FFF" />
            <Text style={styles.buttonText}>Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // Main render function
  if (!hasParams) {
    return (
      <SafeAreaView style={styles.container}>
        {renderEmptyState()}
      </SafeAreaView>
    );
  }
  
  if (routine.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Creating your routine...</Text>
        </View>
      </SafeAreaView>
    );
  }
  
  if (isRoutineComplete) {
    return (
      <SafeAreaView style={styles.container}>
        {renderCompletedState()}
      </SafeAreaView>
    );
  }
  
  // Render active routine screen
  return (
    <SafeAreaView style={styles.container}>
      {/* Header with progress */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            Alert.alert(
              'Exit Routine',
              'Do you want to save your progress and exit?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Save & Exit', onPress: handleSaveAndExit }
              ]
            );
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View 
              style={[
                styles.progressFill, 
                { width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%']
                })}
              ]} 
            />
          </View>
          <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
        </View>
        
        <Text style={styles.progressText}>
          {currentIndex + 1}/{routine.length}
        </Text>
      </View>
      
      {/* Main content */}
      <Animated.View 
        style={[styles.stretchContainer, { opacity: fadeAnim }]}
      >
        <Text style={styles.stretchName}>{currentStretch.name}</Text>
        
        <View style={styles.imageContainer}>
          <Image 
            source={currentStretch.image} 
            style={styles.stretchImage}
            resizeMode="contain"
          />
        </View>
        
        <ScrollView style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            {currentStretch.description}
          </Text>
        </ScrollView>
      </Animated.View>
      
      {/* Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={[styles.controlButton, styles.prevButton]} 
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <Ionicons 
            name="chevron-back" 
            size={24} 
            color={currentIndex === 0 ? "#CCC" : "#333"} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.controlButton, styles.pauseButton]} 
          onPress={togglePause}
        >
          <Ionicons 
            name={isPaused ? "play" : "pause"} 
            size={24} 
            color="#FFF" 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.controlButton, styles.nextButton]} 
          onPress={handleNext}
        >
          <Ionicons name="chevron-forward" size={24} color="#333" />
        </TouchableOpacity>
      </View>
      
      {/* Overall progress */}
      <View style={styles.overallProgressContainer}>
        <View style={styles.overallProgressTrack}>
          <View 
            style={[
              styles.overallProgressFill, 
              { width: `${calculateOverallProgress() * 100}%` }
            ]} 
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9F9F9',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    marginTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  backButton: {
    padding: 8,
  },
  progressContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  timerText: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#666',
  },
  stretchContainer: {
    flex: 1,
    padding: 16,
  },
  stretchName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  imageContainer: {
    height: height * 0.3,
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  stretchImage: {
    width: '100%',
    height: '100%',
  },
  descriptionContainer: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  descriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  prevButton: {
    backgroundColor: '#F5F5F5',
  },
  pauseButton: {
    backgroundColor: '#4CAF50',
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  nextButton: {
    backgroundColor: '#F5F5F5',
  },
  overallProgressContainer: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
    backgroundColor: '#FFF',
  },
  overallProgressTrack: {
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  overallProgressFill: {
    height: '100%',
    backgroundColor: '#FF9800',
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  completedSubtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
    marginBottom: 32,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 40,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  favoriteButton: {
    backgroundColor: '#FF9800',
  },
  shareButton: {
    backgroundColor: '#FF9800',
  },
  newRoutineButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 18,
    color: '#666',
    marginTop: 8,
    marginBottom: 32,
  },
  createButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
  },
  createButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerContainer: {
    padding: 16,
    paddingBottom: 24,
    backgroundColor: '#FFF',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  premiumNote: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  routineCard: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  routineCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  routineCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  routineCardSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  suggestionsContainer: {
    padding: 16,
    backgroundColor: '#FFF',
  },
  suggestionCards: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  suggestionCard: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 8,
    alignItems: 'center',
  },
  suggestionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  suggestionSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  premiumButton: {
    backgroundColor: '#FF9800',
  },
}); 