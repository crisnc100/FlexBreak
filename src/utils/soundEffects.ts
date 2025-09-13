import { Audio } from 'expo-av';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define types
type SoundEffect = 'complete' | 'levelUp' | 'click' | 'timerTick' | 'flexSave' | 'xpBoost' | 
'intro' | 'premiumUnlocked' | 'redeemingChallenge' | 'timerTheme2' | 'timerTheme1' | 
'transition1' | 'transition2' | 'halfway' | 'correct' | 'incorrect' | 'bossRound' | 'monstersDestroyed' | 'padPlacement' |
'roundComplete' | 'AInotification1';

// Define the cache to store loaded sounds
const soundCache: Record<SoundEffect, Audio.Sound | null> = {
  complete: null,
  levelUp: null,
  click: null,
  timerTick: null,
  flexSave: null,
  xpBoost: null,
  intro: null,
  premiumUnlocked: null,
  redeemingChallenge: null,
  timerTheme2: null,
  timerTheme1: null,
  transition1: null,
  transition2: null,
  halfway: null,
  correct: null,
  incorrect: null,
  bossRound: null,
  monstersDestroyed: null,
  padPlacement: null,
  roundComplete: null,
  AInotification1: null,
};

// Track loading states to prevent race conditions
const loadingStates: Record<SoundEffect, boolean> = {
  complete: false,
  levelUp: false,
  click: false,
  timerTick: false,
  flexSave: false,
  xpBoost: false,
  intro: false,
  premiumUnlocked: false,
  redeemingChallenge: false,
  timerTheme2: false,
  timerTheme1: false,
  transition1: false,
  transition2: false,
  halfway: false,
  correct: false,
  incorrect: false,
  bossRound: false,
  monstersDestroyed: false,
  padPlacement: false,
  roundComplete: false,
  AInotification1: false,
};

// Track failed loads to avoid repeated attempts
const failedLoads: Set<SoundEffect> = new Set();

// Add debounce tracking for sounds that are frequently played
const soundDebounceMap: Record<SoundEffect, number> = {
  complete: 0,
  levelUp: 0,
  click: 0,
  timerTick: 0,
  flexSave: 0,
  xpBoost: 0,
  intro: 0,
  premiumUnlocked: 0,
  redeemingChallenge: 0,
  timerTheme2: 0,
  timerTheme1: 0,
  transition1: 0,
  transition2: 0,
  halfway: 0,
  correct: 0,
  incorrect: 0,
  bossRound: 0,
  monstersDestroyed: 0,
  padPlacement: 0,
  roundComplete: 0,
  AInotification1: 0,
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
let isAudioSessionInitialized = false;

// Map sound types to their URIs
const soundUris: Record<SoundEffect, any> = {
  complete: require('../../assets/sounds/routineCompletion.mp3'),
  levelUp: require('../../assets/sounds/levelUP.mp3'),
  click: require('../../assets/sounds/normalClick.mp3'),
  timerTick: require('../../assets/sounds/normalClick.mp3'),
  flexSave: require('../../assets/sounds/flexSave_xboost.mp3'),
  xpBoost: require('../../assets/sounds/flexSave_xboost.mp3'),
  intro: require('../../assets/sounds/intro2.mp3'),
  premiumUnlocked: require('../../assets/sounds/unlockedPremium.mp3'),
  redeemingChallenge: require('../../assets/sounds/redeemingChallenge.mp3'),
  timerTheme2: require('../../assets/sounds/timerTheme2.mp3'),
  timerTheme1: require('../../assets/sounds/timerTheme1.mp3'),
  transition1: require('../../assets/sounds/transition1.mp3'),
  transition2: require('../../assets/sounds/transition2.mp3'),
  halfway: require('../../assets/sounds/unlockedPremium.mp3'),
  correct: require('../../assets/sounds/correctTheme.mp3'),
  incorrect: require('../../assets/sounds/incorrectTheme.mp3'),
  bossRound: require('../../assets/sounds/bossRound.mp3'),
  monstersDestroyed: require('../../assets/sounds/monstersDestroyed.mp3'),
  padPlacement: require('../../assets/sounds/padPlacement.mp3'),
  roundComplete: require('../../assets/sounds/roundComplete.mp3'),
  AInotification1: require('../../assets/sounds/AInotification1.mp3'),
};

/**
 * Initialize the sound system with better error handling
 */
export const initSoundSystem = async (): Promise<void> => {
  try {
    // Only initialize once
    if (isAudioSessionInitialized) {
      console.log('Audio session already initialized');
      return;
    }

    // Configure audio mode for iOS and Android with retry logic
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        await Audio.setAudioModeAsync({
          // iOS
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          // Use enum syntax compatible with expo-av@15
          interruptionModeIOS: Audio.InterruptionModeIOS.DoNotMix,
          // Android
          interruptionModeAndroid: Audio.InterruptionModeAndroid.DoNotMix,
          shouldDuckAndroid: true,
        });
        
        isAudioSessionInitialized = true;
        console.log('Audio session initialized successfully');
        break;
      } catch (error: any) {
        retryCount++;
        console.warn(`Audio session initialization attempt ${retryCount} failed:`, error?.message || error);
        
        if (retryCount >= maxRetries) {
          console.warn('Audio session initialization failed, but continuing anyway');
          // Mark as initialized anyway - sounds may still work without proper audio session
          isAudioSessionInitialized = true;
        } else {
          // Wait longer before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    }

    // Load sound preference from storage
    try {
      const storedPreference = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
      if (storedPreference !== null) {
        soundEnabled = storedPreference === 'true';
      }
    } catch (error) {
      console.warn('Could not load sound preference, using default:', error);
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
 * Load and cache a sound for future playback with improved error handling
 */
export const loadSound = async (soundName: SoundEffect): Promise<boolean> => {
  try {
    // Skip if this sound is already loaded
    if (soundCache[soundName]) {
      return true;
    }

    // Skip if already loading (prevent race conditions)
    if (loadingStates[soundName]) {
      console.log(`Sound "${soundName}" is already loading, skipping duplicate request`);
      return false;
    }

    // Skip if previously failed to load
    if (failedLoads.has(soundName)) {
      console.log(`Sound "${soundName}" previously failed to load, skipping`);
      return false;
    }

    // Mark as loading
    loadingStates[soundName] = true;

    try {
      // Load the sound file with timeout
      const loadPromise = Audio.Sound.createAsync(
        soundUris[soundName],
        { shouldPlay: false }, // Don't auto-play
        null // No status update callback needed during loading
      );

      // Add timeout to prevent hanging (increased to 30 seconds for slower devices)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Sound loading timeout')), 30000)
      );

      const { sound } = await Promise.race([loadPromise, timeoutPromise]) as any;
      
      // Verify the sound loaded properly
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) {
        throw new Error('Sound failed to load properly');
      }

      soundCache[soundName] = sound;
      console.log(`Sound "${soundName}" loaded successfully`);
      return true;
    } catch (loadError) {
      // Mark as failed to avoid repeated attempts
      failedLoads.add(soundName);
      console.error(`Error loading sound "${soundName}":`, loadError);
      return false;
    }
  } catch (error) {
    console.error(`Unexpected error loading sound "${soundName}":`, error);
    return false;
  } finally {
    // Always clear loading state
    loadingStates[soundName] = false;
  }
};

/**
 * Preload all sounds with better error handling and progress tracking
 */
export const preloadAllSounds = async (): Promise<void> => {
  try {
    // Prioritize critical sounds that are used frequently
    const criticalSounds: SoundEffect[] = ['click', 'complete', 'levelUp', 'AInotification1'];
    const allSounds = Object.keys(soundUris) as SoundEffect[];
    let nonCriticalSounds = allSounds.filter(s => !criticalSounds.includes(s));

    // iOS has stricter resource constraints for many simultaneous AVPlayers.
    // Defer some heavier/longer sounds to lazy-load on first use to avoid -11819 errors.
    if (Platform.OS === 'ios') {
      const deferOnIOS: SoundEffect[] = [
        'bossRound',
        'monstersDestroyed',
        'incorrect',
        'timerTheme1',
        'timerTheme2',
        'roundComplete',
      ];
      nonCriticalSounds = nonCriticalSounds.filter(s => !deferOnIOS.includes(s));
    }
    
    console.log(`Starting to preload ${allSounds.length} sounds (${criticalSounds.length} critical)...`);
    
    let loadedCount = 0;
    let failedCount = 0;
    
    // Load critical sounds first with longer timeout
    for (const soundName of criticalSounds) {
      try {
        const success = await loadSound(soundName);
        if (success) {
          loadedCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        failedCount++;
        console.warn(`Failed to load critical sound: ${soundName}`);
      }
    }
    
    // Load non-critical sounds in smaller batches
    const batchSize = Platform.OS === 'ios' ? 1 : 3; // iOS: strict throttling
    
    for (let i = 0; i < nonCriticalSounds.length; i += batchSize) {
      const batch = nonCriticalSounds.slice(i, i + batchSize);
      
      // Use allSettled to continue even if some fail
      const results = await Promise.allSettled(
        batch.map(name => loadSound(name))
      );
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          loadedCount++;
        } else {
          failedCount++;
          console.warn(`Failed to load sound: ${batch[index]}`);
        }
      });
      
      // Longer delay between batches to prevent overwhelming the system
      if (i + batchSize < nonCriticalSounds.length) {
        const delay = Platform.OS === 'ios' ? 350 : 200;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.log(`Sound preloading completed: ${loadedCount} loaded, ${failedCount} failed`);
    console.log(`Sound system status after preload:`, getSoundSystemStatus());
    
    // If too many sounds failed, try retrying them after a delay
    if (failedCount > 5) {
      console.log(`Many sounds failed to load. Will retry in background...`);
      // Retry failed sounds after 5 seconds
      setTimeout(() => {
        retryFailedSounds().catch(console.error);
      }, 5000);
    }
  } catch (error) {
    console.error('Error preloading sounds:', error);
  }
};

/**
 * Play a sound effect with improved error handling and status checking
 */
export const playSound = async (soundName: SoundEffect, volume = 1.0): Promise<void> => {
  try {
    // Return early if sound is disabled
    if (!soundEnabled) {
      return;
    }

    // If audio session wasn't initialized earlier, try once here lazily
    if (!isAudioSessionInitialized) {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          interruptionModeIOS: Audio.InterruptionModeIOS.DoNotMix,
          interruptionModeAndroid: Audio.InterruptionModeAndroid.DoNotMix,
          shouldDuckAndroid: true,
        });
        isAudioSessionInitialized = true;
      } catch (lazyInitErr) {
        // Continue anyway; we'll attempt to play without explicit session changes
      }
    }
    
    const now = Date.now();
    const debounceTime = soundName in DEBOUNCE_TIME ? 
      DEBOUNCE_TIME[soundName as keyof typeof DEBOUNCE_TIME] : 
      DEBOUNCE_TIME.default;
    
    // Check if we're trying to play the sound too soon after the last play
    if (now - soundDebounceMap[soundName] < debounceTime) {
      return;
    }
    
    // Update the last played time
    soundDebounceMap[soundName] = now;
    
    // Load the sound if not already loaded
    if (!soundCache[soundName] && !loadingStates[soundName] && !failedLoads.has(soundName)) {
      const loaded = await loadSound(soundName);
      if (!loaded) {
        return; // Skip playing if loading failed
      }
    }
    
    const sound = soundCache[soundName];
    if (!sound) {
      return; // Skip if sound is not available
    }
    
    try {
      // Get the current status with timeout
      const statusPromise = sound.getStatusAsync();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Status check timeout')), 2000)
      );
      
      const status = await Promise.race([statusPromise, timeoutPromise]) as any;
      
      // Only proceed if sound is loaded and not currently playing
      if (status.isLoaded && !status.isPlaying) {
        // Try to reset position and play, but handle errors gracefully
        try {
          await sound.setPositionAsync(0);
          await sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
          await sound.playAsync();
        } catch (playError) {
          // If setting position fails, try playing without reset
          console.warn(`Could not reset position for sound "${soundName}", trying direct play:`, playError);
          try {
            await sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
            await sound.playAsync();
          } catch (directPlayError) {
            console.error(`Failed to play sound "${soundName}":`, directPlayError);
          }
        }
      }
    } catch (statusError) {
      console.warn(`Could not check status for sound "${soundName}":`, statusError);
      // Try to play anyway as a fallback
      try {
        await sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
        await sound.playAsync();
      } catch (fallbackError) {
        console.error(`Fallback play failed for sound "${soundName}":`, fallbackError);
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
    await playSound('click', 0.1);
  } catch (error) {
    // Silently ignore errors for click sounds to prevent crashes
    console.warn('Click sound error suppressed:', error);
  }
};

/**
 * Play completion sound - for completing a routine
 */
export const playCompletionSound = async (): Promise<void> => {
  await playSound('complete');
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
  await playSound('timerTheme1', 0.3);
};

/**
 * Play timer theme 2 sound
 */
export const playTimerTheme2Sound = async (): Promise<void> => {
  await playSound('timerTheme2', 0.3);
};

/**
 * Play timer theme 1 sound
 */
export const playTransition1Sound = async (): Promise<void> => {
  await playSound('transition1', 0.2);
};
export const playTransition2Sound = async (): Promise<void> => {
  await playSound('transition2', 0.2);
};

/**
 * Play streak flexSave sound
 */
export const playFlexSaveSound = async (): Promise<void> => {
  await playSound('flexSave');
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
 * Play halfway sound
 */
export const playHalfwaySound = async (): Promise<void> => {
  await playSound('halfway', 0.5);
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

/** Minigame sounds
 * Play correct sound
 */
export const playCorrectSound = async (): Promise<void> => {
  await playSound('correct', 1.0);
};

/**
 * Play incorrect sound
 */
export const playIncorrectSound = async (): Promise<void> => {
  await playSound('incorrect', 1.0);
};
export const playBossRoundSound = async (): Promise<void> => {
  await playSound('bossRound', 1.0);
};

export const playMonstersDestroyedSound = async (): Promise<void> => {
  await playSound('monstersDestroyed', 1.0);
};

export const playPadPlacementSound = async (): Promise<void> => {
  await playSound('padPlacement', 1.0);
};

export const playRoundCompleteSound = async (): Promise<void> => {
  await playSound('roundComplete', 1.0);
};

export const playAInotification1Sound = async (): Promise<void> => {
  await playSound('AInotification1', 1.0);
};

/**
 * Retry loading failed sounds (useful for recovering from temporary issues)
 */
export const retryFailedSounds = async (): Promise<void> => {
  if (failedLoads.size === 0) {
    console.log('No failed sounds to retry');
    return;
  }

  console.log(`Retrying ${failedLoads.size} failed sounds...`);
  const failedSounds = Array.from(failedLoads);
  
  // Clear the failed list to allow retry attempts
  failedLoads.clear();
  
  let retrySuccessCount = 0;
  for (const soundName of failedSounds) {
    const success = await loadSound(soundName);
    if (success) {
      retrySuccessCount++;
    }
  }
  
  console.log(`Sound retry completed: ${retrySuccessCount}/${failedSounds.length} sounds recovered`);
};

/**
 * Get sound system status for debugging
 */
export const getSoundSystemStatus = () => {
  const totalSounds = Object.keys(soundUris).length;
  const loadedSounds = Object.values(soundCache).filter(sound => sound !== null).length;
  const failedSounds = failedLoads.size;
  const loadingSounds = Object.values(loadingStates).filter(loading => loading).length;
  
  return {
    totalSounds,
    loadedSounds,
    failedSounds,
    loadingSounds,
    isAudioSessionInitialized,
    soundEnabled,
    failedSoundNames: Array.from(failedLoads)
  };
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
        try {
          await sound.unloadAsync();
        } catch (error) {
          console.warn(`Error unloading sound "${name}":`, error);
        }
        soundCache[name] = null;
      }
    }
    
    // Reset all states
    failedLoads.clear();
    Object.keys(loadingStates).forEach(key => {
      loadingStates[key as SoundEffect] = false;
    });
    
    console.log('All sounds unloaded successfully');
  } catch (error) {
    console.error('Error unloading sounds:', error);
  }
}; 
