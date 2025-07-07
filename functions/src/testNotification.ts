import { onCall } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import axios from 'axios';

export const testExpoNotification = onCall(
  {
    region: 'us-central1',
  },
  async (request) => {
    const { token } = request.data;
    
    logger.info('Testing Expo notification to:', token);
    
    try {
      // Send a simple test notification
      const response = await axios.post(
        'https://exp.host/--/api/v2/push/send',
        [{
          to: token,
          title: 'Test Notification',
          body: 'This is a test from Firebase Cloud Function',
          sound: 'default',
          priority: 'high',
          data: { test: true },
        }],
        {
          headers: {
            'Accept': 'application/json',
            'Accept-Encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
        }
      );
      
      logger.info('Expo response:', JSON.stringify(response.data));
      
      return {
        success: true,
        response: response.data
      };
    } catch (error: any) {
      logger.error('Test notification error:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }
);