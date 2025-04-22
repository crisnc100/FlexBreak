import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as soundEffects from '../../utils/soundEffects';

const { width, height } = Dimensions.get('window');

export interface DemoVideoPlayerProps {
  videoSource: any;
  audioSource?: any;
  onClose: () => void;
  autoPlay?: boolean;
  initialMuted?: boolean;
  onVideoEnd?: () => void;
}

const DemoVideoPlayer: React.FC<DemoVideoPlayerProps> = ({
  videoSource,
  audioSource,
  onClose,
  autoPlay = false,
  initialMuted = false,
  onVideoEnd
}) => {
  // Video state
  const [isVideoPaused, setIsVideoPaused] = useState(!autoPlay);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isLoading, setIsLoading] = useState(true);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [videoPosition, setVideoPosition] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const controlsFadeAnim = useRef(new Animated.Value(1)).current;
  
  // Refs
  const videoRef = useRef<Video>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize audio if provided and fade in the player when ready
  useEffect(() => {
    const setupAudio = async () => {
      if (audioSource) {
        try {
          // Create sound object and load the audio
          const { sound } = await Audio.Sound.createAsync(
            audioSource,
            { shouldPlay: false },
            onAudioStatusUpdate
          );
          
          soundRef.current = sound;
          
          // Set initial muted state
          await sound.setIsMutedAsync(isMuted);
          
          // Mark audio as ready
          setIsAudioReady(true);
          
          // If video is already playing and not loading, start audio too
          if (!isVideoPaused && !isLoading) {
            // Add a small delay to ensure smoother sync
            setTimeout(async () => {
              try {
                await sound.playAsync();
              } catch (error) {
                console.error('Error playing audio:', error);
              }
            }, 100);
          }
        } catch (error) {
          console.error('Error loading audio:', error);
          // Mark audio as ready even on error to prevent waiting indefinitely
          setIsAudioReady(true);
        }
      } else {
        // No audio to load, so mark as ready
        setIsAudioReady(true);
      }
    };
    
    setupAudio();
    
    // Clean up on unmount
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [audioSource]);
  
  // Fade in the UI when ready
  useEffect(() => {
    if (!isLoading && (isAudioReady || !audioSource)) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500, // 500ms fade-in
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading, isAudioReady, audioSource]);
  
  // Handle audio status updates
  const onAudioStatusUpdate = (status: AVPlaybackStatus) => {
    // You can add additional handling for audio status if needed
    if ('isLoaded' in status && status.isLoaded && status.didJustFinish) {
      // Audio finished playing
    }
  };
  
  // Show controls temporarily
  const showControlsTemporarily = () => {
    setControlsVisible(true);
    
    // Clear any existing timeout
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    // Reset the fade animation
    controlsFadeAnim.setValue(1);
    
    // Hide controls after 1.5 seconds, but only if video is playing
    if (!isVideoPaused) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 1500); // Reduced from 3000ms to 1500ms for faster hiding
    }
  };
  
  // Handle tapping the video container
  const handleVideoContainerTap = () => {
    if (controlsVisible) {
      // Hide controls if they're visible
      setControlsVisible(false);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      // Show controls if they're hidden
      showControlsTemporarily();
    }
  };
  
  // Handle video playback status updates
  const handleVideoStatusUpdate = async (status: AVPlaybackStatus) => {
    // Check if video has just loaded
    if (status.isLoaded) {
      if (isLoading && status.isLoaded) {
        setIsLoading(false);
      }
      
      // Update pause state
      setIsVideoPaused(!status.isPlaying);
      
      // Update position and duration
      if (status.positionMillis !== undefined && status.durationMillis !== undefined) {
        setVideoPosition(status.positionMillis);
        setVideoDuration(status.durationMillis);
      }
      
      // Handle video completion
      if (status.didJustFinish) {
        // Video finished playing
        if (soundRef.current) {
          const soundStatus = await soundRef.current.getStatusAsync();
          if (soundStatus.isLoaded) {
            await soundRef.current.stopAsync();
          }
        }
        
        setIsVideoPaused(true);
        
        // Call onVideoEnd callback if provided
        if (onVideoEnd) {
          onVideoEnd();
        }
      } else if ('isPlaying' in status) {
        // Sync audio with video play/pause status
        if (soundRef.current && isAudioReady) {
          try {
            const soundStatus = await soundRef.current.getStatusAsync();
            if (soundStatus.isLoaded) {
              if (status.isPlaying && !soundStatus.isPlaying) {
                await soundRef.current.playAsync();
              } else if (!status.isPlaying && soundStatus.isPlaying) {
                await soundRef.current.pauseAsync();
              }
            }
          } catch (error) {
            console.error('Error syncing audio:', error);
          }
        }
      }
    }
  };
  
  // Play/pause the demo video and audio
  const handlePlayPause = async () => {
    if (!videoRef.current || isLoading) return;
    
    try {
      soundEffects.playClickSound();
      const status = await videoRef.current.getStatusAsync();
      
      // Check if status is a success status with isPlaying property
      const isCurrentlyPlaying = status.isLoaded && 'isPlaying' in status && status.isPlaying;
      
      if (isCurrentlyPlaying) {
        // Pause the video
        await videoRef.current.pauseAsync();
        
        // Pause the audio if it's loaded
        if (soundRef.current && isAudioReady) {
          const soundStatus = await soundRef.current.getStatusAsync();
          if (soundStatus.isLoaded) {
            await soundRef.current.pauseAsync();
          }
        }
        
        // Keep controls visible when paused
        setControlsVisible(true);
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
      } else {
        // Play the video
        await videoRef.current.playAsync();
        
        // Play the audio if it's loaded
        if (soundRef.current && isAudioReady) {
          const soundStatus = await soundRef.current.getStatusAsync();
          if (soundStatus.isLoaded) {
            // Add a small delay to ensure smoother sync
            setTimeout(async () => {
              try {
                await soundRef.current?.playAsync();
              } catch (error) {
                console.error('Error playing audio:', error);
              }
            }, 50);
          }
        }
        
        // Hide controls after a delay
        showControlsTemporarily();
      }
    } catch (error) {
      console.error('Error toggling video playback:', error);
    }
  };
  
  // Handle skipping forward 10 seconds
  const handleSkipForward = async () => {
    if (!videoRef.current || isLoading) return;
    
    try {
      soundEffects.playClickSound();
      const status = await videoRef.current.getStatusAsync();
      
      if (status.isLoaded) {
        const newPosition = Math.min(status.positionMillis + 10000, status.durationMillis);
        await videoRef.current.setPositionAsync(newPosition);
        
        // If there's audio, seek it as well
        if (soundRef.current && isAudioReady) {
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
  
  // Handle skipping backward 10 seconds
  const handleSkipBackward = async () => {
    if (!videoRef.current || isLoading) return;
    
    try {
      soundEffects.playClickSound();
      const status = await videoRef.current.getStatusAsync();
      
      if (status.isLoaded) {
        const newPosition = Math.max(status.positionMillis - 10000, 0);
        await videoRef.current.setPositionAsync(newPosition);
        
        // If there's audio, seek it as well
        if (soundRef.current && isAudioReady) {
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
  
  // Toggle fullscreen mode
  const handleToggleFullscreen = () => {
    soundEffects.playClickSound();
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    
    // In fullscreen mode, hide controls immediately to show only the video
    if (newFullscreenState) {
      setControlsVisible(false);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    } else {
      // When exiting fullscreen, show controls briefly
      showControlsTemporarily();
    }
  };
  
  // Handle muting/unmuting audio
  const handleToggleMute = async () => {
    try {
      const newMutedState = !isMuted;
      setIsMuted(newMutedState);
      
      if (videoRef.current) {
        await videoRef.current.setIsMutedAsync(newMutedState);
      }
      
      if (soundRef.current && isAudioReady) {
        // Check if sound is loaded before attempting to mute
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          await soundRef.current.setIsMutedAsync(newMutedState);
        }
      }
      
      soundEffects.playClickSound();
      showControlsTemporarily();
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };
  
  // Format milliseconds to mm:ss
  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  return (
    <View style={[styles.container, isFullscreen && styles.fullscreenContainer]}>
      {/* Loading indicator */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
      
      {/* Video player with fade-in animation */}
      <Animated.View 
        style={[
          styles.videoWrapper,
          { opacity: fadeAnim },
          isFullscreen && styles.fullscreenVideo
        ]}
      >
        <TouchableOpacity 
          style={styles.videoContainer}
          activeOpacity={0.9}
          onPress={handleVideoContainerTap}
          disabled={isLoading}
        >
          <Video
            ref={videoRef}
            source={videoSource}
            style={[styles.video, isFullscreen && styles.fullscreenVideoElement]}
            resizeMode={isFullscreen ? ResizeMode.COVER : ResizeMode.CONTAIN}
            shouldPlay={autoPlay}
            isLooping={false}
            isMuted={isMuted}
            onPlaybackStatusUpdate={handleVideoStatusUpdate}
            useNativeControls={false}
            progressUpdateIntervalMillis={50} // More frequent updates
            positionMillis={0}
          />
          
          {/* Video controls overlay */}
          {controlsVisible && !isLoading && (
            <Animated.View 
              style={[
                styles.controlsOverlay,
                { opacity: controlsFadeAnim }
              ]}
            >
              {/* Top row - fullscreen toggle */}
              <View style={styles.controlsRow}>
                <View style={{ flex: 1 }} />
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={handleToggleFullscreen}
                >
                  <Ionicons
                    name={isFullscreen ? "contract" : "expand"}
                    size={24}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
              
              {/* Middle row - skip backward, play/pause, skip forward */}
              <View style={styles.controlsMainRow}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={handleSkipBackward}
                >
                  <Ionicons name="play-back" size={28} color="#FFFFFF" />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.playPauseButton}
                  onPress={handlePlayPause}
                >
                  <Ionicons
                    name={isVideoPaused ? "play" : "pause"}
                    size={40}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={handleSkipForward}
                >
                  <Ionicons name="play-forward" size={28} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              
              {/* Bottom row - current time and mute toggle */}
              <View style={styles.controlsRow}>
                <View style={styles.timeContainer}>
                  {videoDuration > 0 && (
                    <Text style={styles.timeText}>
                      {formatTime(videoPosition)} / {formatTime(videoDuration)}
                    </Text>
                  )}
                </View>
                
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={handleToggleMute}
                >
                  <Ionicons
                    name={isMuted ? "volume-mute" : "volume-high"}
                    size={24}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
          
          {/* Play button overlay (only shown when paused and controls are not visible) */}
          {isVideoPaused && !isLoading && !controlsVisible && (
            <TouchableOpacity 
              style={styles.playButtonOverlay}
              onPress={handlePlayPause}
            >
              <View style={styles.playButton}>
                <Ionicons name="play" size={50} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    elevation: 10,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  videoWrapper: {
    flex: 1,
  },
  fullscreenVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  fullscreenVideoElement: {
    width: '100%',
    height: '100%',
  },
  controlsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'space-between',
    padding: 16,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  controlsMainRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 20,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  soundButtonContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    zIndex: 5,
  },
  soundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default DemoVideoPlayer; 