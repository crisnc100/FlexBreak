import { OPENROUTER_API_KEY, APP_URL } from '@env';

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
    fast: 'mistralai/mistral-7b-instruct:free',     // Free and fast
    balanced: 'meta-llama/llama-3-8b-instruct:free', // Free Llama 3
    powerful: 'anthropic/claude-3-haiku',            // Cheap but powerful ($0.25/1M tokens)
    free: 'mistralai/mistral-7b-instruct:free',     // Reliable free option
  },
  
  limits: {
    free: {
      dailyRequests: 3,      // 3 messages on Wednesdays only
      introMessages: 5,      // Generous intro experience
      maxInputLength: 150,   // Slightly longer inputs allowed
      maxOutputTokens: 150,
    },
    premium: {
      dailyRequests: 15,     // 15 message exchanges per day as per requirements
      maxInputLength: 300,
      maxOutputTokens: 200,
    }
  },
  
  // Note: The actual system prompt is in promptTemplates.ts
  // This is kept for backwards compatibility
  SYSTEM_PROMPT: `You are a caring wellness coach for FlexBreak app.`
};