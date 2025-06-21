import AsyncStorage from '@react-native-async-storage/async-storage';
import { KEYS } from '../storageService';

// Data retention periods (in days)
export const RETENTION_PERIODS = {
  conversationHistory: 90,      // 90 days for conversation history
  usageMetrics: 180,            // 180 days for usage metrics
  effectivenessData: 365,       // 1 year for effectiveness tracking
  anonymousData: 30,            // 30 days for anonymous user data
  deletedUserGracePeriod: 30,  // 30 days grace period after deletion request
};

// Data types that can be deleted
export const DATA_TYPES = {
  CONVERSATIONS: 'conversations',
  USAGE_METRICS: 'usage_metrics',
  EFFECTIVENESS: 'effectiveness',
  USER_PREFERENCES: 'preferences',
  ALL: 'all'
};

export class DataRetentionService {
  /**
   * Clean up old data based on retention policies
   * Should be called periodically (e.g., daily)
   */
  async performDataCleanup(): Promise<void> {
    try {
      console.log('Starting data retention cleanup...');
      
      await this.cleanupConversations();
      await this.cleanupUsageMetrics();
      await this.cleanupEffectivenessData();
      await this.cleanupAnonymousData();
      
      console.log('Data retention cleanup completed');
    } catch (error) {
      console.error('Error during data cleanup:', error);
    }
  }

  /**
   * Clean up old conversation history
   */
  private async cleanupConversations(): Promise<void> {
    const allKeys = await AsyncStorage.getAllKeys();
    const conversationKeys = allKeys.filter(key => key.includes('@ai_wellness_conversations_'));
    
    for (const key of conversationKeys) {
      try {
        const data = await AsyncStorage.getItem(key);
        if (!data) continue;
        
        const conversations = JSON.parse(data);
        const cutoffDate = Date.now() - (RETENTION_PERIODS.conversationHistory * 24 * 60 * 60 * 1000);
        
        // Filter out old conversations
        const recentConversations = conversations.filter((conv: any) => 
          conv.timestamp > cutoffDate
        );
        
        if (recentConversations.length < conversations.length) {
          await AsyncStorage.setItem(key, JSON.stringify(recentConversations));
          console.log(`Cleaned up ${conversations.length - recentConversations.length} old conversations`);
        }
      } catch (error) {
        console.error(`Error cleaning up conversations for ${key}:`, error);
      }
    }
  }

  /**
   * Clean up old usage metrics
   */
  private async cleanupUsageMetrics(): Promise<void> {
    const allKeys = await AsyncStorage.getAllKeys();
    const usageKeys = allKeys.filter(key => key.includes('@ai_usage_'));
    
    const cutoffDate = Date.now() - (RETENTION_PERIODS.usageMetrics * 24 * 60 * 60 * 1000);
    
    for (const key of usageKeys) {
      try {
        // Extract date from key format: @ai_usage_userId_dateString
        const parts = key.split('_');
        const dateStr = parts[parts.length - 1];
        const keyDate = new Date(dateStr).getTime();
        
        if (keyDate < cutoffDate) {
          await AsyncStorage.removeItem(key);
          console.log(`Removed old usage metric: ${key}`);
        }
      } catch (error) {
        console.error(`Error cleaning up usage metrics for ${key}:`, error);
      }
    }
  }

  /**
   * Clean up old effectiveness data
   */
  private async cleanupEffectivenessData(): Promise<void> {
    const allKeys = await AsyncStorage.getAllKeys();
    const effectivenessKeys = allKeys.filter(key => key.includes(KEYS.AI_WELLNESS.EFFECTIVENESS_TRACKING));
    
    for (const key of effectivenessKeys) {
      try {
        const data = await AsyncStorage.getItem(key);
        if (!data) continue;
        
        const tracking = JSON.parse(data);
        const cutoffDate = Date.now() - (RETENTION_PERIODS.effectivenessData * 24 * 60 * 60 * 1000);
        
        // Filter out old tracking data
        const recentTracking = tracking.filter((item: any) => 
          item.timestamp > cutoffDate
        );
        
        if (recentTracking.length < tracking.length) {
          await AsyncStorage.setItem(key, JSON.stringify(recentTracking));
          console.log(`Cleaned up ${tracking.length - recentTracking.length} old effectiveness records`);
        }
      } catch (error) {
        console.error(`Error cleaning up effectiveness data for ${key}:`, error);
      }
    }
  }

  /**
   * Clean up anonymous user data
   */
  private async cleanupAnonymousData(): Promise<void> {
    const allKeys = await AsyncStorage.getAllKeys();
    const anonymousKeys = allKeys.filter(key => 
      key.includes('anonymous') && 
      (key.includes('@ai_wellness') || key.includes('@ai_usage'))
    );
    
    const cutoffDate = Date.now() - (RETENTION_PERIODS.anonymousData * 24 * 60 * 60 * 1000);
    
    for (const key of anonymousKeys) {
      try {
        // For anonymous users, we'll be more aggressive with cleanup
        await AsyncStorage.removeItem(key);
        console.log(`Removed anonymous data: ${key}`);
      } catch (error) {
        console.error(`Error cleaning up anonymous data for ${key}:`, error);
      }
    }
  }

  /**
   * Export user data for GDPR compliance
   */
  async exportUserData(userId: string): Promise<any> {
    const userData: any = {
      exportDate: new Date().toISOString(),
      userId,
      conversations: [],
      usage: {},
      effectiveness: {},
      preferences: {}
    };

    try {
      // Export conversations
      const conversationKey = `@ai_wellness_conversations_${userId}`;
      const conversations = await AsyncStorage.getItem(conversationKey);
      if (conversations) {
        userData.conversations = JSON.parse(conversations);
      }

      // Export usage metrics
      const allKeys = await AsyncStorage.getAllKeys();
      const usageKeys = allKeys.filter(key => key.includes(`@ai_usage_${userId}_`));
      for (const key of usageKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          const date = key.split('_').pop();
          userData.usage[date!] = value;
        }
      }

      // Export effectiveness tracking
      const effectivenessKey = `${KEYS.AI_WELLNESS.EFFECTIVENESS_TRACKING}_${userId}`;
      const effectiveness = await AsyncStorage.getItem(effectivenessKey);
      if (effectiveness) {
        userData.effectiveness = JSON.parse(effectiveness);
      }

      // Export patterns/preferences
      const patternsKey = `${KEYS.AI_WELLNESS.PATTERNS}_${userId}`;
      const patterns = await AsyncStorage.getItem(patternsKey);
      if (patterns) {
        userData.preferences = JSON.parse(patterns);
      }

      return userData;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw error;
    }
  }

  /**
   * Delete all data for a specific user
   */
  async deleteUserData(userId: string, dataType: string = DATA_TYPES.ALL): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const userKeys = allKeys.filter(key => key.includes(userId));
      
      for (const key of userKeys) {
        let shouldDelete = false;
        
        switch (dataType) {
          case DATA_TYPES.CONVERSATIONS:
            shouldDelete = key.includes('conversations');
            break;
          case DATA_TYPES.USAGE_METRICS:
            shouldDelete = key.includes('usage');
            break;
          case DATA_TYPES.EFFECTIVENESS:
            shouldDelete = key.includes('effectiveness') || key.includes('patterns');
            break;
          case DATA_TYPES.USER_PREFERENCES:
            shouldDelete = key.includes('patterns') || key.includes('name');
            break;
          case DATA_TYPES.ALL:
            shouldDelete = true;
            break;
        }
        
        if (shouldDelete) {
          await AsyncStorage.removeItem(key);
          console.log(`Deleted user data: ${key}`);
        }
      }
      
      // Log deletion request for audit trail
      await this.logDeletionRequest(userId, dataType);
      
    } catch (error) {
      console.error('Error deleting user data:', error);
      throw error;
    }
  }

  /**
   * Log deletion request for audit purposes
   */
  private async logDeletionRequest(userId: string, dataType: string): Promise<void> {
    try {
      const logKey = '@data_deletion_log';
      const existingLog = await AsyncStorage.getItem(logKey);
      const log = existingLog ? JSON.parse(existingLog) : [];
      
      log.push({
        userId,
        dataType,
        timestamp: Date.now(),
        date: new Date().toISOString()
      });
      
      // Keep only last 1000 entries
      if (log.length > 1000) {
        log.splice(0, log.length - 1000);
      }
      
      await AsyncStorage.setItem(logKey, JSON.stringify(log));
    } catch (error) {
      console.error('Error logging deletion request:', error);
    }
  }

  /**
   * Get data retention policy information
   */
  getRetentionPolicy(): any {
    return {
      policy: 'FlexBreak AI Wellness Data Retention Policy',
      version: '1.0',
      lastUpdated: '2024-01-21',
      retentionPeriods: RETENTION_PERIODS,
      userRights: {
        access: 'Users can request a copy of their data at any time',
        deletion: 'Users can request deletion of their data at any time',
        portability: 'Data can be exported in JSON format',
        correction: 'Users can update their preferences through the app'
      },
      dataTypes: {
        conversations: 'AI wellness check-in conversations',
        usage: 'Daily usage metrics and limits',
        effectiveness: 'Action effectiveness tracking',
        preferences: 'User preferences and patterns'
      },
      contact: 'privacy@flexbreak.app'
    };
  }
}

export default new DataRetentionService();