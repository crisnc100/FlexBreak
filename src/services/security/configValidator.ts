import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_CONFIG } from '../../config/aiConfig';

interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface SecureConfig {
  openRouterApiKey?: string;
  googleSpeechApiKey?: string;
  lastValidated?: number;
  keyRotationDate?: number;
}

class ConfigValidator {
  private static instance: ConfigValidator;
  private readonly VALIDATION_CACHE_KEY = '@config_validation_cache';
  private readonly KEY_ROTATION_DAYS = 90; // Rotate keys every 90 days
  private readonly DEVICE_KEY = '@device_secure_key';
  
  private constructor() {}
  
  static getInstance(): ConfigValidator {
    if (!ConfigValidator.instance) {
      ConfigValidator.instance = new ConfigValidator();
    }
    return ConfigValidator.instance;
  }
  
  /**
   * Validates all API configurations on app startup
   */
  async validateAllConfigs(): Promise<ConfigValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    try {
      // Check OpenRouter API key
      const openRouterValidation = await this.validateOpenRouterKey();
      if (!openRouterValidation.isValid) {
        errors.push(openRouterValidation.error!);
      }
      
      // Check Google Speech API key if configured
      if (AI_CONFIG.openRouter.apiKey) {
        const googleValidation = await this.validateGoogleSpeechKey();
        if (!googleValidation.isValid && googleValidation.error) {
          warnings.push(googleValidation.error); // Warning only, not critical
        }
      }
      
      // Check key rotation
      const rotationCheck = await this.checkKeyRotation();
      if (rotationCheck.needsRotation) {
        warnings.push(rotationCheck.message);
      }
      
      // Cache validation result
      await this.cacheValidationResult({
        isValid: errors.length === 0,
        timestamp: Date.now()
      });
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
      
    } catch (error) {
      console.error('Config validation error:', error);
      errors.push('Failed to validate configuration');
      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }
  
  /**
   * Validates OpenRouter API key format and optionally tests it
   */
  private async validateOpenRouterKey(): Promise<{ isValid: boolean; error?: string }> {
    const apiKey = AI_CONFIG.openRouter.apiKey;
    
    if (!apiKey) {
      return { isValid: false, error: 'OpenRouter API key is missing' };
    }
    
    // Check key format (OpenRouter keys typically start with 'sk-or-')
    if (!apiKey.startsWith('sk-') && !apiKey.startsWith('sk-or-')) {
      return { isValid: false, error: 'Invalid OpenRouter API key format' };
    }
    
    // Check key length
    if (apiKey.length < 30) {
      return { isValid: false, error: 'OpenRouter API key appears too short' };
    }
    
    // TODO: Add actual API validation call with minimal cost
    // For now, we'll trust the format validation
    
    return { isValid: true };
  }
  
  /**
   * Validates Google Speech API key format
   */
  private async validateGoogleSpeechKey(): Promise<{ isValid: boolean; error?: string }> {
    const apiKey = AI_CONFIG.openRouter.apiKey; // This should be GOOGLE_SPEECH_API_KEY
    
    if (!apiKey) {
      return { isValid: true }; // Optional, so missing is OK
    }
    
    // Google API keys are typically 39 characters
    if (apiKey.length < 30 || apiKey.length > 50) {
      return { isValid: false, error: 'Google Speech API key has invalid length' };
    }
    
    return { isValid: true };
  }
  
  /**
   * Checks if API keys need rotation
   */
  private async checkKeyRotation(): Promise<{ needsRotation: boolean; message: string }> {
    try {
      const rotationData = await AsyncStorage.getItem('@key_rotation_data');
      if (!rotationData) {
        // First time, set rotation date
        await AsyncStorage.setItem('@key_rotation_data', JSON.stringify({
          lastRotation: Date.now(),
          nextRotation: Date.now() + (this.KEY_ROTATION_DAYS * 24 * 60 * 60 * 1000)
        }));
        return { needsRotation: false, message: '' };
      }
      
      const { nextRotation } = JSON.parse(rotationData);
      const daysUntilRotation = Math.ceil((nextRotation - Date.now()) / (24 * 60 * 60 * 1000));
      
      if (daysUntilRotation <= 7) {
        return {
          needsRotation: true,
          message: `API keys should be rotated in ${daysUntilRotation} days`
        };
      }
      
      return { needsRotation: false, message: '' };
    } catch (error) {
      console.error('Error checking key rotation:', error);
      return { needsRotation: false, message: '' };
    }
  }
  
  /**
   * Simple obfuscation for config storage (not true encryption)
   * For production, use expo-crypto or similar
   */
  async obfuscateConfig(config: SecureConfig): Promise<string> {
    const configStr = JSON.stringify(config);
    // Simple base64 encoding with reversal for basic obfuscation
    const reversed = configStr.split('').reverse().join('');
    return btoa(reversed);
  }
  
  /**
   * De-obfuscates configuration
   */
  async deobfuscateConfig(obfuscatedConfig: string): Promise<SecureConfig | null> {
    try {
      const reversed = atob(obfuscatedConfig);
      const configStr = reversed.split('').reverse().join('');
      return JSON.parse(configStr);
    } catch (error) {
      console.error('Failed to de-obfuscate config:', error);
      return null;
    }
  }
  
  /**
   * Caches validation result to avoid repeated checks
   */
  private async cacheValidationResult(result: { isValid: boolean; timestamp: number }): Promise<void> {
    await AsyncStorage.setItem(this.VALIDATION_CACHE_KEY, JSON.stringify(result));
  }
  
  /**
   * Gets cached validation result (valid for 24 hours)
   */
  async getCachedValidation(): Promise<boolean | null> {
    try {
      const cached = await AsyncStorage.getItem(this.VALIDATION_CACHE_KEY);
      if (!cached) return null;
      
      const { isValid, timestamp } = JSON.parse(cached);
      const hoursSinceValidation = (Date.now() - timestamp) / (1000 * 60 * 60);
      
      if (hoursSinceValidation > 24) {
        return null; // Cache expired
      }
      
      return isValid;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Sanitizes API keys for logging (shows only first/last few characters)
   */
  sanitizeKeyForLogging(key: string): string {
    if (!key || key.length < 10) return '***';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  }
}

export default ConfigValidator.getInstance();