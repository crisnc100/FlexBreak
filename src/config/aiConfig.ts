import { OPENROUTER_API_KEY, APP_URL } from '@env';

export const AI_CONFIG = {
  openRouter: {
    apiKey: OPENROUTER_API_KEY,
    baseURL: 'https://openrouter.ai/api/v1/chat/completions',
    appUrl: APP_URL || 'https://flexbreak.app',
    defaultModel: 'openai/gpt-3.5-turbo',
    maxRetries: 3,
    timeout: 30000, // 30 seconds
  },
  
  models: {
    fast: 'openai/gpt-3.5-turbo',
    balanced: 'anthropic/claude-instant-v1',
    powerful: 'openai/gpt-4-turbo-preview',
    free: 'meta-llama/llama-2-70b-chat',
  },
  
  limits: {
    free: {
      dailyRequests: 3,      // Increased from 2 to 3 for better user experience
      introMessages: 5,      // Generous intro experience
      maxInputLength: 150,   // Slightly longer inputs allowed
      maxOutputTokens: 150,
    },
    premium: {
      dailyRequests: 100,    // Effectively unlimited
      maxInputLength: 300,
      maxOutputTokens: 200,
    }
  },
  
  // Note: The actual system prompt is in promptTemplates.ts
  // This is kept for backwards compatibility
  SYSTEM_PROMPT: `You are a caring wellness coach for FlexBreak app.`
};