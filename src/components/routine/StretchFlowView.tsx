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
  Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import DemoVideoPlayer from './DemoVideoPlayer';
import * as soundEffects from '../../utils/soundEffects';
import * as Haptics from 'expo-haptics';
import { Stretch, RestPeriod } from '../../types';
import { NavigationButtons } from './utils';
import { Video, ResizeMode as VideoResizeMode } from 'expo-av';
import Svg, { Circle } from 'react-native-svg';

const { width, height } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface StretchFlowViewProps {
  stretch: Stretch | RestPeriod;
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
  isPlaying
}) => {
  const { theme, isDark } = useTheme();
  
  // App states
  const [viewMode, setViewMode] = useState<'demo' | 'stretch' | 'rest'>('stretch');
  const [hasDemoBeenWatched, setHasDemoBeenWatched] = useState(false);
  const [previousStretch, setPreviousStretch] = useState<Stretch | null>(null);
  const [timerForceUpdate, setTimerForceUpdate] = useState(Date.now());
  const [demoVideoStatus, setDemoVideoStatus] = useState<'not-started' | 'playing' | 'completed'>('not-started');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayedTime, setDisplayedTime] = useState(timeRemaining);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(true);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  
  // Update displayed time whenever timeRemaining changes
  useEffect(() => {
    setDisplayedTime(timeRemaining);
  }, [timeRemaining]);
  
  // Is this a rest or a stretch?
  const isRest = 'isRest' in stretch;
  const isPremium = !isRest && (stretch as any).isPremium;
  const hasDemo = !isRest && 'hasDemo' in stretch && (stretch as Stretch).hasDemo;
  // Define stretchObj here for scope access in all functions
  const stretchObj = isRest ? null : (stretch as Stretch);
  
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
  const hasTips = !isRest && 'tips' in stretch && (stretch as any).tips && (stretch as any).tips.length > 0;
  
  // When stretch changes or on first load, show demo first if available
  useEffect(() => {
    if (isRest) {
      // Rest periods don't have demos, go straight to stretch view
      animateViewTransition('stretch', false);
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
  const animateViewTransition = (newView: 'demo' | 'stretch', animate = true) => {
    if (viewMode === newView || isTransitioning) return;
    
    setIsTransitioning(true);
    
    // Determine the direction of slide animation
    const slideDirection = newView === 'demo' ? -1 : 1;
    
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
  
  // Enhanced detection for video sources
  const isVideoSource = useCallback(() => {
    if (isRest || !stretchObj || !stretchObj.image) {
      return false;
    }

    // Case 1: Check for the __video flag
    if (typeof stretchObj.image === 'object' && 
        stretchObj.image !== null && 
        (stretchObj.image as any).__video === true) {
      return true;
    }
    
    // Case 2: Check for .mp4 extension in uri
    if (typeof stretchObj.image === 'object' && 
        stretchObj.image !== null && 
        'uri' in stretchObj.image && 
        typeof stretchObj.image.uri === 'string' && 
        stretchObj.image.uri.toLowerCase().endsWith('.mp4')) {
      return true;
    }

    // Case 3: Check for require asset with MP4 reference
    if (typeof stretchObj.image === 'object' && 
        (stretchObj.image as any).__asset) {
      return true;
    }

    // Case 4: Last resort - try to detect MP4 from number asset
    if (typeof stretchObj.image === 'number') {
      // Convert to string and check for MP4 in the debug description
      const assetStr = stretchObj.image.toString();
      
      // Try to detect MP4 from the asset reference
      const isMp4 = assetStr.includes('mp4') || assetStr.includes('video');
      if (isMp4) {
        return true;
      }
    }
    
    return false;
  }, [isRest, stretchObj]);
  
  // Use effect to log debugging info only when stretch changes
  useEffect(() => {
    if (!isRest && stretchObj) {
      console.log(`Source type for ${stretchObj.name}:`, {
        type: typeof stretchObj.image,
        isObject: typeof stretchObj.image === 'object',
        hasVideo: typeof stretchObj.image === 'object' && 
                  (stretchObj.image as any).__video === true,
        sourceValue: typeof stretchObj.image === 'number' ? 
                  `[Asset #${stretchObj.image}]` : 
                  JSON.stringify(stretchObj.image).substring(0, 100),
      });
      
      if (isVideoSource()) {
        console.log(`✅ Video detected for ${stretchObj.name}`);
      } else {
        console.log(`❌ Not detected as video for ${stretchObj.name}`);
      }
      
      console.log(`Source for ${stretchObj.name}: ${typeof stretchObj.image} | isVideo: ${isVideoSource()}`);
    }
  }, [currentStretchId, isRest, isVideoSource, stretchObj]);
  
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
    
    const shouldRenderVideo = isVideoSource();
    
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
  
  // Circular Timer Component
  const CircularTimer: React.FC<{
    progress: Animated.Value;
    timeRemaining: number;
    diameter?: number;
    strokeWidth?: number;
    color?: string;
    backgroundColor?: string;
    textColor?: string;
    isDark?: boolean;
  }> = ({
    progress,
    timeRemaining,
    diameter = 100,
    strokeWidth = 8,
    color = '#4CAF50',
    backgroundColor = '#E0E0E0',
    textColor = '#333',
    isDark = false
  }) => {
    const radius = (diameter - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    
    // Animated value for seconds text
    const [prevTime, setPrevTime] = useState(timeRemaining);
    const textOpacity = useRef(new Animated.Value(1)).current;
    const textScale = useRef(new Animated.Value(1)).current;
    
    // Format time as minutes and seconds
    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      
      if (mins > 0) {
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      } else {
        return `${secs}`;
      }
    };
    
    // Animate the seconds text when it changes
    useEffect(() => {
      if (prevTime !== timeRemaining) {
        // Time has changed, animate the transition
        Animated.sequence([
          Animated.parallel([
            Animated.timing(textOpacity, {
              toValue: 0.3,
              duration: 100,
              useNativeDriver: true,
              easing: Easing.out(Easing.ease)
            }),
            Animated.timing(textScale, {
              toValue: 0.85,
              duration: 100,
              useNativeDriver: true,
              easing: Easing.out(Easing.ease)
            })
          ]),
          Animated.parallel([
            Animated.timing(textOpacity, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
              easing: Easing.in(Easing.ease)
            }),
            Animated.timing(textScale, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
              easing: Easing.in(Easing.bounce)
            })
          ])
        ]).start();
        
        setPrevTime(timeRemaining);
      }
    }, [timeRemaining, prevTime, textOpacity, textScale]);
    
    // Determine color based on progress
    const progressInterpolatedColor = progress.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [color, color, color] // Currently using a single color, but could transition
    });
    
    // Calculate stroke dash offset based on progress with safeguards
    const strokeDashoffset = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [circumference, 0],
      extrapolate: 'clamp' // Prevent values outside the range
    });
    
    return (
      <View style={[styles.circularTimerContainer, { width: diameter, height: diameter }]}>
        <Svg width={diameter} height={diameter}>
          {/* Background Circle */}
          <Circle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke={isDark ? 'rgba(255,255,255,0.15)' : backgroundColor}
            fill="transparent"
          />
          {/* Progress Circle */}
          <AnimatedCircle
            cx={diameter / 2}
            cy={diameter / 2}
            r={radius}
            strokeWidth={strokeWidth}
            stroke={progressInterpolatedColor}
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={strokeDashoffset}
            rotation="-90"
            origin={`${diameter/2}, ${diameter/2}`}
          />
        </Svg>
        <View style={styles.circularTimerTextContainer}>
          <Animated.Text 
            style={[
              styles.circularTimerText, 
              { 
                color: isDark ? 'white' : textColor,
                opacity: textOpacity,
                transform: [{ scale: textScale }]
              }
            ]}
          >
            {formatTime(timeRemaining)}
          </Animated.Text>
          <Text style={[styles.circularTimerLabel, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.5)' }]}>
            sec
          </Text>
        </View>
      </View>
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
            progress={progressAnim}
            timeRemaining={displayedTime}
            diameter={125}
            strokeWidth={8}
            color={isDark ? theme.accent : '#4CAF50'}
            backgroundColor={isDark ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
            textColor={isDark ? theme.text : '#333'}
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

  // Render rest period
  const renderRestPeriod = () => {
    return (
      <View style={[styles.restContainer, { backgroundColor: isDark ? theme.cardBackground : '#f5f5f5' }]}>
        <View style={styles.restIconContainer}>
          <Ionicons name="time-outline" size={70} color={isDark ? theme.accent : '#4CAF50'} />
        </View>
        <Text style={[styles.restTitle, { color: isDark ? theme.text : '#333' }]}>
          {stretch.name || 'Rest Period'}
        </Text>
        <Text style={[styles.restDescription, { color: isDark ? theme.textSecondary : '#666' }]}>
          {stretch.description || 'Take a short break before continuing'}
        </Text>
        <View style={styles.timerContainer}>
          <CircularTimer
            progress={progressAnim}
            timeRemaining={displayedTime}
            diameter={110}
            strokeWidth={8}
            color={isDark ? theme.accent : '#4CAF50'}
            backgroundColor={isDark ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
            textColor={isDark ? theme.text : '#333'}
            isDark={isDark}
          />
        </View>
      </View>
    );
  };

  // Add this function to parse description text into structured steps
  const parseStretchInstructions = (description: string) => {
    if (!description) return { type: 'simple', instructions: ['No description available'] };
    
    // Split by periods, clean up, and filter empty items
    const sentences = description
      .split('.')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    
    // If it's just 1-2 sentences, use a simple format
    if (sentences.length <= 2) {
      return {
        type: 'simple',
        instructions: sentences
      };
    }
    
    // Keywords that might indicate form cues/tips
    const cueKeywords = ['keep', 'ensure', 'maintain', 'remember', 'avoid', 'don\'t', 'make sure', 'focus'];
    
    // Keywords that might indicate setup steps
    const setupKeywords = ['start', 'begin', 'position', 'place', 'stand', 'sit', 'lie'];
    
    // Categorize each sentence
    const setup: string[] = [];
    const execution: string[] = [];
    const cues: string[] = [];
    
    sentences.forEach(sentence => {
      const lowerSentence = sentence.toLowerCase();
      
      // Check if it's a setup instruction
      if (setup.length < 2 && setupKeywords.some(keyword => lowerSentence.includes(keyword))) {
        setup.push(sentence);
      }
      // Check if it's a form cue
      else if (cueKeywords.some(keyword => lowerSentence.includes(keyword))) {
        cues.push(sentence);
      }
      // Otherwise it's an execution step
      else {
        execution.push(sentence);
      }
    });
    
    // If nothing was categorized as setup, take the first sentence as setup
    if (setup.length === 0 && execution.length > 1) {
      setup.push(execution.shift()!);
    }
    
    return {
      type: 'structured',
      setup,
      execution,
      cues
    };
  };

  // Add this new component for formatted instructions
  const StructuredInstructions: React.FC<{
    description: string;
    isDark: boolean;
    theme: any;
  }> = ({ description, isDark, theme }) => {
    const parsedInstructions = parseStretchInstructions(description);
    
    if (parsedInstructions.type === 'simple') {
      return (
        <View style={styles.simpleInstructionsContainer}>
          <View style={styles.instructionHeader}>
            <Ionicons name="information-circle-outline" size={18} color={isDark ? theme.accent : '#4CAF50'} />
            <Text style={[styles.instructionHeaderText, { color: isDark ? theme.accent : '#4CAF50' }]}>
              Instructions
            </Text>
          </View>
          {parsedInstructions.instructions.map((instruction, index) => (
            <View key={index} style={styles.simpleInstructionItem}>
              <View style={[styles.instructionDot, { backgroundColor: isDark ? theme.accent : '#4CAF50' }]} />
              <Text style={[styles.simpleInstructionText, { color: isDark ? theme.text : '#333' }]}>
                {instruction}
              </Text>
            </View>
          ))}
        </View>
      );
    }
    
    return (
      <View style={styles.structuredInstructionsContainer}>
        {/* Setup section */}
        {parsedInstructions.setup.length > 0 && (
          <View style={styles.instructionSection}>
            <View style={styles.instructionHeader}>
              <Ionicons name="body-outline" size={18} color={isDark ? theme.accent : '#4CAF50'} />
              <Text style={[styles.instructionHeaderText, { color: isDark ? theme.accent : '#4CAF50' }]}>
                Starting Position
              </Text>
            </View>
            
            {parsedInstructions.setup.map((step, index) => (
              <View key={`setup-${index}`} style={styles.instructionStep}>
                <View style={[styles.stepNumberCircle, { backgroundColor: isDark ? theme.accent : '#4CAF50' }]}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: isDark ? theme.text : '#333' }]}>
                  {step}
                </Text>
              </View>
            ))}
          </View>
        )}
        
        {/* Execution section */}
        <View style={styles.instructionSection}>
          <View style={styles.instructionHeader}>
            <Ionicons name="fitness-outline" size={18} color={isDark ? theme.accent : '#4CAF50'} />
            <Text style={[styles.instructionHeaderText, { color: isDark ? theme.accent : '#4CAF50' }]}>
              {parsedInstructions.setup.length > 0 ? 'Movement' : 'Instructions'}
            </Text>
          </View>
          
          {parsedInstructions.execution.map((step, index) => (
            <View key={`exec-${index}`} style={styles.instructionStep}>
              <View style={[styles.stepNumberCircle, { 
                backgroundColor: isDark ? 
                  (parsedInstructions.setup.length > 0 ? 'rgba(255,255,255,0.2)' : theme.accent) : 
                  (parsedInstructions.setup.length > 0 ? '#E0E0E0' : '#4CAF50') 
              }]}>
                <Text style={[
                  styles.stepNumberText,
                  parsedInstructions.setup.length > 0 && { color: isDark ? 'white' : '#666' }
                ]}>
                  {parsedInstructions.setup.length + index + 1}
                </Text>
              </View>
              <Text style={[styles.stepText, { color: isDark ? theme.text : '#333' }]}>
                {step}
              </Text>
            </View>
          ))}
        </View>
        
        {/* Form cues section */}
        {parsedInstructions.cues.length > 0 && (
          <View style={[styles.cuesContainer, { 
            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(76, 175, 80, 0.05)'
          }]}>
            <View style={styles.instructionHeader}>
              <Ionicons name="alert-circle-outline" size={18} color={isDark ? theme.accent : '#4CAF50'} />
              <Text style={[styles.instructionHeaderText, { color: isDark ? theme.accent : '#4CAF50' }]}>
                Form Tips
              </Text>
            </View>
            
            {parsedInstructions.cues.map((cue, index) => (
              <View key={`cue-${index}`} style={styles.cueBulletPoint}>
                <View style={[styles.cueBullet, { backgroundColor: isDark ? theme.accent : '#4CAF50' }]} />
                <Text style={[styles.cueText, { color: isDark ? theme.textSecondary : '#555' }]}>
                  {cue}
                </Text>
              </View>
            ))}
          </View>
        )}
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

  return (
    <View style={[styles.container, { backgroundColor: isDark ? theme.background : '#FFF' }]}>
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }]
          }
        ]}
      >
        {viewMode === 'demo' ? renderDemoView() : renderStretchInstructionsView()}
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    margin: 16,
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
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  restDescription: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 26,
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
});

export default StretchFlowView; 