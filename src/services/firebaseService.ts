/**
 * Simplified Firebase service with robust error handling
 * Handles App Check and connection issues gracefully
 */

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import firebaseConfig from '../../firebase.config';

class FirebaseService {
  private app: any = null;
  private db: any = null;
  private isInitialized = false;
  private initializationAttempted = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    if (this.initializationAttempted) return;
    this.initializationAttempted = true;

    try {
      // Check if Firebase is already initialized
      if (!firebase.apps.length) {
        this.app = firebase.initializeApp(firebaseConfig);
      } else {
        this.app = firebase.apps[0];
      }
      
      this.db = firebase.firestore();
      this.isInitialized = true;
      
      if (__DEV__) {
        console.log('Firebase initialized successfully');
      }
    } catch (error) {
      console.warn('Firebase initialization failed:', error.message);
      console.log('Continuing without Firebase - using local storage only');
      this.isInitialized = false;
    }
  }

  public isAvailable(): boolean {
    return this.isInitialized && this.db !== null;
  }

  public async checkEmailExists(email: string): Promise<boolean> {
    if (!this.isAvailable()) {
      console.log('Firebase not available for email check');
      return false;
    }

    try {
      const emailDocRef = this.db.collection('verifiedEmails').doc(email.toLowerCase());
      const emailDoc = await emailDocRef.get();
      return emailDoc.exists();
    } catch (error) {
      console.warn('Firebase read failed:', error.message);
      return false;
    }
  }

  public async storeEmail(email: string, userType: string = 'office'): Promise<boolean> {
    if (!this.isAvailable()) {
      console.log('Firebase not available for email storage');
      return false;
    }

    try {
      const emailDocRef = this.db.collection('verifiedEmails').doc(email.toLowerCase());
      
      // Use a timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Firebase timeout')), 5000);
      });
      
      const storePromise = emailDocRef.set({
        email: email.toLowerCase(),
        verifiedAt: firebase.firestore.FieldValue.serverTimestamp(),
        verificationMethod: 'zerobounce',
        userType: userType
      });
      
      await Promise.race([storePromise, timeoutPromise]);
      console.log('Firebase email storage successful');
      return true;
    } catch (error) {
      console.warn('Firebase write failed:', error.message);
      return false;
    }
  }
}

// Export a singleton instance
export const firebaseService = new FirebaseService();