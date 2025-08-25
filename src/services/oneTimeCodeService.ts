/**
 * One-Time Code Service for Manual Email Verification
 * Allows admin to generate unique codes that can be redeemed once globally
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseService } from './firebaseService';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import firebaseConfig from '../../firebase.config';

export interface OneTimeCode {
  code: string;
  createdAt: string;
  expiresAt: string;
  email: string; // The email this code is intended for
  used: boolean;
  usedBy?: string; // Email that actually used it
  usedAt?: string;
  createdBy: string; // Admin who created it
  notes?: string; // Optional notes about why this was issued
  type?: 'discount' | 'free_premium'; // Type of code - discount gives special pricing, free_premium gives full access
  duration?: number; // For free_premium codes - duration in days (e.g., 365 for 1 year)
}

export interface CodeRedemptionResult {
  success: boolean;
  message: string;
  discountType?: 'office' | 'student';
  codeType?: 'discount' | 'free_premium';
  premiumDuration?: number; // Days of free premium access
}

class OneTimeCodeService {
  private db: any = null;

  constructor() {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      if (getApps().length === 0) {
        const app = initializeApp(firebaseConfig);
        this.db = getFirestore(app);
      } else {
        this.db = getFirestore(getApps()[0]);
      }
    } catch (error) {
      console.warn('OneTimeCodeService: Firebase initialization failed:', error);
    }
  }

  /**
   * Generate a unique one-time code
   */
  generateCode(): string {
    // Generate a readable code format: FLEX-XXXXXXXX
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Avoid confusing chars like 0/O, 1/I
    let numbers = '';
    
    for (let i = 0; i < 8; i++) {
      numbers += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return `FLEX-${numbers}`;
  }

  /**
   * Create a new one-time code (Admin function)
   */
  async createOneTimeCode(
    email: string, 
    createdBy: string = 'admin',
    notes?: string,
    expirationDays: number = 7,
    type: 'discount' | 'free_premium' = 'discount',
    duration?: number // For free_premium codes - duration in days
  ): Promise<{ code: string; error?: string }> {
    try {
      if (!this.db) {
        return { code: '', error: 'Firebase not available' };
      }

      const code = this.generateCode();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + (expirationDays * 24 * 60 * 60 * 1000));

      const codeData: OneTimeCode = {
        code,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        email: email.toLowerCase(),
        used: false,
        createdBy,
        notes,
        type,
        duration: type === 'free_premium' ? (duration || 365) : undefined // Default 1 year
      };

      // Store in Firebase
      const codeDoc = doc(this.db, 'oneTimeCodes', code);
      await setDoc(codeDoc, {
        ...codeData,
        createdAtTimestamp: serverTimestamp()
      });

      console.log('One-time code created:', code, 'for email:', email);
      return { code };
    } catch (error) {
      console.error('Error creating one-time code:', error);
      return { code: '', error: 'Failed to create code' };
    }
  }

  /**
   * Redeem a one-time code
   */
  async redeemCode(code: string, email: string): Promise<CodeRedemptionResult> {
    try {
      const cleanCode = code.toUpperCase().trim();
      const cleanEmail = email.toLowerCase().trim();

      // Check local storage first to see if already verified
      const localStatus = await AsyncStorage.getItem('@flexbreak:verification_status');
      if (localStatus === 'verified') {
        return {
          success: false,
          message: 'You are already verified. Each user can only verify once.'
        };
      }

      if (!this.db) {
        // Fallback to local validation if Firebase unavailable
        return this.redeemCodeLocally(cleanCode, cleanEmail);
      }

      // Get the code from Firebase
      const codeDoc = doc(this.db, 'oneTimeCodes', cleanCode);
      const codeSnapshot = await getDoc(codeDoc);

      if (!codeSnapshot.exists()) {
        return {
          success: false,
          message: 'Invalid code. Please check and try again.'
        };
      }

      const codeData = codeSnapshot.data() as OneTimeCode;

      // Check if already used
      if (codeData.used) {
        return {
          success: false,
          message: 'This code has already been used.'
        };
      }

      // Check expiration
      const now = new Date();
      const expiresAt = new Date(codeData.expiresAt);
      if (now > expiresAt) {
        return {
          success: false,
          message: 'This code has expired. Please request a new one.'
        };
      }

      // Check if email matches (optional - you might want to allow any email)
      if (codeData.email && codeData.email !== cleanEmail) {
        console.warn(`Code was issued for ${codeData.email} but being used by ${cleanEmail}`);
        // You can decide whether to enforce this or not
      }

      // Mark the code as used
      await updateDoc(codeDoc, {
        used: true,
        usedBy: cleanEmail,
        usedAt: now.toISOString(),
        usedAtTimestamp: serverTimestamp()
      });

      // Handle based on code type
      const codeType = codeData.type || 'discount';
      
      if (codeType === 'free_premium') {
        // Store as premium user with expiration
        const premiumDuration = codeData.duration || 365; // Default 1 year
        const premiumExpiry = new Date(now.getTime() + (premiumDuration * 24 * 60 * 60 * 1000));
        
        try {
          // Try to store in Firebase (might fail due to permissions)
          const emailDoc = doc(this.db, 'premiumUsers', cleanEmail);
          await setDoc(emailDoc, {
            email: cleanEmail,
            isPremium: true,
            premiumStartDate: serverTimestamp(),
            premiumExpiryDate: premiumExpiry.toISOString(),
            premiumMethod: 'free_code',
            codeUsed: cleanCode,
            notes: codeData.notes || 'Free premium access'
          });
          
          // Also add to verifiedEmails for consistency
          const verifiedDoc = doc(this.db, 'verifiedEmails', cleanEmail);
          await setDoc(verifiedDoc, {
            email: cleanEmail,
            verifiedAt: serverTimestamp(),
            verificationMethod: 'free_premium_code',
            codeUsed: cleanCode,
            userType: 'premium',
            isPremium: true,
            premiumExpiryDate: premiumExpiry.toISOString()
          });
        } catch (dbError) {
          console.log('Could not store in Firebase (expected for anonymous users), continuing with local storage');
        }
        
        // Store locally as premium
        await this.storeFreePremiumLocally(cleanEmail, premiumExpiry);
        
        return {
          success: true,
          message: `Congratulations! You have ${premiumDuration} days of FREE premium access!`,
          codeType: 'free_premium',
          premiumDuration: premiumDuration
        };
      } else {
        // Regular discount code
        const emailDoc = doc(this.db, 'verifiedEmails', cleanEmail);
        await setDoc(emailDoc, {
          email: cleanEmail,
          verifiedAt: serverTimestamp(),
          verificationMethod: 'one_time_code',
          codeUsed: cleanCode,
          userType: 'office' // Default to office worker
        });

        // Store verification locally
        await this.storeVerificationLocally(cleanEmail, 'office');

        return {
          success: true,
          message: 'Verification successful! 60% discount activated.',
          discountType: 'office',
          codeType: 'discount'
        };
      }

    } catch (error: any) {
      console.error('Error redeeming code:', error);
      
      // Handle permission errors specifically
      if (error?.code === 'permission-denied') {
        console.log('Firestore permission denied - attempting local validation');
        // Fallback to local validation for now
        return this.redeemCodeLocally(code, email);
      }
      
      return {
        success: false,
        message: 'Verification service temporarily unavailable. Please try again.'
      };
    }
  }

  /**
   * Fallback local redemption (when Firebase is unavailable)
   */
  private async redeemCodeLocally(code: string, email: string): Promise<CodeRedemptionResult> {
    try {
      // Check if code exists in local used codes
      const usedCodes = await AsyncStorage.getItem('@flexbreak:used_codes');
      const codesList: string[] = usedCodes ? JSON.parse(usedCodes) : [];

      if (codesList.includes(code)) {
        return {
          success: false,
          message: 'This code has already been used.'
        };
      }

      // For offline mode, we can't fully validate, but we can check format
      const codePattern = /^FLEX-[A-Z0-9]{8}$/;
      if (!codePattern.test(code)) {
        return {
          success: false,
          message: 'Invalid code format. Must be FLEX-XXXXXXXX.'
        };
      }

      // For testing/development, accept codes that match the pattern
      // In production, you might want to maintain a whitelist
      // Check if it's a family code (you can add a special pattern or maintain a list)
      const isFamilyCode = code.includes('FAM') || 
                          code === 'FLEX-TEST1234' || // Add your test codes here
                          code === 'FLEX-FAMILY001'; // Add known family codes
      
      if (isFamilyCode) {
        // Store as free premium
        const premiumDuration = 365; // Default 1 year
        const premiumExpiry = new Date(new Date().getTime() + (premiumDuration * 24 * 60 * 60 * 1000));
        await this.storeFreePremiumLocally(email, premiumExpiry);
        
        // Mark code as used locally
        codesList.push(code);
        await AsyncStorage.setItem('@flexbreak:used_codes', JSON.stringify(codesList));
        
        return {
          success: true,
          message: `Congratulations! You have ${premiumDuration} days of FREE premium access!`,
          codeType: 'free_premium',
          premiumDuration: premiumDuration
        };
      }

      // Store as used locally
      codesList.push(code);
      await AsyncStorage.setItem('@flexbreak:used_codes', JSON.stringify(codesList));

      // Store verification
      await this.storeVerificationLocally(email, 'office');

      return {
        success: true,
        message: 'Verification successful! 60% discount activated.',
        discountType: 'office'
      };
    } catch (error) {
      console.error('Error in local code redemption:', error);
      return {
        success: false,
        message: 'Failed to process verification.'
      };
    }
  }

  /**
   * Store verification status locally
   */
  private async storeVerificationLocally(email: string, userType: 'office' | 'student') {
    const timestamp = new Date().toISOString();
    
    // Store verification details
    await AsyncStorage.setItem('@flexbreak:verification_status', 'verified');
    await AsyncStorage.setItem('@flexbreak:user_type', userType);
    await AsyncStorage.setItem('@flexbreak:user_email', email);
    await AsyncStorage.setItem('@flexbreak:verification_method', 'one_time_code');
    await AsyncStorage.setItem('@flexbreak:verification_date', timestamp);

    // Add to local verified emails list
    const verifiedEmails = await AsyncStorage.getItem('@flexbreak:verified_emails');
    const emailList: string[] = verifiedEmails ? JSON.parse(verifiedEmails) : [];
    if (!emailList.includes(email)) {
      emailList.push(email);
      await AsyncStorage.setItem('@flexbreak:verified_emails', JSON.stringify(emailList));
    }
  }

  /**
   * Store free premium status locally
   */
  private async storeFreePremiumLocally(email: string, expiryDate: Date) {
    const timestamp = new Date().toISOString();
    
    // Store premium details
    await AsyncStorage.setItem('@flexbreak:premium_status', 'true');
    await AsyncStorage.setItem('@flexbreak:premium_type', 'free_code');
    await AsyncStorage.setItem('@flexbreak:premium_email', email);
    await AsyncStorage.setItem('@flexbreak:premium_start_date', timestamp);
    await AsyncStorage.setItem('@flexbreak:premium_expiry_date', expiryDate.toISOString());
    await AsyncStorage.setItem('@flexbreak:verification_method', 'free_premium_code');
    
    // Also store as verified for compatibility
    await AsyncStorage.setItem('@flexbreak:verification_status', 'premium');
    await AsyncStorage.setItem('@flexbreak:user_type', 'premium');
    await AsyncStorage.setItem('@flexbreak:user_email', email);
  }

  /**
   * Check if a code exists and is valid (for preview)
   */
  async validateCode(code: string): Promise<{ valid: boolean; message: string }> {
    try {
      const cleanCode = code.toUpperCase().trim();

      if (!this.db) {
        return { valid: false, message: 'Verification service unavailable' };
      }

      const codeDoc = doc(this.db, 'oneTimeCodes', cleanCode);
      const codeSnapshot = await getDoc(codeDoc);

      if (!codeSnapshot.exists()) {
        return { valid: false, message: 'Invalid code' };
      }

      const codeData = codeSnapshot.data() as OneTimeCode;

      if (codeData.used) {
        return { valid: false, message: 'Code already used' };
      }

      const now = new Date();
      const expiresAt = new Date(codeData.expiresAt);
      if (now > expiresAt) {
        return { valid: false, message: 'Code expired' };
      }

      return { valid: true, message: 'Valid code' };
    } catch (error) {
      console.error('Error validating code:', error);
      return { valid: false, message: 'Validation failed' };
    }
  }

  /**
   * Get all codes for a specific email (admin function)
   */
  async getCodesForEmail(email: string): Promise<OneTimeCode[]> {
    try {
      if (!this.db) return [];

      const codesRef = collection(this.db, 'oneTimeCodes');
      const q = query(codesRef, where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);

      const codes: OneTimeCode[] = [];
      querySnapshot.forEach((doc) => {
        codes.push(doc.data() as OneTimeCode);
      });

      return codes.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('Error getting codes for email:', error);
      return [];
    }
  }
}

// Export singleton instance
export const oneTimeCodeService = new OneTimeCodeService();