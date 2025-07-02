import { OPENROUTER_API_KEY, APP_URL, GOOGLE_SPEECH_API_KEY } from '@env';

export const AI_CONFIG = {
  openRouter: {
    apiKey: OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1/chat/completions',
    appUrl: APP_URL || 'https://flexbreak.app',
    defaultModel: 'mistralai/mistral-7b-instruct:free', // Changed to free model
    maxRetries: 3,
    timeout: 30000, // 30 seconds
  },
  
  models: {
    fast: 'mistralai/mistral-7b-instruct',           // Mistral 7B - reliable and multilingual
    balanced: 'meta-llama/llama-3.1-8b-instruct',    // Llama 8B - good balance
    powerful: 'anthropic/claude-3-haiku',             // Claude Haiku (without version)
    free: 'mistralai/mistral-7b-instruct:free',      // Free Mistral
  },
  
  limits: {
    free: {
      dailyRequests: 3,      // 3 messages on Wednesdays only
      introMessages: 5,      // Generous intro experience
      maxInputLength: 500,   // Allow longer inputs
      maxOutputTokens: 150,  // Concise responses
    },
    premium: {
      dailyRequests: 15,     // 15 message exchanges per day as per requirements
      maxInputLength: 1000,  // Much more flexible
      maxOutputTokens: 200,  // Still concise but with more detail
    }
  },
  
  // Note: The actual system prompt is in promptManager.ts
  // This is kept for backwards compatibility
  SYSTEM_PROMPT: `You are a caring wellness coach for a mobile stretching app called FlexBreak. Be concise and to the point. You are a helpful assistant that can 
  help users with their overall wellness in physical, mental and work related stress. Be motivational and always provide 
  insights to the users prompts. If the user describes severe pain, injury, or thoughts of self-harm, encourage them to 
  consult a qualified professional immediately and do NOT give detailed medical advice.
 `
};

// Export individual config values
export default {
  OPENROUTER_API_KEY,
  GOOGLE_SPEECH_API_KEY: GOOGLE_SPEECH_API_KEY || '',
  HTTP_REFERER: APP_URL || 'https://flexbreak.app',
};