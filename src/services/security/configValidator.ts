import AsyncStorage from '@react-native-async-storage/async-storage';
import { AI_CONFIG } from '../../config/aiConfig';
import { SUPABASE_PROJECT_URL, SUPABASE_ANON_KEY } from '../../config/supabase';

interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

const CACHE_KEY = '@config_validation_cache';

class ConfigValidator {
  /** Validate local routing only. Provider credentials are checked by the server. */
  async validateAllConfigs(): Promise<ConfigValidationResult> {
    const errors: string[] = [];
    if (!AI_CONFIG.useSecureMode) errors.push('AI requests require the authenticated backend.');
    try {
      const url = new URL(SUPABASE_PROJECT_URL);
      if (url.protocol !== 'https:' || !url.hostname.endsWith('.supabase.co') || url.username || url.password) {
        errors.push('Invalid backend address.');
      }
    } catch { errors.push('Invalid backend address.'); }
    if (!SUPABASE_ANON_KEY) errors.push('Missing public backend configuration.');
    const result = {
      isValid: errors.length === 0,
      errors,
      warnings: ['Local configuration checked; backend availability is checked when a request is made.'],
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ isValid: result.isValid, timestamp: Date.now() }));
    return result;
  }

  async getCachedValidation(): Promise<boolean | null> {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const { isValid, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      return typeof isValid === 'boolean' && Number.isFinite(age) && age >= 0 && age < 86_400_000 ? isValid : null;
    } catch { return null; }
  }
}

export default new ConfigValidator();
