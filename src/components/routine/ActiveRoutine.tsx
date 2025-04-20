import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Easing,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BodyArea, Duration, Stretch, StretchLevel, RestPeriod } from '../../types';
import { generateRoutine } from '../../utils/routineGenerator';
import { useTheme } from '../../context/ThemeContext';
import { enhanceRoutineWithPremiumInfo } from '../../utils/premiumUtils';
import * as soundEffects from '../../utils/soundEffects';
import { useRoutineTimer } from '../../hooks/routines/useRoutineTimer';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import StretchFlowView from './StretchFlowView';

const { width, height } = Dimensions.get('window');

export interface ActiveRoutineProps {
  area: BodyArea;
  duration: Duration;
  level: StretchLevel;
  customStretches?: (Stretch | RestPeriod)[];
  includePremiumStretches?: boolean;
  onComplete: (routineArea: BodyArea, routineDuration: Duration, stretchCount?: number, hasAdvancedStretch?: boolean) => Promise<void>;
  onNavigateHome: () => void;
}

const ActiveRoutine: React.FC<ActiveRoutineProps> = ({
  area,
  duration,
  level,
  customStretches,
  includePremiumStretches,
  onComplete,
  onNavigateHome
}) => {
  const { theme, isDark } = useTheme();
  
  // State
  const [routine, setRoutine] = useState<(Stretch | RestPeriod & { isPremium?: boolean; vipBadgeColor?: string })[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);
  
  // Video and audio state
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [isDemoReady, setIsDemoReady] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [areControlsVisible, setAreControlsVisible] = useState(true);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoFullscreen, setVideoFullscreen] = useState(false);
  const [videoEnhanced, setVideoEnhanced] = useState(false);
  const [videoPosition, setVideoPosition] = useState(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<Video>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  
  // Track last second where we played a sound to avoid multiple plays
  const lastSecondPlayedRef = useRef<number>(-1);
  const initialRenderRef = useRef(true);
  
  // Add state for paused status
  const [isPaused, setIsPaused] = useState(false);
  
  // Add state for preloading
  const [preloadedVideos, setPreloadedVideos] = useState<Set<string>>(new Set());
  
  // Define handleNext as useCallback to avoid dependency issues
  const handleNext = useCallback(() => {
    console.log('handleNext called');
    
    // Play sound effect
    try {
      soundEffects.playClickSound();
    } catch (error) {
      console.error('Error playing click sound:', error);
    }
    
    // Reset the last second played reference
    lastSecondPlayedRef.current = -1;
    
    if (currentIndex < routine.length - 1) {
      console.log(`Moving to next stretch: ${currentIndex + 1}`);
      fadeAnim.setValue(0);
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
      // Update current index
      setCurrentIndex(prevIndex => {
        const newIndex = prevIndex + 1;
        console.log(`Setting new index to ${newIndex}`);
        return newIndex;
      });
    } else {
      // Don't play any completion sound here - this will be handled in RoutineScreen.tsx
      
      // Call handleComplete
      console.log('Reached the end of the routine, completing...');
      handleComplete();
    }
  }, [currentIndex, routine.length]);
  
  // Use the routine timer hook
  const { 
    timeRemaining, 
    progressAnim, 
    fadeAnim,
    startTimer, 
    pauseTimer, 
    resumeTimer,
    resetTimer,
    isPaused: isTimerPaused,  // Get isPaused from the hook
    togglePause           // Get togglePause function
  } = useRoutineTimer({
    onComplete: handleNext
  });
  
  // Keep local isPaused state in sync with timer hook
  useEffect(() => {
    setIsPaused(isTimerPaused);
  }, [isTimerPaused]);
  
  // Get the current stretch
  const currentStretch = routine[currentIndex];
  
  // Get the next stretch for preloading
  const nextStretch = routine[currentIndex + 1];
  
  // Preload next demo video when current index changes
  useEffect(() => {
    const preloadNextVideo = async () => {
      if (nextStretch && 
          !('isRest' in nextStretch) && 
          (nextStretch as Stretch).hasDemo && 
          (nextStretch as Stretch).demoVideo) {
        
        // Generate a key for the video
        const videoKey = `video-${(nextStretch as Stretch).id}`;
        
        // Only preload if not already preloaded
        if (!preloadedVideos.has(videoKey)) {
          console.log(`Preloading next demo video for stretch: ${(nextStretch as Stretch).name}`);
          
          try {
            // Preload just by creating the object, don't play it
            const { sound } = await Audio.Sound.createAsync(
              'demoAudio' in nextStretch ? (nextStretch as any).demoAudio : null,
              { shouldPlay: false, volume: 0 }
            );
            
            // Unload it immediately to free memory but keep in cache
            await sound.unloadAsync();
            
            // Mark as preloaded
            setPreloadedVideos(prev => new Set([...prev, videoKey]));
          } catch (error) {
            console.error('Error preloading demo audio:', error);
          }
        }
      }
    };
    
    // Run preloading
    preloadNextVideo();
  }, [currentIndex, routine]);
  
  // Check if current stretch has a demo video
  const isCurrentDemoStretch = 
    currentStretch && 
    !('isRest' in currentStretch) && 
    (currentStretch as Stretch).hasDemo === true;

  // Effect to start timer for the current stretch when currentIndex changes
  useEffect(() => {
    if (!initialRenderRef.current && routine.length > 0 && currentIndex < routine.length) {
      const currentDuration = routine[currentIndex]?.duration || 30;
      console.log(`Starting timer for stretch ${currentIndex} with duration ${currentDuration}`);
      
      try {
        // Check if this is a stretch with demo
        const currentHasDemo = currentStretch && 
          !('isRest' in currentStretch) && 
          (currentStretch as Stretch).hasDemo === true;
          
        if (currentHasDemo) {
          console.log('Demo stretch detected - timer will start after demo is watched');
          setIsDemoReady(true);
          
          // Reset the timer but don't start it yet - it will be started when demo is complete
          resetTimer(currentDuration);
          
          // Ensure the UI elements associated with time are properly reset
          // This addresses the issue with static time displays
          lastSecondPlayedRef.current = -1;
        } else {
          // Normal stretch - start the timer as usual
          setIsDemoReady(false);
          setIsPlayingDemo(false);
          startTimer(currentDuration);
        }
      } catch (error) {
        console.error('Error starting timer:', error);
      }
    }
    
    // After first render, set initialRender to false
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
    }
  }, [currentIndex, routine]);
  
  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      pauseTimer();
      
      // Clean up audio if it's playing
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      
      // Clear any control timeout
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, []);
  
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
            const generatedRoutine = await generateRoutine(area, duration, level, undefined);
            
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
  }, [area, duration, level, customStretches, includePremiumStretches]);
  
  // Format time from seconds to MM:SS
  const formatTime = (seconds: number) => {
    // Round seconds to nearest integer to avoid decimal display
    const roundedSeconds = Math.round(seconds);
    
    // Only play timer tick when transitioning to a new second
    // and only for the countdown (5,4,3,2,1)
    if (roundedSeconds <= 5 && roundedSeconds > 0 && roundedSeconds !== lastSecondPlayedRef.current) {
      lastSecondPlayedRef.current = roundedSeconds;
      // Wrap in try/catch to prevent errors from affecting the routine
      try {
        // Only play tick sound if not in demo mode and not paused
        if (!isPlayingDemo && !isPaused) {
          soundEffects.playTimerTickSound();
        }
      } catch (error) {
        console.error('Error playing timer tick:', error);
        // Don't let sound errors affect the routine flow
      }
    }
    
    // Format as MM:SS with fixed integer display (no decimals)
    const mins = Math.floor(roundedSeconds / 60);
    const secs = roundedSeconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Function to handle going back to previous stretch
  const handlePrevious = () => {
    // Play sound effect
    try {
      soundEffects.playClickSound();
    } catch (error) {
      console.error('Error playing click sound:', error);
    }
    
    if (currentIndex > 0) {
      console.log(`Moving to previous stretch: ${currentIndex - 1}`);
      fadeAnim.setValue(0);
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
      
      // Update current index - timer will start in the useEffect
      setCurrentIndex(prevIndex => prevIndex - 1);
    }
  };
  
  // Calculate overall progress
  const calculateOverallProgress = () => {
    if (!routine || routine.length === 0) return 0;
    
    const totalStretches = routine.length;
    const completedStretches = currentIndex;
    
    // Get the current stretch's duration
    const currentDuration = currentStretch ? currentStretch.duration : 30;
    
    // Calculate progress as a ratio of time remaining to total duration
    const currentProgress = currentStretch ? 
      1 - (timeRemaining / currentDuration) : 0;
    
    return (completedStretches + currentProgress) / totalStretches;
  };
  
  // Handle saving routine and exiting
  const handleSaveAndExit = () => {
    // Play sound effect
    soundEffects.playClickSound();
    
    // Clean up timer
    pauseTimer();
    
    // Navigate to home screen
    onNavigateHome();
  };
  
  // Handle routine completion
  const handleComplete = () => {
    console.log('Completing routine');
    
    // Clean up timer
    pauseTimer();
    
    // Mark routine as done
    setIsDone(true);
    
    // Calculate stretch count - exclude rest periods
    const stretchCount = routine.filter(item => !('isRest' in item)).length;
    
    // Check if routine includes advanced stretches
    const hasAdvancedStretch = routine.some(
      item => !('isRest' in item) && (item as Stretch).level === 'advanced'
    );
    
    // Call onComplete callback
    onComplete(area, duration, stretchCount, hasAdvancedStretch);
  };
  
  // Handle toggle pause
  const handleTogglePause = () => {
    try {
      soundEffects.playClickSound();
      togglePause();
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  };
  
  // Handle video playback status updates
  const handleVideoStatusUpdate = async (status: AVPlaybackStatus) => {
    // Update the pause state based on video status
    if (status.isLoaded) {
      const wasPlaying = !isVideoPaused;
      const isNowPlaying = status.isPlaying;
      
      setIsVideoPaused(!isNowPlaying);
      
      // Track video position and duration for the seek bar
      if (status.positionMillis !== undefined && status.durationMillis !== undefined) {
        setVideoPosition(status.positionMillis);
        setVideoDuration(status.durationMillis);
        setVideoProgress(status.positionMillis / status.durationMillis);
      }
      
      // If started playing, hide controls after a delay
      if (!wasPlaying && isNowPlaying) {
        showControlsTemporarily();
      }
      
      // If stopped playing, show controls
      if (wasPlaying && !isNowPlaying) {
        setAreControlsVisible(true);
      }
    }
    
    if (status.isLoaded && status.didJustFinish) {
      // Video finished playing
      if (soundRef.current) {
        const soundStatus = await soundRef.current.getStatusAsync();
        if (soundStatus.isLoaded) {
          await soundRef.current.stopAsync();
          await soundRef.current.unloadAsync();
        }
      }
      
      setIsVideoPaused(true);
      // Don't automatically close the video player
      // Let the user close it when they're ready
    } else if (status.isLoaded && 'isPlaying' in status) {
      // Sync audio with video play/pause status
      if (soundRef.current) {
        const soundStatus = await soundRef.current.getStatusAsync();
        if (soundStatus.isLoaded) {
          if (status.isPlaying) {
            await soundRef.current.playAsync();
          } else {
            await soundRef.current.pauseAsync();
          }
        }
      }
    }
  };
  
  // Handle skipping forward by 10 seconds
  const handleSkipForward = async () => {
    if (!videoRef.current) return;
    
    try {
      soundEffects.playClickSound();
      const status = await videoRef.current.getStatusAsync();
      
      if (status.isLoaded) {
        const newPosition = Math.min(status.positionMillis + 10000, status.durationMillis);
        await videoRef.current.setPositionAsync(newPosition);
        
        // If there's audio, seek it as well
        if (soundRef.current) {
          const soundStatus = await soundRef.current.getStatusAsync();
          if (soundStatus.isLoaded) {
            await soundRef.current.setPositionAsync(newPosition);
          }
        }
        
        // Show controls temporarily
        showControlsTemporarily();
      }
    } catch (error) {
      console.error('Error skipping forward:', error);
    }
  };
  
  // Handle skipping backward by 10 seconds
  const handleSkipBackward = async () => {
    if (!videoRef.current) return;
    
    try {
      soundEffects.playClickSound();
      const status = await videoRef.current.getStatusAsync();
      
      if (status.isLoaded) {
        const newPosition = Math.max(status.positionMillis - 10000, 0);
        await videoRef.current.setPositionAsync(newPosition);
        
        // If there's audio, seek it as well
        if (soundRef.current) {
          const soundStatus = await soundRef.current.getStatusAsync();
          if (soundStatus.isLoaded) {
            await soundRef.current.setPositionAsync(newPosition);
          }
        }
        
        // Show controls temporarily
        showControlsTemporarily();
      }
    } catch (error) {
      console.error('Error skipping backward:', error);
    }
  };
  
  // Handle seek to position
  const handleSeekTo = async (progress: number) => {
    if (!videoRef.current) return;
    
    try {
      const status = await videoRef.current.getStatusAsync();
      
      if (status.isLoaded) {
        const newPosition = progress * status.durationMillis;
        await videoRef.current.setPositionAsync(newPosition);
        
        // If there's audio, seek it as well
        if (soundRef.current) {
          const soundStatus = await soundRef.current.getStatusAsync();
          if (soundStatus.isLoaded) {
            await soundRef.current.setPositionAsync(newPosition);
          }
        }
      }
    } catch (error) {
      console.error('Error seeking to position:', error);
    }
  };
  
  // Toggle fullscreen mode
  const handleToggleFullscreen = () => {
    soundEffects.playClickSound();
    setVideoFullscreen(!videoFullscreen);
    showControlsTemporarily();
  };
  
  // Toggle video enhancement
  const handleToggleEnhancement = () => {
    soundEffects.playClickSound();
    setVideoEnhanced(!videoEnhanced);
    showControlsTemporarily();
  };
  
  // Format duration in MM:SS format
  const formatDuration = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Handle showing demo
  const handleShowDemo = async () => {
    try {
      console.log('Showing demo...');
      soundEffects.playClickSound();
      
      // Always pause the timer when showing demo
      if (!isTimerPaused) {
        togglePause();
      }
      
      setIsPlayingDemo(true);
    } catch (error) {
      console.error('Error showing demo:', error);
    }
  };
  
  // Show controls temporarily and set timeout to hide them
  const showControlsTemporarily = () => {
    // Clear any existing timeout
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // Show controls
    setAreControlsVisible(true);
    
    // Set timeout to hide controls after 3 seconds
    controlsTimeoutRef.current = setTimeout(() => {
      // Only hide controls if video is playing
      if (!isVideoPaused) {
        setAreControlsVisible(false);
      }
    }, 3000); // Reduced to 2 seconds for faster hiding
  };
  
  // Handle video container tap to show/hide controls
  const handleVideoContainerTap = () => {
    if (areControlsVisible) {
      // If controls are visible, hide them immediately when playing
      if (!isVideoPaused) {
        setAreControlsVisible(false);
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
      }
    } else {
      // If controls are hidden, show them temporarily
      showControlsTemporarily();
    }
  };
  
  // Function to play demo video
  const handlePlayDemo = async () => {
    try {
      // Always pause the timer when showing demo video
      if (!isTimerPaused) {
        togglePause();
      }
      
      setIsPlayingDemo(true);
      
      // Attempt to load and play the current demo video
      if (videoRef.current) {
        console.log('Playing demo video...');
        
        try {
          await videoRef.current.playAsync();
          setIsVideoPaused(false);
          
          // Start with controls visible
          setAreControlsVisible(true);
          showControlsTemporarily();
        } catch (playError) {
          console.error('Error playing video:', playError);
        }
      }
    } catch (error) {
      console.error('Error handling play demo:', error);
    }
  };
  
  // Handle closing the demo video
  const handleCloseDemo = async () => {
    try {
      console.log('Closing demo');
      
      // Play click sound for feedback
      soundEffects.playClickSound();
      
      // Stop demo video playback
      if (videoRef.current) {
        try {
          await videoRef.current.pauseAsync();
          await videoRef.current.setPositionAsync(0);
        } catch (stopError) {
          console.error('Error stopping video:', stopError);
        }
      }
      
      // Hide demo video
      setIsPlayingDemo(false);
      setIsVideoPaused(true);
      
      // Reset controls state
      setAreControlsVisible(true);
      setVideoFullscreen(false);
      setVideoEnhanced(false);
      
      // No need to automatically resume timer - let the user decide when to resume
    } catch (error) {
      console.error('Error closing demo:', error);
    }
  };
  
  // Handle muting/unmuting audio
  const handleToggleMute = async () => {
    try {
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      
      if (soundRef.current) {
        // Check if sound is loaded before attempting to mute
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          await soundRef.current.setIsMutedAsync(newMutedState);
        }
      }
      
      soundEffects.playClickSound();
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
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

    // Use the new StretchFlowView component
    return (
      <StretchFlowView
        stretch={currentStretch}
        timeRemaining={timeRemaining}
        progressAnim={progressAnim}
        isPaused={isPaused}
        onNext={handleNext}
        onPrevious={handlePrevious}
        onTogglePause={handleTogglePause}
        currentIndex={currentIndex}
        totalCount={routine.length}
        startTimer={startTimer}
        currentStretch={'isRest' in currentStretch ? null : currentStretch as Stretch}
        isPlaying={!isPaused}
      />
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
      {/* Header with stretch count */}
      <View style={[styles.header, { 
        backgroundColor: isDark ? theme.cardBackground : '#FFF',
        borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEE'
      }]}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => {
            // Play click sound
            soundEffects.playClickSound();
            
            Alert.alert(
              '🧘‍♀️ Exit Workout?',
              'Are you sure you want to exit? Your progress will not be saved.',
              [
                { text: 'Keep Stretching', style: 'cancel' },
                { text: 'Exit Anyway', style: 'destructive', onPress: handleSaveAndExit }
              ]
            );
          }}
        >
          <Ionicons name="arrow-back" size={24} color={isDark ? theme.text : "#333"} />
        </TouchableOpacity>
        
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: isDark ? theme.text : '#333' }]}>
            Current Routine
          </Text>
        </View>
        
        <Text style={[styles.progressText, { color: isDark ? theme.textSecondary : '#666' }]}>
          {currentIndex + 1}/{routine.length}
        </Text>
      </View>
      
      {/* Main content */}
      <ScrollView 
        style={{
          flex: 1, 
          backgroundColor: isDark ? theme.background : '#FFF'
        }}
        contentContainerStyle={{
          flexGrow: 1
        }}
      >
        {renderCurrentItem()}
      </ScrollView>
      
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
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
  demoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 10,
    marginHorizontal: 5,
    backgroundColor: '#FF5722',
  },
  demoText: {
    color: '#FFF',
    fontSize: 12,
    marginLeft: 5,
    fontWeight: '600',
  },
  demoNote: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 10,
    fontSize: 14,
    color: '#FF5722',
  },
  demoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoOverlayText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  videoContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#000',
  },
  videoPlayerContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
  },
  videoPlayerFullscreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 10,
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
    maxWidth: width * 0.8,
    maxHeight: width * 0.5,
  },
  videoFullscreen: {
    maxWidth: '100%',
    maxHeight: '100%',
  },
  videoEnhanced: {
    // Apply video enhancement filter
    // This can be customized with different contrast/brightness values
    // React Native doesn't support CSS filters directly, so we're simulating it
    opacity: 0.95,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  touchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent', // Completely transparent
  },
  playButtonContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  videoControlsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  videoControlsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingBottom: 10,
  },
  videoControlsBottomRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingTop: 10,
  },
  videoEnhanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 5,
  },
  progressBarContainer: {
    flex: 1,
    height: 20,
    marginHorizontal: 10,
    position: 'relative',
  },
  videoProgressTrack: {
    position: 'absolute',
    top: 9,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
  },
  videoProgressFill: {
    height: '100%',
    backgroundColor: '#FF5722',
    borderRadius: 2,
  },
  videoProgressSlider: {
    width: '100%',
    height: 20,
    position: 'absolute',
    top: 0,
    left: 0,
  },
  videoDurationText: {
    color: '#FFF',
    fontSize: 12,
  },
  videoControlButton: {
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  videoControlActiveButton: {
    backgroundColor: 'rgba(255,87,34,0.7)', // Highlight color for active buttons
  },
  videoPlayPauseButton: {
    padding: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 30,
    alignItems: 'center',
    marginHorizontal: 15,
  },
  videoVolumeButton: {
    position: 'absolute',
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
  },
  enhanceText: {
    color: '#FFF',
    fontSize: 10,
    marginTop: 2,
  },
  skipText: {
    color: '#FFF',
    fontSize: 10,
    marginTop: 2,
  },
  playButton: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 40,
    padding: 10,
  },
});

export default ActiveRoutine;