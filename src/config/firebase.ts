import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import firebaseConfig from '../../firebase.config';

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Initialize native persistence before any compat auth access. Local wellness and
// progress identifiers stay unchanged; this identity is only for server access.
export const nativeAuth = (() => {
  try {
    return initializeAuth(getApp(), { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (error) {
    // Fast Refresh re-evaluates modules while retaining the initialized SDK.
    if (error instanceof Error && 'code' in error && error.code === 'auth/already-initialized') {
      return getAuth(getApp());
    }
    throw error;
  }
})();

// Export compat instances backed by the same Firebase app and persisted auth.
export const auth = firebase.auth();
export const firestore = firebase.firestore();
export const storage = firebase.storage();

// Note: Firebase Functions have been migrated to Supabase Edge Functions
// See src/config/supabase.ts for the new endpoints 
