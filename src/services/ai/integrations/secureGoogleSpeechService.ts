import firebase from 'firebase/compat/app';
import { EDGE_FUNCTIONS, SUPABASE_ANON_KEY } from '../../../config/supabase';
import * as FileSystem from 'expo-file-system';

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

      // Determine audio format based on file extension
      const isIOS = audioUri.includes('.caf');
      const encoding = isIOS ? 'LINEAR16' : 'WEBM_OPUS';
      const sampleRate = isIOS ? 16000 : 48000; // Use 16000 for better accuracy like original
      
      console.log('Audio format detected:', { encoding, sampleRate, isIOS });

      // Call Supabase Edge Function
      const currentUser = firebase.auth().currentUser;
      const response = await fetch(EDGE_FUNCTIONS.SPEECH_TRANSCRIPTION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          audioBase64,
          languageCode,
          encoding,
          sampleRate,
          userId: currentUser?.uid || 'anonymous'
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Transcription failed:', result.error);
        return null;
      }

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