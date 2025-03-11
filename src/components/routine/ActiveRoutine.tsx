import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BodyArea, Duration, Stretch } from '../../types';
import { generateRoutine } from '../../utils/routineGenerator';
import { useRoutineTimer } from '../../hooks/useRoutineTimer';

const { width, height } = Dimensions.get('window');

export interface ActiveRoutineProps {
  area: BodyArea;
  duration: Duration;
  onComplete: (routineArea: BodyArea, routineDuration: Duration) => Promise<void>;
  onNavigateHome: () => void;
}

const ActiveRoutine: React.FC<ActiveRoutineProps> = ({
  area,
  duration,
  onComplete,
  onNavigateHome
}) => {
  // Generate the routine
  const [routine, setRoutine] = useState<Stretch[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Get the current stretch
  const currentStretch = routine[currentIndex];
  
  // Use our custom timer hook with a callback for when the timer completes
  const { 
    timeRemaining, 
    isPaused, 
    progressAnim, 
    startTimer, 
    pauseTimer, 
    resumeTimer, 
    resetTimer,
    togglePause 
  } = useRoutineTimer({
    onComplete: () => {
      // When the timer completes, move to the next stretch or complete the routine
      if (currentIndex < routine.length - 1) {
        handleNext();
      } else {
        handleComplete();
      }
    }
  });
  
  // Generate the routine when the component mounts
  useEffect(() => {
    if (area && duration) {
      const generatedRoutine = generateRoutine(area, duration, 'beginner');
      setRoutine(generatedRoutine);
      
      if (generatedRoutine.length > 0) {
        // Start the timer with the first stretch duration
        startTimer(generatedRoutine[0].duration);
      }
    }
  }, [area, duration]);
  
  // Handle skip to next stretch
  const handleNext = () => {
    if (currentIndex < routine.length - 1) {
      // Animate the transition
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
      
      // Move to next stretch
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      
      // Start timer for the next stretch
      startTimer(routine[nextIndex].duration);
    } else {
      // Complete routine if on last stretch
      handleComplete();
    }
  };
  
  // Handle previous stretch
  const handlePrevious = () => {
    if (currentIndex > 0) {
      // Animate the transition
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
      
      // Move to previous stretch
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      
      // Start timer for the previous stretch
      startTimer(routine[prevIndex].duration);
    }
  };
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Calculate overall progress
  const calculateOverallProgress = () => {
    if (!routine || routine.length === 0) return 0;
    
    const totalStretches = routine.length;
    const completedStretches = currentIndex;
    const currentProgress = currentStretch ? 
      1 - (timeRemaining / currentStretch.duration) : 0;
    
    return (completedStretches + currentProgress) / totalStretches;
  };
  
  // Handle save and exit
  const handleSaveAndExit = () => {
    // Save progress
    onComplete(area, duration);
    Alert.alert('Progress Saved', 'Your routine has been saved to your progress');
    onNavigateHome();
  };
  
  // Handle routine completion
  const handleComplete = () => {
    // Call the onComplete callback
    onComplete(area, duration);
  };
  
  // If routine is not loaded yet, show loading
  if (!routine || routine.length === 0 || !currentStretch) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Creating your routine...</Text>
      </View>
    );
  }
  
  return (
    <>
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
                  outputRange: ['100%', '0%']
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
          {currentStretch.image && (
            <Image 
              source={currentStretch.image} 
              style={styles.stretchImage}
              resizeMode="contain"
            />
          )}
        </View>
        
        <ScrollView style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>
            {currentStretch.description}
          </Text>
        </ScrollView>
      </Animated.View>
      
      {/* Improved Controls */}
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={[
            styles.controlButton, 
            styles.sideButton,
            currentIndex === 0 && styles.disabledButton
          ]} 
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <View style={styles.buttonContentWrapper}>
            <Ionicons 
              name="chevron-back" 
              size={28} 
              color={currentIndex === 0 ? "#CCC" : "#333"} 
            />
            <Text style={[
              styles.controlText, 
              currentIndex === 0 && styles.disabledText
            ]}>
              Previous
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.centerButton} 
          onPress={togglePause}
        >
          <View style={styles.centerButtonInner}>
            <Ionicons 
              name={isPaused ? "play" : "pause"} 
              size={32} 
              color="#FFF" 
            />
          </View>
          <Text style={styles.pauseText}>
            {isPaused ? "Resume" : "Pause"}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.controlButton, styles.sideButton]} 
          onPress={handleNext}
        >
          <View style={styles.buttonContentWrapper}>
            <Ionicons name="chevron-forward" size={28} color="#333" />
            <Text style={styles.controlText}>
              {currentIndex < routine.length - 1 ? "Next" : "Finish"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      
      {/* Overall progress */}
      <View style={styles.overallProgressContainer}>
        <View style={styles.overallProgressTrack}>
          <Animated.View 
            style={[
              styles.overallProgressFill, 
              { width: `${calculateOverallProgress() * 100}%` }
            ]} 
          />
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  // Updated control styles
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  controlButton: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContentWrapper: {
    alignItems: 'center',
  },
  sideButton: {
    width: 100,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  centerButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  controlText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  disabledButton: {
    backgroundColor: '#F0F0F0',
    opacity: 0.7,
  },
  disabledText: {
    color: '#AAA',
  },
  pauseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
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
});

export default ActiveRoutine;