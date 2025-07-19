import { onCall, HttpsError } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import * as admin from "firebase-admin";
import axios from "axios";

// Define environment variables with defaults to prevent deployment errors
const openRouterApiKey = defineString("OPENROUTER_API_KEY", { default: "" });
const groqApiKey = defineString("GROQ_API_KEY", { default: "" });

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
  };
  userId?: string;
}

interface ChatResponse {
  success: boolean;
  data?: string;
  error?: string;
}

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Secure AI chat endpoint for FlexBreak
 * Keeps API keys server-side only
 */
export const aiChat = onCall(async (request): Promise<ChatResponse> => {
  const { messages, options } = request.data as ChatRequest;
  
  // For anonymous users, create a simple identifier for rate limiting
  const userId = request.auth?.uid || 'anonymous';

  // Validate input
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    throw new HttpsError('invalid-argument', 'Messages array is required');
  }

  // Validate message format
  for (const message of messages) {
    if (!message.role || !message.content || !['system', 'user', 'assistant'].includes(message.role)) {
      throw new HttpsError(
        'invalid-argument', 
        'Invalid messages format'
      );
    }
  }

  // Rate limiting check (simplified for anonymous users)
  let dailyLimit = 10; // Default for anonymous users
  let requestCount = 0;
  
  if (userId !== 'anonymous') {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data() || {};
    const isPremium = userData.isPremium || false;
    dailyLimit = isPremium ? 50 : 10;
    requestCount = userData.dailyAIRequests || 0;
    
    if (requestCount >= dailyLimit) {
      throw new HttpsError(
        'resource-exhausted', 
        `Daily limit reached. ${isPremium ? 'Premium' : 'Free'} users can make ${dailyLimit} requests per day.`
      );
    }
  }

  try {
    // Try OpenRouter first
    let response = await callOpenRouter(messages, options);
    
    // If OpenRouter fails, try Groq as fallback
    if (!response.success && groqApiKey.value()) {
      console.log('OpenRouter failed, attempting Groq fallback...');
      response = await callGroq(messages, options);
    }

    if (!response.success) {
      throw new Error('All AI services failed');
    }

    // Update user's daily request count (only for authenticated users)
    if (userId !== 'anonymous') {
      await admin.firestore().collection('users').doc(userId).update({
        dailyAIRequests: admin.firestore.FieldValue.increment(1),
        lastAIRequestDate: admin.firestore.Timestamp.now()
      });
    }

    return response;

  } catch (error: any) {
    console.error('AI Chat Error:', error);
    throw new HttpsError('internal', error.message || 'AI service error');
  }
});

async function callOpenRouter(messages: ChatMessage[], options?: any): Promise<ChatResponse> {
  const apiKey = openRouterApiKey.value();
  
  if (!apiKey) {
    return { success: false, error: 'OpenRouter API key not configured' };
  }

  try {
    const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
      model: options?.model || 'meta-llama/llama-3.1-8b-instruct:free',
      messages: messages,
      max_tokens: options?.maxTokens || 500,
      temperature: options?.temperature || 0.7,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://flexbreak.app',
        'X-Title': 'FlexBreak AI Wellness'
      }
    });

    if (response.data && response.data.choices && response.data.choices[0]) {
      return {
        success: true,
        data: response.data.choices[0].message.content
      };
    }

    return { success: false, error: 'Invalid response from OpenRouter' };
  } catch (error: any) {
    console.error('OpenRouter Error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

async function callGroq(messages: ChatMessage[], options?: any): Promise<ChatResponse> {
  const apiKey = groqApiKey.value();
  
  if (!apiKey) {
    return { success: false, error: 'Groq API key not configured' };
  }

  try {
    const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: options?.model || 'llama3-8b-8192',
      messages: messages,
      max_tokens: options?.maxTokens || 500,
      temperature: options?.temperature || 0.7,
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.choices && response.data.choices[0]) {
      return {
        success: true,
        data: response.data.choices[0].message.content
      };
    }

    return { success: false, error: 'Invalid response from Groq' };
  } catch (error: any) {
    console.error('Groq Error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}