import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as soundEffects from '../../utils/soundEffects';
import NetInfo from '@react-native-community/netinfo';

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
  // State updates counter to prevent excessive re-renders
  const stateUpdateCounterRef = useRef(0);
  
  // Network state
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [networkError, setNetworkError] = useState<boolean>(false);
  
  // Video state
  const [isVideoPaused, setIsVideoPaused] = useState(!autoPlay);
  const isVideoPausedRef = useRef(!autoPlay);
  const [isMuted, setIsMuted] = useState(initialMuted);
  const [isLoading, setIsLoading] = useState(true);
  const isLoadingRef = useRef(true);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const isAudioReadyRef = useRef(false);
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
  
  // Keep refs in sync with state
  useEffect(() => {
    isVideoPausedRef.current = isVideoPaused;
  }, [isVideoPaused]);
  
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);
  
  useEffect(() => {
    isAudioReadyRef.current = isAudioReady;
  }, [isAudioReady]);
  
  // Check network connectivity on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const netInfo = await NetInfo.fetch();
        setIsConnected(netInfo.isConnected);
        
        if (!netInfo.isConnected && isRemoteSource(videoSource)) {
          setNetworkError(true);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error checking network:', error);
        setIsConnected(false);
      }
    };
    
    checkConnection();
    
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      
      if (!state.isConnected && isRemoteSource(videoSource)) {
        setNetworkError(true);
        setIsLoading(false);
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [videoSource]);
  
  // Helper to check if a source is a remote URL
  const isRemoteSource = (source: any): boolean => {
    if (typeof source === 'string') {
      return source.startsWith('http://') || source.startsWith('https://');
    } else if (source && typeof source === 'object' && source.uri) {
      return source.uri.startsWith('http://') || source.uri.startsWith('https://');
    }
    return false;
  };
  
  // Format source for Video component
  const formatVideoSource = (source: any) => {
    try {
      if (typeof source === 'string') {
        // Handle string URLs directly
        return { uri: source };
      } else if (source && typeof source === 'object') {
        if ('uri' in source) {
          // Handle {uri: 'path'} objects
          return source;
        } else if ('__packager_asset' in source || source.constructor === Number) {
          // Handle require() based assets
          return source;
        } else if ('__video' in source) {
          // Handle special video marker objects
          return 'uri' in source ? source : { uri: source.__video };
        }
      }
      
      // If we get here, it's an unknown source type
      console.warn('Unknown video source type:', typeof source, source);
      throw new Error(`Invalid video source: ${typeof source}`);
    } catch (error) {
      console.error('Error formatting video source:', error);
      // Return a placeholder or null
      return null;
    }
  };
  
  // Format source for Audio component
  const formatAudioSource = (source: any) => {
    try {
      if (typeof source === 'string') {
        // Handle string URLs directly
        return { uri: source };
      } else if (source && typeof source === 'object') {
        if ('uri' in source) {
          // Handle {uri: 'path'} objects
          return source;
        } else if ('__packager_asset' in source || source.constructor === Number) {
          // Handle require() based assets
          return source;
        } else if ('__audio' in source) {
          // Handle special audio marker objects
          return 'uri' in source ? source : { uri: source.__audio };
        }
      }
      
      // If we get here, it's an unknown source type
      console.warn('Unknown audio source type:', typeof source);
      throw new Error(`Invalid audio source: ${typeof source}`);
    } catch (error) {
      console.error('Error formatting audio source:', error);
      // Return a placeholder or null
      return null;
    }
  };
  
  // Initialize audio if provided and fade in the player when ready
  useEffect(() => {
    const setupAudio = async () => {
      if (!audioSource || soundRef.current) {
        setIsAudioReady(true);
        isAudioReadyRef.current = true;
        return;
      }
      
      if (audioSource && (!isRemoteSource(audioSource) || isConnected)) {
        try {
          // Create sound object and load the audio
          const formattedAudioSource = formatAudioSource(audioSource);
          const { sound } = await Audio.Sound.createAsync(
            formattedAudioSource,
            { shouldPlay: false },
            onAudioStatusUpdate
          );
          
          soundRef.current = sound;
          
          // Set initial muted state
          await sound.setIsMutedAsync(isMuted);
          
          // Mark audio as ready
          setIsAudioReady(true);
          isAudioReadyRef.current = true;
          
          // If video is already playing and not loading, start audio too
          if (!isVideoPausedRef.current && !isLoadingRef.current) {
            // Add a small delay to ensure smoother sync
            setTimeout(async () => {
              try {
                if (soundRef.current && !isVideoPausedRef.current) {
                  await soundRef.current.playAsync();
                }
              } catch (error) {
                console.error('Error playing audio:', error);
              }
            }, 100);
          }
        } catch (error) {
          console.error('Error loading audio:', error);
          // Mark audio as ready even on error to prevent waiting indefinitely
          setIsAudioReady(true);
          isAudioReadyRef.current = true;
        }
      } else {
        // No audio to load, so mark as ready
        setIsAudioReady(true);
        isAudioReadyRef.current = true;
      }
    };
    
    setupAudio();
    
    // Clean up on unmount
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = null;
      }
    };
  }, [audioSource, isConnected, isMuted]);
  
  // Fade in the UI when ready
  useEffect(() => {
    if (!isLoading && (isAudioReady || !audioSource)) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500, // 500ms fade-in
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading, isAudioReady, audioSource, fadeAnim]);
  
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
      controlsTimeoutRef.current = null;
    }
    
    // Reset the fade animation
    controlsFadeAnim.setValue(1);
    
    // Hide controls after 1.5 seconds, but only if video is playing
    if (!isVideoPausedRef.current) {
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
        controlsTimeoutRef.current = null;
      }
    } else {
      // Show controls if they're hidden
      showControlsTemporarily();
    }
  };
  
  // Handle video playback status updates
  const handleVideoStatusUpdate = async (status: AVPlaybackStatus) => {
    // Check if video has just loaded
    if ('isLoaded' in status && status.isLoaded) {
      if (isLoadingRef.current) {
        setIsLoading(false);
        isLoadingRef.current = false;
      }
      
      // Update pause state only if it changed to avoid circular updates
      if (status.isPlaying !== !isVideoPausedRef.current) {
        setIsVideoPaused(!status.isPlaying);
        isVideoPausedRef.current = !status.isPlaying;
      }
      
      // Update position and duration
      if (status.positionMillis !== undefined && status.durationMillis !== undefined) {
        // Only update if there's a significant change to reduce state updates
        if (Math.abs(status.positionMillis - videoPosition) > 500) {
          setVideoPosition(status.positionMillis);
        }
        
        if (videoDuration === 0 && status.durationMillis > 0) {
          setVideoDuration(status.durationMillis);
        }
      }
      
      // Handle video completion
      if (status.didJustFinish) {
        // Video finished playing
        if (soundRef.current) {
          try {
            const soundStatus = await soundRef.current.getStatusAsync();
            if ('isLoaded' in soundStatus && soundStatus.isLoaded) {
              await soundRef.current.stopAsync();
            }
          } catch (error) {
            console.error('Error stopping audio after video end:', error);
          }
        }
        
        setIsVideoPaused(true);
        isVideoPausedRef.current = true;
        
        // Call onVideoEnd callback if provided
        if (onVideoEnd) {
          onVideoEnd();
        }
      } else if ('isPlaying' in status) {
        // Sync audio with video play/pause status - only if state changes
        if (soundRef.current && isAudioReadyRef.current) {
          try {
            const soundStatus = await soundRef.current.getStatusAsync();
            if ('isLoaded' in soundStatus && soundStatus.isLoaded) {
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
    } else if ('error' in status) {
      console.error('Video playback error:', status.error);
      setIsLoading(false);
      isLoadingRef.current = false;
      setNetworkError(true);
    }
  };
  
  // Play/pause the demo video and audio
  const handlePlayPause = async () => {
    if (!videoRef.current || isLoadingRef.current || networkError) return;
    
    try {
      soundEffects.playClickSound();
      const status = await videoRef.current.getStatusAsync();
      
      // Check if status is a success status with isPlaying property
      const isCurrentlyPlaying = 'isLoaded' in status && status.isLoaded && 'isPlaying' in status && status.isPlaying;
      
      if (isCurrentlyPlaying) {
        // Pause the video
        await videoRef.current.pauseAsync();
        
        // Pause the audio if it's loaded
        if (soundRef.current && isAudioReadyRef.current) {
          try {
            const soundStatus = await soundRef.current.getStatusAsync();
            if ('isLoaded' in soundStatus && soundStatus.isLoaded) {
              await soundRef.current.pauseAsync();
            }
          } catch (error) {
            console.error('Error pausing audio:', error);
          }
        }
        
        // Keep controls visible when paused
        setControlsVisible(true);
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
          controlsTimeoutRef.current = null;
        }
      } else {
        // Play the video
        await videoRef.current.playAsync();
        
        // Play the audio if it's loaded
        if (soundRef.current && isAudioReadyRef.current) {
          try {
            const soundStatus = await soundRef.current.getStatusAsync();
            if ('isLoaded' in soundStatus && soundStatus.isLoaded) {
              // Add a small delay to ensure smoother sync
              setTimeout(async () => {
                try {
                  if (soundRef.current) {
                    await soundRef.current.playAsync();
                  }
                } catch (error) {
                  console.error('Error playing audio:', error);
                }
              }, 50);
            }
          } catch (error) {
            console.error('Error checking audio status:', error);
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
    if (!videoRef.current || isLoadingRef.current || networkError) return;
    
    try {
      soundEffects.playClickSound();
      const status = await videoRef.current.getStatusAsync();
      
      if ('isLoaded' in status && status.isLoaded) {
        const newPosition = Math.min(status.positionMillis + 10000, status.durationMillis);
        await videoRef.current.setPositionAsync(newPosition);
        setVideoPosition(newPosition);
        
        // If there's audio, seek it as well
        if (soundRef.current && isAudioReadyRef.current) {
          try {
            const soundStatus = await soundRef.current.getStatusAsync();
            if ('isLoaded' in soundStatus && soundStatus.isLoaded) {
              await soundRef.current.setPositionAsync(newPosition);
            }
          } catch (error) {
            console.error('Error seeking audio forward:', error);
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
    if (!videoRef.current || isLoadingRef.current || networkError) return;
    
    try {
      soundEffects.playClickSound();
      const status = await videoRef.current.getStatusAsync();
      
      if ('isLoaded' in status && status.isLoaded) {
        const newPosition = Math.max(status.positionMillis - 10000, 0);
        await videoRef.current.setPositionAsync(newPosition);
        setVideoPosition(newPosition);
        
        // If there's audio, seek it as well
        if (soundRef.current && isAudioReadyRef.current) {
          try {
            const soundStatus = await soundRef.current.getStatusAsync();
            if ('isLoaded' in soundStatus && soundStatus.isLoaded) {
              await soundRef.current.setPositionAsync(newPosition);
            }
          } catch (error) {
            console.error('Error seeking audio backward:', error);
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
        controlsTimeoutRef.current = null;
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
      
      if (soundRef.current && isAudioReadyRef.current) {
        // Check if sound is loaded before attempting to mute
        try {
          const status = await soundRef.current.getStatusAsync();
          if ('isLoaded' in status && status.isLoaded) {
            await soundRef.current.setIsMutedAsync(newMutedState);
          }
        } catch (error) {
          console.error('Error toggling audio mute:', error);
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
      
      {/* Network error indicator */}
      {networkError && (
        <View style={styles.networkErrorContainer}>
          <Ionicons name="cloud-offline" size={50} color="#FFFFFF" />
          <Text style={styles.networkErrorText}>
            No internet connection.{'\n'}
            Demo videos require an internet connection.
          </Text>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={onClose}
          >
            <Ionicons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Video player with fade-in animation */}
      {!networkError && (
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
              source={formatVideoSource(videoSource)}
              style={[styles.video, isFullscreen && styles.fullscreenVideoElement]}
              resizeMode={isFullscreen ? ResizeMode.COVER : ResizeMode.CONTAIN}
              shouldPlay={autoPlay}
              isLooping={false}
              isMuted={isMuted}
              onPlaybackStatusUpdate={handleVideoStatusUpdate}
              useNativeControls={false}
              progressUpdateIntervalMillis={250} // Less frequent updates to reduce potential re-renders
              positionMillis={0}
              onError={(error) => {
                console.error('Video playback error:', error);
                setNetworkError(true);
                setIsLoading(false);
                isLoadingRef.current = false;
              }}
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
      )}
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
  networkErrorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    zIndex: 20,
    padding: 20,
  },
  networkErrorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
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