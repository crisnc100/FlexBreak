import { callBackend } from '../../security/backendClient';
import * as FileSystem from 'expo-file-system/legacy';

class SecureGoogleSpeechService {
  async transcribeAudio(audioUri: string, languageCode?: string): Promise<{ text: string; detectedLanguage?: string } | null> {
    try {
      console.log('Starting secure Google Speech transcription...');
      
      // Read audio file as base64
      console.log('Reading audio file...');
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('Audio file read, base64 length:', audioBase64.length);

      // Match the native recorder: WAV PCM16 on iOS; AMR-WB on Android.
      // Do not label AAC or CAF data as WebM/Opus or raw PCM.
      const extension = audioUri.split('?')[0].split('.').pop()?.toLowerCase();
      const encoding = extension === 'wav' ? 'LINEAR16' : extension === 'amr' ? 'AMR_WB' : null;
      if (!encoding) throw new Error('Unsupported recording format');
      const result = await callBackend<{ text: string; detectedLanguage?: string }>('transcribe-audio-v2', {
        audioContent: audioBase64,
        languageCode,
        encoding,
        sampleRateHertz: 16000,
      });

      console.log('Transcription successful');
      return {
        text: result.text,
        detectedLanguage: result.detectedLanguage
      };

    } catch (error: any) {
      console.error('Secure Google Speech error:', error);
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