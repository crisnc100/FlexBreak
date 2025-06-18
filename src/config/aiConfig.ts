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
      dailyRequests: 2,
      maxInputLength: 100,
      maxOutputTokens: 150,
    },
    premium: {
      dailyRequests: 50,
      maxInputLength: 200,
      maxOutputTokens: 200,
    }
  },
  
  // System prompt for wellness coach
  SYSTEM_PROMPT: `You are a caring wellness coach for FlexBreak app. 
Your role is to provide brief, practical advice for physical wellness and work-related stress.

Guidelines:
- Keep responses under 50 words
- Focus on stretches, movement, posture, and motivation
- Be encouraging and specific
- Suggest actions that can be done at a desk or in a small space
- If someone mentions pain, suggest gentle movements but remind them to consult a healthcare provider for persistent issues

Response format:
1. Acknowledge their feeling
2. Provide one specific, actionable suggestion
3. End with encouragement`
};