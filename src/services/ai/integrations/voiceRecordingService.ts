import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import secureGoogleSpeechService from './secureGoogleSpeechService';
import { rateLimiter } from '../utils/reliabilityService';

class VoiceRecordingService {
  private recording: Audio.Recording | null = null;
  private recordingUri: string | null = null;

  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return false;
    }
  }

  async startRecording(): Promise<boolean> {
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
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Wait longer for audio mode to be properly set on iOS
      await new Promise(resolve => setTimeout(resolve, 300));

      // Create and start recording with optimized settings for speech
      const recordingOptions = {
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: 2, // MPEG_4
          audioEncoder: 3, // AAC
          sampleRate: 16000, // Optimal for speech recognition
          numberOfChannels: 1, // Mono is sufficient for voice
          bitRate: 128000,
        },
        ios: {
          extension: '.caf',
          outputFormat: 'lpcm',
          audioQuality: 32,
          sampleRate: 16000,
          numberOfChannels: 1,
          bitRate: 16000,
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
      const { recording } = await Audio.Recording.createAsync(recordingOptions);
      
      this.recording = recording;
      console.log('Recording created and started successfully');
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.recording = null;
      
      // Reset audio mode on error
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      } catch (resetError) {
        console.error('Failed to reset audio mode:', resetError);
      }
      
      return false;
    }
  }

  async stopRecording(): Promise<string | null> {
    try {
      if (!this.recording) {
        console.log('No recording in progress');
        return null;
      }

      console.log('Stopping recording...');
      
      // Get URI before stopping (in case stopAndUnloadAsync clears it)
      const uri = this.recording.getURI();
      
      await this.recording.stopAndUnloadAsync();
      
      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      this.recordingUri = uri;
      this.recording = null;

      console.log('Recording stopped and stored at', uri);
      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.recording = null;
      
      // Try to reset audio mode even on error
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
        });
      } catch (resetError) {
        console.error('Failed to reset audio mode after error:', resetError);
      }
      
      return null;
    }
  }

  async transcribeAudio(audioUri: string): Promise<string | null> {
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
            console.log('Got transcription:', result.text);
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
    }
  }

  isRecording(): boolean {
    return this.recording !== null;
  }

  async cancelRecording(): Promise<void> {
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
        this.recordingUri = null;
      } catch (error) {
        console.error('Error canceling recording:', error);
      }
    }
  }
}

export default new VoiceRecordingService();