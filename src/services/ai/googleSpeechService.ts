import * as FileSystem from 'expo-file-system';

interface GoogleSpeechConfig {
  apiKey: string;
  languages: string[];
}

class GoogleSpeechService {
  private apiKey: string = '';
  private supportedLanguages = ['en-US', 'es-ES', 'zh-CN']; // English, Spanish, Mandarin

  setApiKey(key: string) {
    this.apiKey = key;
  }

  async transcribeAudio(audioUri: string, languageCode?: string): Promise<{ text: string; detectedLanguage?: string } | null> {
    try {
      console.log('Starting Google Speech transcription...');
      console.log('API Key set:', !!this.apiKey);
      
      if (!this.apiKey) {
        console.error('Google Speech API key not set');
        return null;
      }

      // Read audio file as base64
      console.log('Reading audio file...');
      const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('Audio file read, base64 length:', audioBase64.length);

      // OPTIMIZED: Use cheaper, faster model and settings
      const request = {
        config: {
          encoding: 'MP3',
          sampleRateHertz: 16000, // Reduced for cost efficiency
          languageCode: languageCode || 'en-US',
          alternativeLanguageCodes: ['es-ES', 'zh-CN'],
          model: 'latest_short', // Cheaper model for short wellness messages
          enableAutomaticPunctuation: false, // Reduce processing cost
        },
        audio: {
          content: audioBase64,
        },
      };

      // Call Google Speech-to-Text API
      console.log('Calling Google Speech API...');
      const response = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(request),
        }
      );
      console.log('Got response from Google Speech API');

      if (!response.ok) {
        const error = await response.json();
        console.error('Google Speech API error:', error);
        console.error('Response status:', response.status);
        console.error('Full error:', JSON.stringify(error, null, 2));
        return null;
      }

      const result = await response.json();
      console.log('API Response:', JSON.stringify(result, null, 2));
      
      // Get transcription with highest confidence
      const transcription = result.results?.[0]?.alternatives?.[0]?.transcript;
      const detectedLanguage = result.results?.[0]?.languageCode;
      
      if (detectedLanguage) {
        console.log('Detected language:', detectedLanguage);
      }
      
      if (!transcription && result.results?.length === 0) {
        console.log('No results returned - audio format may be incorrect');
      }

      if (transcription) {
        return {
          text: transcription,
          detectedLanguage: detectedLanguage
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to transcribe with Google Speech:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      return null;
    }
  }

  // Helper to detect language from device locale
  getLanguageCode(locale: string): string {
    if (locale.startsWith('es')) return 'es-ES';
    if (locale.startsWith('zh')) return 'zh-CN';
    return 'en-US';
  }
}

export default new GoogleSpeechService();