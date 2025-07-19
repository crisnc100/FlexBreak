# Secure AI Architecture Setup

This guide explains how to set up the secure architecture for AI services in FlexBreak, keeping API keys server-side only.

## Overview

The secure architecture moves API keys (OpenRouter and Groq) from the React Native client to Firebase Functions, preventing exposure in the app bundle.

## Architecture

```
React Native App → Firebase Function (aiChat) → OpenRouter/Groq APIs
```

## Setup Instructions

### 1. Configure Firebase Functions Environment Variables

From the `functions` directory, run the setup script:

```bash
cd functions
./setup-env.sh
```

Or manually set the environment variables:

```bash
firebase functions:config:set openrouter.api_key="YOUR_OPENROUTER_API_KEY"
firebase functions:config:set groq.api_key="YOUR_GROQ_API_KEY"
```

### 2. Deploy Firebase Functions

Deploy the new AI chat function:

```bash
cd functions
npm run deploy
```

### 3. Enable Secure Mode

In `src/config/aiConfig.ts`, ensure secure mode is enabled:

```typescript
export const AI_CONFIG = {
  useSecureMode: true, // Set to true for production
  // ...
}
```

### 4. Remove API Keys from Client

Once secure mode is working, remove API keys from your `.env` file:
- Remove `OPENROUTER_API_KEY`
- Remove `GROQ_API_KEY`

Keep only non-sensitive values like `APP_URL`.

## Features

### Rate Limiting
- Free users: 3 requests per day (Wednesdays only)
- Premium users: 15 requests per day
- Tracked per user in Firestore

### Authentication
- Requires Firebase Authentication
- User must be signed in to use AI chat

### Fallback Support
- Primary: OpenRouter API
- Fallback: Groq API (if configured)

### Usage Tracking
- Tracks daily usage per user
- Stores in Firestore under `users/{userId}/aiRequests`

## Testing

### Test Locally
```bash
cd functions
npm run serve
```

### Test in App
1. Sign in to the app
2. Try the AI wellness coach
3. Check Firebase Functions logs for debugging

## Security Benefits

1. **API Keys Stay Server-Side**: No exposure in client bundle
2. **Authentication Required**: Only authenticated users can access
3. **Rate Limiting**: Prevents abuse and controls costs
4. **Usage Tracking**: Monitor usage per user

## Troubleshooting

### "User must be authenticated" Error
- Ensure user is signed in before using AI features
- Check Firebase Authentication setup

### "Daily limit reached" Error
- User has exceeded their daily quota
- Premium users get 15 requests/day, free users get 3

### API Key Not Working
- Verify keys are set: `firebase functions:config:get`
- Redeploy after setting: `npm run deploy`

## Migration Checklist

- [ ] Set Firebase Functions environment variables
- [ ] Deploy Firebase Functions
- [ ] Enable secure mode in aiConfig.ts
- [ ] Test AI features with authentication
- [ ] Remove API keys from .env file
- [ ] Update .gitignore if needed
- [ ] Test on multiple devices

## Cost Considerations

- Firebase Functions have a free tier (2M invocations/month)
- Each AI request counts as one invocation
- Monitor usage in Firebase Console