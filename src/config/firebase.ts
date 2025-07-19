import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import firebaseConfig from '../../firebase.config';

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Export compat instances
export const auth = firebase.auth();

// Create a mock functions object that will work even if functions module fails to load
export const functions = {
  httpsCallable: (name: string) => {
    // Return a callable function that mimics Firebase Functions behavior
    return async (data: any) => {
      try {
        // Try to load firebase functions at runtime
        require('firebase/compat/functions');
        const fn = firebase.functions().httpsCallable(name);
        return await fn(data);
      } catch (error) {
        // If functions module fails to load, make direct HTTP call
        console.warn('Firebase Functions module not available, using HTTP fallback');
        
        // Get auth token if available
        let headers: any = {
          'Content-Type': 'application/json',
        };
        
        try {
          const currentUser = firebase.auth().currentUser;
          if (currentUser) {
            const token = await currentUser.getIdToken();
            headers['Authorization'] = `Bearer ${token}`;
          }
        } catch (e) {
          console.warn('Could not get auth token:', e);
        }
        
        // Construct the function URL
        const projectId = firebaseConfig.projectId;
        const region = 'us-central1';
        const url = `https://${region}-${projectId}.cloudfunctions.net/${name}`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ data }),
        });
        
        if (!response.ok) {
          throw new Error(`Function ${name} failed with status ${response.status}`);
        }
        
        const result = await response.json();
        return result;
      }
    };
  }
}; 