import { onRequest } from 'firebase-functions/v2/https';

export const helloWorld = onRequest(
  {
    region: 'us-central1',
  },
  (request, response) => {
    response.send("Hello from Firebase v2!");
  }
);