import firebase from 'firebase/compat/app';
import 'firebase/compat/functions';
import * as FileSystem from 'expo-file-system';

class SecureGoogleSpeechService {
  private transcribeFunction: any;

  constructor() {
    this.transcribeFunction = firebase.functions().httpsCallable('transcribeAudio');
  }

  async transcribeAudio(audioUri: string, languageCode?: string): Promise<{ text: string; detectedLanguage?: string } | null> {
    try {
      console.log('Starting secure Google Speech transcription...');
      
      // Read audio file as base64
      console.log('Reading audio file...');
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('Audio file read, base64 length:', audioBase64.length);

      // Determine audio format based on file extension
      const isIOS = audioUri.includes('.caf');
      const encoding = isIOS ? 'LINEAR16' : 'WEBM_OPUS';
      const sampleRate = isIOS ? 16000 : 48000; // Use 16000 for better accuracy like original
      
      console.log('Audio format detected:', { encoding, sampleRate, isIOS });

      // Call Firebase Function
      const result = await this.transcribeFunction({
        audioBase64,
        languageCode,
        encoding,
        sampleRate
      });

      if (!result.data.success) {
        console.error('Transcription failed:', result.data.error);
        return null;
      }

      console.log('Transcription successful');
      return {
        text: result.data.text,
        detectedLanguage: result.data.detectedLanguage
      };

    } catch (error: any) {
      console.error('Secure Google Speech error:', error);
      
      // Handle specific Firebase Function errors
      if (error.code === 'unauthenticated') {
        console.log('Note: Speech transcription is available without authentication');
      }
      
      return null;
    }
  }

  // For compatibility with existing code
  setApiKey(key: string) {
    // No longer needed - API key is server-side
    console.log('API key is now managed server-side');
  }
}

export default new SecureGoogleSpeechService();