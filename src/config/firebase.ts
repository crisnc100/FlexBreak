import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getMessaging, isSupported } from 'firebase/messaging';
import Constants from 'expo-constants';

// Your Firebase configuration
// Replace these with your actual Firebase config values from the Firebase console
const firebaseConfig = {
  apiKey: "AIzaSyAa_M6W-AVZIX2C1XgRy2BsKVK9oP9SFwo",
  authDomain: "flexbreak-1c72c.firebaseapp.com",
  projectId: "flexbreak-1c72c",
  storageBucket: "flexbreak-1c72c.appspot.com",
  messagingSenderId: "1008736824952",
  appId: "1:1008736824952:ios:f061ee871cb11dbda1478d"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Initialize messaging conditionally (since it's not supported in all environments)
let messaging = null;

// This function will initialize messaging if it's supported
const initializeMessaging = async () => {
  try {
    const isFCMSupported = await isSupported();
    if (isFCMSupported) {
      messaging = getMessaging(app);
      console.log('Firebase Cloud Messaging initialized');
      return messaging;
    } else {
      console.log('Firebase Cloud Messaging is not supported in this environment');
      return null;
    }
  } catch (error) {
    console.error('Error initializing Firebase messaging:', error);
    return null;
  }
};

export { app, db, storage, functions, messaging, initializeMessaging }; 