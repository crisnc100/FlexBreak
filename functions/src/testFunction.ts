import { onCall } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';

export const testAIFunction = onCall(
  {
    region: 'us-central1',
    secrets: ['OPENROUTER_API_KEY'],
  },
  async (request) => {
    logger.info('Test function called');
    
    const apiKey = process.env.OPENROUTER_API_KEY;
    logger.info('API key exists:', !!apiKey);
    logger.info('API key length:', apiKey?.length || 0);
    
    return {
      success: true,
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      timestamp: new Date().toISOString()
    };
  }
);