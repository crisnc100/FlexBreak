import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/functions';
import firebaseConfig from '../../firebase.config';

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Export compat instances
export const auth = firebase.auth();
export const functions = firebase.functions(); 