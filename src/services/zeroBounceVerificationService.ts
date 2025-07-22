import firebase from 'firebase/compat/app';
import { EDGE_FUNCTIONS, SUPABASE_ANON_KEY } from '../config/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseService } from './firebaseService';

export interface EmailVerificationResult {
  status: 'approved' | 'rejected' | 'already_used' | 'error';
  message: string;
  score?: number;
  company?: string;
  details?: {
    email: string;
    domain: string;
    isBusinessEmail: boolean;
    validationScore: number;
    company?: string;
  };
}

export class ZeroBounceVerificationService {
  
  /**
   * Verify if an office worker email is legitimate and unused
   * Now uses Supabase Edge Function to keep API key secure
   */
  static async verifyOfficeWorkerEmail(email: string): Promise<EmailVerificationResult> {
    try {
      // Call Supabase Edge Function for secure email verification
      const currentUser = firebase.auth().currentUser;
      const response = await fetch(EDGE_FUNCTIONS.EMAIL_VERIFICATION, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          email,
          userId: currentUser?.uid || 'anonymous'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        return {
          status: 'error',
          message: result.message || 'Verification temporarily unavailable'
        };
      }
      
      return result as EmailVerificationResult;
    } catch (error: any) {
      console.error('Email verification error:', error);
      
      return {
        status: 'error',
        message: 'Verification temporarily unavailable. Please try again later.'
      };
    }
  }

  /**
   * Mark email as used to prevent reuse (local storage + Firebase)
   */
  static async markEmailAsUsed(email: string): Promise<void> {
    try {
      const cleanEmail = email.toLowerCase();
      const timestamp = new Date().toISOString();
      
      // Store locally for offline access and user verification status
      const usedEmails = await AsyncStorage.getItem('@flexbreak:verified_emails');
      const emailList: string[] = usedEmails ? JSON.parse(usedEmails) : [];
      
      if (!emailList.includes(cleanEmail)) {
        emailList.push(cleanEmail);
        await AsyncStorage.setItem('@flexbreak:verified_emails', JSON.stringify(emailList));
      }
      
      // Store verification details locally for this user
      await AsyncStorage.setItem('@flexbreak:verification_status', 'verified');
      await AsyncStorage.setItem('@flexbreak:user_type', 'office');
      await AsyncStorage.setItem('@flexbreak:user_email', cleanEmail);
      await AsyncStorage.setItem('@flexbreak:verification_method', 'zerobounce');
      await AsyncStorage.setItem('@flexbreak:verification_date', timestamp);
      
      // Also try to store in Firebase for persistence
      // This is a backup in case the Firebase Function didn't store it
      try {
        const stored = await firebaseService.storeEmail(cleanEmail, 'office');
        if (stored) {
          console.log('[ZeroBounce] Email stored in Firebase successfully');
        } else {
          console.log('[ZeroBounce] Firebase storage unavailable, using local storage only');
        }
      } catch (fbError) {
        console.log('[ZeroBounce] Firebase storage failed, continuing with local storage', fbError);
      }
      
    } catch (error) {
      console.error('Error storing verification locally:', error);
    }
  }

  /**
   * Get verification status for current user
   */
  static async getVerificationStatus(): Promise<{
    isVerified: boolean;
    userType?: string;
    email?: string;
    verificationDate?: string;
  }> {
    try {
      const status = await AsyncStorage.getItem('@flexbreak:verification_status');
      const userType = await AsyncStorage.getItem('@flexbreak:user_type');
      const email = await AsyncStorage.getItem('@flexbreak:user_email');
      const date = await AsyncStorage.getItem('@flexbreak:verification_date');

      return {
        isVerified: status === 'verified',
        userType: userType || undefined,
        email: email || undefined,
        verificationDate: date || undefined
      };
    } catch (error) {
      console.error('Error getting verification status:', error);
      return { isVerified: false };
    }
  }

  /**
   * Clear verification status (for testing)
   */
  static async clearVerificationStatus(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        '@flexbreak:verification_status',
        '@flexbreak:user_type',
        '@flexbreak:user_email',
        '@flexbreak:verification_method',
        '@flexbreak:verification_date'
      ]);
    } catch (error) {
      console.error('Error clearing verification status:', error);
    }
  }
}

export default ZeroBounceVerificationService;