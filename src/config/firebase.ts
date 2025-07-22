import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import firebaseConfig from '../../firebase.config';

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Export compat instances
export const auth = firebase.auth();
export const firestore = firebase.firestore();
export const storage = firebase.storage();

// Note: Firebase Functions have been migrated to Supabase Edge Functions
// See src/config/supabase.ts for the new endpoints 