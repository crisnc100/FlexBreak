import * as FileSystem from 'expo-file-system';
import costMonitor from '../utils/costMonitor';
import { retryUtil, errorHandler } from '../utils/reliabilityService';

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

      // Call Google Speech-to-Text API with timeout
      console.log('Calling Google Speech API...');
      
      const fetchWithTimeout = async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        try {
          const response = await fetch(
            `https://speech.googleapis.com/v1/speech:recognize?key=${this.apiKey}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(request),
              signal: controller.signal
            }
          );
          clearTimeout(timeoutId);
          return response;
        } catch (error: any) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            throw new Error('Google Speech API timeout');
          }
          throw error;
        }
      };
      
      const response = await retryUtil.withRetry(
        fetchWithTimeout,
        'google_speech_api',
        { maxRetries: 2, timeout: 20000 }
      ).then(result => {
        if (result.success && result.data) {
          return result.data;
        }
        throw new Error('Failed to call Google Speech API');
      });
      
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
      
      // Get all transcriptions and combine them
      let fullTranscription = '';
      let detectedLanguage = null;
      let highestConfidence = 0;
      
      // Process all results to get the complete transcription
      if (result.results && result.results.length > 0) {
        result.results.forEach((res: any) => {
          if (res.alternatives && res.alternatives.length > 0) {
            const alt = res.alternatives[0];
            fullTranscription += (fullTranscription ? ' ' : '') + alt.transcript;
            
            // Track language with highest confidence
            if (alt.confidence && alt.confidence > highestConfidence) {
              highestConfidence = alt.confidence;
              detectedLanguage = res.languageCode;
            } else if (!detectedLanguage && res.languageCode) {
              detectedLanguage = res.languageCode;
            }
          }
        });
      }
      
      const transcription = fullTranscription.trim();
      
      if (detectedLanguage) {
        console.log('Detected language:', detectedLanguage);
      }
      
      if (!transcription && result.results?.length === 0) {
        console.log('No results returned - audio format may be incorrect');
      }

      if (transcription) {
        // Track speech API usage (estimate based on audio length)
        // Assuming average speech rate of 150 words/minute
        const estimatedDurationSeconds = (transcription.split(' ').length / 150) * 60;
        await costMonitor.trackSpeechUsage(Math.max(estimatedDurationSeconds, 1));
        
        return {
          text: transcription,
          detectedLanguage: detectedLanguage
        };
      }
      return null;
    } catch (error) {
      console.error('Failed to transcribe with Google Speech:', error);
      
      // Handle error with context
      const errorContext = await errorHandler.handleError(error, 'google_speech_transcribe');
      console.error('Error context:', errorContext);
      
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