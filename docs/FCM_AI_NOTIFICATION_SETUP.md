# FCM AI Notification Setup Guide

This guide explains how to deploy and configure the Firebase Cloud Messaging (FCM) integration for AI wellness notifications that work when the app is killed or in background.

## Architecture Overview

```
User Reply to Notification → FCM → Cloud Function → OpenRouter AI → FCM → New Notification
```

## Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Firebase project configured
3. OpenRouter API key

## Step 1: Configure Firebase Functions Environment Variables

Set your OpenRouter API key in Firebase:

```bash
firebase functions:config:set openrouter.api_key="YOUR_OPENROUTER_API_KEY"
```

Verify the configuration:
```bash
firebase functions:config:get
```

## Step 2: Deploy Firebase Functions

From the project root:

```bash
cd functions
npm install
firebase deploy --only functions
```

You should see output like:
```
✔  functions[handleAINotificationResponse]: Successful create operation.
✔  functions[handleAINotificationResponseHTTP]: Successful create operation.
```

## Step 3: Test the Setup

### A. Test FCM Token Generation

1. Open the app
2. Enable AI Wellness in settings
3. Check logs for "FCM token updated in Firestore"
4. Verify in Firebase Console → Firestore → users collection that your user document has `fcmToken` field

### B. Test Notification Response Flow

1. Wait for an AI wellness notification
2. Reply to the notification with text
3. The app should remain closed
4. Within 2-5 seconds, you should receive a new notification with the AI response

### C. Monitor Cloud Function Logs

```bash
firebase functions:log
```

Look for:
- "Processing AI notification response"
- "AI response notification sent"

## Step 4: iOS-Specific Configuration

For iOS, you need to ensure:

1. Push Notifications capability is enabled in Xcode
2. Valid APNs certificates are uploaded to Firebase Console
3. The app has notification permissions granted

## Step 5: Android-Specific Configuration

For Android, ensure:

1. The `ai_wellness` notification channel is configured (already done in code)
2. Google Play Services are available on the device

## Troubleshooting

### Issue: No FCM token generated
- Check notification permissions
- Ensure Firebase is properly initialized
- Check device has internet connection

### Issue: Cloud function not responding
- Check function logs: `firebase functions:log`
- Verify OpenRouter API key is set correctly
- Check if you're hitting rate limits

### Issue: Notifications not appearing
- Verify FCM token is stored in Firestore
- Check notification permissions
- On iOS, ensure app is not in foreground (notifications are handled differently)

## Environment Variables Checklist

- [ ] `openrouter.api_key` - Your OpenRouter API key

## Security Best Practices

1. **API Key Security**: The OpenRouter API key is stored in Firebase Functions config, not in client code
2. **User Privacy**: Conversations are stored per-user in Firestore with proper security rules
3. **Rate Limiting**: The cloud function includes basic rate limiting
4. **Token Refresh**: FCM tokens are refreshed every 30 days automatically

## Cost Considerations

- **Firebase Functions**: First 2M invocations/month are free
- **OpenRouter**: Mistral 7B free tier should handle most users
- **FCM**: Completely free for sending notifications

## Testing Commands

Test the cloud function directly:
```bash
# Test with curl (replace with your function URL and data)
curl -X POST https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/handleAINotificationResponseHTTP \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test123",
    "userMessage": "I feel tired",
    "fcmToken": "YOUR_TEST_TOKEN"
  }'
```

## Monitoring

1. **Firebase Console**: Monitor function invocations and errors
2. **Cloud Logging**: Detailed logs of each AI interaction
3. **Firestore**: Track conversation history and user engagement

## Next Steps

1. Set up monitoring alerts for function errors
2. Implement conversation context (pass previous messages)
3. Add multilingual support detection
4. Consider implementing typing indicators