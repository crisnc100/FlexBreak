import { onRequest } from "firebase-functions/v2/https";

// Simple test function
export const helloWorld = onRequest((req, res) => {
  res.send("Hello from Firebase Functions v2!");
});

// Export all API-securing endpoints
export { aiChat } from './aiChatEndpoint';
export { transcribeAudio } from './speechTranscriptionEndpoint';
export { verifyOfficeWorkerEmail } from './emailVerificationEndpoint';
