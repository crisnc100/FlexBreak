import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Platform,
  ImageSourcePropType,
  ActivityIndicator,
  Easing,
  ScrollView,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import DemoVideoPlayer from './DemoVideoPlayer';
import * as soundEffects from '../../utils/soundEffects';
import * as Haptics from 'expo-haptics';
import { Stretch, RestPeriod, TransitionPeriod } from '../../types';
import { NavigationButtons } from './utils';
import { Video, ResizeMode as VideoResizeMode } from 'expo-av';
import Svg, { Circle, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import CircularTimer from './CircularTimer';
import StructuredInstructions from './StructuredInstructions';

const { width, height } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface StretchFlowViewProps {
  stretch: Stretch | RestPeriod | TransitionPeriod;
  timeRemaining: number;
  progressAnim: Animated.Value;
  isPaused: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onTogglePause: () => void;
  currentIndex: number;
  totalCount: number;
  startTimer: (duration: number) => void;
  currentStretch: Stretch | null;
  isPlaying: boolean;
  canSkipToNext?: boolean;
  nextStretch?: Stretch | null;
}

export const StretchFlowView: React.FC<StretchFlowViewProps> = ({
  stretch,
  timeRemaining,
  progressAnim,
  isPaused,
  onNext,
  onPrevious,
  onTogglePause,
  currentIndex,
  totalCount,
  startTimer,
  currentStretch,
  isPlaying,
  canSkipToNext = true,
  nextStretch = null
}) => {
  const { theme, isDark } = useTheme();
  
  // App states
  const [viewMode, setViewMode] = useState<'demo' | 'stretch' | 'rest' | 'transition'>('stretch');
  const [hasDemoBeenWatched, setHasDemoBeenWatched] = useState(false);
  const [previousStretch, setPreviousStretch] = useState<Stretch | null>(null);
  const [timerForceUpdate, setTimerForceUpdate] = useState(Date.now());
  const [demoVideoStatus, setDemoVideoStatus] = useState<'not-started' | 'playing' | 'completed'>('not-started');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayedTime, setDisplayedTime] = useState(timeRemaining);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(true);
  const [transitionVideoOpacity, setTransitionVideoOpacity] = useState(0.6);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  
  // Video ref for transition preview
  const transitionVideoRef = useRef<Video>(null);
  
  // Ref to track logged stretches to avoid infinite logging
  const loggedStretchesRef = useRef<Set<string>>(new Set());
  
  // Update displayed time whenever timeRemaining changes
  useEffect(() => {
    setDisplayedTime(timeRemaining);
  }, [timeRemaining]);
  
  // Is this a rest, transition, or a stretch?
  const isRest = 'isRest' in stretch;
  const isTransition = 'isTransition' in stretch;
  const isPremium = !isRest && !isTransition && (stretch as any).isPremium;
  const hasDemo = !isRest && !isTransition && 'hasDemo' in stretch && (stretch as Stretch).hasDemo;
  // Define stretchObj here for scope access in all functions
  const stretchObj = isRest || isTransition ? null : (stretch as Stretch);
  
  // Track current stretch ID for detecting changes
  const currentStretchId = stretch.id;
  
  // Effect to handle stretch changes
  useEffect(() => {
    // Reset image error state when stretch changes
    setImageLoadError(false);
    
    // Fade out current image
    Animated.timing(imageOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true
    }).start(() => {
      // Start loading new image
      setIsImageLoading(true);
      
      // Reset hasDemoBeenWatched when stretch changes
      setHasDemoBeenWatched(false);
    });
  }, [currentStretchId]);
  
  // Determine if this stretch has tips
  const hasTips = !isRest && !isTransition && 'tips' in stretch && (stretch as any).tips && (stretch as any).tips.length > 0;
  
  // When stretch changes or on first load, show demo first if available
  useEffect(() => {
    if (isRest) {
      // Rest periods don't have demos, go straight to stretch view
      animateViewTransition('rest', false);
    } else if (isTransition) {
      // Transition periods don't have demos, go straight to transition view
      animateViewTransition('transition', false);
      
      // Play a random transition sound after a short delay
      try {
        console.log('Setting up transition sound with 1 second delay...');
        
        // Add a 1-second delay before playing the sound
        setTimeout(() => {
          // Use await to ensure the sound plays
          const playSound = async () => {
            if (Math.random() < 0.5) {
              console.log('Playing transition sound 1');
              await soundEffects.playTransition1Sound();
            } else {
              console.log('Playing transition sound 2');
              await soundEffects.playTransition2Sound();
            }
            
            // Add subtle haptic feedback for transition after sound starts
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          };
          
          // Execute the sound playing function
          playSound();
        }, 500); // 1000ms = 0.5 second delay
        
      } catch (error) {
        console.error('Error playing transition sound:', error);
        
        // Try fallback sound if there was an error
        try {
          soundEffects.playClickSound();
        } catch (secondError) {
          console.error('Even fallback sound failed:', secondError);
        }
      }
    } else {
      // Default to showing stretch view (not demo)
      animateViewTransition('stretch', false);
    }
  }, [stretch.id]);
  
  // Effect to handle demo video completion
  useEffect(() => {
    if (isPlaying && demoVideoStatus === "completed") {
      // Reset demo video status
      setDemoVideoStatus("not-started");
      // Always transition to stretch mode after demo completes
      setViewMode("stretch");
      // Force timer reset by resetting timerForceUpdate
      setTimerForceUpdate(Date.now());
      // Timer should already be running since we modified ActiveRoutine to start it immediately
      // No need to call startTimer again here
    }
  }, [demoVideoStatus, isPlaying]);
  
  // Handle smooth transition between views
  const animateViewTransition = (newView: 'demo' | 'stretch' | 'rest' | 'transition', animate = true) => {
    if (viewMode === newView || isTransitioning) return;
    
    setIsTransitioning(true);
    
    // Determine the direction of slide animation
    const slideDirection = newView === 'demo' ? -1 : newView === 'rest' ? -2 : newView === 'transition' ? -3 : 1;
    
    if (animate) {
      // Fade out current view
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        // Set the new view mode while hidden
        setViewMode(newView);
        
        // Reset slide position
        slideAnim.setValue(slideDirection * -50);
        
        // Fade in new view with slide
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 350,
            useNativeDriver: true,
          })
        ]).start(() => {
          setIsTransitioning(false);
        });
      });
    } else {
      // Instant switch without animation
      setViewMode(newView);
      fadeAnim.setValue(1);
      slideAnim.setValue(0);
      setIsTransitioning(false);
    }
  };
  
  // Handle transitioning from demo to stretch
  const handleReadyToStretch = () => {
    try {
      soundEffects.playClickSound();
      setHasDemoBeenWatched(true);
      
      // Animate transition to stretch view
      animateViewTransition('stretch');
      
      // Always resume timer when transitioning from demo to stretch
      // Since we always pause when watching demo, we need to resume here
      if (isPaused) {
        // Small delay to allow animation to complete
        setTimeout(() => {
          handleTogglePause(); // Resume timer
          // Add subtle haptic feedback when resuming
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }, 400);
      }
      
      // Force timer text to update by re-rendering
      setTimerForceUpdate(Date.now());
    } catch (error) {
      console.error('Error transitioning to stretch mode:', error);
    }
  };
  
  // Handle when demo video ends
  const handleDemoVideoEnd = () => {
    // Don't automatically transition - let user click "Ready to Stretch"
  };

  // Handle switching to demo view
  const handleWatchDemo = () => {
    try {
      soundEffects.playClickSound();
      
      // Always pause timer when watching demo
      if (!isPaused) {
        handleTogglePause(); // Pause the timer
        // Add subtle haptic feedback when pausing
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      // Animate transition to demo view
      animateViewTransition('demo');
    } catch (error) {
      console.error('Error switching to demo view:', error);
    }
  };
  
  // Add format time function
  const formatTimeSeconds = (seconds: number) => {
    const roundedSeconds = Math.round(seconds);
    const mins = Math.floor(roundedSeconds / 60);
    const secs = roundedSeconds % 60;
    
    if (mins > 0) {
      return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    } else {
      return `${secs}s`;
    }
  };
  
  // Function to check if stretch has a video source - updated to work with any stretch
  const isVideoSource = useCallback((stretchToCheck: Stretch | null) => {
    if (!stretchToCheck || !stretchToCheck.image) {
      return false;
    }

    // Case 1: Check for the __video flag
    if (typeof stretchToCheck.image === 'object' && 
        stretchToCheck.image !== null && 
        (stretchToCheck.image as any).__video === true) {
      return true;
    }
    
    // Case 2: Check for .mp4 extension in uri
    if (typeof stretchToCheck.image === 'object' && 
        stretchToCheck.image !== null && 
        'uri' in stretchToCheck.image && 
        typeof stretchToCheck.image.uri === 'string' && 
        (stretchToCheck.image.uri.toLowerCase().endsWith('.mp4') || 
         stretchToCheck.image.uri.toLowerCase().endsWith('.mov'))) {
      return true;
    }

    // Case 3: Check for require asset with MP4 reference
    if (typeof stretchToCheck.image === 'object' && 
        (stretchToCheck.image as any).__asset) {
      return true;
    }

    // Case 4: Last resort - try to detect MP4 from number asset
    if (typeof stretchToCheck.image === 'number') {
      // Convert to string and check for MP4 in the debug description
      const assetStr = stretchToCheck.image.toString();
      
      // Try to detect MP4 from the asset reference
      if (assetStr.includes('mp4') || assetStr.includes('mov') || assetStr.includes('video')) {
        return true;
      }
    }
    
    return false;
  }, []);
  
  // Use effect to log debugging info only when stretch changes
  useEffect(() => {
    if (!isRest && !isTransition && stretchObj) {
      console.log(`Source type for ${stretchObj.name}:`, {
        type: typeof stretchObj.image,
        isObject: typeof stretchObj.image === 'object',
        hasVideo: typeof stretchObj.image === 'object' && 
                  (stretchObj.image as any).__video === true,
        sourceValue: typeof stretchObj.image === 'number' ? 
                  `[Asset #${stretchObj.image}]` : 
                  JSON.stringify(stretchObj.image).substring(0, 100),
      });
      
      if (isVideoSource(stretchObj)) {
        console.log(`✅ Video detected for ${stretchObj.name}`);
      } else {
        console.log(`❌ Not detected as video for ${stretchObj.name}`);
      }
      
      console.log(`Source for ${stretchObj.name}: ${typeof stretchObj.image} | isVideo: ${isVideoSource(stretchObj)}`);
    }
  }, [currentStretchId, isRest, isTransition, isVideoSource, stretchObj]);
  
  // Calculate total duration based on whether the stretch is bilateral
  const calculateTotalDuration = (stretchObj: Stretch) => {
    if (!stretchObj) return 0;
    // No doubling here as it's handled elsewhere
    return stretchObj.duration;
  };
  
  // Calculate per-side duration for bilateral stretches
  const calculatePerSideDuration = (stretchObj: Stretch) => {
    if (!stretchObj || !stretchObj.bilateral) return stretchObj?.duration || 0;
    // For bilateral stretches, the duration is the total, so divide by 2 for per side
    return Math.floor(stretchObj.duration / 2);
  };
  
  // Render the appropriate image or video
  const renderStretchImage = () => {
    if (isRest || imageLoadError) {
      return (
        <View style={styles.fallbackImageContainer}>
          <Ionicons name="image-outline" size={50} color={isDark ? "#666" : "#999"} />
          <Text style={[styles.fallbackImageText, { color: isDark ? theme.textSecondary : '#666' }]}>
            {isRest ? (stretch.name || 'Rest Period') : 'Image unavailable'}
          </Text>
        </View>
      );
    }

    if (!stretchObj) return null;
    
    const shouldRenderVideo = isVideoSource(stretchObj);
    
    if (shouldRenderVideo) {
      let videoSource = stretchObj.image;
      // If we have an __asset field, use the asset reference directly
      if ((stretchObj.image as any).__asset) {
        videoSource = (stretchObj.image as any).__asset;
      }
      
      return (
        <Animated.View style={[styles.imageWrapper, { opacity: imageOpacity }]}>
          <Video 
            source={videoSource}
            style={styles.stretchImage}
            resizeMode={VideoResizeMode.CONTAIN}
            shouldPlay={true}
            isLooping={true}
            isMuted={true}
            useNativeControls={false}
            onLoadStart={() => {
              setIsImageLoading(true);
            }}
            onReadyForDisplay={() => {
              console.log(`Video ready for display: ${stretchObj.name}`);
              setIsImageLoading(false);
              // Fade in the video when loaded
              Animated.timing(imageOpacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true
              }).start();
            }}
            onLoad={() => {
              console.log(`Successfully loaded video for ${stretchObj.name}`);
              setIsImageLoading(false);
              // Fade in the video when loaded
              Animated.timing(imageOpacity, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true
              }).start();
            }}
            onError={(error) => {
              console.warn(`Failed to load video for stretch: ${stretchObj.name}`, error);
              setImageLoadError(true);
              setIsImageLoading(false);
            }}
            onPlaybackStatusUpdate={(status) => {
              // Also mark as loaded when playback starts
              if (status.isLoaded && status.isPlaying && isImageLoading) {
                console.log(`Video is now playing for ${stretchObj.name}`);
                setIsImageLoading(false);
                Animated.timing(imageOpacity, {
                  toValue: 1,
                  duration: 250,
                  useNativeDriver: true
                }).start();
              }
            }}
          />
          {isImageLoading && (
            <View style={styles.imageLoadingContainer}>
              <ActivityIndicator size="large" color={isDark ? theme.accent : '#4CAF50'} />
              <Text style={[styles.loadingText, { color: isDark ? theme.textSecondary : '#666', marginTop: 10 }]}>
                Loading video...
              </Text>
            </View>
          )}
        </Animated.View>
      );
    }
    
    return (
      <Animated.View style={[styles.imageWrapper, { opacity: imageOpacity }]}>
        <Image 
          source={stretchObj.image}
          style={styles.stretchImage}
          resizeMode="contain"
          onLoadStart={() => {
            setIsImageLoading(true);
          }}
          onLoad={() => {
            console.log(`Successfully loaded image for ${stretchObj.name}`);
            setIsImageLoading(false);
            // Fade in the image when loaded
            Animated.timing(imageOpacity, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true
            }).start();
          }}
          onError={(e) => {
            console.warn(`Failed to load image for stretch: ${stretchObj.name}`, e.nativeEvent.error);
            setImageLoadError(true);
            setIsImageLoading(false);
          }}
        />
        {isImageLoading && (
          <View style={styles.imageLoadingContainer}>
            <ActivityIndicator size="large" color={isDark ? theme.accent : '#4CAF50'} />
          </View>
        )}
      </Animated.View>
    );
  };
  
  // Render stretch demo view
  const renderDemoView = () => {
    if (isRest || !hasDemo) return null;
    
    const stretchObj = stretch as Stretch;
    
    return (
      <View style={styles.demoContainer}>
        {/* Demo header */}
        <View style={styles.demoHeader}>
          <Text style={[styles.demoTitle, { color: isDark ? theme.text : '#333' }]}>
            {stretchObj.name || 'Stretch Demo'}
          </Text>
          
          <View style={styles.badgeContainer}>
            {stretchObj.bilateral && (
              <View style={[styles.badgeItem, { backgroundColor: isDark ? theme.accent : '#4CAF50' }]}>
                <Ionicons name="swap-horizontal" size={16} color="#FFF" />
                <Text style={styles.badgeText}>Both Sides</Text>
              </View>
            )}
            
            {isPremium && (
              <View style={[styles.badgeItem, { backgroundColor: (stretch as any).vipBadgeColor || '#FFD700' }]}>
                <Ionicons name="star" size={16} color="#FFF" />
                <Text style={styles.badgeText}>VIP</Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Video player section - Now takes more vertical space */}
        <View style={styles.demoVideoWrapper}>
          {'demoVideo' in stretchObj && stretchObj.demoVideo && (
            <DemoVideoPlayer
              videoSource={stretchObj.demoVideo}
              audioSource={'demoAudio' in stretchObj ? stretchObj.demoAudio : undefined}
              onClose={() => {}} // Not needed in this design
              autoPlay={true}
              initialMuted={false}
              onVideoEnd={handleDemoVideoEnd}
            />
          )}
        </View>
        
        {/* Enhanced Instructions Panel with Ready button at bottom */}
        <View style={[
          styles.demoInstructionsPanel, 
          { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
        ]}>
          <View style={styles.instructionsHeader}>
            <Ionicons name="information-circle" size={22} color={isDark ? theme.accent : '#4CAF50'} />
            <Text style={[styles.instructionsTitle, { color: isDark ? theme.accent : '#4CAF50' }]}>
              How to perform this stretch
            </Text>
          </View>
          
          {/* Stretch description with formatted steps */}
          <View style={styles.instructionsContent}>
            <StructuredInstructions 
              description={stretchObj.description || 'Follow along with the demonstration video.'} 
              isDark={isDark}
              theme={theme}
            />
            
            {/* Display tips if available */}
            {hasTips && (
              <View style={styles.tipsList}>
                <Text style={[styles.tipsListHeader, { color: isDark ? theme.text : '#333', marginTop: 12 }]}>
                  Tips for best results:
                </Text>
                {(stretchObj as any).tips.map((tip: string, index: number) => (
                  <View key={index} style={styles.tipListItem}>
                    <View style={[styles.tipItemBullet, { backgroundColor: isDark ? theme.accent : '#4CAF50' }]} />
                    <Text style={[styles.tipItemText, { color: isDark ? theme.textSecondary : '#555' }]}>
                      {tip}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            
       
            {/* Ready to Stretch button now inside the instructions panel */}
            <View style={styles.inlineDemoFooter}>
              <TouchableOpacity
                style={[styles.readyButton, { backgroundColor: isDark ? theme.accent : '#4CAF50' }]}
                onPress={handleReadyToStretch}
              >
                <Text style={styles.readyButtonText}>Ready to Stretch</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };
  
  // Render stretch instructions view
  const renderStretchInstructionsView = () => {
    if (isRest) return renderRestPeriod();
    
    const stretchObj = stretch as Stretch;
    const tips = hasTips ? (stretchObj as any).tips : [];
    
    return (
      <Animated.View style={[
        styles.stretchContainer,
        { opacity: fadeAnim }
      ]}>
        {/* Header with title and badges */}
        <View style={styles.stretchHeader}>
          <Text style={[styles.stretchName, { color: isDark ? theme.text : '#333' }]}>
            {stretchObj.name || 'Stretch'}
          </Text>
          
          <View style={styles.badgeContainer}>
            {stretchObj.bilateral && (
              <View style={[styles.badgeItem, { backgroundColor: isDark ? theme.accent : '#4CAF50' }]}>
                <Ionicons name="swap-horizontal" size={16} color="#FFF" />
                <Text style={styles.badgeText}>Both Sides</Text>
              </View>
            )}
            
            {isPremium && (
              <View style={[styles.badgeItem, { backgroundColor: (stretch as any).vipBadgeColor || '#FFD700' }]}>
                <Ionicons name="star" size={16} color="#FFF" />
                <Text style={styles.badgeText}>VIP</Text>
              </View>
            )}
            
            {hasDemo && (
              <TouchableOpacity 
                style={[
                  styles.badgeItem, 
                  { 
                    backgroundColor: !hasDemoBeenWatched ? '#FF5722' : '#FF5722',
                    padding: !hasDemoBeenWatched ? 10 : undefined,
                    borderWidth: !hasDemoBeenWatched ? 2 : 0,
                    borderColor: !hasDemoBeenWatched ? '#FFF' : undefined
                  }
                ]}
                onPress={handleWatchDemo}
              >
                <Ionicons name="videocam" size={!hasDemoBeenWatched ? 18 : 16} color="#FFF" />
                <Text style={[
                  styles.badgeText, 
                  !hasDemoBeenWatched ? styles.emphasizedBadgeText : null
                ]}>
                  {!hasDemoBeenWatched ? 'Watch Demo (Instructions)' : 'Watch Demo'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        
        {/* Timer back to original position and size */}
        <View style={styles.timerContainer}>
          <CircularTimer
            key={timerForceUpdate}
            progress={progressAnim}
            timeRemaining={displayedTime}
            diameter={125}
            strokeWidth={8}
            color={isDark ? theme.accent : '#4CAF50'}
            backgroundColor={isDark ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
            textColor="#000"
            isDark={isDark}
          />
        </View>
        
        {/* Image section */}
        <View style={[
          styles.imageContainer,
          { 
            backgroundColor: isDark ? theme.cardBackground : '#FFF',
            borderColor: isPremium ? ((stretch as any).vipBadgeColor || '#FFD700') : (isDark ? theme.border : '#DDD'),
            height: hasTips ? height * 0.25 : height * 0.3 // Make smaller when tips are present
          }
        ]}>
          {renderStretchImage()}
        </View>
        
        {/* No description - only shown in demo view */}
        
        {/* Tips section - always show tips as they're important reminders */}
        {hasTips && (
          <View style={[
            styles.tipsContainerCompact,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }
          ]}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb" size={18} color={isDark ? theme.accent : '#4CAF50'} />
              <Text style={[styles.tipsTitle, { color: isDark ? theme.accent : '#4CAF50' }]}>
                Tips:
              </Text>
            </View>
            {tips.map((tip: string, index: number) => (
              <Text key={index} style={[styles.tipTextCompact, { color: isDark ? theme.text : '#333' }]}>
                • {tip}
              </Text>
            ))}
          </View>
        )}
      </Animated.View>
    );
  };

  // Render a rest period
  const renderRestPeriod = () => {
    return (
      <View style={styles.restContainer}>
        <LinearGradient
          colors={isDark ? ['#1a1a1a', '#2a2a2a'] : ['#f5f5f5', '#e0e0e0']}
          style={styles.restGradient}
        >
          <View style={styles.restContent}>
            <Ionicons 
              name="time-outline" 
              size={50} 
              color={isDark ? theme.accent : '#4CAF50'} 
              style={styles.restIcon} 
            />
            
            <Text style={[styles.restTitle, { color: isDark ? theme.text : '#333' }]}>
              Rest Period
            </Text>
            
            <Text style={[styles.restDescription, { color: isDark ? theme.textSecondary : '#666' }]}>
              {stretch.description}
            </Text>
            
            <View style={styles.restTimerContainer}>
              <CircularTimer
                key={timeRemaining}
                progress={progressAnim}
                timeRemaining={timeRemaining}
                diameter={120}
                strokeWidth={8}
                color={isDark ? theme.accent : '#4CAF50'}
                backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0'}
                textColor="#000"
                isDark={isDark}
              />
            </View>
            
            <View style={styles.restButtonsContainer}>
              {currentIndex > 0 && (
                <TouchableOpacity
                  style={[styles.restButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEEEEE' }]}
                  onPress={onPrevious}
                >
                  <Ionicons name="chevron-back" size={24} color={isDark ? theme.text : '#333'} />
                  <Text style={[styles.restButtonText, { color: isDark ? theme.text : '#333' }]}>Previous</Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.restButton, { backgroundColor: isDark ? theme.accent : '#4CAF50' }]}
                onPress={onTogglePause}
              >
                <Ionicons name={isPaused ? "play" : "pause"} size={24} color="#FFF" />
                <Text style={styles.restButtonText}>{isPaused ? "Resume" : "Pause"}</Text>
              </TouchableOpacity>
              
              {canSkipToNext && (
                <TouchableOpacity
                  style={[styles.restButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#EEEEEE' }]}
                  onPress={onNext}
                >
                  <Text style={[styles.restButtonText, { color: isDark ? theme.text : '#333' }]}>Skip</Text>
                  <Ionicons name="chevron-forward" size={24} color={isDark ? theme.text : '#333'} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </LinearGradient>
      </View>
    );
  };

  // Wrap onTogglePause to add haptic feedback
  const handleTogglePause = () => {
    try {
      // Add haptic feedback based on what the new state will be (opposite of current isPaused)
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Call the original onTogglePause function
      onTogglePause();
    } catch (error) {
      console.error('Error with haptic feedback:', error);
      // Still call the original function even if haptics fail
      onTogglePause();
    }
  };

  // Function to check if next stretch has a video source - moved outside renderTransitionPeriod
  const nextStretchHasVideo = useCallback(() => {
    if (!nextStretch || ('isRest' in nextStretch) || ('isTransition' in nextStretch)) {
      return false;
    }

    // Case 1: Check for the __video flag
    if (typeof nextStretch.image === 'object' && 
        nextStretch.image !== null && 
        (nextStretch.image as any).__video === true) {
      return true;
    }
    
    // Case 2: Check for .mp4 extension in uri
    if (typeof nextStretch.image === 'object' && 
        nextStretch.image !== null && 
        'uri' in nextStretch.image && 
        typeof nextStretch.image.uri === 'string' && 
        (nextStretch.image.uri.toLowerCase().endsWith('.mp4') || 
         nextStretch.image.uri.toLowerCase().endsWith('.mov'))) {
      return true;
    }

    // Case 3: Check for require asset with MP4 reference
    if (typeof nextStretch.image === 'object' && 
        (nextStretch.image as any).__asset) {
      return true;
    }

    // Case 4: Last resort - try to detect MP4 from number asset
    if (typeof nextStretch.image === 'number') {
      // Convert to string and check for MP4 in the debug description
      const assetStr = nextStretch.image.toString();
      
      // Try to detect MP4/MOV from the asset reference
      if (assetStr.includes('mp4') || assetStr.includes('mov') || assetStr.includes('video')) {
        return true;
      }
    }
    
    return false;
  }, [nextStretch]);
  
  // Effect to seek to end of video when component mounts or nextStretch changes
  useEffect(() => {
    if (nextStretch && nextStretchHasVideo() && transitionVideoRef.current && viewMode === 'transition') {
      // Small timeout to ensure video is loaded
      const timer = setTimeout(() => {
        try {
          // Try to seek to near the end of the video - use a longer timeout to ensure video is loaded
          transitionVideoRef.current?.playAsync().then(() => {
            // Wait a bit to let the video start playing
            setTimeout(() => {
              // Seek to 80% of the video duration to show a good representative frame
              transitionVideoRef.current?.getStatusAsync().then((status) => {
                if (status.isLoaded && status.durationMillis) {
                  // Seek to 80% of the duration
                  const seekPosition = status.durationMillis * 0.8;
                  transitionVideoRef.current?.setPositionAsync(seekPosition).then(() => {
                    // Pause the video after seeking
                    transitionVideoRef.current?.pauseAsync();
                  });
                }
              });
            }, 300);
          });
        } catch (error) {
          console.log('Error seeking video:', error);
        }
      }, 200);
      
      return () => clearTimeout(timer);
    }
  }, [nextStretch, nextStretchHasVideo, viewMode]);

  // Render a transition period (with preview of next stretch)
  const renderTransitionPeriod = () => {
    // More detailed logging about the next stretch for debugging - only log once per stretch
    if (nextStretch && !('isRest' in nextStretch) && !('isTransition' in nextStretch)) {
      const stretchKey = `${nextStretch.id}-${nextStretch.name}`;
      
      if (!loggedStretchesRef.current.has(stretchKey)) {
        console.log(`Transition preview - Next stretch: ${nextStretch.name}`);
        console.log(`Next stretch image details:`, JSON.stringify({
          exists: !!nextStretch.image,
          type: typeof nextStretch.image,
          isVideoByFunction: isVideoSource(nextStretch),
          imageValue: nextStretch.image && typeof nextStretch.image === 'object' ? 
            JSON.stringify(nextStretch.image).substring(0, 100) : 'non-object',
          hasVideoFlag: nextStretch.image && typeof nextStretch.image === 'object' && 
            (nextStretch.image as any).__video === true,
          hasAsset: nextStretch.image && typeof nextStretch.image === 'object' && 
            (nextStretch.image as any).__asset !== undefined
        }));
        
        // Mark this stretch as logged
        loggedStretchesRef.current.add(stretchKey);
      }
    }

    return (
      <View style={[styles.transitionContainer, { backgroundColor: isDark ? theme.background : '#F9F9F9' }]}>
        {/* Preview of next stretch if available */}
        {nextStretch && !('isRest' in nextStretch) && !('isTransition' in nextStretch) && (
          <View style={[
            styles.nextStretchPreviewContainer, 
            { backgroundColor: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }
          ]}>
            <Text style={[styles.nextStretchPreviewLabel, { color: isDark ? theme.textSecondary : '#666' }]}>
              Up Next:
            </Text>
            <Text style={[styles.nextStretchPreviewName, { color: isDark ? theme.text : '#333' }]}>
              {nextStretch.name}
            </Text>
            
            {/* Premium badge if applicable */}
            {(nextStretch as any).isPremium && (
              <View style={[
                styles.nextStretchPremiumBadge, 
                { backgroundColor: (nextStretch as any).vipBadgeColor || '#FFD700' }
              ]}>
                <Ionicons name="star" size={14} color="#FFF" />
                <Text style={styles.nextStretchPremiumText}>Premium</Text>
              </View>
            )}
            
            {/* Larger image container */}
            <View style={[
              styles.nextStretchImageContainer, 
              { 
                backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.8)',
                borderColor: (nextStretch as any).isPremium ? 
                  ((nextStretch as any).vipBadgeColor || '#FFD700') : 
                  (isDark ? theme.border : '#DDD')
              }
            ]}>
              {nextStretch.image ? (
                isVideoSource(nextStretch) ? (
                  // Video source - display with a frame from the video
                  <View style={styles.previewContentContainer}>
                    <Text style={styles.previewLoadingText}>
                      Video Preview Loading...
                    </Text>
                    <ActivityIndicator size="large" color={isDark ? theme.accent : '#4CAF50'} />
                    <Video 
                      ref={transitionVideoRef}
                      source={
                        (nextStretch.image as any).__asset ? 
                        (nextStretch.image as any).__asset : 
                        nextStretch.image
                      }
                      style={[styles.previewMedia, { opacity: transitionVideoOpacity }]}
                      resizeMode={VideoResizeMode.CONTAIN}
                      shouldPlay={false} // Don't auto-play - we'll control this in the effect
                      isLooping={false} // No looping needed for a static frame
                      isMuted={true}
                      volume={0}
                      useNativeControls={false}
                      onLoadStart={() => {
                        console.log(`Transition video loading started for: ${nextStretch.name}`);
                      }}
                      onLoad={(status) => {
                        console.log(`Transition video loaded for: ${nextStretch.name}`, status);
                        // Fade in the video using state
                        setTransitionVideoOpacity(1);
                      }}
                      onError={(error) => {
                        console.error(`Error loading transition video for: ${nextStretch.name}`, error);
                      }}
                    />
                  </View>
                ) : (
                  // Regular image source
                  <View style={styles.previewContentContainer}>
                    <Text style={styles.previewLoadingText}>
                      Image Preview Loading...
                    </Text>
                    <ActivityIndicator size="small" color={isDark ? theme.accent : '#4CAF50'} />
                    <Image 
                      source={nextStretch.image}
                      style={styles.previewMedia}
                      resizeMode="contain"
                      onLoad={() => {
                        console.log(`Transition image loaded for: ${nextStretch.name}`);
                      }}
                      onError={(e) => {
                        console.error(`Error loading transition image for: ${nextStretch.name}`, e.nativeEvent.error);
                      }}
                    />
                  </View>
                )
              ) : (
                // Fallback when no image is available
                <View style={styles.fallbackImageContainer}>
                  <Ionicons name="image-outline" size={50} color={isDark ? "#666" : "#999"} />
                  <Text style={[styles.fallbackImageText, { color: isDark ? theme.textSecondary : '#666' }]}>
                    {nextStretch.name || 'Next Stretch'}
                  </Text>
                </View>
              )}
            </View>
            
            {/* Show bilateral badge if applicable */}
            {nextStretch.bilateral && (
              <View style={[styles.nextStretchBilateralBadge, { backgroundColor: isDark ? theme.accent : '#4CAF50' }]}>
                <Ionicons name="swap-horizontal" size={14} color="#FFF" />
                <Text style={styles.nextStretchBadgeText}>Both Sides</Text>
              </View>
            )}
          </View>
        )}
        
        {/* Smaller, more compact "Get Ready" card */}
        <View style={[styles.transitionContent, { 
          backgroundColor: isDark ? theme.cardBackground : '#FFFFFF',
          padding: 16,
          marginTop: 8,
          flexDirection: 'row',
          alignItems: 'center'
        }]}>
          <View style={styles.transitionTimerContainer}>
            <CircularTimer
              key={timeRemaining}
              progress={progressAnim}
              timeRemaining={timeRemaining}
              diameter={70}
              strokeWidth={6}
              color={isDark ? theme.accent : '#4CAF50'}
              backgroundColor={isDark ? 'rgba(255,255,255,0.1)' : '#E0E0E0'}
              textColor="#000"
              isDark={isDark}
            />
          </View>
          
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons
                name="sync-outline" 
                size={18} 
                color={isDark ? theme.accent : '#4CAF50'} 
              />
              <Text style={[styles.transitionTitle, { 
                color: isDark ? theme.text : '#333',
                fontSize: 18,
                marginTop: 0,
                marginLeft: 6
              }]}>
                Get Ready
              </Text>
            </View>
            
            <Text style={[styles.transitionSubtitle, { 
              color: isDark ? theme.textSecondary : '#666',
              fontSize: 14,
              marginBottom: 8,
              textAlign: 'left'
            }]}>
              {stretch.description}
            </Text>
            
            {/* Navigation buttons in a row */}
            <View style={[styles.transitionButtonsContainer, { 
              marginTop: 8, 
              justifyContent: 'flex-start' 
            }]}>
              {currentIndex > 0 && (
                <TouchableOpacity
                  style={[styles.transitionButton, { 
                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F5F5F5',
                    marginRight: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 12
                  }]}
                  onPress={onPrevious}
                >
                  <Ionicons name="chevron-back" size={18} color={isDark ? theme.text : '#333'} />
                  <Text style={[styles.transitionButtonText, { 
                    color: isDark ? theme.text : '#333',
                    fontSize: 14
                  }]}>
                    Previous
                  </Text>
                </TouchableOpacity>
              )}
              
              {canSkipToNext && (
                <TouchableOpacity
                  style={[styles.transitionButton, { 
                    backgroundColor: isDark ? theme.accent : '#4CAF50',
                    marginLeft: currentIndex > 0 ? 8 : 0,
                    paddingVertical: 8,
                    paddingHorizontal: 12
                  }]}
                  onPress={onNext}
                >
                  <Text style={[styles.transitionButtonText, {
                    fontSize: 14
                  }]}>
                    I'm Ready
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#FFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Main render function
  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        {viewMode === 'demo' && renderDemoView()}
        {viewMode === 'stretch' && !isRest && !isTransition && renderStretchInstructionsView()}
        {viewMode === 'rest' && isRest && renderRestPeriod()}
        {viewMode === 'transition' && isTransition && renderTransitionPeriod()}
      </Animated.View>
      
      {/* Navigation buttons in a floating container when in stretch view */}
      {viewMode === 'stretch' && (
        <View style={styles.navigationButtonsContainer}>
          <NavigationButtons
            onPrevious={onPrevious}
            onNext={onNext}
            onTogglePause={handleTogglePause}
            isPaused={isPaused}
            isPreviousDisabled={currentIndex === 0}
            isLastStretch={currentIndex === totalCount - 1}
            canSkipToNext={canSkipToNext}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
  },
  contentContainer: {
    flex: 1,
  },
  // Demo view styles
  demoContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  demoHeader: {
    padding: 16,
    paddingBottom: 8,
  },
  demoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  demoVideoContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: 'transparent',
  },
  demoVideoWrapper: {
    width: '100%',
    height: Platform.OS === 'ios' ? height * 0.4 : height * 0.35, // Allocate more space for the video
    backgroundColor: 'transparent',
  },
  demoFooter: {
    padding: 16,
    alignItems: 'center',
  },
  readyButtonContainer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  readyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    width: '90%',
    maxWidth: 300,
  },
  readyButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  // Stretch view styles
  stretchContainer: {
    flex: 1,
    padding: 16,
    paddingBottom: 80, // Add space for floating navigation buttons
  },
  stretchHeader: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 15,
  },
  stretchName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 15,
  },
  badgeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginHorizontal: 5,
    marginBottom: 5,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 13,
    marginLeft: 5,
    fontWeight: '600',
  },
  imageContainer: {
    height: height * 0.25,
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  stretchImage: {
    width: '100%',
    height: '100%',
  },
  stretchDescription: {
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  tipsContainer: {
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipsTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  tipText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 6,
    paddingLeft: 8,
  },
  // Rest period styles
  restContainer: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  restIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  restTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  restDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  fallbackImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackImageText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
  },
  imageWrapper: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  loadingText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Enhanced instructions panel styles
  demoInstructionsPanel: {
    flex: 1, // Take up remaining space
    margin: 12,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  instructionsScrollContainer: {
    flex: 1,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionsTitle: {
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 8,
  },
  instructionsContent: {
    paddingLeft: 4,
  },
  tipsList: {
    marginTop: 8,
  },
  tipsListHeader: {
    fontWeight: '600',
    fontSize: 16,
    marginBottom: 8,
  },
  tipListItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  tipItemBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 8,
  },
  tipItemText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 20,
  },
  durationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  durationText: {
    fontSize: 15,
    marginLeft: 8,
    fontWeight: '500',
  },
  durationIndicatorStretch: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
    borderColor: 'rgba(0,0,0,0.05)',
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  durationTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  durationTextStretch: {
    fontSize: 16,
    fontWeight: '600',
  },
  durationSubText: {
    fontSize: 14,
    marginTop: 2,
  },
  circularTimerContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularTimerTextContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularTimerText: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  circularTimerLabel: {
    fontSize: 12,
    marginTop: -3,
    textAlign: 'center',
    opacity: 0.7,
  },
  structuredInstructionsContainer: {
    marginBottom: 16,
  },
  simpleInstructionsContainer: {
    marginBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderRadius: 12,
    padding: 12,
  },
  instructionSection: {
    marginBottom: 16,
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  instructionHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  simpleInstructionItem: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  instructionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 7,
    marginRight: 10,
  },
  simpleInstructionText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  stepNumberCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  cuesContainer: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  cueBulletPoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cueBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    marginRight: 8,
  },
  cueText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  inlineDemoFooter: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 8,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  emphasizedBadgeText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  navigationButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 100,
  },
  tipsContainerCompact: {
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  tipTextCompact: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
    paddingLeft: 6,
  },
  restGradient: {
    flex: 1,
    borderRadius: 16,
  },
  restContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  restIcon: {
    marginBottom: 20,
  },
  restTimerContainer: {
    marginBottom: 20,
  },
  restButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restButton: {
    padding: 12,
    borderRadius: 20,
  },
  restButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  transitionContainer: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  transitionContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 20, // Add margin to separate from the preview
  },
  transitionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  transitionSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  transitionTimerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  transitionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  transitionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  transitionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginHorizontal: 8,
  },
  nextStretchPreviewContainer: {
    width: '100%',
    maxWidth: 400,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextStretchPreviewLabel: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500',
  },
  nextStretchPreviewName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  nextStretchImageContainer: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    marginVertical: 16,
  },
  nextStretchImage: {
    width: '100%',
    height: '100%',
  },
  nextStretchPremiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  nextStretchPremiumText: {
    color: '#FFF',
    fontSize: 13,
    marginLeft: 5,
    fontWeight: '600',
  },
  nextStretchBilateralBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  nextStretchBadgeText: {
    color: '#FFF',
    fontSize: 13,
    marginLeft: 5,
    fontWeight: '600',
  },
  // New styles for preview content
  previewContentContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewLoadingText: {
    color: '#fff',
    marginBottom: 10,
    textAlign: 'center',
  },
  previewMedia: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    opacity: 0.6,
  },
});

export default StretchFlowView; 