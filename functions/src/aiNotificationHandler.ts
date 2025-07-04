/**
 * AI Notification Handler Cloud Function
 * Processes AI wellness notification responses when app is killed/background
 */

import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import * as admin from 'firebase-admin';
import axios from 'axios';

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

// Define the request/response types
interface AINotificationRequest {
  userId: string;
  userMessage: string;
  fcmToken: string;
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

/**
 * Cloud Function to handle AI notification responses
 * This runs on Firebase servers when user replies to a notification
 */
export const handleAINotificationResponse = onCall(
  {
    secrets: ['OPENROUTER_API_KEY'],
    region: 'us-central1',
  },
  async (request) => {
    const data = request.data as AINotificationRequest;
    
    try {
      // Validate request
      if (!data.userId || !data.userMessage || !data.fcmToken) {
        throw new HttpsError(
          'invalid-argument',
          'Missing required fields: userId, userMessage, or fcmToken'
        );
      }

      logger.info('Processing AI notification response', {
        userId: data.userId,
        messageLength: data.userMessage?.length || 0,
      });

      // Get user's premium status from Firestore
      const userDoc = await db.collection('users').doc(data.userId).get();
      const isPremium = userDoc.exists ? userDoc.data()?.isPremium || false : false;

      // Get API key from secret
      const openRouterApiKey = process.env.OPENROUTER_API_KEY;
      if (!openRouterApiKey) {
        throw new HttpsError(
          'failed-precondition',
          'OpenRouter API key not configured'
        );
      }

      // Build conversation context
      const messages = [
        {
          role: 'system',
          content: `You are an AI wellness coach integrated into the FlexBreak app. 
Keep responses concise (under 180 characters) as they'll be shown in notifications. 
Be supportive, encouraging, and actionable. Focus on stretching, movement, and wellness.
${isPremium ? 'This is a premium user - provide personalized advice.' : 'This is a free user - keep advice general.'}`
        },
        ...(data.conversationHistory || []),
        {
          role: 'user',
          content: data.userMessage
        }
      ];

      // Make API call to OpenRouter
      const aiResponse = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'mistralai/mistral-7b-instruct:free',
          messages,
          temperature: 0.7,
          max_tokens: 100,
        },
        {
          headers: {
            'Authorization': `Bearer ${openRouterApiKey}`,
            'HTTP-Referer': 'https://flexbreak.app',
            'X-Title': 'FlexBreak AI Wellness',
            'Content-Type': 'application/json',
          },
        }
      );

      const aiResponseText = aiResponse.data.choices?.[0]?.message?.content;

      // Check if we got a valid response
      if (!aiResponseText || typeof aiResponseText !== 'string') {
        throw new Error('No valid response from AI service');
      }

      // Format response for notification (ensure it's not too long)
      let formattedResponse = aiResponseText.trim();
      if (!formattedResponse) {
        throw new Error('AI response is empty after trimming');
      }
      
      if (formattedResponse.length > 180) {
        const lastPunctuation = Math.max(
          formattedResponse.lastIndexOf('.', 180),
          formattedResponse.lastIndexOf('!', 180),
          formattedResponse.lastIndexOf('?', 180)
        );
        
        if (lastPunctuation > 120) {
          formattedResponse = formattedResponse.substring(0, lastPunctuation + 1);
        } else {
          formattedResponse = formattedResponse.substring(0, 177) + '...';
        }
      }

      // Send push notification with AI response
      const message: admin.messaging.Message = {
        token: data.fcmToken,
        notification: {
          title: 'AI Flex Coach 🤖',
          body: formattedResponse,
        },
        data: {
          type: 'ai_wellness_response',
          userId: data.userId,
          timestamp: Date.now().toString(),
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              category: 'AI_WELLNESS_SIMPLE',
              'mutable-content': 1,
            },
          },
        },
        android: {
          notification: {
            channelId: 'ai_wellness',
            priority: 'high',
            sound: 'default',
          },
        },
      };

      const messageId = await messaging.send(message);
      logger.info('AI response notification sent', { messageId });

      // Store conversation in Firestore for persistence
      await db.collection('ai_conversations').doc(data.userId).set(
        {
          lastMessage: {
            userMessage: data.userMessage,
            aiResponse: formattedResponse,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          },
          conversationHistory: admin.firestore.FieldValue.arrayUnion({
            user: data.userMessage,
            assistant: formattedResponse,
            timestamp: Date.now(),
          }),
        },
        { merge: true }
      );

      return {
        success: true,
        response: formattedResponse,
        messageId,
      };

    } catch (error) {
      logger.error('Error processing AI notification response', error);
      
      // Send error notification
      try {
        if (data?.fcmToken) {
          await messaging.send({
            token: data.fcmToken,
            notification: {
              title: 'AI Flex Coach 🤖',
              body: "I'm having trouble connecting right now. Please try again later or open the app.",
            },
          });
        }
      } catch (notifError) {
        logger.error('Failed to send error notification', notifError);
      }

      throw new HttpsError(
        'internal',
        'Failed to process AI response'
      );
    }
  }
);

/**
 * HTTP endpoint for handling notification responses (alternative to onCall)
 * This can be triggered directly from notification actions
 */
export const handleAINotificationResponseHTTP = onRequest(
  {
    secrets: ['OPENROUTER_API_KEY'],
    region: 'us-central1',
  },
  async (req, res) => {
    // Enable CORS
    res.set('Access-Control-Allow-Origin', '*');
    
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Methods', 'POST');
      res.set('Access-Control-Allow-Headers', 'Content-Type');
      res.set('Access-Control-Max-Age', '3600');
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    try {
      // Extract the data from request body
      const data = req.body as AINotificationRequest;
      
      // Validate request
      if (!data.userId || !data.userMessage || !data.fcmToken) {
        res.status(400).json({ 
          error: 'Missing required fields: userId, userMessage, or fcmToken' 
        });
        return;
      }

      // Call the same logic as the onCall function
      const userDoc = await db.collection('users').doc(data.userId).get();
      const isPremium = userDoc.exists ? userDoc.data()?.isPremium || false : false;

      const openRouterApiKey = process.env.OPENROUTER_API_KEY;
      if (!openRouterApiKey) {
        res.status(500).json({ error: 'OpenRouter API key not configured' });
        return;
      }

      const messages = [
        {
          role: 'system',
          content: `You are an AI wellness coach integrated into the FlexBreak app. 
Keep responses concise (under 180 characters) as they'll be shown in notifications. 
Be supportive, encouraging, and actionable. Focus on stretching, movement, and wellness.
${isPremium ? 'This is a premium user - provide personalized advice.' : 'This is a free user - keep advice general.'}`
        },
        ...(data.conversationHistory || []),
        {
          role: 'user',
          content: data.userMessage
        }
      ];

      const aiResponse = await axios.post(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          model: 'mistralai/mistral-7b-instruct:free',
          messages,
          temperature: 0.7,
          max_tokens: 100,
        },
        {
          headers: {
            'Authorization': `Bearer ${openRouterApiKey}`,
            'HTTP-Referer': 'https://flexbreak.app',
            'X-Title': 'FlexBreak AI Wellness',
            'Content-Type': 'application/json',
          },
        }
      );

      const aiResponseText = aiResponse.data.choices?.[0]?.message?.content;
      if (!aiResponseText || typeof aiResponseText !== 'string') {
        throw new Error('No valid response from AI service');
      }

      let formattedResponse = aiResponseText.trim();
      if (!formattedResponse) {
        throw new Error('AI response is empty after trimming');
      }
      
      if (formattedResponse.length > 180) {
        const lastPunctuation = Math.max(
          formattedResponse.lastIndexOf('.', 180),
          formattedResponse.lastIndexOf('!', 180),
          formattedResponse.lastIndexOf('?', 180)
        );
        
        if (lastPunctuation > 120) {
          formattedResponse = formattedResponse.substring(0, lastPunctuation + 1);
        } else {
          formattedResponse = formattedResponse.substring(0, 177) + '...';
        }
      }

      const message: admin.messaging.Message = {
        token: data.fcmToken,
        notification: {
          title: 'AI Flex Coach 🤖',
          body: formattedResponse,
        },
        data: {
          type: 'ai_wellness_response',
          userId: data.userId,
          timestamp: Date.now().toString(),
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              category: 'AI_WELLNESS_SIMPLE',
              'mutable-content': 1,
            },
          },
        },
        android: {
          notification: {
            channelId: 'ai_wellness',
            priority: 'high',
            sound: 'default',
          },
        },
      };

      const messageId = await messaging.send(message);
      await db.collection('ai_conversations').doc(data.userId).set(
        {
          lastMessage: {
            userMessage: data.userMessage,
            aiResponse: formattedResponse,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
          },
          conversationHistory: admin.firestore.FieldValue.arrayUnion({
            user: data.userMessage,
            assistant: formattedResponse,
            timestamp: Date.now(),
          }),
        },
        { merge: true }
      );

      res.json({
        success: true,
        response: formattedResponse,
        messageId,
      });
    } catch (error) {
      logger.error('Error in HTTP handler:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);