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
  Platform,
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BodyArea, Duration, Stretch, StretchLevel, RestPeriod } from '../../types';
import { generateRoutine } from '../../utils/routineGenerator';
import { useTheme } from '../../context/ThemeContext';
import { enhanceRoutineWithPremiumInfo } from '../../utils/premiumUtils';

const { width, height } = Dimensions.get('window');

export interface ActiveRoutineProps {
  area: BodyArea;
  duration: Duration;
  level: StretchLevel;
  customStretches?: (Stretch | RestPeriod)[];
  onComplete: (routineArea: BodyArea, routineDuration: Duration, stretchCount?: number, hasAdvancedStretch?: boolean) => Promise<void>;
  onNavigateHome: () => void;
}

const ActiveRoutine: React.FC<ActiveRoutineProps> = ({
  area,
  duration,
  level,
  customStretches,
  onComplete,
  onNavigateHome
}) => {
  const { theme, isDark } = useTheme();
  
  // State
  const [routine, setRoutine] = useState<(Stretch | RestPeriod & { isPremium?: boolean; vipBadgeColor?: string })[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerId, setTimerId] = useState<NodeJS.Timeout | null>(null);
  const [isDone, setIsDone] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  
  // Get the current stretch
  const currentStretch = routine[currentIndex];
  
  // Start or restart a timer
  const startTimer = (duration: number) => {
    // Ensure duration is a valid number
    if (typeof duration !== 'number' || isNaN(duration) || duration <= 0) {
      console.warn(`Invalid duration provided to startTimer: ${duration}, using default of 30 seconds`);
      duration = 30; // Default to 30 seconds as a fallback
    }
    
    console.log(`Starting timer with duration: ${duration} seconds`);
    
    // Clear existing timer
    if (timerId) {
      clearInterval(timerId);
    }
    
    // Set initial time
    setTimeRemaining(duration);
    
    // Reset animation
    progressAnim.setValue(1);
    
    // Start timer animation
    Animated.timing(progressAnim, {
      toValue: 0,
      duration: duration * 1000,
      useNativeDriver: false,
      easing: Easing.linear
    }).start();
    
    // Start timer
    const id = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - go to next stretch
          clearInterval(id);
          handleNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    setTimerId(id);
  };
  
  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [timerId]);
  
  // Generate the routine when the component mounts
  useEffect(() => {
    const initRoutine = async () => {
      try {
        console.log(`[ActiveRoutine] Initializing routine: ${area}, ${duration}, ${level}, custom stretches: ${customStretches?.length || 0}`);
        
        if (area && duration) {
          console.log(`Generating routine: area=${area}, duration=${duration}, level=${level}, customStretches=${customStretches?.length || 0}`);
          
          // If we have custom stretches, log them for debugging
          if (customStretches && customStretches.length > 0) {
            console.log(`Custom stretches: ${customStretches.length}`);
            console.log(`First custom stretch: ${JSON.stringify(customStretches[0])}`);
            
            // Validate the custom stretches
            const validCustomStretches = customStretches.map((stretch, index) => {
              // Clone to avoid modifying the original
              let stretchCopy: any = {...stretch};
              
                          
              // Ensure required properties
              if (!('id' in stretchCopy)) {
                stretchCopy.id = `custom-${Math.random().toString(36).substring(2, 9)}`;
              } else if (typeof stretchCopy.id === 'number') {
                // Convert number IDs to strings to ensure consistency
                stretchCopy.id = String(stretchCopy.id);
              }
              
              if (!('duration' in stretchCopy) || typeof stretchCopy.duration !== 'number') {
                console.warn(`Found stretch with invalid duration: ${JSON.stringify(stretchCopy)}`);
                stretchCopy.duration = 30; // Default to 30 seconds
              }
              
              if ('isRest' in stretchCopy) {
                // This is a rest period, make sure it has all required fields
                if (!stretchCopy.name) {
                  stretchCopy.name = 'Rest Period';
                }
                if (!stretchCopy.description) {
                  stretchCopy.description = 'Take a short break';
                }
              } else {
                // This is a stretch
                if (!stretchCopy.name) {
                  stretchCopy.name = 'Stretch';
                }
                if (!stretchCopy.description) {
                  stretchCopy.description = 'Follow the instructions';
                }
                if (stretchCopy.bilateral === undefined) {
                  stretchCopy.bilateral = false;
                }
                if (!stretchCopy.level) {
                  stretchCopy.level = 'beginner';
                }
                if (!Array.isArray(stretchCopy.tags)) {
                  stretchCopy.tags = [area];
                }
                if (!stretchCopy.image) {
                  stretchCopy.image = { uri: `https://via.placeholder.com/200/FF9800/FFFFFF?text=${encodeURIComponent(stretchCopy.name)}` };
                }
              }
              
              return stretchCopy;
            });
            
      
            
            // Additional debugging - validate final stretches before enhancing
            const idTypes = validCustomStretches.map(s => typeof s.id);
            console.log(`ID types before enhancement: ${JSON.stringify(idTypes)}`);
            
            // When using custom stretches directly, we should still enhance them with premium info
            try {
              console.log('Attempting to enhance routine with premium info...');
              
              // Wrap the enhancement in another try/catch to handle any errors
              let enhancedRoutine;
              try {
                enhancedRoutine = await enhanceRoutineWithPremiumInfo(validCustomStretches);
                console.log(`Enhanced routine has ${enhancedRoutine.length} stretches`);
              } catch (enhanceError) {
                console.error('Error in enhanceRoutineWithPremiumInfo:', enhanceError);
                console.log('Using validated stretches without enhancement due to error');
                enhancedRoutine = validCustomStretches;
              }
              
              // Log the first enhanced stretch for debugging
              if (enhancedRoutine.length > 0) {
                console.log(`Setting routine with ${enhancedRoutine.length} stretches`);
                setRoutine(enhancedRoutine);
                
                // Start the timer with the first stretch duration
                console.log(`Starting timer with duration: ${enhancedRoutine[0].duration} (${typeof enhancedRoutine[0].duration})`);
                startTimer(enhancedRoutine[0].duration);
              } else {
                throw new Error('No stretches in enhanced routine');
              }
            } catch (enhanceError) {
              console.error('Error enhancing routine:', enhanceError);
              // Fallback to using the validated stretches directly
              console.log('Falling back to validated stretches without enhancement');
              
              if (validCustomStretches.length > 0) {
                console.log(`Setting routine with ${validCustomStretches.length} stretches directly`);
                setRoutine(validCustomStretches);
                
                startTimer(validCustomStretches[0].duration);
              } else {
                throw new Error('No valid custom stretches to show');
              }
            }
          } else {
            // Generate a routine normally if no custom stretches
            console.log('Generating routine without custom stretches');
            const generatedRoutine = await generateRoutine(area, duration, level);
            
            // Enhance the routine with premium information
            try {
              const enhancedRoutine = await enhanceRoutineWithPremiumInfo(generatedRoutine);
              console.log(`Enhanced generated routine has ${enhancedRoutine.length} stretches`);
              setRoutine(enhancedRoutine);
              
              if (enhancedRoutine.length > 0) {
                // Start the timer with the first stretch duration
                startTimer(enhancedRoutine[0].duration);
              } else {
                throw new Error('No stretches in enhanced routine');
              }
            } catch (enhanceError) {
              console.error('Error enhancing generated routine:', enhanceError);
              // Fallback to the generated routine directly
              setRoutine(generatedRoutine);
              if (generatedRoutine.length > 0) {
                startTimer(generatedRoutine[0].duration);
              } else {
                throw new Error('No stretches in generated routine');
              }
            }
          }
        } else {
          throw new Error('Missing required area or duration parameters');
        }
      } catch (error) {
        console.error('Error initializing routine:', error);
        Alert.alert(
          'Error Loading Routine',
          'There was a problem loading your routine. Please try again.',
          [
            { 
              text: 'Go Back', 
              onPress: onNavigateHome 
            }
          ]
        );
      }
    };
    
    initRoutine();
  }, [area, duration, level, customStretches]);
  
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
    const stretchCount = routine.filter(item => !('isRest' in item)).length;
    // Check if any stretch is an advanced stretch
    const hasAdvancedStretch = routine.some(item => 
      !('isRest' in item) && (item as Stretch).level === 'advanced'
    );
    
    onComplete(area, duration, stretchCount, hasAdvancedStretch);
    Alert.alert('Progress Saved', 'Your routine has been saved to your progress');
    onNavigateHome();
  };
  
  // Handle routine completion
  const handleComplete = () => {
    // Call the onComplete callback
    const stretchCount = routine.filter(item => !('isRest' in item)).length;
    // Check if any stretch is an advanced stretch
    const hasAdvancedStretch = routine.some(item => 
      !('isRest' in item) && (item as Stretch).level === 'advanced'
    );
    
    onComplete(area, duration, stretchCount, hasAdvancedStretch);
  };
  
  // Render the current stretch or rest period
  const renderCurrentItem = () => {
    if (!currentStretch) {
      return (
        <View style={[styles.loadingContainer, { backgroundColor: isDark ? theme.background : '#FFF' }]}>
          <Text style={[styles.loadingText, { color: isDark ? theme.text : '#333' }]}>
            Loading stretch data...
          </Text>
        </View>
      );
    }

    const isRest = 'isRest' in currentStretch;
    const isPremium = !isRest && (currentStretch as any).isPremium;

    return (
      <Animated.View 
        style={[styles.stretchContainer, { 
          opacity: fadeAnim,
          backgroundColor: isDark ? theme.background : '#FFF'
        }]}
      >
        {isRest ? (
          <View style={[styles.restContainer, { backgroundColor: isDark ? theme.cardBackground : '#f0f0f0' }]}>
            <Ionicons name="time-outline" size={60} color={isDark ? theme.accent : '#4CAF50'} />
            <Text style={[styles.restTitle, { color: isDark ? theme.text : '#333' }]}>
              {currentStretch.name || 'Rest Period'}
            </Text>
            <Text style={[styles.restDescription, { color: isDark ? theme.textSecondary : '#666' }]}>
              {currentStretch.description || 'Take a short break before continuing'}
            </Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            <Text style={[styles.stretchName, { color: isDark ? theme.text : '#333' }]}>
              {currentStretch.name || 'Stretch'}
            </Text>
            
            <View style={styles.badgeContainer}>
              {(currentStretch as Stretch)?.bilateral && (
                <View style={[styles.bilateralBadge, { backgroundColor: isDark ? theme.accent : '#4CAF50' }]}>
                  <Ionicons name="swap-horizontal" size={16} color="#FFF" />
                  <Text style={styles.bilateralText}>Both Sides</Text>
                </View>
              )}
              
              {isPremium && (
                <View style={[styles.premiumBadge, { backgroundColor: (currentStretch as any).vipBadgeColor || '#FFD700' }]}>
                  <Ionicons name="star" size={16} color="#FFF" />
                  <Text style={styles.premiumText}>VIP</Text>
                </View>
              )}
            </View>
            
            <View style={[styles.imageContainer, { 
              backgroundColor: isDark ? theme.cardBackground : '#FFF',
              borderColor: isPremium ? ((currentStretch as any).vipBadgeColor || '#FFD700') : (isDark ? theme.border : '#DDD')
            }]}>
              <Image 
                source={currentStretch.image}
                style={styles.stretchImage}
                resizeMode="contain"
                onError={(e) => {
                  // Attempt to update the image source to a fallback
                  if (currentStretch && !('isRest' in currentStretch)) {
                    const safeName = encodeURIComponent((currentStretch as Stretch).name || 'Stretch');
                    // We can't directly modify the source, but we can log it for debugging
                  }
                }}
                defaultSource={{uri: `https://via.placeholder.com/350x350/FF9800/FFFFFF?text=${encodeURIComponent(currentStretch.name || 'Stretch')}`}}
              />
            </View>
            
            <Text style={[styles.stretchDescription, { color: isDark ? theme.textSecondary : '#666' }]}>
              {currentStretch.description || 'No description available'}
            </Text>
            
            {isPremium && (
              <Text style={[styles.premiumNote, { color: (currentStretch as any).vipBadgeColor || '#FFD700' }]}>
                This is a premium stretch unlocked at level 7!
              </Text>
            )}
          </View>
        )}
      </Animated.View>
    );
  };
  
  // If routine is not loaded yet, show loading
  if (!routine || routine.length === 0 || !currentStretch) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: isDark ? theme.background : '#FFF' }]}>
        <Text style={[styles.loadingText, { color: isDark ? theme.text : '#333' }]}>Creating your routine...</Text>
      </View>
    );
  }
  
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: isDark ? theme.background : '#FFF'
    }}>
      {/* Header with progress */}
      <View style={[styles.header, { 
        backgroundColor: isDark ? theme.cardBackground : '#FFF',
        borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEE'
      }]}>
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
          <Ionicons name="arrow-back" size={24} color={isDark ? theme.text : "#333"} />
        </TouchableOpacity>
        
        <View style={styles.progressContainer}>
          <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#E0E0E0' }]}>
            <Animated.View 
              style={[
                styles.progressFill, 
                { 
                  backgroundColor: isDark ? theme.accent : '#4CAF50',
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['100%', '0%']
                  })
                }
              ]} 
            />
          </View>
          <Text style={[styles.timerText, { color: isDark ? theme.textSecondary : '#666' }]}>
            {formatTime(timeRemaining)}
          </Text>
        </View>
        
        <Text style={[styles.progressText, { color: isDark ? theme.textSecondary : '#666' }]}>
          {currentIndex + 1}/{routine.length}
        </Text>
      </View>
      
      {/* Main content */}
      <View style={{
        flex: 1, 
        backgroundColor: isDark ? theme.background : '#FFF'
      }}>
        {renderCurrentItem()}
      </View>
      
      {/* Improved Controls */}
      <View style={[styles.controlsContainer, { 
        backgroundColor: isDark ? theme.cardBackground : '#FFF',
        borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEE'
      }]}>
        <TouchableOpacity 
          style={[
            styles.controlButton, 
            styles.sideButton,
            currentIndex === 0 && styles.disabledButton,
            { 
              backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F5F5F5',
              opacity: currentIndex === 0 ? 0.7 : 1
            }
          ]} 
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <View style={styles.buttonContentWrapper}>
            <Ionicons 
              name="chevron-back" 
              size={28} 
              color={currentIndex === 0 
                ? (isDark ? "rgba(255,255,255,0.3)" : "#CCC") 
                : (isDark ? theme.text : "#333")} 
            />
            <Text style={[
              styles.controlText, 
              currentIndex === 0 && styles.disabledText,
              { color: currentIndex === 0 
                ? (isDark ? "rgba(255,255,255,0.3)" : "#AAA") 
                : (isDark ? theme.text : "#333") }
            ]}>
              Previous
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.centerButton} 
          onPress={handleNext}
        >
          <View style={[styles.centerButtonInner, { 
            backgroundColor: isDark ? theme.accent : '#4CAF50',
            shadowColor: isDark ? 'rgba(0,0,0,0.5)' : '#000'
          }]}>
            <Ionicons 
              name="chevron-forward" 
              size={32} 
              color="#FFF" 
            />
          </View>
          <Text style={[styles.pauseText, { color: isDark ? theme.text : '#333' }]}>
            {currentIndex < routine.length - 1 ? "Next" : "Finish"}
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Overall progress */}
      <View style={[styles.overallProgressContainer, { 
        backgroundColor: isDark ? theme.cardBackground : '#FFF'
      }]}>
        <View style={[styles.overallProgressTrack, { 
          backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#E0E0E0'
        }]}>
          <Animated.View 
            style={[
              styles.overallProgressFill, 
              { 
                width: `${calculateOverallProgress() * 100}%`,
                backgroundColor: '#FF9800' // Keep this color for visibility in both modes
              }
            ]} 
          />
        </View>
      </View>
    </View>
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
    width: '100%',
    backgroundColor: '#FFFFFF',
    minHeight: 400, // Ensure minimum height
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
  stretchDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  bilateralBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    marginHorizontal: 5,
  },
  bilateralText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '600',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    marginHorizontal: 5,
  },
  premiumText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '600',
  },
  premiumNote: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
    fontSize: 14,
  },
  badgeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 5,
  },
  restContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  restTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  restDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
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
  noImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 16,
    color: '#DDD',
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugImageText: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: '#FFF',
    padding: 5,
  },
  debugText: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    color: '#FFF',
    padding: 5,
  },
});

export default ActiveRoutine;