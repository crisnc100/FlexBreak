import React, { useState, useRef, useEffect } from 'react';
import {
  View,
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
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Refs
  const videoRef = useRef<Video>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  
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
  
  // Handle video playback status updates
  const handleVideoStatusUpdate = async (status: AVPlaybackStatus) => {
    // Check if video has just loaded
    if (status.isLoaded) {
      if (isLoading && status.isLoaded) {
        setIsLoading(false);
      }
      
      // Update pause state
      setIsVideoPaused(!status.isPlaying);
      
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
      }
    } catch (error) {
      console.error('Error toggling video playback:', error);
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
    } catch (error) {
      console.error('Error toggling mute:', error);
    }
  };
  
  return (
    <View style={styles.container}>
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
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity 
          style={styles.videoContainer}
          activeOpacity={0.9}
          onPress={handlePlayPause}
          disabled={isLoading}
        >
          <Video
            ref={videoRef}
            source={videoSource}
            style={styles.video}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay={autoPlay}
            isLooping={false}
            isMuted={isMuted}
            onPlaybackStatusUpdate={handleVideoStatusUpdate}
            useNativeControls={false}
            progressUpdateIntervalMillis={50} // More frequent updates
            positionMillis={0}
            // Video optimizations are not supported in this version of expo-av
          />
          
          {/* Play/pause overlay (only shown when paused) */}
          {isVideoPaused && !isLoading && (
            <Animated.View 
              style={[
                styles.playOverlay,
                { opacity: fadeAnim }
              ]}
            >
              <TouchableOpacity 
                style={styles.playButton}
                onPress={handlePlayPause}
              >
                <Ionicons name="play" size={50} color="#FFFFFF" />
              </TouchableOpacity>
            </Animated.View>
          )}
        </TouchableOpacity>
      </Animated.View>
      
      {/* Audio control (floating button) */}
      <Animated.View
        style={[
          styles.soundButtonContainer,
          { opacity: fadeAnim }
        ]}
      >
        <TouchableOpacity
          style={styles.soundButton}
          onPress={handleToggleMute}
          disabled={isLoading}
        >
          <Ionicons
            name={isMuted ? "volume-mute" : "volume-high"}
            size={22}
            color="#FFFFFF"
          />
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
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  playOverlay: {
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