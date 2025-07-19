import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import * as admin from "firebase-admin";
import axios from "axios";

// Define environment variables with defaults to prevent deployment errors
const googleSpeechApiKey = defineString("GOOGLE_SPEECH_API_KEY", { default: "" });

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

interface TranscriptionRequest {
  audioBase64: string;
  languageCode?: string;
  encoding?: string;
  sampleRate?: number;
}

interface TranscriptionResponse {
  success: boolean;
  text?: string;
  detectedLanguage?: string;
  error?: string;
}

/**
 * Secure speech transcription endpoint that keeps Google Speech API key server-side
 */
export const transcribeAudio = onCall(async (request): Promise<TranscriptionResponse> => {
  const { 
    audioBase64, 
    languageCode = 'en-US',
    encoding = 'WEBM_OPUS',
    sampleRate = 48000
  } = request.data as TranscriptionRequest;
  
  // For anonymous users, create a simple identifier
  const userId = request.auth?.uid || 'anonymous';
  
  if (!audioBase64 || typeof audioBase64 !== 'string') {
    throw new HttpsError('invalid-argument', 'Audio data is required');
  }

  try {
    const apiKey = googleSpeechApiKey.value();
    if (!apiKey) {
      console.error('Google Speech API key not configured');
      throw new HttpsError('internal', 'Speech service not configured');
    }

    // Note: audioBase64 is used directly in the request

    // Prepare the request to Google Speech API with optimized settings
    const speechRequest = {
      config: {
        encoding: encoding as any,
        sampleRateHertz: sampleRate,
        languageCode: languageCode,
        alternativeLanguageCodes: ['es-ES', 'zh-CN'], // Support multiple languages
        model: 'latest_short', // Optimized for short wellness messages
        enableAutomaticPunctuation: false, // Reduce processing cost
        enableWordTimeOffsets: false,
      },
      audio: {
        content: audioBase64,
      },
    };

    // Call Google Speech-to-Text API
    const response = await axios.post(
      `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`,
      speechRequest,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const { data } = response;

    if (data.results && data.results.length > 0) {
      // Process all results to get complete transcription (like original code)
      let fullTranscription = '';
      let detectedLanguage: string | null = null;
      let highestConfidence = 0;
      
      data.results.forEach((res: any) => {
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
      
      const transcript = fullTranscription.trim();

      // Log usage for monitoring (only for authenticated users)
      if (userId !== 'anonymous') {
        await admin.firestore().collection('speech_usage').add({
          userId: userId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          audioLength: audioBase64.length,
          transcriptLength: transcript.length,
          languageCode: languageCode,
          success: true
        });
      }

      return {
        success: true,
        text: transcript,
        detectedLanguage: detectedLanguage || languageCode
      };
    } else {
      return {
        success: false,
        error: 'No speech detected in audio'
      };
    }

  } catch (error: any) {
    console.error('Speech transcription error:', error.response?.data || error.message);

    // Log failed attempt (only for authenticated users)
    if (userId !== 'anonymous') {
      await admin.firestore().collection('speech_usage').add({
        userId: userId,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message,
        success: false
      });
    }
    
    throw new HttpsError('internal', 'Unable to transcribe audio');
  }
});