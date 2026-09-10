import { trackAIWork, getAIDataGeneration, isAIDataCurrent } from '../aiDataLifecycle';
import { AudioModule, setAudioModeAsync, type AudioRecorder, type RecordingOptions } from 'expo-audio';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import secureGoogleSpeechService from './secureGoogleSpeechService';
import { rateLimiter } from '../utils/reliabilityService';

class VoiceRecordingService {
  private recording: AudioRecorder | null = null;
  private recordingUri: string | null = null;

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await AudioModule.requestRecordingPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return false;
    }
  }

  async startRecording(): Promise<boolean> {
    const generation = getAIDataGeneration();
    return trackAIWork(async () => {
    try {
      // Stop any existing recording first
      if (this.recording) {
        await this.stopRecording();
      }

      // Request permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Audio recording permission denied');
        return false;
      }

      // Configure audio mode with minimal required settings
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        shouldPlayInBackground: false, // Ensure we're not trying to record in background
        interruptionMode: 'duckOthers',
        shouldRouteThroughEarpiece: false,
      });

      // Wait longer for audio mode to be properly set on iOS
      await new Promise(resolve => setTimeout(resolve, 500));

      // Create and start recording with optimized settings for speech
      const recordingOptions: RecordingOptions = {
        extension: '.amr', sampleRate: 16000, numberOfChannels: 1, bitRate: 23850,
        isMeteringEnabled: true,
        android: {
          extension: '.amr',
          outputFormat: 'amrwb',
          audioEncoder: 'amr_wb',
          sampleRate: 16000, // Optimal for speech recognition
        },
        ios: {
          extension: '.wav',
          outputFormat: 'lpcm',
          audioQuality: 32,
          sampleRate: 16000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };
      
      console.log('Creating recording with options:', recordingOptions);
      // The native constructor requires flat platform options, as supplied by
      // Expo's useAudioRecorder hook. Preparation cannot repair a failed constructor.
      const { ios, android, web, ...commonOptions } = recordingOptions;
      const platformOptions = Platform.OS === 'ios' ? ios : Platform.OS === 'android' ? android : web;
      const recording = new AudioModule.AudioRecorder({ ...commonOptions, ...platformOptions });
      this.recording = recording;
      await recording.prepareToRecordAsync();
      if (!isAIDataCurrent(generation)) {
        const uri = recording.uri;
        recording.release();
        if (this.recording === recording) this.recording = null;
        if (uri) {
          this.recordingUri = uri;
          await FileSystem.deleteAsync(uri, { idempotent: true });
          if (this.recordingUri === uri) this.recordingUri = null;
        }
        return false;
      }
      recording.record();
      
      this.recording = recording;
      console.log('Recording created and started successfully');
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.recording?.release();
      this.recording = null;
      
      // Reset audio mode on error
      try {
        await setAudioModeAsync({
          allowsRecording: false,
        });
      } catch (resetError) {
        console.error('Failed to reset audio mode:', resetError);
      }
      
      return false;
    }

    });
  }

  async stopRecording(): Promise<string | null> {
    return trackAIWork(() => this.stopRecordingInternal());
  }

  private async stopRecordingInternal(): Promise<string | null> {
    try {
      if (!this.recording) {
        console.log('No recording in progress');
        return null;
      }

      console.log('Stopping recording...');
      
      // Get URI before stopping (in case stopAndUnloadAsync clears it)
      const uri = this.recording.uri;
      if (uri) this.recordingUri = uri;
      
      await this.recording.stop();
      
      // Reset audio mode
      await setAudioModeAsync({
        allowsRecording: false,
      });

      this.recordingUri = uri;
      this.recording?.release();
      this.recording = null;

      console.log('Recording stopped and stored at', uri);
      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.recording?.release();
      this.recording = null;
      
      // Try to reset audio mode even on error
      try {
        await setAudioModeAsync({
          allowsRecording: false,
        });
      } catch (resetError) {
        console.error('Failed to reset audio mode after error:', resetError);
      }
      
      return null;
    }
  }

  async transcribeAudio(audioUri: string): Promise<string | null> {
    return trackAIWork(async () => {
    try {
      console.log('Transcribing audio from:', audioUri);
      
      // Check rate limit for voice transcription
      const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
      const rateCheck = await rateLimiter.checkLimit('voice_transcription', userId);
      
      if (!rateCheck.allowed) {
        // Clean up the audio file
        try {
          await FileSystem.deleteAsync(audioUri, { idempotent: true });
        } catch (err) {
          console.log('Could not delete audio file:', err);
        }
        
        return `Too many voice requests. Please try again in ${rateCheck.retryAfter} seconds.`;
      }
      
      // Use English with auto-detection of Spanish and Mandarin
      const languageCode = 'en-US';
      
      console.log('Using language code:', languageCode);
      
      // Try secure Google Speech API first (server-side key)
      try {
        console.log('Using secure Google Speech API (server-side)');
        const result = await secureGoogleSpeechService.transcribeAudio(audioUri, languageCode);
          
          // Clean up the audio file
          try {
            await FileSystem.deleteAsync(audioUri, { idempotent: true });
          } catch (err) {
            console.log('Could not delete audio file:', err);
          }
          
          if (result && result.text && result.text.trim().length > 0) {
            console.log('Voice transcription received');
            console.log('Detected language from Google:', result.detectedLanguage);
            
            // Store the detected language from Google for context building
            if (result.detectedLanguage) {
              // Add some validation - don't trust obviously wrong language detections
              const text = result.text.toLowerCase();
              const isLikelyEnglish = /\b(hi|hello|my|neck|back|sore|leg|tired|help)\b/.test(text);
              
              if (isLikelyEnglish && result.detectedLanguage.startsWith('cmn')) {
                console.warn('Google detected Chinese but text appears to be English, ignoring language detection');
                // Don't store the wrong language
              } else {
                await AsyncStorage.setItem('@ai_wellness_detected_language', result.detectedLanguage);
              }
            }
            return result.text.trim();
          } else {
            console.log('No transcription returned from Google Speech');
            return null; // Return null for empty transcriptions
          }
      } catch (error) {
        console.error('Error calling secure Google Speech:', error);
      }
      
      // Clean up the audio file
      try {
        await FileSystem.deleteAsync(audioUri, { idempotent: true });
      } catch (err) {
        console.log('Could not delete audio file:', err);
      }
      
      // Return null if no API key configured - don't send a message
      console.log('No Google Speech API key configured, voice feature disabled');
      return null;
    } catch (error) {
      console.error('Failed to transcribe audio:', error);
      return null;
    } finally {
      await FileSystem.deleteAsync(audioUri, { idempotent: true });
      if (this.recordingUri === audioUri) this.recordingUri = null;
    }

    });
  }

  isRecording(): boolean {
    return this.recording !== null;
  }

  async cancelRecording(): Promise<void> {
    const uri = this.recording ? (await this.stopRecordingInternal()) || this.recordingUri : this.recordingUri;
    if (uri) await FileSystem.deleteAsync(uri, { idempotent: true });
    this.recordingUri = null;
  }
}

export default new VoiceRecordingService();
