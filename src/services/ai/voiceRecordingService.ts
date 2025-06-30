import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import googleSpeechService from './googleSpeechService';

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
      // Request permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('Audio recording permission denied');
        return false;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      this.recording = recording;
      console.log('Recording started');
      return true;
    } catch (error) {
      console.error('Failed to start recording:', error);
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
      await this.recording.stopAndUnloadAsync();
      
      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = this.recording.getURI();
      this.recordingUri = uri;
      this.recording = null;

      console.log('Recording stopped and stored at', uri);
      return uri;
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.recording = null;
      return null;
    }
  }

  async transcribeAudio(audioUri: string): Promise<string | null> {
    try {
      console.log('Transcribing audio from:', audioUri);
      
      // Use English with auto-detection of Spanish and Mandarin
      const languageCode = 'en-US';
      
      console.log('Using language code:', languageCode);
      
      // Try Google Speech API first
      // To enable: Add your API key to src/config/aiConfig.ts
      const { default: config } = await import('../../config/aiConfig');
      
      console.log('Google Speech API Key exists:', !!config.GOOGLE_SPEECH_API_KEY);
      console.log('Key length:', config.GOOGLE_SPEECH_API_KEY?.length);
      
      if (config.GOOGLE_SPEECH_API_KEY) {
        try {
          googleSpeechService.setApiKey(config.GOOGLE_SPEECH_API_KEY);
          const result = await googleSpeechService.transcribeAudio(audioUri, languageCode);
          
          // Clean up the audio file
          try {
            await FileSystem.deleteAsync(audioUri, { idempotent: true });
          } catch (err) {
            console.log('Could not delete audio file:', err);
          }
          
          if (result && result.text) {
            console.log('Got transcription:', result.text);
            // Store the detected language from Google for context building
            if (result.detectedLanguage) {
              await AsyncStorage.setItem('@ai_wellness_detected_language', result.detectedLanguage);
            }
            return result.text;
          } else {
            console.log('No transcription returned from Google Speech');
          }
        } catch (error) {
          console.error('Error calling Google Speech:', error);
        }
      }
      
      // Fallback message if no API key configured
      const messages = {
        'en-US': "To enable voice: Add Google Speech API key in settings.",
        'es-ES': "Para activar voz: Añade clave API de Google Speech en configuración.",
        'zh-CN': "启用语音：在设置中添加 Google Speech API 密钥。"
      };
      
      // Clean up the audio file
      try {
        await FileSystem.deleteAsync(audioUri, { idempotent: true });
      } catch (err) {
        console.log('Could not delete audio file:', err);
      }
      
      return messages[languageCode] || messages['en-US'];
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