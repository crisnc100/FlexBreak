/**
 * Reliability Service - Unified error handling, retry logic, and rate limiting
 * Merged from: errorHandler.ts, retryUtil.ts, rateLimiter.ts
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_CONFIG } from '../../../config/aiConfig';

// ========== RATE LIMITER ==========

interface RateLimit {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  reason?: string;
  retryAfter?: number;
}

interface RateLimitConfig {
  [key: string]: {
    requests: number;
    windowMs: number;
    errorMessage: string;
  };
}

const RATE_LIMITS: RateLimitConfig = {
  'ai_chat_free': {
    requests: AI_CONFIG.limits.free.dailyRequests,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    errorMessage: 'Daily limit reached for free users. Upgrade to premium for more!'
  },
  'ai_chat_premium': {
    requests: AI_CONFIG.limits.premium.dailyRequests,
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    errorMessage: 'Daily premium limit reached. Try again tomorrow!'
  },
  'voice_transcription': {
    requests: 20,
    windowMs: 60 * 60 * 1000, // 1 hour
    errorMessage: 'Too many voice transcriptions. Please wait a bit.'
  },
  'api_global': {
    requests: 100,
    windowMs: 60 * 1000, // 1 minute
    errorMessage: 'Too many requests. Please slow down.'
  }
};

// ========== ERROR HANDLER ==========

interface ErrorContext {
  retryable: boolean;
  userMessage: string;
  developerMessage: string;
  errorCode?: string;
  suggestedAction?: string;
  metadata?: any;
}

interface ErrorConfig {
  [key: string]: {
    retryable: boolean;
    userMessage: string;
    suggestedAction?: string;
    logLevel: 'error' | 'warn' | 'info';
  };
}

const ERROR_CONFIGS: ErrorConfig = {
  // Network errors
  'NETWORK_ERROR': {
    retryable: true,
    userMessage: 'Connection issue. Please check your internet.',
    suggestedAction: 'Check Connection',
    logLevel: 'warn'
  },
  'TIMEOUT': {
    retryable: true,
    userMessage: 'Request timed out. Trying again...',
    suggestedAction: 'Retry',
    logLevel: 'warn'
  },
  
  // API errors
  'INVALID_API_KEY': {
    retryable: false,
    userMessage: 'Configuration error. Please contact support.',
    logLevel: 'error'
  },
  'QUOTA_EXCEEDED': {
    retryable: false,
    userMessage: 'Service limit reached. Please try again later.',
    suggestedAction: 'Upgrade Plan',
    logLevel: 'warn'
  },
  'RATE_LIMITED': {
    retryable: true,
    userMessage: 'Too many requests. Please wait a moment.',
    suggestedAction: 'Wait',
    logLevel: 'info'
  },
  
  // Service errors
  'GOOGLE_SPEECH_ERROR': {
    retryable: true,
    userMessage: 'Voice recognition temporarily unavailable.',
    suggestedAction: 'Type Instead',
    logLevel: 'warn'
  },
  'OPENROUTER_ERROR': {
    retryable: true,
    userMessage: 'AI service temporarily unavailable.',
    suggestedAction: 'Try Again',
    logLevel: 'warn'
  },
  
  // Default
  'UNKNOWN_ERROR': {
    retryable: true,
    userMessage: 'Something went wrong. Please try again.',
    suggestedAction: 'Retry',
    logLevel: 'error'
  }
};

// ========== RETRY UTIL ==========

interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  backoffMultiplier?: number;
  timeout?: number;
  shouldRetry?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: any;
  attempts: number;
}

// ========== RELIABILITY SERVICE CLASS ==========

class ReliabilityService {
  // Rate Limiter Storage
  private rateLimitPrefix = '@rate_limit_';
  
  // ===== RATE LIMITER METHODS =====
  
  async checkLimit(limitType: string, identifier: string = 'global'): Promise<RateLimit> {
    const config = RATE_LIMITS[limitType];
    if (!config) {
      console.warn(`Unknown rate limit type: ${limitType}`);
      return { allowed: true, remaining: 999, resetTime: 0 };
    }
    
    const key = `${this.rateLimitPrefix}${limitType}_${identifier}`;
    const now = Date.now();
    
    try {
      const stored = await AsyncStorage.getItem(key);
      let data = stored ? JSON.parse(stored) : { count: 0, resetTime: now + config.windowMs };
      
      // Reset if window expired
      if (now >= data.resetTime) {
        data = { count: 0, resetTime: now + config.windowMs };
      }
      
      const allowed = data.count < config.requests;
      const remaining = Math.max(0, config.requests - data.count);
      
      if (allowed) {
        data.count++;
        await AsyncStorage.setItem(key, JSON.stringify(data));
      }
      
      return {
        allowed,
        remaining,
        resetTime: data.resetTime,
        reason: allowed ? undefined : config.errorMessage,
        retryAfter: allowed ? undefined : Math.ceil((data.resetTime - now) / 1000)
      };
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Fail open - allow request if rate limiter fails
      return { allowed: true, remaining: 999, resetTime: 0 };
    }
  }
  
  async resetLimit(limitType: string, identifier: string = 'global'): Promise<void> {
    const key = `${this.rateLimitPrefix}${limitType}_${identifier}`;
    await AsyncStorage.removeItem(key);
  }
  
  async getRateLimitStatus(limitType: string, identifier: string = 'global'): Promise<RateLimit> {
    const config = RATE_LIMITS[limitType];
    if (!config) {
      return { allowed: true, remaining: 999, resetTime: 0 };
    }
    
    const key = `${this.rateLimitPrefix}${limitType}_${identifier}`;
    const now = Date.now();
    
    try {
      const stored = await AsyncStorage.getItem(key);
      const data = stored ? JSON.parse(stored) : { count: 0, resetTime: now + config.windowMs };
      
      const count = now >= data.resetTime ? 0 : data.count;
      const remaining = Math.max(0, config.requests - count);
      
      return {
        allowed: count < config.requests,
        remaining,
        resetTime: data.resetTime
      };
    } catch (error) {
      console.error('Rate limit status error:', error);
      return { allowed: true, remaining: 999, resetTime: 0 };
    }
  }
  
  // ===== ERROR HANDLER METHODS =====
  
  async handleError(error: any, context: string): Promise<ErrorContext> {
    console.error(`[${context}] Error:`, error);
    
    // Determine error type
    const errorType = this.categorizeError(error);
    const config = ERROR_CONFIGS[errorType] || ERROR_CONFIGS.UNKNOWN_ERROR;
    
    // Log based on severity
    this.logError(error, context, config.logLevel);
    
    // Track error metrics
    await this.trackError(errorType, context);
    
    return {
      retryable: config.retryable,
      userMessage: config.userMessage,
      developerMessage: error.message || 'Unknown error',
      errorCode: errorType,
      suggestedAction: config.suggestedAction,
      metadata: {
        context,
        timestamp: Date.now(),
        stack: error.stack
      }
    };
  }
  
  private categorizeError(error: any): string {
    const message = error.message?.toLowerCase() || '';
    const code = error.code?.toLowerCase() || '';
    
    // Network errors
    if (code === 'network_error' || message.includes('network')) {
      return 'NETWORK_ERROR';
    }
    if (message.includes('timeout') || code === 'econnaborted') {
      return 'TIMEOUT';
    }
    
    // API errors
    if (message.includes('invalid api key') || code === 'invalid_api_key') {
      return 'INVALID_API_KEY';
    }
    if (message.includes('quota') || message.includes('limit exceeded')) {
      return 'QUOTA_EXCEEDED';
    }
    if (error.status === 429 || message.includes('rate limit')) {
      return 'RATE_LIMITED';
    }
    
    // Service-specific errors
    if (message.includes('google') || message.includes('speech')) {
      return 'GOOGLE_SPEECH_ERROR';
    }
    if (message.includes('openrouter') || message.includes('completion')) {
      return 'OPENROUTER_ERROR';
    }
    
    return 'UNKNOWN_ERROR';
  }
  
  private logError(error: any, context: string, level: 'error' | 'warn' | 'info') {
    const logData = {
      context,
      message: error.message,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };
    
    switch (level) {
      case 'error':
        console.error('[ERROR]', logData);
        break;
      case 'warn':
        console.warn('[WARNING]', logData);
        break;
      case 'info':
        console.info('[INFO]', logData);
        break;
    }
  }
  
  private async trackError(errorType: string, context: string): Promise<void> {
    try {
      const key = '@error_metrics';
      const stored = await AsyncStorage.getItem(key);
      const metrics = stored ? JSON.parse(stored) : {};
      
      const errorKey = `${errorType}_${context}`;
      metrics[errorKey] = (metrics[errorKey] || 0) + 1;
      metrics.lastError = {
        type: errorType,
        context,
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(key, JSON.stringify(metrics));
    } catch (err) {
      // Silently fail - don't throw errors from error handler
      console.debug('Error tracking failed:', err);
    }
  }
  
  // ===== RETRY UTIL METHODS =====
  
  async withRetry<T>(
    operation: () => Promise<T>,
    context: string,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      backoffMultiplier = 2,
      timeout = 30000,
      shouldRetry = (error) => {
        const errorContext = this.categorizeError(error);
        return ERROR_CONFIGS[errorContext]?.retryable ?? true;
      },
      onRetry
    } = options;
    
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Operation timed out')), timeout);
        });
        
        // Race between operation and timeout
        const result = await Promise.race([
          operation(),
          timeoutPromise
        ]);
        
        return {
          success: true,
          data: result,
          attempts: attempt
        };
      } catch (error) {
        lastError = error;
        
        // Check if we should retry
        if (attempt === maxRetries || !shouldRetry(error)) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = retryDelay * Math.pow(backoffMultiplier, attempt - 1);
        
        // Call retry callback if provided
        if (onRetry) {
          onRetry(attempt, error);
        }
        
        console.log(`[${context}] Retry attempt ${attempt} after ${delay}ms`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // All retries failed
    return {
      success: false,
      error: lastError,
      attempts: maxRetries
    };
  }
  
  // Convenience method for fetch with timeout
  async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs: number = 30000
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }
}

// Export singleton instance
const reliabilityService = new ReliabilityService();

// Export for backward compatibility
export const rateLimiter = {
  checkLimit: (type: string, id?: string) => reliabilityService.checkLimit(type, id),
  resetLimit: (type: string, id?: string) => reliabilityService.resetLimit(type, id),
  getRateLimitStatus: (type: string, id?: string) => reliabilityService.getRateLimitStatus(type, id)
};

export const errorHandler = {
  handleError: (error: any, context: string) => reliabilityService.handleError(error, context)
};

export const retryUtil = {
  withRetry: <T>(op: () => Promise<T>, ctx: string, opts?: RetryOptions) => 
    reliabilityService.withRetry(op, ctx, opts)
};

export default reliabilityService;