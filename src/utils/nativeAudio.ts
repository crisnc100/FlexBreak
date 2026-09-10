import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioSource, type AudioStatus } from 'expo-audio';
import { Platform } from 'react-native';
import { milliseconds, seconds, type PlaybackStatus } from './mediaStatus';

export const InterruptionModeIOS = { MixWithOthers: 0, DoNotMix: 1, DuckOthers: 2 } as const;
export const InterruptionModeAndroid = { DoNotMix: 1, DuckOthers: 2 } as const;
type LegacyAudioMode = {
  allowsRecordingIOS?: boolean; playsInSilentModeIOS?: boolean; staysActiveInBackground?: boolean;
  shouldDuckAndroid?: boolean; playThroughEarpieceAndroid?: boolean;
  interruptionModeIOS?: number; interruptionModeAndroid?: number;
};
async function configureAudio(mode: LegacyAudioMode) {
  const interruption = Platform.OS === 'ios' ? mode.interruptionModeIOS : mode.interruptionModeAndroid;
  await setAudioModeAsync({
    ...(mode.allowsRecordingIOS === undefined ? {} : { allowsRecording: mode.allowsRecordingIOS }),
    ...(mode.playsInSilentModeIOS === undefined ? {} : { playsInSilentMode: mode.playsInSilentModeIOS }),
    ...(mode.staysActiveInBackground === undefined ? {} : { shouldPlayInBackground: mode.staysActiveInBackground }),
    ...(mode.playThroughEarpieceAndroid === undefined ? {} : { shouldRouteThroughEarpiece: mode.playThroughEarpieceAndroid }),
    ...(interruption === undefined ? {} : { interruptionMode: interruption === 1 ? 'doNotMix' : interruption === 2 ? 'duckOthers' : 'mixWithOthers' }),
    ...(Platform.OS === 'android' && interruption === undefined && mode.shouldDuckAndroid !== undefined ? { interruptionMode: mode.shouldDuckAndroid ? 'duckOthers' : 'doNotMix' } : {}),
  });
}
export function audioStatus(status: AudioStatus): PlaybackStatus {
  return {
    isLoaded: status.isLoaded, isPlaying: status.playing,
    positionMillis: milliseconds(status.currentTime), durationMillis: milliseconds(status.duration),
    isBuffering: status.isBuffering, didJustFinish: status.didJustFinish,
    ...(status.error ? { error: status.error } : {}),
  };
}

/** Keeps the routine's existing imperative playback contract over expo-audio. */
export class Sound {
  private subscription?: { remove(): void };
  private removed = false;
  private constructor(private player: AudioPlayer) {}
  static async createAsync(source: AudioSource, initial: { shouldPlay?: boolean; volume?: number; isLooping?: boolean } = {}, callback?: ((status: PlaybackStatus) => void) | null) {
    const player = createAudioPlayer(source, { updateInterval: 250 });
    const sound = new Sound(player);
    try {
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => { listener.remove(); reject(new Error('Audio loading timed out')); }, 30_000);
        const listener = player.addListener('playbackStatusUpdate', status => {
          if (status.error || status.isLoaded) {
            clearTimeout(timeout); listener.remove();
            if (status.error) reject(new Error(status.error)); else resolve();
          }
        });
        if (player.isLoaded) { clearTimeout(timeout); listener.remove(); resolve(); }
      });
      if (callback) sound.subscription = player.addListener('playbackStatusUpdate', status => callback(audioStatus(status)));
      player.volume = initial.volume ?? 1;
      player.loop = initial.isLooping ?? false;
      if (initial.shouldPlay) player.play();
      return { sound, status: await sound.getStatusAsync() };
    } catch (error) { await sound.unloadAsync(); throw error; }
  }
  async getStatusAsync(): Promise<PlaybackStatus> {
    return this.removed
      ? { isLoaded: false, isPlaying: false, positionMillis: 0, durationMillis: 0, isBuffering: false, didJustFinish: false }
      : audioStatus(this.player.currentStatus);
  }
  async playAsync() { this.player.play(); return this.getStatusAsync(); }
  async pauseAsync() { this.player.pause(); return this.getStatusAsync(); }
  async stopAsync() { this.player.pause(); await this.player.seekTo(0); return this.getStatusAsync(); }
  async setPositionAsync(position: number) { await this.player.seekTo(seconds(position)); return this.getStatusAsync(); }
  async setIsMutedAsync(muted: boolean) { this.player.muted = muted; return this.getStatusAsync(); }
  async setVolumeAsync(volume: number) { this.player.volume = volume; return this.getStatusAsync(); }
  async setRateAsync(rate: number, shouldCorrectPitch: boolean) { this.player.shouldCorrectPitch = shouldCorrectPitch; this.player.setPlaybackRate(rate); return this.getStatusAsync(); }
  async unloadAsync() {
    if (!this.removed) { this.subscription?.remove(); this.player.remove(); this.removed = true; }
    return this.getStatusAsync();
  }
}
export const Audio = { Sound, setAudioModeAsync: configureAudio };
