import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define types
type SoundEffect = 'success' | 'failure' | 'start' | 'complete' | 'levelUp' | 'click' | 'timerTick' | 'streakFreeze' | 'xpBoost' | 'intro' | 'premiumUnlocked' | 'redeemingChallenge';

// Define the cache to store loaded sounds
const soundCache: Record<SoundEffect, Audio.Sound | null> = {
  success: null,
  failure: null,
  start: null,
  complete: null,
  levelUp: null,
  click: null,
  timerTick: null,
  streakFreeze: null,
  xpBoost: null,
  intro: null,
  premiumUnlocked: null,
  redeemingChallenge: null
};

// Add debounce tracking for sounds that are frequently played
const soundDebounceMap: Record<SoundEffect, number> = {
  success: 0,
  failure: 0,
  start: 0,
  complete: 0,
  levelUp: 0,
  click: 0,
  timerTick: 0,
  streakFreeze: 0,
  xpBoost: 0,
  intro: 0,
  premiumUnlocked: 0,
  redeemingChallenge: 0
};

// Minimum time between playing the same sound (in milliseconds)
const DEBOUNCE_TIME = {
  click: 150,
  timerTick: 300,
  default: 100
};

// Sound settings key in AsyncStorage
const SOUND_ENABLED_KEY = 'app_sound_effects_enabled';

// Default sound is enabled
let soundEnabled = true;

// Map sound types to their URIs
const soundUris: Record<SoundEffect, any> = {
  success: require('../../assets/sounds/routineCompletion.mp3'),
  failure: require('../../assets/sounds/normalClick.mp3'),
  start: require('../../assets/sounds/intro2.mp3'),
  complete: require('../../assets/sounds/routineCompletion.mp3'),
  levelUp: require('../../assets/sounds/levelUP.mp3'),
  click: require('../../assets/sounds/normalClick.mp3'),
  timerTick: require('../../assets/sounds/normalClick.mp3'),
  streakFreeze: require('../../assets/sounds/freeze_xboost.mp3'),
  xpBoost: require('../../assets/sounds/freeze_xboost.mp3'),
  intro: require('../../assets/sounds/intro2.mp3'),
  premiumUnlocked: require('../../assets/sounds/unlockedPremium.mp3'),
  redeemingChallenge: require('../../assets/sounds/redeemingChallenge.mp3')
};

/**
 * Initialize the sound system
 */
export const initSoundSystem = async (): Promise<void> => {
  try {
    // Configure audio mode for iOS and Android
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      interruptionModeIOS: 1, // DoNotMix
      interruptionModeAndroid: 1, // DoNotMix
      shouldDuckAndroid: true,
    });

    // Load sound preference from storage
    const storedPreference = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
    if (storedPreference !== null) {
      soundEnabled = storedPreference === 'true';
    }
    
    console.log('Sound effects system initialized, sound enabled:', soundEnabled);
  } catch (error) {
    console.error('Error initializing sound system:', error);
  }
};

/**
 * Check if sound effects are enabled
 */
export const isSoundEnabled = (): boolean => {
  return soundEnabled;
};

/**
 * Enable or disable sound effects
 */
export const setSoundEnabled = async (enabled: boolean): Promise<void> => {
  try {
    soundEnabled = enabled;
    await AsyncStorage.setItem(SOUND_ENABLED_KEY, enabled.toString());
    console.log('Sound effects', enabled ? 'enabled' : 'disabled');
  } catch (error) {
    console.error('Error saving sound preference:', error);
  }
};

/**
 * Load and cache a sound for future playback
 */
export const loadSound = async (soundName: SoundEffect): Promise<void> => {
  try {
    // Skip if this sound is already loaded
    if (soundCache[soundName]) {
      return;
    }

    // Load the sound file
    const { sound } = await Audio.Sound.createAsync(soundUris[soundName]);
    soundCache[soundName] = sound;
    
    console.log(`Sound "${soundName}" loaded successfully`);
  } catch (error) {
    console.error(`Error loading sound "${soundName}":`, error);
  }
};

/**
 * Preload all sounds
 */
export const preloadAllSounds = async (): Promise<void> => {
  try {
    const soundNames = Object.keys(soundUris) as SoundEffect[];
    
    // Load all sounds in parallel
    await Promise.all(soundNames.map(name => loadSound(name)));
    
    console.log('All sounds preloaded successfully');
  } catch (error) {
    console.error('Error preloading sounds:', error);
  }
};

/**
 * Play a sound effect
 */
export const playSound = async (soundName: SoundEffect, volume = 1.0): Promise<void> => {
  try {
    // Return early if sound is disabled
    if (!soundEnabled) {
      return;
    }
    
    const now = Date.now();
    const debounceTime = soundName in DEBOUNCE_TIME ? 
      DEBOUNCE_TIME[soundName as keyof typeof DEBOUNCE_TIME] : 
      DEBOUNCE_TIME.default;
    
    // Check if we're trying to play the sound too soon after the last play
    if (now - soundDebounceMap[soundName] < debounceTime) {
      // Skip this sound to prevent interruption errors
      return;
    }
    
    // Update the last played time
    soundDebounceMap[soundName] = now;
    
    // Load the sound if not already loaded
    if (!soundCache[soundName]) {
      await loadSound(soundName);
    }
    
    const sound = soundCache[soundName];
    if (sound) {
      // Get the current status
      const status = await sound.getStatusAsync();
      
      // Only attempt to set position if the sound isn't currently playing
      // This helps prevent the "Seeking interrupted" error
      if (!status.isLoaded || !status.isPlaying) {
        // Reset sound to start position
        await sound.setPositionAsync(0);
        
        // Set volume
        await sound.setVolumeAsync(volume);
        
        // Play the sound
        await sound.playAsync();
      }
    }
  } catch (error) {
    console.error(`Error playing sound "${soundName}":`, error);
  }
};

/**
 * Play click sound - useful for buttons
 */
export const playClickSound = async (): Promise<void> => {
  try {
    await playSound('click', 0.5);
  } catch (error) {
    // Silently ignore errors for click sounds to prevent crashes
    console.warn('Click sound error suppressed:', error);
  }
};

/**
 * Play success sound - for completing tasks
 */
export const playSuccessSound = async (): Promise<void> => {
  await playSound('success');
};

/**
 * Play completion sound - for completing a routine
 */
export const playCompletionSound = async (): Promise<void> => {
  await playSound('complete');
};

/**
 * Play start sound - when starting a routine
 */
export const playStartSound = async (): Promise<void> => {
  await playSound('start');
};

/**
 * Play level up sound - when user levels up
 */
export const playLevelUpSound = async (): Promise<void> => {
  await playSound('levelUp');
};

/**
 * Play timer tick sound - for countdown timers
 */
export const playTimerTickSound = async (): Promise<void> => {
  await playSound('timerTick', 0.3);
};

/**
 * Play streak freeze sound
 */
export const playStreakFreezeSound = async (): Promise<void> => {
  await playSound('streakFreeze');
};

/**
 * Play XP boost sound
 */
export const playXpBoostSound = async (): Promise<void> => {
  await playSound('xpBoost');
};

/**
 * Play intro sound
 */
export const playIntroSound = async (): Promise<void> => {
  await playSound('intro');
};

/**
 * Play intro sound with slower playback rate
 */
export const playSlowIntroSound = async (): Promise<void> => {
  try {
    // Return early if sound is disabled
    if (!soundEnabled) {
      return;
    }
    
    // Load the sound if not already loaded
    if (!soundCache['intro']) {
      await loadSound('intro');
    }
    
    const sound = soundCache['intro'];
    if (sound) {
      // Reset sound to start position
      await sound.setPositionAsync(0);
      
      // Set slower playback rate (0.75 = 75% speed)
      await sound.setRateAsync(0.75, false);
      
      // Set volume
      await sound.setVolumeAsync(1.0);
      
      // Play the sound
      await sound.playAsync();
    }
  } catch (error) {
    console.error('Error playing slow intro sound:', error);
  }
};

/**
 * Play premium unlocked sound
 */
export const playPremiumUnlockedSound = async (): Promise<void> => {
  await playSound('premiumUnlocked', 1.0);
};

/**
 * Play challenge redeeming sound with reduced volume
 */
export const playRedeemingChallengeSound = async (): Promise<void> => {
  await playSound('redeemingChallenge', 0.4); // Use lower volume (40%)
};

/**
 * Cleanup function to unload all sounds and free memory
 */
export const unloadAllSounds = async (): Promise<void> => {
  try {
    const soundNames = Object.keys(soundCache) as SoundEffect[];
    
    // Unload all loaded sounds
    for (const name of soundNames) {
      const sound = soundCache[name];
      if (sound) {
        await sound.unloadAsync();
        soundCache[name] = null;
      }
    }
    
    console.log('All sounds unloaded successfully');
  } catch (error) {
    console.error('Error unloading sounds:', error);
  }
}; 