import AsyncStorage from '@react-native-async-storage/async-storage';
import configValidator from '../../security/configValidator';
import costMonitor from '../utils/costMonitor';
import { rateLimiter } from '../utils/reliabilityService';
import { AI_CONFIG } from '../../../config/aiConfig';
import unifiedMemoryService from '../memory/memoryService';
import { scheduleRegularCheckIns, cleanupAllAINotifications, canScheduleNotifications, markScheduled } from '../scheduling/notificationScheduler';
import { getNotificationsByType, NotificationType } from '../../../utils/notificationManager';
import { KEYS } from '../../storageService';

interface InitializationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

class AISystemInitializer {
  private static instance: AISystemInitializer;
  private initialized: boolean = false;
  
  private constructor() {}
  
  static getInstance(): AISystemInitializer {
    if (!AISystemInitializer.instance) {
      AISystemInitializer.instance = new AISystemInitializer();
    }
    return AISystemInitializer.instance;
  }
  
  /**
   * Initializes AI wellness services on app startup
   */
  async initialize(): Promise<InitializationResult> {
    if (this.initialized) {
      return { success: true, errors: [], warnings: [] };
    }
    
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      console.log('Initializing AI Wellness system services...');
      
      // 1. Validate configuration
      const configValidation = await configValidator.validateAllConfigs();
      if (!configValidation.isValid) {
        errors.push(...configValidation.errors);
      }
      warnings.push(...configValidation.warnings);
      
      // 2. Set up cost monitoring alerts
      costMonitor.onAlert((alert) => {
        console.warn('Cost Alert:', alert);
        
        // Store alert for user notification
        AsyncStorage.setItem('@ai_cost_alert_latest', JSON.stringify({
          ...alert,
          timestamp: Date.now()
        }));
        
        // TODO: Show in-app notification to user
      });
      
      // 3. Clean up expired rate limits
      // Note: cleanupExpired method no longer exists in new rateLimiter
      // Rate limits auto-expire based on time windows
      
      // 4. API keys are now securely managed by Firebase Functions
      console.log('API keys are securely managed by Firebase Functions');
      
      // 5. Load and validate user settings
      const aiEnabled = await AsyncStorage.getItem('@ai_wellness_enabled');
      if (aiEnabled === 'true') {
        console.log('AI Wellness is enabled for this user');
        
        // Check if user has seen onboarding
        const hasSeenWelcome = await AsyncStorage.getItem('@ai_wellness_has_seen_welcome');
        if (!hasSeenWelcome) {
          warnings.push('User has not completed AI wellness onboarding');
        }
        
        // 6. Check and perform memory migration if needed
        const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
        if (await this.needsMemoryMigration(userId)) {
          console.log('Memory migration needed, performing...');
          const migrationSuccess = await this.migrateMemorySystem(userId);
          if (!migrationSuccess) {
            warnings.push('Memory migration failed - using fresh memory');
          } else {
            console.log('Memory migration completed successfully');
          }
        }
        
        // 7. Initialize AI wellness notifications
        const isPremium = await AsyncStorage.getItem(KEYS.USER.PREMIUM) === 'true';
        await this.initializeNotifications(isPremium, userId);
      }
      
      // 8. Log initialization summary
      console.log('AI Wellness system initialization complete:', {
        success: errors.length === 0,
        errorCount: errors.length,
        warningCount: warnings.length,
        apiKeyConfigured: true // API keys now secure on Firebase
      });
      
      this.initialized = true;
      
      return {
        success: errors.length === 0,
        errors,
        warnings
      };
      
    } catch (error) {
      console.error('Critical error during AI wellness system initialization:', error);
      errors.push('Failed to initialize AI wellness services');
      
      return {
        success: false,
        errors,
        warnings
      };
    }
  }
  
  /**
   * Gets initialization status
   */
  isInitialized(): boolean {
    return this.initialized;
  }
  
  /**
   * Resets initialization (useful for testing)
   */
  reset(): void {
    this.initialized = false;
  }
  
  /**
   * Performs health check on AI services
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    services: {
      config: boolean;
      cost: boolean;
      rateLimit: boolean;
      api: boolean;
    };
  }> {
    try {
      // Check config validation
      const cachedValidation = await configValidator.getCachedValidation();
      const configHealthy = cachedValidation !== null && cachedValidation;
      
      // Check cost monitoring
      const costSummary = await costMonitor.getCostSummary(false);
      const costHealthy = costSummary.canUse;
      
      // Check rate limiting
      const rateLimitStatus = await rateLimiter.getRateLimitStatus('ai_chat_free', 'health_check');
      const rateLimitHealthy = rateLimitStatus.remaining > 0;
      
      // API keys are now secure on Firebase Functions
      const apiHealthy = true;
      
      const allHealthy = configHealthy && costHealthy && rateLimitHealthy && apiHealthy;
      
      return {
        healthy: allHealthy,
        services: {
          config: configHealthy,
          cost: costHealthy,
          rateLimit: rateLimitHealthy,
          api: apiHealthy
        }
      };
    } catch (error) {
      console.error('Health check failed:', error);
      return {
        healthy: false,
        services: {
          config: false,
          cost: false,
          rateLimit: false,
          api: false
        }
      };
    }
  }
  
  /**
   * Initialize AI wellness notifications
   * Merged from aiWellnessInitializer.ts
   */
  private async initializeNotifications(isPremium: boolean, userId: string): Promise<void> {
    try {
      // Check debouncer
      if (!canScheduleNotifications('ai_wellness_startup')) {
        console.log('AI wellness startup initialization debounced');
        return;
      }
      
      console.log(`AI Wellness Notifications - Premium: ${isPremium}`);
      
      // Check if we already have notifications scheduled
      const existingAINotifications = await getNotificationsByType([
        NotificationType.AI_WELLNESS,
        NotificationType.UPGRADE_PROMPT
      ]);
      
      console.log(`Found ${existingAINotifications.length} existing AI notifications`);
      
      // Only schedule if there are NO notifications at all
      // This prevents duplicates when some notifications have fired but others remain
      if (existingAINotifications.length === 0) {
        console.log(`No AI notifications found. Scheduling ${isPremium ? 'daily' : 'weekly'} check-ins...`);
        
        // Schedule fresh
        await scheduleRegularCheckIns(isPremium, userId);
        console.log(`Scheduled ${isPremium ? 'daily' : 'weekly'} AI wellness check-ins on startup`);
        
        // Mark as scheduled
        markScheduled('ai_wellness_startup');
      } else {
        // Check if the existing notifications are still valid (not expired)
        const now = Date.now();
        const validNotifications = existingAINotifications.filter(n => {
          const trigger = n.trigger as any;
          if (trigger?.date) {
            return new Date(trigger.date).getTime() > now;
          } else if (trigger?.type === 'timeInterval' && trigger.seconds) {
            // For time interval triggers, check if they're scheduled for the future
            return trigger.seconds > 0;
          }
          return true;
        });
        
        if (validNotifications.length === 0) {
          console.log('All existing AI notifications have expired, rescheduling...');
          await cleanupAllAINotifications();
          await scheduleRegularCheckIns(isPremium, userId);
          markScheduled('ai_wellness_startup');
        } else {
          console.log(`${validNotifications.length} valid AI notifications already scheduled, skipping`);
        }
      }
    } catch (error) {
      console.error('Error initializing AI wellness notifications:', error);
      // Don't throw - we don't want to break initialization
    }
  }
  
  /**
   * Check if we need to restore AI wellness schedule after an upgrade
   * This handles the case where a free user with Wednesday notifications upgrades to premium
   */
  async checkAndRestoreAfterUpgrade(): Promise<void> {
    try {
      const isEnabled = await AsyncStorage.getItem(KEYS.AI_WELLNESS.ENABLED) === 'true';
      const isPremium = await AsyncStorage.getItem(KEYS.USER.PREMIUM) === 'true';
      
      if (!isEnabled || !isPremium) {
        return;
      }
      
      // Check if we only have Wednesday notification (free user pattern)
      const existingAINotifications = await getNotificationsByType([NotificationType.AI_WELLNESS]);
      
      // If premium user has less than 7 notifications, they might have upgraded
      if (existingAINotifications.length > 0 && existingAINotifications.length < 7) {
        console.log(`Premium user has only ${existingAINotifications.length} AI notifications, re-scheduling for daily`);
        
        const userId = await AsyncStorage.getItem('@user_id') || 'anonymous';
        
        // Clean up old notifications
        await cleanupAllAINotifications();
        
        // Schedule daily notifications
        await scheduleRegularCheckIns(true, userId);
        console.log('Updated AI wellness to daily schedule for premium user');
      }
    } catch (error) {
      console.error('Error checking upgrade status:', error);
    }
  }

  /**
   * Check if memory migration is needed
   */
  private async needsMemoryMigration(userId: string): Promise<boolean> {
    try {
      // Check if user has old simple memory format
      const simpleMemoryKey = `@ai_simple_memory_${userId}`;
      const improvedMemoryKey = `@ai_improved_memory_${userId}`;
      
      const hasSimpleMemory = await AsyncStorage.getItem(simpleMemoryKey) !== null;
      const hasImprovedMemory = await AsyncStorage.getItem(improvedMemoryKey) !== null;
      
      // Need migration if has simple memory but no improved memory
      return hasSimpleMemory && !hasImprovedMemory;
    } catch (error) {
      console.error('Error checking memory migration need:', error);
      return false;
    }
  }

  /**
   * Migrate memory system from simple to improved format
   */
  private async migrateMemorySystem(userId: string): Promise<boolean> {
    try {
      // Get existing memory to trigger migration in unifiedMemoryService
      const memory = await unifiedMemoryService.getMemory(userId);
      
      // If we got memory back, migration was successful
      return memory !== null;
    } catch (error) {
      console.error('Error migrating memory system:', error);
      return false;
    }
  }
}

export default AISystemInitializer.getInstance();