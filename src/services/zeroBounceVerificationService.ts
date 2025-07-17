import firebase from 'firebase/compat/app';
import 'firebase/compat/functions';
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
   * Now uses Firebase Function to keep API key secure
   */
  static async verifyOfficeWorkerEmail(email: string): Promise<EmailVerificationResult> {
    try {
      // Call Firebase Function for secure email verification
      const verifyEmailFunction = firebase.functions().httpsCallable('verifyOfficeWorkerEmail');
      const result = await verifyEmailFunction({ email });
      
      return result.data as EmailVerificationResult;
    } catch (error: any) {
      console.error('Email verification error:', error);
      
      // Handle Firebase Function errors
      if (error.code === 'unauthenticated') {
        return {
          status: 'error',
          message: 'Please sign in to verify your email'
        };
      } else if (error.code === 'invalid-argument') {
        return {
          status: 'rejected',
          message: 'Invalid email format'
        };
      }
      
      return {
        status: 'error',
        message: 'Verification temporarily unavailable. Please try again later.'
      };
    }
  }

  /**
   * Mark email as used to prevent reuse (local storage only)
   * The Firebase Function handles server-side storage
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