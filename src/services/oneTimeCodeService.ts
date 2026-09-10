import AsyncStorage from '@react-native-async-storage/async-storage';
import { callBackend } from './security/backendClient';
import { savePromoEntitlement } from './storageService';

export interface CodeRedemptionResult {
  success: boolean;
  message: string;
  discountType?: 'office' | 'student';
  codeType?: 'discount' | 'free_premium';
  premiumDuration?: number;
}
type VerifiedCodeResult = {
  message: string;
  codeType: 'free_premium';
  premiumDuration: number;
  expiryDate: string;
} | {
  message: string;
  codeType: 'discount';
  discountType: 'office' | 'student';
};

class OneTimeCodeService {
  async redeemCode(code: string, email = ''): Promise<CodeRedemptionResult> {
    const cleanCode = code.trim().toUpperCase();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanCode) return { success: false, message: 'Enter a verification code.' };
    try {
      // The server atomically consumes a bearer code once; a same-user retry
      // returns the original grant, including its original expiration.
      const result = await callBackend<VerifiedCodeResult>('redeem-code-v2', { code: cleanCode, email: cleanEmail });
      if (result.codeType === 'free_premium') {
        if (!Number.isFinite(result.premiumDuration) || result.premiumDuration <= 0) throw new Error('Invalid premium grant');
        await savePromoEntitlement(result.expiryDate);
        await AsyncStorage.multiSet([
          ['@flexbreak:premium_status', 'true'], ['@flexbreak:premium_type', 'free_code'],
          ['@flexbreak:premium_expiry_date', result.expiryDate], ['@flexbreak:premium_email', cleanEmail],
          ['@flexbreak:verification_status', 'premium'], ['@flexbreak:user_type', 'premium'],
          ['@flexbreak:user_email', cleanEmail], ['@flexbreak:verification_method', 'free_premium_code'],
        ]);
        return { success: true, codeType: result.codeType, premiumDuration: result.premiumDuration, message: result.message };
      }
      if (result.codeType !== 'discount' || !['office', 'student'].includes(result.discountType)) throw new Error('Invalid discount grant');
      await AsyncStorage.multiSet([
        ['@flexbreak:verification_status', 'verified'], ['@flexbreak:user_type', result.discountType],
        ['@flexbreak:user_email', cleanEmail], ['@flexbreak:verification_method', 'one_time_code'],
        ['@flexbreak:verification_date', new Date().toISOString()],
      ]);
      return { success: true, codeType: 'discount', discountType: result.discountType, message: result.message };
    } catch (error) {
      console.warn('Code redemption could not be completed:', error);
      return { success: false, message: 'Verification could not be completed. Please try again when the service is available.' };
    }
  }
}
export const oneTimeCodeService = new OneTimeCodeService();
