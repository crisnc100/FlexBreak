import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator,
  Platform,
  Image,
  Modal,
  StatusBar
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import * as soundEffects from '../../utils/soundEffects';
import NetInfo from '@react-native-community/netinfo';

const { width, height } = Dimensions.get('window');

// Define loading state constants
const LOADING_STATES = {
  INITIAL: 'initial',
  CHECKING_NETWORK: 'checking_network',
  LOADING_METADATA: 'loading_metadata',
  BUFFERING: 'buffering',
  READY: 'ready',
  ERROR: 'error'
};

// Define network strength constants
const NETWORK_STRENGTH = {
  NONE: 'none',
  WEAK: 'weak',
  MEDIUM: 'medium',
  STRONG: 'strong'
};

export interface DemoVideoPlayerProps {
  videoSource: any;
  audioSource?: any;
  onClose: () => void;
  autoPlay?: boolean;
  initialMuted?: boolean;
  onVideoEnd?: () => void;
  thumbnailSource?: any; // Add thumbnail support
}

const DemoVideoPlayer: React.FC<DemoVideoPlayerProps> = ({
  videoSource,
  audioSource,
  onClose,
  autoPlay = false,
  initialMuted = false,
  onVideoEnd,
  thumbnailSource
}) => {
  // State updates counter to prevent excessive re-renders
  const stateUpdateCounterRef = useRef(0);
  
  // Enhanced loading states
  const [loadingState, setLoadingState] = useState(LOADING_STATES.INITIAL);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [bufferingProgress, setBufferingProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [errorDetails, setErrorDetails] = useState<{code: string, message: string} | null>(null);
  
  // Network state
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [networkStrength, setNetworkStrength] = useState<string | null>(null);
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
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Add fullscreen modal state
  const [fullscreenModalVisible, setFullscreenModalVisible] = useState(false);
  const videoPositionRef = useRef(0);
  const wasPlayingBeforeFullscreen = useRef(false);
  
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
  
  // Check network connectivity on mount with enhanced detection
  useEffect(() => {
    const checkConnection = async () => {
      setLoadingState(LOADING_STATES.CHECKING_NETWORK);
      try {
        const netInfo = await NetInfo.fetch();
        setIsConnected(netInfo.isConnected);
        
        // Determine network strength
        if (!netInfo.isConnected) {
          setNetworkStrength(NETWORK_STRENGTH.NONE);
          setLoadingState(LOADING_STATES.ERROR);
          setErrorDetails({
            code: 'no_connection',
            message: 'No internet connection available. Please check your connection and try again.'
          });
          setNetworkError(true);
          setIsLoading(false);
          return;
        }
        
        // Assess connection quality
        if (netInfo.type === 'wifi' || netInfo.type === 'ethernet') {
          setNetworkStrength(NETWORK_STRENGTH.STRONG);
        } else if (netInfo.type === 'cellular') {
          // Check cellular generation (4g, 5g, etc.)
          if (netInfo.details?.cellularGeneration === '4g' || netInfo.details?.cellularGeneration === '5g') {
            setNetworkStrength(NETWORK_STRENGTH.STRONG);
          } else if (netInfo.details?.cellularGeneration === '3g') {
            setNetworkStrength(NETWORK_STRENGTH.MEDIUM);
          } else {
            setNetworkStrength(NETWORK_STRENGTH.WEAK);
          }
        } else {
          setNetworkStrength(NETWORK_STRENGTH.WEAK);
        }
        
        // Only check for remote videos
        if (isRemoteSource(videoSource)) {
          if (!netInfo.isConnected) {
            setNetworkError(true);
            setIsLoading(false);
            setLoadingState(LOADING_STATES.ERROR);
          } else {
            // Proceed to loading content
            setLoadingState(LOADING_STATES.LOADING_METADATA);
          }
        } else {
          // Local file, proceed directly
          setLoadingState(LOADING_STATES.LOADING_METADATA);
        }
      } catch (error) {
        console.error('Error checking network:', error);
        setIsConnected(false);
        setNetworkStrength(NETWORK_STRENGTH.NONE);
        setLoadingState(LOADING_STATES.ERROR);
        setErrorDetails({
          code: 'network_check_failed',
          message: 'Unable to check network status. Please ensure you have an active internet connection.'
        });
      }
    };
    
    checkConnection();
    
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      
      if (!state.isConnected && isRemoteSource(videoSource)) {
        setNetworkError(true);
        setIsLoading(false);
        setLoadingState(LOADING_STATES.ERROR);
        setErrorDetails({
          code: 'connection_lost',
          message: 'Internet connection lost. Please reconnect and try again.'
        });
      }
    });
    
    return () => {
      unsubscribe();
      // Clean up any retry attempts
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
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
  
  // Error handling with retry mechanism
  const handleLoadError = (error: any) => {
    // Determine error type and set appropriate message
    let errorCode = 'unknown_error';
    let errorMessage = 'An unknown error occurred while loading the video.';
    
    if (error) {
      if (error.code === -1100) {
        errorCode = 'file_not_found';
        errorMessage = 'The video file could not be found. Please try again later.';
      } else if (error.code === -1001) {
        errorCode = 'timeout';
        errorMessage = 'Connection timed out. Please check your internet speed.';
      } else if (error.code) {
        errorCode = `error_${error.code}`;
        errorMessage = `Playback error (${error.code}). Please try again later.`;
      }
    }
    
    setErrorDetails({ code: errorCode, message: errorMessage });
    
    // Implement retry with backoff
    if (retryCount < 3) {
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      const updatedMessage = `${errorMessage} Retrying in ${delay/1000} seconds...`;
      
      setErrorDetails({
        code: errorCode,
        message: updatedMessage
      });
      
      // Clear any existing retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      // Set new retry timeout
      retryTimeoutRef.current = setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setLoadingState(LOADING_STATES.LOADING_METADATA);
        
        // Attempt to reload the video
        if (videoRef.current) {
          videoRef.current.loadAsync(formatVideoSource(videoSource));
        }
      }, delay);
    } else {
      setLoadingState(LOADING_STATES.ERROR);
      setNetworkError(true);
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
  
  // Handle video playback status updates with enhanced buffering detection
  const handleVideoStatusUpdate = async (status: AVPlaybackStatus) => {
    // Check if video has just loaded
    if ('isLoaded' in status && status.isLoaded) {
      // Track buffering state
      if (status.isBuffering) {
        setLoadingState(LOADING_STATES.BUFFERING);
        // Calculate approximate buffering progress
        if (status.playableDurationMillis && status.durationMillis) {
          const buffered = (status.playableDurationMillis / status.durationMillis) * 100;
          setBufferingProgress(Math.min(buffered, 100));
        }
      } else if (isLoadingRef.current) {
        setIsLoading(false);
        isLoadingRef.current = false;
        setLoadingState(LOADING_STATES.READY);
      } else if (status.isPlaying && loadingState === LOADING_STATES.BUFFERING) {
        // Make sure we exit buffering state when playback actually starts
        setLoadingState(LOADING_STATES.READY);
      }
      
      // Update pause state only if it changed to avoid circular updates
      if (status.isPlaying !== !isVideoPausedRef.current) {
        setIsVideoPaused(!status.isPlaying);
        isVideoPausedRef.current = !status.isPlaying;
        
        // Reset loading state when play state changes
        if (status.isPlaying && loadingState === LOADING_STATES.BUFFERING) {
          setLoadingState(LOADING_STATES.READY);
        }
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
              // Reset audio position to beginning for replay
              await soundRef.current.setPositionAsync(0);
            }
          } catch (error) {
            console.error('Error stopping audio after video end:', error);
          }
        }
        
        setIsVideoPaused(true);
        isVideoPausedRef.current = true;
        
        // Don't automatically reset video position - allow user to restart manually
        // Instead, show the control overlay with play button for easy replay
        setControlsVisible(true);
        
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
      handleLoadError(status.error);
    }
  };
  
  // Toggle fullscreen mode
  const handleToggleFullscreen = async () => {
    soundEffects.playClickSound();
    
    if (!isFullscreen) {
      // Going fullscreen - get current video state
      if (videoRef.current) {
        try {
          const status = await videoRef.current.getStatusAsync();
          if ('isLoaded' in status && status.isLoaded) {
            // Store playback position and state for fullscreen video
            videoPositionRef.current = status.positionMillis;
            wasPlayingBeforeFullscreen.current = status.isPlaying;
            
            // Pause the current video while showing fullscreen
            if (status.isPlaying) {
              await videoRef.current.pauseAsync();
            }
            
            // Also pause audio if it exists
            if (soundRef.current && isAudioReadyRef.current) {
              const soundStatus = await soundRef.current.getStatusAsync();
              if ('isLoaded' in soundStatus && soundStatus.isLoaded && soundStatus.isPlaying) {
                await soundRef.current.pauseAsync();
              }
            }
            
            // Show fullscreen modal
            setIsFullscreen(true);
            setFullscreenModalVisible(true);
          }
        } catch (error) {
          console.error('Error checking video status for fullscreen:', error);
        }
      }
    } else {
      // Exit fullscreen
      handleExitFullscreen();
    }
  };
  
  // Exit fullscreen handler
  const handleExitFullscreen = () => {
    setIsFullscreen(false);
    setFullscreenModalVisible(false);
    soundEffects.playClickSound();
    
    // Resume main video playback if it was playing before
    if (wasPlayingBeforeFullscreen.current) {
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.playAsync().catch(error => {
            console.error('Error resuming video after fullscreen:', error);
          });
          
          // Also resume audio
          if (soundRef.current && isAudioReadyRef.current) {
            soundRef.current.playAsync().catch(error => {
              console.error('Error resuming audio after fullscreen:', error);
            });
          }
        }
      }, 300);
    }
  };
  
  // Handle play/pause button in the regular player
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
        // Check if video has ended and needs to be reset
        const videoStatus = await videoRef.current.getStatusAsync();
        if ('isLoaded' in videoStatus && videoStatus.isLoaded && 
            videoStatus.positionMillis > 0 && 
            videoStatus.positionMillis >= videoStatus.durationMillis - 200) {
          // Video has ended - reset position to beginning
          await videoRef.current.setPositionAsync(0);
          
          // Also reset audio position if available
          if (soundRef.current && isAudioReadyRef.current) {
            try {
              await soundRef.current.setPositionAsync(0);
            } catch (error) {
              console.error('Error resetting audio position:', error);
            }
          }
        }
        
        // First ensure loading state is reset when manually pressing play
        if (loadingState === LOADING_STATES.BUFFERING) {
          setLoadingState(LOADING_STATES.READY);
        }
        
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
  
  // Fullscreen specific controls
  const fullscreenVideoRef = useRef<Video>(null);
  const [fullscreenStatus, setFullscreenStatus] = useState<{
    isPlaying: boolean,
    positionMillis: number,
    durationMillis: number
  }>({
    isPlaying: false,
    positionMillis: 0,
    durationMillis: 0
  });
  
  // Handle fullscreen video status updates
  const handleFullscreenVideoStatus = (status: AVPlaybackStatus) => {
    if ('isLoaded' in status && status.isLoaded) {
      // Update fullscreen status state
      setFullscreenStatus({
        isPlaying: status.isPlaying,
        positionMillis: status.positionMillis || 0,
        durationMillis: status.durationMillis || 0
      });
      
      // Sync audio with fullscreen video status
      if (soundRef.current && isAudioReadyRef.current) {
        try {
          if (status.isPlaying) {
            // If fullscreen video is playing, make sure audio is playing too
            soundRef.current.getStatusAsync().then(soundStatus => {
              if ('isLoaded' in soundStatus && soundStatus.isLoaded) {
                if (!soundStatus.isPlaying) {
                  // If audio is not playing but video is, start audio
                  soundRef.current?.playAsync();
                }
                // Sync positions if they've drifted more than 500ms
                if (Math.abs(soundStatus.positionMillis - status.positionMillis) > 500) {
                  soundRef.current?.setPositionAsync(status.positionMillis);
                }
              }
            }).catch(error => {
              console.error('Error getting audio status in fullscreen:', error);
            });
          } else if (status.didJustFinish) {
            // If video finished, stop audio too
            soundRef.current.pauseAsync().then(() => {
              soundRef.current?.setPositionAsync(0);
            }).catch(error => {
              console.error('Error stopping audio at end in fullscreen:', error);
            });
          } else if (!status.isPlaying) {
            // If video is paused, pause audio too
            soundRef.current.pauseAsync().catch(error => {
              console.error('Error pausing audio in fullscreen:', error);
            });
          }
        } catch (error) {
          console.error('Error syncing audio with fullscreen video:', error);
        }
      }
    }
  };
  
  // Audio-video sync interval for fullscreen mode
  useEffect(() => {
    let syncInterval: NodeJS.Timeout | null = null;
    
    if (isFullscreen && fullscreenVideoRef.current && soundRef.current && isAudioReadyRef.current) {
      // Set up interval to periodically check and sync audio with fullscreen video
      syncInterval = setInterval(async () => {
        try {
          const videoStatus = await fullscreenVideoRef.current?.getStatusAsync();
          const soundStatus = await soundRef.current?.getStatusAsync();
          
          if ('isLoaded' in videoStatus && videoStatus.isLoaded && 
              'isLoaded' in soundStatus && soundStatus.isLoaded) {
            
            // Sync play/pause state
            if (videoStatus.isPlaying && !soundStatus.isPlaying) {
              await soundRef.current?.playAsync();
            } else if (!videoStatus.isPlaying && soundStatus.isPlaying) {
              await soundRef.current?.pauseAsync();
            }
            
            // Sync positions if they've drifted more than 300ms
            if (videoStatus.isPlaying && 
                Math.abs(videoStatus.positionMillis - soundStatus.positionMillis) > 300) {
              await soundRef.current?.setPositionAsync(videoStatus.positionMillis);
            }
          }
        } catch (error) {
          console.error('Error in audio-video sync interval:', error);
        }
      }, 1000);
    }
    
    return () => {
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    };
  }, [isFullscreen]);
  
  // Clean up fullscreen state when component unmounts
  useEffect(() => {
    return () => {
      // Clean up any audio and video resources
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);
  
  // Handle play/pause in fullscreen
  const handleFullscreenPlayPause = async () => {
    if (!fullscreenVideoRef.current) return;
    
    try {
      soundEffects.playClickSound();
      const status = await fullscreenVideoRef.current.getStatusAsync();
      
      if (!('isLoaded' in status) || !status.isLoaded) return;
      
      if (status.isPlaying) {
        // Currently playing - pause
        await fullscreenVideoRef.current.pauseAsync();
        
        // Also pause audio
        if (soundRef.current && isAudioReadyRef.current) {
          try {
            const soundStatus = await soundRef.current.getStatusAsync();
            if ('isLoaded' in soundStatus && soundStatus.isLoaded && soundStatus.isPlaying) {
              await soundRef.current.pauseAsync();
            }
          } catch (error) {
            console.error('Error pausing audio in fullscreen:', error);
          }
        }
        
        // Keep controls visible when paused
        setControlsVisible(true);
      } else {
        // Currently paused - play
        // Check if video is at the end
        if (status.positionMillis > 0 && 
            status.durationMillis > 0 &&
            status.positionMillis >= status.durationMillis - 200) {
          // Reset to beginning
          await fullscreenVideoRef.current.setPositionAsync(0);
          
          // Also reset audio
          if (soundRef.current && isAudioReadyRef.current) {
            try {
              await soundRef.current.setPositionAsync(0);
            } catch (error) {
              console.error('Error resetting audio position:', error);
            }
          }
        }
        
        // Play video
        await fullscreenVideoRef.current.playAsync();
        
        // Also play audio if available
        if (soundRef.current && isAudioReadyRef.current) {
          try {
            const soundStatus = await soundRef.current.getStatusAsync();
            if ('isLoaded' in soundStatus && soundStatus.isLoaded && !soundStatus.isPlaying) {
              // Sync position first
              await soundRef.current.setPositionAsync(status.positionMillis);
              // Then play
              await soundRef.current.playAsync();
            }
          } catch (error) {
            console.error('Error playing audio in fullscreen:', error);
          }
        }
        
        // Auto-hide controls after delay
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = setTimeout(() => {
          setControlsVisible(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error toggling fullscreen playback:', error);
    }
  };
  
  // Handle screen tap in fullscreen mode
  const handleFullscreenTap = () => {
    setControlsVisible(!controlsVisible);
  };
  
  // Render the fullscreen modal
  const renderFullscreenModal = () => {
    if (!fullscreenModalVisible) return null;
    
    return (
      <Modal
        animationType="fade"
        transparent={false}
        visible={fullscreenModalVisible}
        onRequestClose={handleExitFullscreen}
        supportedOrientations={['portrait', 'landscape']}
        statusBarTranslucent={true}
        onShow={() => {
          // When modal is shown, start playback if it was playing before
          if (wasPlayingBeforeFullscreen.current && fullscreenVideoRef.current) {
            setTimeout(() => {
              fullscreenVideoRef.current?.playAsync().then(() => {
                // Also play audio
                if (soundRef.current && isAudioReadyRef.current) {
                  soundRef.current.playAsync().catch(error => {
                    console.error('Error playing audio on fullscreen start:', error);
                  });
                }
              }).catch(error => {
                console.error('Error playing video on fullscreen start:', error);
              });
            }, 300);
          }
        }}
      >
        <StatusBar hidden={true} />
        <View style={styles.fullscreenContainer}>
          {/* Fullscreen video */}
          <Video
            ref={fullscreenVideoRef}
            source={formatVideoSource(videoSource)}
            style={styles.fullscreenVideo}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={wasPlayingBeforeFullscreen.current}
            isLooping={false}
            isMuted={true} // Always mute fullscreen video to avoid double audio
            positionMillis={videoPositionRef.current}
            onPlaybackStatusUpdate={handleFullscreenVideoStatus}
            progressUpdateIntervalMillis={250}
          />
          
          {/* Transparent touch layer for showing/hiding controls */}
          <TouchableOpacity 
            style={styles.fullscreenOverlay}
            activeOpacity={1}
            onPress={handleFullscreenTap}
          >
            {/* Empty overlay just for detecting taps */}
          </TouchableOpacity>
          
          {/* Controls - only shown when controlsVisible is true */}
          {controlsVisible && (
            <View style={styles.fullscreenControls}>
              {/* Exit fullscreen button */}
              <TouchableOpacity
                style={styles.exitFullscreenButton}
                onPress={handleExitFullscreen}
              >
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
              
              {/* Play/Pause button */}
              <TouchableOpacity
                style={styles.fullscreenPlayPauseButton}
                onPress={handleFullscreenPlayPause}
              >
                <Ionicons
                  name={!fullscreenStatus.isPlaying ? "play" : "pause"}
                  size={50}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
              
              {/* Volume control - only if no separate audio */}
              {!audioSource && (
                <TouchableOpacity
                  style={styles.fullscreenVolumeButton}
                  onPress={handleToggleMute}
                >
                  <Ionicons
                    name={isMuted ? "volume-mute" : "volume-high"}
                    size={24}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              )}
              
              {/* Time indicator */}
              <View style={styles.fullscreenTimeContainer}>
                <Text style={styles.fullscreenTimeText}>
                  {formatTime(fullscreenStatus.positionMillis)} / {formatTime(fullscreenStatus.durationMillis)}
                </Text>
              </View>
            </View>
          )}
        </View>
      </Modal>
    );
  };
  
  // Format milliseconds to mm:ss
  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  // Improved loading UI with state-based content
  const renderLoadingUI = () => {
    // If we're already playing, don't show the loading UI for buffering
    // This prevents the buffering screen from showing after a pause/play cycle
    if (loadingState === LOADING_STATES.BUFFERING && !isVideoPaused && !isLoading) {
      return null;
    }
    
    switch (loadingState) {
      case LOADING_STATES.CHECKING_NETWORK:
        return (
          <View style={[styles.loadingContainer, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Checking connection...</Text>
            {thumbnailSource && (
              <Image 
                source={formatVideoSource(thumbnailSource)} 
                style={styles.thumbnailImage}
                resizeMode="contain" 
              />
            )}
          </View>
        );
        
      case LOADING_STATES.LOADING_METADATA:
        return (
          <View style={[styles.loadingContainer, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Preparing video...</Text>
            {thumbnailSource && (
              <Image 
                source={formatVideoSource(thumbnailSource)} 
                style={styles.thumbnailImage} 
                resizeMode="contain"
              />
            )}
          </View>
        );
        
      case LOADING_STATES.BUFFERING:
        return (
          <View style={[styles.loadingContainer, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <View style={styles.progressContainer}>
              <View style={[styles.progressBar, {width: `${bufferingProgress}%`}]} />
            </View>
            <Text style={styles.loadingText}>
              Buffering video... {Math.round(bufferingProgress)}%
            </Text>
            {networkStrength === NETWORK_STRENGTH.WEAK && (
              <Text style={styles.networkText}>
                Slow connection detected. Video quality may be reduced.
              </Text>
            )}
            {thumbnailSource && (
              <Image 
                source={formatVideoSource(thumbnailSource)} 
                style={styles.thumbnailImage} 
                resizeMode="contain"
              />
            )}
          </View>
        );
        
      case LOADING_STATES.ERROR:
        return (
          <View style={[styles.networkErrorContainer, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
            <Ionicons name="alert-circle" size={50} color="#FFFFFF" />
            <Text style={styles.networkErrorText}>
              {errorDetails?.message || 'Error loading video'}
            </Text>
            {retryCount < 3 && (
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => {
                  setRetryCount(0);
                  setLoadingState(LOADING_STATES.LOADING_METADATA);
                  if (videoRef.current) {
                    videoRef.current.loadAsync(formatVideoSource(videoSource));
                  }
                }}
              >
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.controlButton, { marginTop: 20 }]}
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        );
        
      default:
        return (
          <View style={[styles.loadingContainer, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        );
    }
  };
  
  return (
    <View style={styles.outerContainer}>
      <View style={styles.container}>
        {/* Loading states */}
        {(isLoading || loadingState === LOADING_STATES.BUFFERING) && renderLoadingUI()}
        
        {/* Network/loading error indicator */}
        {loadingState === LOADING_STATES.ERROR && renderLoadingUI()}
        
        {/* Fullscreen modal */}
        {renderFullscreenModal()}
        
        {/* Video player with fade-in animation */}
        {loadingState !== LOADING_STATES.ERROR && (
          <Animated.View 
            style={[
              styles.videoWrapper,
              { opacity: fadeAnim }
            ]}
          >
            <TouchableOpacity 
              style={styles.videoContainer}
              activeOpacity={0.9}
              onPress={handleVideoContainerTap}
              disabled={isLoading || loadingState === LOADING_STATES.BUFFERING}
            >
              <Video
                ref={videoRef}
                source={formatVideoSource(videoSource)}
                style={styles.video}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={autoPlay}
                isLooping={false}
                isMuted={isMuted}
                onPlaybackStatusUpdate={handleVideoStatusUpdate}
                useNativeControls={false}
                progressUpdateIntervalMillis={250}
                positionMillis={0}
                onError={(error) => {
                  console.error('Video playback error:', error);
                  handleLoadError(error);
                }}
                onLoadStart={() => {
                  setLoadingState(LOADING_STATES.LOADING_METADATA);
                }}
                onLoad={() => {
                  setLoadingState(LOADING_STATES.READY);
                  setIsLoading(false);
                  isLoadingRef.current = false;
                }}
                onReadyForDisplay={() => {
                  setLoadingState(LOADING_STATES.READY);
                  setIsLoading(false);
                  isLoadingRef.current = false;
                }}
              />
              
              {/* Video controls overlay - only show when video is ready */}
              {controlsVisible && !isLoading && loadingState === LOADING_STATES.READY && (
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
                        name="expand"
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
              {isVideoPaused && !isLoading && loadingState === LOADING_STATES.READY && !controlsVisible && (
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
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    zIndex: 10,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  networkText: {
    color: '#FFC107',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    maxWidth: '80%',
  },
  progressContainer: {
    width: '80%',
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 5,
    marginTop: 20,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  thumbnailImage: {
    width: '80%',
    height: 200,
    marginTop: 20,
    opacity: 0.6,
    borderRadius: 8,
  },
  networkErrorContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 20,
    padding: 20,
  },
  networkErrorText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 20,
    maxWidth: '80%',
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 16,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  videoWrapper: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
    alignSelf: 'center',
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
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  fullscreenVideo: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  fullscreenOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  fullscreenControls: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  exitFullscreenButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 40 : 20,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenPlayPauseButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 80,
    height: 80,
    marginLeft: -40,
    marginTop: -40,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenVolumeButton: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenTimeContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  fullscreenTimeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default DemoVideoPlayer; 