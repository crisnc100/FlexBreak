import { useRef, useCallback } from 'react';
import { Audio } from 'expo-av';
import { GAME_CONFIG } from '../constants';

export const useAudioManager = () => {
  const ambientSound = useRef<Audio.Sound | null>(null);

  const setupAudio = useCallback(async () => {
    try {
      // Set audio mode for ambient background playbook
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
    } catch (error) {
      console.log('🎮 MINDFUL: Audio setup failed:', error);
    }
  }, []);

  const playAmbientSound = useCallback(async () => {
    try {
      if (ambientSound.current) {
        await ambientSound.current.unloadAsync();
      }
      
      console.log('🎮 MINDFUL: Playing ambient sound...');
      
      // Create a gentle ambient sound using the app's existing audio
      // This is a placeholder - you can replace with actual ambient sounds
      const { sound } = await Audio.Sound.createAsync(
        // Using one of your existing gentle sounds as placeholder
        require('../../../../../assets/sounds/transition1.mp3'),
        {
          isLooping: true,
          volume: GAME_CONFIG.AMBIENT_VOLUME,
        }
      );
      
      ambientSound.current = sound;
      await sound.playAsync();
    } catch (error) {
      console.log('🎮 MINDFUL: Ambient sound failed:', error);
    }
  }, []);

  const stopAmbientSound = useCallback(async () => {
    try {
      if (ambientSound.current) {
        await ambientSound.current.stopAsync();
        await ambientSound.current.unloadAsync();
        ambientSound.current = null;
      }
    } catch (error) {
      console.log('🎮 MINDFUL: Stop ambient sound failed:', error);
    }
  }, []);

  const updateAmbientVolume = useCallback((serenity: number) => {
    try {
      if (ambientSound.current) {
        // Volume increases with serenity level
        const volume = GAME_CONFIG.MIN_SERENITY_VOLUME + (serenity * (GAME_CONFIG.MAX_SERENITY_VOLUME - GAME_CONFIG.MIN_SERENITY_VOLUME));
        ambientSound.current.setVolumeAsync(volume);
      }
    } catch (error) {
      console.log('🎮 MINDFUL: Volume update failed:', error);
    }
  }, []);

  return {
    setupAudio,
    playAmbientSound,
    stopAmbientSound,
    updateAmbientVolume,
  };
}; 