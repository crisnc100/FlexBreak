import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import DemoVideoPlayer from './DemoVideoPlayer';
import * as soundEffects from '../../utils/soundEffects';
import { Stretch, RestPeriod } from '../../types';
import { NavigationButtons } from './utils';

const { width, height } = Dimensions.get('window');

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

const StretchFlowView: React.FC<StretchFlowViewProps> = ({
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
  const [viewMode, setViewMode] = useState<'demo' | 'stretch' | 'rest'>('demo');
  const [hasDemoBeenWatched, setHasDemoBeenWatched] = useState(false);
  const [previousStretch, setPreviousStretch] = useState<Stretch | null>(null);
  const [timerForceUpdate, setTimerForceUpdate] = useState(Date.now());
  const [demoVideoStatus, setDemoVideoStatus] = useState<'not-started' | 'playing' | 'completed'>('not-started');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayedTime, setDisplayedTime] = useState(timeRemaining);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Update displayed time whenever timeRemaining changes
  useEffect(() => {
    setDisplayedTime(timeRemaining);
  }, [timeRemaining]);
  
  // Is this a rest or a stretch?
  const isRest = 'isRest' in stretch;
  const isPremium = !isRest && (stretch as any).isPremium;
  const hasDemo = !isRest && 'hasDemo' in stretch && (stretch as Stretch).hasDemo;
  
  // Determine if this stretch has tips
  const hasTips = !isRest && 'tips' in stretch && (stretch as any).tips && (stretch as any).tips.length > 0;
  
  // When stretch changes or on first load, show demo first if available
  useEffect(() => {
    if (isRest) {
      // Rest periods don't have demos, go straight to stretch view
      animateViewTransition('stretch', false);
    } else if (hasDemo && !hasDemoBeenWatched) {
      // Has demo and hasn't been watched yet, show demo
      animateViewTransition('demo', false);
      
      // Pause timer during demo
      if (!isPaused) {
        onTogglePause();
      }
    } else {
      // No demo or already watched, go to stretch
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
      // Start the timer with full duration for this stretch
      if (startTimer && currentStretch) {
        startTimer(currentStretch.duration);
      }
    }
  }, [demoVideoStatus, isPlaying, currentStretch, startTimer]);
  
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
      
      // Always start the timer when transitioning from demo to stretch
      if (isPaused) {
        // Small delay to allow animation to complete
        setTimeout(() => {
          onTogglePause(); // Resume timer
        }, 400);
      }
      
      // Force timer text to update by re-rendering
      // This fixes the issue where timer stays static after watching demo
      const currentTime = timeRemaining;
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
        onTogglePause();
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
          <View style={styles.timerBarContainer}>
            <Animated.View 
              style={[
                styles.progressTrack, 
                { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#E0E0E0' }
              ]}
            >
              <Animated.View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: isDark ? theme.accent : '#4CAF50',
                    width: progressAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    })
                  }
                ]} 
              />
            </Animated.View>
            <Text 
              style={[styles.secondsText, { color: isDark ? theme.textSecondary : '#666' }]}
            >
              {formatTimeSeconds(displayedTime)}
            </Text>
          </View>
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
        
        {/* Video player section */}
        <View style={styles.demoVideoContainer}>
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
        
        {/* Footer with ready button */}
        <View style={styles.demoFooter}>
          <Text style={[styles.demoInstructions, { color: isDark ? theme.textSecondary : '#666' }]}>
            Watch the demo to learn how to perform this stretch correctly
          </Text>
          
          <TouchableOpacity
            style={[styles.readyButton, { backgroundColor: isDark ? theme.accent : '#4CAF50' }]}
            onPress={handleReadyToStretch}
          >
            <Text style={styles.readyButtonText}>Ready to Stretch</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
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
        {/* Header with title and timer */}
        <View style={styles.stretchHeader}>
          <Text style={[styles.stretchName, { color: isDark ? theme.text : '#333' }]}>
            {stretchObj.name || 'Stretch'}
          </Text>
          
          <View style={styles.timerContainer}>
            <View style={styles.timerBarContainer}>
              <Animated.View 
                style={[
                  styles.progressTrack, 
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : '#E0E0E0' }
                ]}
              >
                <Animated.View 
                  style={[
                    styles.progressFill, 
                    { 
                      backgroundColor: isDark ? theme.accent : '#4CAF50',
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%']
                      })
                    }
                  ]} 
                />
              </Animated.View>
              <Text 
                style={[styles.secondsText, { color: isDark ? theme.textSecondary : '#666' }]}
              >
                {formatTimeSeconds(displayedTime)}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Badges */}
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
              style={[styles.badgeItem, { backgroundColor: '#FF5722' }]}
              onPress={handleWatchDemo}
            >
              <Ionicons name="videocam" size={16} color="#FFF" />
              <Text style={styles.badgeText}>Watch Demo</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Image section */}
        <View style={[
          styles.imageContainer,
          { 
            backgroundColor: isDark ? theme.cardBackground : '#FFF',
            borderColor: isPremium ? ((stretch as any).vipBadgeColor || '#FFD700') : (isDark ? theme.border : '#DDD')
          }
        ]}>
          <Image 
            source={stretchObj.image}
            style={styles.stretchImage}
            resizeMode="contain"
            defaultSource={{uri: `https://via.placeholder.com/350x350/FF9800/FFFFFF?text=${encodeURIComponent(stretchObj.name || 'Stretch')}`}}
          />
        </View>
        
        {/* Description */}
        <Text style={[styles.stretchDescription, { color: isDark ? theme.textSecondary : '#666' }]}>
          {stretchObj.description || 'No description available'}
        </Text>
        
        {/* Tips section */}
        {hasTips && (
          <View style={[
            styles.tipsContainer,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' }
          ]}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb" size={20} color={isDark ? theme.accent : '#4CAF50'} />
              <Text style={[styles.tipsTitle, { color: isDark ? theme.accent : '#4CAF50' }]}>
                Stretching Tips:
              </Text>
            </View>
            {tips.map((tip: string, index: number) => (
              <Text key={index} style={[styles.tipText, { color: isDark ? theme.text : '#333' }]}>
                • {tip}
              </Text>
            ))}
          </View>
        )}
      </Animated.View>
    );
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
      
      {/* Use NavigationButtons at the bottom only for stretch view */}
      {viewMode === 'stretch' && (
        <NavigationButtons
          onPrevious={onPrevious}
          onNext={onNext}
          onTogglePause={onTogglePause}
          isPaused={isPaused}
          isPreviousDisabled={currentIndex === 0}
          isLastStretch={currentIndex === totalCount - 1}
        />
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
    backgroundColor: '#000',
  },
  demoFooter: {
    padding: 16,
    alignItems: 'center',
  },
  demoInstructions: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  readyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    width: '80%',
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
  },
  stretchHeader: {
    marginBottom: 8,
    alignItems: 'center',
  },
  stretchName: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  timerContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 8,
  },
  timerBarContainer: {
    width: '80%',
    position: 'relative',
  },
  progressTrack: {
    height: 4,
    width: '100%',
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  secondsText: {
    fontSize: 14,
    alignSelf: 'flex-end',
    marginTop: 2,
    fontWeight: '600',
  },
  badgeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
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
  }
});

export default StretchFlowView; 