import { APP_URL } from '@env';

export const AI_CONFIG = {
  // Security configuration - API keys now secure on Firebase Functions
  useSecureMode: true, // Always true - using Firebase Functions
  
  openRouter: {
    // API key now securely managed by Firebase Functions
    appUrl: APP_URL || 'https://flexbreak.app',
    defaultModel: 'meta-llama/llama-3.1-8b-instruct:free', // Default model
    maxRetries: 3,
    timeout: 30000, // 30 seconds
  },
  
  groq: {
    // API key now securely managed by Firebase Functions
    defaultModel: 'llama3-8b-8192', // Groq fallback model
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

// Export individual config values (API keys now secure on Firebase Functions)
export default {
  // API keys removed - now securely managed by Firebase Functions
  HTTP_REFERER: APP_URL || 'https://flexbreak.app',
};